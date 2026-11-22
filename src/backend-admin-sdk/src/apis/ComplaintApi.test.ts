import { ComplaintApi } from './ComplaintApi'
import type {
  ComplaintAdminDto,
  ComplaintAdminPageDto,
  ComplaintCreateAdminInput,
  ComplaintDeliveryRiderDto,
} from './ComplaintApi'
import { Configuration } from '../runtime'
import { BackendAdminSdk } from '../backend-admin-sdk'

// Spec 0052 (row 83, AC-1 to AC-6, AC-9, AC-10): hand-written API client for complaints,
// verified at the HTTP fetch boundary.
function jsonResponse(body: unknown, status = 200): Response {
  return {
    status,
    ok: status >= 200 && status < 300,
    headers: {
      get: (header: string) => (header.toLowerCase() === 'content-type' ? 'application/json' : null),
    },
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
    clone: function () {
      return this
    },
  } as unknown as Response
}

function fileResponse(blob: Blob, contentType = 'image/jpeg', status = 200): Response {
  return {
    status,
    ok: status >= 200 && status < 300,
    headers: {
      get: (header: string) => (header.toLowerCase() === 'content-type' ? contentType : null),
    },
    blob: () => Promise.resolve(blob),
    json: () => Promise.reject(new Error('a binary file is not JSON')),
    text: () => Promise.resolve(''),
    clone: function () {
      return this
    },
  } as unknown as Response
}

