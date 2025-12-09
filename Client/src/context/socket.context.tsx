"use client";
import React, { createContext, useContext, useRef, useState } from "react";
import io, { Socket } from "socket.io-client";
import { selectAuthToken, selectLoggedInUser } from "../lib/client/slices/authSlice";
import { useAppSelector } from "../lib/client/store/hooks";

const socketContext = createContext<Socket | null>(null);

export const useSocket = () => useContext(socketContext);

type PropTypes = { children: React.ReactNode };

export const SocketProvider = ({ children }: PropTypes) => {
  const token = useAppSelector(selectAuthToken);
  const loggedInUser = useAppSelector(selectLoggedInUser);

  const socketRef = useRef<Socket | null>(null); // Persistent instance
  const [, setIsConnected] = useState(false);

  if (typeof window !== "undefined" && loggedInUser && token && !socketRef.current) {
    try {
      // Use backend URL for socket connection
      const backendUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:666';
      
      console.log('🔌 Connecting to socket at:', backendUrl);
      
      socketRef.current = io(backendUrl, {
        withCredentials: true,
        // Backend checks auth.token first, then query.token
        auth: {
          token: token,
        },
        query: { token },
        transports: ['websocket', 'polling'],
      });

      socketRef.current.on("connect", () => {
        console.log('✅ Socket connected successfully');
        setIsConnected(true);
      });
      
      socketRef.current.on("disconnect", (reason) => {
        console.log('❌ Socket disconnected:', reason);
        setIsConnected(false);
      });
      
      socketRef.current.on("connect_error", (error) => {
        console.error("❌ Socket connection error:", error);
      });
    } catch (error) {
      console.error("❌ Socket initialization error:", error);
    }
  }

  return (
    <socketContext.Provider value={socketRef.current}>
      {children}
    </socketContext.Provider>
  );
};
