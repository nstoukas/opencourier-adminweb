import { configureStore } from '@reduxjs/toolkit'
import { partnersApi } from './partnersApi'
import { prepareAdminSdk } from '.'
import { authSlice } from '@/modules/auth/slices/authSlice'
import type { PartnerPaginatedAdminDto } from '../backend-admin-sdk'

jest.mock('.', () => {
  const actual = jest.requireActual('.')
  return {
    ...actual,
    prepareAdminSdk: jest.fn(),
  }
})

const mockPrepareAdminSdk = prepareAdminSdk as jest.Mock

// A fresh store per test, so RTK Query's cache never answers a request from an earlier test.
function setupTestStore() {
  return configureStore({
    reducer: {
      [partnersApi.reducerPath]: partnersApi.reducer,
      [authSlice.name]: authSlice.reducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({ serializableCheck: false, immutableCheck: false }).concat(partnersApi.middleware),
    preloadedState: { auth: { accessToken: 'admin-token' } },
  })
}

const emptyPage: PartnerPaginatedAdminDto = {
  data: [],
  pagination: {
    totalItems: 0,
    perPage: 10,
    totalPages: 0,
    currentItems: 0,
    currentPage: 1,
    prevPage: null,
    nextPage: null,
  },
}

// Row 106: the getPartners endpoint hands the search to the SDK only when there is one.
describe('partnersApi getPartners search (row 106)', () => {
  let mockGetPartners: jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()
    mockGetPartners = jest.fn().mockResolvedValue(emptyPage)
    mockPrepareAdminSdk.mockReturnValue({ partners: () => ({ getPartners: mockGetPartners }) })
  })

  it('passes search to sdk.partners().getPartners with page and perPage', async () => {
    const store = setupTestStore()

    const result = await store.dispatch(
      partnersApi.endpoints.getPartners.initiate({ page: 2, perPage: 10, search: 'Νόσης' })
    )

    expect(mockPrepareAdminSdk).toHaveBeenCalledWith('admin-token')
    expect(mockGetPartners).toHaveBeenCalledTimes(1)
    expect(mockGetPartners).toHaveBeenCalledWith({ page: 2, perPage: 10, search: 'Νόσης' })
    expect(result.data).toEqual(emptyPage)
  })

  it.each([
    ['undefined', undefined],
    ['an empty string', ''],
  ])('sends no search key at all when search is %s', async (_label, search) => {
    const store = setupTestStore()

    await store.dispatch(partnersApi.endpoints.getPartners.initiate({ page: 1, perPage: 10, search }))

    expect(mockGetPartners).toHaveBeenCalledTimes(1)
    const sent = mockGetPartners.mock.calls[0][0]
    expect(sent).toEqual({ page: 1, perPage: 10 })
    expect(Object.keys(sent)).not.toContain('search')
  })
})
