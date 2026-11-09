import { PartnerApi } from './PartnerApi'
import { Configuration } from '../runtime'

function createMockResponse(body: any, status = 200): Response {
  return {
    status,
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

const emptyPage = { data: [], pagination: { totalItems: 0, page: 1, perPage: 10, totalPages: 0 } }

// Row 106: the hand edited SDK sends the restaurants list search as `?search=`.
describe('PartnerApi.getPartners search query parameter (row 106)', () => {
  const mockFetch = jest.fn()
  let api: PartnerApi

  beforeEach(() => {
    jest.clearAllMocks()
    api = new PartnerApi(
      new Configuration({
        fetchApi: mockFetch,
        basePath: 'http://localhost:3000',
        accessToken: () => Promise.resolve('test-token'),
      })
    )
  })

  // The URL of the only request made.
  const calledUrl = () => {
    expect(mockFetch).toHaveBeenCalledTimes(1)
    return new URL((mockFetch.mock.calls[0] as [string, RequestInit])[0])
  }

  it('puts search in the query string beside page and perPage, Greek text intact', async () => {
    mockFetch.mockResolvedValueOnce(createMockResponse(emptyPage))

    await api.getPartners({ page: 2, perPage: 10, search: 'Νόσης Ιάσονος' })

    const url = calledUrl()
    expect(url.pathname).toBe('/api/admin/v1/partner')
    expect(url.searchParams.get('page')).toBe('2')
    expect(url.searchParams.get('perPage')).toBe('10')
    expect(url.searchParams.get('search')).toBe('Νόσης Ιάσονος')
    expect(url.searchParams.getAll('search')).toHaveLength(1)
  })

  it('encodes characters such as % and & so they reach the backend as typed', async () => {
    mockFetch.mockResolvedValueOnce(createMockResponse(emptyPage))

    await api.getPartners({ search: '50% & co' })

    expect(calledUrl().searchParams.get('search')).toBe('50% & co')
  })

  it('leaves search out of the query string when it is undefined', async () => {
    mockFetch.mockResolvedValueOnce(createMockResponse(emptyPage))

    await api.getPartners({ page: 1, perPage: 10 })

    const url = calledUrl()
    expect(url.searchParams.has('search')).toBe(false)
    expect(url.searchParams.get('page')).toBe('1')
  })
})

// Spec 0029 (AC-5, AC-9): admin SDK routes for disabling, enabling and reading availability history.
describe('PartnerApi availability routes (spec 0029, AC-5 and AC-9)', () => {
  const mockFetch = jest.fn()
  let api: PartnerApi

  const samplePartnerResponse = {
    id: 'p-1',
    name: 'Souvlaki Bar',
    phoneNumber: '+302421012345',
    createdAt: '2026-11-01T10:00:00.000Z',
    updatedAt: '2026-11-01T10:00:00.000Z',
    availability: {
      busyExtraMinutes: null,
      pausedUntil: null,
      disabledAt: '2026-11-09T12:00:00.000Z',
      disabledReason: 'Co-op decision',
      acceptingOrders: false,
      notAcceptingReason: 'The co-op has disabled this restaurant: Co-op decision',
    },
  }

  beforeEach(() => {
    jest.clearAllMocks()
    api = new PartnerApi(
      new Configuration({
        fetchApi: mockFetch,
        basePath: 'http://localhost:3000',
        accessToken: () => Promise.resolve('test-admin-token'),
      })
    )
  })

  it('disablePartner calls POST /api/admin/v1/partner/:id/disable with JSON body and admin bearer token', async () => {
    mockFetch.mockResolvedValueOnce(createMockResponse(samplePartnerResponse))

    const result = await api.disablePartner({ id: 'partner/123 special', reason: 'Health violation' })

    expect(mockFetch).toHaveBeenCalledTimes(1)
    const [calledUrl, calledInit] = mockFetch.mock.calls[0]
    expect(calledUrl).toBe('http://localhost:3000/api/admin/v1/partner/partner%2F123%20special/disable')
    expect(calledInit.method).toBe('POST')
    expect(calledInit.headers['Authorization']).toBe('Bearer test-admin-token')
    expect(calledInit.headers['Content-Type']).toBe('application/json')
    expect(JSON.parse(calledInit.body)).toEqual({ reason: 'Health violation' })
    expect(result.id).toBe('p-1')
    expect(result.availability?.disabledReason).toBe('Co-op decision')
    expect(result.availability?.disabledAt).toEqual(new Date('2026-11-09T12:00:00.000Z'))
  })

  it('enablePartner calls POST /api/admin/v1/partner/:id/enable with no body', async () => {
    const enabledResponse = {
      ...samplePartnerResponse,
      availability: {
        ...samplePartnerResponse.availability,
        disabledAt: null,
        disabledReason: null,
        acceptingOrders: true,
        notAcceptingReason: null,
      },
    }
    mockFetch.mockResolvedValueOnce(createMockResponse(enabledResponse))

    const result = await api.enablePartner({ id: 'partner-99' })

    expect(mockFetch).toHaveBeenCalledTimes(1)
    const [calledUrl, calledInit] = mockFetch.mock.calls[0]
    expect(calledUrl).toBe('http://localhost:3000/api/admin/v1/partner/partner-99/enable')
    expect(calledInit.method).toBe('POST')
    expect(calledInit.headers['Authorization']).toBe('Bearer test-admin-token')
    expect(calledInit.headers['Content-Type']).toBeUndefined()
    expect(result.availability?.acceptingOrders).toBe(true)
    expect(result.availability?.disabledAt).toBeNull()
  })

  it('getPartnerAvailabilityChanges calls GET /api/admin/v1/partner/:id/availability-changes and parses change list', async () => {
    const changesResponse = [
      {
        id: 'c-1',
        action: 'BUSY_ON',
        actorRole: 'PARTNER',
        actorEmail: 'kitchen@souvlaki.gr',
        extraMinutes: 15,
        pausedUntil: null,
        reason: null,
        createdAt: '2026-11-09T11:00:00.000Z',
      },
      {
        id: 'c-2',
        action: 'DISABLED',
        actorRole: 'ADMIN',
        actorEmail: 'admin@opencourier.org',
        extraMinutes: null,
        pausedUntil: null,
        reason: 'Staff shortage',
        createdAt: '2026-11-09T12:00:00.000Z',
      },
    ]
    mockFetch.mockResolvedValueOnce(createMockResponse(changesResponse))

    const changes = await api.getPartnerAvailabilityChanges({ id: 'p-42' })

    expect(mockFetch).toHaveBeenCalledTimes(1)
    const [calledUrl, calledInit] = mockFetch.mock.calls[0]
    expect(calledUrl).toBe('http://localhost:3000/api/admin/v1/partner/p-42/availability-changes')
    expect(calledInit.method).toBe('GET')
    expect(calledInit.headers['Authorization']).toBe('Bearer test-admin-token')
    expect(changes).toHaveLength(2)
    expect(changes[0]?.action).toBe('BUSY_ON')
    expect(changes[0]?.extraMinutes).toBe(15)
    expect(changes[0]?.createdAt).toEqual(new Date('2026-11-09T11:00:00.000Z'))
    expect(changes[1]?.action).toBe('DISABLED')
    expect(changes[1]?.reason).toBe('Staff shortage')
  })

  // Spec 0030 (AC-1, AC-6): admin SDK route for restaurant wait record.
  it('getPartnerWaitRecord calls GET /api/admin/v1/partner/:id/wait-record?days=N with encoded id and bearer token', async () => {
    const waitRecordResponse = {
      days: 30,
      orderCount: 12,
      waitSamples: 10,
      averageWaitMinutes: 4.8,
      lateShare: 0.25,
      prepSamples: 9,
      medianPrepMinutes: 18,
      usualPrepMinutes: 15,
    }
    mockFetch.mockResolvedValueOnce(createMockResponse(waitRecordResponse))

    const record = await api.getPartnerWaitRecord({ id: 'partner/volos special', days: 30 })

    expect(mockFetch).toHaveBeenCalledTimes(1)
    const [calledUrl, calledInit] = mockFetch.mock.calls[0]
    expect(calledUrl).toBe('http://localhost:3000/api/admin/v1/partner/partner%2Fvolos%20special/wait-record?days=30')
    expect(calledInit.method).toBe('GET')
    expect(calledInit.headers['Authorization']).toBe('Bearer test-admin-token')
    expect(record.days).toBe(30)
    expect(record.orderCount).toBe(12)
    expect(record.averageWaitMinutes).toBe(4.8)
    expect(record.lateShare).toBe(0.25)
    expect(record.medianPrepMinutes).toBe(18)
    expect(record.usualPrepMinutes).toBe(15)
  })
})
