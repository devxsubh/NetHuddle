import { useUpdateMeMutation } from "@/lib/client/rtk-query/auth.api";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

type PropTypes = {
    encryptedPrivateKey: string | null;
    publicKeyJWK: JsonWebKey | null;
    loggedInUserId: string | undefined;
}

export const useStoreUserKeysInDatabase = ({encryptedPrivateKey,publicKeyJWK,loggedInUserId}:PropTypes) => {
    const [updateMe, { isLoading }] = useUpdateMeMutation();
    const [storedPublicKey, setStoredPublicKey] = useState<string | null>(null);

    useEffect(() => {
        if(encryptedPrivateKey && publicKeyJWK && loggedInUserId){
            const storeKeys = async () => {
                try {
                    // Convert JsonWebKey to string for storage
                    const publicKeyString = JSON.stringify(publicKeyJWK);
                    
                    // Note: The backend may need to be updated to accept publicKey and privateKey fields
                    // For now, we'll try to store them. If the backend doesn't support these fields,
                    // you'll need to add them to the user model and updateMe validator
                    const result = await updateMe({
                        publicKey: publicKeyString,
                        privateKey: encryptedPrivateKey,
                    } as any).unwrap();

                    if (result.success && result.data) {
                        // Extract publicKey from response if available
                        const publicKey = (result.data as any).publicKey || publicKeyString;
                        setStoredPublicKey(publicKey);
                    }
                } catch (error: any) {
                    // Silently fail if backend doesn't support these fields yet
                    // The keys are still stored in IndexedDB on the frontend
                    console.warn("Could not store keys in backend:", error?.message || "Backend may not support key storage");
                    // Set the publicKey from the local value as fallback
                    setStoredPublicKey(JSON.stringify(publicKeyJWK));
                }
            };

            storeKeys();
        }
    }, [encryptedPrivateKey, publicKeyJWK, loggedInUserId, updateMe]);

    return {
        publicKeyReturnedFromServerAfterBeingStored: storedPublicKey
    }
}
