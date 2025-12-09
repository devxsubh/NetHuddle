"use client";

import { useGetFriendsQuery } from "@/lib/client/rtk-query/friend.api";
import { useGetUserFriendRequestsQuery, useHandleFriendRequestMutation } from "@/lib/client/rtk-query/request.api";
import { fetchUserFriendsResponse, fetchUserFriendRequestResponse } from "@/interfaces/server.types";
import toast from "react-hot-toast";

type Props = {
  friends: fetchUserFriendsResponse[];
  friendRequests: fetchUserFriendRequestResponse[];
  loggedInUserId: string;
};

export const FriendsPageClient = ({ friends: initialFriends, friendRequests: initialRequests, loggedInUserId }: Props) => {
  const { data: friendsData } = useGetFriendsQuery(undefined, {
    skip: false,
  });
  const { data: requestsData } = useGetUserFriendRequestsQuery(undefined, {
    skip: false,
  });
  const [handleFriendRequest, { isLoading: isHandlingRequest }] = useHandleFriendRequestMutation();

  // Ensure friends is always an array
  const friends = Array.isArray(friendsData) ? friendsData : (Array.isArray(initialFriends) ? initialFriends : []);
  // Ensure friendRequests is always an array
  const friendRequests = Array.isArray(requestsData) ? requestsData : (Array.isArray(initialRequests) ? initialRequests : []);

  // Filter only incoming requests (where current user is the receiver)
  const incomingRequests = friendRequests.filter((request) => {
    // Check if the receiver is the current user (meaning we received it)
    const receiverId = request.receiver?.id;
    
    // If receiver is current user, it's an incoming request
    return receiverId === loggedInUserId || receiverId?.toString() === loggedInUserId?.toString();
  });

  const handleAccept = async (requestId: string) => {
    try {
      await handleFriendRequest({ requestId, action: "accept" }).unwrap();
      toast.success("Friend request accepted!");
    } catch (error: any) {
      toast.error(error?.data?.message || "Failed to accept friend request");
    }
  };

  const handleReject = async (requestId: string) => {
    try {
      await handleFriendRequest({ requestId, action: "reject" }).unwrap();
      toast.success("Friend request rejected");
    } catch (error: any) {
      toast.error(error?.data?.message || "Failed to reject friend request");
    }
  };

  return (
    <div className="space-y-6">
      {/* Friend Requests Section */}
      {incomingRequests.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold text-text mb-4">Friend Requests ({incomingRequests.length})</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {incomingRequests.map((request) => {
              // Handle both userName and username fields
              const senderName = (request.sender as any)?.userName || (request.sender as any)?.username || 
                                `${(request.sender as any)?.firstName || ''} ${(request.sender as any)?.lastName || ''}`.trim() || 
                                "Unknown User";
              return (
              <div key={request.id} className="bg-secondary p-4 rounded-lg flex flex-col gap-3">
                <div>
                  <p className="text-text font-medium">{senderName}</p>
                  <p className="text-sm text-muted-foreground">Pending</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleAccept(request.id)}
                    disabled={isHandlingRequest}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => handleReject(request.id)}
                    disabled={isHandlingRequest}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Reject
                  </button>
                </div>
              </div>
            );
            })}
          </div>
        </div>
      )}

      {/* Friends List */}
      <div>
        <h2 className="text-xl font-semibold text-text mb-4">Your Friends ({friends.length})</h2>
        {friends.length === 0 ? (
          <p className="text-text text-center py-8">No friends yet. Start adding friends to see them here!</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {friends.map((friend) => (
              <div key={friend.id} className="bg-secondary p-4 rounded-lg">
                <p className="text-text font-medium">{friend.username || "Unknown User"}</p>
                <p className="text-sm text-muted-foreground">{friend.isOnline ? "Online" : "Offline"}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

