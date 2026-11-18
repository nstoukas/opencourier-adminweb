import type {
  PartnerBillCreateInput,
  PartnerBillDto,
  PartnerBillStatementDto,
  PartnerChargeMonthDto,
  PartnerChargePartnerMonthDto,
} from '../backend-admin-sdk'
import { Tags } from '@/api/utils/tags'
import { api as baseApi, prepareAdminSdk } from '.'
import { AppState } from '@/redux/store'
import { handleBackendError } from './utils/api'

// What each restaurant owes, per Athens month, and the bills admins make of it by hand (spec 0036).
// Every read provides the one tag and every write invalidates it, so a bill or an undo refreshes
// the overview, the restaurant's month and the line on the restaurant's page together.
export const partnerChargeApi = baseApi.injectEndpoints({
  overrideExisting: true,
  endpoints: (build) => ({
    // Every restaurant's charges for a month; `partnerId` narrows it to one (AC-11).
    getPartnerChargeMonth: build.query<PartnerChargeMonthDto, { month: string; partnerId?: string }>({
      queryFn: async ({ month, partnerId }, api) => {
        try {
          const { accessToken } = (api.getState() as AppState).auth
          const data = await prepareAdminSdk(accessToken || '').partnerCharges().month(month, partnerId)
          return { data }
        } catch (error) {
          return { error: handleBackendError(error, api) }
        }
      },
      providesTags: [Tags.partnerCharges],
    }),
    getPartnerChargePartnerMonth: build.query<PartnerChargePartnerMonthDto, { month: string; partnerId: string }>({
      queryFn: async ({ month, partnerId }, api) => {
        try {
          const { accessToken } = (api.getState() as AppState).auth
          const data = await prepareAdminSdk(accessToken || '').partnerCharges().partnerMonth(month, partnerId)
          return { data }
        } catch (error) {
          return { error: handleBackendError(error, api) }
        }
      },
      providesTags: [Tags.partnerCharges],
    }),
    getPartnerBillStatement: build.query<PartnerBillStatementDto, { billId: string }>({
      queryFn: async ({ billId }, api) => {
        try {
          const { accessToken } = (api.getState() as AppState).auth
          const data = await prepareAdminSdk(accessToken || '').partnerCharges().statement(billId)
          return { data }
        } catch (error) {
          return { error: handleBackendError(error, api) }
        }
      },
      providesTags: [Tags.partnerCharges],
    }),
    createPartnerBill: build.mutation<PartnerBillDto, PartnerBillCreateInput>({
      queryFn: async (input, api) => {
        try {
          const { accessToken } = (api.getState() as AppState).auth
          const data = await prepareAdminSdk(accessToken || '').partnerCharges().createBill(input)
          return { data }
        } catch (error) {
          return { error: handleBackendError(error, api) }
        }
      },
      invalidatesTags: [Tags.partnerCharges],
    }),
    undoPartnerBill: build.mutation<PartnerBillDto, { billId: string; reason: string }>({
      queryFn: async ({ billId, reason }, api) => {
        try {
          const { accessToken } = (api.getState() as AppState).auth
          const data = await prepareAdminSdk(accessToken || '').partnerCharges().undoBill(billId, reason)
          return { data }
        } catch (error) {
          return { error: handleBackendError(error, api) }
        }
      },
      invalidatesTags: [Tags.partnerCharges],
    }),
  }),
})

// Read the lines again after a refused bill (AC-6). RTK Query 1.9 already refetches the tag after a
// rejected mutation; the dialog calls this as well so the reload does not depend on that detail.
export const refreshPartnerCharges = () => partnerChargeApi.util.invalidateTags([Tags.partnerCharges])

// The ids a bill's 409 says are already billed, or null when the error is something else (AC-6).
export function alreadyBilledIds(err: unknown): string[] | null {
  const candidate = err as { statusCode?: number; alreadyBilled?: unknown } | undefined
  if (candidate?.statusCode !== 409) return null
  return Array.isArray(candidate.alreadyBilled) ? candidate.alreadyBilled.filter((id): id is string => typeof id === 'string') : []
}

export const {
  useGetPartnerChargeMonthQuery,
  useGetPartnerChargePartnerMonthQuery,
  useGetPartnerBillStatementQuery,
  useCreatePartnerBillMutation,
  useUndoPartnerBillMutation,
} = partnerChargeApi
