import { AddressNoteApi } from './AddressNoteApi'
import type { AddressNoteAdminDto, AddressNoteSearchAdminDto } from './AddressNoteApi'
import { Configuration } from '../runtime'
import { BackendAdminSdk } from '../backend-admin-sdk'

// Spec 0053 (row 82, AC-7): hand-edited API client for address notes,
// verified at the HTTP fetch boundary.
function jsonResponse(body: unknown, status = 200): Response {
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

function emptyResponse(status = 204): Response {
  return {
    status,
    ok: status >= 200 && status < 300,
    headers: {
      get: () => null,
    },
    json: () => Promise.reject(new Error('no json')),
    text: () => Promise.resolve(''),
    clone: function () {
      return this
    },
  } as unknown as Response
}

describe('AddressNoteApi (spec 0053, AC-7)', () => {
  const mockFetch = jest.fn()
  let api: AddressNoteApi

  beforeEach(() => {
    jest.clearAllMocks()
    api = new AddressNoteApi(
      new Configuration({
        fetchApi: mockFetch,
        basePath: 'http://localhost:3000',
        accessToken: () => Promise.resolve('admin-auth-token-123'),
      })
    )
  })

  const lastCall = () => {
    expect(mockFetch).toHaveBeenCalledTimes(1)
    const [url, init] = mockFetch.mock.calls[0]
    return {
      url: url as string,
      init: init as RequestInit & { headers: Record<string, string> },
    }
  }

  describe('flagged (AC-7)', () => {
    it('GET /api/admin/v1/address-notes/flagged with bearer token', async () => {
      const mockResult: AddressNoteAdminDto[] = [
        {
          id: 'note-1',
          note: 'Buzz 4B for gate',
          latitude: 39.364,
          longitude: 22.948,
          address: 'Iasonos 42, Volos',
          actor: 'COURIER',
          authorCourierId: 'c-1',
          authorName: 'Nikos',
          upvotes: 3,
          flags: [
            {
              id: 'flag-1',
              reason: 'Door code changed',
              createdAt: '2026-11-21T10:00:00Z',
            },
          ],
          createdAt: '2026-11-10T12:00:00Z',
          updatedAt: '2026-11-10T12:00:00Z',
          lastConfirmedAt: '2026-11-20T15:00:00Z',
        },
      ]

      mockFetch.mockResolvedValueOnce(jsonResponse(mockResult))

      const result = await api.flagged()

      const { url, init } = lastCall()
      expect(url).toBe('http://localhost:3000/api/admin/v1/address-notes/flagged')
      expect(init.method).toBe('GET')
      expect(init.headers['Authorization']).toBe('Bearer admin-auth-token-123')
      expect(result).toEqual(mockResult)
    })

    it('throws when the server answers with an error', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ message: 'Forbidden' }, 403))
      await expect(api.flagged()).rejects.toBeDefined()
    })
  })

  describe('search (AC-7, cross check 9)', () => {
    it('GET /api/admin/v1/address-notes with search, page, and perPage query params and bearer token', async () => {
      const mockResult: AddressNoteSearchAdminDto = {
        data: [
          {
            id: 'note-2',
            note: 'Ring bell twice',
            latitude: 39.361,
            longitude: 22.942,
            address: 'Dimitriados 10',
            actor: 'COURIER',
            authorCourierId: 'c-2',
            authorName: 'Maria',
            upvotes: 1,
            flags: [],
            createdAt: '2026-11-15T08:00:00Z',
            updatedAt: '2026-11-15T08:00:00Z',
            lastConfirmedAt: '2026-11-18T09:00:00Z',
          },
        ],
        total: 1,
        page: 1,
        perPage: 20,
      }

      mockFetch.mockResolvedValueOnce(jsonResponse(mockResult))

      const result = await api.search({ search: 'Dimitriados', page: 1, perPage: 20 })

      const { url, init } = lastCall()
      const parsed = new URL(url)
      expect(parsed.pathname).toBe('/api/admin/v1/address-notes')
      expect(parsed.searchParams.get('search')).toBe('Dimitriados')
      expect(parsed.searchParams.get('page')).toBe('1')
      expect(parsed.searchParams.get('perPage')).toBe('20')
      expect(init.method).toBe('GET')
      expect(init.headers['Authorization']).toBe('Bearer admin-auth-token-123')
      expect(result).toEqual(mockResult)
    })

    it('omits search query param when undefined or empty', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ data: [], total: 0, page: 2, perPage: 10 }))

      await api.search({ page: 2, perPage: 10 })

      const parsed = new URL(lastCall().url)
      expect(parsed.searchParams.has('search')).toBe(false)
      expect(parsed.searchParams.get('page')).toBe('2')
      expect(parsed.searchParams.get('perPage')).toBe('10')
    })
  })

  describe('remove (AC-7)', () => {
    it('DELETE /api/admin/v1/address-notes/{id} with bearer token', async () => {
      mockFetch.mockResolvedValueOnce(emptyResponse(204))

      await api.remove('note-123')

      const { url, init } = lastCall()
      expect(url).toBe('http://localhost:3000/api/admin/v1/address-notes/note-123')
      expect(init.method).toBe('DELETE')
      expect(init.headers['Authorization']).toBe('Bearer admin-auth-token-123')
    })

    it('encodes special characters in the note id to prevent URL injection', async () => {
      mockFetch.mockResolvedValueOnce(emptyResponse(204))

      await api.remove('note/123?test=1#part')

      expect(lastCall().url).toBe('http://localhost:3000/api/admin/v1/address-notes/note%2F123%3Ftest%3D1%23part')
    })

    it('throws when the server answers 404', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ message: 'Note not found' }, 404))
      await expect(api.remove('note-unknown')).rejects.toBeDefined()
    })
  })

  describe('dismissFlags (AC-7)', () => {
    it('POST /api/admin/v1/address-notes/{id}/dismiss-flags with bearer token and json content-type', async () => {
      mockFetch.mockResolvedValueOnce(emptyResponse(204))

      await api.dismissFlags('note-456')

      const { url, init } = lastCall()
      expect(url).toBe('http://localhost:3000/api/admin/v1/address-notes/note-456/dismiss-flags')
      expect(init.method).toBe('POST')
      expect(init.headers['Authorization']).toBe('Bearer admin-auth-token-123')
      expect(init.headers['Content-Type']).toBe('application/json')
    })

    it('encodes special characters in the note id', async () => {
      mockFetch.mockResolvedValueOnce(emptyResponse(204))

      await api.dismissFlags('note/flagged/item')

      expect(lastCall().url).toBe('http://localhost:3000/api/admin/v1/address-notes/note%2Fflagged%2Fitem/dismiss-flags')
    })
  })

  describe('BackendAdminSdk wiring', () => {
    it('BackendAdminSdk.addressNotes() returns an AddressNoteApi instance', () => {
      const sdk = new BackendAdminSdk({ accessToken: 'test-token' })
      expect(sdk.addressNotes()).toBeInstanceOf(AddressNoteApi)
    })
  })
})
