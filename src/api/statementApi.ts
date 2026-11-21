import type { CourierStatementsAdminDto, StatementFormat, StatementLang } from '../backend-admin-sdk'
import { Tags } from '@/api/utils/tags'
import { api as baseApi, prepareAdminSdk } from '.'
import { AppState } from '@/redux/store'
import { handleBackendError } from './utils/api'

// Spec 0050 (AC-9): a rider's statements. A download writes a record on the server, so the list is read again.
export const statementApi = baseApi.injectEndpoints({
  overrideExisting: true,
  endpoints: (build) => ({
    getCourierStatements: build.query<CourierStatementsAdminDto, { id: string }>({
      queryFn: async ({ id }, api) => {
        try {
          const { accessToken } = (api.getState() as AppState).auth
          const data = await prepareAdminSdk(accessToken || '').statements().list(id)
          return { data }
        } catch (error) {
          return { error: handleBackendError(error, api) }
        }
      },
      providesTags: [Tags.courierStatements],
    }),
  }),
})

export const { useGetCourierStatementsQuery } = statementApi

// The file itself is not kept in the store (a Blob is not serialisable); the card asks the SDK directly
// with the same token, then reads the list again.
export async function downloadStatement(
  accessToken: string,
  input: { id: string; month: string; format: StatementFormat; lang: StatementLang }
): Promise<Blob> {
  return prepareAdminSdk(accessToken).statements().download(input.id, input.month, input.format, input.lang)
}

export const refreshCourierStatements = () => statementApi.util.invalidateTags([Tags.courierStatements])
