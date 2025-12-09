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

