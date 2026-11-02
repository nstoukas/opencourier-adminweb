import { CourierApi } from './CourierApi'
import { Configuration } from '../runtime'

function createMockResponse(body: any, status = 200): Response {
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

describe('CourierApi.getManyCouriers and getManyCouriersRaw (row 97: status filter and search query parameters)', () => {
  const mockFetch = jest.fn()
  let api: CourierApi

  beforeEach(() => {
    jest.clearAllMocks()
    const config = new Configuration({
      fetchApi: mockFetch,
      basePath: 'http://localhost:3000',
      accessToken: () => Promise.resolve('test-token'),
    })
    api = new CourierApi(config)
  })

  it('puts status and search in the query string when given', async () => {
    mockFetch.mockResolvedValueOnce(
      createMockResponse({
        data: [],
        pagination: { totalItems: 0, page: 1, perPage: 10, totalPages: 0 },
      })
    )

    await api.getManyCouriersRaw({
      page: 1,
      perPage: 10,
      status: 'working',
      search: 'Pappas',
    })

    expect(mockFetch).toHaveBeenCalledTimes(1)
    const firstCall = mockFetch.mock.calls[0]
    expect(firstCall).toBeDefined()
    const [calledUrl, calledInit] = firstCall as [string, RequestInit]
    const url = new URL(calledUrl)

    expect(url.pathname).toBe('/api/admin/v1/courier')
    expect(url.searchParams.get('page')).toBe('1')
    expect(url.searchParams.get('perPage')).toBe('10')
    expect(url.searchParams.get('status')).toBe('working')
    expect(url.searchParams.get('search')).toBe('Pappas')
    expect(calledInit.method).toBe('GET')
    expect((calledInit.headers as Record<string, string>)['Authorization']).toBe('Bearer test-token')
  })

  it.each(['all', 'working', 'offline'] as const)(
    'puts status="%s" in the query string when given',
    async (status) => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          data: [],
          pagination: { totalItems: 0, page: 1, perPage: 10, totalPages: 0 },
        })
      )

      await api.getManyCouriersRaw({ status })

      expect(mockFetch).toHaveBeenCalledTimes(1)
      const firstCall = mockFetch.mock.calls[0]
      expect(firstCall).toBeDefined()
      const [calledUrl] = firstCall as [string, RequestInit]
      const url = new URL(calledUrl)
      expect(url.searchParams.get('status')).toBe(status)
    }
  )

  it('URL-encodes search query parameter with special characters or spaces', async () => {
    mockFetch.mockResolvedValueOnce(
      createMockResponse({
        data: [],
        pagination: { totalItems: 0, page: 1, perPage: 10, totalPages: 0 },
      })
    )

    await api.getManyCouriersRaw({
      search: 'Nikos Pappas & Co #1',
    })

    expect(mockFetch).toHaveBeenCalledTimes(1)
    const firstCall = mockFetch.mock.calls[0]
    expect(firstCall).toBeDefined()
    const [calledUrl] = firstCall as [string, RequestInit]
    const url = new URL(calledUrl)
    expect(url.searchParams.get('search')).toBe('Nikos Pappas & Co #1')
    expect(calledUrl).toContain('search=Nikos%20Pappas%20%26%20Co%20%231')
  })

  it('leaves status and search out of the query string when undefined', async () => {
    mockFetch.mockResolvedValueOnce(
      createMockResponse({
        data: [],
        pagination: { totalItems: 0, page: 1, perPage: 10, totalPages: 0 },
      })
    )

    await api.getManyCouriersRaw({
      page: 2,
      perPage: 20,
    })

    expect(mockFetch).toHaveBeenCalledTimes(1)
    const firstCall = mockFetch.mock.calls[0]
    expect(firstCall).toBeDefined()
    const [calledUrl] = firstCall as [string, RequestInit]
    const url = new URL(calledUrl)

    expect(url.searchParams.has('status')).toBe(false)
    expect(url.searchParams.has('search')).toBe(false)
    expect(url.searchParams.get('page')).toBe('2')
    expect(url.searchParams.get('perPage')).toBe('20')
  })

  it('leaves query string empty when getManyCouriers is called with no arguments', async () => {
    mockFetch.mockResolvedValueOnce(
      createMockResponse({
        data: [],
        pagination: { totalItems: 0, page: 1, perPage: 10, totalPages: 0 },
      })
    )

    const result = await api.getManyCouriers()

    expect(mockFetch).toHaveBeenCalledTimes(1)
    const firstCall = mockFetch.mock.calls[0]
    expect(firstCall).toBeDefined()
    const [calledUrl] = firstCall as [string, RequestInit]
    expect(calledUrl).toBe('http://localhost:3000/api/admin/v1/courier')
    expect(result.data).toEqual([])
  })

  describe('CourierApi.createCourier (row 16, spec 0013)', () => {
    it('posts the body to /api/admin/v1/courier and parses response', async () => {
      const mockCreated = {
        id: 'new-courier-123',
        firstName: 'Dimitris',
        lastName: 'K.',
        phoneNumber: '+306912345678',
        status: 'OFFLINE',
        deliverySetting: 'MANUAL',
        createdAt: '2026-11-01T10:00:00.000Z',
      }
      mockFetch.mockResolvedValueOnce(createMockResponse(mockCreated, 201))

      const input = {
        firstName: 'Dimitris',
        lastName: 'K.',
        phoneNumber: '+306912345678',
        email: 'dimitris@volos.coop',
        password: 'securePassword123',
      }

      const result = await api.createCourier({ courierCreateAdminInput: input })

      expect(mockFetch).toHaveBeenCalledTimes(1)
      const firstCall = mockFetch.mock.calls[0]
      expect(firstCall).toBeDefined()
      const [calledUrl, calledInit] = firstCall as [string, RequestInit]
      const url = new URL(calledUrl)

      expect(url.pathname).toBe('/api/admin/v1/courier')
      expect(calledInit.method).toBe('POST')
      expect((calledInit.headers as Record<string, string>)['Content-Type']).toBe('application/json')
      expect((calledInit.headers as Record<string, string>)['Authorization']).toBe('Bearer test-token')
      expect(calledInit.body).toEqual(JSON.stringify(input))
      expect(result.id).toBe('new-courier-123')
      expect(result.firstName).toBe('Dimitris')
    })
  })

  describe('CourierApi.rotateCourierPassword (row 16, spec 0013)', () => {
    it('posts { password } to /api/admin/v1/courier/<id>/rotate-password with the id URL encoded', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse(null, 204))

      await api.rotateCourierPassword({
        id: 'courier/with spaces&special#',
        password: 'newRotatedPassword!',
      })

      expect(mockFetch).toHaveBeenCalledTimes(1)
      const firstCall = mockFetch.mock.calls[0]
      expect(firstCall).toBeDefined()
      const [calledUrl, calledInit] = firstCall as [string, RequestInit]

      // Verify path and URL encoding of the id
      expect(calledUrl).toBe(
        'http://localhost:3000/api/admin/v1/courier/courier%2Fwith%20spaces%26special%23/rotate-password'
      )
      expect(calledInit.method).toBe('POST')
      expect((calledInit.headers as Record<string, string>)['Content-Type']).toBe('application/json')
      expect((calledInit.headers as Record<string, string>)['Authorization']).toBe('Bearer test-token')
      expect(calledInit.body).toEqual(JSON.stringify({ password: 'newRotatedPassword!' }))
    })
  })
})
