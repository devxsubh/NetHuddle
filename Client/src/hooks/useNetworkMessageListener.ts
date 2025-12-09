"use client";

import { useSocket } from "@/context/socket.context";
import { useEffect } from "react";
import toast from "react-hot-toast";

interface IncomingNetworkMessage {
  from: {
    userId: string;
    userName: string;
    firstName: string;
    lastName: string;
    avatar?: string;
    avatarUrl?: string;
  };
  message: string;
  type: string;
  timestamp: Date | string;
}

/**
 * Hook to listen for incoming messages from network users
 * Shows notifications when messages are received from users not in existing chats
 */
export const useNetworkMessageListener = () => {
  const socket = useSocket();

  useEffect(() => {
    if (!socket) return;

    const handleIncomingMessage = (data: IncomingNetworkMessage) => {
      // Show notification for incoming network messages
      // This will trigger for any chat:message event from network users
      toast.success(
        `New message from ${data.from.userName || data.from.firstName}`,
        {
          duration: 3000,
          icon: "💬",
        }
      );
    };

    socket.on("chat:message", handleIncomingMessage);

    return () => {
      socket.off("chat:message", handleIncomingMessage);
    };
  }, [socket]);
};

