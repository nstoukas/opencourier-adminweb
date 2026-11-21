import { SplitRequestApi } from './SplitRequestApi'
import type { SplitRequestAdminDto } from './SplitRequestApi'
import { Configuration } from '../runtime'
import { BackendAdminSdk } from '../backend-admin-sdk'

// What `fetch` answers, with just the parts the SDK reads.
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

// Spec 0047 (AC-4): the hand edited SDK for the Split requests queue. These pin the four routes, so the
// admin app and the backend cannot drift apart silently.
describe('SplitRequestApi (spec 0047, AC-4)', () => {
  const mockFetch = jest.fn()
  let api: SplitRequestApi

  const sample: SplitRequestAdminDto = {
    id: 'split-1',
    deliveryId: 'del-1',
    courierId: 'rider-1',
    courierName: 'Nikos Rider',
    restaurantName: 'Volos Test Kitchen',
    orderReference: null,
    currentBoxSize: 'LARGE',
    legNumber: null,
    legCount: null,
    proposedLegs: [{ boxSize: 'LARGE' }, { boxSize: 'SMALL' }],
    createdAt: '2026-11-21T12:00:00.000Z',
    waitedMinutes: 6,
  }

  beforeEach(() => {
    jest.clearAllMocks()
    api = new SplitRequestApi(
      new Configuration({
        fetchApi: mockFetch,
        basePath: 'http://localhost:3000',
        accessToken: () => Promise.resolve('test-admin-bearer-token'),
      })
    )
  })

  // The url and the request the SDK made on its only call.
  const theCall = () => {
    expect(mockFetch).toHaveBeenCalledTimes(1)
    const [url, init] = mockFetch.mock.calls[0]
    return { url, init }
  }

  it('is reached through sdk.splitRequests()', () => {
    const sdk = new BackendAdminSdk(
      new Configuration({ fetchApi: mockFetch, basePath: 'http://localhost:3000', accessToken: () => Promise.resolve('token') })
    )
    expect(sdk.splitRequests()).toBeInstanceOf(SplitRequestApi)
  })

  it('list GETs /api/admin/v1/split-requests as the signed in admin and returns the rows', async () => {
    mockFetch.mockResolvedValueOnce(createMockResponse([sample]))

    const result = await api.list()

    const { url, init } = theCall()
    expect(url).toBe('http://localhost:3000/api/admin/v1/split-requests')
    expect(init.method).toBe('GET')
    expect(init.headers['Authorization']).toBe('Bearer test-admin-bearer-token')
    expect(result).toEqual([sample])
  })

  it('count GETs /api/admin/v1/split-requests/count and returns { open }', async () => {
    mockFetch.mockResolvedValueOnce(createMockResponse({ open: 4 }))

    const result = await api.count()

    const { url, init } = theCall()
    expect(url).toBe('http://localhost:3000/api/admin/v1/split-requests/count')
    expect(init.method).toBe('GET')
    expect(init.headers['Authorization']).toBe('Bearer test-admin-bearer-token')
    expect(result).toEqual({ open: 4 })
  })

  it('confirm with no legs POSTs an empty body: the server uses the proposal', async () => {
    mockFetch.mockResolvedValueOnce(createMockResponse({ status: 'CONFIRMED' }))

    const result = await api.confirm('split-1')

    const { url, init } = theCall()
    expect(url).toBe('http://localhost:3000/api/admin/v1/split-requests/split-1/confirm')
    expect(init.method).toBe('POST')
    expect(init.headers['Authorization']).toBe('Bearer test-admin-bearer-token')
    expect(init.headers['Content-Type']).toBe('application/json')
    expect(init.body).toBe(JSON.stringify({}))
    expect(result).toEqual({ status: 'CONFIRMED' })
  })

  it('confirm with legs POSTs { legs } and nothing else', async () => {
    mockFetch.mockResolvedValueOnce(createMockResponse({ status: 'CONFIRMED' }))

    await api.confirm('split-1', [{ boxSize: 'MEDIUM' }, { boxSize: 'MEDIUM' }, { boxSize: 'SMALL' }])

    const { url, init } = theCall()
    expect(url).toBe('http://localhost:3000/api/admin/v1/split-requests/split-1/confirm')
    expect(init.body).toBe(JSON.stringify({ legs: [{ boxSize: 'MEDIUM' }, { boxSize: 'MEDIUM' }, { boxSize: 'SMALL' }] }))
  })

  it('refuse with a sentence POSTs { note }', async () => {
    mockFetch.mockResolvedValueOnce(createMockResponse({ status: 'REFUSED' }))

    const result = await api.refuse('split-1', 'It fits if you turn the platter')

    const { url, init } = theCall()
    expect(url).toBe('http://localhost:3000/api/admin/v1/split-requests/split-1/refuse')
    expect(init.method).toBe('POST')
    expect(init.headers['Content-Type']).toBe('application/json')
    expect(init.body).toBe(JSON.stringify({ note: 'It fits if you turn the platter' }))
    expect(result).toEqual({ status: 'REFUSED' })
  })

  it('refuse with no sentence POSTs an empty body', async () => {
    mockFetch.mockResolvedValueOnce(createMockResponse({ status: 'REFUSED' }))

    await api.refuse('split-1')

    expect(theCall().init.body).toBe(JSON.stringify({}))
  })

  it('escapes the id in the path', async () => {
    mockFetch.mockResolvedValueOnce(createMockResponse({ status: 'CONFIRMED' }))

    await api.confirm('split/1?x')

    expect(theCall().url).toBe('http://localhost:3000/api/admin/v1/split-requests/split%2F1%3Fx/confirm')
  })

  it('a 409 (already answered, or the rider left) rejects instead of looking like a saved answer', async () => {
    mockFetch.mockResolvedValueOnce(
      createMockResponse({ error: true, result: [{ message: 'This split request was already answered or closed.' }] }, 409)
    )
    await expect(api.confirm('split-1')).rejects.toBeDefined()
  })
})
