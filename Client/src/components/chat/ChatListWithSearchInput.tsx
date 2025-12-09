"use client";
import { useChatListSearch } from "@/hooks/useChat/useChatListSearch";
import { useFilteredChatsVisibility } from "@/hooks/useChat/useFilteredChatsVisibility";
import { selectLoggedInUser } from "@/lib/client/slices/authSlice";
import { useAppSelector } from "@/lib/client/store/hooks";
import { fetchUserChatsResponse } from "@/interfaces/server.types";
import { SearchInputForChatList } from "../ui/SearchInput";
import { ChatList } from "./ChatList";

type PropTypes = {
  chats: fetchUserChatsResponse[];
};

export const ChatListWithSearchInput = ({ chats }: PropTypes) => {
  const loggedInUserId = useAppSelector(selectLoggedInUser)?.id as string;

  const { filteredChats, searchVal, setSearchVal } = useChatListSearch({ chats, loggedInUserId });
  const { showFilteredChats } = useFilteredChatsVisibility({ filteredChats, searchVal });

  return (
    <div className="flex flex-col gap-y-5 relative min-h-full">
      <SearchInputForChatList
        searchVal={searchVal}
        setSearchVal={setSearchVal}
      />
      {chats.length === 0 ? (
        <span className="text-text self-center text-center px-2 mt-4 mb-4">
          Click on your profile, make friends by sending a friend request<br /> and start chatting
        </span>
      ) : (
        <ChatList
          chats={showFilteredChats ? filteredChats : chats}
          isFiltered={showFilteredChats}
        />
      )}
    </div>
  );
};
