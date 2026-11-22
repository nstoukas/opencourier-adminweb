import { configureStore, type AnyAction } from '@reduxjs/toolkit'
import {
  addressNoteApi,
  useGetFlaggedAddressNotesQuery,
  useSearchAddressNotesQuery,
  useDeleteAddressNoteMutation,
  useDismissAddressNoteFlagsMutation,
} from './addressNoteApi'
import { prepareAdminSdk } from '.'
import { Tags } from './utils/tags'
import { authSlice } from '@/modules/auth/slices/authSlice'

// Mock the prepareAdminSdk entry point so RTK Query uses our mock SDK
jest.mock('.', () => {
  const actual = jest.requireActual('.')
  return { ...actual, prepareAdminSdk: jest.fn() }
})

const mockPrepareAdminSdk = prepareAdminSdk as jest.Mock

function setupTestStore(onAction?: (action: AnyAction) => void) {
  return configureStore({
    reducer: {
      [addressNoteApi.reducerPath]: addressNoteApi.reducer,
      [authSlice.name]: authSlice.reducer,
    },
    middleware: (getDefaultMiddleware) => {
      const middleware = getDefaultMiddleware({
        serializableCheck: false,
        immutableCheck: false,
      }).concat(addressNoteApi.middleware)
      if (onAction) {
        return middleware.concat(() => (next) => (action: any) => {
          onAction(action)
          return next(action)
        })
      }
      return middleware
    },
    preloadedState: { auth: { accessToken: 'test-admin-token-888' } },
  })
}

