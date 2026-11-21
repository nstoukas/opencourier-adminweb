import { configureStore, type AnyAction } from '@reduxjs/toolkit'
import { splitRequestApi } from './splitRequestApi'
import { prepareAdminSdk } from '.'
import { Tags } from './utils/tags'
import { authSlice } from '@/modules/auth/slices/authSlice'

jest.mock('.', () => {
  const actual = jest.requireActual('.')
  return { ...actual, prepareAdminSdk: jest.fn() }
})

const mockPrepareAdminSdk = prepareAdminSdk as jest.Mock

// A small Redux store holding only this API and the signed in admin's token.
function setupTestStore(onAction?: (action: AnyAction) => void) {
  return configureStore({
    reducer: {
      [splitRequestApi.reducerPath]: splitRequestApi.reducer,
      [authSlice.name]: authSlice.reducer,
    },
    middleware: (getDefaultMiddleware) => {
      const middleware = getDefaultMiddleware({ serializableCheck: false, immutableCheck: false }).concat(splitRequestApi.middleware)
      if (onAction) {
        return middleware.concat(() => (next) => (action: any) => {
          onAction(action)
          return next(action)
        })
      }
      return middleware
    },
    preloadedState: { auth: { accessToken: 'admin-test-token' } },
  })
}

// Spec 0047 (AC-4, AC-9): the queue, its count and the two answers, as the admin app calls them.
describe('splitRequestApi (spec 0047, AC-4, AC-9)', () => {
  const sdk = { list: jest.fn(), count: jest.fn(), confirm: jest.fn(), refuse: jest.fn() }

  beforeEach(() => {
    jest.clearAllMocks()
    mockPrepareAdminSdk.mockReturnValue({ splitRequests: () => sdk })
  })

  it('has its own cache tag', () => {
    expect(Tags.splitRequests).toBe('SplitRequests')
    expect(Tags.tagTypes).toContain('SplitRequests')
  })

  it('getSplitRequests reads the queue with the stored token', async () => {
    const rows = [{ id: 'split-1', waitedMinutes: 6 }]
    sdk.list.mockResolvedValue(rows)
    const store = setupTestStore()

    const result = await store.dispatch(splitRequestApi.endpoints.getSplitRequests.initiate())

    expect(mockPrepareAdminSdk).toHaveBeenCalledWith('admin-test-token')
    expect(sdk.list).toHaveBeenCalledTimes(1)
    expect(result.data).toEqual(rows)
  })

  it('getSplitRequestCount reads { open } with the stored token', async () => {
    sdk.count.mockResolvedValue({ open: 3 })
    const store = setupTestStore()

    const result = await store.dispatch(splitRequestApi.endpoints.getSplitRequestCount.initiate())

    expect(mockPrepareAdminSdk).toHaveBeenCalledWith('admin-test-token')
    expect(result.data).toEqual({ open: 3 })
  })

  it('confirmSplitRequest with no legs passes none, so the proposal stands', async () => {
    sdk.confirm.mockResolvedValue({ status: 'CONFIRMED' })
    const store = setupTestStore()

    const result = await store.dispatch(splitRequestApi.endpoints.confirmSplitRequest.initiate({ id: 'split-1' }))

    expect(sdk.confirm).toHaveBeenCalledWith('split-1', undefined)
    expect(result).toMatchObject({ data: { status: 'CONFIRMED' } })
  })

  it("confirmSplitRequest with legs passes the admin's boxes", async () => {
    sdk.confirm.mockResolvedValue({ status: 'CONFIRMED' })
    const store = setupTestStore()
    const legs = [{ boxSize: 'MEDIUM' as const }, { boxSize: 'SMALL' as const }]

    await store.dispatch(splitRequestApi.endpoints.confirmSplitRequest.initiate({ id: 'split-1', legs }))

    expect(sdk.confirm).toHaveBeenCalledWith('split-1', legs)
  })

  it('refuseSplitRequest passes the optional sentence', async () => {
    sdk.refuse.mockResolvedValue({ status: 'REFUSED' })
    const store = setupTestStore()

    await store.dispatch(splitRequestApi.endpoints.refuseSplitRequest.initiate({ id: 'split-1', note: 'It fits' }))
    await store.dispatch(splitRequestApi.endpoints.refuseSplitRequest.initiate({ id: 'split-2' }))

    expect(sdk.refuse).toHaveBeenNthCalledWith(1, 'split-1', 'It fits')
    expect(sdk.refuse).toHaveBeenNthCalledWith(2, 'split-2', undefined)
  })

  it("a 409 from the server comes back as an error carrying the server's sentence, not as a saved answer (AC-9)", async () => {
    const refusal = { statusCode: 409, message: 'This split request was already answered or closed.' }
    sdk.confirm.mockRejectedValue(refusal)
    sdk.refuse.mockRejectedValue(refusal)
    const store = setupTestStore()

    const confirmed = await store.dispatch(splitRequestApi.endpoints.confirmSplitRequest.initiate({ id: 'split-1' }))
    const refused = await store.dispatch(splitRequestApi.endpoints.refuseSplitRequest.initiate({ id: 'split-1' }))

    expect(confirmed).toMatchObject({ error: refusal })
    expect(refused).toMatchObject({ error: refusal })
    expect((confirmed as any).data).toBeUndefined()
    // `.unwrap()` is what the page awaits: it must reject with the same sentence.
    await expect(
      store.dispatch(splitRequestApi.endpoints.confirmSplitRequest.initiate({ id: 'split-1' })).unwrap()
    ).rejects.toMatchObject({ message: 'This split request was already answered or closed.' })
  })

  it('a failed read of the queue comes back as an error, not as an empty queue', async () => {
    sdk.list.mockRejectedValue({ statusCode: 500, message: 'Server error' })
    const store = setupTestStore()

    const result = await store.dispatch(splitRequestApi.endpoints.getSplitRequests.initiate())

    expect(result.data).toBeUndefined()
    expect(result.error).toMatchObject({ statusCode: 500 })
  })

  describe('after an answer, the queue and its count are read again', () => {
    // The tags an answer's finished action says are out of date.
    const invalidatedBy = async (answer: (store: ReturnType<typeof setupTestStore>) => Promise<unknown>) => {
      const store = setupTestStore()
      // Two live readers: the page's list and the sidebar's count.
      void store.dispatch(splitRequestApi.endpoints.getSplitRequests.initiate())
      void store.dispatch(splitRequestApi.endpoints.getSplitRequestCount.initiate())
      await new Promise((resolve) => setTimeout(resolve, 0))
      sdk.list.mockClear()
      sdk.count.mockClear()

      await answer(store)
      await new Promise((resolve) => setTimeout(resolve, 0))
    }

    beforeEach(() => {
      sdk.list.mockResolvedValue([])
      sdk.count.mockResolvedValue({ open: 1 })
      sdk.confirm.mockResolvedValue({ status: 'CONFIRMED' })
      sdk.refuse.mockResolvedValue({ status: 'REFUSED' })
    })

    it('after a confirm', async () => {
      await invalidatedBy((store) => store.dispatch(splitRequestApi.endpoints.confirmSplitRequest.initiate({ id: 'split-1' })))
      expect(sdk.list).toHaveBeenCalledTimes(1)
      expect(sdk.count).toHaveBeenCalledTimes(1)
    })

    it('after a refusal', async () => {
      await invalidatedBy((store) => store.dispatch(splitRequestApi.endpoints.refuseSplitRequest.initiate({ id: 'split-1' })))
      expect(sdk.list).toHaveBeenCalledTimes(1)
      expect(sdk.count).toHaveBeenCalledTimes(1)
    })
  })
})
