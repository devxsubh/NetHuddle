import { RoomList } from "@/components/rooms/RoomList";
import { cookies } from "next/headers";
import { fetchUserInfo } from "@/interfaces/server.types";
import { PageWrapper } from "@/components/shared/PageWrapper";

export default async function RoomsPage() {
  const cookiesStore = await cookies();
  const loggedInUserId = cookiesStore.get("loggedInUserId")?.value as string || '';
  const token = cookiesStore.get("token")?.value || '';

  const user = await fetchUserInfo({ loggedInUserId, token });

  return (
    <PageWrapper
      title="Rooms"
      description="Join or create chat rooms to connect with multiple users"
      maxWidth="4xl"
    >
      <div className="bg-secondary-dark rounded-lg p-6 border border-border">
        <RoomList />
      </div>
    </PageWrapper>
  );
}

