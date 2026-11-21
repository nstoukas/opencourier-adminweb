import type { ShiftOfflineEventAdminDto } from '../backend-admin-sdk'
import { Tags } from '@/api/utils/tags'
import { api as baseApi, prepareAdminSdk } from '.'
import { AppState } from '@/redux/store'
import { handleBackendError } from './utils/api'

// Spec 0049 (row 79): Offline during a booked shift, for an admin to follow up in person.
export const shiftOfflineEventApi = baseApi.injectEndpoints({
  overrideExisting: true,
  endpoints: (build) => ({
    getShiftOfflineEvents: build.query<ShiftOfflineEventAdminDto[], void>({
      queryFn: async (_arg, api) => {
        try {
          const { accessToken } = (api.getState() as AppState).auth
          const data = await prepareAdminSdk(accessToken || '').shiftOfflineEvents().list()
          return { data }
        } catch (error) {
          return { error: handleBackendError(error, api) }
        }
      },
      providesTags: [Tags.shiftOfflineEvents],
    }),
    // 204: `{ data: null }`, since RTK Query logs an error for `{ data: undefined }`.
    followUpShiftOfflineEvent: build.mutation<null, { id: string }>({
      queryFn: async ({ id }, api) => {
        try {
          const { accessToken } = (api.getState() as AppState).auth
          await prepareAdminSdk(accessToken || '').shiftOfflineEvents().followUp(id)
          return { data: null }
        } catch (error) {
          return { error: handleBackendError(error, api) }
        }
      },
      // A 409 (another admin followed it up first) also changed the list, so read it again either way.
      invalidatesTags: [Tags.shiftOfflineEvents],
    }),
  }),
})

export const { useGetShiftOfflineEventsQuery, useFollowUpShiftOfflineEventMutation } = shiftOfflineEventApi
