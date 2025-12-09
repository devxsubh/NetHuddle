"use client";

import { useCreateRoomMutation, RoomType } from "@/lib/client/rtk-query/room.api";
import { useGetNetworkUsersQuery } from "@/lib/client/rtk-query/network.api";
import { useAppSelector } from "@/lib/client/store/hooks";
import { selectLoggedInUser } from "@/lib/client/slices/authSlice";
import { useState } from "react";
import { Modal } from "../modal/Modal";
import toast from "react-hot-toast";
import { CircleLoading } from "../shared/CircleLoading";
import Image from "next/image";
import { DEFAULT_AVATAR } from "@/constants";

interface CreateRoomFormProps {
  onClose: () => void;
  onSuccess: () => void;
}

export const CreateRoomForm = ({ onClose, onSuccess }: CreateRoomFormProps) => {
  const loggedInUser = useAppSelector(selectLoggedInUser);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<RoomType>("chat");
  const [isPrivate, setIsPrivate] = useState(false);
  const [maxMembers, setMaxMembers] = useState(10);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);

  const [createRoom, { isLoading }] = useCreateRoomMutation();
  const { data: networkUsersData, isLoading: isLoadingNetworkUsers } = useGetNetworkUsersQuery();
  
  const networkUsers = networkUsersData?.data?.users || [];
  // Filter out the current user from the list
  const availableUsers = networkUsers.filter(
    (user) => user.userId !== loggedInUser?.id
  );

  const toggleMemberSelection = (userId: string) => {
    setSelectedMembers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Room name is required");
      return;
    }

    if (selectedMembers.length === 0) {
      toast.error("Please select at least one member for the room");
      return;
    }

    try {
      await createRoom({
        name: name.trim(),
        description: description.trim() || undefined,
        type,
        isPrivate,
        maxMembers: Math.max(maxMembers, selectedMembers.length + 1), // Ensure maxMembers includes selected members + creator
        memberIds: selectedMembers, // Include selected member IDs
      }).unwrap();

      toast.success("Room created successfully!");
      onSuccess();
    } catch (error: any) {
      console.error("Failed to create room:", error);
      toast.error(error?.data?.message || "Failed to create room");
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose}>
      <div className="bg-background p-6 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold text-text mb-4">Create New Room</h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-y-4">
          {/* Room Name */}
          <div>
            <label className="block text-sm font-medium text-text mb-1">
              Room Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-secondary-dark border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Enter room name"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-text mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 bg-secondary-dark border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Enter room description (optional)"
              rows={3}
            />
          </div>

          {/* Room Type */}
          <div>
            <label className="block text-sm font-medium text-text mb-1">
              Room Type
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as RoomType)}
              className="w-full px-3 py-2 bg-secondary-dark border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="chat">Chat</option>
              <option value="video">Video Call</option>
              <option value="streaming">Streaming</option>
            </select>
          </div>

          {/* Max Members */}
          <div>
            <label className="block text-sm font-medium text-text mb-1">
              Max Members
            </label>
            <input
              type="number"
              value={maxMembers}
              onChange={(e) => setMaxMembers(parseInt(e.target.value) || 10)}
              min={2}
              max={100}
              className="w-full px-3 py-2 bg-secondary-dark border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Private Room */}
          <div className="flex items-center gap-x-2">
            <input
              type="checkbox"
              id="isPrivate"
              checked={isPrivate}
              onChange={(e) => setIsPrivate(e.target.checked)}
              className="w-4 h-4 text-primary bg-secondary-dark border-border rounded focus:ring-primary"
            />
            <label htmlFor="isPrivate" className="text-sm text-text">
              Private Room
            </label>
          </div>

          {/* Network Users Selection */}
          <div>
            <label className="block text-sm font-medium text-text mb-2">
              Select Members from Network ({selectedMembers.length} selected)
            </label>
            {isLoadingNetworkUsers ? (
              <div className="flex justify-center py-4">
                <CircleLoading size="6" />
              </div>
            ) : availableUsers.length === 0 ? (
              <div className="p-4 bg-secondary-dark rounded-lg border border-border text-center">
                <p className="text-sm text-secondary-darker">
                  No other users found in your network. Create the room and invite them later.
                </p>
              </div>
            ) : (
              <div className="max-h-64 overflow-y-auto bg-secondary-dark rounded-lg border border-border p-3 space-y-2">
                {availableUsers.map((user) => {
                  const isSelected = selectedMembers.includes(user.userId);
                  const avatarUrl = user.avatarUrl || 
                    (user.avatar && user.avatar !== DEFAULT_AVATAR 
                      ? `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:5000'}/images/${user.avatar}`
                      : DEFAULT_AVATAR);
                  
                  return (
                    <button
                      key={user.userId}
                      type="button"
                      onClick={() => toggleMemberSelection(user.userId)}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${
                        isSelected
                          ? "bg-primary/20 border-2 border-primary"
                          : "bg-background hover:bg-secondary-darker border-2 border-transparent"
                      }`}
                    >
                      <div className="relative w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
                        <Image
                          src={avatarUrl}
                          alt={`${user.firstName} ${user.lastName}`}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div className="flex-1 text-left min-w-0">
                        <p className="text-sm font-medium text-text truncate">
                          {user.firstName} {user.lastName}
                        </p>
                        <p className="text-xs text-secondary-darker truncate">
                          @{user.userName}
                        </p>
                      </div>
                      {isSelected && (
                        <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                            className="w-3 h-3 text-white"
                          >
                            <path
                              fillRule="evenodd"
                              d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
            {selectedMembers.length > 0 && (
              <p className="text-xs text-secondary-darker mt-2">
                {selectedMembers.length} member{selectedMembers.length !== 1 ? 's' : ''} selected
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-x-3 mt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-secondary-dark hover:bg-secondary-darker text-text rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !name.trim() || selectedMembers.length === 0}
              className="flex-1 px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "Creating..." : "Create Room"}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
};

