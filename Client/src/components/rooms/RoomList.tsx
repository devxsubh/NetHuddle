"use client";

import { useGetRoomsQuery, useJoinRoomMutation, useLeaveRoomMutation, Room } from "@/lib/client/rtk-query/room.api";
import { selectLoggedInUser } from "@/lib/client/slices/authSlice";
import { useAppSelector } from "@/lib/client/store/hooks";
import { motion } from "framer-motion";
import { useState } from "react";
import { CircleLoading } from "../shared/CircleLoading";
import { CreateRoomForm } from "./CreateRoomForm";
import { RoomCard } from "./RoomCard";

export const RoomList = () => {
  const loggedInUser = useAppSelector(selectLoggedInUser);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [roomTypeFilter, setRoomTypeFilter] = useState<'chat' | 'video' | 'streaming' | 'all'>('all');
  
  const { data, isLoading, error, refetch } = useGetRoomsQuery({
    type: roomTypeFilter === 'all' ? undefined : roomTypeFilter,
  });
  
  const [joinRoom] = useJoinRoomMutation();
  const [leaveRoom] = useLeaveRoomMutation();

  const rooms = data?.success ? data.data : [];
  const myRooms = rooms.filter((room) =>
    room.members.some((member) => member.user.id === loggedInUser?.id)
  );
  const availableRooms = rooms.filter(
    (room) => !room.members.some((member) => member.user.id === loggedInUser?.id)
  );

  const handleJoinRoom = async (roomId: string) => {
    try {
      await joinRoom(roomId).unwrap();
    } catch (error: any) {
      console.error("Failed to join room:", error);
    }
  };

  const handleLeaveRoom = async (roomId: string) => {
    try {
      await leaveRoom(roomId).unwrap();
    } catch (error: any) {
      console.error("Failed to leave room:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <CircleLoading size="8" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-500 text-sm p-4 bg-red-50 dark:bg-red-900/20 rounded">
        Failed to load rooms. Please try again.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-y-6 h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-text">Rooms</h2>
        <button
          onClick={() => setShowCreateForm(true)}
          className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg transition-colors"
        >
          Create Room
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {(['all', 'chat', 'video', 'streaming'] as const).map((type) => (
          <button
            key={type}
            onClick={() => setRoomTypeFilter(type)}
            className={`px-3 py-1 rounded-lg text-sm transition-colors ${
              roomTypeFilter === type
                ? "bg-primary text-white"
                : "bg-secondary-dark hover:bg-secondary-darker text-text"
            }`}
          >
            {type.charAt(0).toUpperCase() + type.slice(1)}
          </button>
        ))}
      </div>

      {/* My Rooms */}
      {myRooms.length > 0 && (
        <div className="flex flex-col gap-y-2">
          <h3 className="text-lg font-semibold text-text">My Rooms</h3>
          <div className="flex flex-col gap-y-2">
            {myRooms.map((room) => (
              <RoomCard
                key={room.id}
                room={room}
                isMember={true}
                onJoin={handleJoinRoom}
                onLeave={handleLeaveRoom}
              />
            ))}
          </div>
        </div>
      )}

      {/* Available Rooms */}
      {availableRooms.length > 0 && (
        <div className="flex flex-col gap-y-2">
          <h3 className="text-lg font-semibold text-text">Available Rooms</h3>
          <div className="flex flex-col gap-y-2">
            {availableRooms.map((room) => (
              <RoomCard
                key={room.id}
                room={room}
                isMember={false}
                onJoin={handleJoinRoom}
                onLeave={handleLeaveRoom}
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {rooms.length === 0 && (
        <div className="text-center py-8 text-secondary-darker">
          <p>No rooms found.</p>
          <p className="text-sm mt-2">Create a room to get started!</p>
        </div>
      )}

      {/* Create Room Form Modal */}
      {showCreateForm && (
        <CreateRoomForm
          onClose={() => setShowCreateForm(false)}
          onSuccess={() => {
            setShowCreateForm(false);
            refetch();
          }}
        />
      )}
    </div>
  );
};

