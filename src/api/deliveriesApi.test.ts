import { configureStore } from '@reduxjs/toolkit'
import { deliveriesApi, useGetDeliveryIssuesQuery, useGetDeliveriesQuery } from './deliveriesApi'
import { prepareAdminSdk } from '.'
import { Tags } from './utils/tags'
import { authSlice } from '@/modules/auth/slices/authSlice'
import { ApiError } from '../backend-admin-sdk'
import type { DeliveryIssueAdminDto, DeliveryAdminPaginatedDto } from '../backend-admin-sdk'

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
      [deliveriesApi.reducerPath]: deliveriesApi.reducer,
      [authSlice.name]: authSlice.reducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: false,
        immutableCheck: false,
      }).concat(deliveriesApi.middleware),
    preloadedState: {
      auth: { accessToken },
    },
  })
}

describe('deliveriesApi getDeliveryIssues endpoint (decision 66.11)', () => {
  let mockGetDeliveryIssues: jest.Mock
  let mockGetDeliveryEvents: jest.Mock
  let mockGetDeliveries: jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()
    mockGetDeliveryIssues = jest.fn()
    mockGetDeliveryEvents = jest.fn()
    mockGetDeliveries = jest.fn()
    mockPrepareAdminSdk.mockReturnValue({
      deliveries: () => ({
        getDeliveryIssues: mockGetDeliveryIssues,
        getDeliveryEvents: mockGetDeliveryEvents,
        getDeliveries: mockGetDeliveries,
      }),
    })
  })

  it('exports useGetDeliveryIssuesQuery hook function', () => {
    expect(typeof useGetDeliveryIssuesQuery).toBe('function')
  })

  it('defines getDeliveryIssues endpoint on deliveriesApi', () => {
    expect(deliveriesApi.endpoints.getDeliveryIssues).toBeDefined()
    expect(typeof deliveriesApi.endpoints.getDeliveryIssues.initiate).toBe('function')
  })

  it('declares deliveryIssues tag type in Tags and associates with endpoint', () => {
    expect(Tags.deliveryIssues).toBe('DeliveryIssues')
    expect(Tags.tagTypes).toContain('DeliveryIssues')
  })

  it('calls sdk.deliveries().getDeliveryIssues with deliveryId and resolves data', async () => {
    const store = setupTestStore('valid-admin-token')
    const mockIssues: DeliveryIssueAdminDto[] = [
      {
        id: 'issue-1',
        courierId: 'courier-1',
        courierName: 'Courier One',
        reason: 'WRONG_ADDRESS',
        note: 'Apartment 4B',
        createdAt: new Date('2026-10-27T10:00:00Z'),
      },
    ]

    mockGetDeliveryIssues.mockResolvedValueOnce(mockIssues)

    const result = await store.dispatch(
      deliveriesApi.endpoints.getDeliveryIssues.initiate({ deliveryId: 'del-100' })
    )

    // Token forwarded to prepareAdminSdk
    expect(mockPrepareAdminSdk).toHaveBeenCalledWith('valid-admin-token')

    // SDK called with exactly deliveryId
    expect(mockGetDeliveryIssues).toHaveBeenCalledTimes(1)
    expect(mockGetDeliveryIssues).toHaveBeenCalledWith({ deliveryId: 'del-100' })

    // getDeliveryEvents is NOT called
    expect(mockGetDeliveryEvents).not.toHaveBeenCalled()

    // Query result resolves the SDK data and has no error
    expect(result.data).toEqual(mockIssues)
    expect(result.error).toBeUndefined()
  })

  it('handles SDK rejection (e.g. 404 ApiError): sets error and leaves data undefined, never []', async () => {
    const store = setupTestStore('valid-admin-token')
    const apiError = new ApiError('DELIVERY_NOT_FOUND' as any, 'Delivery not found', 404)
    mockGetDeliveryIssues.mockRejectedValueOnce(apiError)

    const result = await store.dispatch(
      deliveriesApi.endpoints.getDeliveryIssues.initiate({ deliveryId: 'non-existent-del' })
    )

    expect(mockGetDeliveryIssues).toHaveBeenCalledWith({ deliveryId: 'non-existent-del' })

    // Error is set on the result
    expect(result.error).toBeDefined()
    expect(result.error).toEqual(apiError)

    // Data is undefined, never an empty array []
    expect(result.data).toBeUndefined()
    expect(result.data).not.toEqual([])
  })

  describe('getDeliveries endpoint (row 96: forwards state and search)', () => {
    it('exports useGetDeliveriesQuery hook function', () => {
      expect(typeof useGetDeliveriesQuery).toBe('function')
    })

    it('defines getDeliveries endpoint on deliveriesApi with deliveries tag', () => {
      expect(deliveriesApi.endpoints.getDeliveries).toBeDefined()
      expect(typeof deliveriesApi.endpoints.getDeliveries.initiate).toBe('function')
      expect(Tags.deliveries).toBe('Deliveries')
    })

    it('forwards state, search, page and perPage parameters to sdk.deliveries().getDeliveries', async () => {
      const store = setupTestStore('valid-admin-token')
      const mockResult: DeliveryAdminPaginatedDto = {
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
      mockGetDeliveries.mockResolvedValueOnce(mockResult)

      const queryParams = {
        state: 'active' as const,
        search: 'Nikou',
        page: 1,
        perPage: 10,
      }

      const result = await store.dispatch(
        deliveriesApi.endpoints.getDeliveries.initiate(queryParams)
      )

      expect(mockPrepareAdminSdk).toHaveBeenCalledWith('valid-admin-token')
      expect(mockGetDeliveries).toHaveBeenCalledWith(queryParams)
      expect(result.data).toEqual(mockResult)
    })
  })
})
