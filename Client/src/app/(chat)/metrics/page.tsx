import { MetricsPageClient } from "./MetricsPageClient";
import { cookies } from "next/headers";
import { fetchUserInfo } from "@/interfaces/server.types";

export default async function MetricsPage() {
  const cookiesStore = await cookies();
  const loggedInUserId = cookiesStore.get("loggedInUserId")?.value as string || '';
  const token = cookiesStore.get("token")?.value || '';

  const user = await fetchUserInfo({ loggedInUserId, token });

  return <MetricsPageClient />;
}

