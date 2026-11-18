import { PartnerChargeApi } from './PartnerChargeApi'
import { Configuration } from '../runtime'
import { BackendAdminSdk } from '../backend-admin-sdk'
import { ApiError } from '../errors'
import { alreadyBilledIds } from '@/api/partnerChargeApi'
import type {
  PartnerChargeMonthDto,
  PartnerChargePartnerMonthDto,
  PartnerBillDto,
  PartnerBillStatementDto,
  PartnerBillCreateInput,
} from './PartnerChargeApi'

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

describe('PartnerChargeApi (spec 0036, AC-1 to AC-9)', () => {
  const mockFetch = jest.fn()
  let api: PartnerChargeApi
  let sdk: BackendAdminSdk

  beforeEach(() => {
    jest.clearAllMocks()
    const config = new Configuration({
      fetchApi: mockFetch,
      basePath: 'http://localhost:3000',
      accessToken: () => Promise.resolve('test-admin-token'),
    })
    api = new PartnerChargeApi(config)
    sdk = new BackendAdminSdk(config)
  })

  it('registered on BackendAdminSdk via sdk.partnerCharges()', () => {
    expect(sdk.partnerCharges()).toBeInstanceOf(PartnerChargeApi)
  })

  describe('month', () => {
    it('GETs /api/admin/v1/partner-charges/months/<month> without query when partnerId is omitted', async () => {
      const mockResult: PartnerChargeMonthDto = {
        month: '2026-11',
        restaurants: [],
        charges: [],
        earlierUnbilled: [],
      }
      mockFetch.mockResolvedValueOnce(createMockResponse(mockResult))

      const result = await api.month('2026-11')

      expect(mockFetch).toHaveBeenCalledTimes(1)
      const [url, requestInit] = mockFetch.mock.calls[0]
      expect(url).toBe('http://localhost:3000/api/admin/v1/partner-charges/months/2026-11')
      expect(requestInit.method).toBe('GET')
      expect(requestInit.headers['Authorization']).toBe('Bearer test-admin-token')
      expect(result).toEqual(mockResult)
    })

    it('GETs /api/admin/v1/partner-charges/months/<month>?partnerId=<id> when partnerId is passed', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({ month: '2026-11', restaurants: [], charges: [], earlierUnbilled: [] }))

      await api.month('2026-11', 'partner-123')

      expect(mockFetch).toHaveBeenCalledTimes(1)
      const [url] = mockFetch.mock.calls[0]
      expect(url).toBe('http://localhost:3000/api/admin/v1/partner-charges/months/2026-11?partnerId=partner-123')
    })
  })

  describe('partnerMonth', () => {
    it('GETs /api/admin/v1/partner-charges/months/<month>/partners/<partnerId>', async () => {
      const mockResult: PartnerChargePartnerMonthDto = {
        partner: { id: 'p-1', name: 'Nosh' },
        month: '2026-11',
        charges: [],
        bills: [],
        totals: [],
      }
      mockFetch.mockResolvedValueOnce(createMockResponse(mockResult))

      const result = await api.partnerMonth('2026-11', 'p-1')

      expect(mockFetch).toHaveBeenCalledTimes(1)
      const [url, requestInit] = mockFetch.mock.calls[0]
      expect(url).toBe('http://localhost:3000/api/admin/v1/partner-charges/months/2026-11/partners/p-1')
      expect(requestInit.method).toBe('GET')
      expect(result).toEqual(mockResult)
    })
  })

  describe('createBill', () => {
    it('POSTs /api/admin/v1/partner-bills with body', async () => {
      const input: PartnerBillCreateInput = {
        partnerId: 'p-1',
        month: '2026-11',
        chargeIds: ['c-1', 'c-2'],
        reference: 'INV-42',
      }
      const mockResult: PartnerBillDto = {
        id: 'bill-1',
        month: '2026-11',
        reference: 'INV-42',
        createdAt: '2026-11-18T10:00:00Z',
        billedByLabel: 'admin@coop.gr',
        lineCount: 2,
        totals: [{ currencyCode: 'EUR', amount: 1500 }],
        undoneAt: null,
        undoneByLabel: null,
        undoReason: null,
        chargeIds: ['c-1', 'c-2'],
      }
      mockFetch.mockResolvedValueOnce(createMockResponse(mockResult))

      const result = await api.createBill(input)

      expect(mockFetch).toHaveBeenCalledTimes(1)
      const [url, requestInit] = mockFetch.mock.calls[0]
      expect(url).toBe('http://localhost:3000/api/admin/v1/partner-bills')
      expect(requestInit.method).toBe('POST')
      expect(requestInit.headers['Content-Type']).toBe('application/json')
      expect(requestInit.body).toBe(JSON.stringify(input))
      expect(result).toEqual(mockResult)
    })
  })

  describe('undoBill', () => {
    it('POSTs /api/admin/v1/partner-bills/<id>/undo with reason', async () => {
      const mockResult: PartnerBillDto = {
        id: 'bill-1',
        month: '2026-11',
        reference: 'INV-42',
        createdAt: '2026-11-18T10:00:00Z',
        billedByLabel: 'admin@coop.gr',
        lineCount: 2,
        totals: [{ currencyCode: 'EUR', amount: 1500 }],
        undoneAt: '2026-11-18T11:00:00Z',
        undoneByLabel: 'admin@coop.gr',
        undoReason: 'Wrong lines invoiced',
        chargeIds: ['c-1', 'c-2'],
      }
      mockFetch.mockResolvedValueOnce(createMockResponse(mockResult))

      const result = await api.undoBill('bill-1', 'Wrong lines invoiced')

      expect(mockFetch).toHaveBeenCalledTimes(1)
      const [url, requestInit] = mockFetch.mock.calls[0]
      expect(url).toBe('http://localhost:3000/api/admin/v1/partner-bills/bill-1/undo')
      expect(requestInit.method).toBe('POST')
      expect(requestInit.body).toBe(JSON.stringify({ reason: 'Wrong lines invoiced' }))
      expect(result).toEqual(mockResult)
    })
  })

  describe('statement', () => {
    it('GETs /api/admin/v1/partner-bills/<id>/statement', async () => {
      const mockResult: PartnerBillStatementDto = {
        partner: { name: 'Nosh', pickupAddress: 'Iasonos 42, Volos' },
        month: '2026-11',
        bill: {
          id: 'bill-1',
          month: '2026-11',
          reference: 'INV-42',
          createdAt: '2026-11-18T10:00:00Z',
          billedByLabel: 'admin@coop.gr',
          lineCount: 1,
          totals: [{ currencyCode: 'EUR', amount: 500 }],
          undoneAt: null,
          undoneByLabel: null,
          undoReason: null,
          chargeIds: ['c-1'],
        },
        lines: [],
        totals: [{ currencyCode: 'EUR', amount: 500 }],
      }
      mockFetch.mockResolvedValueOnce(createMockResponse(mockResult))

      const result = await api.statement('bill-1')

      expect(mockFetch).toHaveBeenCalledTimes(1)
      const [url, requestInit] = mockFetch.mock.calls[0]
      expect(url).toBe('http://localhost:3000/api/admin/v1/partner-bills/bill-1/statement')
      expect(requestInit.method).toBe('GET')
      expect(result).toEqual(mockResult)
    })
  })

  describe('SDK error conversion (spec 0036, AC-6)', () => {
    it('converts 409 with alreadyBilled to ApiError keeping alreadyBilled array', () => {
      const backendError = {
        code: 'PARTNER_CHARGES_ALREADY_BILLED',
        message: 'Some charges are already billed',
        statusCode: 409,
        alreadyBilled: ['c1', 'c2'],
      }

      // Access private convertApiError
      const converted = (sdk as any).convertApiError(backendError)

      expect(converted).toBeInstanceOf(ApiError)
      expect(converted.code).toBe('PARTNER_CHARGES_ALREADY_BILLED')
      expect(converted.statusCode).toBe(409)
      expect(converted.alreadyBilled).toEqual(['c1', 'c2'])
    })

    it('converts other errors without alreadyBilled', () => {
      const badRequest = {
        code: 'BAD_REQUEST',
        message: 'Invalid parameter',
        statusCode: 400,
      }
      const converted400 = (sdk as any).convertApiError(badRequest)
      expect(converted400).toBeInstanceOf(ApiError)
      expect(converted400.statusCode).toBe(400)
      expect(converted400.alreadyBilled).toBeUndefined()

      const error409WithoutArray = {
        code: 'CONFLICT',
        message: 'Conflict occurred',
        statusCode: 409,
        alreadyBilled: 'not-an-array',
      }
      const converted409 = (sdk as any).convertApiError(error409WithoutArray)
      expect(converted409.alreadyBilled).toBeUndefined()
    })
  })

  describe('alreadyBilledIds helper in partnerChargeApi (AC-6)', () => {
    it('extracts string IDs from a 409 error with alreadyBilled array', () => {
      const err = {
        statusCode: 409,
        alreadyBilled: ['c1', 'c2', 123], // filters non-strings
      }
      expect(alreadyBilledIds(err)).toEqual(['c1', 'c2'])
    })

    it('returns empty array [] for a 409 error without alreadyBilled array', () => {
      const err = { statusCode: 409 }
      expect(alreadyBilledIds(err)).toEqual([])
    })

    it('returns null for non-409 errors', () => {
      expect(alreadyBilledIds({ statusCode: 400 })).toBeNull()
      expect(alreadyBilledIds({ statusCode: 500 })).toBeNull()
      expect(alreadyBilledIds(null)).toBeNull()
      expect(alreadyBilledIds(undefined)).toBeNull()
    })
  })
})
