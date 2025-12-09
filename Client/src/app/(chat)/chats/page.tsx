import { ChatAreaWrapper } from "@/components/chat/ChatAreaWrapper";
import { ChatDetailsSkeletonWrapper } from "@/components/chat/ChatDetailsSkeletonWrapper";
import { ChatDetailsWrapper } from "@/components/chat/ChatDetailsWrapper";
import { ChatHeaderWrapper } from "@/components/chat/ChatHeaderWrapper";
import { ChatListClientWrapper } from "@/components/chat/ChatListClientWrapper";
import { ChatListSkeletonWrapper } from "@/components/chat/ChatListSkeletonWrapper";
import { ChatWrapper } from "@/components/chat/ChatWrapper";
import { MessageInputAreaWrapper } from "@/components/messages/MessageInputAreaWrapper";
import { MessageListSkeletonWrapper } from "@/components/messages/MessageListSkeletonWrapper";
import { ServerDownMessage } from "@/components/ui/ServerDownMessage";
import { fetchUserCallHistory } from "@/interfaces/server.types";
import { fetchUserChats, fetchUserFriendRequest, fetchUserFriends, fetchUserInfo } from "@/interfaces/server.types";
import { cookies } from "next/headers";

export default async function ChatsPage() {
  const cookiesStore = await cookies();
  const loggedInUserId = cookiesStore.get("loggedInUserId")?.value as string || '';
  const token = cookiesStore.get("token")?.value || '';

  const [user, friends, friendRequest, chats, callHistory] = await Promise.all([
    fetchUserInfo({ loggedInUserId, token }),
    fetchUserFriends({ loggedInUserId, token }),
    fetchUserFriendRequest({ loggedInUserId, token }),
    fetchUserChats({ loggedInUserId, token }),
    fetchUserCallHistory({ loggedInUserId, token })
  ]);

  return (
    (friends && chats && friendRequest && user && callHistory) ? (
      <ChatWrapper 
        chats={chats}
        friendRequest={friendRequest}
        friends={friends}
        user={user}
        callHistory={callHistory}
      >
        <div className="h-full w-full flex p-4 max-md:p-2 gap-x-6 bg-background select-none">
          <ChatListClientWrapper>
            <ChatListSkeletonWrapper/>
          </ChatListClientWrapper>

          <ChatAreaWrapper>
            <div className="flex flex-col gap-y-3 h-full justify-between relative">
              <ChatHeaderWrapper />
              <MessageListSkeletonWrapper loggedInUserId={user.id}/>
              <MessageInputAreaWrapper/>
            </div>
          </ChatAreaWrapper>

          <ChatDetailsWrapper>
            <ChatDetailsSkeletonWrapper loggedInUser={user} />
          </ChatDetailsWrapper>
        </div>
      </ChatWrapper>
    ) : (
      <ServerDownMessage/>
    )
  );
}

