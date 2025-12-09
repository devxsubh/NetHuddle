"use client";
import { useRouter } from "next/navigation";
import { selectLoggedInUser } from "../../lib/client/slices/authSlice";
import { useAppSelector } from "../../lib/client/store/hooks";
import { useSignoutMutation } from "@/lib/client/rtk-query/auth.api";
import { LogoutIcon } from "../ui/icons/LogoutIcon";
import { RecoveryOptionsForManualSignedUpUser } from "./RecoveryOptionsForManualSignedUpUser";

const RecoverPrivateKeyForm = () => {
  const loggedInUser = useAppSelector(selectLoggedInUser);
  const [signout] = useSignoutMutation();
  const router = useRouter();

  const handleLogoutClick = async () => {
    try {
      await signout().unwrap();
      router.push("/auth/login");
    } catch (error) {
      console.error("Logout error:", error);
      router.push("/auth/login");
    }
  };

  return (
    <div className="flex flex-col gap-y-6">
      <div className="flex flex-col gap-y-4">
        <div className="flex items-center justify-between flex-wrap gap-y-2">
          <h2 className="text-xl font-bold mr-5">Recover Your Private Key</h2>
          <button
            type="button"
            onClick={handleLogoutClick}
            className="flex items-center gap-x-1"
          >
            <span>Logout instead</span>
            <LogoutIcon />
          </button>
        </div>
        <p>
          It looks like we&apos;ve detected that your private key is missing.
          Don&apos;t worry, you can easily recover it by entering your account
          password. After entering your correct password, you will receive a
          verification email. Please click on the verify button in that email.
          Once verified, we will restore your private key, and you&apos;ll be
          back to normal in no time.
        </p>
      </div>
      <RecoveryOptionsForManualSignedUpUser loggedInUser={loggedInUser} />
    </div>
  );
};

export default RecoverPrivateKeyForm;
