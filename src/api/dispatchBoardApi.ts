import type { DispatchBoardDto } from '../backend-admin-sdk'
import { Tags } from '@/api/utils/tags'
import { api as baseApi, prepareAdminSdk } from '.'
import { AppState } from '@/redux/store'
import { handleBackendError } from './utils/api'

// The live Dispatch board (spec 0034). An assignment, a handled report or an answered removal
// request refreshes it at once, through these tags; everything else arrives with the next 10 s poll.
export const dispatchBoardApi = baseApi.injectEndpoints({
  overrideExisting: true,
  endpoints: (build) => ({
    getDispatchBoard: build.query<DispatchBoardDto, void>({
      queryFn: async (_, api) => {
        try {
          const { accessToken } = (api.getState() as AppState).auth
          const data = await prepareAdminSdk(accessToken || '').dispatchBoard().getBoard()
          return { data }
        } catch (error) {
          return { error: handleBackendError(error, api) }
        }
      },
      providesTags: [Tags.deliveries, Tags.deliveryIssues, Tags.removalRequests],
    }),
  }),
})

export const { useGetDispatchBoardQuery } = dispatchBoardApi
