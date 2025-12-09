"use client";

import { useGetNetworkUsersQuery, useUpdateNetworkPresenceMutation } from "@/lib/client/rtk-query/network.api";
import { selectLoggedInUser } from "@/lib/client/slices/authSlice";
import { useAppSelector } from "@/lib/client/store/hooks";
import { motion } from "framer-motion";
import Image from "next/image";
import { useEffect, useMemo } from "react";
import { CircleLoading } from "../shared/CircleLoading";
import { DEFAULT_AVATAR } from "@/constants";
import { formatRelativeTime } from "@/lib/shared/helpers";

export const NetworkSidebar = () => {
  const loggedInUser = useAppSelector(selectLoggedInUser);
  const { data, isLoading, error, refetch } = useGetNetworkUsersQuery();
  const [updatePresence] = useUpdateNetworkPresenceMutation();

  // Update presence every 30 seconds to keep user active
  useEffect(() => {
    const interval = setInterval(() => {
      updatePresence();
    }, 30000); // 30 seconds

    // Update immediately on mount
    updatePresence();

    return () => clearInterval(interval);
  }, [updatePresence]);

  // Transform network users to include full avatar URLs
  const networkUsers = useMemo(() => {
    if (!data?.success || !data.data?.users) return [];
    
    return data.data.users.map((user) => {
      let avatarUrl = DEFAULT_AVATAR;
      
      // Use avatar field (avatarUrl is removed from backend)
      if (user.avatar) {
        // Check if avatar is already a full URL
        if (user.avatar.startsWith('http://') || user.avatar.startsWith('https://')) {
          avatarUrl = user.avatar;
        } else {
          // Construct URL from base URL for relative paths
          const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:5000';
          avatarUrl = `${baseUrl}/images/${user.avatar}`;
        }
      }
      
      return {
        ...user,
        avatarUrl: avatarUrl,
        name: `${user.firstName} ${user.lastName}`,
      };
    });
  }, [data]);

  const networkInfo = data?.success ? data.data?.networkInfo : null;

  return (
    <div className="flex flex-col gap-y-6 h-full">
        {/* Header */}
        <div className="flex flex-col gap-y-2">
          <h2 className="text-2xl font-bold text-text">Network Users</h2>
          {networkInfo && (
            <div className="text-sm text-secondary-darker">
              <p>Network: {networkInfo.networkSubnet}</p>
              <p>Total Users: {networkInfo.totalUsers}</p>
            </div>
          )}
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex justify-center items-center py-8">
            <CircleLoading size="8" />
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="text-red-500 text-sm p-4 bg-red-50 dark:bg-red-900/20 rounded">
            Failed to load network users. Please try again.
          </div>
        )}

        {/* Users List */}
        {!isLoading && !error && (
          <>
            {networkUsers.length === 0 ? (
              <div className="text-center py-8 text-secondary-darker">
                <p>No other users found on your network.</p>
                <p className="text-sm mt-2">Users on the same network will appear here.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-y-3">
                {networkUsers.map((user) => {
                  const isCurrentUser = loggedInUser?.id === user.userId;
                  return (
                    <motion.div
                      key={user.userId}
                      whileHover={{ x: -2 }}
                      className={`flex items-center gap-x-3 p-3 rounded-lg ${
                        isCurrentUser
                          ? "bg-primary/20 border border-primary"
                          : "bg-secondary-dark hover:bg-secondary-darker"
                      }`}
                    >
                      <div className="relative">
                        <Image
                          width={48}
                          height={48}
                          src={user.avatarUrl}
                          alt={`${user.userName} avatar`}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                        {/* Online indicator */}
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-background"></div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-x-2">
                          <h4 className="font-medium text-text truncate">
                            {user.userName}
                          </h4>
                          {isCurrentUser && (
                            <span className="text-xs bg-primary text-white px-2 py-0.5 rounded">
                              You
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-secondary-darker truncate">
                          {user.name}
                        </p>
                        <p className="text-xs text-secondary-darker mt-1">
                          Last seen: {formatRelativeTime(new Date(user.lastSeen))}
                        </p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* Refresh Button */}
        {!isLoading && (
          <button
            onClick={() => refetch()}
            className="mt-4 px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg transition-colors"
          >
            Refresh
          </button>
        )}
    </div>
  );
};

