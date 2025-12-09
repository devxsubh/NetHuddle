"use client";
import { useSignupMutation } from "@/lib/client/rtk-query/auth.api";
import { useConvertPrivateAndPublicKeyInJwkFormat } from "@/hooks/useAuth/useConvertPrivateAndPublicKeyInJwkFormat";
import { useEncryptPrivateKeyWithUserPassword } from "@/hooks/useAuth/useEncryptPrivateKeyWithUserPassword";
import { useGenerateKeyPair } from "@/hooks/useAuth/useGenerateKeyPair";
import { useStoreUserKeysInDatabase } from "@/hooks/useAuth/useStoreUserKeysInDatabase";
import { useStoreUserPrivateKeyInIndexedDB } from "@/hooks/useAuth/useStoreUserPrivateKeyInIndexedDB";
import { useUpdateLoggedInUserPublicKeyInState } from "@/hooks/useAuth/useUpdateLoggedInUserPublicKeyInState";
import type { signupSchemaType } from "@/lib/shared/zod/schemas/auth.schema";
import { signupSchema } from "@/lib/shared/zod/schemas/auth.schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { SubmitHandler, useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { CircleLoading } from "../shared/CircleLoading";
import { AuthRedirectLink } from "./AuthRedirectLink";

export const SignupForm = () => {
  const [signup, { isLoading }] = useSignupMutation();
  const router = useRouter();
  const [signupData, setSignupData] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<signupSchemaType>({ resolver: zodResolver(signupSchema) });

  const password = watch("password");

  const { privateKey, publicKey } = useGenerateKeyPair({ user: signupData });
  const { privateKeyJWK, publicKeyJWK } = useConvertPrivateAndPublicKeyInJwkFormat({ privateKey, publicKey });
  const { encryptedPrivateKey } = useEncryptPrivateKeyWithUserPassword({password,privateKeyJWK});
  const {publicKeyReturnedFromServerAfterBeingStored} = useStoreUserKeysInDatabase({ encryptedPrivateKey, publicKeyJWK, loggedInUserId:signupData?.id});
  useStoreUserPrivateKeyInIndexedDB({privateKey: privateKeyJWK,userId: signupData?.id});
  useUpdateLoggedInUserPublicKeyInState({publicKey: publicKeyReturnedFromServerAfterBeingStored});

  const onSubmit: SubmitHandler<signupSchemaType> = async (data) => {
    try {
      setIsSubmitting(true);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { confirmPassword, ...credentials } = data;
      
      const result = await signup({
        firstName: credentials.firstName,
        lastName: credentials.lastName,
        userName: credentials.userName,
        email: credentials.email,
        password: credentials.password,
      }).unwrap();

      if (result.success && result.data.user && result.data.tokens) {
        setSignupData(result.data.user);
        toast.success("Signup successful!");
        // Wait a bit for state to be populated, then redirect
        setTimeout(() => {
          router.push("/");
          router.refresh(); // Refresh to trigger middleware
        }, 100);
      }
    } catch (error: any) {
      const errorMessage =
        error?.data?.message || error?.message || "Signup failed. Please try again.";
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="flex flex-col gap-y-6" onSubmit={handleSubmit(onSubmit)}>
      <div className="flex flex-col gap-y-4">
        <div className="flex flex-col gap-y-1">
          <input
            {...register("firstName")}
            className="p-3 rounded outline outline-1 outline-secondary-dark text-text bg-background hover:outline-primary"
            placeholder="First Name"
          />
          {errors.firstName?.message && (
            <p className="text-red-500 text-sm">{errors.firstName?.message}</p>
          )}
        </div>
        <div className="flex flex-col gap-y-1">
          <input
            {...register("lastName")}
            className="p-3 rounded outline outline-1 outline-secondary-dark text-text bg-background hover:outline-primary"
            placeholder="Last Name"
          />
          {errors.lastName?.message && (
            <p className="text-red-500 text-sm">{errors.lastName?.message}</p>
          )}
        </div>
        <div className="flex flex-col gap-y-1">
          <input
            {...register("userName")}
            className="p-3 rounded outline outline-1 outline-secondary-dark text-text bg-background hover:outline-primary"
            placeholder="Username"
          />
          {errors.userName?.message && (
            <p className="text-red-500 text-sm">{errors.userName?.message}</p>
          )}
        </div>
        <div className="flex flex-col gap-y-1">
          <input
            {...register("email")}
            className="p-3 rounded outline outline-1 outline-secondary-dark text-text bg-background hover:outline-primary"
            placeholder="Email"
          />
          {errors.email?.message && (
            <p className="text-red-500 text-sm">{errors.email?.message}</p>
          )}
        </div>
        <div className="flex flex-col gap-y-1">
          <input
            type="password"
            {...register("password")}
            className="p-3 rounded outline outline-1 outline-secondary-dark text-text bg-background hover:outline-primary"
            placeholder="Password"
          />
          {errors.password?.message && (
            <p className="text-red-500 text-sm">{errors.password?.message}</p>
          )}
        </div>
        <div className="flex flex-col gap-y-1">
          <input
            type="password"
            {...register("confirmPassword")}
            className="p-3 rounded outline outline-1 outline-secondary-dark text-text bg-background hover:outline-primary"
            placeholder="Confirm Password"
          />
          {errors.confirmPassword?.message && (
            <p className="text-red-500 text-sm">
              {errors.confirmPassword?.message}
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-y-6">
        <div className="flex flex-col gap-y-2">
          <SubmitButton isLoading={isSubmitting || isLoading} />
        </div>
        <AuthRedirectLink
          pageName="Login"
          text="Already a member?"
          to="auth/login"
        />
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
      {isLoading ? <CircleLoading size="6" /> : "Signup"}
    </button>
  );
}
