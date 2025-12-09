import { attachmentApi } from "@/lib/client/rtk-query/attachment.api";
import { authApi } from "@/lib/client/rtk-query/auth.api";
import { chatApi } from "@/lib/client/rtk-query/chat.api";
import { messageApi } from "@/lib/client/rtk-query/message.api";
import { requestApi } from "@/lib/client/rtk-query/request.api";
import { userApi } from "@/lib/client/rtk-query/user.api";
import { networkApi } from "@/lib/client/rtk-query/network.api";
import { roomApi } from "@/lib/client/rtk-query/room.api";
import { fileTransferApi } from "@/lib/client/rtk-query/fileTransfer.api";
import { quicApi } from "@/lib/client/rtk-query/quic.api";
import { configureStore } from "@reduxjs/toolkit";
import { friendApi } from "../rtk-query/friend.api";
import authSlice from "../slices/authSlice";
import chatSlice from "../slices/chatSlice";
import uiSlice from "../slices/uiSlice";
import callSlice from "../slices/callSlice";


export const makeStore = () => {
  return configureStore({
    reducer: {
      [authSlice.name]: authSlice.reducer,
      [chatSlice.name]: chatSlice.reducer,
      [uiSlice.name]: uiSlice.reducer,
      [callSlice.name]: callSlice.reducer,

      [authApi.reducerPath]: authApi.reducer,
      [chatApi.reducerPath]: chatApi.reducer,
      [messageApi.reducerPath]: messageApi.reducer,
      [userApi.reducerPath]: userApi.reducer,
      [requestApi.reducerPath]: requestApi.reducer,
      [attachmentApi.reducerPath]: attachmentApi.reducer,
      [friendApi.reducerPath]: friendApi.reducer,
      [networkApi.reducerPath]: networkApi.reducer,
      [roomApi.reducerPath]: roomApi.reducer,
      [fileTransferApi.reducerPath]: fileTransferApi.reducer,
      [quicApi.reducerPath]: quicApi.reducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({ serializableCheck: false })
        .concat(authApi.middleware)
        .concat(chatApi.middleware)
        .concat(messageApi.middleware)
        .concat(userApi.middleware)
        .concat(requestApi.middleware)
        .concat(attachmentApi.middleware)
        .concat(friendApi.middleware)
        .concat(networkApi.middleware)
        .concat(roomApi.middleware)
        .concat(fileTransferApi.middleware)
        .concat(quicApi.middleware),
  });
};

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];
