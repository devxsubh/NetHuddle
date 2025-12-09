import { FetchUserInfoResponse } from "@/interfaces/server.types";
import { createApi } from "@reduxjs/toolkit/query/react";
import { RootState } from "../store/store";
import { updateLoggedInUser, setAuthToken, setRefreshToken, clearAuthTokens } from "../slices/authSlice";
import { createBaseQueryWithLogging } from "./baseQueryWithLogging";
import { setAuthCookie, removeAuthCookie } from "../utils/cookieUtils";

/**
 * Transform backend user response to frontend format
 * Backend uses: confirmed, userName, firstName, lastName, avatar (filename), avatarUrl (full URL)
 * Frontend expects: emailVerified, username, name, avatar (full URL)
 */
const transformUserResponse = (user: any): FetchUserInfoResponse => {
  // Construct avatar URL: use avatarUrl if available, otherwise construct from avatar filename
  let avatarUrl = user.avatarUrl;
  if (!avatarUrl && user.avatar) {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:666';
    // If avatar is already a full URL, use it; otherwise construct it
    if (user.avatar.startsWith('http://') || user.avatar.startsWith('https://')) {
      avatarUrl = user.avatar;
    } else {
      avatarUrl = `${baseUrl}/images/${user.avatar}`;
    }
  }
  
  return {
    ...user,
    emailVerified: user.confirmed ?? user.emailVerified ?? false,
    username: user.userName ?? user.username,
    name: user.firstName && user.lastName 
      ? `${user.firstName} ${user.lastName}`
      : user.name ?? user.userName ?? '',
    avatar: avatarUrl || user.avatar || '', // Use full URL for avatar
    // Ensure all required fields have defaults
    publicKey: user.publicKey ?? null,
    notificationsEnabled: user.notificationsEnabled ?? false,
    verificationBadge: user.verificationBadge ?? false,
    isOnline: user.isOnline ?? false,
    lastSeen: user.lastSeen ?? null,
  } as FetchUserInfoResponse;
};

// Backend response format
type BackendResponse<T> = {
  success: boolean;
  data: T;
};

// Auth tokens from backend - matches actual backend response structure
type AuthTokens = {
  accessToken: {
    token: string;
    expires: string;
  };
  refreshToken: {
    token: string;
    expires: string;
  };
};

// Signup request body matching backend validator
type SignupRequest = {
  firstName: string;
  lastName: string;
  userName: string;
  email: string;
  password: string;
};

// Signin request body matching backend validator
type SigninRequest = {
  userName: string;
  password: string;
};

// Signup response
type SignupResponse = {
  user: any;
  tokens: AuthTokens;
};

// Signin response
type SigninResponse = {
  user: any;
  tokens: AuthTokens;
};

// GetMe response
type GetMeResponse = any;

