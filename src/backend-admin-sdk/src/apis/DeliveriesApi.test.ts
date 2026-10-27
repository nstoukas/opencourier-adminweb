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
