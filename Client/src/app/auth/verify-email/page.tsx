'use client';

import { useVerifyEmailMutation } from "@/lib/client/rtk-query/auth.api";
import { updateLoggedInUser } from "@/lib/client/slices/authSlice";
import { useAppDispatch } from "@/lib/client/store/hooks";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useEffect } from "react";
import toast from "react-hot-toast";
import { CircleLoading } from "@/components/shared/CircleLoading";

function VerifyEmailPageContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [verifyEmail, { isLoading, isSuccess, isError, error }] = useVerifyEmailMutation();
  
  // Helper to check if user has auth token
  const getAuthToken = () => {
    if (typeof window === 'undefined') return null;
    const cookie = document.cookie
      .split('; ')
      .find(row => row.startsWith('token='));
    return cookie ? cookie.split('=')[1] : null;
  };
  
  // Check if user has auth token (for determining redirect destination)
  const authToken = typeof window !== 'undefined' ? getAuthToken() : null;

  useEffect(() => {
    console.log("🔍 Verify Email Page - Token:", token ? "Present" : "Missing");
    
    if (token) {
      console.log("📧 Attempting to verify email with token...");
      verifyEmail({ token })
        .unwrap()
        .then((result) => {
          console.log("✅ Email verification successful:", result);
        })
        .catch((err) => {
          console.error("❌ Email verification failed:", err);
        });
    } else {
      console.error("❌ No verification token found in URL");
      toast.error("No verification token provided");
      router.push("/auth/login");
    }
  }, [token, verifyEmail, router]);

  useEffect(() => {
    if (isSuccess) {
      console.log("✅ Email verification successful!");
      toast.success("Email verified successfully!");
      
      // Check if user is logged in
      const currentAuthToken = getAuthToken();
      
      if (currentAuthToken) {
        // User is logged in - fetch updated user data manually
        console.log("🔄 User is logged in, fetching updated user data...");
        fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/v1/auth/me`, {
          headers: {
            'Authorization': `Bearer ${currentAuthToken}`,
            'Content-Type': 'application/json',
          },
        })
          .then(res => res.json())
          .then((result) => {
            console.log("✅ User data fetched:", result);
            if (result.success && result.data) {
              // Update Redux state with verified user data
              dispatch(updateLoggedInUser(result.data as any));
            }
            // Redirect to home page
            setTimeout(() => {
              window.location.href = "/";
            }, 500);
          })
          .catch((err) => {
            console.error("❌ Failed to fetch user data:", err);
            // Even if fetch fails, redirect to home (user is verified now)
            setTimeout(() => {
              window.location.href = "/";
            }, 500);
          });
      } else {
        // Not logged in, redirect to login page
        console.log("ℹ️ User not logged in, redirecting to login...");
        toast.success("Email verified! Please login to continue.");
        setTimeout(() => {
          window.location.href = "/auth/login";
        }, 1500);
      }
    }
  }, [isSuccess, dispatch]);

  useEffect(() => {
    if (isError) {
      console.error("❌ Email verification error:", error);
      const errorMessage = (error as any)?.data?.message || (error as any)?.message || "Email verification failed";
      console.error("❌ Error message:", errorMessage);
      toast.error(errorMessage);
      setTimeout(() => {
        router.push("/auth/login");
      }, 3000);
    }
  }, [isError, error, router]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center gap-y-4 min-h-screen">
        <CircleLoading size="8" />
        <p className="text-lg">Verifying your email...</p>
        {token && <p className="text-sm text-secondary-darker">Token: {token.substring(0, 20)}...</p>}
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="flex flex-col items-center justify-center gap-y-4 min-h-screen">
        <div className="text-4xl">✅</div>
        <p className="text-lg">Email verified successfully! Redirecting...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center gap-y-4 min-h-screen">
        <div className="text-4xl">❌</div>
        <p className="text-lg text-red-500">
          {(error as any)?.data?.message || (error as any)?.message || "Email verification failed"}
        </p>
        <p className="text-sm text-secondary-darker">Redirecting to login...</p>
      </div>
    );
  }

  // Initial state - waiting for token
  if (!token) {
    return (
      <div className="flex flex-col items-center justify-center gap-y-4 min-h-screen">
        <CircleLoading size="8" />
        <p className="text-lg">Loading verification page...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center gap-y-4 min-h-screen">
      <CircleLoading size="8" />
      <p className="text-lg">Preparing to verify...</p>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center gap-y-4 min-h-screen">
        <CircleLoading size="8" />
        <p className="text-lg">Loading...</p>
      </div>
    }>
      <VerifyEmailPageContent />
    </Suspense>
  );
}

