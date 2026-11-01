import { configureStore, type AnyAction } from '@reduxjs/toolkit'
import {
  dispatchStopApi,
  useGetDispatchStopsQuery,
  useGetDispatchStopPreviewQuery,
  useCreateDispatchStopMutation,
  useEndDispatchStopMutation,
} from './dispatchStopApi'
import { deliveriesApi } from './deliveriesApi'
import { prepareAdminSdk } from '.'
import { Tags } from './utils/tags'
import { authSlice } from '@/modules/auth/slices/authSlice'
import { ApiError } from '../backend-admin-sdk'
import type {
  DispatchStopAdminDto,
  DispatchStopOverviewAdminDto,
  DispatchStopPreviewAdminDto,
  DispatchStopCreateAdminInput,
} from '../backend-admin-sdk'

jest.mock('.', () => {
  const actual = jest.requireActual('.')
  return {
    ...actual,
    prepareAdminSdk: jest.fn(),
  }
})

const mockPrepareAdminSdk = prepareAdminSdk as jest.Mock

function setupTestStore(accessToken: string | null = 'test-token', onAction?: (action: AnyAction) => void) {
  return configureStore({
    reducer: {
      [dispatchStopApi.reducerPath]: dispatchStopApi.reducer,
      [authSlice.name]: authSlice.reducer,
    },
    middleware: (getDefaultMiddleware) => {
      const middleware = getDefaultMiddleware({
        serializableCheck: false,
        immutableCheck: false,
      }).concat(dispatchStopApi.middleware)
      if (onAction) {
        return middleware.concat(() => (next) => (action: any) => {
          onAction(action)
          return next(action)
        })
      }
      return middleware
    },
    preloadedState: {
      auth: { accessToken },
    },
  })
}

