import type {
  SosCloseAdminInput,
  SosIncidentAdminDto,
  SosIncidentDetailAdminDto,
  SosIncidentPageAdminDto,
} from '../backend-admin-sdk'
import { Tags } from '@/api/utils/tags'
import { api as baseApi, prepareAdminSdk } from '.'
import { AppState } from '@/redux/store'
import { handleBackendError } from './utils/api'

// Riders' SOS incidents (spec 0022).
export const sosApi = baseApi.injectEndpoints({
  overrideExisting: true,
  endpoints: (build) => ({
    // Active and awaiting close, all of them: the banner on every page polls this (AC-8).
    getCurrentSos: build.query<SosIncidentAdminDto[], void>({
      queryFn: async (_, api) => {
        try {
          const { accessToken } = (api.getState() as AppState).auth
          const data = await prepareAdminSdk(accessToken || '').sos().current()
          return { data }
        } catch (error) {
          return { error: handleBackendError(error, api) }
        }
      },
      providesTags: [Tags.sos],
    }),
    // Closed ones, a page at a time, newest first (AC-9).
    getClosedSos: build.query<SosIncidentPageAdminDto, { page: number; limit: number }>({
      queryFn: async ({ page, limit }, api) => {
        try {
          const { accessToken } = (api.getState() as AppState).auth
          const data = await prepareAdminSdk(accessToken || '').sos().closed(page, limit)
          return { data }
        } catch (error) {
          return { error: handleBackendError(error, api) }
        }
      },
      providesTags: [Tags.sos],
    }),
    // One incident and its trail (AC-9).
    getSosIncident: build.query<SosIncidentDetailAdminDto, { id: string }>({
      queryFn: async ({ id }, api) => {
        try {
          const { accessToken } = (api.getState() as AppState).auth
          const data = await prepareAdminSdk(accessToken || '').sos().findOne(id)
          return { data }
        } catch (error) {
          return { error: handleBackendError(error, api) }
        }
      },
      providesTags: [Tags.sos],
    }),
    // Close with an outcome (AC-10). The rider is offerable again afterwards.
    closeSos: build.mutation<SosIncidentAdminDto, { id: string } & SosCloseAdminInput>({
      queryFn: async ({ id, ...input }, api) => {
        try {
          const { accessToken } = (api.getState() as AppState).auth
          const data = await prepareAdminSdk(accessToken || '').sos().close(id, input)
          return { data }
        } catch (error) {
          return { error: handleBackendError(error, api) }
        }
      },
      invalidatesTags: [Tags.sos],
    }),
  }),
})

export const { useGetCurrentSosQuery, useGetClosedSosQuery, useGetSosIncidentQuery, useCloseSosMutation } = sosApi
