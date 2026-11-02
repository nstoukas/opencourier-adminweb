import { configureStore } from '@reduxjs/toolkit'
import {
  sosApi,
  useGetCurrentSosQuery,
  useGetClosedSosQuery,
  useGetSosIncidentQuery,
  useCloseSosMutation,
} from './sosApi'
import { prepareAdminSdk } from '.'
import { Tags } from './utils/tags'
import { authSlice } from '@/modules/auth/slices/authSlice'
import type {
  SosIncidentAdminDto,
  SosIncidentDetailAdminDto,
  SosIncidentPageAdminDto,
} from '@/backend-admin-sdk'

jest.mock('.', () => {
  const actual = jest.requireActual('.')
  return {
    ...actual,
    prepareAdminSdk: jest.fn(),
  }
})

const mockPrepareAdminSdk = prepareAdminSdk as jest.Mock

function setupTestStore(accessToken: string | null = 'test-token') {
  return configureStore({
    reducer: {
      [sosApi.reducerPath]: sosApi.reducer,
      [authSlice.name]: authSlice.reducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: false,
        immutableCheck: false,
      }).concat(sosApi.middleware),
    preloadedState: {
      auth: { accessToken },
    },
  })
}

describe('sosApi RTK Query endpoints (spec 0022, AC-8, AC-9, AC-10)', () => {
  let mockCurrent: jest.Mock
  let mockClosed: jest.Mock
  let mockFindOne: jest.Mock
  let mockClose: jest.Mock

  const sampleIncident: SosIncidentAdminDto = {
    id: 'sos-1',
    state: 'ACTIVE',
    courier: { id: 'c-1', firstName: 'Maria', lastName: 'Papadopoulou' },
    deliveryId: null,
    startedAt: '2026-11-03T10:00:00Z',
    createdAt: '2026-11-03T10:00:00Z',
    safeAt: null,
    falseAlarmAt: null,
    closedAt: null,
    closedBy: null,
    outcome: null,
    note: null,
    pointsDeletedAt: null,
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockCurrent = jest.fn()
    mockClosed = jest.fn()
    mockFindOne = jest.fn()
    mockClose = jest.fn()
    mockPrepareAdminSdk.mockReturnValue({
      sos: () => ({
        current: mockCurrent,
        closed: mockClosed,
        findOne: mockFindOne,
        close: mockClose,
      }),
    })
  })

  it('exports hook functions and endpoint definitions', () => {
    expect(typeof useGetCurrentSosQuery).toBe('function')
    expect(typeof useGetClosedSosQuery).toBe('function')
    expect(typeof useGetSosIncidentQuery).toBe('function')
    expect(typeof useCloseSosMutation).toBe('function')
    expect(Tags.sos).toBe('Sos')
    expect(Tags.tagTypes).toContain('Sos')
  })

  it('getCurrentSos calls sdk.sos().current() and attaches token', async () => {
    const store = setupTestStore('bearer-123')
    mockCurrent.mockResolvedValueOnce([sampleIncident])

    const result = await store.dispatch(sosApi.endpoints.getCurrentSos.initiate())

    expect(mockPrepareAdminSdk).toHaveBeenCalledWith('bearer-123')
    expect(mockCurrent).toHaveBeenCalledTimes(1)
    expect(result.data).toEqual([sampleIncident])
  })

  it('getClosedSos calls sdk.sos().closed(page, limit)', async () => {
    const store = setupTestStore('bearer-123')
    const pageData: SosIncidentPageAdminDto = {
      data: [{ ...sampleIncident, state: 'CLOSED', closedAt: '2026-11-03T10:10:00Z' }],
      pagination: { page: 1, limit: 10, totalItems: 1, totalPages: 1 },
    }
    mockClosed.mockResolvedValueOnce(pageData)

    const result = await store.dispatch(sosApi.endpoints.getClosedSos.initiate({ page: 1, limit: 10 }))

    expect(mockClosed).toHaveBeenCalledWith(1, 10)
    expect(result.data).toEqual(pageData)
  })

  it('getSosIncident calls sdk.sos().findOne(id)', async () => {
    const store = setupTestStore('bearer-123')
    const detailData: SosIncidentDetailAdminDto = {
      ...sampleIncident,
      points: [{ latitude: 39.36, longitude: 22.94, accuracyMetres: 4, recordedAt: '2026-11-03T10:01:00Z' }],
    }
    mockFindOne.mockResolvedValueOnce(detailData)

    const result = await store.dispatch(sosApi.endpoints.getSosIncident.initiate({ id: 'sos-1' }))

    expect(mockFindOne).toHaveBeenCalledWith('sos-1')
    expect(result.data).toEqual(detailData)
  })

  it('close mutation invalidates the Sos tag, triggering refetch of current and incident subscriptions', async () => {
    const store = setupTestStore('bearer-123')
    const initialList: SosIncidentAdminDto[] = [sampleIncident]
    const updatedList: SosIncidentAdminDto[] = []
    const initialDetail: SosIncidentDetailAdminDto = { ...sampleIncident, points: [] }
    const updatedDetail: SosIncidentDetailAdminDto = {
      ...sampleIncident,
      state: 'CLOSED',
      closedAt: '2026-11-03T10:05:00Z',
      outcome: 'RIDER_SAFE',
      points: [],
    }

    mockCurrent.mockResolvedValueOnce(initialList).mockResolvedValueOnce(updatedList)
    mockFindOne.mockResolvedValueOnce(initialDetail).mockResolvedValueOnce(updatedDetail)
    mockClose.mockResolvedValueOnce({
      ...sampleIncident,
      state: 'CLOSED',
      closedAt: '2026-11-03T10:05:00Z',
      outcome: 'RIDER_SAFE',
      note: 'All clear',
    })

    // Subscribe to both current list and incident details
    const currentSub = store.dispatch(sosApi.endpoints.getCurrentSos.initiate(undefined, { subscribe: true }))
    const detailSub = store.dispatch(sosApi.endpoints.getSosIncident.initiate({ id: 'sos-1' }, { subscribe: true }))

    await currentSub
    await detailSub

    expect(mockCurrent).toHaveBeenCalledTimes(1)
    expect(mockFindOne).toHaveBeenCalledTimes(1)

    // Execute closeSos mutation
    await store.dispatch(
      sosApi.endpoints.closeSos.initiate({ id: 'sos-1', outcome: 'RIDER_SAFE', note: 'All clear' }),
    )

    expect(mockClose).toHaveBeenCalledWith('sos-1', { outcome: 'RIDER_SAFE', note: 'All clear' })

    // Because closeSos invalidates Tags.sos, both active subscriptions refetch
    expect(mockCurrent).toHaveBeenCalledTimes(2)
    expect(mockFindOne).toHaveBeenCalledTimes(2)

    currentSub.unsubscribe()
    detailSub.unsubscribe()
  })
})
