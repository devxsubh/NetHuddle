import { cookies } from "next/headers";
import { fetchUserFriends, fetchUserFriendRequest, fetchUserInfo } from "@/interfaces/server.types";
import { FriendsPageClient } from "./FriendsPageClient";
import { PageWrapper } from "@/components/shared/PageWrapper";

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
    <PageWrapper
      title="Friends"
      description="Manage your friends and friend requests"
      maxWidth="4xl"
    >
      <div className="bg-secondary-dark rounded-lg p-6 border border-border">
        <FriendsPageClient 
          friends={friends || []} 
          friendRequests={friendRequests || []}
          loggedInUserId={loggedInUserId}
        />
      </div>
    </PageWrapper>
  );
}

