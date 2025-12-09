"use client";

import { useCheckAuthQuery } from "@/lib/client/rtk-query/auth.api";
import { updateLoggedInUser, setAuthToken } from "@/lib/client/slices/authSlice";
import { useAppDispatch } from "@/lib/client/store/hooks";
import { useEffect, useState } from "react";
import { getAuthCookie, removeAuthCookie } from "@/lib/client/utils/cookieUtils";

/**
 * Component to initialize auth state on app load
 * - Checks for token in cookies
 * - Fetches user data if token exists
 * - Syncs Redux state with cookies
 */
export const AuthInitializer = () => {
  const dispatch = useAppDispatch();
  const [token, setToken] = useState<string | null>(null);
  
  // Get token from cookies on mount
  useEffect(() => {
    const cookieToken = getAuthCookie('token');
    setToken(cookieToken);
    if (cookieToken) {
      // Sync token to Redux state
      dispatch(setAuthToken(cookieToken));
    }
  }, [dispatch]);

  // Fetch user data if token exists
  const { data: user, isLoading, isError } = useCheckAuthQuery(undefined, {
    skip: !token, // Skip query if no token
  });

  useEffect(() => {
    if (user && !isLoading) {
      // Update user in Redux state
      dispatch(updateLoggedInUser(user));
    } else if (isError && token) {
      // Token is invalid, clear it
      removeAuthCookie('token');
      dispatch(setAuthToken(null));
      dispatch(updateLoggedInUser(null));
      setToken(null);
    }
  }, [user, isLoading, isError, token, dispatch]);

  return null;
};

