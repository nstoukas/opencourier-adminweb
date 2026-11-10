import { RemovalRequestApi } from './RemovalRequestApi'
import { Configuration } from '../runtime'
import { BackendAdminSdk } from '../backend-admin-sdk'
import type {
  RemovalReasonAdminDto,
  RemovalRequestAdminDto,
  RemovalReasonCreateAdminInput,
  RemovalReasonUpdateAdminInput,
  RemovalApproveAdminResponse,
} from './RemovalRequestApi'

function createMockResponse(body: unknown, status = 200): Response {
  return {
    status,
    headers: {
      get: (header: string) => (header.toLowerCase() === 'content-type' ? 'application/json' : null),
    },
    json: async () => body,
    text: async () => JSON.stringify(body),
    clone: function () {
      return this
    },
  } as unknown as Response
}

describe('RemovalRequestApi (spec 0035, AC-2, AC-6, AC-8, decision 24.57)', () => {
  const mockFetch = jest.fn()
  let api: RemovalRequestApi

  const sampleReason: RemovalReasonAdminDto = {
    id: 'reason-123',
    label: 'Moped breakdown',
    paidToRider: true,
    chargedToRestaurant: false,
    needsNote: false,
    position: 1,
    removedAt: null,
  }

  const sampleRequest: RemovalRequestAdminDto = {
    id: 'req-456',
    courierId: 'courier-789',
    courierName: 'Nikos P.',
    label: 'Moped breakdown',
    paidToRider: true,
    chargedToRestaurant: false,
    note: 'Flat tire on the way',
    status: 'OPEN',
    createdAt: '2026-11-10T10:00:00Z',
    decidedAt: null,
    decidedBy: null,
    decisionNote: null,
    payAmount: null,
    payPolicy: null,
    afterPickup: false,
    settledAt: null,
  }

  beforeEach(() => {
    jest.clearAllMocks()
    const config = new Configuration({
      fetchApi: mockFetch,
      basePath: 'http://localhost:3000',
      accessToken: () => Promise.resolve('test-admin-bearer-token'),
    })
    api = new RemovalRequestApi(config)
  })

  it('registered on BackendAdminSdk via sdk.removalRequests()', () => {
    const sdk = new BackendAdminSdk(
      new Configuration({
        fetchApi: mockFetch,
        basePath: 'http://localhost:3000',
        accessToken: () => Promise.resolve('token'),
      })
    )
    expect(sdk.removalRequests()).toBeInstanceOf(RemovalRequestApi)
  })

  describe('approve', () => {
    it('POSTs {"pickedUp":true} to /api/admin/v1/removal-requests/<id>/approve when pickedUp is true', async () => {
      const mockResponse: RemovalApproveAdminResponse = {
        status: 'APPROVED',
        deliveryStatus: 'CANCELED',
      }
      mockFetch.mockResolvedValueOnce(createMockResponse(mockResponse, 200))

      const result = await api.approve('req-123', true)

      expect(mockFetch).toHaveBeenCalledTimes(1)
      const [url, requestInit] = mockFetch.mock.calls[0]
      expect(url).toBe('http://localhost:3000/api/admin/v1/removal-requests/req-123/approve')
      expect(requestInit.method).toBe('POST')
      expect(requestInit.headers['Authorization']).toBe('Bearer test-admin-bearer-token')
      expect(requestInit.headers['Content-Type']).toBe('application/json')
      expect(requestInit.body).toBe(JSON.stringify({ pickedUp: true }))
      expect(result).toEqual(mockResponse)
    })

    it('POSTs {"pickedUp":false} to /api/admin/v1/removal-requests/<id>/approve when pickedUp is false', async () => {
      const mockResponse: RemovalApproveAdminResponse = {
        status: 'APPROVED',
        deliveryStatus: 'ASSIGNING_COURIER',
      }
      mockFetch.mockResolvedValueOnce(createMockResponse(mockResponse, 200))

      const result = await api.approve('req-123', false)

      expect(mockFetch).toHaveBeenCalledTimes(1)
      const [url, requestInit] = mockFetch.mock.calls[0]
      expect(url).toBe('http://localhost:3000/api/admin/v1/removal-requests/req-123/approve')
      expect(requestInit.method).toBe('POST')
      expect(requestInit.headers['Authorization']).toBe('Bearer test-admin-bearer-token')
      expect(requestInit.headers['Content-Type']).toBe('application/json')
      expect(requestInit.body).toBe(JSON.stringify({ pickedUp: false }))
      expect(result).toEqual(mockResponse)
    })

    it('encodes special characters in id for approve path', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({ status: 'APPROVED', deliveryStatus: 'CANCELED' }, 200))

      await api.approve('req/123 special#id', true)

      expect(mockFetch).toHaveBeenCalledTimes(1)
      const [url] = mockFetch.mock.calls[0]
      expect(url).toBe('http://localhost:3000/api/admin/v1/removal-requests/req%2F123%20special%23id/approve')
    })
  })

  describe('decline', () => {
    it('POSTs {"note":"..."} to /api/admin/v1/removal-requests/<id>/decline when note is provided', async () => {
      const mockResponse = { status: 'DECLINED' }
      mockFetch.mockResolvedValueOnce(createMockResponse(mockResponse, 200))

      const result = await api.decline('req-123', 'Please complete the dropoff')

      expect(mockFetch).toHaveBeenCalledTimes(1)
      const [url, requestInit] = mockFetch.mock.calls[0]
      expect(url).toBe('http://localhost:3000/api/admin/v1/removal-requests/req-123/decline')
      expect(requestInit.method).toBe('POST')
      expect(requestInit.headers['Authorization']).toBe('Bearer test-admin-bearer-token')
      expect(requestInit.headers['Content-Type']).toBe('application/json')
      expect(requestInit.body).toBe(JSON.stringify({ note: 'Please complete the dropoff' }))
      expect(result).toEqual(mockResponse)
    })

    it('POSTs {} (empty object with no note key) to /api/admin/v1/removal-requests/<id>/decline when note is undefined', async () => {
      const mockResponse = { status: 'DECLINED' }
      mockFetch.mockResolvedValueOnce(createMockResponse(mockResponse, 200))

      const result = await api.decline('req-123', undefined)

      expect(mockFetch).toHaveBeenCalledTimes(1)
      const [url, requestInit] = mockFetch.mock.calls[0]
      expect(url).toBe('http://localhost:3000/api/admin/v1/removal-requests/req-123/decline')
      expect(requestInit.method).toBe('POST')
      expect(requestInit.headers['Authorization']).toBe('Bearer test-admin-bearer-token')
      expect(requestInit.headers['Content-Type']).toBe('application/json')
      expect(requestInit.body).toBe('{}')
      expect(JSON.parse(requestInit.body)).toEqual({})
      expect('note' in JSON.parse(requestInit.body)).toBe(false)
      expect(result).toEqual(mockResponse)
    })

    it('encodes special characters in id for decline path', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({ status: 'DECLINED' }, 200))

      await api.decline('req/special?id=1', undefined)

      expect(mockFetch).toHaveBeenCalledTimes(1)
      const [url] = mockFetch.mock.calls[0]
      expect(url).toBe('http://localhost:3000/api/admin/v1/removal-requests/req%2Fspecial%3Fid%3D1/decline')
    })
  })

  describe('listForDelivery', () => {
    it('GETs /api/admin/v1/deliveries/<deliveryId>/removal-requests with Bearer token and no body', async () => {
      const mockList: RemovalRequestAdminDto[] = [sampleRequest]
      mockFetch.mockResolvedValueOnce(createMockResponse(mockList, 200))

      const result = await api.listForDelivery('del-456')

      expect(mockFetch).toHaveBeenCalledTimes(1)
      const [url, requestInit] = mockFetch.mock.calls[0]
      expect(url).toBe('http://localhost:3000/api/admin/v1/deliveries/del-456/removal-requests')
      expect(requestInit.method).toBe('GET')
      expect(requestInit.headers['Authorization']).toBe('Bearer test-admin-bearer-token')
      expect(requestInit.body).toBeUndefined()
      expect(result).toEqual(mockList)
    })

    it('encodes special characters in deliveryId for listForDelivery path', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse([], 200))

      await api.listForDelivery('del/456#special')

      expect(mockFetch).toHaveBeenCalledTimes(1)
      const [url] = mockFetch.mock.calls[0]
      expect(url).toBe('http://localhost:3000/api/admin/v1/deliveries/del%2F456%23special/removal-requests')
    })
  })

  describe('listReasons', () => {
    it('GETs /api/admin/v1/removal-reasons with Bearer token and no body', async () => {
      const mockReasons: RemovalReasonAdminDto[] = [sampleReason]
      mockFetch.mockResolvedValueOnce(createMockResponse(mockReasons, 200))

      const result = await api.listReasons()

      expect(mockFetch).toHaveBeenCalledTimes(1)
      const [url, requestInit] = mockFetch.mock.calls[0]
      expect(url).toBe('http://localhost:3000/api/admin/v1/removal-reasons')
      expect(requestInit.method).toBe('GET')
      expect(requestInit.headers['Authorization']).toBe('Bearer test-admin-bearer-token')
      expect(requestInit.body).toBeUndefined()
      expect(result).toEqual(mockReasons)
    })
  })

  describe('createReason', () => {
    it('POSTs input to /api/admin/v1/removal-reasons with Content-Type application/json and Bearer token', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse(sampleReason, 201))

      const input: RemovalReasonCreateAdminInput = {
        label: 'Moped breakdown',
        paidToRider: true,
        chargedToRestaurant: false,
        needsNote: false,
      }

      const result = await api.createReason(input)

      expect(mockFetch).toHaveBeenCalledTimes(1)
      const [url, requestInit] = mockFetch.mock.calls[0]
      expect(url).toBe('http://localhost:3000/api/admin/v1/removal-reasons')
      expect(requestInit.method).toBe('POST')
      expect(requestInit.headers['Authorization']).toBe('Bearer test-admin-bearer-token')
      expect(requestInit.headers['Content-Type']).toBe('application/json')
      expect(requestInit.body).toBe(JSON.stringify(input))
      expect(result).toEqual(sampleReason)
    })
  })

  describe('updateReason', () => {
    it('PATCHes input to /api/admin/v1/removal-reasons/<id> with Content-Type application/json and Bearer token', async () => {
      const updatedReason: RemovalReasonAdminDto = { ...sampleReason, position: 2 }
      mockFetch.mockResolvedValueOnce(createMockResponse(updatedReason, 200))

      const input: RemovalReasonUpdateAdminInput = {
        position: 2,
      }

      const result = await api.updateReason('reason-123', input)

      expect(mockFetch).toHaveBeenCalledTimes(1)
      const [url, requestInit] = mockFetch.mock.calls[0]
      expect(url).toBe('http://localhost:3000/api/admin/v1/removal-reasons/reason-123')
      expect(requestInit.method).toBe('PATCH')
      expect(requestInit.headers['Authorization']).toBe('Bearer test-admin-bearer-token')
      expect(requestInit.headers['Content-Type']).toBe('application/json')
      expect(requestInit.body).toBe(JSON.stringify(input))
      expect(result).toEqual(updatedReason)
    })

    it('encodes special characters in id for updateReason path', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse(sampleReason, 200))

      await api.updateReason('reason/special#1', { position: 1 })

      expect(mockFetch).toHaveBeenCalledTimes(1)
      const [url] = mockFetch.mock.calls[0]
      expect(url).toBe('http://localhost:3000/api/admin/v1/removal-reasons/reason%2Fspecial%231')
    })
  })

  describe('removeReason', () => {
    it('DELETEs /api/admin/v1/removal-reasons/<id> with Bearer token and no body', async () => {
      const removedReason: RemovalReasonAdminDto = { ...sampleReason, removedAt: '2026-11-10T10:05:00Z' }
      mockFetch.mockResolvedValueOnce(createMockResponse(removedReason, 200))

      const result = await api.removeReason('reason-123')

      expect(mockFetch).toHaveBeenCalledTimes(1)
      const [url, requestInit] = mockFetch.mock.calls[0]
      expect(url).toBe('http://localhost:3000/api/admin/v1/removal-reasons/reason-123')
      expect(requestInit.method).toBe('DELETE')
      expect(requestInit.headers['Authorization']).toBe('Bearer test-admin-bearer-token')
      expect(requestInit.body).toBeUndefined()
      expect(result).toEqual(removedReason)
    })

    it('encodes special characters in id for removeReason path', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse(sampleReason, 200))

      await api.removeReason('reason/to-delete#99')

      expect(mockFetch).toHaveBeenCalledTimes(1)
      const [url] = mockFetch.mock.calls[0]
      expect(url).toBe('http://localhost:3000/api/admin/v1/removal-reasons/reason%2Fto-delete%2399')
    })
  })
})
