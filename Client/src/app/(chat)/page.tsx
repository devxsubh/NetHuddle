import { cookies } from "next/headers";
import { fetchUserInfo } from "@/interfaces/server.types";
import { HomePageClient } from "./HomePageClient";
import { PageWrapper } from "@/components/shared/PageWrapper";

export default async function HomePage() {
  const cookiesStore = await cookies();
  const loggedInUserId = cookiesStore.get("loggedInUserId")?.value as string || '';
  const token = cookiesStore.get("token")?.value || '';

  const user = await fetchUserInfo({ loggedInUserId, token });

  return (
    <PageWrapper
      title={`Welcome back, ${user?.firstName || user?.userName || "User"}!`}
      description="Your dashboard overview"
      maxWidth="6xl"
    >
      <HomePageClient user={user} />
    </PageWrapper>
  );
}
