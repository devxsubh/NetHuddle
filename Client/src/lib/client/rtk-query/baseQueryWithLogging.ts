import { fetchBaseQuery, BaseQueryFn, FetchArgs, FetchBaseQueryError } from "@reduxjs/toolkit/query/react";
import { RootState } from "../store/store";
import { setAuthToken, setRefreshToken, selectRefreshToken } from "../slices/authSlice";
import { setAuthCookie, removeAuthCookie } from "../utils/cookieUtils";

/**
 * Safely extract error information from RTK Query error objects
 */
function extractErrorInfo(error: any): Record<string, any> {
  const info: Record<string, any> = {};
  
  if (!error) {
    info.empty = "Error object is null or undefined";
    return info;
  }
  
  // Log error type first
  info.errorType = typeof error;
  info.isError = error instanceof Error;
  
  // Extract all enumerable properties
  try {
    const keys = Object.keys(error);
    info.enumerableKeys = keys;
    
    // Try to get all property names (including non-enumerable)
    const allKeys = Object.getOwnPropertyNames(error);
    info.allPropertyNames = allKeys;
  } catch (e) {
    info.keyExtractionError = String(e);
  }
  
  // Direct property access (most reliable)
  if (typeof error === "object") {
    // Status code (common in RTK Query errors)
    if (error.status !== undefined) {
      info.status = error.status;
    }
    
    // Error data (common in RTK Query errors)
    if (error.data !== undefined) {
      info.hasData = true;
      info.dataType = typeof error.data;
      
      if (error.data !== null) {
        try {
          // Try to stringify data
          const dataStr = JSON.stringify(error.data, null, 2);
          info.dataFormatted = dataStr;
          
          // Extract common fields from data
          if (typeof error.data === "object") {
            if (error.data.message) info.errorMessage = error.data.message;
            if (error.data.error) info.error = error.data.error;
            if (error.data.success !== undefined) info.success = error.data.success;
          }
        } catch (e) {
          info.dataStringifyError = String(e);
          // Try to access properties directly
          if (error.data && typeof error.data === "object") {
            try {
              info.dataMessage = (error.data as any).message;
              info.dataError = (error.data as any).error;
            } catch (e2) {
              // Ignore
            }
          }
        }
      }
    }
    
    // Standard Error properties
    if (error.message !== undefined) {
      info.message = error.message;
    }
    if (error.name !== undefined) {
      info.name = error.name;
    }
    if (error.stack !== undefined) {
      info.hasStack = true;
      info.stackPreview = String(error.stack).substring(0, 200);
    }
    
    // Try to stringify the whole error (with replacer for circular refs)
    try {
      const seen = new WeakSet();
      const stringified = JSON.stringify(error, (key, value) => {
        if (typeof value === "object" && value !== null) {
          if (seen.has(value)) {
            return "[Circular]";
          }
          seen.add(value);
        }
        // Skip functions and undefined
        if (typeof value === "function" || value === undefined) {
          return "[Function/Undefined]";
        }
        return value;
      }, 2);
      if (stringified && stringified !== "{}" && stringified !== "null") {
        info.fullError = JSON.parse(stringified);
      } else {
        info.stringifiedEmpty = true;
      }
    } catch (e) {
      info.stringifyError = String(e);
    }
  } else {
    // Primitive error
    info.rawError = String(error);
  }
  
  // If we still have nothing useful, log the error directly
  if (Object.keys(info).length === 0 || (Object.keys(info).length === 1 && info.errorType)) {
    info.fallback = "Using direct error logging";
    info.directError = error;
  }
  
  return info;
}

