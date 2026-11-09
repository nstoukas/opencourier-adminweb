import { DeliveriesApi } from './DeliveriesApi'
import { Configuration, RequiredError } from '../runtime'

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

describe('DeliveriesApi.getDeliveryIssues (decision 66.11)', () => {
  const mockFetch = jest.fn()
  let api: DeliveriesApi

  beforeEach(() => {
    jest.clearAllMocks()
    const config = new Configuration({
      fetchApi: mockFetch,
      basePath: 'http://localhost:3000',
      accessToken: () => Promise.resolve('test-token'),
    })
    api = new DeliveriesApi(config)
  })

  it('sends GET to /api/admin/v1/deliveries/:deliveryId/issues with URL encoded id and returns mapped DeliveryIssueAdminDto list', async () => {
    // Contract (2): sends GET to /api/admin/v1/deliveries/<id>/issues (id URL encoded)
    // and returns mapped list with createdAt as Date and null note mapped cleanly
    const rawBackendIssues = [
      {
        id: 'issue-1',
        reason: 'WRONG_ADDRESS',
        note: 'Customer not answering phone or buzzer',
        createdAt: '2026-10-27T10:14:00.000Z',
        courierId: 'courier-1',
        courierName: 'Testing Courier',
      },
      {
        id: 'issue-2',
        reason: 'NO_SIGNAL',
        note: null,
        createdAt: '2026-10-27T10:20:00.000Z',
        courierId: 'courier-2',
        courierName: 'Second Courier',
      },
    ]

    mockFetch.mockResolvedValueOnce(createMockResponse(rawBackendIssues, 200))

    const issues = await api.getDeliveryIssues({
      deliveryId: 'del/123 special',
    })

    expect(mockFetch).toHaveBeenCalledTimes(1)
    const [calledUrl, calledInit] = mockFetch.mock.calls[0]

    expect(calledUrl).toBe('http://localhost:3000/api/admin/v1/deliveries/del%2F123%20special/issues')
    expect(calledInit.method).toBe('GET')
    expect(calledInit.headers['Authorization']).toBe('Bearer test-token')

    // Result mapped through DeliveryIssueAdminDtoFromJSON
    expect(issues).toHaveLength(2)
    const [issue0, issue1] = issues
    expect(issue0).toBeDefined()
    expect(issue1).toBeDefined()

    expect(issue0!.id).toBe('issue-1')
    expect(issue0!.reason).toBe('WRONG_ADDRESS')
    expect(issue0!.note).toBe('Customer not answering phone or buzzer')
    expect(issue0!.createdAt).toBeInstanceOf(Date)
    expect(issue0!.createdAt.toISOString()).toBe('2026-10-27T10:14:00.000Z')
    expect(issue0!.courierId).toBe('courier-1')
    expect(issue0!.courierName).toBe('Testing Courier')

    expect(issue1!.id).toBe('issue-2')
    expect(issue1!.reason).toBe('NO_SIGNAL')
    expect(issue1!.note).toBeNull()
    expect(issue1!.createdAt).toBeInstanceOf(Date)
    expect(issue1!.createdAt.toISOString()).toBe('2026-10-27T10:20:00.000Z')
    expect(issue1!.courierId).toBe('courier-2')
    expect(issue1!.courierName).toBe('Second Courier')
  })

  it('throws RequiredError when deliveryId is null or undefined', async () => {
    // Contract (2): guards required parameter deliveryId
    await expect(api.getDeliveryIssues({ deliveryId: null as any })).rejects.toThrow(RequiredError)
    await expect(api.getDeliveryIssues({ deliveryId: undefined as any })).rejects.toThrow(RequiredError)
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('returns an empty array when backend answers with empty list', async () => {
    mockFetch.mockResolvedValueOnce(createMockResponse([], 200))

    const issues = await api.getDeliveryIssues({ deliveryId: 'd100' })

    expect(issues).toEqual([])
  })
})

describe('DeliveriesApi.getDeliveries and getDeliveriesRaw (row 96: state filter and search query parameters)', () => {
  const mockFetch = jest.fn()
  let api: DeliveriesApi

  beforeEach(() => {
    jest.clearAllMocks()
    const config = new Configuration({
      fetchApi: mockFetch,
      basePath: 'http://localhost:3000',
      accessToken: () => Promise.resolve('test-token'),
    })
    api = new DeliveriesApi(config)
  })

  it('puts state and search in the query string when given', async () => {
    mockFetch.mockResolvedValueOnce(
      createMockResponse({
        data: [],
        pagination: { totalItems: 0, page: 1, perPage: 10, totalPages: 0 },
      })
    )

    await api.getDeliveriesRaw({
      page: 1,
      perPage: 10,
      state: 'active',
      search: 'ORD-123',
    })

    expect(mockFetch).toHaveBeenCalledTimes(1)
    const [calledUrl, calledInit] = mockFetch.mock.calls[0]
    const url = new URL(calledUrl)

    expect(url.pathname).toBe('/api/admin/v1/deliveries')
    expect(url.searchParams.get('page')).toBe('1')
    expect(url.searchParams.get('perPage')).toBe('10')
    expect(url.searchParams.get('state')).toBe('active')
    expect(url.searchParams.get('search')).toBe('ORD-123')
    expect(calledInit.method).toBe('GET')
    expect(calledInit.headers['Authorization']).toBe('Bearer test-token')
  })

  it.each(['all', 'active', 'dropped_off', 'canceled'] as const)(
    'puts state="%s" in the query string when given',
    async (state) => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          data: [],
          pagination: { totalItems: 0, page: 1, perPage: 10, totalPages: 0 },
        })
      )

      await api.getDeliveriesRaw({ state })

      expect(mockFetch).toHaveBeenCalledTimes(1)
      const [calledUrl] = mockFetch.mock.calls[0]
      const url = new URL(calledUrl)
      expect(url.searchParams.get('state')).toBe(state)
    }
  )

  it('URL-encodes search query parameter with special characters or spaces', async () => {
    mockFetch.mockResolvedValueOnce(
      createMockResponse({
        data: [],
        pagination: { totalItems: 0, page: 1, perPage: 10, totalPages: 0 },
      })
    )

    await api.getDeliveriesRaw({
      search: 'Souvlaki & Pizza #1',
    })

    expect(mockFetch).toHaveBeenCalledTimes(1)
    const [calledUrl] = mockFetch.mock.calls[0]
    const url = new URL(calledUrl)
    expect(url.searchParams.get('search')).toBe('Souvlaki & Pizza #1')
    expect(calledUrl).toContain('search=Souvlaki%20%26%20Pizza%20%231')
  })

  it('leaves state and search out of the query string when undefined', async () => {
    mockFetch.mockResolvedValueOnce(
      createMockResponse({
        data: [],
        pagination: { totalItems: 0, page: 1, perPage: 10, totalPages: 0 },
      })
    )

    await api.getDeliveriesRaw({
      page: 2,
      perPage: 20,
    })

    expect(mockFetch).toHaveBeenCalledTimes(1)
    const [calledUrl] = mockFetch.mock.calls[0]
    const url = new URL(calledUrl)

    expect(url.searchParams.has('state')).toBe(false)
    expect(url.searchParams.has('search')).toBe(false)
    expect(url.searchParams.has('partnerId')).toBe(false)
    expect(url.searchParams.get('page')).toBe('2')
    expect(url.searchParams.get('perPage')).toBe('20')
  })

  it('puts partnerId in the query string when given (spec 0017, AC-7)', async () => {
    mockFetch.mockResolvedValueOnce(
      createMockResponse({
        data: [],
        pagination: { totalItems: 0, page: 1, perPage: 10, totalPages: 0 },
      })
    )

    await api.getDeliveriesRaw({
      partnerId: 'partner-uuid-123',
    })

    expect(mockFetch).toHaveBeenCalledTimes(1)
    const [calledUrl] = mockFetch.mock.calls[0]
    const url = new URL(calledUrl)
    expect(url.pathname).toBe('/api/admin/v1/deliveries')
    expect(url.searchParams.get('partnerId')).toBe('partner-uuid-123')
  })

  it('combines partnerId with state and search query parameters (spec 0017, AC-7)', async () => {
    mockFetch.mockResolvedValueOnce(
      createMockResponse({
        data: [],
        pagination: { totalItems: 0, page: 1, perPage: 10, totalPages: 0 },
      })
    )

    await api.getDeliveriesRaw({
      partnerId: 'partner-uuid-123',
      state: 'dropped_off',
      search: 'Papadopoulos',
    })

    expect(mockFetch).toHaveBeenCalledTimes(1)
    const [calledUrl] = mockFetch.mock.calls[0]
    const url = new URL(calledUrl)
    expect(url.searchParams.get('partnerId')).toBe('partner-uuid-123')
    expect(url.searchParams.get('state')).toBe('dropped_off')
    expect(url.searchParams.get('search')).toBe('Papadopoulos')
  })

  it('leaves query string empty when getDeliveries is called with no arguments', async () => {
    mockFetch.mockResolvedValueOnce(
      createMockResponse({
        data: [],
        pagination: { totalItems: 0, page: 1, perPage: 10, totalPages: 0 },
      })
    )

    const result = await api.getDeliveries()

    expect(mockFetch).toHaveBeenCalledTimes(1)
    const [calledUrl] = mockFetch.mock.calls[0]
    expect(calledUrl).toBe('http://localhost:3000/api/admin/v1/deliveries')
    expect(result.data).toEqual([])
  })
})

