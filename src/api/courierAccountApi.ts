import type {
  CourierAccountAdminDto,
  CourierAccountChangeAdminDto,
  CourierUpdateAdminInput,
} from '../backend-admin-sdk'
import { Tags } from '@/api/utils/tags'
import { api as baseApi, prepareAdminSdk } from '.'
import { AppState } from '@/redux/store'
import { handleBackendError } from './utils/api'

// Spec 0051 (row 108): a rider's account. Every write refreshes the rider, their account, its history
// and the list (a deactivated rider is labelled there).
const ACCOUNT_TAGS = [Tags.couriers, Tags.courierAccount, Tags.deliveries]

export const courierAccountApi = baseApi.injectEndpoints({
  overrideExisting: true,
  endpoints: (build) => ({
    getCourierAccount: build.query<CourierAccountAdminDto, { id: string }>({
      queryFn: async ({ id }, api) => {
        try {
          const { accessToken } = (api.getState() as AppState).auth
          const data = await prepareAdminSdk(accessToken || '').courierAccount().account(id)
          return { data }
        } catch (error) {
          return { error: handleBackendError(error, api) }
        }
      },
      providesTags: [Tags.courierAccount],
    }),
    getCourierAccountChanges: build.query<CourierAccountChangeAdminDto[], { id: string }>({
      queryFn: async ({ id }, api) => {
        try {
          const { accessToken } = (api.getState() as AppState).auth
          const data = await prepareAdminSdk(accessToken || '').courierAccount().changes(id)
          return { data }
        } catch (error) {
          return { error: handleBackendError(error, api) }
        }
      },
      providesTags: [Tags.courierAccount],
    }),
    // 2xx with nothing needed back: `{ data: null }`, since RTK Query logs an error for undefined.
    deactivateCourier: build.mutation<null, { id: string; reason: string }>({
      queryFn: async ({ id, reason }, api) => {
        try {
          const { accessToken } = (api.getState() as AppState).auth
          await prepareAdminSdk(accessToken || '').courierAccount().deactivate(id, reason)
          return { data: null }
        } catch (error) {
          return { error: handleBackendError(error, api) }
        }
      },
      invalidatesTags: ACCOUNT_TAGS,
    }),
    reactivateCourier: build.mutation<null, { id: string; reason?: string }>({
      queryFn: async ({ id, reason }, api) => {
        try {
          const { accessToken } = (api.getState() as AppState).auth
          await prepareAdminSdk(accessToken || '').courierAccount().reactivate(id, reason)
          return { data: null }
        } catch (error) {
          return { error: handleBackendError(error, api) }
        }
      },
      invalidatesTags: ACCOUNT_TAGS,
    }),
    // AC-4: names, phone, login email and emergency contact, through the existing PATCH.
    editCourierDetails: build.mutation<null, { id: string; input: CourierUpdateAdminInput }>({
      queryFn: async ({ id, input }, api) => {
        try {
          const { accessToken } = (api.getState() as AppState).auth
          await prepareAdminSdk(accessToken || '').couriers().updateCourier({ id, courierUpdateAdminInput: input })
          return { data: null }
        } catch (error) {
          return { error: handleBackendError(error, api) }
        }
      },
      invalidatesTags: ACCOUNT_TAGS,
    }),
  }),
})

export const {
  useGetCourierAccountQuery,
  useGetCourierAccountChangesQuery,
  useDeactivateCourierMutation,
  useReactivateCourierMutation,
  useEditCourierDetailsMutation,
} = courierAccountApi