// Custom baseQuery that logs all responses and handles token refresh
export const createBaseQueryWithLogging = (
  baseUrl: string,
  getAuthToken?: (state: RootState) => string | null,
  getRefreshToken?: (state: RootState) => string | null
): BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> => {
  const baseQuery = fetchBaseQuery({
    baseUrl,
    credentials: "include",
    prepareHeaders: (headers, { getState }) => {
      if (getAuthToken) {
        const token = getAuthToken(getState() as RootState);
        if (token) {
          headers.set("Authorization", `Bearer ${token}`);
        }
      }
      return headers;
    },
  });

  // Wrap the baseQuery to add logging and token refresh
  const baseQueryWithLogging: BaseQueryFn<
    string | FetchArgs,
    unknown,
    FetchBaseQueryError
  > = async (args, api, extraOptions) => {
    let result;
    try {
      result = await baseQuery(args, api, extraOptions);
    } catch (rawError) {
      // If baseQuery throws, wrap it
      console.error("❌ BaseQuery threw an error:", rawError);
      result = { error: rawError as any };
    }

    // Handle 401 errors with automatic token refresh
    if (result.error && getRefreshToken) {
      const error = result.error as any;
      const status = error.status || result.meta?.response?.status;
      const url = typeof args === "string" ? args : args.url || "";
      
      // If we get a 401 and have a refresh token, try to refresh
      // Skip refresh for auth endpoints to avoid infinite loops
      const isAuthEndpoint = url.includes('/refresh-tokens') || 
                            url.includes('/signin') || 
                            url.includes('/signup') ||
                            url.includes('/signout');
      
      if (status === 401 && !isAuthEndpoint) {
        const state = api.getState() as RootState;
        const refreshToken = getRefreshToken(state);
        
        if (refreshToken) {
          try {
            console.log("🔄 Attempting to refresh token...");
            
            // Create a separate baseQuery for refresh (without auth header)
            // Use the main base URL for auth endpoint
            const authBaseUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:666'}/api/v1/auth`;
            const refreshBaseQuery = fetchBaseQuery({
              baseUrl: authBaseUrl,
              credentials: "include",
            });
            
            // Try to refresh the token
            const refreshResult = await refreshBaseQuery(
              {
                url: "/refresh-tokens",
                method: "POST",
                body: { refreshToken },
              },
              api,
              extraOptions
            );

            if (refreshResult.data && !refreshResult.error) {
              const refreshData = refreshResult.data as any;
              if (refreshData.success && refreshData.data?.tokens) {
                const newAccessToken = refreshData.data.tokens.accessToken.token;
                const newRefreshToken = refreshData.data.tokens.refreshToken?.token;
                
                // Update tokens in Redux
                api.dispatch(setAuthToken(newAccessToken));
                if (newRefreshToken) {
                  api.dispatch(setRefreshToken(newRefreshToken));
                }
                
                // Update cookie
                setAuthCookie(newAccessToken, 'token');
                
                console.log("✅ Token refreshed successfully, retrying original request...");
                
                // Retry the original request with new token
                const retryResult = await baseQuery(args, api, extraOptions);
                return retryResult;
              }
            }
          } catch (refreshError) {
            console.error("❌ Token refresh failed:", refreshError);
            // If refresh fails, clear tokens and redirect to login
            api.dispatch(setAuthToken(null));
            api.dispatch(setRefreshToken(null));
            removeAuthCookie('token');
            
            // Redirect to login page if we're in the browser
            if (typeof window !== 'undefined') {
              const currentPath = window.location.pathname;
              const isPublicRoute = currentPath.startsWith('/auth/login') || 
                                   currentPath.startsWith('/auth/signup') ||
                                   currentPath.startsWith('/auth/forgot-password') ||
                                   currentPath.startsWith('/auth/reset-password');
              
              if (!isPublicRoute) {
                window.location.href = '/auth/login';
              }
            }
          }
        } else {
          // No refresh token available, clear tokens and redirect
          api.dispatch(setAuthToken(null));
          api.dispatch(setRefreshToken(null));
          removeAuthCookie('token');
          
          // Redirect to login page if we're in the browser
          if (typeof window !== 'undefined') {
            const currentPath = window.location.pathname;
            const isPublicRoute = currentPath.startsWith('/auth/login') || 
                                 currentPath.startsWith('/auth/signup') ||
                                 currentPath.startsWith('/auth/forgot-password') ||
                                 currentPath.startsWith('/auth/reset-password');
            
            if (!isPublicRoute) {
              window.location.href = '/auth/login';
            }
          }
        }
      }
    }

    // Log request details
    const url = typeof args === "string" ? args : args.url;
    const method = typeof args === "string" ? "GET" : (args.method || "GET");
    const fullUrl = typeof args === "string" 
      ? `${baseUrl}${url}` 
      : `${baseUrl}${url}`;
    
    console.group(`🌐 API ${method} ${fullUrl}`);
    console.log("📤 Request:", typeof args === "string" ? { url } : { ...args, body: args.body instanceof FormData ? "[FormData]" : args.body });
    
    // Log the entire result object first
    console.log("📦 Full Result Object:", {
      hasData: 'data' in result,
      hasError: 'error' in result,
      hasMeta: 'meta' in result,
      resultKeys: Object.keys(result),
    });
    
    // Log response details
    if (result.data) {
      console.log("✅ Response Body:", result.data);
      console.log("Response Type:", typeof result.data);
      if (typeof result.data === "object" && result.data !== null) {
        console.log("Response Keys:", Object.keys(result.data));
        // Pretty print the response
        try {
          console.log("Response (formatted):", JSON.stringify(result.data, null, 2));
        } catch (e) {
          console.log("Response (could not stringify):", result.data);
        }
      }
    }
    
    if (result.error) {
      const error = result.error as any;
      const errorKeys = Object.keys(error);
      
      // Check meta first - it often has the real error info
      let status: number | undefined;
      let statusText: string | undefined;
      let responseData: any = null;
      
      if (result.meta?.response) {
        status = result.meta.response.status;
        statusText = result.meta.response.statusText;
        try {
          // Try to get response body if available
          const response = result.meta.response;
          if (response.bodyUsed === false && response.json) {
            // Response might have been consumed, check if we can get the data
          }
        } catch (e) {
          // Ignore
        }
      }
      
      // Extract error properties
      const errorInfo: Record<string, any> = {
        hasKeys: errorKeys.length > 0,
        keys: errorKeys,
        status: error.status ?? status,
        originalStatus: error.originalStatus,
        data: error.data,
        message: error.message,
      };
      
      // If error object is empty, check meta
      if (errorKeys.length === 0 && result.meta) {
        errorInfo.metaAvailable = true;
        errorInfo.metaStatus = status;
        errorInfo.metaStatusText = statusText;
        errorInfo.metaRequest = result.meta.request;
      }
      
      // Try to get error message from data
      let errorMessage: string;
      if (error.data) {
        if (typeof error.data === 'string') {
          errorMessage = error.data;
        } else if (typeof error.data === 'object' && error.data !== null) {
          errorMessage = error.data.message || error.data.error || error.data.msg || 'Server error';
          if (error.data.details) {
            errorInfo.details = error.data.details;
          }
        } else {
          errorMessage = 'Server error';
        }
      } else if (error.message) {
        errorMessage = error.message;
      } else if (status) {
        errorMessage = 
          status === 401 ? "Unauthorized - Please login again" :
          status === 403 ? "Forbidden - You don't have permission" :
          status === 404 ? "Not Found - Resource doesn't exist" :
          status === 500 ? "Server Error - Please try again later" :
          statusText || `HTTP ${status} Error`;
      } else {
        errorMessage = "Unknown error occurred";
      }
      
      // Log error information
      console.error("❌ API Error:", {
        message: errorMessage,
        status: errorInfo.status,
        ...(errorInfo.data && { data: errorInfo.data }),
        ...(errorKeys.length === 0 && { note: "Error object is empty, using meta information" }),
      });
      
      // In development, log more details
      if (process.env.NODE_ENV === 'development') {
        console.error("❌ Error Details:", errorInfo);
        if (result.meta) {
          console.error("❌ Response Meta:", {
            status: result.meta.response?.status,
            statusText: result.meta.response?.statusText,
            url: result.meta.request?.url,
          });
        }
      }
    }
    
    if (result.meta) {
      console.log("📋 Meta:", result.meta);
    }
    console.groupEnd();

    return result;
  };

  return baseQueryWithLogging;
};

