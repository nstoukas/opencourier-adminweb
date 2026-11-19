import type {
  RemovalApproveAdminResponse,
  RemovalReasonAdminDto,
  RemovalReasonCreateAdminInput,
  RemovalReasonUpdateAdminInput,
  RemovalRequestAdminDto,
} from '../backend-admin-sdk'
import { Tags } from '@/api/utils/tags'
import { api as baseApi, prepareAdminSdk } from '.'
import { AppState } from '@/redux/store'
import { handleBackendError } from './utils/api'

// A rider's request to come off an order, and the co-op's list of reasons (spec 0035).
// RTK Query also refreshes these tags after a refused answer (a 409), so a stale row is read again.
export const removalRequestApi = baseApi.injectEndpoints({
  overrideExisting: true,
  endpoints: (build) => ({
    approveRemovalRequest: build.mutation<RemovalApproveAdminResponse, { id: string; pickedUp: boolean }>({
      queryFn: async ({ id, pickedUp }, api) => {
        try {
          const { accessToken } = (api.getState() as AppState).auth
          const data = await prepareAdminSdk(accessToken || '').removalRequests().approve(id, pickedUp)
          return { data }
        } catch (error) {
          return { error: handleBackendError(error, api) }
        }
      },
      // The board and the delivery page show the delivery's status, so both are read again.
      invalidatesTags: [Tags.removalRequests, Tags.deliveries, Tags.deliveryEvents],
    }),
    declineRemovalRequest: build.mutation<{ status: string }, { id: string; note: string | undefined }>({
      queryFn: async ({ id, note }, api) => {
        try {
          const { accessToken } = (api.getState() as AppState).auth
          const data = await prepareAdminSdk(accessToken || '').removalRequests().decline(id, note)
          return { data }
        } catch (error) {
          return { error: handleBackendError(error, api) }
        }
      },
      invalidatesTags: [Tags.removalRequests, Tags.deliveryEvents],
    }),
    // One delivery's requests, newest first. Per delivery only: nothing counts a rider's requests.
    getDeliveryRemovalRequests: build.query<RemovalRequestAdminDto[], { deliveryId: string }>({
      queryFn: async ({ deliveryId }, api) => {
        try {
          const { accessToken } = (api.getState() as AppState).auth
          const data = await prepareAdminSdk(accessToken || '').removalRequests().listForDelivery(deliveryId)
          return { data }
        } catch (error) {
          return { error: handleBackendError(error, api) }
        }
      },
      providesTags: [Tags.removalRequests],
    }),
    getRemovalReasons: build.query<RemovalReasonAdminDto[], void>({
      queryFn: async (_, api) => {
        try {
          const { accessToken } = (api.getState() as AppState).auth
          const data = await prepareAdminSdk(accessToken || '').removalRequests().listReasons()
          return { data }
        } catch (error) {
          return { error: handleBackendError(error, api) }
        }
      },
      providesTags: [Tags.removalReasons],
    }),
    createRemovalReason: build.mutation<RemovalReasonAdminDto, RemovalReasonCreateAdminInput>({
      queryFn: async (input, api) => {
        try {
          const { accessToken } = (api.getState() as AppState).auth
          const data = await prepareAdminSdk(accessToken || '').removalRequests().createReason(input)
          return { data }
        } catch (error) {
          return { error: handleBackendError(error, api) }
        }
      },
      invalidatesTags: [Tags.removalReasons, Tags.settingChanges],
    }),
    updateRemovalReason: build.mutation<RemovalReasonAdminDto, { id: string; input: RemovalReasonUpdateAdminInput }>({
      queryFn: async ({ id, input }, api) => {
        try {
          const { accessToken } = (api.getState() as AppState).auth
          const data = await prepareAdminSdk(accessToken || '').removalRequests().updateReason(id, input)
          return { data }
        } catch (error) {
          return { error: handleBackendError(error, api) }
        }
      },
      invalidatesTags: [Tags.removalReasons, Tags.settingChanges],
    }),
    removeRemovalReason: build.mutation<RemovalReasonAdminDto, { id: string }>({
      queryFn: async ({ id }, api) => {
        try {
          const { accessToken } = (api.getState() as AppState).auth
          const data = await prepareAdminSdk(accessToken || '').removalRequests().removeReason(id)
          return { data }
        } catch (error) {
          return { error: handleBackendError(error, api) }
        }
      },
      invalidatesTags: [Tags.removalReasons, Tags.settingChanges],
    }),
  }),
})

export const {
  useApproveRemovalRequestMutation,
  useDeclineRemovalRequestMutation,
  useGetDeliveryRemovalRequestsQuery,
  useGetRemovalReasonsQuery,
  useCreateRemovalReasonMutation,
  useUpdateRemovalReasonMutation,
  useRemoveRemovalReasonMutation,
} = removalRequestApi
