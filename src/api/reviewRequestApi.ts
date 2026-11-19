import type {
  ReviewRequestAdminDto,
  ReviewRequestAdminPageDto,
  ReviewRequestAnswerInput,
  ReviewRequestCountDto,
  ReviewRequestStatus,
  SettingChangeAdminPageDto,
} from '../backend-admin-sdk'
import { Tags } from '@/api/utils/tags'
import { api as baseApi, prepareAdminSdk } from '.'
import { AppState } from '@/redux/store'
import { handleBackendError } from './utils/api'

// Spec 0038: riders' review requests, answered by a person on the Reviews page, and the record of
// every settings change. Every read provides its tag; an answer invalidates the requests (and the
// delivery's timeline and pay, which it can change).
export const reviewRequestApi = baseApi.injectEndpoints({
  overrideExisting: true,
  endpoints: (build) => ({
    getReviewRequests: build.query<
      ReviewRequestAdminPageDto,
      { status: ReviewRequestStatus; page: number; perPage: number }
    >({
      queryFn: async ({ status, page, perPage }, api) => {
        try {
          const { accessToken } = (api.getState() as AppState).auth
          const data = await prepareAdminSdk(accessToken || '').reviewRequests().list(status, page, perPage)
          return { data }
        } catch (error) {
          return { error: handleBackendError(error, api) }
        }
      },
      providesTags: [Tags.reviewRequests],
    }),
    // The sidebar's count (AC-5): how many are open, and how many of those are overdue.
    getReviewRequestCount: build.query<ReviewRequestCountDto, void>({
      queryFn: async (_arg, api) => {
        try {
          const { accessToken } = (api.getState() as AppState).auth
          const data = await prepareAdminSdk(accessToken || '').reviewRequests().count()
          return { data }
        } catch (error) {
          return { error: handleBackendError(error, api) }
        }
      },
      providesTags: [Tags.reviewRequests],
    }),
    answerReviewRequest: build.mutation<ReviewRequestAdminDto, { id: string; input: ReviewRequestAnswerInput }>({
      queryFn: async ({ id, input }, api) => {
        try {
          const { accessToken } = (api.getState() as AppState).auth
          const data = await prepareAdminSdk(accessToken || '').reviewRequests().answer(id, input)
          return { data }
        } catch (error) {
          return { error: handleBackendError(error, api) }
        }
      },
      invalidatesTags: [Tags.reviewRequests, Tags.deliveryEvents, Tags.deliveries],
    }),
    // The Change history on Instance configuration (AC-13).
    getSettingChanges: build.query<SettingChangeAdminPageDto, { page: number; perPage: number }>({
      queryFn: async ({ page, perPage }, api) => {
        try {
          const { accessToken } = (api.getState() as AppState).auth
          const data = await prepareAdminSdk(accessToken || '').reviewRequests().settingChanges(page, perPage)
          return { data }
        } catch (error) {
          return { error: handleBackendError(error, api) }
        }
      },
      providesTags: [Tags.settingChanges],
    }),
  }),
})

// Read the list again after a refused answer (someone else answered, or the rider withdrew).
export const refreshReviewRequests = () => reviewRequestApi.util.invalidateTags([Tags.reviewRequests])

export const {
  useGetReviewRequestsQuery,
  useGetReviewRequestCountQuery,
  useAnswerReviewRequestMutation,
  useGetSettingChangesQuery,
} = reviewRequestApi
