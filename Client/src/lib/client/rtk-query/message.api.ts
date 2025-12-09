import { Message } from "@/interfaces/message.interface";
import { createApi } from "@reduxjs/toolkit/query/react";
import { RootState } from "../store/store";
import { createBaseQueryWithLogging } from "./baseQueryWithLogging";


type fetchMessagesResponse = {
    messages:Message[],
    totalPages:number
}

export const messageApi = createApi({

    reducerPath:'messageApi',

    baseQuery: createBaseQueryWithLogging(
        `${process.env.NEXT_PUBLIC_BASE_URL}/message`,
        (state) => state.authSlice.authToken,
        (state) => state.authSlice.refreshToken
    ),

    endpoints:(builder)=>({

        getMessagesByChatId:builder.query<fetchMessagesResponse,{chatId:string,page:number}>({
            query:({chatId,page})=>`/${chatId}?page=${page}`,
            serializeQueryArgs: ({ endpointName ,queryArgs:{chatId}}) => {
              return  `${endpointName}_${chatId}`
            },
            merge: (currentCache, newItems) => {
                currentCache.messages.unshift(...newItems.messages)
            },
        })

    })
})

export const {
    useLazyGetMessagesByChatIdQuery,
    useGetMessagesByChatIdQuery
} = messageApi