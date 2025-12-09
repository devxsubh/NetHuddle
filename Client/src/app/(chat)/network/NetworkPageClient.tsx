"use client";

import { useGetNetworkUsersQuery, useUpdateNetworkPresenceMutation } from "@/lib/client/rtk-query/network.api";
import { selectLoggedInUser } from "@/lib/client/slices/authSlice";
import { useAppSelector } from "@/lib/client/store/hooks";
import { NetworkRadar } from "@/components/network/NetworkRadar";
import { NetworkChatInterface } from "@/components/network/NetworkChatInterface";
import { CreateRoomForm } from "@/components/rooms/CreateRoomForm";
import { useState, useEffect, useMemo } from "react";
import { CircleLoading } from "@/components/shared/CircleLoading";
import { DEFAULT_AVATAR } from "@/constants";
import { useSocket } from "@/context/socket.context";
import { VideoCall } from "@/components/webrtc/VideoCall";
import toast from "react-hot-toast";

export const NetworkPageClient = () => {
  const loggedInUser = useAppSelector(selectLoggedInUser);
  const { data, isLoading, error, refetch } = useGetNetworkUsersQuery(undefined, {
    // Refetch network users when data changes (e.g., avatar updates)
    refetchOnMountOrArgChange: true,
  });
  const [updatePresence] = useUpdateNetworkPresenceMutation();
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isCreateRoomOpen, setIsCreateRoomOpen] = useState(false);
  const [activeCall, setActiveCall] = useState<{
    userId: string;
    roomId: string;
    isIncoming: boolean;
  } | null>(null);
  const socket = useSocket();

  // Update presence every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      updatePresence();
    }, 30000);
    updatePresence();
    return () => clearInterval(interval);
  }, [updatePresence]);

  // Transform network users
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
      };
    });
  }, [data]);

  // Check if we can create a room (2-3 people on network)
  const canCreateRoom = useMemo(() => {
    const otherUsersCount = networkUsers.filter(u => u.userId !== loggedInUser?.id).length;
    return otherUsersCount >= 1 && otherUsersCount <= 2; // 2-3 total (including current user)
  }, [networkUsers, loggedInUser?.id]);

  // Handle user click - open chat interface
  const handleUserClick = (user: any) => {
    setSelectedUser(user);
    setIsChatOpen(true);
  };

  // Handle call button click
  const handleCall = (userId: string) => {
    const roomId = `direct-${loggedInUser?.id}-${userId}-${Date.now()}`;
    setActiveCall({
      userId,
      roomId,
      isIncoming: false,
    });
    setIsChatOpen(false);
  };

  // Listen for incoming calls
  useEffect(() => {
    if (!socket) return;

    const handleIncomingCall = (data: {
      from: {
        userId: string;
        userName: string;
        avatar?: string;
        avatarUrl?: string;
      };
      offer: any;
      roomId: string;
    }) => {
      // Check if call is from selected user or any network user
      const isFromNetworkUser = networkUsers.some(
        (u) => u.userId === data.from.userId
      );
      
      if (isFromNetworkUser) {
        setActiveCall({
          userId: data.from.userId,
          roomId: data.roomId,
          isIncoming: true,
        });
      }
    };

    socket.on("webrtc:offer", handleIncomingCall);

    return () => {
      socket.off("webrtc:offer", handleIncomingCall);
    };
  }, [socket, networkUsers]);

  const networkInfo = data?.success ? data.data?.networkInfo : null;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full">
        <CircleLoading size="8" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-500 text-center py-8">
        Failed to load network users. Please try again.
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col">
      {/* Network Info */}
      {networkInfo && (
        <div className="mb-4 p-4 bg-secondary/50 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-text">Your Network</h3>
              <p className="text-sm text-secondary-darker">
                Subnet: {networkInfo.networkSubnet} • {networkInfo.totalUsers} user{networkInfo.totalUsers !== 1 ? 's' : ''} online
              </p>
            </div>
            <div className="flex items-center gap-2">
              {canCreateRoom && (
                <button
                  onClick={() => setIsCreateRoomOpen(true)}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm font-medium"
                  title="Create a room with people on your network"
                >
                  Create Room
                </button>
              )}
              <button
                onClick={() => refetch()}
                className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg transition-colors text-sm"
              >
                Refresh
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Network Radar Visualization */}
      <div className="flex-1 relative bg-secondary/30 rounded-lg overflow-hidden border border-secondary-dark">
        <NetworkRadar
          users={networkUsers}
          currentUserId={loggedInUser?.id || ""}
          onUserClick={handleUserClick}
        />
      </div>

      {/* Chat Interface Modal */}
      {selectedUser && (
        <NetworkChatInterface
          user={selectedUser}
          isOpen={isChatOpen}
          onClose={() => {
            setIsChatOpen(false);
            setSelectedUser(null);
          }}
          onCall={handleCall}
        />
      )}

      {/* Video Call Interface */}
      {activeCall && (
        <VideoCall
          roomId={activeCall.roomId}
          targetUserId={activeCall.userId}
          isIncoming={activeCall.isIncoming}
          onEndCall={() => setActiveCall(null)}
        />
      )}

      {/* Create Room Modal */}
      {isCreateRoomOpen && (
        <CreateRoomForm
          onClose={() => setIsCreateRoomOpen(false)}
          onSuccess={() => {
            setIsCreateRoomOpen(false);
            toast.success("Room created! You can find it in the Rooms page.");
          }}
        />
      )}
    </div>
  );
};
