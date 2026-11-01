import { configureStore, type AnyAction } from '@reduxjs/toolkit'
import {
  couriersApi,
  useGetCourierQuery,
  useGetCouriersQuery,
  useCreateCourierMutation,
  useRotateCourierPasswordMutation,
} from './couriersApi'
import { deliveriesApi } from './deliveriesApi'
import { prepareAdminSdk } from '.'
import { Tags } from './utils/tags'
import { authSlice } from '@/modules/auth/slices/authSlice'
import { ApiError } from '../backend-admin-sdk'
import type { CourierAdminDto, CourierPaginatedAdminDto, CourierCreateAdminInput } from '../backend-admin-sdk'

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
      [couriersApi.reducerPath]: couriersApi.reducer,
      [authSlice.name]: authSlice.reducer,
    },
    middleware: (getDefaultMiddleware) => {
      const middleware = getDefaultMiddleware({
        serializableCheck: false,
        immutableCheck: false,
      }).concat(couriersApi.middleware)
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

  describe('createCourier endpoint (row 16, spec 0013)', () => {
    let mockCreateCourier: jest.Mock

    beforeEach(() => {
      mockCreateCourier = jest.fn()
      mockPrepareAdminSdk.mockReturnValue({
        couriers: () => ({
          createCourier: mockCreateCourier,
        }),
      })
    })

    it('exports useCreateCourierMutation hook function', () => {
      expect(typeof useCreateCourierMutation).toBe('function')
    })

    it('defines createCourier endpoint on couriersApi', () => {
      expect(couriersApi.endpoints.createCourier).toBeDefined()
      expect(typeof couriersApi.endpoints.createCourier.initiate).toBe('function')
    })

    it('calls sdk.couriers().createCourier with courierCreateAdminInput and invalidates Tags.couriers on success', async () => {
      const dispatchedActions: AnyAction[] = []
      const store = setupTestStore('admin-token-create', (action) => dispatchedActions.push(action))

      const mockCourier: CourierAdminDto = {
        id: 'new-c-1',
        firstName: 'Nikos',
        lastName: 'Pappas',
        phoneNumber: '+306912345678',
        status: 'OFFLINE',
        deliverySetting: 'MANUAL',
        createdAt: new Date(),
      } as any

      mockCreateCourier.mockResolvedValueOnce(mockCourier)

      const input: CourierCreateAdminInput = {
        firstName: 'Nikos',
        lastName: 'Pappas',
        phoneNumber: '+306912345678',
        email: 'nikos@example.com',
        password: 'password123',
      }

      mockPrepareAdminSdk.mockReturnValue({
        couriers: () => ({
          createCourier: mockCreateCourier,
          getCourierById: jest.fn().mockResolvedValue({ id: 'c-existing' }),
        }),
      })

      // Populate courier query in cache
      await store.dispatch(couriersApi.endpoints.getCourier.initiate({ id: 'c-existing' }))
      dispatchedActions.length = 0

      const mutationResult = (await store.dispatch(couriersApi.endpoints.createCourier.initiate(input))) as {
        data?: CourierAdminDto
        error?: unknown
      }

      expect(mockPrepareAdminSdk).toHaveBeenCalledWith('admin-token-create')
      expect(mockCreateCourier).toHaveBeenCalledTimes(1)
      expect(mockCreateCourier).toHaveBeenCalledWith({ courierCreateAdminInput: input })
      expect(mutationResult.data).toEqual(mockCourier)

      // Invalidates Tags.couriers, triggering refetch of getCourier
      const refetchedEndpoints = dispatchedActions
        .filter((a) => a.type === 'api/executeQuery/pending')
        .map((a) => a.meta?.arg?.endpointName)

      expect(refetchedEndpoints).toContain('getCourier')
    })

    it('handles SDK rejection and returns backend error', async () => {
      const store = setupTestStore('admin-token-create')
      const apiError = new ApiError('PHONE_CLASH' as any, 'That phone is already used by another rider.', 409)
      mockCreateCourier.mockRejectedValueOnce(apiError)

      const mutationResult = (await store.dispatch(
        couriersApi.endpoints.createCourier.initiate({
          firstName: 'Nikos',
          lastName: 'Pappas',
          phoneNumber: '+306912345678',
          email: 'nikos@example.com',
          password: 'password123',
        })
      )) as { data?: CourierAdminDto; error?: unknown }

      expect(mutationResult.error).toBeDefined()
      expect(mutationResult.data).toBeUndefined()
    })
  })

  describe('rotateCourierPassword endpoint (row 16, spec 0013)', () => {
    let mockRotateCourierPassword: jest.Mock

    beforeEach(() => {
      mockRotateCourierPassword = jest.fn()
      mockPrepareAdminSdk.mockReturnValue({
        couriers: () => ({
          rotateCourierPassword: mockRotateCourierPassword,
        }),
      })
    })

    it('exports useRotateCourierPasswordMutation hook function', () => {
      expect(typeof useRotateCourierPasswordMutation).toBe('function')
    })

    it('defines rotateCourierPassword endpoint on couriersApi', () => {
      expect(couriersApi.endpoints.rotateCourierPassword).toBeDefined()
      expect(typeof couriersApi.endpoints.rotateCourierPassword.initiate).toBe('function')
    })

    it('calls sdk.couriers().rotateCourierPassword with { id, password } and invalidates Tags.couriers and Tags.deliveries', async () => {
      const dispatchedActions: AnyAction[] = []
      const store = setupTestStore('admin-token-rotate', (action) => dispatchedActions.push(action))

      const mockFetchCourier = jest.fn().mockResolvedValue({ id: 'courier-target-1' })
      const mockGetDeliveries = jest.fn().mockResolvedValue({ data: [], pagination: {} })
      mockPrepareAdminSdk.mockReturnValue({
        couriers: () => ({
          rotateCourierPassword: mockRotateCourierPassword,
          getCourierById: mockFetchCourier,
        }),
        deliveries: () => ({
          getDeliveries: mockGetDeliveries,
        }),
      })

      mockRotateCourierPassword.mockResolvedValueOnce(undefined)

      // Populate courier query (provides Tags.couriers) and deliveries query (provides Tags.deliveries)
      await store.dispatch(couriersApi.endpoints.getCourier.initiate({ id: 'courier-target-1' }))
      await store.dispatch(deliveriesApi.endpoints.getDeliveries.initiate({}))
      dispatchedActions.length = 0

      const mutationResult = (await store.dispatch(
        couriersApi.endpoints.rotateCourierPassword.initiate({
          id: 'courier-target-1',
          password: 'newPassword123!',
        })
      )) as { data?: void; error?: unknown }

      expect(mockPrepareAdminSdk).toHaveBeenCalledWith('admin-token-rotate')
      expect(mockRotateCourierPassword).toHaveBeenCalledTimes(1)
      expect(mockRotateCourierPassword).toHaveBeenCalledWith({
        id: 'courier-target-1',
        password: 'newPassword123!',
      })
      expect(mutationResult.data).toBeUndefined()
      expect(mutationResult.error).toBeUndefined()

      // Invalidates both Tags.couriers and Tags.deliveries, triggering refetches for both queries
      const refetchedEndpoints = dispatchedActions
        .filter((a) => a.type === 'api/executeQuery/pending')
        .map((a) => a.meta?.arg?.endpointName)

      expect(refetchedEndpoints).toContain('getCourier')
      expect(refetchedEndpoints).toContain('getDeliveries')
    })

    it('handles SDK rejection: sets error and leaves data undefined', async () => {
      const store = setupTestStore('admin-token-rotate')
      const apiError = new ApiError('COURIER_NOT_FOUND' as any, 'This rider has no login.', 404)
      mockRotateCourierPassword.mockRejectedValueOnce(apiError)

      const mutationResult = (await store.dispatch(
        couriersApi.endpoints.rotateCourierPassword.initiate({
          id: 'courier-non-existent',
          password: 'newPassword123!',
        })
      )) as { data?: void; error?: unknown }

      expect(mockRotateCourierPassword).toHaveBeenCalledWith({
        id: 'courier-non-existent',
        password: 'newPassword123!',
      })
      expect(mutationResult.error).toBeDefined()
      expect(mutationResult.data).toBeUndefined()
    })
  })
})
