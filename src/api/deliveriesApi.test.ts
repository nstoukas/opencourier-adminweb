import { configureStore } from '@reduxjs/toolkit'
import {
  deliveriesApi,
  useGetDeliveryIssuesQuery,
  useGetDeliveriesQuery,
  useSubmitDeliveryEventMutation,
  useGetDeliveryProductReportsQuery,
  useGetProductReportsQuery,
  useCreateDeliveryProductReportMutation,
  useResolveProductReportMutation,
} from './deliveriesApi'
import { prepareAdminSdk } from '.'
import { Tags } from './utils/tags'
import { authSlice } from '@/modules/auth/slices/authSlice'
import { ApiError } from '../backend-admin-sdk'
import type {
  DeliveryIssueAdminDto,
  DeliveryAdminPaginatedDto,
  DeliveryAdminDto,
  ProductReportAdminDto,
  ProductReportPageAdminDto,
} from '../backend-admin-sdk'
import { EnumDeliveryEventType } from '../shared-types'

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

describe('deliveriesApi endpoints', () => {
  let mockGetDeliveryIssues: jest.Mock
  let mockGetDeliveryEvents: jest.Mock
  let mockGetDeliveries: jest.Mock
  let mockSubmitOrderEvent: jest.Mock
  let mockGetDeliveryProductReports: jest.Mock
  let mockGetProductReports: jest.Mock
  let mockCreateDeliveryProductReport: jest.Mock
  let mockResolveProductReport: jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()
    mockGetDeliveryIssues = jest.fn()
    mockGetDeliveryEvents = jest.fn()
    mockGetDeliveries = jest.fn()
    mockSubmitOrderEvent = jest.fn()
    mockGetDeliveryProductReports = jest.fn()
    mockGetProductReports = jest.fn()
    mockCreateDeliveryProductReport = jest.fn()
    mockResolveProductReport = jest.fn()
    mockPrepareAdminSdk.mockReturnValue({
      deliveries: () => ({
        getDeliveryIssues: mockGetDeliveryIssues,
        getDeliveryEvents: mockGetDeliveryEvents,
        getDeliveries: mockGetDeliveries,
        submitOrderEvent: mockSubmitOrderEvent,
        getDeliveryProductReports: mockGetDeliveryProductReports,
        getProductReports: mockGetProductReports,
        createDeliveryProductReport: mockCreateDeliveryProductReport,
        resolveProductReport: mockResolveProductReport,
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

  describe('submitDeliveryEvent endpoint (spec 0015, AC-5)', () => {
    it('exports useSubmitDeliveryEventMutation hook function', () => {
      expect(typeof useSubmitDeliveryEventMutation).toBe('function')
    })

    it('passes cancelledBy to sdk.deliveries().submitOrderEvent when cancelling as COOP, RESTAURANT, or CUSTOMER', async () => {
      const store = setupTestStore('valid-admin-token')
      const mockDelivery= {
        id: 'del-101',
        status: 'CANCELED',
        currencyCode: 'EUR',
      } as DeliveryAdminDto
      mockSubmitOrderEvent.mockResolvedValueOnce(mockDelivery)

      const result = await store.dispatch(
        deliveriesApi.endpoints.submitDeliveryEvent.initiate({
          deliveryId: 'del-101',
          eventType: EnumDeliveryEventType.CANCELED,
          cancelledBy: 'COOP',
        })
      )

      expect(mockPrepareAdminSdk).toHaveBeenCalledWith('valid-admin-token')
      expect(mockSubmitOrderEvent).toHaveBeenCalledWith({
        id: 'del-101',
        deliverySubmitEventAdminInput: {
          deliveryId: 'del-101',
          eventType: 'CANCELED',
          cancelledBy: 'COOP',
        },
      })
      expect('data' in result ? result.data : undefined).toEqual(mockDelivery)

      // Test with RESTAURANT
      mockSubmitOrderEvent.mockResolvedValueOnce(mockDelivery)
      await store.dispatch(
        deliveriesApi.endpoints.submitDeliveryEvent.initiate({
          deliveryId: 'del-101',
          eventType: EnumDeliveryEventType.CANCELED,
          cancelledBy: 'RESTAURANT',
        })
      )
      expect(mockSubmitOrderEvent).toHaveBeenLastCalledWith({
        id: 'del-101',
        deliverySubmitEventAdminInput: {
          deliveryId: 'del-101',
          eventType: 'CANCELED',
          cancelledBy: 'RESTAURANT',
        },
      })
    })

    it('does not include cancelledBy when not provided', async () => {
      const store = setupTestStore('valid-admin-token')
      const mockDelivery= {
        id: 'del-102',
        status: 'DISPATCHED',
        currencyCode: 'EUR',
      } as DeliveryAdminDto
      mockSubmitOrderEvent.mockResolvedValueOnce(mockDelivery)

      await store.dispatch(
        deliveriesApi.endpoints.submitDeliveryEvent.initiate({
          deliveryId: 'del-102',
          eventType: EnumDeliveryEventType.ARRIVED_AT_PICKUP_LOCATION,
        })
      )

      expect(mockSubmitOrderEvent).toHaveBeenCalledWith({
        id: 'del-102',
        deliverySubmitEventAdminInput: {
          deliveryId: 'del-102',
          eventType: 'ARRIVED_AT_PICKUP_LOCATION',
        },
      })
      const payload = mockSubmitOrderEvent.mock.calls[0][0].deliverySubmitEventAdminInput
      expect(payload).not.toHaveProperty('cancelledBy')
    })
  })

  describe('getDeliveryProductReports endpoint (spec 0032, AC-6)', () => {
    it('exports useGetDeliveryProductReportsQuery hook function', () => {
      expect(typeof useGetDeliveryProductReportsQuery).toBe('function')
    })

    it('defines getDeliveryProductReports endpoint on deliveriesApi with productReports tag', () => {
      expect(deliveriesApi.endpoints.getDeliveryProductReports).toBeDefined()
      expect(typeof deliveriesApi.endpoints.getDeliveryProductReports.initiate).toBe('function')
      expect(Tags.productReports).toBe('ProductReports')
    })

    it('calls sdk.deliveries().getDeliveryProductReports with deliveryId and resolves data', async () => {
      const store = setupTestStore('valid-admin-token')
      const mockReports: ProductReportAdminDto[] = [
        {
          id: 'report-1',
          deliveryId: 'del-100',
          kind: 'WRONG_ITEM',
          source: 'COURIER',
          reporterEmail: 'rider@example.com',
          itemName: 'Pizza Margherita',
          note: null,
          resolvedAt: null,
          resolution: null,
          createdAt: new Date('2026-11-09T08:00:00Z'),
        },
      ]

      mockGetDeliveryProductReports.mockResolvedValueOnce(mockReports)

      const result = await store.dispatch(
        deliveriesApi.endpoints.getDeliveryProductReports.initiate({ deliveryId: 'del-100' })
      )

      expect(mockPrepareAdminSdk).toHaveBeenCalledWith('valid-admin-token')
      expect(mockGetDeliveryProductReports).toHaveBeenCalledTimes(1)
      expect(mockGetDeliveryProductReports).toHaveBeenCalledWith({ deliveryId: 'del-100' })
      expect(result.data).toEqual(mockReports)
      expect(result.error).toBeUndefined()
    })

    it('handles SDK rejection (e.g. 404 ApiError): sets error and leaves data undefined', async () => {
      const store = setupTestStore('valid-admin-token')
      const apiError = new ApiError('DELIVERY_NOT_FOUND' as any, 'Delivery not found', 404)
      mockGetDeliveryProductReports.mockRejectedValueOnce(apiError)

      const result = await store.dispatch(
        deliveriesApi.endpoints.getDeliveryProductReports.initiate({ deliveryId: 'non-existent' })
      )

      expect(mockGetDeliveryProductReports).toHaveBeenCalledWith({ deliveryId: 'non-existent' })
      expect(result.error).toEqual(apiError)
      expect(result.data).toBeUndefined()
    })
  })

  describe('getProductReports endpoint (spec 0032, AC-6)', () => {
    it('exports useGetProductReportsQuery hook function', () => {
      expect(typeof useGetProductReportsQuery).toBe('function')
    })

    it('defines getProductReports endpoint on deliveriesApi with productReports tag', () => {
      expect(deliveriesApi.endpoints.getProductReports).toBeDefined()
      expect(typeof deliveriesApi.endpoints.getProductReports.initiate).toBe('function')
    })

    it('forwards state, page and perPage parameters to sdk.deliveries().getProductReports', async () => {
      const store = setupTestStore('valid-admin-token')
      const mockResult: ProductReportPageAdminDto = {
        data: [],
        pagination: { total: 0, page: 1, perPage: 20 },
      }
      mockGetProductReports.mockResolvedValueOnce(mockResult)

      const params = { state: 'open' as const, page: 1, perPage: 20 }
      const result = await store.dispatch(
        deliveriesApi.endpoints.getProductReports.initiate(params)
      )

      expect(mockPrepareAdminSdk).toHaveBeenCalledWith('valid-admin-token')
      expect(mockGetProductReports).toHaveBeenCalledWith(params)
      expect(result.data).toEqual(mockResult)
    })
  })

  describe('createDeliveryProductReport endpoint (spec 0032, AC-1, AC-9)', () => {
    it('exports useCreateDeliveryProductReportMutation hook function', () => {
      expect(typeof useCreateDeliveryProductReportMutation).toBe('function')
    })

    it('defines createDeliveryProductReport endpoint on deliveriesApi', () => {
      expect(deliveriesApi.endpoints.createDeliveryProductReport).toBeDefined()
      expect(typeof deliveriesApi.endpoints.createDeliveryProductReport.initiate).toBe('function')
    })

    it('forwards payload to sdk.deliveries().createDeliveryProductReport and returns created report', async () => {
      const store = setupTestStore('valid-admin-token')
      const mockCreatedReport: ProductReportAdminDto = {
        id: 'report-new',
        deliveryId: 'del-200',
        kind: 'MISSING_ITEM',
        source: 'ADMIN',
        reporterEmail: 'admin@coop.gr',
        itemName: 'Fries',
        note: 'Customer phoned',
        resolvedAt: null,
        resolution: null,
        createdAt: new Date('2026-11-09T09:00:00Z'),
      }

      mockCreateDeliveryProductReport.mockResolvedValueOnce(mockCreatedReport)

      const payload = {
        deliveryId: 'del-200',
        kind: 'MISSING_ITEM' as const,
        itemName: 'Fries',
        note: 'Customer phoned',
      }

      const result = await store.dispatch(
        deliveriesApi.endpoints.createDeliveryProductReport.initiate(payload)
      )

      expect(mockPrepareAdminSdk).toHaveBeenCalledWith('valid-admin-token')
      expect(mockCreateDeliveryProductReport).toHaveBeenCalledWith(payload)
      expect('data' in result ? result.data : undefined).toEqual(mockCreatedReport)
    })
  })

  describe('resolveProductReport endpoint (spec 0032, AC-7)', () => {
    it('exports useResolveProductReportMutation hook function', () => {
      expect(typeof useResolveProductReportMutation).toBe('function')
    })

    it('defines resolveProductReport endpoint on deliveriesApi', () => {
      expect(deliveriesApi.endpoints.resolveProductReport).toBeDefined()
      expect(typeof deliveriesApi.endpoints.resolveProductReport.initiate).toBe('function')
    })

    it('forwards id and resolution to sdk.deliveries().resolveProductReport', async () => {
      const store = setupTestStore('valid-admin-token')
      const mockResolvedReport: ProductReportAdminDto = {
        id: 'report-300',
        deliveryId: 'del-300',
        kind: 'WRONG_ITEM',
        source: 'COURIER',
        reporterEmail: 'rider@example.com',
        itemName: 'Burger',
        note: null,
        resolvedAt: new Date('2026-11-09T10:00:00Z'),
        resolution: 'Voucher issued',
        createdAt: new Date('2026-11-09T09:30:00Z'),
      }

      mockResolveProductReport.mockResolvedValueOnce(mockResolvedReport)

      const payload = { id: 'report-300', resolution: 'Voucher issued' }
      const result = await store.dispatch(
        deliveriesApi.endpoints.resolveProductReport.initiate(payload)
      )

      expect(mockPrepareAdminSdk).toHaveBeenCalledWith('valid-admin-token')
      expect(mockResolveProductReport).toHaveBeenCalledWith(payload)
      expect('data' in result ? result.data : undefined).toEqual(mockResolvedReport)
    })
  })
})
