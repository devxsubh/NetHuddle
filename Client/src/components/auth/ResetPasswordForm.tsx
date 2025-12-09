"use client";
import { useResetPasswordMutation } from "@/lib/client/rtk-query/auth.api";
import {
  resetPasswordSchema,
  resetPasswordSchemaType,
} from "@/lib/shared/zod/schemas/auth.schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { SubmitHandler, useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { CircleLoading } from "../shared/CircleLoading";

type PropTypes = {
  token: string;
};

export const ResetPasswordForm = ({ token }: PropTypes) => {
  const router = useRouter();
  const [resetPassword, { isLoading, isSuccess, isError, error }] = useResetPasswordMutation();

  const {register,handleSubmit,formState: { errors }} = useForm<resetPasswordSchemaType>({resolver: zodResolver(resetPasswordSchema)});

  useEffect(() => {
    if (isSuccess) {
      toast.success("Password reset successfully!");
      router.push("/auth/login");
    }
  }, [isSuccess, router]);

  useEffect(() => {
    if (isError) {
      const errorMessage = (error as any)?.data?.message || (error as any)?.message || "Password reset failed";
      toast.error(errorMessage);
    }
  }, [isError, error]);

  const onSubmit: SubmitHandler<resetPasswordSchemaType> = async ({ newPassword }) => {
    try {
      await resetPassword({ token, password: newPassword }).unwrap();
    } catch (error) {
      // Error is handled in useEffect
      console.error("Reset password error:", error);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-y-4">

      <input {...register("newPassword")} type="password" className="p-3 rounded outline outline-1 outline-secondary-dark text-text bg-background hover:outline-primary" placeholder="New password"/>
      {errors.newPassword?.message && <p className="text-red-500 text-sm">{errors.newPassword?.message}</p>}

      <input {...register("confirmPassword")} type="password" className="p-3 rounded outline outline-1 outline-secondary-dark text-text bg-background hover:outline-primary" placeholder="Confirm new password"/>
      {errors.confirmPassword?.message && <p className="text-red-500 text-sm">{errors.confirmPassword?.message}</p>}

      <SubmitButton isLoading={isLoading} />
    </form>
  );
};

function SubmitButton({ isLoading }: { isLoading: boolean }) {
  return (
    <button
      disabled={isLoading}
      type="submit"
      className={`w-full ${
        isLoading ? "bg-background" : "bg-primary"
      } text-white px-6 py-3 rounded shadow-lg font-medium text-center flex justify-center disabled:bg-gray-400`}
    >
      {isLoading ? <CircleLoading size="6" /> : "Update Password"}
    </button>
  );
}