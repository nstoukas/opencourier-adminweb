import { CourierAccountApi } from './CourierAccountApi'
import type { CourierAccountAdminDto, CourierAccountChangeAdminDto } from './CourierAccountApi'
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

// Spec 0051 (row 108): the hand edited API for rider account upkeep, checked at the fetch boundary.
// The spec's routes: POST admin/v1/courier/:id/deactivate { reason }, POST .../reactivate { reason? },
// GET .../account and GET .../account-changes.
describe('CourierAccountApi (spec 0051)', () => {
  const mockFetch = jest.fn()
  let api: CourierAccountApi

  beforeEach(() => {
    jest.clearAllMocks()
    api = new CourierAccountApi(
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
  const sentBody = (init: RequestInit) => JSON.parse(init.body as string)

  it('deactivate: POST /api/admin/v1/courier/{id}/deactivate with the bearer token and { reason } as JSON', async () => {
    mockFetch.mockResolvedValueOnce(createMockResponse({ id: 'rider-1' }, 201))

    await api.deactivate('rider-1', 'Left the co-op')

    const { url, init } = lastCall()
    expect(url).toBe('http://localhost:3000/api/admin/v1/courier/rider-1/deactivate')
    expect(init.method).toBe('POST')
    expect(init.headers['Authorization']).toBe('Bearer test-admin-bearer-token')
    expect(init.headers['Content-Type']).toBe('application/json')
    expect(sentBody(init)).toEqual({ reason: 'Left the co-op' })
  })

  it('reactivate with a reason: POST /api/admin/v1/courier/{id}/reactivate with { reason }', async () => {
    mockFetch.mockResolvedValueOnce(createMockResponse({ id: 'rider-1' }, 201))

    await api.reactivate('rider-1', 'Came back')

    const { url, init } = lastCall()
    expect(url).toBe('http://localhost:3000/api/admin/v1/courier/rider-1/reactivate')
    expect(init.method).toBe('POST')
    expect(init.headers['Authorization']).toBe('Bearer test-admin-bearer-token')
    expect(init.headers['Content-Type']).toBe('application/json')
    expect(sentBody(init)).toEqual({ reason: 'Came back' })
  })

  it('reactivate with no reason sends an empty object, never an empty or missing reason key', async () => {
    mockFetch.mockResolvedValueOnce(createMockResponse({ id: 'rider-1' }, 201))

    await api.reactivate('rider-1')

    const { url, init } = lastCall()
    expect(url).toBe('http://localhost:3000/api/admin/v1/courier/rider-1/reactivate')
    expect(sentBody(init)).toEqual({})
  })

  it('account: GET /api/admin/v1/courier/{id}/account with the bearer token and no body, answered as sent', async () => {
    const account: CourierAccountAdminDto = {
      email: 'nikos@coop.gr',
      deactivatedAt: '2026-11-21T10:00:00.000Z',
      emergencyContactName: 'Maria Rider',
      emergencyContactPhone: '+306922222222',
    }
    mockFetch.mockResolvedValueOnce(createMockResponse(account))

    const result = await api.account('rider-1')

    const { url, init } = lastCall()
    expect(url).toBe('http://localhost:3000/api/admin/v1/courier/rider-1/account')
    expect(init.method).toBe('GET')
    expect(init.headers['Authorization']).toBe('Bearer test-admin-bearer-token')
    expect(init.body).toBeUndefined()
    expect(result).toEqual(account)
  })

  it('changes: GET /api/admin/v1/courier/{id}/account-changes, answered in the order sent (newest first)', async () => {
    const row = (id: string, kind: string): CourierAccountChangeAdminDto => ({
      id,
      kind,
      field: null,
      oldValue: null,
      newValue: null,
      reason: null,
      actorIsRider: false,
      actorEmail: 'admin@coop.gr',
      createdAt: '2026-11-21T10:00:00.000Z',
    })
    mockFetch.mockResolvedValueOnce(createMockResponse([row('change-2', 'REACTIVATED'), row('change-1', 'DEACTIVATED')]))

    const result = await api.changes('rider-1')

    const { url, init } = lastCall()
    expect(url).toBe('http://localhost:3000/api/admin/v1/courier/rider-1/account-changes')
    expect(init.method).toBe('GET')
    expect(init.headers['Authorization']).toBe('Bearer test-admin-bearer-token')
    expect(init.body).toBeUndefined()
    expect(result.map((change) => change.id)).toEqual(['change-2', 'change-1'])
    expect(result[1]).toEqual(row('change-1', 'DEACTIVATED'))
  })

  it.each([
    ['deactivate', (id: string) => api.deactivate(id, 'Left'), 'deactivate'],
    ['reactivate', (id: string) => api.reactivate(id), 'reactivate'],
    ['account', (id: string) => api.account(id), 'account'],
    ['changes', (id: string) => api.changes(id), 'account-changes'],
  ] as const)('%s encodes the rider id in the path', async (_name, call, tail) => {
    mockFetch.mockResolvedValueOnce(createMockResponse([]))

    await call('a/b?c')

    expect(lastCall().url).toBe(`http://localhost:3000/api/admin/v1/courier/a%2Fb%3Fc/${tail}`)
  })

  it("a refusal's status reaches the caller (409 holds a job)", async () => {
    mockFetch.mockResolvedValueOnce(
      createMockResponse({ statusCode: 409, message: 'This rider holds a job. Move it first.' }, 409)
    )

    await expect(api.deactivate('rider-1', 'Left')).rejects.toMatchObject({ response: { status: 409 } })
  })

  it('BackendAdminSdk.courierAccount() returns this API, one instance per sdk', () => {
    const sdk = new BackendAdminSdk({ basePath: 'http://localhost:3000' })
    expect(sdk.courierAccount()).toBeInstanceOf(CourierAccountApi)
    expect(sdk.courierAccount()).toBe(sdk.courierAccount())
  })
})
