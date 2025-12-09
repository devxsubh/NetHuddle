import { RoomList } from "@/components/rooms/RoomList";
import { cookies } from "next/headers";
import { fetchUserInfo } from "@/interfaces/server.types";

export default async function RoomsPage() {
  const cookiesStore = await cookies();
  const loggedInUserId = cookiesStore.get("loggedInUserId")?.value as string || '';
  const token = cookiesStore.get("token")?.value || '';

  const user = await fetchUserInfo({ loggedInUserId, token });

  return (
    <div className="h-full w-full p-4 max-md:p-2 bg-background">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-text mb-6">Rooms</h1>
        <RoomList />
      </div>
    </div>
  );
}

