import type { ShiftSlotAdminDto, ShiftSlotChangeAdminDto, ShiftSlotFieldsAdmin } from '../backend-admin-sdk'
import { Tags } from '@/api/utils/tags'
import { api as baseApi, prepareAdminSdk } from '.'
import { AppState } from '@/redux/store'
import { handleBackendError } from './utils/api'

// The co-op's weekly shift slots (spec 0026, row 77).
export const shiftSlotApi = baseApi.injectEndpoints({
  overrideExisting: true,
  endpoints: (build) => ({
    // The current slots, or with `includeRemoved` the removed ones too.
    getShiftSlots: build.query<ShiftSlotAdminDto[], { includeRemoved: boolean }>({
      queryFn: async ({ includeRemoved }, api) => {
        try {
          const { accessToken } = (api.getState() as AppState).auth
          const data = await prepareAdminSdk(accessToken || '').shiftSlots().list(includeRemoved)
          return { data }
        } catch (error) {
          return { error: handleBackendError(error, api) }
        }
      },
      providesTags: [Tags.shiftSlots],
    }),
    // One slot's record, newest first.
    getShiftSlotChanges: build.query<ShiftSlotChangeAdminDto[], { id: string }>({
      queryFn: async ({ id }, api) => {
        try {
          const { accessToken } = (api.getState() as AppState).auth
          const data = await prepareAdminSdk(accessToken || '').shiftSlots().changes(id)
          return { data }
        } catch (error) {
          return { error: handleBackendError(error, api) }
        }
      },
      providesTags: [Tags.shiftSlots],
    }),
    createShiftSlot: build.mutation<ShiftSlotAdminDto, ShiftSlotFieldsAdmin>({
      queryFn: async (input, api) => {
        try {
          const { accessToken } = (api.getState() as AppState).auth
          const data = await prepareAdminSdk(accessToken || '').shiftSlots().create(input)
          return { data }
        } catch (error) {
          return { error: handleBackendError(error, api) }
        }
      },
      invalidatesTags: [Tags.shiftSlots],
    }),
    updateShiftSlot: build.mutation<ShiftSlotAdminDto, { id: string; input: Partial<ShiftSlotFieldsAdmin> }>({
      queryFn: async ({ id, input }, api) => {
        try {
          const { accessToken } = (api.getState() as AppState).auth
          const data = await prepareAdminSdk(accessToken || '').shiftSlots().update(id, input)
          return { data }
        } catch (error) {
          return { error: handleBackendError(error, api) }
        }
      },
      invalidatesTags: [Tags.shiftSlots],
    }),
    removeShiftSlot: build.mutation<ShiftSlotAdminDto, { id: string }>({
      queryFn: async ({ id }, api) => {
        try {
          const { accessToken } = (api.getState() as AppState).auth
          const data = await prepareAdminSdk(accessToken || '').shiftSlots().remove(id)
          return { data }
        } catch (error) {
          return { error: handleBackendError(error, api) }
        }
      },
      invalidatesTags: [Tags.shiftSlots],
    }),
  }),
})

// After a 409 (another admin changed or removed the slot) nothing was saved, so RTK Query refreshes
// nothing by itself: the dialogs call this to read the slots again (row 77 review).
export const refreshShiftSlots = () => shiftSlotApi.util.invalidateTags([Tags.shiftSlots])

// True for the backend's 409 "This slot just changed. Look again."
export function isShiftSlotConflict(err: unknown): boolean {
  return (err as { statusCode?: number } | undefined)?.statusCode === 409
}

export const {
  useGetShiftSlotsQuery,
  useGetShiftSlotChangesQuery,
  useCreateShiftSlotMutation,
  useUpdateShiftSlotMutation,
  useRemoveShiftSlotMutation,
} = shiftSlotApi
