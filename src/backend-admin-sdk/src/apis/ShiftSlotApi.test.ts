import { ShiftSlotApi } from './ShiftSlotApi'
import { Configuration } from '../runtime'
import { BackendAdminSdk } from '../backend-admin-sdk'
import type { ShiftSlotAdminDto, ShiftSlotChangeAdminDto, ShiftSlotFieldsAdmin } from './ShiftSlotApi'

function createMockResponse(body: unknown, status = 200): Response {
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

// Spec 0026 (row 77): the hand edited shift slot API, checked at the fetch boundary.
describe('ShiftSlotApi (spec 0026)', () => {
  const mockFetch = jest.fn()
  let api: ShiftSlotApi

  const sampleSlot: ShiftSlotAdminDto = {
    id: 'slot-1',
    weekday: 5,
    startMinute: 1140,
    endMinute: 1380,
    riderCap: 6,
    createdAt: '2026-11-01T10:00:00.000Z',
    updatedAt: '2026-11-01T10:00:00.000Z',
    removedAt: null,
  }

  beforeEach(() => {
    jest.clearAllMocks()
    api = new ShiftSlotApi(
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

  it('list: GET /api/admin/v1/shift-slots with no query by default', async () => {
    mockFetch.mockResolvedValueOnce(createMockResponse([sampleSlot]))

    const result = await api.list()

    const { url, init } = lastCall()
    expect(url).toBe('http://localhost:3000/api/admin/v1/shift-slots')
    expect(init.method).toBe('GET')
    expect(init.headers['Authorization']).toBe('Bearer test-admin-bearer-token')
    expect(init.body).toBeUndefined()
    expect(result).toEqual([sampleSlot])
  })

  it('list(false): no includeRemoved in the query at all', async () => {
    mockFetch.mockResolvedValueOnce(createMockResponse([]))
    await api.list(false)
    expect(lastCall().url).toBe('http://localhost:3000/api/admin/v1/shift-slots')
  })

  it('list(true): asks with ?includeRemoved=true', async () => {
    mockFetch.mockResolvedValueOnce(createMockResponse([sampleSlot]))
    await api.list(true)
    const { url, init } = lastCall()
    expect(url).toBe('http://localhost:3000/api/admin/v1/shift-slots?includeRemoved=true')
    expect(init.method).toBe('GET')
  })

  it('create: POST /api/admin/v1/shift-slots with the four numbers as a JSON body', async () => {
    mockFetch.mockResolvedValueOnce(createMockResponse(sampleSlot, 201))
    const input: ShiftSlotFieldsAdmin = { weekday: 5, startMinute: 1140, endMinute: 1440, riderCap: 6 }

    const result = await api.create(input)

    const { url, init } = lastCall()
    expect(url).toBe('http://localhost:3000/api/admin/v1/shift-slots')
    expect(init.method).toBe('POST')
    expect(init.headers['Content-Type']).toBe('application/json')
    expect(init.headers['Authorization']).toBe('Bearer test-admin-bearer-token')
    expect(JSON.parse(init.body as string)).toEqual({ weekday: 5, startMinute: 1140, endMinute: 1440, riderCap: 6 })
    expect(result).toEqual(sampleSlot)
  })

  it('update: PATCH /api/admin/v1/shift-slots/:id (id encoded) with only the fields given', async () => {
    mockFetch.mockResolvedValueOnce(createMockResponse({ ...sampleSlot, riderCap: 8 }))

    const result = await api.update('slot/1 #2', { riderCap: 8 })

    const { url, init } = lastCall()
    expect(url).toBe('http://localhost:3000/api/admin/v1/shift-slots/slot%2F1%20%232')
    expect(init.method).toBe('PATCH')
    expect(init.headers['Content-Type']).toBe('application/json')
    expect(JSON.parse(init.body as string)).toEqual({ riderCap: 8 })
    expect(result.riderCap).toBe(8)
  })

  it('remove: DELETE /api/admin/v1/shift-slots/:id with no body, and returns the removed slot (200)', async () => {
    const removed = { ...sampleSlot, removedAt: '2026-11-03T08:00:00.000Z' }
    mockFetch.mockResolvedValueOnce(createMockResponse(removed))

    const result = await api.remove('slot-1')

    const { url, init } = lastCall()
    expect(url).toBe('http://localhost:3000/api/admin/v1/shift-slots/slot-1')
    expect(init.method).toBe('DELETE')
    expect(init.body).toBeUndefined()
    expect(init.headers['Authorization']).toBe('Bearer test-admin-bearer-token')
    expect(result).toEqual(removed)
  })

  it('changes: GET /api/admin/v1/shift-slots/:id/changes, in the order the backend sends', async () => {
    const changes: ShiftSlotChangeAdminDto[] = [
      {
        id: 'c2',
        action: 'UPDATED',
        changedByUserId: 'admin-abcdef123456',
        before: { weekday: 5, startMinute: 1140, endMinute: 1380, riderCap: 6 },
        after: { weekday: 5, startMinute: 1140, endMinute: 1380, riderCap: 8 },
        createdAt: '2026-11-02T10:00:00.000Z',
      },
      {
        id: 'c1',
        action: 'CREATED',
        changedByUserId: 'admin-abcdef123456',
        before: null,
        after: { weekday: 5, startMinute: 1140, endMinute: 1380, riderCap: 6 },
        createdAt: '2026-11-01T10:00:00.000Z',
      },
    ]
    mockFetch.mockResolvedValueOnce(createMockResponse(changes))

    const result = await api.changes('slot-1')

    const { url, init } = lastCall()
    expect(url).toBe('http://localhost:3000/api/admin/v1/shift-slots/slot-1/changes')
    expect(init.method).toBe('GET')
    expect(result.map((change) => change.id)).toEqual(['c2', 'c1'])
  })

  it('sends no Authorization header without an access token', async () => {
    const unauthed = new ShiftSlotApi(new Configuration({ fetchApi: mockFetch, basePath: 'http://localhost:3000' }))
    mockFetch.mockResolvedValueOnce(createMockResponse([]))
    await unauthed.list()
    expect(lastCall().init.headers['Authorization']).toBeUndefined()
  })

  it('is reachable from the SDK as shiftSlots()', () => {
    const sdk = new BackendAdminSdk({ basePath: 'http://localhost:3000' })
    expect(sdk.shiftSlots()).toBeInstanceOf(ShiftSlotApi)
  })
})
