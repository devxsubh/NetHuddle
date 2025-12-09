"use client";

import { useFriendRequestListener } from "@/hooks/useFriendRequestListener";

/**
 * Component to listen for real-time friend request events
 * This component doesn't render anything, it just sets up socket listeners
 */
export const FriendRequestListener = () => {
  useFriendRequestListener();
  return null;
};

