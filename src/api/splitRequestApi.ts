import type { SplitLegAdmin, SplitRequestAdminDto } from '../backend-admin-sdk'
import { Tags } from '@/api/utils/tags'
import { api as baseApi, prepareAdminSdk } from '.'
import { AppState } from '@/redux/store'
import { handleBackendError } from './utils/api'

// Spec 0047 (AC-4): the Split requests queue and its count. An answer changes the deliveries too (a confirm
// creates legs), so it invalidates them as well as the queue.
export const splitRequestApi = baseApi.injectEndpoints({
  overrideExisting: true,
  endpoints: (build) => ({
    getSplitRequests: build.query<SplitRequestAdminDto[], void>({
      queryFn: async (_arg, api) => {
        try {
          const { accessToken } = (api.getState() as AppState).auth
          const data = await prepareAdminSdk(accessToken || '').splitRequests().list()
          return { data }
        } catch (error) {
          return { error: handleBackendError(error, api) }
        }
      },
      providesTags: [Tags.splitRequests],
    }),
    getSplitRequestCount: build.query<{ open: number }, void>({
      queryFn: async (_arg, api) => {
        try {
          const { accessToken } = (api.getState() as AppState).auth
          const data = await prepareAdminSdk(accessToken || '').splitRequests().count()
          return { data }
        } catch (error) {
          return { error: handleBackendError(error, api) }
        }
      },
      providesTags: [Tags.splitRequests],
    }),
    confirmSplitRequest: build.mutation<{ status: string }, { id: string; legs?: SplitLegAdmin[] }>({
      queryFn: async ({ id, legs }, api) => {
        try {
          const { accessToken } = (api.getState() as AppState).auth
          const data = await prepareAdminSdk(accessToken || '').splitRequests().confirm(id, legs)
          return { data }
        } catch (error) {
          return { error: handleBackendError(error, api) }
        }
      },
      invalidatesTags: [Tags.splitRequests, Tags.deliveries, Tags.deliveryEvents],
    }),
    refuseSplitRequest: build.mutation<{ status: string }, { id: string; note?: string }>({
      queryFn: async ({ id, note }, api) => {
        try {
          const { accessToken } = (api.getState() as AppState).auth
          const data = await prepareAdminSdk(accessToken || '').splitRequests().refuse(id, note)
          return { data }
        } catch (error) {
          return { error: handleBackendError(error, api) }
        }
      },
      invalidatesTags: [Tags.splitRequests, Tags.deliveryEvents],
    }),
  }),
})

export const {
  useGetSplitRequestsQuery,
  useGetSplitRequestCountQuery,
  useConfirmSplitRequestMutation,
  useRefuseSplitRequestMutation,
} = splitRequestApi
