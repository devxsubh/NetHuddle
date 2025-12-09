import { fetchUserFriendRequestResponse } from "@/interfaces/server.types";
import { createApi } from "@reduxjs/toolkit/query/react";
import { setFriendRequestForm } from "../slices/uiSlice";
import { RootState } from "../store/store";
import { createBaseQueryWithLogging } from "./baseQueryWithLogging";
import { friendApi } from "./friend.api";

export const requestApi = createApi({
  reducerPath: "requestApi",
  baseQuery: createBaseQueryWithLogging(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/v1/request`,
    (state) => state.authSlice.authToken,
    (state) => state.authSlice.refreshToken
  ),
  tagTypes: ["FriendRequest"],
  endpoints: (builder) => ({

    sendFriendRequest: builder.mutation<void, { receiverId: string }>({
      query: ({ receiverId }) => ({
        url: "/",
        method: "POST",
        body: { receiver: receiverId },
      }),
      invalidatesTags: ["FriendRequest"],
    }),

    getUserFriendRequests: builder.query<fetchUserFriendRequestResponse[],void>({
      query: () => "/",
      providesTags: ["FriendRequest"],
      transformResponse: (response: { success: boolean; data: fetchUserFriendRequestResponse[] }) => {
        return response?.data || [];
      },
    }),

    handleFriendRequest: builder.mutation<{id:string, status: string},{ requestId: fetchUserFriendRequestResponse["id"]; action: "accept" | "reject" }>({
      query: ({ requestId, action }) => ({
        url: `/${requestId}`,
        method: "DELETE",
        body: { action },
      }),
      invalidatesTags: ["FriendRequest"],
      async onQueryStarted({ action }, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          
          // Optimistically update friend requests cache
          dispatch(
            requestApi.util.updateQueryData(
              "getUserFriendRequests",
              undefined,
              (draft) => {
                const friendRequestIndexToBeRemoved = draft.findIndex(
                  (draft) => draft.id === data.id
                );
                if (draft.length === 1) dispatch(setFriendRequestForm(false));
                if (friendRequestIndexToBeRemoved !== -1)
                  draft.splice(friendRequestIndexToBeRemoved, 1);
              }
            )
          );

          // If accepted, invalidate friends cache to refetch updated list
          if (action === "accept") {
            dispatch(
              friendApi.util.invalidateTags(["Friend"])
            );
          }
        } catch (error) {
          console.log(error);
        }
      },
    }),
  }),
});

export const {
  useSendFriendRequestMutation,
  useGetUserFriendRequestsQuery,
  useHandleFriendRequestMutation,
} = requestApi;
