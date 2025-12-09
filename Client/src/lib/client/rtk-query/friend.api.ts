import { fetchUserFriendsResponse } from "@/interfaces/server.types";
import { createApi } from "@reduxjs/toolkit/query/react";
import { RootState } from "../store/store";
import { createBaseQueryWithLogging } from "./baseQueryWithLogging";

export const friendApi = createApi({
    reducerPath:"friendApi",
    baseQuery: createBaseQueryWithLogging(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/v1/friend`,
        (state) => state.authSlice.authToken,
        (state) => state.authSlice.refreshToken
    ),
    tagTypes: ["Friend"],
    endpoints:(builder)=>({
        getFriends:builder.query<fetchUserFriendsResponse[],void>({
            query:()=>"/",
            providesTags: ["Friend"],
            transformResponse: (response: { success: boolean; data: fetchUserFriendsResponse[] }) => {
                return response?.data || [];
            },
        })
    })
})

export const {
    useGetFriendsQuery
} = friendApi