import type {
  ComplaintAdminDto,
  ComplaintAdminPageDto,
  ComplaintCreateAdminInput,
  ComplaintDeliveryRiderDto,
  ComplaintListAdminArgs,
} from '../backend-admin-sdk'
import { Tags } from '@/api/utils/tags'
import { api as baseApi, prepareAdminSdk } from '.'
import { AppState } from '@/redux/store'
import { handleBackendError } from './utils/api'

// Spec 0052 (row 83): complaints, handled one by one by a person. Every read provides the complaints
// tag and every write invalidates it, so the list and the page read again after a decision.
export const complaintApi = baseApi.injectEndpoints({
  overrideExisting: true,
  endpoints: (build) => ({
    // AC-6: newest first, filtered by status and about only. No rider filter exists (cross check 13).
    getComplaints: build.query<ComplaintAdminPageDto, ComplaintListAdminArgs>({
      queryFn: async (args, api) => {
        try {
          const { accessToken } = (api.getState() as AppState).auth
          const data = await prepareAdminSdk(accessToken || '').complaints().list(args)
          return { data }
        } catch (error) {
          return { error: handleBackendError(error, api) }
        }
      },
      providesTags: [Tags.complaints],
    }),
    getComplaint: build.query<ComplaintAdminDto, { id: string }>({
      queryFn: async ({ id }, api) => {
        try {
          const { accessToken } = (api.getState() as AppState).auth
          const data = await prepareAdminSdk(accessToken || '').complaints().get(id)
          return { data }
        } catch (error) {
          return { error: handleBackendError(error, api) }
        }
      },
      providesTags: [Tags.complaints],
    }),
    // The riders who accepted a delivery, for the filing form on a reassigned job (cross check 3).
    getComplaintDeliveryRiders: build.query<ComplaintDeliveryRiderDto[], { deliveryId: string }>({
      queryFn: async ({ deliveryId }, api) => {
        try {
          const { accessToken } = (api.getState() as AppState).auth
          const data = await prepareAdminSdk(accessToken || '').complaints().deliveryRiders(deliveryId)
          return { data }
        } catch (error) {
          return { error: handleBackendError(error, api) }
        }
      },
    }),
    fileComplaint: build.mutation<ComplaintAdminDto, ComplaintCreateAdminInput>({
      queryFn: async (input, api) => {
        try {
          const { accessToken } = (api.getState() as AppState).auth
          const data = await prepareAdminSdk(accessToken || '').complaints().file(input)
          return { data }
        } catch (error) {
          return { error: handleBackendError(error, api) }
        }
      },
      invalidatesTags: [Tags.complaints],
    }),
    decideComplaint: build.mutation<ComplaintAdminDto, { id: string; outcome: string }>({
      queryFn: async ({ id, outcome }, api) => {
        try {
          const { accessToken } = (api.getState() as AppState).auth
          const data = await prepareAdminSdk(accessToken || '').complaints().decide(id, outcome)
          return { data }
        } catch (error) {
          return { error: handleBackendError(error, api) }
        }
      },
      invalidatesTags: [Tags.complaints],
    }),
    withdrawComplaint: build.mutation<ComplaintAdminDto, { id: string; reason: string }>({
      queryFn: async ({ id, reason }, api) => {
        try {
          const { accessToken } = (api.getState() as AppState).auth
          const data = await prepareAdminSdk(accessToken || '').complaints().withdraw(id, reason)
          return { data }
        } catch (error) {
          return { error: handleBackendError(error, api) }
        }
      },
      invalidatesTags: [Tags.complaints],
    }),
    // Cross check 2: only for a deactivated rider, who cannot log in to reply.
    replyForRider: build.mutation<ComplaintAdminDto, { id: string; text: string }>({
      queryFn: async ({ id, text }, api) => {
        try {
          const { accessToken } = (api.getState() as AppState).auth
          const data = await prepareAdminSdk(accessToken || '').complaints().replyForRider(id, text)
          return { data }
        } catch (error) {
          return { error: handleBackendError(error, api) }
        }
      },
      invalidatesTags: [Tags.complaints],
    }),
  }),
})

export const {
  useGetComplaintsQuery,
  useGetComplaintQuery,
  useGetComplaintDeliveryRidersQuery,
  useFileComplaintMutation,
  useDecideComplaintMutation,
  useWithdrawComplaintMutation,
  useReplyForRiderMutation,
} = complaintApi

// Slice 2: a complaint's photo as bytes, outside RTK Query (a Blob is not something to keep in the Redux
// store). Fetched with the bearer through the admin route; never a storage URL (cross check 8).
export async function fetchComplaintPhoto(accessToken: string, id: string): Promise<Blob> {
  return prepareAdminSdk(accessToken).complaints().photo(id)
}
