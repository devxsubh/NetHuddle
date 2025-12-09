'use client';
/**
 * Note: This component is kept for backward compatibility but is not currently used.
 * The backend uses token-based email verification (not OTP).
 * Users receive a verification link in their email which redirects to /auth/verify-email?token=...
 */
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import toast from "react-hot-toast";

type PropTypes = {
  loggedInUserId: string;
}

export const OtpVerificationForm = ({ loggedInUserId }: PropTypes) => {
  const router = useRouter();

  useEffect(() => {
    toast.info("Please check your email and click on the verification link to verify your account.");
  }, []);

  return (
    <div className="flex flex-col gap-y-4">
      <p className="text-lg text-fluid-p">
        A verification email has been sent. Please check your email and click on the verification link.
      </p>
      <p className="text-sm text-gray-400">
        If you didn&apos;t receive the email, please check your spam folder or request a new verification email.
      </p>
    </div>
  );
};