describe('addressNoteApi (spec 0053, AC-7)', () => {
  const mockAddressNotesSdk = {
    flagged: jest.fn(),
    search: jest.fn(),
    remove: jest.fn(),
    dismissFlags: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockPrepareAdminSdk.mockReturnValue({
      addressNotes: () => mockAddressNotesSdk,
    })
    mockAddressNotesSdk.flagged.mockResolvedValue([])
    mockAddressNotesSdk.search.mockResolvedValue({ data: [], total: 0, page: 1, perPage: 20 })
    mockAddressNotesSdk.remove.mockResolvedValue(undefined)
    mockAddressNotesSdk.dismissFlags.mockResolvedValue(undefined)
  })

  it('exports all expected hooks', () => {
    expect(typeof useGetFlaggedAddressNotesQuery).toBe('function')
    expect(typeof useSearchAddressNotesQuery).toBe('function')
    expect(typeof useDeleteAddressNoteMutation).toBe('function')
    expect(typeof useDismissAddressNoteFlagsMutation).toBe('function')
  })

  it('defines the addressNotes tag in Tags and tagTypes', () => {
    expect(Tags.addressNotes).toBe('AddressNotes')
    expect(Tags.tagTypes).toContain('AddressNotes')
  })

  describe('getFlaggedAddressNotes query (AC-7)', () => {
    it('calls SDK flagged method with accessToken from store', async () => {
      const mockFlaggedNotes = [
        {
          id: 'note-flagged-1',
          note: 'Dog in garden',
          latitude: 39.36,
          longitude: 22.94,
          address: 'Ermou 15',
          actor: 'COURIER',
          authorCourierId: 'c-1',
          authorName: 'Kostas',
          upvotes: 2,
          flags: [{ id: 'f-1', reason: 'Old info', createdAt: '2026-11-20T10:00:00Z' }],
          createdAt: '2026-11-10T10:00:00Z',
          updatedAt: '2026-11-10T10:00:00Z',
          lastConfirmedAt: '2026-11-15T10:00:00Z',
        },
      ]
      mockAddressNotesSdk.flagged.mockResolvedValueOnce(mockFlaggedNotes)

      const store = setupTestStore()
      const result = await store.dispatch(
        addressNoteApi.endpoints.getFlaggedAddressNotes.initiate()
      )

      expect(mockPrepareAdminSdk).toHaveBeenCalledWith('test-admin-token-888')
      expect(mockAddressNotesSdk.flagged).toHaveBeenCalledTimes(1)
      expect(result.data).toEqual(mockFlaggedNotes)
    })

    it('returns formatted error when SDK flagged method throws', async () => {
      mockAddressNotesSdk.flagged.mockRejectedValueOnce(new Error('Network failure'))

      const store = setupTestStore()
      const result = await store.dispatch(
        addressNoteApi.endpoints.getFlaggedAddressNotes.initiate()
      )

      expect('error' in result ? result.error : undefined).toBeDefined()
    })
  })

  describe('searchAddressNotes query (AC-7, cross check 9)', () => {
    it('passes search parameters to SDK search method', async () => {
      const mockSearchResult = {
        data: [{ id: 'note-1', note: 'Gate code 1234' }],
        total: 1,
        page: 1,
        perPage: 20,
      }
      mockAddressNotesSdk.search.mockResolvedValueOnce(mockSearchResult)

      const store = setupTestStore()
      const result = await store.dispatch(
        addressNoteApi.endpoints.searchAddressNotes.initiate({
          search: 'Gate code',
          page: 1,
          perPage: 20,
        })
      )

      expect(mockPrepareAdminSdk).toHaveBeenCalledWith('test-admin-token-888')
      expect(mockAddressNotesSdk.search).toHaveBeenCalledWith({
        search: 'Gate code',
        page: 1,
        perPage: 20,
      })
      expect(result.data).toEqual(mockSearchResult)
    })

    it('returns formatted error when SDK search throws', async () => {
      mockAddressNotesSdk.search.mockRejectedValueOnce(new Error('Search failed'))

      const store = setupTestStore()
      const result = await store.dispatch(
        addressNoteApi.endpoints.searchAddressNotes.initiate({
          search: 'something',
          page: 1,
          perPage: 20,
        })
      )

      expect('error' in result ? result.error : undefined).toBeDefined()
    })
  })

  describe('deleteAddressNote mutation (AC-7)', () => {
    it('calls SDK remove method, returns { data: null }, and invalidates addressNotes tag', async () => {
      mockAddressNotesSdk.remove.mockResolvedValueOnce(undefined)

      const actions: AnyAction[] = []
      const store = setupTestStore((action) => actions.push(action))

      // Subscribe to query providing Tags.addressNotes
      void store.dispatch(addressNoteApi.endpoints.getFlaggedAddressNotes.initiate())
      await new Promise((resolve) => setTimeout(resolve, 0))
      actions.length = 0

      const result = await store.dispatch(
        addressNoteApi.endpoints.deleteAddressNote.initiate({ id: 'note-delete-1' })
      )
      await new Promise((resolve) => setTimeout(resolve, 0))

      expect(mockPrepareAdminSdk).toHaveBeenCalledWith('test-admin-token-888')
      expect(mockAddressNotesSdk.remove).toHaveBeenCalledWith('note-delete-1')
      expect(result).toHaveProperty('data', null)

      // Confirm that getFlaggedAddressNotes was refetched due to tag invalidation
      const refetched = actions
        .filter((a) => a.type === 'api/executeQuery/pending')
        .map((a) => a.meta?.arg?.endpointName)
      expect(refetched).toContain('getFlaggedAddressNotes')
    })

    it('returns formatted error when SDK remove throws', async () => {
      mockAddressNotesSdk.remove.mockRejectedValueOnce(new Error('Delete forbidden'))

      const store = setupTestStore()
      const result = await store.dispatch(
        addressNoteApi.endpoints.deleteAddressNote.initiate({ id: 'note-delete-1' })
      )

      expect('error' in result ? result.error : undefined).toBeDefined()
    })
  })

  describe('dismissAddressNoteFlags mutation (AC-7)', () => {
    it('calls SDK dismissFlags method, returns { data: null }, and invalidates addressNotes tag', async () => {
      mockAddressNotesSdk.dismissFlags.mockResolvedValueOnce(undefined)

      const actions: AnyAction[] = []
      const store = setupTestStore((action) => actions.push(action))

      // Subscribe to query providing Tags.addressNotes
      void store.dispatch(addressNoteApi.endpoints.getFlaggedAddressNotes.initiate())
      await new Promise((resolve) => setTimeout(resolve, 0))
      actions.length = 0

      const result = await store.dispatch(
        addressNoteApi.endpoints.dismissAddressNoteFlags.initiate({ id: 'note-dismiss-1' })
      )
      await new Promise((resolve) => setTimeout(resolve, 0))

      expect(mockPrepareAdminSdk).toHaveBeenCalledWith('test-admin-token-888')
      expect(mockAddressNotesSdk.dismissFlags).toHaveBeenCalledWith('note-dismiss-1')
      expect(result).toHaveProperty('data', null)

      // Confirm that getFlaggedAddressNotes was refetched due to tag invalidation
      const refetched = actions
        .filter((a) => a.type === 'api/executeQuery/pending')
        .map((a) => a.meta?.arg?.endpointName)
      expect(refetched).toContain('getFlaggedAddressNotes')
    })

    it('returns formatted error when SDK dismissFlags throws', async () => {
      mockAddressNotesSdk.dismissFlags.mockRejectedValueOnce(new Error('Dismiss failed'))

      const store = setupTestStore()
      const result = await store.dispatch(
        addressNoteApi.endpoints.dismissAddressNoteFlags.initiate({ id: 'note-dismiss-1' })
      )

      expect('error' in result ? result.error : undefined).toBeDefined()
    })
  })
})
