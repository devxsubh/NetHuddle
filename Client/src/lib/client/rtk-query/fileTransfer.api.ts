import { createApi } from "@reduxjs/toolkit/query/react";
import { createBaseQueryWithLogging } from "./baseQueryWithLogging";
import { RootState } from "../store/store";

export type FileTransferStatus = {
  transferId: string;
  fileName: string;
  fileSize: number;
  receivedBytes: number;
  progress: number;
  status: 'in_progress' | 'completed' | 'failed';
  senderId: string;
  recipientId: string;
  startTime: number;
};

export const fileTransferApi = createApi({
  reducerPath: "fileTransferApi",
  baseQuery: createBaseQueryWithLogging(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/v1/file-transfer`,
    (state) => state.authSlice.authToken,
    (state) => state.authSlice.refreshToken
  ),
  tagTypes: ["FileTransfers"],
  endpoints: (builder) => ({
    // Get transfer status
    getTransferStatus: builder.query<
      { success: boolean; data: FileTransferStatus },
      string
    >({
      query: (transferId) => `/${transferId}`,
      providesTags: (result, error, transferId) => [
        { type: "FileTransfers", id: transferId },
      ],
    }),

    // Get all my transfers
    getMyTransfers: builder.query<
      { success: boolean; data: FileTransferStatus[] },
      void
    >({
      query: () => "/",
      providesTags: ["FileTransfers"],
    }),

    // Get network files
    getNetworkFiles: builder.query<
      {
        success: boolean;
        data: {
          files: Array<{
            transferId: string;
            fileName: string;
            filePath: string;
            fileSize: number;
            fileType?: string;
            uploadedBy: {
              userId: string;
              firstName: string;
              lastName: string;
              userName: string;
              avatar?: string;
              avatarUrl?: string;
            };
            uploadedAt: string;
          }>;
          networkInfo: {
            networkSubnet: string;
            yourIpAddress: string;
            totalFiles: number;
          };
        };
      },
      void
    >({
      query: () => "/network",
      providesTags: ["FileTransfers"],
    }),
  }),
});

export const {
  useGetTransferStatusQuery,
  useGetMyTransfersQuery,
  useGetNetworkFilesQuery,
} = fileTransferApi;

