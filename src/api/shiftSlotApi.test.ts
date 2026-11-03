import { configureStore, type AnyAction } from '@reduxjs/toolkit'
import { isShiftSlotConflict, refreshShiftSlots, shiftSlotApi } from './shiftSlotApi'
import { prepareAdminSdk } from '.'
import { Tags } from './utils/tags'
import { authSlice } from '@/modules/auth/slices/authSlice'
import { ApiError } from '../backend-admin-sdk'
import type { ShiftSlotAdminDto } from '../backend-admin-sdk'

jest.mock('.', () => {
  const actual = jest.requireActual('.')
  return { ...actual, prepareAdminSdk: jest.fn() }
})

const mockPrepareAdminSdk = prepareAdminSdk as jest.Mock

function setupTestStore(onAction?: (action: AnyAction) => void) {
  return configureStore({
    reducer: {
      [shiftSlotApi.reducerPath]: shiftSlotApi.reducer,
      [authSlice.name]: authSlice.reducer,
    },
    middleware: (getDefaultMiddleware) => {
      const middleware = getDefaultMiddleware({ serializableCheck: false, immutableCheck: false }).concat(
        shiftSlotApi.middleware
      )
      if (onAction) {
        return middleware.concat(() => (next) => (action: any) => {
          onAction(action)
          return next(action)
        })
      }
      return middleware
    },
    preloadedState: { auth: { accessToken: 'admin-token' } },
  })
}

