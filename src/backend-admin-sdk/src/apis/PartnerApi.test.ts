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