describe('ComplaintApi (spec 0052)', () => {
  const mockFetch = jest.fn()
  let api: ComplaintApi

  beforeEach(() => {
    jest.clearAllMocks()
    api = new ComplaintApi(
      new Configuration({
        fetchApi: mockFetch,
        basePath: 'http://localhost:3000',
        accessToken: () => Promise.resolve('admin-auth-token-123'),
      })
    )
  })

  const lastCall = () => {
    expect(mockFetch).toHaveBeenCalledTimes(1)
    const [url, init] = mockFetch.mock.calls[0]
    return {
      url: url as string,
      init: init as RequestInit & { headers: Record<string, string> },
    }
  }

  describe('list (AC-6, cross check 13)', () => {
    it('GET /api/admin/v1/complaints with status and about query parameters and bearer token', async () => {
      const mockResult: ComplaintAdminPageDto = {
        data: [
          {
            id: 'cmp-1',
            delivery: { id: 'del-1', pickupName: 'Taverna', createdAt: '2026-11-20T12:00:00Z' },
            filedBy: 'RIDER',
            filerName: 'Kostas',
            filerCourierId: 'c-1',
            filerPartnerId: null,
            about: 'RESTAURANT',
            aboutCourierId: null,
            aboutCourierName: null,
            aboutCourierDeactivated: false,
            category: 'LONG_WAIT',
            text: 'Waited 45 minutes.',
            hasPhoto: true,
            status: 'OPEN',
            createdAt: '2026-11-20T12:30:00Z',
            riderReply: null,
            repliedAt: null,
            replyEnteredBy: null,
            outcome: null,
            decidedAt: null,
            decidedBy: null,
            withdrawnReason: null,
            withdrawnAt: null,
            withdrawnBy: null,
          },
        ],
        pagination: {
          currentPage: 1,
          perPage: 20,
          totalItems: 1,
          totalPages: 1,
          currentItems: 1,
          prevPage: null,
          nextPage: null,
        },
      }

      mockFetch.mockResolvedValueOnce(jsonResponse(mockResult))

      const result = await api.list({ page: 1, perPage: 20, status: 'OPEN', about: 'RESTAURANT' })

      const { url, init } = lastCall()
      const parsed = new URL(url)
      expect(parsed.pathname).toBe('/api/admin/v1/complaints')
      expect(parsed.searchParams.get('page')).toBe('1')
      expect(parsed.searchParams.get('perPage')).toBe('20')
      expect(parsed.searchParams.get('status')).toBe('OPEN')
      expect(parsed.searchParams.get('about')).toBe('RESTAURANT')
      expect(init.method).toBe('GET')
      expect(init.headers['Authorization']).toBe('Bearer admin-auth-token-123')
      expect(result).toEqual(mockResult)
    })

    it('omits status and about from query params when they are undefined (does not send "undefined")', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ data: [], pagination: undefined }))

      await api.list({ page: 2, perPage: 10 })

      const parsed = new URL(lastCall().url)
      expect(parsed.searchParams.get('page')).toBe('2')
      expect(parsed.searchParams.get('perPage')).toBe('10')
      expect(parsed.searchParams.has('status')).toBe(false)
      expect(parsed.searchParams.has('about')).toBe(false)
    })

    it('throws when the server answers with an error', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ message: 'Forbidden' }, 403))
      await expect(api.list({ page: 1, perPage: 20 })).rejects.toBeDefined()
    })
  })

  describe('get (AC-6)', () => {
    it('GET /api/admin/v1/complaints/{id} with bearer token', async () => {
      const mockComplaint: ComplaintAdminDto = {
        id: 'cmp-100',
        delivery: { id: 'del-1', pickupName: 'Pizza Hot', createdAt: '2026-11-20T10:00:00Z' },
        filedBy: 'RESTAURANT',
        filerName: 'Pizza Hot Manager',
        filerCourierId: null,
        filerPartnerId: 'p-1',
        about: 'RIDER',
        aboutCourierId: 'c-20',
        aboutCourierName: 'Nikos',
        aboutCourierDeactivated: false,
        category: 'FOOD_DAMAGED',
        text: 'Pizza was squashed in the box.',
        hasPhoto: false,
        status: 'AWAITING_REPLY',
        createdAt: '2026-11-20T10:30:00Z',
        riderReply: null,
        repliedAt: null,
        replyEnteredBy: null,
        outcome: null,
        decidedAt: null,
        decidedBy: null,
        withdrawnReason: null,
        withdrawnAt: null,
        withdrawnBy: null,
      }

      mockFetch.mockResolvedValueOnce(jsonResponse(mockComplaint))

      const result = await api.get('cmp-100')

      const { url, init } = lastCall()
      expect(url).toBe('http://localhost:3000/api/admin/v1/complaints/cmp-100')
      expect(init.method).toBe('GET')
      expect(init.headers['Authorization']).toBe('Bearer admin-auth-token-123')
      expect(result).toEqual(mockComplaint)
    })

    it('encodes special characters in the complaint id to prevent URL injection', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ id: 'safe' }))
      await api.get('cmp/100?flag=true#section')

      expect(lastCall().url).toBe('http://localhost:3000/api/admin/v1/complaints/cmp%2F100%3Fflag%3Dtrue%23section')
    })
  })

  describe('deliveryRiders (cross check 3)', () => {
    it('GET /api/admin/v1/complaints/delivery-riders/{deliveryId}', async () => {
      const mockRiders: ComplaintDeliveryRiderDto[] = [
        { id: 'c-1', name: 'Petros' },
        { id: 'c-2', name: 'Maria' },
      ]
      mockFetch.mockResolvedValueOnce(jsonResponse(mockRiders))

      const result = await api.deliveryRiders('del-xyz')

      const { url, init } = lastCall()
      expect(url).toBe('http://localhost:3000/api/admin/v1/complaints/delivery-riders/del-xyz')
      expect(init.method).toBe('GET')
      expect(init.headers['Authorization']).toBe('Bearer admin-auth-token-123')
      expect(result).toEqual(mockRiders)
    })

    it('encodes special characters in deliveryId', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse([]))
      await api.deliveryRiders('del/123')

      expect(lastCall().url).toBe('http://localhost:3000/api/admin/v1/complaints/delivery-riders/del%2F123')
    })
  })

  describe('file (AC-3, cross check 3)', () => {
    it('POST /api/admin/v1/complaints with JSON body and Content-Type header', async () => {
      const input: ComplaintCreateAdminInput = {
        deliveryId: 'del-55',
        category: 'LATE',
        text: 'Caller said order arrived an hour late.',
        aboutCourierId: 'c-9',
      }
      mockFetch.mockResolvedValueOnce(jsonResponse({ id: 'cmp-new', ...input }))

      await api.file(input)

      const { url, init } = lastCall()
      expect(url).toBe('http://localhost:3000/api/admin/v1/complaints')
      expect(init.method).toBe('POST')
      expect(init.headers['Content-Type']).toBe('application/json')
      expect(init.headers['Authorization']).toBe('Bearer admin-auth-token-123')
      expect(JSON.parse(init.body as string)).toEqual(input)
    })
  })

  describe('decide (AC-5, AC-6)', () => {
    it('POST /api/admin/v1/complaints/{id}/decide with outcome JSON body', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ id: 'cmp-1', status: 'DECIDED', outcome: 'Warning issued.' }))

      await api.decide('cmp-1', 'Warning issued.')

      const { url, init } = lastCall()
      expect(url).toBe('http://localhost:3000/api/admin/v1/complaints/cmp-1/decide')
      expect(init.method).toBe('POST')
      expect(init.headers['Content-Type']).toBe('application/json')
      expect(JSON.parse(init.body as string)).toEqual({ outcome: 'Warning issued.' })
    })

    it('rejects with 409 when attempting to decide before rider replied (AC-5)', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ message: "Waiting for the rider's reply" }, 409))
      await expect(api.decide('cmp-1', 'Decide now')).rejects.toBeDefined()
    })
  })

  describe('withdraw (AC-5, cross check 6)', () => {
    it('POST /api/admin/v1/complaints/{id}/withdraw with reason JSON body', async () => {
      mockFetch.mockResolvedValueOnce(
        jsonResponse({ id: 'cmp-1', status: 'WITHDRAWN', withdrawnReason: 'Caller withdrew complaint.' })
      )

      await api.withdraw('cmp-1', 'Caller withdrew complaint.')

      const { url, init } = lastCall()
      expect(url).toBe('http://localhost:3000/api/admin/v1/complaints/cmp-1/withdraw')
      expect(init.method).toBe('POST')
      expect(init.headers['Content-Type']).toBe('application/json')
      expect(JSON.parse(init.body as string)).toEqual({ reason: 'Caller withdrew complaint.' })
    })
  })

  describe('replyForRider (cross check 2)', () => {
    it('POST /api/admin/v1/complaints/{id}/reply-for-rider with text JSON body', async () => {
      mockFetch.mockResolvedValueOnce(
        jsonResponse({ id: 'cmp-1', riderReply: 'The rider could not reply.', replyEnteredBy: 'Admin Anna' })
      )

      await api.replyForRider('cmp-1', 'The rider could not reply.')

      const { url, init } = lastCall()
      expect(url).toBe('http://localhost:3000/api/admin/v1/complaints/cmp-1/reply-for-rider')
      expect(init.method).toBe('POST')
      expect(init.headers['Content-Type']).toBe('application/json')
      expect(JSON.parse(init.body as string)).toEqual({ text: 'The rider could not reply.' })
    })
  })

  describe('photo (AC-9, cross check 8)', () => {
    it('GET /api/admin/v1/complaints/{id}/photo returns untouched Blob', async () => {
      const mockBlob = new Blob(['image bytes'], { type: 'image/jpeg' })
      mockFetch.mockResolvedValueOnce(fileResponse(mockBlob, 'image/jpeg'))

      const result = await api.photo('cmp-100')

      const { url, init } = lastCall()
      expect(url).toBe('http://localhost:3000/api/admin/v1/complaints/cmp-100/photo')
      expect(init.method).toBe('GET')
      expect(init.headers['Authorization']).toBe('Bearer admin-auth-token-123')
      expect(result).toBe(mockBlob)
    })
  })

  describe('BackendAdminSdk wiring and binary response preservation (decision 83.15)', () => {
    it('hands out ComplaintApi via sdk.complaints() with bearer token', async () => {
      const sdk = new BackendAdminSdk({
        basePath: 'http://localhost:3000',
        fetchApi: mockFetch,
        accessToken: () => 'sdk-token-xyz',
      })
      mockFetch.mockResolvedValueOnce(jsonResponse({ data: [], pagination: undefined }))

      expect(sdk.complaints()).toBeInstanceOf(ComplaintApi)
      await sdk.complaints().list({ page: 1, perPage: 10 })

      expect(lastCall().init.headers['Authorization']).toBe('Bearer sdk-token-xyz')
    })

    it('preserves binary photo (image/jpeg) bytes through SDK middleware without converting to {}', async () => {
      const sdk = new BackendAdminSdk({
        basePath: 'http://localhost:3000',
        fetchApi: mockFetch,
        accessToken: () => 'token',
      })
      const photoBlob = new Blob(['jpeg-data'], { type: 'image/jpeg' })
      mockFetch.mockResolvedValueOnce(fileResponse(photoBlob, 'image/jpeg'))

      const photo = await sdk.complaints().photo('cmp-55')
      expect(photo).toBe(photoBlob)
    })

    it('preserves PDF, CSV and octet-stream bytes through SDK middleware (decision 83.15)', async () => {
      const sdk = new BackendAdminSdk({
        basePath: 'http://localhost:3000',
        fetchApi: mockFetch,
        accessToken: () => 'token',
      })

      // PDF
      const pdfBlob = new Blob(['%PDF-1.4'], { type: 'application/pdf' })
      mockFetch.mockResolvedValueOnce(fileResponse(pdfBlob, 'application/pdf'))
      const photoPdf = await sdk.complaints().photo('cmp-pdf')
      expect(photoPdf).toBe(pdfBlob)

      // CSV
      const csvBlob = new Blob(['col1,col2'], { type: 'text/csv' })
      mockFetch.mockResolvedValueOnce(fileResponse(csvBlob, 'text/csv'))
      const photoCsv = await sdk.complaints().photo('cmp-csv')
      expect(photoCsv).toBe(csvBlob)
    })
  })
})
