import { DispatchStopApi } from './DispatchStopApi'
import { Configuration } from '../runtime'
import { BackendAdminSdk } from '../backend-admin-sdk'
import type {
  DispatchStopAdminDto,
  DispatchStopOverviewAdminDto,
  DispatchStopPreviewAdminDto,
  DispatchStopCreateAdminInput,
} from './DispatchStopApi'

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

describe('DispatchStopApi (spec 0014, AC-1, AC-2, AC-3, AC-8, AC-9)', () => {
  const mockFetch = jest.fn()
  let api: DispatchStopApi

  const sampleStop: DispatchStopAdminDto = {
    id: 'stop-abc-123',
    reason: 'HEAT',
    startsAt: '2026-07-15T09:00:00Z',
    endsAt: '2026-07-15T15:00:00Z',
    createdByUserId: 'usr-admin-1',
    createdAt: '2026-07-15T08:00:00Z',
    startedAt: '2026-07-15T09:00:00Z',
    endedAt: null,
    endedByUserId: null,
    cancelledAt: null,
    cancelledByUserId: null,
    endWorkDoneAt: null,
  }

  beforeEach(() => {
    jest.clearAllMocks()
    const config = new Configuration({
      fetchApi: mockFetch,
      basePath: 'http://localhost:3000',
      accessToken: () => Promise.resolve('test-admin-bearer-token'),
    })
    api = new DispatchStopApi(config)
  })

  it('overview: sends GET to /api/admin/v1/dispatch-stops with bearer auth and parses response', async () => {
    const mockOverview: DispatchStopOverviewAdminDto = {
      current: sampleStop,
      scheduled: [],
      history: [sampleStop],
    }
    mockFetch.mockResolvedValueOnce(createMockResponse(mockOverview, 200))

    const result = await api.overview()

    expect(mockFetch).toHaveBeenCalledTimes(1)
    const [url, requestInit] = mockFetch.mock.calls[0]
    expect(url).toBe('http://localhost:3000/api/admin/v1/dispatch-stops')
    expect(requestInit.method).toBe('GET')
    expect(requestInit.headers['Authorization']).toBe('Bearer test-admin-bearer-token')
    expect(result).toEqual(mockOverview)
  })

  it('preview: sends GET to /api/admin/v1/dispatch-stops/preview with bearer auth and parses response', async () => {
    const mockPreview: DispatchStopPreviewAdminDto = {
      offersToEnd: 3,
      deliveriesToReturn: 7,
    }
    mockFetch.mockResolvedValueOnce(createMockResponse(mockPreview, 200))

    const result = await api.preview()

    expect(mockFetch).toHaveBeenCalledTimes(1)
    const [url, requestInit] = mockFetch.mock.calls[0]
    expect(url).toBe('http://localhost:3000/api/admin/v1/dispatch-stops/preview')
    expect(requestInit.method).toBe('GET')
    expect(requestInit.headers['Authorization']).toBe('Bearer test-admin-bearer-token')
    expect(result).toEqual(mockPreview)
  })

  it('create: sends POST to /api/admin/v1/dispatch-stops with JSON body and parses returned stop', async () => {
    mockFetch.mockResolvedValueOnce(createMockResponse(sampleStop, 201))

    const input: DispatchStopCreateAdminInput = {
      reason: 'HEAT',
      startsOn: { date: '2026-07-20', time: '12:00' },
      endsOn: { date: '2026-07-20', time: '17:00' },
    }

    const result = await api.create(input)

    expect(mockFetch).toHaveBeenCalledTimes(1)
    const [url, requestInit] = mockFetch.mock.calls[0]
    expect(url).toBe('http://localhost:3000/api/admin/v1/dispatch-stops')
    expect(requestInit.method).toBe('POST')
    expect(requestInit.headers['Content-Type']).toBe('application/json')
    expect(requestInit.headers['Authorization']).toBe('Bearer test-admin-bearer-token')
    expect(JSON.parse(requestInit.body)).toEqual(input)
    expect(result).toEqual(sampleStop)
  })

  it('end: sends POST to /api/admin/v1/dispatch-stops/:id/end with id URL-encoded', async () => {
    const endedStop: DispatchStopAdminDto = {
      ...sampleStop,
      endedAt: '2026-07-15T11:00:00Z',
      endedByUserId: 'usr-admin-1',
    }
    mockFetch.mockResolvedValueOnce(createMockResponse(endedStop, 200))

    // ID with special characters requiring URL-encoding
    const rawId = 'stop/special #42'
    const result = await api.end(rawId)

    expect(mockFetch).toHaveBeenCalledTimes(1)
    const [url, requestInit] = mockFetch.mock.calls[0]
    expect(url).toBe('http://localhost:3000/api/admin/v1/dispatch-stops/stop%2Fspecial%20%2342/end')
    expect(requestInit.method).toBe('POST')
    expect(requestInit.headers['Authorization']).toBe('Bearer test-admin-bearer-token')
    expect(result).toEqual(endedStop)
  })

  it('does not send Authorization header when accessToken is not configured', async () => {
    const unauthedConfig = new Configuration({
      fetchApi: mockFetch,
      basePath: 'http://localhost:3000',
    })
    const unauthedApi = new DispatchStopApi(unauthedConfig)
    mockFetch.mockResolvedValueOnce(createMockResponse({ current: null, scheduled: [], history: [] }, 200))

    await unauthedApi.overview()

    const [, requestInit] = mockFetch.mock.calls[0]
    expect(requestInit.headers['Authorization']).toBeUndefined()
  })

  it('BackendAdminSdk exposes dispatchStops() returning DispatchStopApi instance', () => {
    const sdk = new BackendAdminSdk(new Configuration({ basePath: 'http://localhost:3000' }))
    const stopsApi = sdk.dispatchStops()
    expect(stopsApi).toBeInstanceOf(DispatchStopApi)
  })
})
