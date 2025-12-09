import { createApi } from "@reduxjs/toolkit/query/react";
import { RootState } from "../store/store";
import { createBaseQueryWithLogging } from "./baseQueryWithLogging";

// Types
export interface QuicServerInfo {
  host: string;
  port: number;
  protocol: string;
  url: string;
  webTransportUrl: string;
  authToken?: string;
}

export interface StreamingSession {
  sessionToken: string;
  expiresAt: number;
  streamId: string;
  quicServer: QuicServerInfo;
}

export interface CreateStreamingSessionRequest {
  streamId?: string;
}

export interface QuicHealthResponse {
  status: string;
  message?: string;
}

// Backend response format
type BackendResponse<T> = {
  success: boolean;
  data: T;
};

export const quicApi = createApi({
  reducerPath: "quicApi",
  baseQuery: createBaseQueryWithLogging(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/v1/quic`,
    (state: RootState) => state.authSlice.authToken,
    (state: RootState) => state.authSlice.refreshToken
  ),
  tagTypes: ["Quic"],
  endpoints: (builder) => ({
    // Get QUIC server connection information
    getQuicServerInfo: builder.query<QuicServerInfo, void>({
      query: () => "/info",
      providesTags: ["Quic"],
      transformResponse: (response: BackendResponse<QuicServerInfo>) => {
        return response.data;
      },
    }),

    // Create a new streaming session
    createStreamingSession: builder.mutation<StreamingSession, CreateStreamingSessionRequest>({
      query: (body) => ({
        url: "/session",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Quic"],
      transformResponse: (response: BackendResponse<StreamingSession>) => {
        return response.data;
      },
    }),

    // Check QUIC server health
    checkQuicHealth: builder.query<QuicHealthResponse, void>({
      query: () => "/health",
      providesTags: ["Quic"],
      transformResponse: (response: BackendResponse<QuicHealthResponse>) => {
        return response.data;
      },
    }),
  }),
});

export const {
  useGetQuicServerInfoQuery,
  useCreateStreamingSessionMutation,
  useCheckQuicHealthQuery,
} = quicApi;

