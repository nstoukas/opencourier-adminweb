import { configureStore } from '@reduxjs/toolkit'
import { courierAccountApi } from './courierAccountApi'
import { prepareAdminSdk } from '.'
import { authSlice } from '@/modules/auth/slices/authSlice'
import { ApiError } from '../backend-admin-sdk'

jest.mock('.', () => {
  const actual = jest.requireActual('.')
  return { ...actual, prepareAdminSdk: jest.fn() }
})

const mockPrepareAdminSdk = prepareAdminSdk as jest.Mock

function setupTestStore(accessToken: string | null = 'admin-token') {
  return configureStore({
    reducer: {
      [courierAccountApi.reducerPath]: courierAccountApi.reducer,
      [authSlice.name]: authSlice.reducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({ serializableCheck: false, immutableCheck: false }).concat(courierAccountApi.middleware),
    preloadedState: { auth: { accessToken } },
  })
}

// Spec 0051 (row 108, AC-6): the calls behind the Account card. Each goes to the SDK with the admin's
// token; a write refreshes the rider's account and its history, so the card never shows a stale state;
// a refusal keeps the server's sentence for the dialog to show.
describe('courierAccountApi (spec 0051)', () => {
  let sdk: {
    account: jest.Mock
    changes: jest.Mock
    deactivate: jest.Mock
    reactivate: jest.Mock
    updateCourier: jest.Mock
  }

  const account = { email: 'nikos@coop.gr', deactivatedAt: null, emergencyContactName: null, emergencyContactPhone: null }

  beforeEach(() => {
    jest.clearAllMocks()
    sdk = {
      account: jest.fn().mockResolvedValue(account),
      changes: jest.fn().mockResolvedValue([]),
      deactivate: jest.fn().mockResolvedValue(undefined),
      reactivate: jest.fn().mockResolvedValue(undefined),
      updateCourier: jest.fn().mockResolvedValue({ id: 'rider-1' }),
    }
    mockPrepareAdminSdk.mockReturnValue({
      courierAccount: () => ({
        account: sdk.account,
        changes: sdk.changes,
        deactivate: sdk.deactivate,
        reactivate: sdk.reactivate,
      }),
      couriers: () => ({ updateCourier: sdk.updateCourier }),
    })
  })

  it("getCourierAccount asks the SDK for this rider's account with the admin's token", async () => {
    const store = setupTestStore('admin-token')

    const result = await store.dispatch(courierAccountApi.endpoints.getCourierAccount.initiate({ id: 'rider-1' }))

    expect(mockPrepareAdminSdk).toHaveBeenCalledWith('admin-token')
    expect(sdk.account).toHaveBeenCalledWith('rider-1')
    expect(result.data).toEqual(account)
  })

  it("getCourierAccountChanges asks the SDK for this rider's history and answers it in the order sent", async () => {
    const rows = [{ id: 'change-2' }, { id: 'change-1' }]
    sdk.changes.mockResolvedValue(rows)
    const store = setupTestStore()

    const result = await store.dispatch(courierAccountApi.endpoints.getCourierAccountChanges.initiate({ id: 'rider-1' }))

    expect(sdk.changes).toHaveBeenCalledWith('rider-1')
    expect(result.data).toEqual(rows)
  })

  it('deactivateCourier sends the rider and the reason', async () => {
    const store = setupTestStore()

    const result = await store.dispatch(
      courierAccountApi.endpoints.deactivateCourier.initiate({ id: 'rider-1', reason: 'Left the co-op' })
    )

    expect(sdk.deactivate).toHaveBeenCalledTimes(1)
    expect(sdk.deactivate).toHaveBeenCalledWith('rider-1', 'Left the co-op')
    expect(sdk.reactivate).not.toHaveBeenCalled()
    expect('error' in result).toBe(false)
  })

  it('reactivateCourier sends the rider and the optional reason', async () => {
    const store = setupTestStore()

    await store.dispatch(courierAccountApi.endpoints.reactivateCourier.initiate({ id: 'rider-1' }))
    expect(sdk.reactivate).toHaveBeenLastCalledWith('rider-1', undefined)

    await store.dispatch(courierAccountApi.endpoints.reactivateCourier.initiate({ id: 'rider-1', reason: 'Came back' }))
    expect(sdk.reactivate).toHaveBeenLastCalledWith('rider-1', 'Came back')
    expect(sdk.deactivate).not.toHaveBeenCalled()
  })

  it('editCourierDetails sends the input through the existing PATCH, unchanged', async () => {
    const store = setupTestStore()
    const input = {
      firstName: 'Nikos',
      lastName: 'Pappas',
      phoneNumber: '+306912345678',
      email: 'nikos.new@coop.gr',
      emergencyContactName: 'Maria Pappa',
      emergencyContactPhone: '+306922222222',
    }

    const result = await store.dispatch(courierAccountApi.endpoints.editCourierDetails.initiate({ id: 'rider-1', input }))

    expect(sdk.updateCourier).toHaveBeenCalledTimes(1)
    expect(sdk.updateCourier).toHaveBeenCalledWith({ id: 'rider-1', courierUpdateAdminInput: input })
    expect('error' in result).toBe(false)
  })

  it.each([
    ['deactivateCourier', () => courierAccountApi.endpoints.deactivateCourier.initiate({ id: 'rider-1', reason: 'Left' })],
    ['reactivateCourier', () => courierAccountApi.endpoints.reactivateCourier.initiate({ id: 'rider-1' })],
    [
      'editCourierDetails',
      () =>
        courierAccountApi.endpoints.editCourierDetails.initiate({
          id: 'rider-1',
          input: { firstName: 'Nikos', lastName: 'Pappas' },
        }),
    ],
  ] as const)('after %s, the account and its history on the page are read again', async (_name, write) => {
    const store = setupTestStore()
    // The Account card is on the page: both reads are subscribed.
    await store.dispatch(courierAccountApi.endpoints.getCourierAccount.initiate({ id: 'rider-1' }))
    await store.dispatch(courierAccountApi.endpoints.getCourierAccountChanges.initiate({ id: 'rider-1' }))
    expect(sdk.account).toHaveBeenCalledTimes(1)
    expect(sdk.changes).toHaveBeenCalledTimes(1)

    await store.dispatch(write() as any)
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(sdk.account).toHaveBeenCalledTimes(2)
    expect(sdk.changes).toHaveBeenCalledTimes(2)
  })

  it("a refusal keeps the server's sentence and status for the dialog (409 holds a job)", async () => {
    sdk.deactivate.mockRejectedValue(new ApiError('CONFLICT' as any, 'This rider holds a job. Move it first.', 409))
    const store = setupTestStore()

    const result: any = await store.dispatch(
      courierAccountApi.endpoints.deactivateCourier.initiate({ id: 'rider-1', reason: 'Left' })
    )

    expect(result.error).toBeDefined()
    expect(result.error.message).toBe('This rider holds a job. Move it first.')
    expect(result.data).toBeUndefined()
  })

  it("a refused edit keeps the server's sentence too (a taken email)", async () => {
    sdk.updateCourier.mockRejectedValue(
      new ApiError('UNIQUE_CONSTRAINT' as any, 'That email is already used by another account.', 409)
    )
    const store = setupTestStore()

    const result: any = await store.dispatch(
      courierAccountApi.endpoints.editCourierDetails.initiate({
        id: 'rider-1',
        input: { firstName: 'N', lastName: 'P', email: 'taken@coop.gr' },
      })
    )

    expect(result.error.message).toBe('That email is already used by another account.')
    expect(result.data).toBeUndefined()
  })
})
