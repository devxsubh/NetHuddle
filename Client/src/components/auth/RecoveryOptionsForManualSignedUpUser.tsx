// TODO: Replace with API call to backend for password verification
// Currently using signin endpoint as a workaround for password verification
import { useSigninMutation } from "@/lib/client/rtk-query/auth.api";
import { useStoreLoggedInUserInfoInLocalStorageIfCorrectPasswordIsEntered } from "@/hooks/useAuth/useStoreLoggedInUserInfoInLocalStorageIfCorrectPasswordIsEntered";
import { useStorePasswordInLocalStorageIfCorrectPasswordIsEntered } from "@/hooks/useAuth/useStorePasswordInLocalStorageIfCorrectPasswordIsEntered";
import { FetchUserInfoResponse } from "@/interfaces/server.types";
import {
  keyRecoverySchema,
  keyRecoverySchemaType,
} from "@/lib/shared/zod/schemas/auth.schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useEffect } from "react";
import { SubmitHandler, useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { CircleLoading } from "../shared/CircleLoading";

type PropTypes = {
  loggedInUser: FetchUserInfoResponse | null;
};

export const RecoveryOptionsForManualSignedUpUser = ({loggedInUser}: PropTypes) => {
  const [verifyState, setVerifyState] = useState<{ success?: { message: string }; errors?: { message: string } } | null>(null);
  const [signin, { isLoading: isVerifying }] = useSigninMutation();

  useEffect(()=>{
    if(verifyState?.errors?.message){
      toast.error(verifyState.errors.message);
    }
    else if(verifyState?.success?.message){
      toast.success(verifyState.success.message);
    }
  },[verifyState])

  const {register,handleSubmit,watch,formState: { errors },} = useForm<keyRecoverySchemaType>({resolver: zodResolver(keyRecoverySchema)});

  const onSubmit: SubmitHandler<keyRecoverySchemaType> = async ({ password }) => {
    if(!loggedInUser){
      toast.error("User not found");
      return;
    }

    try {
      // Use signin endpoint to verify password (workaround until backend has dedicated verify endpoint)
      const result = await signin({
        userName: loggedInUser.userName || loggedInUser.email || "",
        password: password,
      }).unwrap();

      if(result.success){
        setVerifyState({
          success: { message: "Password verified successfully" }
        });
      }
    } catch (error: any) {
      setVerifyState({
        errors: { 
          message: error?.data?.message || error?.message || "Incorrect password" 
        }
      });
    }
  }

  useStorePasswordInLocalStorageIfCorrectPasswordIsEntered({
    isSuccess: verifyState?.success?.message?.length ? true : false,
    passwordRef: watch("password"),
  });
  useStoreLoggedInUserInfoInLocalStorageIfCorrectPasswordIsEntered({
    isSuccess: verifyState?.success?.message?.length ? true : false,
    loggedInUser,
  });

  return verifyState?.success?.message ? (
    <h2 className="text font-bold bg-background p-4 rounded-md">
      We have sent an verification email, please check spam if not received
    </h2>
  ) : (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-y-6">
      <div className="flex flex-col gap-y-2">
        <input {...register("password")} type="password" className="p-3 rounded outline outline-1 outline-secondary-dark text-text bg-background hover:outline-primary" placeholder="Password"/>
        {errors.password?.message && <p className="text-red-500 text-sm">{errors.password?.message}</p>}
      </div>
      <SubmitButton isLoading={isVerifying} />
    </form>
  );
};

function SubmitButton({ isLoading }: { isLoading: boolean }) {
  return (
    <button
      type="submit"
      disabled={isLoading}
      className={`bg-primary px-14 py-2 self-center rounded-sm ${
        isLoading ? "bg-transparent" : ""
      }`}
    >
      {isLoading ? <CircleLoading size="6" /> : "Verify Password"}
    </button>
  );
}
