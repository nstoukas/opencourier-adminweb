import { BaseQueryApi } from '@reduxjs/toolkit/query'
import { authApi } from '../authApi'
import { setAccessToken } from '@/modules/auth/slices/authSlice'
import { disconnectChatLive } from '@/modules/chat/chatLive'

export const handleBackendError = (error: any, api: BaseQueryApi) => {
  if (error.statusCode === 401) {
    api.dispatch(setAccessToken(null))
    api.dispatch(authApi.util.resetApiState())
    // The chat's live connection was opened with the expired token: close it (spec 0034).
    disconnectChatLive()
  }
  return error
}
