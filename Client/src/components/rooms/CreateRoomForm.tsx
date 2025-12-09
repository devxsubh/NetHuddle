"use client";

import { useCreateRoomMutation, RoomType } from "@/lib/client/rtk-query/room.api";
import { useState } from "react";
import { Modal } from "../modal/Modal";
import toast from "react-hot-toast";

interface CreateRoomFormProps {
  onClose: () => void;
  onSuccess: () => void;
}

export const CreateRoomForm = ({ onClose, onSuccess }: CreateRoomFormProps) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<RoomType>("chat");
  const [isPrivate, setIsPrivate] = useState(false);
  const [maxMembers, setMaxMembers] = useState(10);

  const [createRoom, { isLoading }] = useCreateRoomMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Room name is required");
      return;
    }

    try {
      await createRoom({
        name: name.trim(),
        description: description.trim() || undefined,
        type,
        isPrivate,
        maxMembers,
      }).unwrap();

      toast.success("Room created successfully!");
      onSuccess();
    } catch (error: any) {
      console.error("Failed to create room:", error);
      toast.error(error?.data?.message || "Failed to create room");
    }
  };

  return (
    <Modal onClose={onClose}>
      <div className="bg-background p-6 rounded-lg max-w-md w-full">
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
              disabled={isLoading || !name.trim()}
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

