import type {
  SavedCustomerAdminDto,
  SavedCustomerListAdminDto,
  SavedCustomerUpdateAdminInput,
} from '../backend-admin-sdk'
import { api as baseApi, prepareAdminSdk } from '.'
import { AppState } from '@/redux/store'
import { handleBackendError } from './utils/api'

// A restaurant's saved customers (spec 0005, AC-6). The Customers card keeps the rows it has shown
// itself (Show more appends), so the list is a lazy query it calls per page, and an edit or a delete
// updates the card directly instead of reloading.
export const savedCustomersApi = baseApi.injectEndpoints({
  overrideExisting: true,
  endpoints: (build) => ({
    getPartnerCustomers: build.query<
      SavedCustomerListAdminDto,
      { partnerId: string; q?: string; page: number; perPage: number }
    >({
      queryFn: async ({ partnerId, q, page, perPage }, api) => {
        try {
          const { accessToken } = (api.getState() as AppState).auth
          const sdk = prepareAdminSdk(accessToken || '')
          const data = await sdk.savedCustomers().listCustomers({ partnerId, q, page, perPage })
          return { data }
        } catch (error) {
          return { error: handleBackendError(error, api) }
        }
      },
      // Always ask again: an admin looks here to act on a customer's request, so the list must be current.
      keepUnusedDataFor: 0,
    }),
    updatePartnerCustomer: build.mutation<
      SavedCustomerAdminDto,
      { partnerId: string; id: string; input: SavedCustomerUpdateAdminInput }
    >({
      queryFn: async ({ partnerId, id, input }, api) => {
        try {
          const { accessToken } = (api.getState() as AppState).auth
          const sdk = prepareAdminSdk(accessToken || '')
          const data = await sdk.savedCustomers().updateCustomer({ partnerId, id, input })
          return { data }
        } catch (error) {
          return { error: handleBackendError(error, api) }
        }
      },
    }),
    deletePartnerCustomer: build.mutation<void, { partnerId: string; id: string }>({
      queryFn: async ({ partnerId, id }, api) => {
        try {
          const { accessToken } = (api.getState() as AppState).auth
          const sdk = prepareAdminSdk(accessToken || '')
          await sdk.savedCustomers().deleteCustomer({ partnerId, id })
          return { data: undefined }
        } catch (error) {
          return { error: handleBackendError(error, api) }
        }
      },
    }),
  }),
})

export const {
  useLazyGetPartnerCustomersQuery,
  useUpdatePartnerCustomerMutation,
  useDeletePartnerCustomerMutation,
} = savedCustomersApi
