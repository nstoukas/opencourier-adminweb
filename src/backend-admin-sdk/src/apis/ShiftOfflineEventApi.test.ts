import { ShiftOfflineEventApi } from './ShiftOfflineEventApi'
import type { ShiftOfflineEventAdminDto } from './ShiftOfflineEventApi'
import { Configuration } from '../runtime'
import { BackendAdminSdk } from '../backend-admin-sdk'

function createMockResponse(body: unknown, status = 200): Response {
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

// Spec 0049 (row 79, AC-6): the hand edited API for Offline during a booked shift, checked at the fetch
// boundary. The spec's routes: GET admin/v1/shifts/offline-events and POST .../:id/followed-up.
describe('ShiftOfflineEventApi (spec 0049)', () => {
  const mockFetch = jest.fn()
  let api: ShiftOfflineEventApi

  const item: ShiftOfflineEventAdminDto = {
    id: 'event-1',
    courierId: 'rider-1',
    courierName: 'Maria Papadopoulou',
    offlineAt: '2026-11-20T19:10:00.000Z',
    offlineTime: '21:10',
    shiftDate: '2026-11-20',
    shiftText: 'Fri 20 Nov, 20:00 to 23:59',
    cause: 'RIDER',
    causeText: 'The rider switched to Offline',
    followedUpAt: null,
    followedUpByEmail: null,
  }

  beforeEach(() => {
    jest.clearAllMocks()
    api = new ShiftOfflineEventApi(
      new Configuration({
        fetchApi: mockFetch,
        basePath: 'http://localhost:3000',
        accessToken: () => Promise.resolve('test-admin-bearer-token'),
      })
    )
  })

  const lastCall = () => {
    expect(mockFetch).toHaveBeenCalledTimes(1)
    const [url, init] = mockFetch.mock.calls[0]
    return { url: url as string, init: init as RequestInit & { headers: Record<string, string> } }
  }

  it('list: GET /api/admin/v1/shifts/offline-events with the bearer token, no query and no body', async () => {
    mockFetch.mockResolvedValueOnce(createMockResponse([item]))

    const result = await api.list()

    const { url, init } = lastCall()
    expect(url).toBe('http://localhost:3000/api/admin/v1/shifts/offline-events')
    expect(init.method).toBe('GET')
    expect(init.headers['Authorization']).toBe('Bearer test-admin-bearer-token')
    expect(init.body).toBeUndefined()
    expect(result).toEqual([item])
  })

  it('list answers the items as sent, in the order sent (newest first is the backend\'s order)', async () => {
    const older = { ...item, id: 'event-0', offlineTime: '18:02' }
    mockFetch.mockResolvedValueOnce(createMockResponse([item, older]))
    const result = await api.list()
    expect(result.map((row) => row.id)).toEqual(['event-1', 'event-0'])
  })

  // Value 5, cross check 3: no search, filter or sort by rider, so the call has nothing to pass one in.
  it('list takes no rider, search, filter or sort argument', async () => {
    mockFetch.mockResolvedValueOnce(createMockResponse([]))
    await (api.list as (...args: unknown[]) => Promise<unknown>)()
    expect(lastCall().url).not.toContain('?')
  })

  it('followUp: POST /api/admin/v1/shifts/offline-events/{id}/followed-up with the bearer token', async () => {
    mockFetch.mockResolvedValueOnce(createMockResponse(undefined, 204))

    const result = await api.followUp('event-1')

    const { url, init } = lastCall()
    expect(url).toBe('http://localhost:3000/api/admin/v1/shifts/offline-events/event-1/followed-up')
    expect(init.method).toBe('POST')
    expect(init.headers['Authorization']).toBe('Bearer test-admin-bearer-token')
    expect(result).toBeUndefined()
  })

  it('followUp sends no admin id: the backend takes the admin from the token', async () => {
    mockFetch.mockResolvedValueOnce(createMockResponse(undefined, 204))
    await api.followUp('event-1')
    const { init } = lastCall()
    expect(String(init.body ?? '{}')).toBe('{}')
  })

  it('followUp encodes the id into the path', async () => {
    mockFetch.mockResolvedValueOnce(createMockResponse(undefined, 204))
    await api.followUp('a/b c')
    expect(lastCall().url).toBe('http://localhost:3000/api/admin/v1/shifts/offline-events/a%2Fb%20c/followed-up')
  })

  it.each([
    [409, 'This item was already followed up.'],
    [404, 'This item is not on the list.'],
  ])('followUp rejects on a %s', async (status, message) => {
    mockFetch.mockResolvedValueOnce(createMockResponse({ code: 'CONFLICT', message, statusCode: status }, status))
    await expect(api.followUp('event-1')).rejects.toBeDefined()
  })

  it('has only list and followUp: nothing per rider and no count', () => {
    const methods = Object.getOwnPropertyNames(ShiftOfflineEventApi.prototype).filter(
      (name) => name !== 'constructor' && name !== 'authHeaders'
    )
    expect(methods.sort()).toEqual(['followUp', 'list'])
  })

  it('is reachable from the SDK as shiftOfflineEvents(), one instance per SDK', () => {
    const sdk = new BackendAdminSdk({ basePath: 'http://localhost:3000' })
    const first = sdk.shiftOfflineEvents()
    expect(first).toBeInstanceOf(ShiftOfflineEventApi)
    expect(sdk.shiftOfflineEvents()).toBe(first)
  })
})
