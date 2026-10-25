import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { IconContext, CaretDown } from '@phosphor-icons/react'
import App from '../../pages/_app'
import { Spinner } from '../../admin-web-components/components/atoms/Spinner'
import { Toast, ToastClose, ToastProvider, ToastViewport } from '../../admin-web-components/components/molecules/toast/Toast'

// Mock next/router so NextRouter is available during App render
jest.mock('next/router', () => ({
  useRouter: () => ({
    pathname: '/',
    route: '/',
    query: {},
    asPath: '/',
    push: jest.fn(),
    replace: jest.fn(),
    reload: jest.fn(),
    back: jest.fn(),
    prefetch: jest.fn().mockResolvedValue(undefined),
    beforePopState: jest.fn(),
    events: {
      on: jest.fn(),
      off: jest.fn(),
      emit: jest.fn(),
    },
    isFallback: false,
  }),
}))

describe('Phosphor icon accessibility defaults and IconContext.Provider in App (Ruling 4)', () => {
  it('provides aria-hidden="true" and size="1em" to Phosphor icons, while Spinner opts back in and ToastClose has accessible name "Close"', async () => {
    let capturedContext: any = null

    // Test page component rendered inside App
    const TestComponent = () => {
      capturedContext = React.useContext(IconContext)
      return (
        <div>
          <CaretDown data-testid="test-caret" />
          <Spinner data-testid="test-spinner" />
          <ToastProvider>
            <Toast open>
              <ToastClose data-testid="toast-close" />
            </Toast>
            <ToastViewport />
          </ToastProvider>
        </div>
      )
    }
    // public = true avoids triggering AuthGuard redirects
    TestComponent.public = true

    render(<App Component={TestComponent} pageProps={{}} router={{} as any} />)

    await waitFor(() => {
      expect(screen.getByTestId('test-caret')).toBeInTheDocument()
    })

    // 1. IconContext.Provider value in _app.tsx repeats Phosphor defaults and sets aria-hidden: true
    expect(capturedContext).toBeDefined()
    expect(capturedContext['aria-hidden']).toBe(true)
    expect(capturedContext.size).toBe('1em')

    // 2. An ordinary Phosphor icon receives aria-hidden="true" and size 1em
    const caretIcon = screen.getByTestId('test-caret')
    expect(caretIcon).toHaveAttribute('aria-hidden', 'true')
    expect(caretIcon).toHaveAttribute('width', '1em')
    expect(caretIcon).toHaveAttribute('height', '1em')

    // 3. Toast close X icon gets aria-hidden="true" and size 1em from the provider
    const toastCloseBtn = screen.getByRole('button', { name: 'Close' })
    expect(toastCloseBtn).toBeInTheDocument()
    const toastCloseSvg = toastCloseBtn.querySelector('svg')
    expect(toastCloseSvg).not.toBeNull()
    expect(toastCloseSvg).toHaveAttribute('aria-hidden', 'true')
    expect(toastCloseSvg).toHaveAttribute('width', '1em')
    expect(toastCloseSvg).toHaveAttribute('height', '1em')

    // 4. Spinner inside provider keeps role="status", aria-label="Loading", and is NOT aria-hidden
    const spinner = screen.getByTestId('test-spinner')
    expect(spinner).toHaveAttribute('role', 'status')
    expect(spinner).toHaveAttribute('aria-label', 'Loading')
    expect(spinner).toHaveAttribute('aria-hidden', 'false')
    expect(spinner.getAttribute('aria-hidden')).not.toBe('true')
  })
})
