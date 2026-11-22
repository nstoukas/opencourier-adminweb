import { DispatchBoardApi } from './DispatchBoardApi'
import { Configuration } from '../runtime'
import { BackendAdminSdk } from '../backend-admin-sdk'
import type { DispatchBoardDto } from './DispatchBoardApi'

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

describe('DispatchBoardApi (spec 0034, AC-1, AC-17)', () => {
  const mockFetch = jest.fn()
  let api: DispatchBoardApi

  const sampleBoardDto: DispatchBoardDto = {
    generatedAt: '2026-11-09T14:30:00.000Z',
    cards: {
      active: { total: 0, toPickup: 0, toDropoff: 0 },
      waiting: { total: 0, oldestWaitingMinutes: null },
      couriers: { total: 0, busy: 0, free: 0, lastCall: 0 },
      deliveredToday: { total: 0, medianMinutes: null },
    },
    attention: [],
    attentionMore: 0,
    map: { couriers: [], waitingDeliveries: [] },
    dispatchStop: { active: false, until: null },
  }

  beforeEach(() => {
    jest.clearAllMocks()
    const config = new Configuration({
      fetchApi: mockFetch,
      basePath: 'http://localhost:3000',
      accessToken: () => Promise.resolve('test-admin-bearer-token'),
    })
    api = new DispatchBoardApi(config)
  })

  it('registered on BackendAdminSdk via sdk.dispatchBoard()', () => {
    const sdk = new BackendAdminSdk(
      new Configuration({
        fetchApi: mockFetch,
        basePath: 'http://localhost:3000',
        accessToken: () => Promise.resolve('token'),
      }),
    )
    expect(sdk.dispatchBoard()).toBeInstanceOf(DispatchBoardApi)
  })

  it('getBoard: GETs /api/admin/v1/dispatch/board with exact path, GET method, and Bearer token', async () => {
    mockFetch.mockResolvedValueOnce(createMockResponse(sampleBoardDto, 200))

    const result = await api.getBoard()

    expect(mockFetch).toHaveBeenCalledTimes(1)
    const [url, requestInit] = mockFetch.mock.calls[0]
    expect(url).toBe('http://localhost:3000/api/admin/v1/dispatch/board')
    expect(requestInit.method).toBe('GET')
    expect(requestInit.headers['Authorization']).toBe('Bearer test-admin-bearer-token')
    expect(result).toEqual(sampleBoardDto)
  })

  it('getBoard: parses pairedDeliveryId and pairedOrderReference on attention rows, and paired on map courier carrying jobs (spec 0048, AC-12)', async () => {
    const boardWithPairs: DispatchBoardDto = {
      ...sampleBoardDto,
      attention: [
        {
          id: 'att-1',
          kind: 'OFFER_UNANSWERED',
          since: '2026-11-22T10:00:00.000Z',
          deliveryId: 'del-1',
          sosId: null,
          issueId: null,
          threadId: null,
          status: 'ASSIGNING_COURIER',
          courierId: 'c-1',
          orderReference: 'REF1',
          restaurantName: 'Grill',
          riderName: 'Nikos',
          customerLabel: 'Maria',
          detail: 'Offered',
          held: false,
          pairedDeliveryId: 'del-2',
          pairedOrderReference: 'REF2',
        },
      ],
      map: {
        couriers: [
          {
            id: 'c-1',
            name: 'Nikos',
            latitude: 39.36,
            longitude: 22.94,
            state: 'BUSY',
            carrying: [
              { deliveryId: 'del-1', orderReference: 'REF1', offered: false, paired: true },
              { deliveryId: 'del-2', orderReference: 'REF2', offered: true, paired: true },
            ],
          },
        ],
        waitingDeliveries: [],
      },
    }

    mockFetch.mockResolvedValueOnce(createMockResponse(boardWithPairs, 200))

    const result = await api.getBoard()

    expect(result.attention[0]?.pairedDeliveryId).toBe('del-2')
    expect(result.attention[0]?.pairedOrderReference).toBe('REF2')
    expect(result.map.couriers[0]?.carrying[0]?.paired).toBe(true)
    expect(result.map.couriers[0]?.carrying[1]?.paired).toBe(true)
  })
})
