"use client";

import { useSocket } from "@/context/socket.context";
import { selectLoggedInUser } from "@/lib/client/slices/authSlice";
import { useAppSelector } from "@/lib/client/store/hooks";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { useEffect, useState, useRef } from "react";
import { SendIcon } from "../ui/icons/SendIcon";
import { CrossIcon } from "../ui/icons/CrossIcon";
import { VideoCallIcon } from "../ui/icons/VideoCallIcon";
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
  isSent: boolean;
}

interface NetworkChatInterfaceProps {
  user: {
    userId: string;
    userName: string;
    firstName: string;
    lastName: string;
    avatarUrl: string;
    isOnline: boolean;
  };
  isOpen: boolean;
  onClose: () => void;
  onCall: (userId: string) => void;
}

export const NetworkChatInterface = ({
  user,
  isOpen,
  onClose,
  onCall,
}: NetworkChatInterfaceProps) => {
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
      // Only handle messages from the current user in the chat
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

  // Clear messages when chat closes
  useEffect(() => {
    if (!isOpen) {
      setMessages([]);
      setMessageInput("");
    }
  }, [isOpen]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !socket || isSending) return;

    const messageText = messageInput.trim();
    setMessageInput("");
    setIsSending(true);

    // Add message to local state immediately (optimistic update)
    const tempMessage: Message = {
      id: `temp-${Date.now()}`,
      from: {
        userId: loggedInUser?.id || "",
        userName: loggedInUser?.username || loggedInUser?.userName || "",
        firstName: loggedInUser?.name?.split(" ")[0] || "",
        lastName: loggedInUser?.name?.split(" ")[1] || "",
        avatarUrl: loggedInUser?.avatarUrl || "",
      },
      message: messageText,
      type: "text",
      timestamp: new Date(),
      isSent: true,
    };
    setMessages((prev) => [...prev, tempMessage]);

    // Send message via socket
    socket.emit("chat:message", {
      recipientId: user.userId,
      message: messageText,
      type: "text",
    });
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
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          className="bg-background rounded-lg shadow-2xl w-full max-w-4xl h-[85vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header with user info and call button */}
          <div className="flex items-center justify-between p-4 border-b border-secondary-dark bg-secondary/50">
            <div className="flex items-center gap-x-4">
              <div className="relative">
                <Image
                  width={48}
                  height={48}
                  src={user.avatarUrl || DEFAULT_AVATAR}
                  alt={`${user.userName} avatar`}
                  className="w-12 h-12 rounded-full object-cover"
                />
                {user.isOnline && (
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-background"></div>
                )}
              </div>
              <div>
                <h3 className="font-semibold text-lg text-text">{user.userName}</h3>
                <p className="text-sm text-secondary-darker">
                  {user.firstName} {user.lastName}
                </p>
                {user.isOnline && (
                  <p className="text-xs text-green-500 mt-1">Online</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-x-2">
              <button
                onClick={() => onCall(user.userId)}
                className="p-3 rounded-lg bg-primary hover:bg-primary-dark text-white transition-colors"
                aria-label="Start video call"
                title="Start video call"
              >
                <VideoCallIcon />
              </button>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-secondary-dark transition-colors"
                aria-label="Close"
              >
                <CrossIcon />
              </button>
            </div>
          </div>

          {/* Messages Area */}
          <div
            ref={messagesContainerRef}
            className="flex-1 overflow-y-auto p-4 space-y-4 bg-background"
          >
            {messages.length === 0 ? (
              <div className="flex items-center justify-center h-full text-secondary-darker">
                <p>No messages yet. Start the conversation!</p>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.isSent ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`flex gap-x-2 max-w-[70%] ${
                      message.isSent ? "flex-row-reverse" : "flex-row"
                    }`}
                  >
                    {!message.isSent && (
                      <Image
                        width={32}
                        height={32}
                        src={message.from.avatarUrl || DEFAULT_AVATAR}
                        alt={message.from.userName}
                        className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                      />
                    )}
                    <div
                      className={`rounded-lg px-4 py-2 ${
                        message.isSent
                          ? "bg-primary text-white"
                          : "bg-secondary-dark text-text"
                      }`}
                    >
                      {!message.isSent && (
                        <p className="text-xs font-medium mb-1 opacity-70">
                          {message.from.userName}
                        </p>
                      )}
                      <p className="text-sm whitespace-pre-wrap">{message.message}</p>
                      <p
                        className={`text-xs mt-1 ${
                          message.isSent ? "text-white/70" : "text-secondary-darker"
                        }`}
                      >
                        {formatRelativeTime(message.timestamp)}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input */}
          <form onSubmit={handleSendMessage} className="p-4 border-t border-secondary-dark">
            <div className="flex gap-x-2">
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
                disabled={!messageInput.trim() || isSending}
                className="px-6 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-x-2"
              >
                {isSending ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <span>Send</span>
                    <SendIcon />
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

