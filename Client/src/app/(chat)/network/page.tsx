import { NetworkPageClient } from "./NetworkPageClient";
import { cookies } from "next/headers";
import { fetchUserInfo } from "@/interfaces/server.types";
import { PageWrapper } from "@/components/shared/PageWrapper";

export default async function NetworkPage() {
  const cookiesStore = await cookies();
  const loggedInUserId = cookiesStore.get("loggedInUserId")?.value as string || '';
  const token = cookiesStore.get("token")?.value || '';

  const user = await fetchUserInfo({ loggedInUserId, token });

  return (
    <PageWrapper
      title="Network"
      description="Discover and connect with users on your local network"
      maxWidth="6xl"
    >
      <NetworkPageClient />
    </PageWrapper>
  );
}

