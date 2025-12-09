"use client";

import { useState, useEffect, useRef } from "react";
import { useSocket } from "@/context/socket.context";
import { useAppSelector } from "@/lib/client/store/hooks";
import { selectLoggedInUser } from "@/lib/client/slices/authSlice";
import { useGetRoomQuery, useGetRoomMessagesQuery, RoomMessage } from "@/lib/client/rtk-query/room.api";
import { Modal } from "../modal/Modal";
import { CircleLoading } from "../shared/CircleLoading";
import Image from "next/image";
import { DEFAULT_AVATAR } from "@/constants";
import toast from "react-hot-toast";


interface RoomChatModalProps {
  roomId: string;
  isOpen: boolean;
  onClose: () => void;
}

export const RoomChatModal = ({ roomId, isOpen, onClose }: RoomChatModalProps) => {
  const socket = useSocket();
  const loggedInUser = useAppSelector(selectLoggedInUser);
  const { data: roomData, isLoading: isLoadingRoom } = useGetRoomQuery(roomId, {
    skip: !isOpen,
  });
  const { data: messagesData, refetch: refetchMessages } = useGetRoomMessagesQuery(
    { roomId, limit: 100 },
    { skip: !isOpen }
  );
  const room = roomData?.data;

  const [messages, setMessages] = useState<(RoomMessage & { isSent: boolean })[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load existing messages when room opens
  useEffect(() => {
    if (messagesData?.success && messagesData.data) {
      const formattedMessages = messagesData.data.map((msg) => ({
        ...msg,
        timestamp: new Date(msg.timestamp),
        isSent: msg.from.userId === loggedInUser?.id,
      }));
      setMessages(formattedMessages);
    }
  }, [messagesData, loggedInUser?.id]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Join room socket room when opened
  useEffect(() => {
    if (!socket || !isOpen || !roomId) return;

    // Join the room
    socket.emit("room:join", { roomId });

    return () => {
      // Leave the room when closing
      socket.emit("room:leave", { roomId });
    };
  }, [socket, isOpen, roomId]);

  // Listen for room messages
  useEffect(() => {
    if (!socket || !isOpen) return;

    const handleRoomMessage = (data: {
      roomId: string;
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
      // Only handle messages for this room
      if (data.roomId === roomId) {
        const newMessage: RoomMessage & { isSent: boolean } = {
          id: data.messageId || `msg-${Date.now()}-${Math.random()}`,
          roomId: data.roomId,
          from: data.from,
          message: data.message,
          type: data.type,
          timestamp: new Date(data.timestamp),
          isSent: data.from.userId === loggedInUser?.id,
        };
        // Check if message already exists (avoid duplicates)
        setMessages((prev) => {
          const exists = prev.some((msg) => msg.id === newMessage.id);
          if (exists) return prev;
          return [...prev, newMessage];
        });
      }
    };

    const handleMessageSent = (data: {
      success: boolean;
      roomId: string;
      timestamp: string | Date;
    }) => {
      if (data.success && data.roomId === roomId) {
        setIsSending(false);
      }
    };

    const handleError = (error: { message: string }) => {
      setIsSending(false);
      toast.error(error.message || "Failed to send message");
    };

    socket.on("room:message", handleRoomMessage);
    socket.on("room:message:sent", handleMessageSent);
    socket.on("error", handleError);

    return () => {
      socket.off("room:message", handleRoomMessage);
      socket.off("room:message:sent", handleMessageSent);
      socket.off("error", handleError);
    };
  }, [socket, isOpen, roomId, loggedInUser?.id]);

  // Format relative time
  const formatRelativeTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (seconds < 60) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString();
  };

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
    const tempMessage: RoomMessage & { isSent: boolean } = {
      id: `temp-${Date.now()}`,
      roomId,
      from: {
        userId: loggedInUser?.id || "",
        userName: loggedInUser?.username || loggedInUser?.userName || "",
        firstName: loggedInUser?.firstName || "",
        lastName: loggedInUser?.lastName || "",
        avatar: loggedInUser?.avatar,
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
      socket.emit("room:message", {
        roomId,
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
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="flex flex-col h-[80vh] max-h-[600px] w-full max-w-2xl bg-background">
        {/* Header */}
        {isLoadingRoom ? (
          <div className="flex items-center justify-center p-4">
            <CircleLoading size="6" />
          </div>
        ) : (
          <>
            <div className="p-4 border-b border-border">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-text">{room?.name}</h2>
                  {room?.description && (
                    <p className="text-sm text-secondary-darker mt-1">
                      {room.description}
                    </p>
                  )}
                  <p className="text-xs text-secondary-darker mt-1">
                    {room?.members.length} member{room?.members.length !== 1 ? "s" : ""}
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="text-secondary-darker hover:text-text transition-colors"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                    className="w-6 h-6"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-secondary-dark">
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
                            : "bg-background text-text border border-border"
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

            {/* Input */}
            <form
              onSubmit={handleSendMessage}
              className="p-4 border-t border-border bg-background"
            >
              <div className="flex gap-2">
                <input
                  type="text"
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 px-4 py-2 bg-secondary-dark border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
                  disabled={isSending}
                />
                <button
                  type="submit"
                  disabled={!messageInput.trim() || isSending}
                  className="px-6 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSending ? "Sending..." : "Send"}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </Modal>
  );
};

