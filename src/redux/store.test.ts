import { findNonSerializableValue, isPlain } from '@reduxjs/toolkit'
import { FLUSH, PAUSE, PERSIST, PURGE, REGISTER, REHYDRATE } from 'redux-persist'
import { api } from '@/api'
import { serializableCheckOptions, immutableCheckOptions, makeStore } from './store'

describe('redux store state check configuration', () => {
  it('ignores Date objects located in the RTK Query api cache subtree', () => {
    // Simulated state where a Delivery cached inside the `api` slice contains Date objects
    const stateWithApiDate = {
      auth: { accessToken: 'valid-token' },
      api: {
        queries: {
          'getDelivery("d1")': {
            data: {
              id: 'd1',
              pickupReadyAt: new Date('2026-08-04T10:00:00Z'),
            },
          },
        },
      },
    }

    // findNonSerializableValue returns false if no non-serializable value is found outside ignored paths
    const result = findNonSerializableValue(
      stateWithApiDate,
      '',
      isPlain,
      undefined,
      serializableCheckOptions.ignoredPaths
    )
    expect(result).toBe(false)
  })

  it('still detects non-serializable values (Dates) outside the ignored api subtree (e.g. auth slice)', () => {
    // Simulated state where a Date is accidentally put into the `auth` slice
    const stateWithAuthDate = {
      auth: {
        lastLoginAt: new Date('2026-08-04T10:00:00Z'),
      },
      api: {},
    }

    // Checking against ignoredPaths should flag the Date in auth
    const result = findNonSerializableValue(
      stateWithAuthDate,
      '',
      isPlain,
      undefined,
      serializableCheckOptions.ignoredPaths
    )
    expect(result).not.toBe(false)
    expect(result).toEqual({
      keyPath: 'auth.lastLoginAt',
      value: expect.any(Date),
    })
  })

  it('ignores fulfilled RTK Query action payloads containing Date objects', () => {
    // Action dispatched when RTK Query receives a DTO parsed into Date objects by the admin SDK
    const fulfilledAction = {
      type: 'api/executeQuery/fulfilled',
      payload: {
        data: {
          id: 'd1',
          createdAt: new Date('2026-08-04T10:00:00Z'),
        },
      },
      meta: {
        arg: { endpointName: 'getDelivery' },
      },
    }

    // findNonSerializableValue should ignore action paths listed in serializableCheckOptions.ignoredActionPaths
    const result = findNonSerializableValue(
      fulfilledAction,
      '',
      isPlain,
      undefined,
      serializableCheckOptions.ignoredActionPaths
    )
    expect(result).toBe(false)
  })

  it('still flags non-serializable values in non-ignored action paths (action failure case)', () => {
    // Custom action carrying a non-serializable Date on an unignored property
    const unignoredAction = {
      type: 'auth/loginSuccess',
      unignoredMetadata: {
        loginTime: new Date('2026-08-04T10:00:00Z'),
      },
    }

    const result = findNonSerializableValue(
      unignoredAction,
      '',
      isPlain,
      undefined,
      serializableCheckOptions.ignoredActionPaths
    )
    expect(result).not.toBe(false)
    expect(result).toEqual({
      keyPath: 'unignoredMetadata.loginTime',
      value: expect.any(Date),
    })
  })

  it('preserves default RTK ignored action paths (meta.arg and meta.baseQueryMeta)', () => {
    // RTK Query relies on meta.arg and meta.baseQueryMeta being ignored
    expect(serializableCheckOptions.ignoredActionPaths).toContain('meta.arg')
    expect(serializableCheckOptions.ignoredActionPaths).toContain('meta.baseQueryMeta')
  })

  it('preserves redux-persist ignored actions list', () => {
    // Ensures redux-persist internal actions like REHYDRATE are still ignored
    expect(serializableCheckOptions.ignoredActions).toEqual(
      expect.arrayContaining([FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER])
    )
    expect(serializableCheckOptions.ignoredActions).toHaveLength(6)
  })

  it('configures both serializable and immutable checks to ignore api.reducerPath dynamically', () => {
    // Asserts that the options reference api.reducerPath instead of a hardcoded string
    expect(serializableCheckOptions.ignoredPaths).toContain(api.reducerPath)
    expect(immutableCheckOptions.ignoredPaths).toContain(api.reducerPath)
  })

  it('initializes store with all expected reducers and handles dispatch without throwing', () => {
    // Instantiates the store and verifies slice presence and basic dispatch
    const store = makeStore()
    const state = store.getState()

    expect(state).toHaveProperty('auth')
    expect(state).toHaveProperty('api')
    expect(state).toHaveProperty('sheets')

    expect(() => store.dispatch({ type: 'test/noop' })).not.toThrow()
  })
})
