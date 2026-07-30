import type {
  PartnerAdminDto,
  PartnerCreateAdminInput,
  PartnerPaginatedAdminDto,
  PartnerUpdateAdminInput,
} from '../backend-admin-sdk'
import { Tags } from '@/api/utils/tags'
import { api as baseApi, prepareAdminSdk } from '.'
import { AppState } from '@/redux/store'
import { handleBackendError } from './utils/api'

export const partnersApi = baseApi.injectEndpoints({
  overrideExisting: true,
  endpoints: (build) => ({
    getPartners: build.query<PartnerPaginatedAdminDto, { page?: number; perPage?: number }>({
      queryFn: async (params, api) => {
        try {
          const { accessToken } = (api.getState() as AppState).auth
          const sdk = prepareAdminSdk(accessToken || '')
          const data = await sdk.partners().getPartners({
            page: params.page ?? 1,
            perPage: params.perPage ?? 10,
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
    rotatePartnerPassword: build.mutation<void, { id: string; password: string }>({
      queryFn: async ({ id, password }, api) => {
        try {
          const { accessToken } = (api.getState() as AppState).auth
          const sdk = prepareAdminSdk(accessToken || '')
          await sdk.partners().rotatePartnerPassword({
            id,
            partnerRotatePasswordAdminInput: { password },
          })
          return { data: undefined }
        } catch (error) {
          return {
            error: handleBackendError(error, api),
          }
        }
      },
      invalidatesTags: [],
    }),
  }),
})

export const {
  useGetPartnersQuery,
  useGetPartnerQuery,
  useCreatePartnerMutation,
  useUpdatePartnerMutation,
  useRotatePartnerPasswordMutation,
} = partnersApi
