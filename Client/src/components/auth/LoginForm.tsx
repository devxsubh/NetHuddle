"use client";
import { useSigninMutation } from "@/lib/client/rtk-query/auth.api";
import {
  loginSchema,
  loginSchemaType,
} from "@/lib/shared/zod/schemas/auth.schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { CircleLoading } from "../shared/CircleLoading";
import { AuthRedirectLink } from "./AuthRedirectLink";

export const LoginForm = () => {
  const [signin, { isLoading }] = useSigninMutation();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<loginSchemaType>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: loginSchemaType) => {
    try {
      setIsSubmitting(true);
      const result = await signin({
        userName: data.userName,
        password: data.password,
      }).unwrap();

      if (result.success && result.data.user && result.data.tokens) {
        toast.success("Login successful!");
        // Wait a bit for state to be populated, then redirect
        setTimeout(() => {
          router.push("/");
          router.refresh(); // Refresh to trigger middleware
        }, 100);
      }
    } catch (error: any) {
      const errorMessage =
        error?.data?.message || error?.message || "Login failed. Please try again.";
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-y-6">
      <div className="flex flex-col gap-y-4">
        <div className="flex flex-col gap-y-1">
          <input
            {...register("userName")}
            name="userName"
            className="p-3 rounded outline outline-1 outline-secondary-dark text-text bg-background hover:outline-primary"
            placeholder="Username"
          />
          {errors.userName?.message && (
            <p className="text-red-500 text-sm">{errors.userName?.message}</p>
          )}
        </div>

        <div className="flex flex-col gap-y-1">
          <input
            {...register("password")}
            name="password"
            type="password"
            className="p-3 rounded outline outline-1 outline-secondary-dark text-text bg-background hover:outline-primary"
            placeholder="Password"
          />
          {errors.password?.message && (
            <p className="text-red-500 text-sm">{errors.password?.message}</p>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-y-6">
        <div className="flex flex-col gap-y-2">
          <SubmitButton isLoading={isSubmitting || isLoading} />
        </div>

        <div className="flex justify-between items-center flex-wrap gap-1">
          <AuthRedirectLink
            pageName="Signup"
            text="Create new account?"
            to="auth/signup"
          />
          <AuthRedirectLink
            pageName="forgot password"
            text="Need Help?"
            to="auth/forgot-password"
          />
        </div>
      </div>
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
      } text-white px-6 py-3 rounded shadow-lg font-medium text-center flex justify-center`}
    >
      {isLoading ? <CircleLoading size="6" /> : "Login"}
    </button>
  );
}
