import type {
  PartnerAdminDto,
  PartnerAvailabilityChangeAdminDto,
  PartnerCreateAdminInput,
  PartnerPaginatedAdminDto,
  PartnerWaitRecordAdminDto,
  PartnerUpdateAdminInput,
  PartnerApiKeyAdminAnswer,
  PartnerRotatePasswordAdminAnswer,
} from '../backend-admin-sdk'
import { Tags } from '@/api/utils/tags'
import { api as baseApi, prepareAdminSdk } from '.'
import { AppState } from '@/redux/store'
import { handleBackendError } from './utils/api'

export const partnersApi = baseApi.injectEndpoints({
  overrideExisting: true,
  endpoints: (build) => ({
    getPartners: build.query<PartnerPaginatedAdminDto, { page?: number; perPage?: number; search?: string }>({
      queryFn: async (params, api) => {
        try {
          const { accessToken } = (api.getState() as AppState).auth
          const sdk = prepareAdminSdk(accessToken || '')
          const data = await sdk.partners().getPartners({
            page: params.page ?? 1,
            perPage: params.perPage ?? 10,
            // Row 106: only sent when there is one, so the list without a search asks as before.
            ...(params.search ? { search: params.search } : {}),
          })
          return { data }
        } catch (error) {
          return {
            error: handleBackendError(error, api),
          }
        }
      },
      providesTags: [Tags.partners],
    }),
    getPartner: build.query<PartnerAdminDto, { id: string }>({
      queryFn: async ({ id }, api) => {
        try {
          if (!id) return { error: null as any }
          const { accessToken } = (api.getState() as AppState).auth
          const sdk = prepareAdminSdk(accessToken || '')
          const data = await sdk.partners().getPartner({ id })
          return { data }
        } catch (error) {
          return {
            error: handleBackendError(error, api),
          }
        }
      },
      providesTags: [Tags.partners],
    }),
    createPartner: build.mutation<PartnerAdminDto, PartnerCreateAdminInput>({
      queryFn: async (partnerCreateAdminInput, api) => {
        try {
          const { accessToken } = (api.getState() as AppState).auth
          const sdk = prepareAdminSdk(accessToken || '')
          const data = await sdk.partners().createPartner({ partnerCreateAdminInput })
          return { data }
        } catch (error) {
          return {
            error: handleBackendError(error, api),
          }
        }
      },
      invalidatesTags: [Tags.partners],
    }),
    updatePartner: build.mutation<PartnerAdminDto, { id: string; data: PartnerUpdateAdminInput }>({
      queryFn: async ({ id, data: partnerUpdateAdminInput }, api) => {
        try {
          const { accessToken } = (api.getState() as AppState).auth
          const sdk = prepareAdminSdk(accessToken || '')
          const data = await sdk.partners().updatePartner({ id, partnerUpdateAdminInput })
          return { data }
        } catch (error) {
          return {
            error: handleBackendError(error, api),
          }
        }
      },
      invalidatesTags: [Tags.partners],
    }),
    // Spec 0037: the answer carries the restaurant's new API key when it had one (shown once), else
    // null. The restaurant is fetched again, so the API key card shows the new key's date.
    rotatePartnerPassword: build.mutation<PartnerRotatePasswordAdminAnswer, { id: string; password: string }>({
      queryFn: async ({ id, password }, api) => {
        try {
          const { accessToken } = (api.getState() as AppState).auth
          const sdk = prepareAdminSdk(accessToken || '')
          const data = await sdk.partners().rotatePartnerPassword({
            id,
            partnerRotatePasswordAdminInput: { password },
          })
          return { data }
        } catch (error) {
          return {
            error: handleBackendError(error, api),
          }
        }
      },
      invalidatesTags: [Tags.partners],
    }),
    // Spec 0037, AC-3: a new API key for the restaurant, replacing any earlier one. Shown once.
    createPartnerApiKey: build.mutation<PartnerApiKeyAdminAnswer, { id: string }>({
      queryFn: async ({ id }, api) => {
        try {
          const { accessToken } = (api.getState() as AppState).auth
          const sdk = prepareAdminSdk(accessToken || '')
          const data = await sdk.partners().createPartnerApiKey({ id })
          return { data }
        } catch (error) {
          return {
            error: handleBackendError(error, api),
          }
        }
      },
      invalidatesTags: [Tags.partners],
    }),
    // Spec 0037, AC-4: the restaurant's API key stops working. A 204 has no result, so `data: null`.
    removePartnerApiKey: build.mutation<null, { id: string }>({
      queryFn: async ({ id }, api) => {
        try {
          const { accessToken } = (api.getState() as AppState).auth
          const sdk = prepareAdminSdk(accessToken || '')
          await sdk.partners().removePartnerApiKey({ id })
          return { data: null }
        } catch (error) {
          return {
            error: handleBackendError(error, api),
          }
        }
      },
      invalidatesTags: [Tags.partners],
    }),
    // Spec 0029: disable or enable a restaurant, and its availability history.
    disablePartner: build.mutation<PartnerAdminDto, { id: string; reason: string }>({
      queryFn: async ({ id, reason }, api) => {
        try {
          const { accessToken } = (api.getState() as AppState).auth
          const sdk = prepareAdminSdk(accessToken || '')
          const data = await sdk.partners().disablePartner({ id, reason })
          return { data }
        } catch (error) {
          return {
            error: handleBackendError(error, api),
          }
        }
      },
      invalidatesTags: [Tags.partners],
    }),
    enablePartner: build.mutation<PartnerAdminDto, { id: string }>({
      queryFn: async ({ id }, api) => {
        try {
          const { accessToken } = (api.getState() as AppState).auth
          const sdk = prepareAdminSdk(accessToken || '')
          const data = await sdk.partners().enablePartner({ id })
          return { data }
        } catch (error) {
          return {
            error: handleBackendError(error, api),
          }
        }
      },
      invalidatesTags: [Tags.partners],
    }),
    // Spec 0030: one restaurant's wait record over a period.
    getPartnerWaitRecord: build.query<PartnerWaitRecordAdminDto, { id: string; days: number }>({
      queryFn: async ({ id, days }, api) => {
        try {
          const { accessToken } = (api.getState() as AppState).auth
          const sdk = prepareAdminSdk(accessToken || '')
          const data = await sdk.partners().getPartnerWaitRecord({ id, days })
          return { data }
        } catch (error) {
          return {
            error: handleBackendError(error, api),
          }
        }
      },
      providesTags: [Tags.partners],
    }),
    getPartnerAvailabilityChanges: build.query<PartnerAvailabilityChangeAdminDto[], { id: string }>({
      queryFn: async ({ id }, api) => {
        try {
          const { accessToken } = (api.getState() as AppState).auth
          const sdk = prepareAdminSdk(accessToken || '')
          const data = await sdk.partners().getPartnerAvailabilityChanges({ id })
          return { data }
        } catch (error) {
          return {
            error: handleBackendError(error, api),
          }
        }
      },
      providesTags: [Tags.partners],
    }),
  }),
})

export const {
  useGetPartnersQuery,
  useGetPartnerQuery,
  useCreatePartnerMutation,
  useUpdatePartnerMutation,
  useRotatePartnerPasswordMutation,
  useCreatePartnerApiKeyMutation,
  useRemovePartnerApiKeyMutation,
  useDisablePartnerMutation,
  useEnablePartnerMutation,
  useGetPartnerAvailabilityChangesQuery,
  useGetPartnerWaitRecordQuery,
} = partnersApi
