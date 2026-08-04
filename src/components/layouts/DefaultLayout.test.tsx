import React from 'react'
import { render, screen } from '@testing-library/react'
import { Provider } from 'react-redux'
import { makeStore } from '../../redux/store'
import {
  DefaultLayout,
  SIDEBAR_MIN_SIZE,
  SIDEBAR_MAX_SIZE,
  SIDEBAR_DEFAULT_SIZE,
  CONTENT_MIN_SIZE,
  CONTENT_DEFAULT_SIZE,
} from './DefaultLayout'

// Mock next/navigation hook used by Nav component to provide active route
jest.mock('next/navigation', () => ({
  usePathname: () => '/',
}))

describe('DefaultLayout panel sizing & render', () => {
  let consoleSpy: jest.SpyInstance

  beforeEach(() => {
    // Spy on console.error to capture any react-resizable-panels validation warnings
    consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    consoleSpy.mockRestore()
  })

  it('1. percentage invariant holds (sidebar + content default sizes equal 100%)', () => {
    // Sidebar default (13%) and content default (87%) must sum to exactly 100%
    expect(SIDEBAR_DEFAULT_SIZE + CONTENT_DEFAULT_SIZE).toBe(100)
  })

  it('2. sidebar default size sits inside its min and max bounds, and content default size meets min bound', () => {
    // Sidebar default size must fall within legal [12%, 14%] range
    expect(SIDEBAR_DEFAULT_SIZE).toBeGreaterThanOrEqual(SIDEBAR_MIN_SIZE)
    expect(SIDEBAR_DEFAULT_SIZE).toBeLessThanOrEqual(SIDEBAR_MAX_SIZE)
    // Content default size must meet its min bound (87 >= 30)
    expect(CONTENT_DEFAULT_SIZE).toBeGreaterThanOrEqual(CONTENT_MIN_SIZE)
  })

  it('3. every panel size constant is a legal percentage between 0 and 100', () => {
    // Validate each layout sizing constant is in valid percentage range [0, 100]
    const panelSizes = [
      SIDEBAR_MIN_SIZE,
      SIDEBAR_MAX_SIZE,
      SIDEBAR_DEFAULT_SIZE,
      CONTENT_MIN_SIZE,
      CONTENT_DEFAULT_SIZE,
    ]

    panelSizes.forEach((size) => {
      expect(size).toBeGreaterThanOrEqual(0)
      expect(size).toBeLessThanOrEqual(100)
    })
  })

  it('4. library logs no "Invalid Panel" error when layout mounts', () => {
    // Create fresh Redux store to supply Provider for DefaultLayout's dispatch hooks
    const store = makeStore()

    render(
      <Provider store={store}>
        <DefaultLayout>
          <div>Main Dashboard View</div>
        </DefaultLayout>
      </Provider>
    )

    // Assert that console.error was not called with "Invalid Panel" (which happened when pixels 240/1080 were passed)
    const invalidPanelCalls = consoleSpy.mock.calls.filter(
      (call) => typeof call[0] === 'string' && call[0].includes('Invalid Panel')
    )
    expect(invalidPanelCalls).toHaveLength(0)

    // Verify child content rendered correctly
    expect(screen.getByText('Main Dashboard View')).toBeInTheDocument()
  })
})
