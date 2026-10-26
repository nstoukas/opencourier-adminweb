import authReducer, {
  authSlice,
  setAccessToken,
  selectAccessToken,
} from './authSlice'
import { AppState } from '@/redux/store'

describe('authSlice (row 86 review fix e27c81d)', () => {
  it('initial state has accessToken null and has no chatToken field', () => {
    // Initial state before an admin logs in
    const initialState = authReducer(undefined, { type: '@@INIT' })
    expect(initialState.accessToken).toBeNull()
    expect(initialState.user).toBeUndefined()

    // chatToken was removed in row 86 review as dead state with no callers
    expect(initialState).not.toHaveProperty('chatToken')
    expect((initialState as any).chatToken).toBeUndefined()
  })

  it('authSlice actions does not expose setChatToken', () => {
    // setChatToken reducer was deleted when chatToken was removed
    expect(authSlice.actions).not.toHaveProperty('setChatToken')
    expect((authSlice.actions as any).setChatToken).toBeUndefined()
    expect(authSlice.actions.setAccessToken).toBeDefined()
  })

  it('ignores any legacy chatToken actions and keeps chatToken undefined', () => {
    const initialState = authReducer(undefined, { type: '@@INIT' })
    // Dispatching a legacy action type must not add chatToken back to the slice state
    const nextState = authReducer(
      initialState,
      { type: 'auth/setChatToken', payload: 'legacy-chat-token' } as any
    )
    expect((nextState as any).chatToken).toBeUndefined()
    expect(nextState).not.toHaveProperty('chatToken')
  })

  it('setAccessToken sets a valid token and can set null on sign out', () => {
    const initialState = authReducer(undefined, { type: '@@INIT' })
    const stateWithToken = authReducer(initialState, setAccessToken('token-abc-123'))
    expect(stateWithToken.accessToken).toBe('token-abc-123')

    const signedOutState = authReducer(stateWithToken, setAccessToken(null))
    expect(signedOutState.accessToken).toBeNull()
  })

  it('selectAccessToken extracts accessToken from AppState', () => {
    const mockState = {
      auth: { accessToken: 'jwt-access-token' },
    } as unknown as AppState

    expect(selectAccessToken(mockState)).toBe('jwt-access-token')
  })
})
