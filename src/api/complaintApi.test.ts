import { configureStore, type AnyAction } from '@reduxjs/toolkit'
import {
  complaintApi,
  fetchComplaintPhoto,
  useGetComplaintsQuery,
  useGetComplaintQuery,
  useGetComplaintDeliveryRidersQuery,
  useFileComplaintMutation,
  useDecideComplaintMutation,
  useWithdrawComplaintMutation,
  useReplyForRiderMutation,
} from './complaintApi'
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
      [complaintApi.reducerPath]: complaintApi.reducer,
      [authSlice.name]: authSlice.reducer,
    },
    middleware: (getDefaultMiddleware) => {
      const middleware = getDefaultMiddleware({
        serializableCheck: false,
        immutableCheck: false,
      }).concat(complaintApi.middleware)
      if (onAction) {
        return middleware.concat(() => (next) => (action: any) => {
          onAction(action)
          return next(action)
        })
      }
      return middleware
    },
    preloadedState: { auth: { accessToken: 'test-admin-token-777' } },
  })
}

describe('complaintApi (spec 0052, AC-1 to AC-6, AC-9, AC-10)', () => {
  const mockComplaintsSdk = {
    list: jest.fn(),
    get: jest.fn(),
    deliveryRiders: jest.fn(),
    file: jest.fn(),
    decide: jest.fn(),
    withdraw: jest.fn(),
    replyForRider: jest.fn(),
    photo: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockPrepareAdminSdk.mockReturnValue({
      complaints: () => mockComplaintsSdk,
    })
    mockComplaintsSdk.list.mockResolvedValue({
      data: [],
      pagination: { currentPage: 1, totalPages: 1, totalItems: 0 },
    })
    mockComplaintsSdk.get.mockResolvedValue({ id: 'cmp-1' })
    mockComplaintsSdk.deliveryRiders.mockResolvedValue([])
    mockComplaintsSdk.file.mockResolvedValue({ id: 'cmp-new' })
    mockComplaintsSdk.decide.mockResolvedValue({ id: 'cmp-1', status: 'DECIDED' })
    mockComplaintsSdk.withdraw.mockResolvedValue({ id: 'cmp-1', status: 'WITHDRAWN' })
    mockComplaintsSdk.replyForRider.mockResolvedValue({ id: 'cmp-1', riderReply: 'reply' })
  })

  it('exports all expected hooks', () => {
    expect(typeof useGetComplaintsQuery).toBe('function')
    expect(typeof useGetComplaintQuery).toBe('function')
    expect(typeof useGetComplaintDeliveryRidersQuery).toBe('function')
    expect(typeof useFileComplaintMutation).toBe('function')
    expect(typeof useDecideComplaintMutation).toBe('function')
    expect(typeof useWithdrawComplaintMutation).toBe('function')
    expect(typeof useReplyForRiderMutation).toBe('function')
  })

  it('defines the complaints tag in Tags and tagTypes', () => {
    expect(Tags.complaints).toBe('Complaints')
    expect(Tags.tagTypes).toContain('Complaints')
  })

  describe('getComplaints query (AC-6)', () => {
    it('passes query arguments to SDK list method with token from store', async () => {
      const mockResult = {
        data: [{ id: 'cmp-1', text: 'Late' }],
        pagination: { currentPage: 1, totalPages: 1, totalItems: 1 },
      }
      mockComplaintsSdk.list.mockResolvedValueOnce(mockResult)

      const store = setupTestStore()
      const result = await store.dispatch(
        complaintApi.endpoints.getComplaints.initiate({
          status: 'OPEN',
          about: 'RIDER',
          page: 1,
          perPage: 20,
        })
      )

      expect(mockPrepareAdminSdk).toHaveBeenCalledWith('test-admin-token-777')
      expect(mockComplaintsSdk.list).toHaveBeenCalledWith({
        status: 'OPEN',
        about: 'RIDER',
        page: 1,
        perPage: 20,
      })
      expect(result.data).toEqual(mockResult)
    })

    it('returns formatted error when SDK list throws', async () => {
      mockComplaintsSdk.list.mockRejectedValueOnce(new Error('Network error'))

      const store = setupTestStore()
      const result = await store.dispatch(
        complaintApi.endpoints.getComplaints.initiate({ page: 1, perPage: 20 })
      )

      expect(result.error).toBeDefined()
    })
  })

  describe('getComplaint query (AC-6)', () => {
    it('passes id to SDK get method with token from store', async () => {
      const mockComplaint = { id: 'cmp-99', text: 'Rude staff' }
      mockComplaintsSdk.get.mockResolvedValueOnce(mockComplaint)

      const store = setupTestStore()
      const result = await store.dispatch(complaintApi.endpoints.getComplaint.initiate({ id: 'cmp-99' }))

      expect(mockPrepareAdminSdk).toHaveBeenCalledWith('test-admin-token-777')
      expect(mockComplaintsSdk.get).toHaveBeenCalledWith('cmp-99')
      expect(result.data).toEqual(mockComplaint)
    })
  })

  describe('getComplaintDeliveryRiders query (cross check 3)', () => {
    it('passes deliveryId to SDK deliveryRiders method', async () => {
      const mockRiders = [{ id: 'c-1', name: 'Nikos' }]
      mockComplaintsSdk.deliveryRiders.mockResolvedValueOnce(mockRiders)

      const store = setupTestStore()
      const result = await store.dispatch(
        complaintApi.endpoints.getComplaintDeliveryRiders.initiate({ deliveryId: 'del-101' })
      )

      expect(mockPrepareAdminSdk).toHaveBeenCalledWith('test-admin-token-777')
      expect(mockComplaintsSdk.deliveryRiders).toHaveBeenCalledWith('del-101')
      expect(result.data).toEqual(mockRiders)
    })
  })

  describe('fileComplaint mutation (AC-3, cross check 3)', () => {
    it('passes complaint input to SDK file method and invalidates complaints tag', async () => {
      const input = {
        deliveryId: 'del-200',
        category: 'LATE' as const,
        text: 'Order arrived cold and late.',
        aboutCourierId: 'c-5',
      }
      const created = { id: 'cmp-new', ...input }
      mockComplaintsSdk.file.mockResolvedValueOnce(created)

      const actions: AnyAction[] = []
      const store = setupTestStore((action) => actions.push(action))

      // Subscribe to query providing Tags.complaints
      void store.dispatch(
        complaintApi.endpoints.getComplaints.initiate({ status: 'OPEN', page: 1, perPage: 20 })
      )
      await new Promise((resolve) => setTimeout(resolve, 0))
      actions.length = 0

      const result = await store.dispatch(complaintApi.endpoints.fileComplaint.initiate(input))
      await new Promise((resolve) => setTimeout(resolve, 0))

      expect(mockPrepareAdminSdk).toHaveBeenCalledWith('test-admin-token-777')
      expect(mockComplaintsSdk.file).toHaveBeenCalledWith(input)
      expect(result).toHaveProperty('data', created)

      // Confirm that getComplaints was refetched due to tag invalidation
      const refetched = actions
        .filter((a) => a.type === 'api/executeQuery/pending')
        .map((a) => a.meta?.arg?.endpointName)
      expect(refetched).toContain('getComplaints')
    })
  })

  describe('decideComplaint mutation (AC-5, AC-6)', () => {
    it('passes id and outcome to SDK decide method and invalidates complaints tag', async () => {
      mockComplaintsSdk.decide.mockResolvedValueOnce({ id: 'cmp-1', outcome: 'Resolved by call.' })

      const actions: AnyAction[] = []
      const store = setupTestStore((action) => actions.push(action))

      // Subscribe to query providing Tags.complaints
      void store.dispatch(complaintApi.endpoints.getComplaint.initiate({ id: 'cmp-1' }))
      await new Promise((resolve) => setTimeout(resolve, 0))
      actions.length = 0

      const result = await store.dispatch(
        complaintApi.endpoints.decideComplaint.initiate({ id: 'cmp-1', outcome: 'Resolved by call.' })
      )
      await new Promise((resolve) => setTimeout(resolve, 0))

      expect(mockPrepareAdminSdk).toHaveBeenCalledWith('test-admin-token-777')
      expect(mockComplaintsSdk.decide).toHaveBeenCalledWith('cmp-1', 'Resolved by call.')
      expect(result).toHaveProperty('data', { id: 'cmp-1', outcome: 'Resolved by call.' })

      // Confirm that getComplaint was refetched
      const refetched = actions
        .filter((a) => a.type === 'api/executeQuery/pending')
        .map((a) => a.meta?.arg?.endpointName)
      expect(refetched).toContain('getComplaint')
    })
  })

  describe('withdrawComplaint mutation (AC-5, cross check 6)', () => {
    it('passes id and reason to SDK withdraw method and invalidates complaints tag', async () => {
      mockComplaintsSdk.withdraw.mockResolvedValueOnce({ id: 'cmp-1', withdrawnReason: 'Customer retracted.' })

      const actions: AnyAction[] = []
      const store = setupTestStore((action) => actions.push(action))

      // Subscribe to query providing Tags.complaints
      void store.dispatch(complaintApi.endpoints.getComplaint.initiate({ id: 'cmp-1' }))
      await new Promise((resolve) => setTimeout(resolve, 0))
      actions.length = 0

      const result = await store.dispatch(
        complaintApi.endpoints.withdrawComplaint.initiate({ id: 'cmp-1', reason: 'Customer retracted.' })
      )
      await new Promise((resolve) => setTimeout(resolve, 0))

      expect(mockPrepareAdminSdk).toHaveBeenCalledWith('test-admin-token-777')
      expect(mockComplaintsSdk.withdraw).toHaveBeenCalledWith('cmp-1', 'Customer retracted.')
      expect(result).toHaveProperty('data', { id: 'cmp-1', withdrawnReason: 'Customer retracted.' })

      const refetched = actions
        .filter((a) => a.type === 'api/executeQuery/pending')
        .map((a) => a.meta?.arg?.endpointName)
      expect(refetched).toContain('getComplaint')
    })
  })

  describe('replyForRider mutation (cross check 2)', () => {
    it('passes id and text to SDK replyForRider method and invalidates complaints tag', async () => {
      mockComplaintsSdk.replyForRider.mockResolvedValueOnce({
        id: 'cmp-1',
        riderReply: 'The rider could not reply.',
      })

      const actions: AnyAction[] = []
      const store = setupTestStore((action) => actions.push(action))

      // Subscribe to query providing Tags.complaints
      void store.dispatch(complaintApi.endpoints.getComplaint.initiate({ id: 'cmp-1' }))
      await new Promise((resolve) => setTimeout(resolve, 0))
      actions.length = 0

      const result = await store.dispatch(
        complaintApi.endpoints.replyForRider.initiate({ id: 'cmp-1', text: 'The rider could not reply.' })
      )
      await new Promise((resolve) => setTimeout(resolve, 0))

      expect(mockPrepareAdminSdk).toHaveBeenCalledWith('test-admin-token-777')
      expect(mockComplaintsSdk.replyForRider).toHaveBeenCalledWith('cmp-1', 'The rider could not reply.')
      expect(result).toHaveProperty('data', { id: 'cmp-1', riderReply: 'The rider could not reply.' })

      const refetched = actions
        .filter((a) => a.type === 'api/executeQuery/pending')
        .map((a) => a.meta?.arg?.endpointName)
      expect(refetched).toContain('getComplaint')
    })
  })

  describe('fetchComplaintPhoto (AC-9, cross check 8)', () => {
    it('fetches photo as Blob via SDK directly outside RTK Query cache', async () => {
      const mockBlob = new Blob(['photo-data'], { type: 'image/jpeg' })
      mockComplaintsSdk.photo.mockResolvedValueOnce(mockBlob)

      const blob = await fetchComplaintPhoto('custom-token', 'cmp-50')

      expect(mockPrepareAdminSdk).toHaveBeenCalledWith('custom-token')
      expect(mockComplaintsSdk.photo).toHaveBeenCalledWith('cmp-50')
      expect(blob).toBe(mockBlob)
    })
  })
})
