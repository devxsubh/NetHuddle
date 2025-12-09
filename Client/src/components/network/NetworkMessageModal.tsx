"use client";

import { useSocket } from "@/context/socket.context";
import { selectLoggedInUser } from "@/lib/client/slices/authSlice";
import { useAppSelector } from "@/lib/client/store/hooks";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { useEffect, useState, useRef } from "react";
import { SendIcon } from "../ui/icons/SendIcon";
import { CrossIcon } from "../ui/icons/CrossIcon";
import { DEFAULT_AVATAR } from "@/constants";
import { formatRelativeTime } from "@/lib/shared/helpers";
import toast from "react-hot-toast";

interface Message {
  id: string;
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
  timestamp: Date;
  isSent: boolean; // true if sent by current user, false if received
}

interface NetworkMessageModalProps {
  user: {
    userId: string;
    userName: string;
    firstName: string;
    lastName: string;
    avatarUrl: string;
  };
  isOpen: boolean;
  onClose: () => void;
}

export const NetworkMessageModal = ({ user, isOpen, onClose }: NetworkMessageModalProps) => {
  const socket = useSocket();
  const loggedInUser = useAppSelector(selectLoggedInUser);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Listen for incoming messages
  useEffect(() => {
    if (!socket || !isOpen) return;

    const handleIncomingMessage = (data: {
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
      timestamp: string | Date;
    }) => {
      // Only handle messages from the current user in the modal
      if (data.from.userId === user.userId) {
        const newMessage: Message = {
          id: `msg-${Date.now()}-${Math.random()}`,
          from: data.from,
          message: data.message,
          type: data.type,
          timestamp: new Date(data.timestamp),
          isSent: false,
        };
        setMessages((prev) => [...prev, newMessage]);
      }
    };

    const handleMessageSent = (data: {
      success: boolean;
      recipientId: string;
      timestamp: string | Date;
    }) => {
      if (data.success && data.recipientId === user.userId) {
        setIsSending(false);
        toast.success("Message sent");
      }
    };

    const handleError = (error: { message: string }) => {
      setIsSending(false);
      toast.error(error.message || "Failed to send message");
    };

    socket.on("chat:message", handleIncomingMessage);
    socket.on("chat:sent", handleMessageSent);
    socket.on("error", handleError);

    return () => {
      socket.off("chat:message", handleIncomingMessage);
      socket.off("chat:sent", handleMessageSent);
      socket.off("error", handleError);
    };
  }, [socket, isOpen, user.userId]);

  // Send message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !socket || isSending) return;

    if (!socket.connected) {
      toast.error("Not connected to server. Please refresh the page.");
      return;
    }

    setIsSending(true);
    const messageText = messageInput.trim();
    setMessageInput("");

    // Add message to local state immediately (optimistic update)
    const tempMessage: Message = {
      id: `temp-${Date.now()}`,
      from: {
        userId: loggedInUser?.id || "",
        userName: loggedInUser?.username || loggedInUser?.userName || "",
        firstName: loggedInUser?.firstName || "",
        lastName: loggedInUser?.lastName || "",
        avatarUrl: loggedInUser?.avatarUrl || "",
      },
      message: messageText,
      type: "text",
      timestamp: new Date(),
      isSent: true,
    };
    setMessages((prev) => [...prev, tempMessage]);

    try {
      // Emit message via Socket.IO
      socket.emit("chat:message", {
        recipientId: user.userId,
        message: messageText,
        type: "text",
      });
    } catch (error) {
      console.error("Error sending message:", error);
      setIsSending(false);
      toast.error("Failed to send message. Please try again.");
      // Remove the optimistic message on error
      setMessages((prev) => prev.filter((msg) => msg.id !== tempMessage.id));
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-background rounded-lg shadow-xl w-full max-w-md max-h-[80vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-secondary-dark">
            <div className="flex items-center gap-x-3">
              <div className="relative">
                <Image
                  width={40}
                  height={40}
                  src={user.avatarUrl || DEFAULT_AVATAR}
                  alt={`${user.userName} avatar`}
                  className="w-10 h-10 rounded-full object-cover"
                />
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-background"></div>
              </div>
              <div>
                <h3 className="font-semibold text-text">{user.userName}</h3>
                <p className="text-xs text-secondary-darker">
                  {user.firstName} {user.lastName}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-secondary-dark transition-colors"
              aria-label="Close"
            >
              <CrossIcon />
            </button>
          </div>

          {/* Messages */}
          <div
            ref={messagesContainerRef}
            className="flex-1 overflow-y-auto p-4 space-y-4"
          >
            {messages.length === 0 ? (
              <div className="text-center py-8 text-secondary-darker">
                <p>No messages yet.</p>
                <p className="text-sm mt-2">Start a conversation!</p>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.isSent ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[75%] rounded-lg p-3 ${
                      message.isSent
                        ? "bg-primary text-white"
                        : "bg-secondary-dark text-text"
                    }`}
                  >
                    {!message.isSent && (
                      <p className="text-xs font-medium mb-1 opacity-80">
                        {message.from.userName}
                      </p>
                    )}
                    <p className="text-sm whitespace-pre-wrap break-words">
                      {message.message}
                    </p>
                    <p
                      className={`text-xs mt-1 ${
                        message.isSent ? "text-white/70" : "text-secondary-darker"
                      }`}
                    >
                      {formatRelativeTime(message.timestamp)}
                    </p>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form onSubmit={handleSendMessage} className="p-4 border-t border-secondary-dark">
            <div className="flex items-center gap-x-2">
              <input
                type="text"
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 px-4 py-2 bg-secondary-dark rounded-lg text-text placeholder-secondary-darker focus:outline-none focus:ring-2 focus:ring-primary"
                disabled={isSending}
              />
              <button
                type="submit"
                disabled={!messageInput.trim() || isSending || !socket?.connected}
                className="p-2 bg-primary hover:bg-primary-dark text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Send message"
                title={!socket?.connected ? "Not connected to server" : "Send message"}
              >
                {isSending ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <SendIcon />
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

