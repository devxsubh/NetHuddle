"use client";

import { useEffect, useRef, useState, useCallback } from 'react';
import { peerConnectionConfig, mediaConstraints, screenShareConstraints } from '@/lib/shared/config/webrtc.config';

export interface UseWebRTCOptions {
  socket: any; // Socket.IO instance
  roomId?: string;
  targetUserId?: string;
  onRemoteStream?: (stream: MediaStream) => void;
  onConnectionStateChange?: (state: RTCPeerConnectionState) => void;
  onIceConnectionStateChange?: (state: RTCIceConnectionState) => void;
}

export interface UseWebRTCReturn {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  peerConnection: RTCPeerConnection | null;
  isCallActive: boolean;
  isVideoEnabled: boolean;
  isAudioEnabled: boolean;
  isScreenSharing: boolean;
  startCall: () => Promise<void>;
  endCall: () => void;
  toggleVideo: () => void;
  toggleAudio: () => void;
  toggleScreenShare: () => Promise<void>;
  answerCall: (offer: RTCSessionDescriptionInit) => Promise<void>;
}

export const useWebRTC = (options: UseWebRTCOptions): UseWebRTCReturn => {
  const {
    socket,
    roomId,
    targetUserId,
    onRemoteStream,
    onConnectionStateChange,
    onIceConnectionStateChange,
  } = options;

  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isCallActive, setIsCallActive] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);

  /**
   * Create peer connection
   */
  const createPeerConnection = useCallback(() => {
    const pc = new RTCPeerConnection(peerConnectionConfig);

    // Handle remote stream
    pc.ontrack = (event) => {
      console.log('WebRTC: Received remote track', event);
      if (event.streams && event.streams[0]) {
        setRemoteStream(event.streams[0]);
        if (onRemoteStream) {
          onRemoteStream(event.streams[0]);
        }
      }
    };

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('WebRTC: ICE candidate', event.candidate);
        socket.emit('webrtc:ice-candidate', {
          roomId,
          candidate: event.candidate,
          targetUserId,
        });
      }
    };

    // Handle connection state changes
    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      console.log('WebRTC: Connection state changed', state);
      if (onConnectionStateChange) {
        onConnectionStateChange(state);
      }

      if (state === 'disconnected' || state === 'failed' || state === 'closed') {
        setIsCallActive(false);
      } else if (state === 'connected') {
        setIsCallActive(true);
      }
    };

    // Handle ICE connection state changes
    pc.oniceconnectionstatechange = () => {
      const state = pc.iceConnectionState;
      console.log('WebRTC: ICE connection state changed', state);
      if (onIceConnectionStateChange) {
        onIceConnectionStateChange(state);
      }

      if (state === 'disconnected' || state === 'failed' || state === 'closed') {
        setIsCallActive(false);
      } else if (state === 'connected' || state === 'completed') {
        setIsCallActive(true);
      }
    };

    peerConnectionRef.current = pc;
    return pc;
  }, [socket, roomId, targetUserId, onRemoteStream, onConnectionStateChange, onIceConnectionStateChange]);

  /**
   * Get user media (camera + microphone)
   */
  const getUserMedia = useCallback(async (constraints: MediaStreamConstraints = mediaConstraints) => {
    try {
      // Check if running in browser environment
      if (typeof window === 'undefined' || typeof navigator === 'undefined') {
        throw new Error('getUserMedia is only available in browser environment');
      }

      // Check secure context
      const isSecureContext = window.isSecureContext || 
        window.location.protocol === 'https:' || 
        window.location.hostname === 'localhost' || 
        window.location.hostname === '127.0.0.1' ||
        window.location.hostname === '[::1]';

      // Log diagnostic information
      console.log('WebRTC getUserMedia check:', {
        hasNavigator: !!navigator,
        hasMediaDevices: !!navigator.mediaDevices,
        hasGetUserMedia: !!(navigator.mediaDevices?.getUserMedia),
        isSecureContext: window.isSecureContext,
        protocol: window.location.protocol,
        hostname: window.location.hostname,
        fullUrl: window.location.href
      });

      // Check if mediaDevices API is available
      if (navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function') {
        // Modern API - preferred
        try {
          const stream = await navigator.mediaDevices.getUserMedia(constraints);
          setLocalStream(stream);
          localStreamRef.current = stream;

          // Add tracks to peer connection
          if (peerConnectionRef.current) {
            stream.getTracks().forEach((track) => {
              peerConnectionRef.current?.addTrack(track, stream);
            });
          }

          return stream;
        } catch (error: any) {
          // Handle specific error types
          if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
            throw new Error('Camera/microphone access denied. Please allow permissions in your browser settings.');
          } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
            throw new Error('No camera or microphone found. Please connect a device.');
          } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
            throw new Error('Camera/microphone is already in use by another application.');
          } else if (error.name === 'SecurityError' || error.message?.includes('secure context')) {
            throw new Error(
              `getUserMedia requires a secure context (HTTPS). ` +
              `You are accessing via ${window.location.protocol}//${window.location.hostname}. ` +
              `Please use HTTPS or access via localhost/127.0.0.1.`
            );
          } else if (error.name === 'TypeError' && error.message?.includes('getUserMedia')) {
            // This might happen in insecure contexts where the API exists but is blocked
            throw new Error(
              `getUserMedia is blocked due to insecure context. ` +
              `Please access via HTTPS or localhost. Current URL: ${window.location.href}`
            );
          }
          // Re-throw with original error for debugging
          console.error('getUserMedia error:', error);
          throw error;
        }
      }

      // Try legacy API fallback
      const legacyGetUserMedia = 
        (navigator as any).getUserMedia ||
        (navigator as any).webkitGetUserMedia ||
        (navigator as any).mozGetUserMedia ||
        (navigator as any).msGetUserMedia;

      if (legacyGetUserMedia) {
        // Use legacy API
        const stream = await new Promise<MediaStream>((resolve, reject) => {
          legacyGetUserMedia.call(navigator, constraints, resolve, reject);
        });

        setLocalStream(stream);
        localStreamRef.current = stream;

        // Add tracks to peer connection
        if (peerConnectionRef.current) {
          stream.getTracks().forEach((track) => {
            peerConnectionRef.current?.addTrack(track, stream);
          });
        }

        return stream;
      }

      // No getUserMedia support found
      // Check if it's a secure context issue first
      if (!isSecureContext) {
        const currentUrl = `${window.location.protocol}//${window.location.hostname}${window.location.port ? ':' + window.location.port : ''}`;
        throw new Error(
          `getUserMedia requires a secure context (HTTPS). ` +
          `You are accessing via ${currentUrl}. ` +
          `Solutions:\n` +
          `1. Use HTTPS: https://${window.location.hostname}${window.location.port ? ':' + window.location.port : ''}\n` +
          `2. Use localhost: http://localhost${window.location.port ? ':' + window.location.port : ''}\n` +
          `3. For development, you can map the IP to localhost in /etc/hosts`
        );
      }
      
      // If we have mediaDevices but no getUserMedia, it's likely a browser compatibility issue
      if (navigator.mediaDevices && !navigator.mediaDevices.getUserMedia) {
        throw new Error(
          'getUserMedia method is not available on navigator.mediaDevices. ' +
          'This may be due to browser restrictions or the page not being in a secure context. ' +
          'Please try accessing via HTTPS or localhost.'
        );
      }
      
      // Final fallback - no support at all
      throw new Error(
        'getUserMedia is not supported in this browser. ' +
        'Please update to a modern browser (Chrome, Firefox, Safari, Edge) or check if your browser has camera/microphone support enabled.'
      );
    } catch (error) {
      console.error('Error getting user media:', error);
      throw error;
    }
  }, []);

  /**
   * Get display media (screen share)
   */
  const getDisplayMedia = useCallback(async () => {
    try {
      // Check if getDisplayMedia is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
        throw new Error('Screen sharing is not supported in this browser.');
      }

      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: screenShareConstraints.video as MediaTrackConstraints,
        audio: false,
      });
      screenStreamRef.current = stream;

      // Replace video track in peer connection
      if (peerConnectionRef.current && localStreamRef.current) {
        const videoTrack = stream.getVideoTracks()[0];
        const sender = peerConnectionRef.current.getSenders().find(
          (s) => s.track && s.track.kind === 'video'
        );

        if (sender && videoTrack) {
          await sender.replaceTrack(videoTrack);
        }

        // Update local stream
        const newLocalStream = new MediaStream([
          ...localStreamRef.current.getAudioTracks(),
          videoTrack,
        ]);
        setLocalStream(newLocalStream);
      }

      // Handle screen share end
      stream.getVideoTracks()[0].onended = () => {
        stopScreenShare();
      };

      return stream;
    } catch (error) {
      console.error('Error getting display media:', error);
      throw error;
    }
  }, []);

  /**
   * Stop screen share
   */
  const stopScreenShare = useCallback(async () => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((track) => track.stop());
      screenStreamRef.current = null;
    }

    // Restore camera video track
    if (peerConnectionRef.current && localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      const sender = peerConnectionRef.current.getSenders().find(
        (s) => s.track && s.track.kind === 'video'
      );

      if (sender && videoTrack) {
        await sender.replaceTrack(videoTrack);
      }

      setLocalStream(localStreamRef.current);
    }

    setIsScreenSharing(false);
  }, []);

  /**
   * Start call (create offer)
   */
  const startCall = useCallback(async () => {
    try {
      // Create peer connection
      const pc = createPeerConnection();

      // Get user media
      await getUserMedia();

      // Create offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // Send offer via signaling
      socket.emit('webrtc:offer', {
        roomId,
        offer: pc.localDescription,
        targetUserId,
      });

      setIsCallActive(true);
    } catch (error) {
      console.error('Error starting call:', error);
      throw error;
    }
  }, [createPeerConnection, getUserMedia, socket, roomId, targetUserId]);

  /**
   * Answer call (create answer)
   */
  const answerCall = useCallback(async (offer: RTCSessionDescriptionInit) => {
    try {
      // Create peer connection
      const pc = createPeerConnection();

      // Get user media
      await getUserMedia();

      // Set remote description
      await pc.setRemoteDescription(new RTCSessionDescription(offer));

      // Create answer
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      // Send answer via signaling
      socket.emit('webrtc:answer', {
        roomId,
        answer: pc.localDescription,
        targetUserId,
      });

      setIsCallActive(true);
    } catch (error) {
      console.error('Error answering call:', error);
      throw error;
    }
  }, [createPeerConnection, getUserMedia, socket, roomId, targetUserId]);

  /**
   * End call
   */
  const endCall = useCallback(() => {
    // Stop local stream
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }

    // Stop screen share
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((track) => track.stop());
      screenStreamRef.current = null;
    }

    // Close peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    setLocalStream(null);
    setRemoteStream(null);
    setIsCallActive(false);
    setIsScreenSharing(false);
  }, []);

  /**
   * Toggle video
   */
  const toggleVideo = useCallback(() => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
      }
    }
  }, []);

  /**
   * Toggle audio
   */
  const toggleAudio = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);
      }
    }
  }, []);

  /**
   * Toggle screen share
   */
  const toggleScreenShare = useCallback(async () => {
    if (isScreenSharing) {
      await stopScreenShare();
    } else {
      await getDisplayMedia();
      setIsScreenSharing(true);
    }
  }, [isScreenSharing, getDisplayMedia, stopScreenShare]);

  /**
   * Handle incoming WebRTC events
   */
  useEffect(() => {
    if (!socket) return;

    // Handle incoming offer
    const handleOffer = async (data: any) => {
      console.log('WebRTC: Received offer', data);
      // This should trigger answerCall from parent component
      // or we can auto-answer here
    };

    // Handle incoming answer
    const handleAnswer = async (data: any) => {
      console.log('WebRTC: Received answer', data);
      if (peerConnectionRef.current && data.answer) {
        await peerConnectionRef.current.setRemoteDescription(
          new RTCSessionDescription(data.answer)
        );
      }
    };

    // Handle ICE candidate
    const handleIceCandidate = async (data: any) => {
      console.log('WebRTC: Received ICE candidate', data);
      if (peerConnectionRef.current && data.candidate) {
        await peerConnectionRef.current.addIceCandidate(
          new RTCIceCandidate(data.candidate)
        );
      }
    };

    socket.on('webrtc:offer', handleOffer);
    socket.on('webrtc:answer', handleAnswer);
    socket.on('webrtc:ice-candidate', handleIceCandidate);

    return () => {
      socket.off('webrtc:offer', handleOffer);
      socket.off('webrtc:answer', handleAnswer);
      socket.off('webrtc:ice-candidate', handleIceCandidate);
    };
  }, [socket]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      endCall();
    };
  }, [endCall]);

  return {
    localStream,
    remoteStream,
    peerConnection: peerConnectionRef.current,
    isCallActive,
    isVideoEnabled,
    isAudioEnabled,
    isScreenSharing,
    startCall,
    endCall,
    toggleVideo,
    toggleAudio,
    toggleScreenShare,
    answerCall,
  };
};

