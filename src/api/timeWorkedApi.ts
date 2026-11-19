import type { CourierTimeWorkedDto, TimeWorkedTotalsBy, TimeWorkedTotalsDto } from '../backend-admin-sdk'
import { Tags } from '@/api/utils/tags'
import { api as baseApi, prepareAdminSdk } from '.'
import { AppState } from '@/redux/store'
import { handleBackendError } from './utils/api'

// Spec 0040: the co-op's time worked totals (the Time worked page) and one rider's time worked (that
// rider's page). Both also carry the config tag: a change of `shiftBreakMinutes` on Instance
// configuration recomputes every shift, so a save reads them again (AC-9).
export const timeWorkedApi = baseApi.injectEndpoints({
  overrideExisting: true,
  endpoints: (build) => ({
    getTimeWorkedTotals: build.query<TimeWorkedTotalsDto, { from: string; to: string; by: TimeWorkedTotalsBy }>({
      queryFn: async ({ from, to, by }, api) => {
        try {
          const { accessToken } = (api.getState() as AppState).auth
          const data = await prepareAdminSdk(accessToken || '')
            .timeWorked()
            .totals(from, to, by)
          return { data }
        } catch (error) {
          return { error: handleBackendError(error, api) }
        }
      },
      providesTags: [Tags.timeWorked, Tags.config],
    }),
    getCourierTimeWorked: build.query<CourierTimeWorkedDto, { courierId: string; from: string; to: string }>({
      queryFn: async ({ courierId, from, to }, api) => {
        try {
          const { accessToken } = (api.getState() as AppState).auth
          const data = await prepareAdminSdk(accessToken || '')
            .timeWorked()
            .forCourier(courierId, from, to)
          return { data }
        } catch (error) {
          return { error: handleBackendError(error, api) }
        }
      },
      providesTags: [Tags.timeWorked, Tags.config],
    }),
  }),
})

export const { useGetTimeWorkedTotalsQuery, useGetCourierTimeWorkedQuery } = timeWorkedApi
