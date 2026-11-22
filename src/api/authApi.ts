import { UserInfoAdminDto, UserAdminDto, EmailLoginAdminInput } from '../backend-admin-sdk'
import { Tags } from '@/api/utils/tags'
import { api as baseApi, prepareAdminSdk } from '.'
import { AppState } from '@/redux/store'
import { handleBackendError } from './utils/api'

export const authApi = baseApi.injectEndpoints({
  overrideExisting: true,
  endpoints: (build) => ({
    login: build.mutation<UserInfoAdminDto, EmailLoginAdminInput>({
      queryFn: async (emailLoginAdminInput, api) => {
        try {
          const sdk = prepareAdminSdk('')
          const data = await sdk.auth().login({ emailLoginAdminInput })
          return { data }
        } catch (error) {
          return {
            error: handleBackendError(error, api),
          }
        }
      },
    }),
    getMe: build.query<UserAdminDto, void>({
      queryFn: async (_, api) => {
        try {
          const { accessToken } = (api.getState() as AppState).auth
          const sdk = prepareAdminSdk(accessToken || '')
          const data = await sdk.auth().getMe()
          return { data }
        } catch (error) {
          return {
            error: handleBackendError(error, api),
          }
        }
      },
      providesTags: [Tags.me],
    }),
    // Saves the language chosen in the switch on the admin's own account (spec 0054, AC-2), so the next
    // sign in, on any computer, starts in it. The cookie keeps it for this browser before sign in.
    setLanguage: build.mutation<{ language: string }, 'el' | 'en'>({
      queryFn: async (language, api) => {
        try {
          const { accessToken } = (api.getState() as AppState).auth
          const sdk = prepareAdminSdk(accessToken || '')
          const data = await sdk.auth().setLanguage(language)
          return { data }
        } catch (error) {
          return {
            error: handleBackendError(error, api),
          }
        }
      },
    }),
  }),
})

export const { useLoginMutation, useGetMeQuery, useSetLanguageMutation } = authApi
