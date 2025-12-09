"use client";

import { Room } from "@/lib/client/rtk-query/room.api";
import { motion } from "framer-motion";
import Image from "next/image";
import { DEFAULT_AVATAR } from "@/constants";

interface RoomCardProps {
  room: Room;
  isMember: boolean;
  onJoin: (roomId: string) => void;
  onLeave: (roomId: string) => void;
}

export const RoomCard = ({ room, isMember, onJoin, onLeave }: RoomCardProps) => {
  const getRoomTypeIcon = (type: string) => {
    switch (type) {
      case 'video':
        return '📹';
      case 'streaming':
        return '📺';
      default:
        return '💬';
    }
  };

  const getRoomTypeColor = (type: string) => {
    switch (type) {
      case 'video':
        return 'bg-blue-500';
      case 'streaming':
        return 'bg-purple-500';
      default:
        return 'bg-green-500';
    }
  };

  return (
    <motion.div
      whileHover={{ x: -2 }}
      className={`p-4 rounded-lg border ${
        isMember
          ? "bg-primary/10 border-primary"
          : "bg-secondary-dark hover:bg-secondary-darker border-border"
      }`}
    >
      <div className="flex items-start gap-x-3">
        {/* Room Icon */}
        <div className={`w-12 h-12 rounded-lg ${getRoomTypeColor(room.type)} flex items-center justify-center text-2xl`}>
          {getRoomTypeIcon(room.type)}
        </div>

        {/* Room Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-x-2 mb-1">
            <h4 className="font-medium text-text truncate">{room.name}</h4>
            {room.isPrivate && (
              <span className="text-xs bg-secondary-darker text-secondary-darker px-2 py-0.5 rounded">
                🔒 Private
              </span>
            )}
            {isMember && (
              <span className="text-xs bg-primary text-white px-2 py-0.5 rounded">
                Member
              </span>
            )}
          </div>
          
          {room.description && (
            <p className="text-sm text-secondary-darker truncate mb-2">
              {room.description}
            </p>
          )}

          <div className="flex items-center gap-x-4 text-xs text-secondary-darker">
            <span>{room.members.length} / {room.maxMembers} members</span>
            <span>Type: {room.type}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-y-2">
          {isMember ? (
            <button
              onClick={() => onLeave(room.id)}
              className="px-3 py-1 text-sm bg-red-500 hover:bg-red-600 text-white rounded transition-colors"
            >
              Leave
            </button>
          ) : (
            <button
              onClick={() => onJoin(room.id)}
              className="px-3 py-1 text-sm bg-primary hover:bg-primary-dark text-white rounded transition-colors"
            >
              Join
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
};

