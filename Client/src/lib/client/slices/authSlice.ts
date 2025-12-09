import { FetchUserInfoResponse } from "@/interfaces/server.types";
import { PayloadAction, createSlice } from "@reduxjs/toolkit";
import { RootState } from "../store/store";

type InitialState = {
  loggedInUser: FetchUserInfoResponse | null;
  authToken: string | null;
  refreshToken: string | null;
};

const initialState: InitialState = {
  loggedInUser: null,
  authToken: null,
  refreshToken: null,
};

const authSlice = createSlice({
  name: "authSlice",
  initialState,
  reducers: {
    updateLoggedInUser: (
      state,
      action: PayloadAction<FetchUserInfoResponse | null>
    ) => {
      state.loggedInUser = action.payload;
    },
    updateLoggedInUserPublicKey: (
      state,
      action: PayloadAction<Required<Pick<FetchUserInfoResponse, "publicKey">>>
    ) => {
      if (state.loggedInUser)
        state.loggedInUser.publicKey = action.payload.publicKey;
    },
    updateLoggedInUserNotificationStatus: (
      state,
      action: PayloadAction<boolean>
    ) => {
      if (state.loggedInUser)
        state.loggedInUser.notificationsEnabled = action.payload;
    },
    setAuthToken:(state,action:PayloadAction<string | null>)=>{
      state.authToken = action.payload
    },
    setRefreshToken:(state,action:PayloadAction<string | null>)=>{
      state.refreshToken = action.payload
    },
    clearAuthTokens:(state)=>{
      state.authToken = null;
      state.refreshToken = null;
    }
  },
});

export const selectLoggedInUser = (state: RootState) =>
  state.authSlice.loggedInUser;
export const selectAuthToken = (state: RootState) =>
  state.authSlice.authToken;
export const selectRefreshToken = (state: RootState) =>
  state.authSlice.refreshToken;

export const {
  updateLoggedInUser,
  updateLoggedInUserPublicKey,
  updateLoggedInUserNotificationStatus,
  setAuthToken,
  setRefreshToken,
  clearAuthTokens,
} = authSlice.actions;

export default authSlice;
