import { configureStore, type AnyAction } from '@reduxjs/toolkit'
import { timeWorkedApi } from './timeWorkedApi'
import { prepareAdminSdk, api as baseApi } from '.'
import { Tags } from './utils/tags'
import { authSlice } from '@/modules/auth/slices/authSlice'

jest.mock('.', () => {
  const actual = jest.requireActual('.')
  return { ...actual, prepareAdminSdk: jest.fn() }
})

const mockPrepareAdminSdk = prepareAdminSdk as jest.Mock

function setupTestStore(onAction?: (action: AnyAction) => void) {
  return configureStore({
    reducer: {
      [timeWorkedApi.reducerPath]: timeWorkedApi.reducer,
      [authSlice.name]: authSlice.reducer,
    },
    middleware: (getDefaultMiddleware) => {
      const middleware = getDefaultMiddleware({ serializableCheck: false, immutableCheck: false }).concat(
        timeWorkedApi.middleware
      )
      if (onAction) {
        return middleware.concat(() => (next) => (action: any) => {
          onAction(action)
          return next(action)
        })
      }
      return middleware
    },
    preloadedState: { auth: { accessToken: 'admin-test-token' } },
  })
}

describe('timeWorkedApi (spec 0040, AC-9, AC-14, AC-15)', () => {
  const sdk = {
    totals: jest.fn(),
    forCourier: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockPrepareAdminSdk.mockReturnValue({
      timeWorked: () => sdk,
    })
  })

  it('defines the timeWorked tag in Tags and tagTypes', () => {
    expect(Tags.timeWorked).toBe('TimeWorked')
    expect(Tags.config).toBe('Config')
    expect(Tags.tagTypes).toContain('TimeWorked')
    expect(Tags.tagTypes).toContain('Config')
  })

  it('getTimeWorkedTotals passes from, to, and by to SDK totals with stored token', async () => {
    const mockData = {
      currencyCode: 'EUR',
      rows: [
        {
          period: '2026-11-19',
          riderCount: 4,
          workSeconds: 14400,
          jobSeconds: 7200,
          paidWaitSeconds: 0,
          unpaidSeconds: 7200,
          moneyCents: 4800,
          unlinkedMoneyCents: 0,
          centsPerHour: 1200,
        },
      ],
    }
    sdk.totals.mockResolvedValue(mockData)

    const store = setupTestStore()
    const result = await store.dispatch(
      timeWorkedApi.endpoints.getTimeWorkedTotals.initiate({
        from: '2026-11-01',
        to: '2026-11-20',
        by: 'day',
      })
    )

    expect(mockPrepareAdminSdk).toHaveBeenCalledWith('admin-test-token')
    expect(sdk.totals).toHaveBeenCalledWith('2026-11-01', '2026-11-20', 'day')
    expect(result.data).toEqual(mockData)
  })

  it('getCourierTimeWorked passes courierId, from, and to to SDK forCourier with stored token', async () => {
    const mockData = {
      recordedFrom: '2026-11-01T00:00:00Z',
      currencyCode: 'EUR',
      days: [],
      shifts: [],
    }
    sdk.forCourier.mockResolvedValue(mockData)

    const store = setupTestStore()
    const result = await store.dispatch(
      timeWorkedApi.endpoints.getCourierTimeWorked.initiate({
        courierId: 'courier-123',
        from: '2026-11-14',
        to: '2026-11-20',
      })
    )

    expect(mockPrepareAdminSdk).toHaveBeenCalledWith('admin-test-token')
    expect(sdk.forCourier).toHaveBeenCalledWith('courier-123', '2026-11-14', '2026-11-20')
    expect(result.data).toEqual(mockData)
  })

  it('invalidating Tags.config triggers refetch of both getTimeWorkedTotals and getCourierTimeWorked', async () => {
    sdk.totals.mockResolvedValue({ currencyCode: 'EUR', rows: [] })
    sdk.forCourier.mockResolvedValue({ recordedFrom: null, currencyCode: 'EUR', days: [], shifts: [] })

    const actions: AnyAction[] = []
    const store = setupTestStore((action) => actions.push(action))

    // Subscribe to both queries
    void store.dispatch(
      timeWorkedApi.endpoints.getTimeWorkedTotals.initiate({ from: '2026-11-01', to: '2026-11-20', by: 'day' })
    )
    void store.dispatch(
      timeWorkedApi.endpoints.getCourierTimeWorked.initiate({
        courierId: 'courier-123',
        from: '2026-11-14',
        to: '2026-11-20',
      })
    )
    await new Promise((resolve) => setTimeout(resolve, 0))
    actions.length = 0

    // Saving instance config invalidates Tags.config
    store.dispatch(baseApi.util.invalidateTags([Tags.config]))
    await new Promise((resolve) => setTimeout(resolve, 0))

    const refetched = actions
      .filter((a) => a.type === 'api/executeQuery/pending')
      .map((a) => a.meta?.arg?.endpointName)

    expect(refetched).toContain('getTimeWorkedTotals')
    expect(refetched).toContain('getCourierTimeWorked')
  })

  it('invalidating Tags.timeWorked triggers refetch of both getTimeWorkedTotals and getCourierTimeWorked', async () => {
    sdk.totals.mockResolvedValue({ currencyCode: 'EUR', rows: [] })
    sdk.forCourier.mockResolvedValue({ recordedFrom: null, currencyCode: 'EUR', days: [], shifts: [] })

    const actions: AnyAction[] = []
    const store = setupTestStore((action) => actions.push(action))

    void store.dispatch(
      timeWorkedApi.endpoints.getTimeWorkedTotals.initiate({ from: '2026-11-01', to: '2026-11-20', by: 'week' })
    )
    void store.dispatch(
      timeWorkedApi.endpoints.getCourierTimeWorked.initiate({
        courierId: 'courier-456',
        from: '2026-11-14',
        to: '2026-11-20',
      })
    )
    await new Promise((resolve) => setTimeout(resolve, 0))
    actions.length = 0

    store.dispatch(baseApi.util.invalidateTags([Tags.timeWorked]))
    await new Promise((resolve) => setTimeout(resolve, 0))

    const refetched = actions
      .filter((a) => a.type === 'api/executeQuery/pending')
      .map((a) => a.meta?.arg?.endpointName)

    expect(refetched).toContain('getTimeWorkedTotals')
    expect(refetched).toContain('getCourierTimeWorked')
  })
})
