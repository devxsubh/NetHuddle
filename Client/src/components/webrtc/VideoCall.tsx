"use client";

import { useWebRTC, UseWebRTCOptions } from "@/hooks/useWebRTC/useWebRTC";
import { useSocket } from "@/context/socket.context";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Image from "next/image";

interface VideoCallProps {
  roomId?: string;
  targetUserId?: string;
  onEndCall?: () => void;
  callerInfo?: {
    userId: string;
    userName: string;
    avatar?: string;
  };
  isIncoming?: boolean;
}

export const VideoCall = ({ roomId, targetUserId, onEndCall, callerInfo, isIncoming = false }: VideoCallProps) => {
  const socket = useSocket();
  const [incomingOffer, setIncomingOffer] = useState<any>(null);
  const [callStatus, setCallStatus] = useState<'idle' | 'ringing' | 'connecting' | 'connected' | 'ended'>('idle');

  const webrtcOptions: UseWebRTCOptions = {
    socket,
    roomId,
    targetUserId,
    onRemoteStream: (stream) => {
      console.log('Remote stream received', stream);
      setCallStatus('connected');
    },
    onConnectionStateChange: (state) => {
      console.log('Connection state:', state);
      if (state === 'connected') {
        setCallStatus('connected');
      } else if (state === 'disconnected' || state === 'failed') {
        setCallStatus('ended');
      }
    },
    onIceConnectionStateChange: (state) => {
      console.log('ICE connection state:', state);
      if (state === 'connected' || state === 'completed') {
        setCallStatus('connected');
      } else if (state === 'disconnected' || state === 'failed') {
        setCallStatus('ended');
      }
    },
  };

  const {
    localStream,
    remoteStream,
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
  } = useWebRTC(webrtcOptions);

  // Handle incoming call
  useEffect(() => {
    if (!socket) return;

    const handleIncomingOffer = (data: any) => {
      console.log('Incoming call offer:', data);
      // Only handle if it's for this call (matching roomId or targetUserId)
      if (data.roomId === roomId || data.from?.userId === targetUserId) {
        setIncomingOffer(data);
        setCallStatus('ringing');
        // Update callerInfo from incoming offer if not provided
        if (data.from && !callerInfo) {
          // Note: callerInfo is passed as prop, but we can use data.from for display
        }
      }
    };

    socket.on('webrtc:offer', handleIncomingOffer);

    return () => {
      socket.off('webrtc:offer', handleIncomingOffer);
    };
  }, [socket, roomId, targetUserId, callerInfo]);

  // Auto-start call if targetUserId is provided (outgoing call) and not incoming
  useEffect(() => {
    if (targetUserId && !isIncoming && callStatus === 'idle' && !incomingOffer && socket?.connected) {
      setCallStatus('connecting');
      startCall().catch((error) => {
        console.error('Error starting call:', error);
        setCallStatus('ended');
        if (onEndCall) onEndCall();
      });
    }
  }, [targetUserId, isIncoming, callStatus, incomingOffer, startCall, socket, onEndCall]);

  const handleAnswer = async () => {
    if (incomingOffer && incomingOffer.offer) {
      setCallStatus('connecting');
      try {
        await answerCall(incomingOffer.offer);
      } catch (error) {
        console.error('Error answering call:', error);
        setCallStatus('ended');
      }
    }
  };

  const handleReject = () => {
    setIncomingOffer(null);
    setCallStatus('ended');
    if (onEndCall) onEndCall();
  };

  const handleEndCall = () => {
    endCall();
    setCallStatus('ended');
    if (onEndCall) onEndCall();
  };

  // Show incoming call UI
  if (callStatus === 'ringing' && incomingOffer) {
    // Use caller info from incoming offer if available, otherwise use prop
    const displayCallerInfo = incomingOffer.from || callerInfo;
    
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      >
        <div className="bg-background rounded-lg p-8 max-w-md w-full mx-4">
          <div className="flex flex-col items-center gap-6">
            <div className="relative">
              {displayCallerInfo?.avatarUrl || displayCallerInfo?.avatar ? (
                <Image
                  src={displayCallerInfo.avatarUrl || displayCallerInfo.avatar || ''}
                  alt={displayCallerInfo.userName || 'Caller'}
                  width={120}
                  height={120}
                  className="rounded-full"
                />
              ) : (
                <div className="w-30 h-30 rounded-full bg-primary flex items-center justify-center text-4xl text-white">
                  {displayCallerInfo?.userName?.[0]?.toUpperCase() || 'U'}
                </div>
              )}
            </div>
            <div className="text-center">
              <h3 className="text-2xl font-bold text-text mb-2">Incoming Call</h3>
              <p className="text-lg text-secondary-darker">
                {displayCallerInfo?.userName || displayCallerInfo?.firstName || 'Unknown'}
              </p>
            </div>
            <div className="flex gap-4">
              <button
                onClick={handleReject}
                className="bg-red-500 hover:bg-red-600 text-white rounded-full p-4 transition-colors"
                aria-label="Reject call"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <button
                onClick={handleAnswer}
                className="bg-green-500 hover:bg-green-600 text-white rounded-full p-4 transition-colors"
                aria-label="Answer call"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 5l14 14M19 5l-4 4m0 0l4 4m-4-4H5" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  // Show active call UI
  if (callStatus === 'connected' || callStatus === 'connecting') {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 z-50 bg-black"
      >
        <div className="relative w-full h-full flex flex-col">
          {/* Remote video */}
          <div className="flex-1 relative bg-gray-900">
            {remoteStream ? (
              <video
                ref={(video) => {
                  if (video && remoteStream) {
                    video.srcObject = remoteStream;
                    video.play().catch(console.error);
                  }
                }}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
                muted={false}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <div className="text-center text-white">
                  <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center mb-4 mx-auto">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-12 h-12 text-primary">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                    </svg>
                  </div>
                  <p className="text-lg">Connecting...</p>
                </div>
              </div>
            )}
          </div>

          {/* Local video (picture-in-picture) */}
          {localStream && (
            <div className="absolute top-4 right-4 w-48 h-36 rounded-lg overflow-hidden border-2 border-white shadow-lg">
              <video
                ref={(video) => {
                  if (video && localStream) {
                    video.srcObject = localStream;
                    video.play().catch(console.error);
                  }
                }}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Call controls */}
          <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
            <div className="flex items-center gap-4 bg-black/50 backdrop-blur-sm rounded-full px-6 py-4">
              <button
                onClick={toggleAudio}
                className={`p-3 rounded-full transition-colors ${
                  isAudioEnabled
                    ? 'bg-white/20 hover:bg-white/30 text-white'
                    : 'bg-red-500 hover:bg-red-600 text-white'
                }`}
                aria-label={isAudioEnabled ? 'Mute' : 'Unmute'}
              >
                {isAudioEnabled ? (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 9.75L19.5 12m0 0l2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25m-7.5-6.75L12 9m0 0l2.25 2.25M12 9L9.75 6.75M12 9l-2.25 2.25M6.75 8.25L4.5 6m0 0L2.25 3.75M4.5 6l2.25-2.25M4.5 6l2.25 2.25" />
                  </svg>
                )}
              </button>

              <button
                onClick={toggleVideo}
                className={`p-3 rounded-full transition-colors ${
                  isVideoEnabled
                    ? 'bg-white/20 hover:bg-white/30 text-white'
                    : 'bg-red-500 hover:bg-red-600 text-white'
                }`}
                aria-label={isVideoEnabled ? 'Turn off video' : 'Turn on video'}
              >
                {isVideoEnabled ? (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M12 18.75H4.5a2.25 2.25 0 01-2.25-2.25V9m12.75 9.75v-9a2.25 2.25 0 00-2.25-2.25H4.5a2.25 2.25 0 00-2.25 2.25v9a2.25 2.25 0 002.25 2.25h7.5a2.25 2.25 0 002.25-2.25z" />
                  </svg>
                )}
              </button>

              <button
                onClick={toggleScreenShare}
                className={`p-3 rounded-full transition-colors ${
                  isScreenSharing
                    ? 'bg-blue-500 hover:bg-blue-600 text-white'
                    : 'bg-white/20 hover:bg-white/30 text-white'
                }`}
                aria-label={isScreenSharing ? 'Stop sharing' : 'Share screen'}
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0V12a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 12V5.25" />
                </svg>
              </button>

              <button
                onClick={handleEndCall}
                className="bg-red-500 hover:bg-red-600 text-white p-3 rounded-full transition-colors"
                aria-label="End call"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 3.75L18 6m0 0l2.25 2.25M18 6l2.25-2.25M18 6l-2.25 2.25m-7.5 6L12 9m0 0l2.25 2.25M12 9l-2.25-2.25M12 9l-2.25 2.25M6.75 20.25L9 18m0 0l2.25-2.25M9 18l-2.25 2.25M9 18l2.25 2.25" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  return null;
};

