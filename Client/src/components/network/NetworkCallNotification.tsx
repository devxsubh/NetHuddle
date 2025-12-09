"use client";

import { useSocket } from "@/context/socket.context";
import { selectLoggedInUser } from "@/lib/client/slices/authSlice";
import { useAppSelector } from "@/lib/client/store/hooks";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { useEffect, useState } from "react";
import { VideoCall } from "../webrtc/VideoCall";
import { DEFAULT_AVATAR } from "@/constants";

interface IncomingCallOffer {
  from: {
    userId: string;
    userName: string;
    avatar?: string;
    avatarUrl?: string;
  };
  offer: RTCSessionDescriptionInit;
  roomId: string;
  timestamp: Date | string;
}

/**
 * Global component to handle incoming video calls from network users
 * Shows notification when a call comes in and user is not already in a call
 */
export const NetworkCallNotification = () => {
  const socket = useSocket();
  const loggedInUser = useAppSelector(selectLoggedInUser);
  const [incomingCall, setIncomingCall] = useState<IncomingCallOffer | null>(null);
  const [activeCall, setActiveCall] = useState<{
    roomId: string;
    targetUserId: string;
    targetUserName: string;
    targetAvatarUrl: string;
  } | null>(null);

  // Listen for incoming WebRTC offers
  useEffect(() => {
    if (!socket) return;

    const handleIncomingOffer = (data: IncomingCallOffer) => {
      // Only show if we're not already in a call
      if (!activeCall) {
        setIncomingCall(data);
      }
    };

    socket.on("webrtc:offer", handleIncomingOffer);

    return () => {
      socket.off("webrtc:offer", handleIncomingOffer);
    };
  }, [socket, activeCall]);

  // Handle accepting call
  const handleAcceptCall = () => {
    if (incomingCall && loggedInUser) {
      // Use the roomId from the incoming offer, or generate one if not provided
      const roomId = incomingCall.roomId || generateDirectRoomId(loggedInUser.id, incomingCall.from.userId);
      
      setActiveCall({
        roomId,
        targetUserId: incomingCall.from.userId,
        targetUserName: incomingCall.from.userName,
        targetAvatarUrl: incomingCall.from.avatarUrl || incomingCall.from.avatar || DEFAULT_AVATAR,
      });
      setIncomingCall(null);
    }
  };

  // Handle rejecting call
  const handleRejectCall = () => {
    setIncomingCall(null);
  };

  // Handle end call
  const handleEndCall = () => {
    setActiveCall(null);
    setIncomingCall(null);
  };

  // Generate room ID for direct calls (if needed)
  const generateDirectRoomId = (userId1: string, userId2: string) => {
    const sorted = [userId1, userId2].sort();
    return `direct-${sorted[0]}-${sorted[1]}`;
  };

  return (
    <>
      {/* Incoming call notification */}
      <AnimatePresence>
        {incomingCall && !activeCall && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-4 right-4 z-50 bg-background rounded-lg shadow-xl border border-secondary-dark p-4 max-w-sm"
          >
            <div className="flex items-center gap-x-3 mb-4">
              <div className="relative">
                <Image
                  width={48}
                  height={48}
                  src={incomingCall.from.avatarUrl || incomingCall.from.avatar || DEFAULT_AVATAR}
                  alt={`${incomingCall.from.userName} avatar`}
                  className="w-12 h-12 rounded-full object-cover"
                />
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-background"></div>
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-text">{incomingCall.from.userName}</h4>
                <p className="text-sm text-secondary-darker">Incoming video call</p>
              </div>
            </div>
            <div className="flex gap-x-2">
              <button
                onClick={handleRejectCall}
                className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
              >
                Decline
              </button>
              <button
                onClick={handleAcceptCall}
                className="flex-1 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
              >
                Accept
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active call */}
      {activeCall && loggedInUser && (
        <VideoCall
          roomId={activeCall.roomId}
          targetUserId={activeCall.targetUserId}
          onEndCall={handleEndCall}
          callerInfo={{
            userId: loggedInUser.id,
            userName: loggedInUser.username || loggedInUser.userName || "",
            avatar: loggedInUser.avatarUrl,
          }}
        />
      )}
    </>
  );
};