describe('dispatchStopApi (spec 0014, AC-1, AC-3, AC-8, AC-9)', () => {
  let mockOverview: jest.Mock
  let mockPreview: jest.Mock
  let mockCreate: jest.Mock
  let mockEnd: jest.Mock
  let mockGetDeliveries: jest.Mock

  const sampleStop: DispatchStopAdminDto = {
    id: 'stop-123',
    reason: 'HEAT',
    startsAt: '2026-07-15T09:00:00Z',
    endsAt: '2026-07-15T15:00:00Z',
    createdByUserId: 'usr-admin-1',
    createdAt: '2026-07-15T08:00:00Z',
    startedAt: '2026-07-15T09:00:00Z',
    endedAt: null,
    endedByUserId: null,
    cancelledAt: null,
    cancelledByUserId: null,
    endWorkDoneAt: null,
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockOverview = jest.fn()
    mockPreview = jest.fn()
    mockCreate = jest.fn()
    mockEnd = jest.fn()
    mockGetDeliveries = jest.fn()

    mockPrepareAdminSdk.mockReturnValue({
      dispatchStops: () => ({
        overview: mockOverview,
        preview: mockPreview,
        create: mockCreate,
        end: mockEnd,
      }),
      deliveries: () => ({
        getDeliveries: mockGetDeliveries,
      }),
    })
  })

  it('exports all hook functions', () => {
    expect(typeof useGetDispatchStopsQuery).toBe('function')
    expect(typeof useGetDispatchStopPreviewQuery).toBe('function')
    expect(typeof useCreateDispatchStopMutation).toBe('function')
    expect(typeof useEndDispatchStopMutation).toBe('function')
  })

  it('defines dispatchStops tag in Tags', () => {
    expect(Tags.dispatchStops).toBe('DispatchStops')
    expect(Tags.tagTypes).toContain('DispatchStops')
  })

  describe('getDispatchStops query', () => {
    it('defines endpoint and calls sdk.dispatchStops().overview() with access token', async () => {
      const store = setupTestStore('valid-admin-token')
      const mockOverviewData: DispatchStopOverviewAdminDto = {
        current: sampleStop,
        scheduled: [],
        history: [sampleStop],
      }
      mockOverview.mockResolvedValueOnce(mockOverviewData)

      const result = await store.dispatch(dispatchStopApi.endpoints.getDispatchStops.initiate())

      expect(mockPrepareAdminSdk).toHaveBeenCalledWith('valid-admin-token')
      expect(mockOverview).toHaveBeenCalledTimes(1)
      expect(result.data).toEqual(mockOverviewData)
      expect(result.error).toBeUndefined()
    })

    it('handles overview rejection: sets error on result', async () => {
      const store = setupTestStore('valid-admin-token')
      const apiError = new ApiError('FORBIDDEN' as any, 'Forbidden', 403)
      mockOverview.mockRejectedValueOnce(apiError)

      const result = await store.dispatch(dispatchStopApi.endpoints.getDispatchStops.initiate())

      expect(result.error).toBeDefined()
      expect(result.data).toBeUndefined()
    })
  })

  describe('getDispatchStopPreview query', () => {
    it('calls sdk.dispatchStops().preview() and resolves counts', async () => {
      const store = setupTestStore('valid-admin-token')
      const mockPreviewData: DispatchStopPreviewAdminDto = {
        offersToEnd: 2,
        deliveriesToReturn: 4,
      }
      mockPreview.mockResolvedValueOnce(mockPreviewData)

      const result = await store.dispatch(dispatchStopApi.endpoints.getDispatchStopPreview.initiate())

      expect(mockPrepareAdminSdk).toHaveBeenCalledWith('valid-admin-token')
      expect(mockPreview).toHaveBeenCalledTimes(1)
      expect(result.data).toEqual(mockPreviewData)
    })
  })

  describe('createDispatchStop mutation', () => {
    it('calls sdk.dispatchStops().create(input) and invalidates Tags.dispatchStops and Tags.deliveries', async () => {
      const dispatchedActions: AnyAction[] = []
      const store = setupTestStore('admin-token-create', (action) => dispatchedActions.push(action))

      mockOverview.mockResolvedValue({ current: null, scheduled: [], history: [] })
      mockGetDeliveries.mockResolvedValue({ data: [], pagination: {} })
      mockCreate.mockResolvedValueOnce(sampleStop)

      // Prime queries that provide Tags.dispatchStops and Tags.deliveries
      await store.dispatch(dispatchStopApi.endpoints.getDispatchStops.initiate())
      await store.dispatch(deliveriesApi.endpoints.getDeliveries.initiate({}))
      dispatchedActions.length = 0

      const input: DispatchStopCreateAdminInput = {
        reason: 'HEAT',
        endsOn: { date: '2026-07-15', time: '17:00' },
      }

      const result = (await store.dispatch(
        dispatchStopApi.endpoints.createDispatchStop.initiate(input)
      )) as { data?: DispatchStopAdminDto; error?: unknown }

      expect(mockPrepareAdminSdk).toHaveBeenCalledWith('admin-token-create')
      expect(mockCreate).toHaveBeenCalledWith(input)
      expect(result.data).toEqual(sampleStop)

      // Verify tag invalidation triggers refetches for both getDispatchStops and getDeliveries
      const refetchedEndpoints = dispatchedActions
        .filter((a) => a.type === 'api/executeQuery/pending')
        .map((a) => a.meta?.arg?.endpointName)

      expect(refetchedEndpoints).toContain('getDispatchStops')
      expect(refetchedEndpoints).toContain('getDeliveries')
    })
  })

  describe('endDispatchStop mutation', () => {
    it('calls sdk.dispatchStops().end(id) and invalidates Tags.dispatchStops and Tags.deliveries', async () => {
      const dispatchedActions: AnyAction[] = []
      const store = setupTestStore('admin-token-end', (action) => dispatchedActions.push(action))

      const endedStop: DispatchStopAdminDto = {
        ...sampleStop,
        endedAt: '2026-07-15T10:00:00Z',
      }
      mockOverview.mockResolvedValue({ current: sampleStop, scheduled: [], history: [] })
      mockGetDeliveries.mockResolvedValue({ data: [], pagination: {} })
      mockEnd.mockResolvedValueOnce(endedStop)

      // Prime queries
      await store.dispatch(dispatchStopApi.endpoints.getDispatchStops.initiate())
      await store.dispatch(deliveriesApi.endpoints.getDeliveries.initiate({}))
      dispatchedActions.length = 0

      const result = (await store.dispatch(
        dispatchStopApi.endpoints.endDispatchStop.initiate({ id: 'stop-123' })
      )) as { data?: DispatchStopAdminDto; error?: unknown }

      expect(mockPrepareAdminSdk).toHaveBeenCalledWith('admin-token-end')
      expect(mockEnd).toHaveBeenCalledWith('stop-123')
      expect(result.data).toEqual(endedStop)

      // Verify tag invalidation triggers refetches for both getDispatchStops and getDeliveries
      const refetchedEndpoints = dispatchedActions
        .filter((a) => a.type === 'api/executeQuery/pending')
        .map((a) => a.meta?.arg?.endpointName)

      expect(refetchedEndpoints).toContain('getDispatchStops')
      expect(refetchedEndpoints).toContain('getDeliveries')
    })
  })
})
