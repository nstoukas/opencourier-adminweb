import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { Provider } from 'react-redux'
import { I18nextProvider } from 'react-i18next'
import { makeStore } from '@/redux/store'
import { setAccessToken } from '@/modules/auth/slices/authSlice'
import { createI18n } from './createI18n'
import { wasChosenBeforeSignIn, forgetChosenBeforeSignIn } from './languageChoice'
import { LanguageSwitch } from './LanguageSwitch'

const mockToast = jest.fn()
jest.mock('../admin-web-components', () => {
  const actual = jest.requireActual('../admin-web-components')
  return {
    ...actual,
    toast: (...args: any[]) => mockToast(...args),
  }
})

const mockSaveLanguage = jest.fn()
jest.mock('../api/authApi', () => ({
  useSetLanguageMutation: () => [mockSaveLanguage, { isLoading: false }],
}))

describe('LanguageSwitch (spec 0054, AC-2)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    forgetChosenBeforeSignIn()
    mockSaveLanguage.mockReturnValue({ unwrap: () => Promise.resolve() })
  })

  function renderSwitch(initialLanguage: 'el' | 'en' = 'el', token: string | null = 'test-token') {
    const store = makeStore()
    if (token) {
      store.dispatch(setAccessToken(token))
    }
    const i18n = createI18n(initialLanguage)
    return {
      store,
      i18n,
      ...render(
        <Provider store={store}>
          <I18nextProvider i18n={i18n}>
            <LanguageSwitch />
          </I18nextProvider>
        </Provider>
      ),
    }
  }

  it('saves User.language through API when signed in and switching to English', () => {
    renderSwitch('el', 'admin-token')

    const enButton = screen.getByRole('button', { name: 'English' })
    fireEvent.click(enButton)

    expect(mockSaveLanguage).toHaveBeenCalledTimes(1)
    expect(mockSaveLanguage).toHaveBeenCalledWith('en')
  })

  it('saves User.language through API when signed in and switching to Greek', () => {
    renderSwitch('en', 'admin-token')

    const elButton = screen.getByRole('button', { name: 'Ελληνικά' })
    fireEvent.click(elButton)

    expect(mockSaveLanguage).toHaveBeenCalledTimes(1)
    expect(mockSaveLanguage).toHaveBeenCalledWith('el')
  })

  it('does not call saveLanguage when clicking the currently active language', () => {
    renderSwitch('el', 'admin-token')

    const elButton = screen.getByRole('button', { name: 'Ελληνικά' })
    fireEvent.click(elButton)

    expect(mockSaveLanguage).not.toHaveBeenCalled()
  })

  it('does not call saveLanguage when signed out and marks language chosen before sign in', () => {
    renderSwitch('el', null)

    const enButton = screen.getByRole('button', { name: 'English' })
    fireEvent.click(enButton)

    expect(mockSaveLanguage).not.toHaveBeenCalled()
    expect(wasChosenBeforeSignIn()).toBe(true)
  })

  it('shows destructive toast when saveLanguage API call fails', async () => {
    mockSaveLanguage.mockReturnValue({ unwrap: () => Promise.reject(new Error('Network error')) })
    renderSwitch('el', 'admin-token')

    const enButton = screen.getByRole('button', { name: 'English' })
    fireEvent.click(enButton)

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: expect.any(String),
        variant: 'destructive',
      })
    })
  })
})
