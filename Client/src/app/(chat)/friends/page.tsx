import { cookies } from "next/headers";
import { fetchUserFriends, fetchUserFriendRequest, fetchUserInfo } from "@/interfaces/server.types";
import { FriendsPageClient } from "./FriendsPageClient";

export default async function FriendsPage() {
  const cookiesStore = await cookies();
  const loggedInUserId = cookiesStore.get("loggedInUserId")?.value as string || '';
  const token = cookiesStore.get("token")?.value || '';

  const [user, friends, friendRequests] = await Promise.all([
    fetchUserInfo({ loggedInUserId, token }),
    fetchUserFriends({ loggedInUserId, token }),
    fetchUserFriendRequest({ loggedInUserId, token })
  ]);

  return (
    <div className="h-full w-full p-4 max-md:p-2 bg-background">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-text mb-6">Friends</h1>
        <FriendsPageClient 
          friends={friends || []} 
          friendRequests={friendRequests || []}
          loggedInUserId={loggedInUserId}
        />
      </div>
    </div>
  );
}

