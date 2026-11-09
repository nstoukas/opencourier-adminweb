import { configureStore } from '@reduxjs/toolkit'
import { api, prepareAdminSdk } from '.'
import {
  removalRequestApi,
  useApproveRemovalRequestMutation,
  useDeclineRemovalRequestMutation,
  useGetDeliveryRemovalRequestsQuery,
  useGetRemovalReasonsQuery,
  useCreateRemovalReasonMutation,
  useUpdateRemovalReasonMutation,
  useRemoveRemovalReasonMutation,
} from './removalRequestApi'
import { dispatchBoardApi } from './dispatchBoardApi'
import { deliveriesApi } from './deliveriesApi'
import { Tags } from './utils/tags'
import { authSlice } from '@/modules/auth/slices/authSlice'
import { ApiError } from '../backend-admin-sdk'
import type {
  RemovalApproveAdminResponse,
  RemovalReasonAdminDto,
  RemovalRequestAdminDto,
  DispatchBoardDto,
} from '../backend-admin-sdk'

jest.mock('.', () => {
  const actual = jest.requireActual('.')
  return {
    ...actual,
    prepareAdminSdk: jest.fn(),
  }
})

const mockPrepareAdminSdk = prepareAdminSdk as jest.Mock

function setupTestStore(accessToken: string | null = 'test-admin-token') {
  return configureStore({
    reducer: {
      [api.reducerPath]: api.reducer,
      [authSlice.name]: authSlice.reducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: false,
        immutableCheck: false,
      }).concat(api.middleware),
    preloadedState: {
      auth: { accessToken },
    },
  })
}

