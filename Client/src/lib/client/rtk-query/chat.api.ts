import { fetchUserChatsResponse } from "@/interfaces/server.types";
import { createApi } from "@reduxjs/toolkit/query/react";
import { RootState } from "../store/store";
import { createBaseQueryWithLogging } from "./baseQueryWithLogging";

export const chatApi = createApi({
    reducerPath:"chatApi",
    baseQuery: createBaseQueryWithLogging(
        process.env.NEXT_PUBLIC_BASE_URL || "",
        (state) => state.authSlice.authToken,
        (state) => state.authSlice.refreshToken
    ),
    tagTypes: ["Chat"],
    endpoints:(builder)=>({
        getChats: builder.query<fetchUserChatsResponse[], void>({
            query: () => ({
                url: "/chat",
                method: "GET",
            }),
            providesTags: ["Chat"],
        }),
        createChat:builder.mutation<void,Required<Pick<fetchUserChatsResponse,'name'> & {members:string[],isGroupChat:string}> & {avatar?:Blob}>({
            query:({name,members,isGroupChat,avatar})=>{
                const formData = new FormData()
                formData.append("name", name || 'default_name');
                for (const member of members) formData.append("members[]", member);
                formData.append("isGroupChat", isGroupChat); 
                if(avatar) formData.append("avatar",avatar)
                return {
                    url: "/chat",
                    method: "POST",
                    body: formData,
                  };
            },
            invalidatesTags: ["Chat"],
        }),
        updateChat:builder.mutation<void,{chatId:string,avatar?:Blob,name?:string}>({
            query:({avatar,name,chatId})=>{
                const formData = new FormData()
                if(avatar) formData.append('avatar',avatar)
                if(name) formData.append("name",name)
                return {
                    url: `/chat/${chatId}`,
                    method: "PATCH",
                    body: formData,
                };
            },
            invalidatesTags: ["Chat"],
        }),
        addMember:builder.mutation<void,{members:string[],chatId:string}>({
            query:({chatId,members})=>({
                url:`/chat/${chatId}/members`,
                method:"PATCH",
                body:{members}
            }),
            invalidatesTags: ["Chat"],
        }),
        removeMember:builder.mutation<void,{chatId:string,members:string[]}>({
            query:({chatId,members})=>({
                url:`/chat/${chatId}/members`,
                method:"DELETE",
                body:{members}
            }),
            invalidatesTags: ["Chat"],
        })
    })
})

export const {
    useGetChatsQuery,
    useCreateChatMutation,
    useAddMemberMutation,
    useRemoveMemberMutation,
    useUpdateChatMutation,
} = chatApi