export const authApi = createApi({
  reducerPath: "authApi",
  baseQuery: createBaseQueryWithLogging(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/v1/auth`,
    (state) => state.authSlice.authToken,
    (state) => state.authSlice.refreshToken
  ),
  tagTypes: ["User"],
  endpoints: (builder) => ({
    // Signup endpoint
    signup: builder.mutation<BackendResponse<SignupResponse>, SignupRequest>({
      query: (body) => ({
        url: "/signup",
        method: "POST",
        body,
      }),
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          if (data.success && data.data.tokens) {
            const accessToken = data.data.tokens.accessToken.token;
            const refreshToken = data.data.tokens.refreshToken.token;
            
            // Store tokens in Redux
            dispatch(setAuthToken(accessToken));
            dispatch(setRefreshToken(refreshToken));
            
            // Store access token in cookie for middleware
            setAuthCookie(accessToken, 'token');
            
            // Update user info if needed
            if (data.data.user) {
              const transformedUser = transformUserResponse(data.data.user);
              dispatch(updateLoggedInUser(transformedUser));
            }
          }
        } catch (error) {
          console.error("Signup error:", error);
        }
      },
    }),

    // Signin endpoint
    signin: builder.mutation<BackendResponse<SigninResponse>, SigninRequest>({
      query: (body) => ({
        url: "/signin",
        method: "POST",
        body,
      }),
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          if (data.success && data.data.tokens) {
            const accessToken = data.data.tokens.accessToken.token;
            const refreshToken = data.data.tokens.refreshToken.token;
            
            // Store tokens in Redux
            dispatch(setAuthToken(accessToken));
            dispatch(setRefreshToken(refreshToken));
            
            // Store access token in cookie for middleware
            setAuthCookie(accessToken, 'token');
            
            // Update user info
            if (data.data.user) {
              const transformedUser = transformUserResponse(data.data.user);
              dispatch(updateLoggedInUser(transformedUser));
            }
          }
        } catch (error) {
          console.error("Signin error:", error);
        }
      },
    }),

    // Get current user (simplified)
    getCurrent: builder.query<BackendResponse<any>, void>({
      query: () => "/current",
      providesTags: ["User"],
    }),

    // Get me (full user info)
    getMe: builder.query<BackendResponse<GetMeResponse>, void>({
      query: () => "/me",
      providesTags: ["User"],
      transformResponse: (response: BackendResponse<any>) => {
        if (response.success && response.data) {
          const transformed = transformUserResponse(response.data);
          return {
            ...response,
            data: transformed,
          };
        }
        return response;
      },
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          if (data.success && data.data) {
            dispatch(updateLoggedInUser(data.data as FetchUserInfoResponse));
          }
        } catch (error) {
          console.error("GetMe error:", error);
        }
      },
    }),

    // Update me
    updateMe: builder.mutation<
      BackendResponse<any>,
      {
        firstName?: string;
        lastName?: string;
        userName?: string;
        email?: string;
        password?: string;
        avatar?: string;
      }
    >({
      query: (body) => ({
        url: "/me",
        method: "PUT",
        body,
      }),
      invalidatesTags: ["User"],
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          if (data.success && data.data) {
            const transformedUser = transformUserResponse(data.data);
            dispatch(updateLoggedInUser(transformedUser));
          }
        } catch (error) {
          console.error("UpdateMe error:", error);
        }
      },
    }),

    // Signout - backend expects refreshToken in body
    signout: builder.mutation<BackendResponse<string>, { refreshToken: string }>({
      query: (body) => ({
        url: "/signout",
        method: "POST",
        body,
      }),
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          // Clear auth state
          dispatch(clearAuthTokens());
          dispatch(updateLoggedInUser(null));
          // Clear cookies
          removeAuthCookie('token');
        } catch (error) {
          console.error("Signout error:", error);
          // Even if signout fails, clear tokens
          dispatch(clearAuthTokens());
          dispatch(updateLoggedInUser(null));
          // Clear cookies
          removeAuthCookie('token');
        }
    },
  }),

    // Refresh tokens
    refreshTokens: builder.mutation<
      BackendResponse<{ tokens: AuthTokens }>,
      { refreshToken: string }
    >({
      query: (body) => ({
        url: "/refresh-tokens",
        method: "POST",
        body,
      }),
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          if (data.success && data.data.tokens) {
            const accessToken = data.data.tokens.accessToken.token;
            const refreshToken = data.data.tokens.refreshToken?.token;
            
            // Store tokens in Redux
            dispatch(setAuthToken(accessToken));
            if (refreshToken) {
              dispatch(setRefreshToken(refreshToken));
            }
            
            // Update cookie
            setAuthCookie(accessToken, 'token');
          }
        } catch (error) {
          console.error("Refresh tokens error:", error);
        }
      },
    }),

    // Send verification email
    sendVerificationEmail: builder.mutation<BackendResponse<string>, void>({
      query: () => ({
        url: "/send-verification-email",
        method: "POST",
      }),
    }),

    // Verify email - backend expects token as query parameter
    verifyEmail: builder.mutation<BackendResponse<string>, { token: string }>({
      query: ({ token }) => ({
        url: `/verify-email?token=${encodeURIComponent(token)}`,
        method: "POST",
      }),
    }),

    // Forgot password
    forgotPassword: builder.mutation<BackendResponse<string>, { email: string }>({
      query: (body) => ({
        url: "/forgot-password",
        method: "POST",
        body,
      }),
    }),

    // Reset password - backend expects token as query parameter and password in body
    resetPassword: builder.mutation<
      BackendResponse<string>,
      { token: string; password: string }
    >({
      query: ({ token, password }) => ({
        url: `/reset-password?token=${encodeURIComponent(token)}`,
        method: "POST",
        body: { password },
      }),
    }),

    checkAuth: builder.query<FetchUserInfoResponse | null, void>({
      query: () => "/me",
      transformResponse: (response: BackendResponse<any>) => {
        return response.success ? (response.data as any) : null;
      },
    }),
  }),
});

export const {
  useSignupMutation,
  useSigninMutation,
  useGetCurrentQuery,
  useGetMeQuery,
  useUpdateMeMutation,
  useSignoutMutation,
  useRefreshTokensMutation,
  useSendVerificationEmailMutation,
  useVerifyEmailMutation,
  useForgotPasswordMutation,
  useResetPasswordMutation,
  useCheckAuthQuery,
} = authApi;
