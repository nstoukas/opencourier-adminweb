import type {
  CourierAdminDto,
  CourierApiGetManyCouriersRequest,
  CourierCreateAdminInput,
  CourierPaginatedAdminDto,
} from '../backend-admin-sdk'
import { Tags } from '@/api/utils/tags'
import { api as baseApi, prepareAdminSdk } from '.'
import { AppState } from '@/redux/store'
import { handleBackendError } from './utils/api'

export const couriersApi = baseApi.injectEndpoints({
  overrideExisting: true,
  endpoints: (build) => ({
    getCouriers: build.query<
      CourierPaginatedAdminDto,
      // The tab and the search are optional (row 97): the pickers that use this query send neither.
      { page?: number; perPage?: number; status?: CourierApiGetManyCouriersRequest['status']; search?: string }
    >({
      queryFn: async (params, api) => {
        try {
          const { accessToken } = (api.getState() as AppState).auth
          const sdk = prepareAdminSdk(accessToken || '')
          const data = await sdk.couriers().getManyCouriers({
            page: params.page ?? 1,
            perPage: params.perPage ?? 100,
            status: params.status,
            search: params.search,
          })
          return { data }
        } catch (error) {
          return {
            error: handleBackendError(error, api),
          }
        }
      },
      providesTags: [Tags.couriers],
    }),
    /** Fetches every page so admin pickers (e.g. manual assign) are not capped at `perPage`. */
    getAllCouriers: build.query<CourierAdminDto[], void>({
      queryFn: async (_, api) => {
        try {
          const { accessToken } = (api.getState() as AppState).auth
          const sdk = prepareAdminSdk(accessToken || '')
          const perPage = 100
          const first = await sdk.couriers().getManyCouriers({ page: 1, perPage })
          const all: CourierAdminDto[] = [...first.data]
          const totalPages = first.pagination?.totalPages ?? 1
          for (let page = 2; page <= totalPages; page++) {
            const res = await sdk.couriers().getManyCouriers({ page, perPage })
            all.push(...res.data)
          }
          return { data: all }
        } catch (error) {
          return {
            error: handleBackendError(error, api),
          }
        }
      },
      providesTags: [Tags.couriers],
    }),
    // One courier by id, for the courier page (spec 0012). Mirrors getDelivery.
    getCourier: build.query<CourierAdminDto, { id: string }>({
      queryFn: async ({ id }, api) => {
        if (!id) return { error: null }
        try {
          const { accessToken } = (api.getState() as AppState).auth
          const sdk = prepareAdminSdk(accessToken || '')
          const data = await sdk.couriers().getCourierById({ id })
          return { data }
        } catch (error) {
          return { error: handleBackendError(error, api) }
        }
      },
      providesTags: [Tags.couriers],
    }),
    // An admin creates a rider and their login (row 16, spec 0013). The list refetches.
    createCourier: build.mutation<CourierAdminDto, CourierCreateAdminInput>({
      queryFn: async (courierCreateAdminInput, api) => {
        try {
          const { accessToken } = (api.getState() as AppState).auth
          const sdk = prepareAdminSdk(accessToken || '')
          const data = await sdk.couriers().createCourier({ courierCreateAdminInput })
          return { data }
        } catch (error) {
          return { error: handleBackendError(error, api) }
        }
      },
      invalidatesTags: [Tags.couriers],
    }),
    // A new password for a rider (row 16). The backend also sets them Offline and ends their open
    // offers, so the courier and the deliveries are asked again.
    rotateCourierPassword: build.mutation<null, { id: string; password: string }>({
      queryFn: async ({ id, password }, api) => {
        try {
          const { accessToken } = (api.getState() as AppState).auth
          const sdk = prepareAdminSdk(accessToken || '')
          await sdk.couriers().rotateCourierPassword({ id, password })
          // null, not undefined: RTK Query reads `data: undefined` as "no result" and logs an error
          // (seen live, row 16 review). The backend answers 204, so there is nothing else to return.
          return { data: null }
        } catch (error) {
          return { error: handleBackendError(error, api) }
        }
      },
      invalidatesTags: [Tags.couriers, Tags.deliveries],
    }),
  }),
})

export const {
  useGetCouriersQuery,
  useGetAllCouriersQuery,
  useGetCourierQuery,
  useCreateCourierMutation,
  useRotateCourierPasswordMutation,
} = couriersApi
