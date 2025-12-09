import { FileTransfer } from "@/components/fileTransfer/FileTransfer";
import { NetworkFiles } from "@/components/network/NetworkFiles";
import { cookies } from "next/headers";
import { fetchUserInfo } from "@/interfaces/server.types";
import { PageWrapper } from "@/components/shared/PageWrapper";

export default async function FileTransferPage() {
  const cookiesStore = await cookies();
  const loggedInUserId = cookiesStore.get("loggedInUserId")?.value as string || '';
  const token = cookiesStore.get("token")?.value || '';

  const user = await fetchUserInfo({ loggedInUserId, token });

  return (
    <PageWrapper
      title="File Transfer"
      description="Share and download files with users on your network"
      maxWidth="4xl"
    >
      {/* Network Files Section */}
      <div className="bg-secondary-dark rounded-lg p-6 border border-border">
        <NetworkFiles />
      </div>
      
      {/* File Transfer Component */}
      <div className="bg-secondary-dark rounded-lg p-6 border border-border">
        <h2 className="text-xl font-semibold text-text mb-4">Send Files</h2>
        <FileTransfer />
      </div>
    </PageWrapper>
  );
}

