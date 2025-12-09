import { createApi } from "@reduxjs/toolkit/query/react";
import { RootState } from "../store/store";
import { createBaseQueryWithLogging } from "./baseQueryWithLogging";

// Backend response format
type BackendResponse<T> = {
  success: boolean;
  data: T;
};

// Network user type
export type NetworkUser = {
  userId: string;
  firstName: string;
  lastName: string;
  userName: string;
  avatar: string;
  avatarUrl: string;
  lastSeen: string;
  ipAddress: string;
  userAgent: string;
};

// Network info type
export type NetworkInfo = {
  networkSubnet: string;
  yourIpAddress: string;
  totalUsers: number;
};

// Get network users response
export type GetNetworkUsersResponse = {
  users: NetworkUser[];
  networkInfo: NetworkInfo;
};

// Network stats response
export type NetworkStatsResponse = {
  networkSubnet: string;
  yourIpAddress: string;
  activeUsers: number;
  timestamp: string;
};

export const networkApi = createApi({
  reducerPath: "networkApi",
  baseQuery: createBaseQueryWithLogging(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/v1/network`,
    (state) => state.authSlice.authToken,
    (state) => state.authSlice.refreshToken
  ),
  tagTypes: ["NetworkUsers"],
  endpoints: (builder) => ({
    // Get all users in the same network
    getNetworkUsers: builder.query<BackendResponse<GetNetworkUsersResponse>, void>({
      query: () => "/users",
      providesTags: ["NetworkUsers"],
    }),

    // Update network presence (heartbeat)
    updateNetworkPresence: builder.mutation<BackendResponse<{ message: string }>, void>({
      query: () => ({
        url: "/presence",
        method: "POST",
      }),
      invalidatesTags: ["NetworkUsers"],
    }),

    // Get network statistics
    getNetworkStats: builder.query<BackendResponse<NetworkStatsResponse>, void>({
      query: () => "/stats",
    }),
  }),
});

export const {
  useGetNetworkUsersQuery,
  useUpdateNetworkPresenceMutation,
  useGetNetworkStatsQuery,
} = networkApi;

