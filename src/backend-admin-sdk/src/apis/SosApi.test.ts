import { SosApi } from './SosApi'
import { Configuration } from '../runtime'
import { BackendAdminSdk } from '../backend-admin-sdk'
import type {
  SosIncidentAdminDto,
  SosIncidentDetailAdminDto,
  SosIncidentPageAdminDto,
  SosCloseAdminInput,
} from './SosApi'

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

describe('SosApi (spec 0022, AC-8, AC-9, AC-10)', () => {
  const mockFetch = jest.fn()
  let api: SosApi

  const sampleIncident: SosIncidentAdminDto = {
    id: 'sos-123',
    state: 'ACTIVE',
    courier: { id: 'courier-1', firstName: 'Nikos', lastName: 'Papadopoulos' },
    deliveryId: 'del-456',
    startedAt: '2026-11-03T10:00:00Z',
    createdAt: '2026-11-03T10:00:00Z',
    safeAt: null,
    falseAlarmAt: null,
    closedAt: null,
    closedBy: null,
    outcome: null,
    note: null,
    pointsDeletedAt: null,
  }

  beforeEach(() => {
    jest.clearAllMocks()
    const config = new Configuration({
      fetchApi: mockFetch,
      basePath: 'http://localhost:3000',
      accessToken: () => Promise.resolve('test-admin-bearer-token'),
    })
    api = new SosApi(config)
  })

  it('registered on BackendAdminSdk via sdk.sos()', () => {
    const sdk = new BackendAdminSdk(
      new Configuration({
        fetchApi: mockFetch,
        basePath: 'http://localhost:3000',
        accessToken: () => Promise.resolve('token'),
      }),
    )
    expect(sdk.sos()).toBeInstanceOf(SosApi)
  })

  it('current: GETs /api/admin/v1/sos with status=current and Bearer token (AC-8)', async () => {
    const mockList: SosIncidentAdminDto[] = [sampleIncident]
    mockFetch.mockResolvedValueOnce(createMockResponse(mockList, 200))

    const result = await api.current()

    expect(mockFetch).toHaveBeenCalledTimes(1)
    const [url, requestInit] = mockFetch.mock.calls[0]
    expect(url).toBe('http://localhost:3000/api/admin/v1/sos?status=current')
    expect(requestInit.method).toBe('GET')
    expect(requestInit.headers['Authorization']).toBe('Bearer test-admin-bearer-token')
    expect(result).toEqual(mockList)
  })

  it('closed: GETs /api/admin/v1/sos with status=closed, page, limit and Bearer token (AC-9)', async () => {
    const mockPage: SosIncidentPageAdminDto = {
      data: [{ ...sampleIncident, state: 'CLOSED', closedAt: '2026-11-03T10:15:00Z' }],
      pagination: { page: 2, limit: 10, totalItems: 15, totalPages: 2 },
    }
    mockFetch.mockResolvedValueOnce(createMockResponse(mockPage, 200))

    const result = await api.closed(2, 10)

    expect(mockFetch).toHaveBeenCalledTimes(1)
    const [url, requestInit] = mockFetch.mock.calls[0]
    expect(url).toBe('http://localhost:3000/api/admin/v1/sos?status=closed&page=2&limit=10')
    expect(requestInit.method).toBe('GET')
    expect(requestInit.headers['Authorization']).toBe('Bearer test-admin-bearer-token')
    expect(result).toEqual(mockPage)
  })

  it('findOne: GETs /api/admin/v1/sos/<id url-encoded> with Bearer token (AC-9)', async () => {
    const mockDetail: SosIncidentDetailAdminDto = {
      ...sampleIncident,
      points: [
        { latitude: 39.36, longitude: 22.94, accuracyMetres: 5, recordedAt: '2026-11-03T10:00:05Z' },
      ],
    }
    mockFetch.mockResolvedValueOnce(createMockResponse(mockDetail, 200))

    const specialId = 'sos/123 special#id'
    const result = await api.findOne(specialId)

    expect(mockFetch).toHaveBeenCalledTimes(1)
    const [url, requestInit] = mockFetch.mock.calls[0]
    expect(url).toBe(`http://localhost:3000/api/admin/v1/sos/${encodeURIComponent(specialId)}`)
    expect(requestInit.method).toBe('GET')
    expect(requestInit.headers['Authorization']).toBe('Bearer test-admin-bearer-token')
    expect(result).toEqual(mockDetail)
  })

  it('close: POSTs JSON {outcome, note} to /api/admin/v1/sos/<id>/close with Content-Type application/json and Bearer token (AC-10)', async () => {
    const mockClosed: SosIncidentAdminDto = {
      ...sampleIncident,
      state: 'CLOSED',
      closedAt: '2026-11-03T10:05:00Z',
      outcome: 'RIDER_SAFE',
      note: 'Rider confirmed they are fine.',
    }
    mockFetch.mockResolvedValueOnce(createMockResponse(mockClosed, 200))

    const input: SosCloseAdminInput = {
      outcome: 'RIDER_SAFE',
      note: 'Rider confirmed they are fine.',
    }

    const specialId = 'sos/456#close'
    const result = await api.close(specialId, input)

    expect(mockFetch).toHaveBeenCalledTimes(1)
    const [url, requestInit] = mockFetch.mock.calls[0]
    expect(url).toBe(`http://localhost:3000/api/admin/v1/sos/${encodeURIComponent(specialId)}/close`)
    expect(requestInit.method).toBe('POST')
    expect(requestInit.headers['Authorization']).toBe('Bearer test-admin-bearer-token')
    expect(requestInit.headers['Content-Type']).toBe('application/json')
    expect(JSON.parse(requestInit.body)).toEqual({
      outcome: 'RIDER_SAFE',
      note: 'Rider confirmed they are fine.',
    })
    expect(result).toEqual(mockClosed)
  })
})
