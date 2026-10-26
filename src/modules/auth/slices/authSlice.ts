import { PayloadAction, createSlice } from '@reduxjs/toolkit'
import { HYDRATE } from 'next-redux-wrapper'
import { AppState } from '@/redux/store'

interface UserInfo {
  id: string
  email: string
}

export interface AuthState {
  accessToken?: string | null
  user?: UserInfo
}

const initialState: AuthState = {
  accessToken: null,
  user: undefined,
}

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setAccessToken(state, action: { payload: AuthState['accessToken']; type: string }) {
      state.accessToken = action.payload
    },
    setUser: (state, action: PayloadAction<UserInfo>) => {
      state.user = action.payload
    },
  },

  // Special reducer for hydrating the state. Special case for next-redux-wrapper
  extraReducers: (builder) => {
    builder.addCase<string, { type: string; payload: { auth: AuthState } }>(HYDRATE, (state, action) => {
      state.accessToken = action.payload.auth.accessToken
    })
  },
})

export const { setAccessToken } = authSlice.actions
export const selectAccessToken = (state: AppState) => state.auth.accessToken
export default authSlice.reducer
