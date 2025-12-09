"use client";

import { setAuthToken } from "@/lib/client/slices/authSlice";
import { useAppDispatch } from "@/lib/client/store/hooks";
import { useEffect } from "react";
import { getAuthCookie } from "@/lib/client/utils/cookieUtils";

/**
 * Hook to fetch and sync auth token from cookies to Redux state
 * Note: This is now handled by AuthInitializer, but kept for backward compatibility
 */
export const useFetchAuthToken = () => {
  const dispatch = useAppDispatch();

  useEffect(() => {
    const token = getAuthCookie('token');
    if (token) {
      dispatch(setAuthToken(token));
    }
  }, [dispatch]);
};
