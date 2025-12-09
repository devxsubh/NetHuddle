"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { useState } from "react";
import { DEFAULT_AVATAR } from "@/constants";

interface NetworkUser {
  userId: string;
  userName: string;
  firstName: string;
  lastName: string;
  avatarUrl: string;
  isOnline: boolean;
  lastSeen: Date;
}

interface NetworkRadarProps {
  users: NetworkUser[];
  currentUserId: string;
  onUserClick: (user: NetworkUser) => void;
}

export const NetworkRadar = ({ users, currentUserId, onUserClick }: NetworkRadarProps) => {
  const [hoveredUserId, setHoveredUserId] = useState<string | null>(null);

  // Calculate positions for users around the central radar
  const getPosition = (index: number, total: number) => {
    const angle = (index / total) * 2 * Math.PI - Math.PI / 2; // Start from top
    const radius = 35; // Distance from center in percentage (35% of container)
    const centerX = 50; // Percentage
    const centerY = 50; // Percentage
    
    return {
      x: centerX + (radius * Math.cos(angle)),
      y: centerY + (radius * Math.sin(angle)),
    };
  };

  // Filter out current user
  const otherUsers = users.filter((user) => user.userId !== currentUserId);

  return (
    <div className="relative w-full h-full min-h-[500px] flex items-center justify-center">
      {/* Central Radar Ball */}
      <motion.div
        className="absolute z-10 w-24 h-24 rounded-full bg-gradient-to-br from-primary via-primary-dark to-primary/80 shadow-2xl flex items-center justify-center"
        animate={{
          scale: [1, 1.1, 1],
          boxShadow: [
            "0 0 20px rgba(59, 130, 246, 0.5)",
            "0 0 40px rgba(59, 130, 246, 0.8)",
            "0 0 20px rgba(59, 130, 246, 0.5)",
          ],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        {/* Pulsing rings */}
        {[1, 2, 3].map((ring) => (
          <motion.div
            key={ring}
            className="absolute inset-0 rounded-full border-2 border-primary/30"
            animate={{
              scale: [1, 2, 3],
              opacity: [0.5, 0.3, 0],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              delay: ring * 0.3,
              ease: "easeOut",
            }}
          />
        ))}
        <div className="relative z-10 text-white font-bold text-xl">You</div>
      </motion.div>

      {/* Connection lines layer - drawn behind users */}
      <svg
        className="absolute inset-0 pointer-events-none z-0"
        style={{ width: "100%", height: "100%" }}
      >
        {otherUsers.map((user, index) => {
          const position = getPosition(index, otherUsers.length);
          return (
            <line
              key={`line-${user.userId}`}
              x1="50%"
              y1="50%"
              x2={`${position.x}%`}
              y2={`${position.y}%`}
              stroke="rgba(59, 130, 246, 0.2)"
              strokeWidth="1"
              strokeDasharray="3,3"
            />
          );
        })}
      </svg>

      {/* Network Users positioned around the radar */}
      {otherUsers.map((user, index) => {
        const position = getPosition(index, otherUsers.length);
        const isHovered = hoveredUserId === user.userId;

        return (
          <motion.div
            key={user.userId}
            className="absolute cursor-pointer z-20"
            style={{
              left: `${position.x}%`,
              top: `${position.y}%`,
              transform: "translate(-50%, -50%)",
            }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{
              scale: isHovered ? 1.2 : 1,
              opacity: 1,
            }}
            whileHover={{ scale: 1.2 }}
            onHoverStart={() => setHoveredUserId(user.userId)}
            onHoverEnd={() => setHoveredUserId(null)}
            onClick={() => onUserClick(user)}
          >

            {/* User Avatar */}
            <div className="relative">
              <motion.div
                className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-primary shadow-lg"
                animate={{
                  boxShadow: isHovered
                    ? "0 0 20px rgba(59, 130, 246, 0.8)"
                    : "0 0 10px rgba(59, 130, 246, 0.4)",
                }}
              >
                <Image
                  width={64}
                  height={64}
                  src={user.avatarUrl || DEFAULT_AVATAR}
                  alt={user.userName}
                  className="w-full h-full object-cover"
                />
                {/* Online indicator */}
                {user.isOnline && (
                  <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 rounded-full border-2 border-background"></div>
                )}
              </motion.div>

              {/* User name tooltip */}
              {isHovered && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-3 py-1 bg-background border border-primary rounded-lg shadow-lg whitespace-nowrap z-30"
                >
                  <p className="text-sm font-medium text-text">{user.userName}</p>
                  <p className="text-xs text-secondary-darker">
                    {user.firstName} {user.lastName}
                  </p>
                </motion.div>
              )}
            </div>
          </motion.div>
        );
      })}

      {/* Empty state */}
      {otherUsers.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-secondary-darker text-center">
            No other users on your network
            <br />
            <span className="text-sm">Users will appear around the radar when they join</span>
          </p>
        </div>
      )}
    </div>
  );
};

