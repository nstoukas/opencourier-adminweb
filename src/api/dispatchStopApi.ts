import type {
  DispatchStopAdminDto,
  DispatchStopCreateAdminInput,
  DispatchStopOverviewAdminDto,
  DispatchStopPreviewAdminDto,
} from '../backend-admin-sdk'
import { Tags } from '@/api/utils/tags'
import { api as baseApi, prepareAdminSdk } from '.'
import { AppState } from '@/redux/store'
import { handleBackendError } from './utils/api'

// Stopping dispatch for heat or a storm (spec 0014).
export const dispatchStopApi = baseApi.injectEndpoints({
  overrideExisting: true,
  endpoints: (build) => ({
    // The stop on now, the scheduled ones and the last 50.
    getDispatchStops: build.query<DispatchStopOverviewAdminDto, void>({
      queryFn: async (_, api) => {
        try {
          const { accessToken } = (api.getState() as AppState).auth
          const data = await prepareAdminSdk(accessToken || '').dispatchStops().overview()
          return { data }
        } catch (error) {
          return { error: handleBackendError(error, api) }
        }
      },
      providesTags: [Tags.dispatchStops],
    }),
    // How many offers would end and deliveries go back to waiting, read when Stop now opens.
    getDispatchStopPreview: build.query<DispatchStopPreviewAdminDto, void>({
      queryFn: async (_, api) => {
        try {
          const { accessToken } = (api.getState() as AppState).auth
          const data = await prepareAdminSdk(accessToken || '').dispatchStops().preview()
          return { data }
        } catch (error) {
          return { error: handleBackendError(error, api) }
        }
      },
      // Always read fresh: the counts change with every offer.
      keepUnusedDataFor: 0,
    }),
    // Stop now, or schedule a stop. Stop now changes deliveries (offers end, some return to waiting).
    createDispatchStop: build.mutation<DispatchStopAdminDto, DispatchStopCreateAdminInput>({
      queryFn: async (input, api) => {
        try {
          const { accessToken } = (api.getState() as AppState).auth
          const data = await prepareAdminSdk(accessToken || '').dispatchStops().create(input)
          return { data }
        } catch (error) {
          return { error: handleBackendError(error, api) }
        }
      },
      invalidatesTags: [Tags.dispatchStops, Tags.deliveries],
    }),
    // Restart dispatch, or cancel a scheduled stop. A restart offers waiting deliveries again.
    endDispatchStop: build.mutation<DispatchStopAdminDto, { id: string }>({
      queryFn: async ({ id }, api) => {
        try {
          const { accessToken } = (api.getState() as AppState).auth
          const data = await prepareAdminSdk(accessToken || '').dispatchStops().end(id)
          return { data }
        } catch (error) {
          return { error: handleBackendError(error, api) }
        }
      },
      invalidatesTags: [Tags.dispatchStops, Tags.deliveries],
    }),
  }),
})

export const {
  useGetDispatchStopsQuery,
  useGetDispatchStopPreviewQuery,
  useCreateDispatchStopMutation,
  useEndDispatchStopMutation,
} = dispatchStopApi
