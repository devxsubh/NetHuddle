'use client';

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useEffect } from "react";
import { CircleLoading } from "@/components/shared/CircleLoading";

/**
 * Redirect page for old verification email links
 * Redirects /verify-email?token=... to /auth/verify-email?token=...
 */
function VerifyEmailRedirectContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  useEffect(() => {
    if (token) {
      // Redirect to the correct route with the token
      router.replace(`/auth/verify-email?token=${token}`);
    } else {
      // No token, redirect to login
      router.replace('/auth/login');
    }
  }, [token, router]);

  return (
    <div className="flex flex-col items-center justify-center gap-y-4 min-h-screen">
      <CircleLoading size="8" />
      <p className="text-lg">Redirecting...</p>
    </div>
  );
}

export default function VerifyEmailRedirectPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center gap-y-4 min-h-screen">
        <CircleLoading size="8" />
        <p className="text-lg">Loading...</p>
      </div>
    }>
      <VerifyEmailRedirectContent />
    </Suspense>
  );
}

