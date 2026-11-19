import { configureStore, type AnyAction } from '@reduxjs/toolkit'
import { refreshReviewRequests, reviewRequestApi } from './reviewRequestApi'
import { deliveriesApi } from './deliveriesApi'
import { prepareAdminSdk } from '.'
import { Tags } from './utils/tags'
import { authSlice } from '@/modules/auth/slices/authSlice'

jest.mock('.', () => {
  const actual = jest.requireActual('.')
  return { ...actual, prepareAdminSdk: jest.fn() }
})

const mockPrepareAdminSdk = prepareAdminSdk as jest.Mock

function setupTestStore(onAction?: (action: AnyAction) => void) {
  return configureStore({
    reducer: {
      [reviewRequestApi.reducerPath]: reviewRequestApi.reducer,
      [authSlice.name]: authSlice.reducer,
    },
    middleware: (getDefaultMiddleware) => {
      const middleware = getDefaultMiddleware({ serializableCheck: false, immutableCheck: false }).concat(
        reviewRequestApi.middleware
      )
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

describe('reviewRequestApi (spec 0038, AC-5, AC-6, AC-7, AC-13)', () => {
  const sdk = {
    list: jest.fn(),
    count: jest.fn(),
    answer: jest.fn(),
    settingChanges: jest.fn(),
  }

  const deliveriesSdk = {
    getDeliveryEvents: jest.fn(),
    getDelivery: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockPrepareAdminSdk.mockReturnValue({
      reviewRequests: () => sdk,
      deliveries: () => deliveriesSdk,
    })
    deliveriesSdk.getDeliveryEvents.mockResolvedValue([])
    deliveriesSdk.getDelivery.mockResolvedValue({ id: 'del-1' })
  })

  it('defines the reviewRequests and settingChanges tags in Tags and tagTypes', () => {
    expect(Tags.reviewRequests).toBe('ReviewRequests')
    expect(Tags.settingChanges).toBe('SettingChanges')
    expect(Tags.tagTypes).toContain('ReviewRequests')
    expect(Tags.tagTypes).toContain('SettingChanges')
  })

  it('getReviewRequests passes status, page, and perPage to SDK list with stored token', async () => {
    sdk.list.mockResolvedValue({
      data: [],
      pagination: { currentPage: 1, totalPages: 1, totalItems: 0 },
    })

    const store = setupTestStore()
    const result = await store.dispatch(
      reviewRequestApi.endpoints.getReviewRequests.initiate({
        status: 'OPEN',
        page: 2,
        perPage: 20,
      })
    )

    expect(mockPrepareAdminSdk).toHaveBeenCalledWith('admin-test-token')
    expect(sdk.list).toHaveBeenCalledWith('OPEN', 2, 20)
    expect(result.data).toEqual({
      data: [],
      pagination: { currentPage: 1, totalPages: 1, totalItems: 0 },
    })
  })

  it('getReviewRequestCount calls SDK count with stored token', async () => {
    sdk.count.mockResolvedValue({ open: 3, overdue: 1 })

    const store = setupTestStore()
    const result = await store.dispatch(reviewRequestApi.endpoints.getReviewRequestCount.initiate())

    expect(mockPrepareAdminSdk).toHaveBeenCalledWith('admin-test-token')
    expect(sdk.count).toHaveBeenCalledTimes(1)
    expect(result.data).toEqual({ open: 3, overdue: 1 })
  })

  it('answerReviewRequest calls SDK answer with id and input, and invalidates reviewRequests, deliveryEvents and deliveries tags', async () => {
    sdk.answer.mockResolvedValue({ id: 'req-1', status: 'ANSWERED' })

    const actions: AnyAction[] = []
    const store = setupTestStore((action) => actions.push(action))

    // Subscribe to queries providing Tags.reviewRequests, Tags.deliveryEvents, and Tags.deliveries
    void store.dispatch(
      reviewRequestApi.endpoints.getReviewRequests.initiate({ status: 'OPEN', page: 1, perPage: 20 })
    )
    void store.dispatch(
      deliveriesApi.endpoints.getDeliveryEvents.initiate({ deliveryId: 'del-1' })
    )
    void store.dispatch(
      deliveriesApi.endpoints.getDelivery.initiate({ id: 'del-1' })
    )
    await new Promise((resolve) => setTimeout(resolve, 0))
    actions.length = 0

    await store.dispatch(
      reviewRequestApi.endpoints.answerReviewRequest.initiate({
        id: 'req-1',
        input: { outcome: 'STANDS', answer: 'The decision was correct.' },
      })
    )
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(sdk.answer).toHaveBeenCalledWith('req-1', {
      outcome: 'STANDS',
      answer: 'The decision was correct.',
    })

    // Confirm that getReviewRequests, getDeliveryEvents, and getDelivery were refetched
    const refetched = actions
      .filter((a) => a.type === 'api/executeQuery/pending')
      .map((a) => a.meta?.arg?.endpointName)
    expect(refetched).toContain('getReviewRequests')
    expect(refetched).toContain('getDeliveryEvents')
    expect(refetched).toContain('getDelivery')
  })

  // Spec 0038 (AC-6, AC-7): answering a review can add a pay correction and record timeline events;
  // it invalidates reviewRequests, deliveryEvents and deliveries so timelines and pay refetch.
  it.each([
    ['reviewRequests', () => reviewRequestApi.endpoints.getReviewRequests.initiate({ status: 'OPEN', page: 1, perPage: 20 }), 'getReviewRequests'],
    ['deliveryEvents', () => deliveriesApi.endpoints.getDeliveryEvents.initiate({ deliveryId: 'del-1' }), 'getDeliveryEvents'],
    ['deliveries', () => deliveriesApi.endpoints.getDelivery.initiate({ id: 'del-1' }), 'getDelivery'],
  ] as const)('answerReviewRequest invalidates Tags.%s tag (spec 0038, AC-7)', async (_tagName, initiateQuery, expectedEndpointName) => {
    sdk.answer.mockResolvedValue({ id: 'req-1', status: 'ANSWERED' })

    const actions: AnyAction[] = []
    const store = setupTestStore((action) => actions.push(action))

    void store.dispatch(initiateQuery() as any)
    await new Promise((resolve) => setTimeout(resolve, 0))
    actions.length = 0

    await store.dispatch(
      reviewRequestApi.endpoints.answerReviewRequest.initiate({
        id: 'req-1',
        input: { outcome: 'STANDS', answer: 'The decision was correct.' },
      })
    )
    await new Promise((resolve) => setTimeout(resolve, 0))

    const refetched = actions
      .filter((a) => a.type === 'api/executeQuery/pending')
      .map((a) => a.meta?.arg?.endpointName)
    expect(refetched).toContain(expectedEndpointName)
  })

  it('getSettingChanges calls SDK settingChanges with page and perPage', async () => {
    sdk.settingChanges.mockResolvedValue({
      data: [],
      pagination: { currentPage: 1, totalPages: 1, totalItems: 0 },
    })

    const store = setupTestStore()
    const result = await store.dispatch(
      reviewRequestApi.endpoints.getSettingChanges.initiate({ page: 1, perPage: 20 })
    )

    expect(mockPrepareAdminSdk).toHaveBeenCalledWith('admin-test-token')
    expect(sdk.settingChanges).toHaveBeenCalledWith(1, 20)
    expect(result.data).toEqual({
      data: [],
      pagination: { currentPage: 1, totalPages: 1, totalItems: 0 },
    })
  })

  it('refreshReviewRequests dispatches tag invalidation for reviewRequests', () => {
    const action = refreshReviewRequests()
    expect(action).toEqual(
      expect.objectContaining({
        type: 'api/invalidateTags',
        payload: [Tags.reviewRequests],
      })
    )
  })
})
