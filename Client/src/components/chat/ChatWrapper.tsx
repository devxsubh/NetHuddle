"use client";

import { useFetchAuthToken } from "@/hooks/useAuth/useFetchAuthToken";
import { useUpdateUnreadMessagesAsSeenOnChatSelect } from "@/hooks/useChat/useUpdateUnreadChatAsSeen";
import { useClearExtraPreviousMessagesOnChatChange } from "@/hooks/useMessages/useClearExtraPreviousMessagesOnChatChange";
import { useAttachEventListeners } from "@/hooks/useUtils/useAttachEventListeners";
import { usePopulateStateWithServerSideFetchedData } from "@/hooks/useUtils/usePopulateStateWithServerSideFetchedData";
import { fetchUserCallHistoryResponse } from "@/interfaces/server.types";
import { fetchUserChatsResponse, fetchUserFriendRequestResponse, fetchUserFriendsResponse, FetchUserInfoResponse } from "@/interfaces/server.types";


type PropTypes = {
  children: React.ReactNode;
  user: FetchUserInfoResponse;
  friends: fetchUserFriendsResponse[];
  chats: fetchUserChatsResponse[];
  friendRequest: fetchUserFriendRequestResponse[];
  callHistory:fetchUserCallHistoryResponse[];
};

export const ChatWrapper = ({children,chats,friendRequest,friends,user,callHistory}: PropTypes) => {

  // client side state hydration
  usePopulateStateWithServerSideFetchedData({chats,friendRequest,friends,user,callHistory});

  // chats
  useUpdateUnreadMessagesAsSeenOnChatSelect();

  // all socket event listners
  useAttachEventListeners();

  // messages
  useClearExtraPreviousMessagesOnChatChange();

  // fetch the auth token and set in state
  // so that rtk query can this token to make requests to backend
  useFetchAuthToken();

  return children;
};
