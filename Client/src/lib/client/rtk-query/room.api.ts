import { createApi } from "@reduxjs/toolkit/query/react";
import { createBaseQueryWithLogging } from "./baseQueryWithLogging";
import { RootState } from "../store/store";

export type RoomType = 'chat' | 'video' | 'streaming';

export type RoomMember = {
  user: {
    _id: string;
    id: string;
    userName: string;
    firstName: string;
    lastName: string;
    avatar?: string;
  };
  role: 'owner' | 'admin' | 'member';
  joinedAt: string;
};

export type Room = {
  _id: string;
  id: string;
  name: string;
  description?: string;
  type: RoomType;
  isPrivate: boolean;
  isActive: boolean;
  maxMembers: number;
  members: RoomMember[];
  createdBy: {
    _id: string;
    id: string;
    userName: string;
  };
  createdAt: string;
  updatedAt: string;
};

export type CreateRoomRequest = {
  name: string;
  description?: string;
  type?: RoomType;
  isPrivate?: boolean;
  maxMembers?: number;
  memberIds?: string[]; // Array of user IDs to add to the room
};

export type UpdateRoomRequest = {
  name?: string;
  description?: string;
  isPrivate?: boolean;
  maxMembers?: number;
};

export const roomApi = createApi({
  reducerPath: "roomApi",
  baseQuery: createBaseQueryWithLogging(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/v1/rooms`,
    (state) => state.authSlice.authToken,
    (state) => state.authSlice.refreshToken
  ),
  tagTypes: ["Rooms", "Room", "RoomMessages"],
  endpoints: (builder) => ({
    // Get all rooms
    getRooms: builder.query<
      { success: boolean; data: Room[] },
      { type?: RoomType; isPrivate?: boolean }
    >({
      query: (params) => ({
        url: "/",
        params,
      }),
      providesTags: ["Rooms"],
    }),

    // Get room by ID
    getRoom: builder.query<
      { success: boolean; data: Room },
      string
    >({
      query: (roomId) => `/${roomId}`,
      providesTags: (result, error, roomId) => [{ type: "Room", id: roomId }],
    }),

    // Create room
    createRoom: builder.mutation<
      { success: boolean; data: Room },
      CreateRoomRequest
    >({
      query: (body) => ({
        url: "/",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Rooms"],
    }),

    // Join room
    joinRoom: builder.mutation<
      { success: boolean; data: Room; message?: string },
      string
    >({
      query: (roomId) => ({
        url: `/${roomId}/join`,
        method: "POST",
      }),
      invalidatesTags: (result, error, roomId) => [
        "Rooms",
        { type: "Room", id: roomId },
      ],
    }),

    // Leave room
    leaveRoom: builder.mutation<
      { success: boolean; message: string },
      string
    >({
      query: (roomId) => ({
        url: `/${roomId}/leave`,
        method: "POST",
      }),
      invalidatesTags: (result, error, roomId) => [
        "Rooms",
        { type: "Room", id: roomId },
      ],
    }),

    // Update room
    updateRoom: builder.mutation<
      { success: boolean; data: Room },
      { roomId: string; data: UpdateRoomRequest }
    >({
      query: ({ roomId, data }) => ({
        url: `/${roomId}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: (result, error, { roomId }) => [
        "Rooms",
        { type: "Room", id: roomId },
      ],
    }),

    // Delete room
    deleteRoom: builder.mutation<
      { success: boolean; message: string },
      string
    >({
      query: (roomId) => ({
        url: `/${roomId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Rooms"],
    }),

    // Get room messages
    getRoomMessages: builder.query<
      { success: boolean; data: RoomMessage[]; count: number },
      { roomId: string; limit?: number; skip?: number }
    >({
      query: ({ roomId, limit, skip }) => ({
        url: `/${roomId}/messages`,
        params: { limit, skip },
      }),
      providesTags: (result, error, { roomId }) => [
        { type: "RoomMessages", id: roomId },
      ],
    }),
  }),
});

export type RoomMessage = {
  id: string;
  roomId: string;
  from: {
    userId: string;
    userName: string;
    firstName: string;
    lastName: string;
    avatar?: string;
    avatarUrl?: string;
  };
  message: string;
  type: string;
  timestamp: string | Date;
};

export const {
  useGetRoomsQuery,
  useGetRoomQuery,
  useCreateRoomMutation,
  useJoinRoomMutation,
  useLeaveRoomMutation,
  useUpdateRoomMutation,
  useDeleteRoomMutation,
  useGetRoomMessagesQuery,
} = roomApi;

