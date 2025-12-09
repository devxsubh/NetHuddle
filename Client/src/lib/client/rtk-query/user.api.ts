import { FetchUserInfoResponse } from "@/interfaces/server.types";
import { createApi } from "@reduxjs/toolkit/query/react";
import { updateLoggedInUser } from "../slices/authSlice";
import { RootState } from "../store/store";
import { createBaseQueryWithLogging } from "./baseQueryWithLogging";

// Backend response format
type BackendResponse<T> = {
  success: boolean;
  data: T;
  pagination?: {
    total: number;
  };
};

// Search users query params
type SearchUsersParams = {
  q?: string;
  sortBy?: string;
  sortDirection?: string;
  limit?: number;
  page?: number;
};

export const userApi = createApi({
  reducerPath: "userApi",
  baseQuery: createBaseQueryWithLogging(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/v1/users`,
    (state) => state.authSlice.authToken,
    (state) => state.authSlice.refreshToken
  ),
  tagTypes: ["User", "Users"],
  endpoints: (builder) => ({
    // Get users (with search)
    getUsers: builder.query<BackendResponse<any[]>, SearchUsersParams>({
      query: (params) => ({
        url: "/",
        params,
      }),
      providesTags: ["Users"],
    }),

    // Get user by ID
    getUser: builder.query<BackendResponse<any>, string>({
      query: (userId) => `/${userId}`,
      providesTags: (result, error, userId) => [{ type: "User", id: userId }],
    }),

    // Update user
    updateUser: builder.mutation<
      BackendResponse<any>,
      { userId: string; data: Partial<any> }
    >({
      query: ({ userId, data }) => ({
        url: `/${userId}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: (result, error, { userId }) => [
        { type: "User", id: userId },
        "Users",
      ],
    }),

    // Delete user
    deleteUser: builder.mutation<BackendResponse<string>, string>({
      query: (userId) => ({
        url: `/${userId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Users"],
    }),

    // Update profile (avatar)
    updateProfile: builder.mutation<BackendResponse<any>, { avatar: Blob }>({
      query: ({ avatar }) => {
        const formData = new FormData();
        formData.append("avatar", avatar);
        return {
          url: "/",
          method: "PATCH",
          body: formData,
        };
      },
      async onQueryStarted({}, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          if (data.success && data.data) {
            dispatch(updateLoggedInUser(data.data as any));
          }
        } catch (error) {
          console.error("Update profile error:", error);
        }
      },
      invalidatesTags: ["User"],
    }),

    // Search users by username (for friend search)
    searchUsers: builder.query<
      BackendResponse<any[]>,
      { username: string }
    >({
      query: ({ username }) => ({
        url: "/",
        params: { q: username },
    }),
      transformResponse: (response: BackendResponse<any[]>) => {
        // Filter by username match
        if (response.success && response.data) {
          return {
            ...response,
            data: response.data.filter((user: any) =>
              user.userName?.toLowerCase().includes(username.toLowerCase())
            ),
          };
        }
        return response;
      },
    }),
  }),
});

export const {
  useGetUsersQuery,
  useGetUserQuery,
  useUpdateUserMutation,
  useDeleteUserMutation,
  useUpdateProfileMutation,
  useSearchUsersQuery,
  useLazySearchUsersQuery,
} = userApi;
