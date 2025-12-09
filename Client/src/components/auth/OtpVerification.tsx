"use client";

import { useSendVerificationEmailMutation, useSignoutMutation } from "@/lib/client/rtk-query/auth.api";
import { useAppSelector } from "@/lib/client/store/hooks";
import { selectRefreshToken } from "@/lib/client/slices/authSlice";
import { FormEvent, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { CircleLoading } from "../shared/CircleLoading";
import { OtpVerificationForm } from "./OtpVerificationForm";
import { useRouter } from "next/navigation";

type PropTypes = {
  email: string;
  loggedInUserId: string;
  username: string;
}

export const OtpVerification = ({email,loggedInUserId,username}:PropTypes) => {
  const [sendVerificationEmail, { isLoading, isSuccess, isError, error }] = useSendVerificationEmailMutation();
  const [signout] = useSignoutMutation();
  const refreshToken = useAppSelector(selectRefreshToken);
  const router = useRouter();
  const [emailSent, setEmailSent] = useState(false);

  useEffect(()=>{
    if(isError) {
      const errorMessage = (error as any)?.data?.message || (error as any)?.message || "Failed to send verification email";
      toast.error(errorMessage);
    }
    if(isSuccess) {
      toast.success("Verification email sent successfully! Please check your email.");
      setEmailSent(true);
    }
  },[isError, isSuccess, error])

  const handleSubmit = async (e: FormEvent<HTMLFormElement>)=>{
    e.preventDefault();
    try {
      await sendVerificationEmail().unwrap();
    } catch (err) {
      // Error handled in useEffect
    }
  }

  const handleLogoutClick = async()=>{
    try {
      if (refreshToken) {
        await signout({ refreshToken }).unwrap();
      }
      router.push("/auth/login");
      router.refresh();
    } catch (error) {
      // Even if signout fails, redirect
      router.push("/auth/login");
      router.refresh();
    }
  }

  return (
    emailSent ? (
      <div className="flex flex-col gap-y-4">
        <p className="text-lg text-fluid-p">
          A verification email has been sent to <strong>{email}</strong>. 
          Please check your email and click on the verification link to verify your account.
        </p>
        <p className="text-sm text-gray-400">
          If you didn&apos;t receive the email, you can request a new one.
        </p>
        <div className="flex gap-4">
          <button
            onClick={() => setEmailSent(false)}
            className="bg-primary px-6 py-2 rounded-sm max-sm:w-full"
          >
            Resend Email
          </button>
          <button 
            onClick={handleLogoutClick} 
            className="bg-secondary-dark px-6 py-2 rounded-sm max-sm:w-full"
          >
            Logout Instead
          </button>
        </div>
      </div>
    )
    :
    (
      <div className="flex gap-4">
        <form onSubmit={handleSubmit}>
          <button
            disabled={isLoading}
            type="submit"
            className={`${isLoading?"bg-transparent":"bg-primary"} px-6 py-2 rounded-sm max-sm:w-full`}
          >
            {isLoading ? <CircleLoading/> : "Send Verification Email"}
          </button>
        </form>
        <button 
          onClick={handleLogoutClick} 
          className="bg-secondary-dark px-6 py-2 rounded-sm max-sm:w-full"
        >
          Logout Instead
        </button>
      </div>
    )
  );
};