describe('removalRequestApi (spec 0035, AC-2, AC-6, decision 24.30)', () => {
  const mockSdkRemovalRequests = {
    approve: jest.fn(),
    decline: jest.fn(),
    listForDelivery: jest.fn(),
    listReasons: jest.fn(),
    createReason: jest.fn(),
    updateReason: jest.fn(),
    removeReason: jest.fn(),
  }

  const mockSdkDispatchBoard = {
    getBoard: jest.fn(),
  }

  const mockSdkDeliveries = {
    getDelivery: jest.fn(),
    getDeliveryEvents: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockPrepareAdminSdk.mockReturnValue({
      removalRequests: () => mockSdkRemovalRequests,
      dispatchBoard: () => mockSdkDispatchBoard,
      deliveries: () => mockSdkDeliveries,
    })
  })

  it('exports all hook functions', () => {
    expect(typeof useApproveRemovalRequestMutation).toBe('function')
    expect(typeof useDeclineRemovalRequestMutation).toBe('function')
    expect(typeof useGetDeliveryRemovalRequestsQuery).toBe('function')
    expect(typeof useGetRemovalReasonsQuery).toBe('function')
    expect(typeof useCreateRemovalReasonMutation).toBe('function')
    expect(typeof useUpdateRemovalReasonMutation).toBe('function')
    expect(typeof useRemoveRemovalReasonMutation).toBe('function')
  })

  it('defines removalRequests and removalReasons tags in Tags', () => {
    expect(Tags.removalRequests).toBe('RemovalRequests')
    expect(Tags.removalReasons).toBe('RemovalReasons')
    expect(Tags.tagTypes).toContain('RemovalRequests')
    expect(Tags.tagTypes).toContain('RemovalReasons')
  })

  describe('getRemovalReasons & reasons CRUD (AC-2)', () => {
    const sampleReason: RemovalReasonAdminDto = {
      id: 'reason-1',
      label: 'Moped breakdown or accident',
      paidToRider: true,
      chargedToRestaurant: false,
      needsNote: false,
      position: 1,
      removedAt: null,
    }

    it('getRemovalReasons calls sdk.removalRequests().listReasons() and provides Tags.removalReasons', async () => {
      mockSdkRemovalRequests.listReasons.mockResolvedValue([sampleReason])
      const store = setupTestStore('token-abc')

      const reasonsSub = store.dispatch(removalRequestApi.endpoints.getRemovalReasons.initiate())
      const result = await reasonsSub

      expect(mockPrepareAdminSdk).toHaveBeenCalledWith('token-abc')
      expect(mockSdkRemovalRequests.listReasons).toHaveBeenCalledTimes(1)
      if ('data' in result) {
        expect(result.data).toEqual([sampleReason])
      } else {
        throw new Error('Expected data in result')
      }

      // Invalidation of Tags.removalReasons causes getRemovalReasons subscription to refetch
      store.dispatch(api.util.invalidateTags([Tags.removalReasons]))
      expect(mockSdkRemovalRequests.listReasons).toHaveBeenCalledTimes(2)

      reasonsSub.unsubscribe()
    })

    it('createRemovalReason calls sdk.removalRequests().createReason() and invalidates Tags.removalReasons', async () => {
      const input = {
        label: 'New reason',
        paidToRider: true,
        chargedToRestaurant: false,
        needsNote: false,
      }
      mockSdkRemovalRequests.listReasons.mockResolvedValue([sampleReason])
      mockSdkRemovalRequests.createReason.mockResolvedValue({ ...sampleReason, ...input })
      const store = setupTestStore('token-abc')

      const reasonsSub = store.dispatch(removalRequestApi.endpoints.getRemovalReasons.initiate())
      await reasonsSub
      expect(mockSdkRemovalRequests.listReasons).toHaveBeenCalledTimes(1)

      const result = await store.dispatch(removalRequestApi.endpoints.createRemovalReason.initiate(input))

      expect(mockPrepareAdminSdk).toHaveBeenCalledWith('token-abc')
      expect(mockSdkRemovalRequests.createReason).toHaveBeenCalledWith(input)
      if ('data' in result) {
        expect(result.data).toMatchObject(input)
      } else {
        throw new Error('Expected data in result')
      }

      // Invalidates Tags.removalReasons so listReasons is fetched again
      expect(mockSdkRemovalRequests.listReasons).toHaveBeenCalledTimes(2)
      reasonsSub.unsubscribe()
    })

    it('updateRemovalReason calls sdk.removalRequests().updateReason() and invalidates Tags.removalReasons', async () => {
      const input = {
        label: 'Updated label',
        position: 3,
      }
      mockSdkRemovalRequests.listReasons.mockResolvedValue([sampleReason])
      mockSdkRemovalRequests.updateReason.mockResolvedValue({ ...sampleReason, ...input })
      const store = setupTestStore('token-abc')

      const reasonsSub = store.dispatch(removalRequestApi.endpoints.getRemovalReasons.initiate())
      await reasonsSub
      expect(mockSdkRemovalRequests.listReasons).toHaveBeenCalledTimes(1)

      const result = await store.dispatch(
        removalRequestApi.endpoints.updateRemovalReason.initiate({ id: 'reason-1', input })
      )

      expect(mockPrepareAdminSdk).toHaveBeenCalledWith('token-abc')
      expect(mockSdkRemovalRequests.updateReason).toHaveBeenCalledWith('reason-1', input)
      if ('data' in result) {
        expect(result.data).toMatchObject(input)
      } else {
        throw new Error('Expected data in result')
      }

      // Invalidates Tags.removalReasons so listReasons is fetched again
      expect(mockSdkRemovalRequests.listReasons).toHaveBeenCalledTimes(2)
      reasonsSub.unsubscribe()
    })

    it('removeRemovalReason calls sdk.removalRequests().removeReason() and invalidates Tags.removalReasons', async () => {
      mockSdkRemovalRequests.listReasons.mockResolvedValue([sampleReason])
      mockSdkRemovalRequests.removeReason.mockResolvedValue({ ...sampleReason, removedAt: '2026-11-09T12:00:00.000Z' })
      const store = setupTestStore('token-abc')

      const reasonsSub = store.dispatch(removalRequestApi.endpoints.getRemovalReasons.initiate())
      await reasonsSub
      expect(mockSdkRemovalRequests.listReasons).toHaveBeenCalledTimes(1)

      const result = await store.dispatch(removalRequestApi.endpoints.removeRemovalReason.initiate({ id: 'reason-1' }))

      expect(mockPrepareAdminSdk).toHaveBeenCalledWith('token-abc')
      expect(mockSdkRemovalRequests.removeReason).toHaveBeenCalledWith('reason-1')
      if ('data' in result) {
        expect(result.data.removedAt).toBe('2026-11-09T12:00:00.000Z')
      } else {
        throw new Error('Expected data in result')
      }

      // Invalidates Tags.removalReasons so listReasons is fetched again
      expect(mockSdkRemovalRequests.listReasons).toHaveBeenCalledTimes(2)
      reasonsSub.unsubscribe()
    })
  })

  describe('getDeliveryRemovalRequests (AC-24)', () => {
    it('calls sdk.removalRequests().listForDelivery(deliveryId) and provides Tags.removalRequests', async () => {
      const mockRequest: RemovalRequestAdminDto = {
        id: 'req-1',
        courierId: 'courier-456',
        courierName: 'Katerina M.',
        label: 'Moped breakdown',
        paidToRider: true,
        chargedToRestaurant: false,
        note: 'Flat tyre',
        status: 'OPEN',
        createdAt: '2026-11-09T14:00:00.000Z',
        decidedAt: null,
        decidedBy: null,
        decisionNote: null,
        payAmount: null,
        payPolicy: null,
        afterPickup: false,
        settledAt: null,
      }
      mockSdkRemovalRequests.listForDelivery.mockResolvedValue([mockRequest])
      const store = setupTestStore('token-abc')

      const result = await store.dispatch(
        removalRequestApi.endpoints.getDeliveryRemovalRequests.initiate({ deliveryId: 'del-123' })
      )

      expect(mockPrepareAdminSdk).toHaveBeenCalledWith('token-abc')
      expect(mockSdkRemovalRequests.listForDelivery).toHaveBeenCalledWith('del-123')
      if ('data' in result) {
        expect(result.data).toEqual([mockRequest])
      } else {
        throw new Error('Expected data in result')
      }
    })
  })

  describe('approveRemovalRequest & declineRemovalRequest (AC-6, AC-8, decision 24.30)', () => {
    it('approveRemovalRequest calls sdk.removalRequests().approve(id, pickedUp)', async () => {
      const response: RemovalApproveAdminResponse = {
        status: 'APPROVED',
        deliveryStatus: 'ASSIGNING_COURIER',
      }
      mockSdkRemovalRequests.approve.mockResolvedValue(response)
      const store = setupTestStore('token-abc')

      const result = await store.dispatch(
        removalRequestApi.endpoints.approveRemovalRequest.initiate({ id: 'req-1', pickedUp: false })
      )

      expect(mockPrepareAdminSdk).toHaveBeenCalledWith('token-abc')
      expect(mockSdkRemovalRequests.approve).toHaveBeenCalledWith('req-1', false)
      if ('data' in result) {
        expect(result.data).toEqual(response)
      } else {
        throw new Error('Expected data in result')
      }
    })

    it('approveRemovalRequest sends pickedUp: true when specified', async () => {
      const response: RemovalApproveAdminResponse = {
        status: 'APPROVED',
        deliveryStatus: 'CANCELED',
      }
      mockSdkRemovalRequests.approve.mockResolvedValue(response)
      const store = setupTestStore('token-abc')

      const result = await store.dispatch(
        removalRequestApi.endpoints.approveRemovalRequest.initiate({ id: 'req-1', pickedUp: true })
      )

      expect(mockPrepareAdminSdk).toHaveBeenCalledWith('token-abc')
      expect(mockSdkRemovalRequests.approve).toHaveBeenCalledWith('req-1', true)
      if ('data' in result) {
        expect(result.data).toEqual(response)
      } else {
        throw new Error('Expected data in result')
      }
    })

    it('declineRemovalRequest calls sdk.removalRequests().decline(id, note)', async () => {
      mockSdkRemovalRequests.decline.mockResolvedValue({ status: 'DECLINED' })
      const store = setupTestStore('token-abc')

      const result = await store.dispatch(
        removalRequestApi.endpoints.declineRemovalRequest.initiate({ id: 'req-1', note: 'Please finish pickup' })
      )

      expect(mockPrepareAdminSdk).toHaveBeenCalledWith('token-abc')
      expect(mockSdkRemovalRequests.decline).toHaveBeenCalledWith('req-1', 'Please finish pickup')
      if ('data' in result) {
        expect(result.data).toEqual({ status: 'DECLINED' })
      } else {
        throw new Error('Expected data in result')
      }
    })

    it('decision 24.30: a 409 rejected approve causes the board query to be fetched again via Tags.removalRequests', async () => {
      const boardData: DispatchBoardDto = {
        generatedAt: '2026-11-09T14:00:00.000Z',
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
      mockSdkDispatchBoard.getBoard.mockResolvedValue(boardData)

      const store = setupTestStore('token-abc')

      // 1. Initial board fetch
      const boardSubscription = store.dispatch(dispatchBoardApi.endpoints.getDispatchBoard.initiate())
      await boardSubscription
      expect(mockSdkDispatchBoard.getBoard).toHaveBeenCalledTimes(1)

      // 2. Approve fails with 409 conflict
      const conflictError = new ApiError('CONFLICT' as any, 'The delivery was already picked up', 409)
      mockSdkRemovalRequests.approve.mockRejectedValue(conflictError)

      const approveResult = await store.dispatch(
        removalRequestApi.endpoints.approveRemovalRequest.initiate({ id: 'req-1', pickedUp: false })
      )
      expect('error' in approveResult && approveResult.error).toBeDefined()

      // 3. RTK Query invalidatesTags on rejected mutation too (decision 24.30),
      // so dispatchBoardApi (which provides Tags.removalRequests) refetches automatically!
      expect(mockSdkDispatchBoard.getBoard).toHaveBeenCalledTimes(2)

      boardSubscription.unsubscribe()
    })

    it('decision 24.30: a 409 rejected decline causes the board query to be fetched again via Tags.removalRequests', async () => {
      const boardData: DispatchBoardDto = {
        generatedAt: '2026-11-09T14:00:00.000Z',
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
      mockSdkDispatchBoard.getBoard.mockResolvedValue(boardData)

      const store = setupTestStore('token-abc')

      // 1. Initial board fetch
      const boardSubscription = store.dispatch(dispatchBoardApi.endpoints.getDispatchBoard.initiate())
      await boardSubscription
      expect(mockSdkDispatchBoard.getBoard).toHaveBeenCalledTimes(1)

      // 2. Decline fails with 409 conflict
      const conflictError = new ApiError('CONFLICT' as any, 'This request was already decided', 409)
      mockSdkRemovalRequests.decline.mockRejectedValue(conflictError)

      const declineResult = await store.dispatch(
        removalRequestApi.endpoints.declineRemovalRequest.initiate({ id: 'req-1', note: undefined })
      )
      expect('error' in declineResult && declineResult.error).toBeDefined()

      // 3. Board query refetched!
      expect(mockSdkDispatchBoard.getBoard).toHaveBeenCalledTimes(2)

      boardSubscription.unsubscribe()
    })

    it('approve refreshes Tags.deliveries, Tags.deliveryEvents, and Tags.removalRequests (AC-6, decision 24.30)', async () => {
      mockSdkDeliveries.getDelivery.mockResolvedValue({ id: 'del-123' })
      mockSdkDeliveries.getDeliveryEvents.mockResolvedValue([])
      mockSdkRemovalRequests.listForDelivery.mockResolvedValue([])
      mockSdkRemovalRequests.approve.mockResolvedValue({ status: 'APPROVED', deliveryStatus: 'ASSIGNING_COURIER' })

      const store = setupTestStore('token-abc')

      const deliverySub = store.dispatch(deliveriesApi.endpoints.getDelivery.initiate({ id: 'del-123' }))
      const eventsSub = store.dispatch(deliveriesApi.endpoints.getDeliveryEvents.initiate({ deliveryId: 'del-123' }))
      const removalSub = store.dispatch(
        removalRequestApi.endpoints.getDeliveryRemovalRequests.initiate({ deliveryId: 'del-123' })
      )
      await Promise.all([deliverySub, eventsSub, removalSub])

      expect(mockSdkDeliveries.getDelivery).toHaveBeenCalledTimes(1)
      expect(mockSdkDeliveries.getDeliveryEvents).toHaveBeenCalledTimes(1)
      expect(mockSdkRemovalRequests.listForDelivery).toHaveBeenCalledTimes(1)

      await store.dispatch(removalRequestApi.endpoints.approveRemovalRequest.initiate({ id: 'req-1', pickedUp: false }))

      expect(mockSdkDeliveries.getDelivery).toHaveBeenCalledTimes(2)
      expect(mockSdkDeliveries.getDeliveryEvents).toHaveBeenCalledTimes(2)
      expect(mockSdkRemovalRequests.listForDelivery).toHaveBeenCalledTimes(2)

      deliverySub.unsubscribe()
      eventsSub.unsubscribe()
      removalSub.unsubscribe()
    })

    it('decline refreshes Tags.deliveryEvents and Tags.removalRequests (AC-6, decision 24.30)', async () => {
      mockSdkDeliveries.getDeliveryEvents.mockResolvedValue([])
      mockSdkRemovalRequests.listForDelivery.mockResolvedValue([])
      mockSdkRemovalRequests.decline.mockResolvedValue({ status: 'DECLINED' })

      const store = setupTestStore('token-abc')

      const eventsSub = store.dispatch(deliveriesApi.endpoints.getDeliveryEvents.initiate({ deliveryId: 'del-123' }))
      const removalSub = store.dispatch(
        removalRequestApi.endpoints.getDeliveryRemovalRequests.initiate({ deliveryId: 'del-123' })
      )
      await Promise.all([eventsSub, removalSub])

      expect(mockSdkDeliveries.getDeliveryEvents).toHaveBeenCalledTimes(1)
      expect(mockSdkRemovalRequests.listForDelivery).toHaveBeenCalledTimes(1)

      await store.dispatch(removalRequestApi.endpoints.declineRemovalRequest.initiate({ id: 'req-1', note: undefined }))

      expect(mockSdkDeliveries.getDeliveryEvents).toHaveBeenCalledTimes(2)
      expect(mockSdkRemovalRequests.listForDelivery).toHaveBeenCalledTimes(2)

      eventsSub.unsubscribe()
      removalSub.unsubscribe()
    })
  })
})
