// TODO: Replace with API call to backend
// import { verifyPrivateKeyRecoveryToken } from "@/actions/auth.actions";
import { storeUserPrivateKeyInIndexedDB } from "@/lib/client/indexedDB";
import { FetchUserInfoResponse } from "@/interfaces/server.types";
import { useRouter } from "next/navigation";
import { startTransition, useActionState, useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { decryptPrivateKey } from "../../lib/client/encryption";

type PropTypes = {
  recoveryToken: string | null;
};

export const useVerifyPrivateKeyRecoveryToken = ({recoveryToken}: PropTypes) => {

  const [isPrivateKeyRestoredInIndexedDB, setIsPrivateKeyRestoredInIndexedDB] = useState(false);
  const [loggedInUser, setLoggedInUser] = useState<FetchUserInfoResponse>();
  const [isSuccess,setIsSuccess] = useState<boolean>(false);
  const [state,verifyPrivateKeyRecoveryTokenAction] = useActionState(verifyPrivateKeyRecoveryToken,undefined);


  const router = useRouter();

  useEffect(() => {
    try {
      const userData = localStorage.getItem("loggedInUser");
      if (userData) {
        const loggedInUser = JSON.parse(userData) as FetchUserInfoResponse;
        if (loggedInUser) setLoggedInUser(loggedInUser);
        else{
          toast.error("Some error occured");
          router.push("/auth/login");
        }
      }
      else{
        toast.error("Some error occured");
        router.push("/auth/login");
      }
    }
    catch (error) {
      console.log('error getting loggedInUser from localStorage', error);
      toast.error("Some error occured");
      router.push("/auth/login");
    }
  }, []);
  
  useEffect(() => {
    if (loggedInUser && recoveryToken){
      startTransition(()=>{
        verifyPrivateKeyRecoveryTokenAction({recoveryToken,userId:loggedInUser.id});
      })
    }
  }, [loggedInUser]);

  useEffect(()=>{
    if(state?.data?.privateKey){
      setIsSuccess(true);
    }
    else if(state?.errors.message?.length){
      toast.error(state?.errors.message);
      router.push("/auth/login");
    }
  },[state])

  useEffect(() => {
    if (isSuccess && loggedInUser && state?.data?.privateKey) {
      handleDecryptPrivateKey({privateKey:state?.data?.privateKey});
    }
  }, [isSuccess, loggedInUser, state?.data?.privateKey]);



  const handleDecryptPrivateKey = useCallback(async ({privateKey}:{privateKey:string}) => {

    if (privateKey && loggedInUser) {
      // Get password from localStorage (stored during password verification)
      const passInLocalStorage = localStorage.getItem("tempPassword");

      if (!passInLocalStorage) {
        toast.error("Password not found. Please try the recovery process again.");
        router.push("/auth/login");
        return;
      }

      const password = passInLocalStorage;

      // Decrypt the privateKey using the password (as the privateKey was encrypted using this password)
      const privateKeyInJwk = await decryptPrivateKey(
        password,
        privateKey
      );
      
      // Store the decrypted privateKey in indexedDB
      await storeUserPrivateKeyInIndexedDB({
        privateKey: privateKeyInJwk,
        userId: loggedInUser.id,
      });

      // Remove the tempPassword and loggedInUser from localStorage
      localStorage.removeItem("tempPassword");
      localStorage.removeItem("loggedInUser");
      setIsPrivateKeyRestoredInIndexedDB(true);
    } else {
      toast.error("Some error occurred while recovering");
      router.push("/auth/login");
    }
  },[loggedInUser, router]);

  return {
    isPrivateKeyRestoredInIndexedDB: isPrivateKeyRestoredInIndexedDB && isSuccess,
  };
};