describe('DeliveriesApi product reports methods (spec 0032, AC-6, AC-7)', () => {
  const mockFetch = jest.fn()
  let api: DeliveriesApi

  beforeEach(() => {
    jest.clearAllMocks()
    const config = new Configuration({
      fetchApi: mockFetch,
      basePath: 'http://localhost:3000',
      accessToken: () => Promise.resolve('test-admin-token'),
    })
    api = new DeliveriesApi(config)
  })

  describe('getDeliveryProductReports', () => {
    it('sends GET to /api/admin/v1/deliveries/:deliveryId/product-reports with URL encoded id and returns mapped reports', async () => {
      const rawBackendReports = [
        {
          id: 'report-1',
          deliveryId: 'del/123 special',
          kind: 'WRONG_ITEM',
          source: 'COURIER',
          reporterEmail: 'rider@example.com',
          itemName: 'Pizza Margherita',
          note: 'Received Funghi instead',
          resolvedAt: null,
          resolution: null,
          createdAt: '2026-11-09T08:00:00.000Z',
        },
      ]

      mockFetch.mockResolvedValueOnce(createMockResponse(rawBackendReports, 200))

      const reports = await api.getDeliveryProductReports({
        deliveryId: 'del/123 special',
      })

      expect(mockFetch).toHaveBeenCalledTimes(1)
      const [calledUrl, calledInit] = mockFetch.mock.calls[0]

      expect(calledUrl).toBe('http://localhost:3000/api/admin/v1/deliveries/del%2F123%20special/product-reports')
      expect(calledInit.method).toBe('GET')
      expect(calledInit.headers['Authorization']).toBe('Bearer test-admin-token')

      expect(reports).toHaveLength(1)
      expect(reports[0]?.id).toBe('report-1')
      expect(reports[0]?.kind).toBe('WRONG_ITEM')
      expect(reports[0]?.source).toBe('COURIER')
      expect(reports[0]?.itemName).toBe('Pizza Margherita')
      expect(reports[0]?.note).toBe('Received Funghi instead')
      expect(reports[0]?.createdAt).toBeInstanceOf(Date)
      expect(reports[0]?.createdAt.toISOString()).toBe('2026-11-09T08:00:00.000Z')
      expect(reports[0]?.resolvedAt).toBeNull()
    })
  })

  describe('createDeliveryProductReport', () => {
    it('sends POST to /api/admin/v1/deliveries/:deliveryId/product-reports with JSON body omitting deliveryId from body', async () => {
      const createdBackendReport = {
        id: 'report-2',
        deliveryId: 'del-456',
        kind: 'MISSING_ITEM',
        source: 'ADMIN',
        reporterEmail: 'admin@coop.gr',
        itemName: 'Coca Cola Zero',
        note: 'Customer phoned',
        resolvedAt: null,
        resolution: null,
        createdAt: '2026-11-09T09:00:00.000Z',
      }

      mockFetch.mockResolvedValueOnce(createMockResponse(createdBackendReport, 201))

      const result = await api.createDeliveryProductReport({
        deliveryId: 'del-456',
        kind: 'MISSING_ITEM',
        itemName: 'Coca Cola Zero',
        note: 'Customer phoned',
      })

      expect(mockFetch).toHaveBeenCalledTimes(1)
      const [calledUrl, calledInit] = mockFetch.mock.calls[0]

      expect(calledUrl).toBe('http://localhost:3000/api/admin/v1/deliveries/del-456/product-reports')
      expect(calledInit.method).toBe('POST')
      expect(calledInit.headers['Authorization']).toBe('Bearer test-admin-token')
      expect(calledInit.headers['Content-Type']).toBe('application/json')
      expect(JSON.parse(calledInit.body)).toEqual({
        kind: 'MISSING_ITEM',
        itemName: 'Coca Cola Zero',
        note: 'Customer phoned',
      })

      expect(result.id).toBe('report-2')
      expect(result.deliveryId).toBe('del-456')
      expect(result.kind).toBe('MISSING_ITEM')
      expect(result.createdAt).toBeInstanceOf(Date)
    })
  })

  describe('getProductReports', () => {
    it('sends GET to /api/admin/v1/product-reports with state, page, and perPage query params and maps data', async () => {
      const pageResult = {
        data: [
          {
            id: 'report-3',
            deliveryId: 'del-789',
            kind: 'WRONG_ITEM',
            source: 'PARTNER',
            reporterEmail: 'partner@souvlaki.gr',
            itemName: 'Pita Gyros',
            note: 'Extra tzatziki was missing',
            resolvedAt: '2026-11-09T10:00:00.000Z',
            resolution: 'Delivered extra sauce',
            createdAt: '2026-11-09T09:30:00.000Z',
          },
        ],
        pagination: { total: 1, page: 1, perPage: 20 },
      }

      mockFetch.mockResolvedValueOnce(createMockResponse(pageResult, 200))

      const response = await api.getProductReports({
        state: 'open',
        page: 1,
        perPage: 20,
      })

      expect(mockFetch).toHaveBeenCalledTimes(1)
      const [calledUrl, calledInit] = mockFetch.mock.calls[0]

      expect(calledUrl).toBe('http://localhost:3000/api/admin/v1/product-reports?state=open&page=1&perPage=20')
      expect(calledInit.method).toBe('GET')
      expect(calledInit.headers['Authorization']).toBe('Bearer test-admin-token')

      expect(response.pagination).toEqual({ total: 1, page: 1, perPage: 20 })
      expect(response.data).toHaveLength(1)
      expect(response.data[0]?.id).toBe('report-3')
      expect(response.data[0]?.resolvedAt).toBeInstanceOf(Date)
      expect(response.data[0]?.resolution).toBe('Delivered extra sauce')
    })
  })

  describe('resolveProductReport', () => {
    it('sends POST to /api/admin/v1/product-reports/:id/resolve with resolution in body and returns updated report', async () => {
      const resolvedBackendReport = {
        id: 'report-4/special',
        deliveryId: 'del-999',
        kind: 'WRONG_ITEM',
        source: 'COURIER',
        reporterEmail: 'rider@example.com',
        itemName: 'Burger',
        note: null,
        resolvedAt: '2026-11-09T11:00:00.000Z',
        resolution: 'Credit applied to customer account',
        createdAt: '2026-11-09T10:00:00.000Z',
      }

      mockFetch.mockResolvedValueOnce(createMockResponse(resolvedBackendReport, 200))

      const result = await api.resolveProductReport({
        id: 'report-4/special',
        resolution: 'Credit applied to customer account',
      })

      expect(mockFetch).toHaveBeenCalledTimes(1)
      const [calledUrl, calledInit] = mockFetch.mock.calls[0]

      expect(calledUrl).toBe('http://localhost:3000/api/admin/v1/product-reports/report-4%2Fspecial/resolve')
      expect(calledInit.method).toBe('POST')
      expect(calledInit.headers['Authorization']).toBe('Bearer test-admin-token')
      expect(calledInit.headers['Content-Type']).toBe('application/json')
      expect(JSON.parse(calledInit.body)).toEqual({
        resolution: 'Credit applied to customer account',
      })

      expect(result.id).toBe('report-4/special')
      expect(result.resolvedAt).toBeInstanceOf(Date)
      expect(result.resolution).toBe('Credit applied to customer account')
    })

    it('sends POST to /api/admin/v1/product-reports/:id/resolve with undefined resolution when not provided', async () => {
      const resolvedBackendReport = {
        id: 'report-5',
        deliveryId: 'del-999',
        kind: 'WRONG_ITEM',
        source: 'COURIER',
        reporterEmail: null,
        itemName: null,
        note: null,
        resolvedAt: '2026-11-09T11:00:00.000Z',
        resolution: null,
        createdAt: '2026-11-09T10:00:00.000Z',
      }

      mockFetch.mockResolvedValueOnce(createMockResponse(resolvedBackendReport, 200))

      const result = await api.resolveProductReport({
        id: 'report-5',
      })

      expect(mockFetch).toHaveBeenCalledTimes(1)
      const [calledUrl, calledInit] = mockFetch.mock.calls[0]

      expect(calledUrl).toBe('http://localhost:3000/api/admin/v1/product-reports/report-5/resolve')
      expect(calledInit.method).toBe('POST')
      expect(JSON.parse(calledInit.body)).toEqual({})
      expect(result.id).toBe('report-5')
      expect(result.resolvedAt).toBeInstanceOf(Date)
      expect(result.resolution).toBeNull()
    })
  })
})
