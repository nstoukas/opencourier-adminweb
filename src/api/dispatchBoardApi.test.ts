import { configureStore } from '@reduxjs/toolkit'
import { dispatchBoardApi, useGetDispatchBoardQuery } from './dispatchBoardApi'
import { prepareAdminSdk } from '.'
import { Tags } from './utils/tags'
import { authSlice } from '@/modules/auth/slices/authSlice'
import { ApiError } from '../backend-admin-sdk'
import type { DispatchBoardDto } from '../backend-admin-sdk'

jest.mock('.', () => {
  const actual = jest.requireActual('.')
  return {
    ...actual,
    prepareAdminSdk: jest.fn(),
  }
})

const mockPrepareAdminSdk = prepareAdminSdk as jest.Mock

function setupTestStore(accessToken: string | null = 'test-admin-token') {
  return configureStore({
    reducer: {
      [dispatchBoardApi.reducerPath]: dispatchBoardApi.reducer,
      [authSlice.name]: authSlice.reducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: false,
        immutableCheck: false,
      }).concat(dispatchBoardApi.middleware),
    preloadedState: {
      auth: { accessToken },
    },
  })
}

describe('dispatchBoardApi (spec 0034, AC-1, AC-15)', () => {
  let mockGetBoard: jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()
    mockGetBoard = jest.fn()
    mockPrepareAdminSdk.mockReturnValue({
      dispatchBoard: () => ({
        getBoard: mockGetBoard,
      }),
    })
  })

  it('exports useGetDispatchBoardQuery hook function', () => {
    expect(typeof useGetDispatchBoardQuery).toBe('function')
  })

  it('defines getDispatchBoard endpoint providing Tags.deliveries and Tags.deliveryIssues', () => {
    expect(dispatchBoardApi.endpoints.getDispatchBoard).toBeDefined()
    expect(typeof dispatchBoardApi.endpoints.getDispatchBoard.initiate).toBe('function')
  })

  it('calls sdk.dispatchBoard().getBoard() with auth token and returns data', async () => {
    const store = setupTestStore('sample-admin-bearer-token')
    const mockBoardData: DispatchBoardDto = {
      generatedAt: '2026-11-09T14:30:00.000Z',
      cards: {
        active: { total: 5, toPickup: 3, toDropoff: 2 },
        waiting: { total: 1, oldestWaitingMinutes: 8 },
        couriers: { total: 4, busy: 3, free: 1, lastCall: 0 },
        deliveredToday: { total: 12, medianMinutes: 24 },
      },
      attention: [],
      attentionMore: 0,
      map: { couriers: [], waitingDeliveries: [] },
      dispatchStop: { active: false, until: null },
    }

    mockGetBoard.mockResolvedValueOnce(mockBoardData)

    const result = await store.dispatch(
      dispatchBoardApi.endpoints.getDispatchBoard.initiate()
    )

    expect(mockPrepareAdminSdk).toHaveBeenCalledWith('sample-admin-bearer-token')
    expect(mockGetBoard).toHaveBeenCalledTimes(1)
    expect('data' in result ? result.data : undefined).toEqual(mockBoardData)
    expect(result.error).toBeUndefined()
  })

  it('handles backend error properly and returns error object', async () => {
    const store = setupTestStore('sample-admin-bearer-token')
    const apiError = new ApiError('FORBIDDEN' as any, 'Forbidden', 403)
    mockGetBoard.mockRejectedValueOnce(apiError)

    const result = await store.dispatch(
      dispatchBoardApi.endpoints.getDispatchBoard.initiate()
    )

    expect(result.data).toBeUndefined()
    expect(result.error).toBeDefined()
  })

  it('refreshes the board at once when a handled report invalidates Tags.deliveryIssues (AC-7)', async () => {
    const store = setupTestStore('sample-admin-bearer-token')
    const mockBoardData: DispatchBoardDto = {
      generatedAt: '2026-11-09T14:30:00.000Z',
      cards: {
        active: { total: 1, toPickup: 1, toDropoff: 0 },
        waiting: { total: 0, oldestWaitingMinutes: null },
        couriers: { total: 1, busy: 1, free: 0, lastCall: 0 },
        deliveredToday: { total: 0, medianMinutes: null },
      },
      attention: [],
      attentionMore: 0,
      map: { couriers: [], waitingDeliveries: [] },
      dispatchStop: { active: false, until: null },
    }
    mockGetBoard.mockResolvedValue(mockBoardData)

    const sub = store.dispatch(
      dispatchBoardApi.endpoints.getDispatchBoard.initiate(undefined, { subscribe: true })
    )
    await sub
    expect(mockGetBoard).toHaveBeenCalledTimes(1)

    // A handled report invalidates Tags.deliveryIssues
    store.dispatch(dispatchBoardApi.util.invalidateTags([Tags.deliveryIssues]))

    // Must refresh the board at once
    expect(mockGetBoard).toHaveBeenCalledTimes(2)

    sub.unsubscribe()
  })

  it('refreshes the board at once when an assignment invalidates Tags.deliveries (AC-4)', async () => {
    const store = setupTestStore('sample-admin-bearer-token')
    const mockBoardData: DispatchBoardDto = {
      generatedAt: '2026-11-09T14:30:00.000Z',
      cards: {
        active: { total: 1, toPickup: 1, toDropoff: 0 },
        waiting: { total: 0, oldestWaitingMinutes: null },
        couriers: { total: 1, busy: 1, free: 0, lastCall: 0 },
        deliveredToday: { total: 0, medianMinutes: null },
      },
      attention: [],
      attentionMore: 0,
      map: { couriers: [], waitingDeliveries: [] },
      dispatchStop: { active: false, until: null },
    }
    mockGetBoard.mockResolvedValue(mockBoardData)

    const sub = store.dispatch(
      dispatchBoardApi.endpoints.getDispatchBoard.initiate(undefined, { subscribe: true })
    )
    await sub
    expect(mockGetBoard).toHaveBeenCalledTimes(1)

    // An assignment invalidates Tags.deliveries
    store.dispatch(dispatchBoardApi.util.invalidateTags([Tags.deliveries]))

    // Must refresh the board at once
    expect(mockGetBoard).toHaveBeenCalledTimes(2)

    sub.unsubscribe()
  })
})
