import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { Provider } from 'react-redux'
import LoginPage from '../../pages/login'
import { makeStore } from '../../redux/store'
import { setAccessToken } from './slices/authSlice'
import { EAdminRoutes } from '../../hooks/useAdminPageNavigator'

// Mock next/router to monitor redirection behavior
const mockRouter = {
  replace: jest.fn(),
  push: jest.fn(),
}
jest.mock('next/router', () => ({
  useRouter: () => mockRouter,
}))

// Mock RTK Query login mutation hook used by SignInScreen
const mockLogin = jest.fn()
jest.mock('../../api/authApi', () => ({
  useLoginMutation: () => [mockLogin, { isLoading: false }],
}))

// Mock admin page navigator
const mockGoHome = jest.fn()
jest.mock('../../hooks/useAdminPageNavigator', () => {
  const actual = jest.requireActual('../../hooks/useAdminPageNavigator')
  return {
    ...actual,
    useAdminPageNavigator: () => ({
      goHome: mockGoHome,
    }),
  }
})

describe('LoginPage (row 86 review fix 40e5e1e)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('an admin already signed in on arrival renders nothing and calls router.replace("/")', () => {
    const store = makeStore()
    // Admin arrives with an existing active session token in store
    store.dispatch(setAccessToken('existing-session-token'))

    const { container } = render(
      <Provider store={store}>
        <LoginPage />
      </Provider>
    )

    // router.replace is called once to land on HOME without leaving /login in history
    expect(mockRouter.replace).toHaveBeenCalledTimes(1)
    expect(mockRouter.replace).toHaveBeenCalledWith(EAdminRoutes.HOME)
    expect(mockRouter.push).not.toHaveBeenCalled()

    // Must draw nothing: no sign in card or buttons before overview loads
    expect(container.firstChild).toBeNull()
    expect(screen.queryByRole('heading', { name: /Co-op Admin/i })).toBeNull()
    expect(screen.queryByRole('button', { name: /Sign In/i })).toBeNull()
  })

  it('an admin without a token shows the sign in card and does not redirect', () => {
    const store = makeStore()
    // Admin arrives with no token in store
    store.dispatch(setAccessToken(null))

    const { container } = render(
      <Provider store={store}>
        <LoginPage />
      </Provider>
    )

    // No redirection triggered
    expect(mockRouter.replace).not.toHaveBeenCalled()
    expect(mockRouter.push).not.toHaveBeenCalled()

    // Sign in card is rendered
    expect(container.firstChild).not.toBeNull()
    expect(screen.getByRole('heading', { level: 1, name: 'Co-op Admin' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sign In' })).toBeInTheDocument()
  })

  it('signing in on the page calls goHome once and does not trigger router.replace', async () => {
    const store = makeStore()
    store.dispatch(setAccessToken(null))
    mockLogin.mockReturnValueOnce({
      unwrap: () =>
        Promise.resolve({ session: { accessToken: 'newly-authenticated-token' } }),
    })

    render(
      <Provider store={store}>
        <LoginPage />
      </Provider>
    )

    // Fill in email and password
    fireEvent.change(screen.getByLabelText(/Email/i), {
      target: { value: 'admin@volos.courier.coop' },
    })
    fireEvent.change(screen.getByLabelText(/Password/i), {
      target: { value: 'safe-password-123' },
    })

    // Click Sign In
    fireEvent.click(screen.getByRole('button', { name: 'Sign In' }))

    // SignInScreen's successful submit handles navigation via goHome
    await waitFor(() => {
      expect(mockGoHome).toHaveBeenCalledTimes(1)
    })

    // router.replace from LoginPage's arrival effect must not have run, avoiding a race condition
    expect(mockRouter.replace).not.toHaveBeenCalled()
  })

  it('has public = true static flag so _app renders it without auth guard and shell', () => {
    expect(LoginPage.public).toBe(true)
  })
})
