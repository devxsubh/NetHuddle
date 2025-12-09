"use client";
import { useForgotPasswordMutation } from "@/lib/client/rtk-query/auth.api";
import {
  forgotPasswordSchema,
  forgotPasswordSchemaType,
} from "@/lib/shared/zod/schemas/auth.schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { SubmitHandler, useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { CircleLoading } from "../shared/CircleLoading";

export const ForgotPasswordForm = () => {
  const [forgotPassword, { isLoading }] = useForgotPasswordMutation();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, handleSubmit, formState: { errors }, setValue } = useForm<forgotPasswordSchemaType>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit: SubmitHandler<forgotPasswordSchemaType> = async ({ email }) => {
    try {
      setIsSubmitting(true);
      const result = await forgotPassword({ email }).unwrap();
      if (result.success) {
        toast.success("Password reset link sent to your email!");
    setValue("email", "");
      }
    } catch (error: any) {
      const errorMessage =
        error?.data?.message || error?.message || "Failed to send reset link. Please try again.";
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-y-4">
      <input
        {...register("email")}
        className="p-3 rounded outline outline-1 outline-secondary-dark text-text bg-background hover:outline-primary"
        placeholder="Registered Email"
      />
      {errors.email?.message && <p className="text-red-500 text-sm">{errors.email.message}</p>}
      <SubmitButton isLoading={isSubmitting || isLoading} />
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
      {isLoading ? <CircleLoading size="6" /> : "Send reset link"}
  </button>
  )
}
