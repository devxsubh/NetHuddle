"use client";

import { useEffect } from "react";
import { useSocket } from "@/context/socket.context";
import { useAppDispatch } from "@/lib/client/store/hooks";
import { requestApi } from "@/lib/client/rtk-query/request.api";
import { friendApi } from "@/lib/client/rtk-query/friend.api";
import toast from "react-hot-toast";
import { fetchUserFriendRequestResponse } from "@/interfaces/server.types";

/**
 * Hook to listen for real-time friend request events
 * - Shows notifications when friend requests are received
 * - Updates RTK Query cache when requests are accepted/rejected
 * - Updates friends list when a request is accepted
 */
export const useFriendRequestListener = () => {
  const socket = useSocket();
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (!socket) return;

    // Listen for new friend request
    const handleFriendRequestReceived = (data: {
      request: {
        id: string;
        sender: {
          id: string;
          userName: string;
          firstName: string;
          lastName: string;
          avatar?: string;
          avatarUrl?: string;
        };
        status: string;
        createdAt: string;
      };
    }) => {
      const { request } = data;
      
      // Show toast notification
      toast.success(
        `Friend request from ${request.sender.userName || request.sender.firstName}`,
        {
          duration: 5000,
          icon: "👋",
        }
      );

      // Invalidate friend requests cache to refetch
      dispatch(
        requestApi.util.invalidateTags(["FriendRequest"])
      );
    };

    // Listen for friend request accepted
    const handleFriendRequestAccepted = (data: {
      request: {
        id: string;
        status: string;
        friend: {
          id: string;
          userName: string;
          firstName: string;
          lastName: string;
          avatar?: string;
          avatarUrl?: string;
        };
      };
    }) => {
      const { request } = data;
      
      // Show toast notification
      toast.success(
        `${request.friend.userName || request.friend.firstName} accepted your friend request!`,
        {
          duration: 5000,
          icon: "✅",
        }
      );

      // Invalidate both friend requests and friends cache
      dispatch(
        requestApi.util.invalidateTags(["FriendRequest"])
      );
      dispatch(
        friendApi.util.invalidateTags(["Friend"])
      );
    };

    // Listen for friend request rejected
    const handleFriendRequestRejected = (data: {
      request: {
        id: string;
        status: string;
      };
    }) => {
      const { request } = data;
      
      // Show toast notification
      toast.error("Friend request was rejected", {
        duration: 3000,
        icon: "❌",
      });

      // Invalidate friend requests cache
      dispatch(
        requestApi.util.invalidateTags(["FriendRequest"])
      );
    };

    // Listen for new friend added (when someone accepts your request)
    const handleFriendAdded = (data: {
      friend: {
        id: string;
        userName: string;
        firstName: string;
        lastName: string;
        avatar?: string;
        avatarUrl?: string;
      };
    }) => {
      const { friend } = data;
      
      // Show toast notification
      toast.success(
        `You are now friends with ${friend.userName || friend.firstName}!`,
        {
          duration: 5000,
          icon: "🎉",
        }
      );

      // Invalidate friends cache to show new friend
      dispatch(
        friendApi.util.invalidateTags(["Friend"])
      );
      // Also invalidate friend requests since one was just accepted
      dispatch(
        requestApi.util.invalidateTags(["FriendRequest"])
      );
    };

    // Register event listeners
    socket.on("friend:request:received", handleFriendRequestReceived);
    socket.on("friend:request:accepted", handleFriendRequestAccepted);
    socket.on("friend:request:rejected", handleFriendRequestRejected);
    socket.on("friend:added", handleFriendAdded);

    // Cleanup
    return () => {
      socket.off("friend:request:received", handleFriendRequestReceived);
      socket.off("friend:request:accepted", handleFriendRequestAccepted);
      socket.off("friend:request:rejected", handleFriendRequestRejected);
      socket.off("friend:added", handleFriendAdded);
    };
  }, [socket, dispatch]);
};

