import { configureStore } from '@reduxjs/toolkit'
import { couriersApi, useGetCourierQuery, useGetCouriersQuery } from './couriersApi'
import { prepareAdminSdk } from '.'
import { Tags } from './utils/tags'
import { authSlice } from '@/modules/auth/slices/authSlice'
import { ApiError } from '../backend-admin-sdk'
import type { CourierAdminDto, CourierPaginatedAdminDto } from '../backend-admin-sdk'

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
      [couriersApi.reducerPath]: couriersApi.reducer,
      [authSlice.name]: authSlice.reducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: false,
        immutableCheck: false,
      }).concat(couriersApi.middleware),
    preloadedState: {
      auth: { accessToken },
    },
  })
}

describe('couriersApi getCourier endpoint (spec 0012, item 8)', () => {
  let mockGetCourierById: jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()
    mockGetCourierById = jest.fn()
    mockPrepareAdminSdk.mockReturnValue({
      couriers: () => ({
        getCourierById: mockGetCourierById,
      }),
    })
  })

  it('exports useGetCourierQuery hook function', () => {
    expect(typeof useGetCourierQuery).toBe('function')
  })

  it('defines getCourier endpoint on couriersApi with Tags.couriers', () => {
    expect(couriersApi.endpoints.getCourier).toBeDefined()
    expect(typeof couriersApi.endpoints.getCourier.initiate).toBe('function')
    expect(Tags.couriers).toBe('Couriers')
  })

  it('calls sdk.couriers().getCourierById with the id and resolves data', async () => {
    const store = setupTestStore('valid-courier-admin-token')
    const mockCourier: CourierAdminDto = {
      id: 'courier-test-1',
      firstName: 'Panos',
      lastName: 'D.',
      phoneNumber: '+306912345678',
      status: 'ONLINE',
      deliverySetting: 'AUTO_ACCEPT',
      createdAt: new Date('2026-07-01T10:00:00.000Z'),
    } as any

    mockGetCourierById.mockResolvedValueOnce(mockCourier)

    const result = await store.dispatch(
      couriersApi.endpoints.getCourier.initiate({ id: 'courier-test-1' })
    )

    // Token passed to prepareAdminSdk
    expect(mockPrepareAdminSdk).toHaveBeenCalledWith('valid-courier-admin-token')

    // SDK called with exact id argument
    expect(mockGetCourierById).toHaveBeenCalledTimes(1)
    expect(mockGetCourierById).toHaveBeenCalledWith({ id: 'courier-test-1' })

    // Resolves courier data
    expect(result.data).toEqual(mockCourier)
    expect(result.error).toBeUndefined()
  })

  it('returns without calling SDK getCourierById when id is empty', async () => {
    const store = setupTestStore('valid-courier-admin-token')

    const result = await store.dispatch(
      couriersApi.endpoints.getCourier.initiate({ id: '' })
    )

    // SDK getCourierById is NOT called
    expect(mockGetCourierById).not.toHaveBeenCalled()
    expect(result.data).toBeUndefined()
  })

  it('handles SDK rejection (e.g. 404 ApiError): sets error and leaves data undefined', async () => {
    const store = setupTestStore('valid-courier-admin-token')
    const apiError = new ApiError('COURIER_NOT_FOUND' as any, 'Courier not found', 404)
    mockGetCourierById.mockRejectedValueOnce(apiError)

    const result = await store.dispatch(
      couriersApi.endpoints.getCourier.initiate({ id: 'non-existent-courier' })
    )

    expect(mockGetCourierById).toHaveBeenCalledWith({ id: 'non-existent-courier' })
    expect(result.error).toBeDefined()
    expect(result.data).toBeUndefined()
  })

  describe('getCouriers endpoint (row 97: forwards status and search)', () => {
    let mockGetManyCouriers: jest.Mock

    beforeEach(() => {
      mockGetManyCouriers = jest.fn()
      mockPrepareAdminSdk.mockReturnValue({
        couriers: () => ({
          getManyCouriers: mockGetManyCouriers,
        }),
      })
    })

    it('exports useGetCouriersQuery hook function', () => {
      expect(typeof useGetCouriersQuery).toBe('function')
    })

    it('defines getCouriers endpoint on couriersApi with Tags.couriers', () => {
      expect(couriersApi.endpoints.getCouriers).toBeDefined()
      expect(typeof couriersApi.endpoints.getCouriers.initiate).toBe('function')
      expect(Tags.couriers).toBe('Couriers')
    })

    it('forwards status, search, page and perPage parameters to sdk.couriers().getManyCouriers', async () => {
      const store = setupTestStore('valid-courier-admin-token')
      const mockResult: CourierPaginatedAdminDto = {
        data: [],
        pagination: {
          totalItems: 0,
          perPage: 10,
          totalPages: 0,
          currentItems: 0,
          currentPage: 1,
          prevPage: null,
          nextPage: null,
        },
      }
      mockGetManyCouriers.mockResolvedValueOnce(mockResult)

      const queryParams = {
        status: 'working' as const,
        search: 'Pappas',
        page: 1,
        perPage: 10,
      }

      const result = await store.dispatch(
        couriersApi.endpoints.getCouriers.initiate(queryParams)
      )

      expect(mockPrepareAdminSdk).toHaveBeenCalledWith('valid-courier-admin-token')
      expect(mockGetManyCouriers).toHaveBeenCalledTimes(1)
      expect(mockGetManyCouriers).toHaveBeenCalledWith({
        page: 1,
        perPage: 10,
        status: 'working',
        search: 'Pappas',
      })
      expect(result.data).toEqual(mockResult)
    })

    it('preserves callers that send no status or search, defaulting page 1, perPage 100, and undefined filters (Clause 4)', async () => {
      const store = setupTestStore('valid-courier-admin-token')
      const mockResult: CourierPaginatedAdminDto = {
        data: [],
        pagination: {
          totalItems: 0,
          perPage: 20,
          totalPages: 1,
          currentItems: 0,
          currentPage: 2,
          prevPage: 1,
          nextPage: null,
        },
      }
      mockGetManyCouriers.mockResolvedValueOnce(mockResult)

      // Caller sending only page and perPage
      const result = await store.dispatch(
        couriersApi.endpoints.getCouriers.initiate({ page: 2, perPage: 20 })
      )

      expect(mockGetManyCouriers).toHaveBeenCalledWith({
        page: 2,
        perPage: 20,
        status: undefined,
        search: undefined,
      })
      expect(result.data).toEqual(mockResult)

      // Caller sending empty arguments object
      mockGetManyCouriers.mockResolvedValueOnce(mockResult)
      await store.dispatch(couriersApi.endpoints.getCouriers.initiate({}))

      expect(mockGetManyCouriers).toHaveBeenLastCalledWith({
        page: 1,
        perPage: 100,
        status: undefined,
        search: undefined,
      })
    })

    it('handles SDK rejection: sets error and leaves data undefined', async () => {
      const store = setupTestStore('valid-courier-admin-token')
      const apiError = new ApiError('NETWORK_ERROR' as any, 'Failed to fetch couriers', 500)
      mockGetManyCouriers.mockRejectedValueOnce(apiError)

      const result = await store.dispatch(
        couriersApi.endpoints.getCouriers.initiate({ page: 1, perPage: 10 })
      )

      expect(mockGetManyCouriers).toHaveBeenCalledWith({
        page: 1,
        perPage: 10,
        status: undefined,
        search: undefined,
      })
      expect(result.error).toBeDefined()
      expect(result.data).toBeUndefined()
    })
  })
})