// Spec 0026 (row 77): the shift slot RTK slice: which SDK call each endpoint makes, and the shiftSlots
// tag every query provides and every write invalidates (so the list and a slot's history refresh).
describe('shiftSlotApi (spec 0026)', () => {
  const sdk = {
    list: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    changes: jest.fn(),
  }
  const slot: ShiftSlotAdminDto = {
    id: 'slot-1',
    weekday: 5,
    startMinute: 1140,
    endMinute: 1380,
    riderCap: 6,
    createdAt: '2026-11-01T10:00:00.000Z',
    updatedAt: '2026-11-01T10:00:00.000Z',
    removedAt: null,
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockPrepareAdminSdk.mockReturnValue({ shiftSlots: () => sdk })
    sdk.list.mockResolvedValue([slot])
    sdk.changes.mockResolvedValue([])
    sdk.create.mockResolvedValue(slot)
    sdk.update.mockResolvedValue(slot)
    sdk.remove.mockResolvedValue({ ...slot, removedAt: '2026-11-03T08:00:00.000Z' })
  })

  it('defines the shiftSlots tag', () => {
    expect(Tags.shiftSlots).toBe('ShiftSlots')
    expect(Tags.tagTypes).toContain('ShiftSlots')
  })

  it('getShiftSlots passes includeRemoved to the SDK list, with the stored token', async () => {
    const store = setupTestStore()
    await store.dispatch(shiftSlotApi.endpoints.getShiftSlots.initiate({ includeRemoved: false }))
    expect(mockPrepareAdminSdk).toHaveBeenCalledWith('admin-token')
    expect(sdk.list).toHaveBeenLastCalledWith(false)

    const result = await store.dispatch(shiftSlotApi.endpoints.getShiftSlots.initiate({ includeRemoved: true }))
    expect(sdk.list).toHaveBeenLastCalledWith(true)
    expect(result.data).toEqual([slot])
  })

  it('getShiftSlotChanges calls the SDK changes with the id', async () => {
    const store = setupTestStore()
    await store.dispatch(shiftSlotApi.endpoints.getShiftSlotChanges.initiate({ id: 'slot-1' }))
    expect(sdk.changes).toHaveBeenCalledWith('slot-1')
  })

  it.each([
    ['createShiftSlot', () => shiftSlotApi.endpoints.createShiftSlot.initiate({ weekday: 1, startMinute: 0, endMinute: 60, riderCap: 1 }), 'create'],
    ['updateShiftSlot', () => shiftSlotApi.endpoints.updateShiftSlot.initiate({ id: 'slot-1', input: { riderCap: 8 } }), 'update'],
    ['removeShiftSlot', () => shiftSlotApi.endpoints.removeShiftSlot.initiate({ id: 'slot-1' }), 'remove'],
  ] as const)('%s invalidates shiftSlots: the list and an open history both refetch', async (_name, initiate, sdkMethod) => {
    const actions: AnyAction[] = []
    const store = setupTestStore((action) => actions.push(action))

    // Subscribe to the list and to a slot's history, as the page and the History dialog do.
    void store.dispatch(shiftSlotApi.endpoints.getShiftSlots.initiate({ includeRemoved: false }))
    void store.dispatch(shiftSlotApi.endpoints.getShiftSlotChanges.initiate({ id: 'slot-1' }))
    await new Promise((resolve) => setTimeout(resolve, 0))
    actions.length = 0

    await store.dispatch(initiate() as any)
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(sdk[sdkMethod]).toHaveBeenCalledTimes(1)
    const refetched = actions
      .filter((a) => a.type === 'api/executeQuery/pending')
      .map((a) => a.meta?.arg?.endpointName)
    expect(refetched).toContain('getShiftSlots')
    expect(refetched).toContain('getShiftSlotChanges')
  })

  it('sends the mutations their arguments', async () => {
    const store = setupTestStore()
    await store.dispatch(
      shiftSlotApi.endpoints.createShiftSlot.initiate({ weekday: 7, startMinute: 1320, endMinute: 1440, riderCap: 2 })
    )
    expect(sdk.create).toHaveBeenCalledWith({ weekday: 7, startMinute: 1320, endMinute: 1440, riderCap: 2 })
    await store.dispatch(shiftSlotApi.endpoints.updateShiftSlot.initiate({ id: 'slot-9', input: { endMinute: 1400 } }))
    expect(sdk.update).toHaveBeenCalledWith('slot-9', { endMinute: 1400 })
    await store.dispatch(shiftSlotApi.endpoints.removeShiftSlot.initiate({ id: 'slot-9' }))
    expect(sdk.remove).toHaveBeenCalledWith('slot-9')
  })

  // Row 77 review: after a 409 nothing was saved, so nothing refreshes by itself; the dialogs dispatch this.
  it('refreshShiftSlots() refetches the list and an open history', async () => {
    const actions: AnyAction[] = []
    const store = setupTestStore((action) => actions.push(action))
    void store.dispatch(shiftSlotApi.endpoints.getShiftSlots.initiate({ includeRemoved: false }))
    void store.dispatch(shiftSlotApi.endpoints.getShiftSlotChanges.initiate({ id: 'slot-1' }))
    await new Promise((resolve) => setTimeout(resolve, 0))
    actions.length = 0
    sdk.list.mockClear()

    store.dispatch(refreshShiftSlots())
    await new Promise((resolve) => setTimeout(resolve, 0))

    const refetched = actions
      .filter((a) => a.type === 'api/executeQuery/pending')
      .map((a) => a.meta?.arg?.endpointName)
    expect(refetched).toContain('getShiftSlots')
    expect(refetched).toContain('getShiftSlotChanges')
    expect(sdk.list).toHaveBeenCalledTimes(1)
  })

  it('isShiftSlotConflict is true only for statusCode 409', () => {
    expect(isShiftSlotConflict({ statusCode: 409, message: 'This slot just changed. Look again.' })).toBe(true)
    expect(isShiftSlotConflict(new ApiError('CONFLICT' as any, 'This slot just changed. Look again.', 409))).toBe(true)
    for (const other of [{ statusCode: 400 }, { statusCode: 404 }, { statusCode: 500 }, { status: 409 }, {}, null, undefined, 'error']) {
      expect(isShiftSlotConflict(other)).toBe(false)
    }
  })
})
