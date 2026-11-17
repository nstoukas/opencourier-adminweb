import React from 'react'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { Provider } from 'react-redux'
import fs from 'fs'
import path from 'path'
import { makeStore } from '../../redux/store'
import { api } from '../../api'
import { selectAccessToken, setAccessToken } from '../../modules/auth/slices/authSlice'
import { openSheet, selectSheets } from '../../modules/shared/slices/sheetManagerSlice'
import { DefaultLayout } from './DefaultLayout'
import { isActivePath } from './AdminSidebar'
import { PageHeader } from './PageHeader'
import { EAdminRoutes } from '../../hooks/useAdminPageNavigator'

// Mutable pathname mock for next/navigation
let currentPathname = '/'
jest.mock('next/navigation', () => ({
  usePathname: () => currentPathname,
}))

// Mock config API query for co-op name
const mockUseGetInstanceConfigQuery = jest.fn()
jest.mock('../../api/configApi', () => ({
  useGetInstanceConfigQuery: () => mockUseGetInstanceConfigQuery(),
}))

// Mock chat API query for unread count badge
const mockUseGetChatUnreadCountQuery = jest.fn()
jest.mock('../../api/chatApi', () => ({
  useGetChatUnreadCountQuery: () => mockUseGetChatUnreadCountQuery(),
}))

describe('DefaultLayout and Admin shell (row 86)', () => {
  let store: ReturnType<typeof makeStore>

  beforeEach(() => {
    jest.clearAllMocks()
    currentPathname = '/'
    store = makeStore()
    // Default co-op config
    mockUseGetInstanceConfigQuery.mockReturnValue({
      data: {
        details: {
          name: 'Volos Couriers',
        },
      },
    })
    mockUseGetChatUnreadCountQuery.mockReturnValue({
      data: { count: 0 },
    })
  })

  const renderLayout = (
    ui: React.ReactNode = <div>Page Content</div>,
    props?: React.ComponentProps<typeof DefaultLayout>
  ) => {
    return render(
      <Provider store={store}>
        <DefaultLayout {...props}>{ui}</DefaultLayout>
      </Provider>
    )
  }

  describe('Landmark and Layout Invariants', () => {
    it('renders exactly one <main> element with id="main" and tabIndex={-1}', () => {
      renderLayout()

      const mains = screen.getAllByRole('main')
      expect(mains).toHaveLength(1)

      const main = mains[0] as HTMLElement
      expect(main).toHaveAttribute('id', 'main')
      expect(main).toHaveAttribute('tabIndex', '-1')
      expect(main).toHaveAttribute('data-slot', 'sidebar-inset')
      expect(within(main).getByText('Page Content')).toBeInTheDocument()
    })

    it('Skip to content link points to #main and allows moving focus to the page', () => {
      renderLayout()

      const skipLink = screen.getByRole('link', { name: 'Skip to content' })
      expect(skipLink).toBeInTheDocument()
      expect(skipLink).toHaveAttribute('href', '#main')

      // Verify the target element exists in the DOM and is the single <main>
      const target = document.getElementById('main')
      expect(target).not.toBeNull()
      expect(target?.tagName).toBe('MAIN')
      expect(target).toHaveAttribute('tabIndex', '-1')

      // Activating the target moves focus to <main>
      target?.focus()
      expect(document.activeElement).toBe(target)
    })

    it('renders exactly one <h1> and one <main> when wrapping a page with PageHeader', () => {
      renderLayout(
        <>
          <PageHeader title="Deliveries" />
          <div>Deliveries Table</div>
        </>
      )

      // Exactly one <main>
      const mains = screen.getAllByRole('main')
      expect(mains).toHaveLength(1)

      // Exactly one <h1>
      const h1s = screen.getAllByRole('heading', { level: 1 })
      expect(h1s).toHaveLength(1)
      expect(h1s[0]).toHaveTextContent('Deliveries')
    })

    // Spec 0034, decision 111.10: viewport-filling layout for single-screen pages like Messages (/chat)
    it('applies viewport-filling classes when fillViewport is true and omits them when false (decision 111.10)', () => {
      // 1. With fillViewport={true}: <main> carries lg:h-svh lg:overflow-hidden and content wrapper carries lg:min-h-0
      const { unmount } = renderLayout(<div data-testid="page-child">Chat Viewport</div>, {
        fillViewport: true,
      })

      const main = screen.getByRole('main')
      expect(main).toHaveClass('lg:h-svh')
      expect(main).toHaveClass('lg:overflow-hidden')

      const contentWrapper = screen.getByTestId('page-child').parentElement
      expect(contentWrapper).toHaveClass('lg:min-h-0')

      unmount()

      // 2. Without fillViewport (default false): neither <main> nor content wrapper carries viewport-filling classes
      renderLayout(<div data-testid="page-child">Standard Content</div>)

      const defaultMain = screen.getByRole('main')
      expect(defaultMain).not.toHaveClass('lg:h-svh')
      expect(defaultMain).not.toHaveClass('lg:overflow-hidden')

      const defaultContentWrapper = screen.getByTestId('page-child').parentElement
      expect(defaultContentWrapper).not.toHaveClass('lg:min-h-0')
    })
  })

  describe('AdminSidebar and Groups', () => {
    it('displays OpenCourier logo (48px tall) and co-op name from settings', () => {
      renderLayout()

      const logo = screen.getByAltText('OpenCourier')
      expect(logo).toBeInTheDocument()
      expect(logo).toHaveAttribute('src', '/opencourier-sign.png')
      expect(logo).toHaveAttribute('height', '48')

      // Co-op name from settings is rendered in sidebar and mobile top bar
      const coopNames = screen.getAllByText('Volos Couriers')
      expect(coopNames.length).toBeGreaterThanOrEqual(1)
    })

    it('falls back to "OpenCourier" when settings have no name', () => {
      mockUseGetInstanceConfigQuery.mockReturnValue({
        data: {
          details: {
            name: '',
          },
        },
      })

      renderLayout()

      // When details.name is empty, sidebar shows OpenCourier fallback
      const fallbacks = screen.getAllByText('OpenCourier')
      expect(fallbacks.length).toBeGreaterThanOrEqual(1)
    })

    it('renders the redesign three navigation groups with correct items and routes', () => {
      renderLayout()

      // Group 1: Run the day
      expect(screen.getByText('Run the day')).toBeInTheDocument()
      const dispatchLink = screen.getByRole('link', { name: /Dispatch/i })
      expect(dispatchLink).toHaveAttribute('href', '/')
      expect(screen.queryByRole('link', { name: /Overview/i })).toBeNull()
      const deliveriesLink = screen.getByRole('link', { name: /Deliveries/i })
      expect(deliveriesLink).toHaveAttribute('href', '/deliveries')
      // Spec 0034, AC-2: Messages under Run the day linking to /chat
      const messagesLink = screen.getByRole('link', { name: /Messages/i })
      expect(messagesLink).toHaveAttribute('href', '/chat')
      expect(EAdminRoutes.CHAT).toBe('/chat')
      const sosLink = screen.getByRole('link', { name: /SOS/i })
      expect(sosLink).toHaveAttribute('href', '/sos')
      const productReportsLink = screen.getByRole('link', { name: /Product reports/i })
      expect(productReportsLink).toHaveAttribute('href', '/product-reports')

      // Group 2: People
      expect(screen.getByText('People')).toBeInTheDocument()
      const couriersLink = screen.getByRole('link', { name: /Couriers/i })
      expect(couriersLink).toHaveAttribute('href', '/couriers')
      const restaurantsLink = screen.getByRole('link', { name: /Restaurants/i })
      expect(restaurantsLink).toHaveAttribute('href', '/partners')

      // Group 3: Co-op
      expect(screen.getByText('Co-op')).toBeInTheDocument()
      const configLink = screen.getByRole('link', { name: /Settings/i })
      expect(configLink).toHaveAttribute('href', '/instance-configuration')
    })

    // Spec 0026 (row 77): the Co-op group gains "Shift slots" after Settings.
    it('lists Settings then "Shift slots" (/shift-slots) in the Co-op group, and marks Shift slots active there', () => {
      currentPathname = '/shift-slots'
      renderLayout()

      const coop = screen.getByRole('list', { name: 'Co-op' })
      const links = within(coop).getAllByRole('link')
      expect(links.map((link) => link.textContent?.trim())).toEqual(['Settings', 'Shift slots'])
      expect(links[1]).toHaveAttribute('href', '/shift-slots')
      expect(EAdminRoutes.SHIFT_SLOTS).toBe('/shift-slots')

      expect(links[1]).toHaveAttribute('aria-current', 'page')
      expect(links[0]).not.toHaveAttribute('aria-current')
      expect(screen.getAllByRole('link', { name: /Shift slots/ })).toHaveLength(1)
    })

    // Spec 0034 (chat), AC-2: Messages under Run the day with unread count, hidden at 0
    it('Messages unread badge is hidden when count is 0, and visible when count > 0', () => {
      // 1. With count = 0: badge is hidden
      mockUseGetChatUnreadCountQuery.mockReturnValue({
        data: { count: 0 },
      })
      const { unmount } = renderLayout()

      const messagesLink = screen.getByRole('link', { name: /Messages/i })
      expect(messagesLink).toBeInTheDocument()
      expect(screen.queryByLabelText(/unread/i)).toBeNull()
      unmount()

      // 2. With count = 4: badge renders with "4" and aria-label "4 unread"
      mockUseGetChatUnreadCountQuery.mockReturnValue({
        data: { count: 4 },
      })
      renderLayout()

      const badge = screen.getByLabelText('4 unread')
      expect(badge).toBeInTheDocument()
      expect(badge).toHaveTextContent('4')
    })

    it('marks current page with aria-current="page" and data-active="true"', () => {
      // 1. At root ("/"): Dispatch is active
      currentPathname = '/'
      const { unmount } = renderLayout()

      const dispatchLink = screen.getByRole('link', { name: /Dispatch/i })
      expect(dispatchLink).toHaveAttribute('aria-current', 'page')
      expect(dispatchLink.closest('[data-active]')).toHaveAttribute('data-active', 'true')

      const deliveriesLink = screen.getByRole('link', { name: /Deliveries/i })
      expect(deliveriesLink).not.toHaveAttribute('aria-current')
      unmount()

      // 2. At "/deliveries": Deliveries is active, Dispatch is not
      currentPathname = '/deliveries'
      renderLayout()

      const newDeliveriesLink = screen.getByRole('link', { name: /Deliveries/i })
      expect(newDeliveriesLink).toHaveAttribute('aria-current', 'page')

      const newDispatchLink = screen.getByRole('link', { name: /Dispatch/i })
      expect(newDispatchLink).not.toHaveAttribute('aria-current')
    })

    it('marks parent item active when visiting subpaths (e.g. /deliveries/cmvol123)', () => {
      currentPathname = '/deliveries/cmvol123'
      renderLayout()

      const deliveriesLink = screen.getByRole('link', { name: /Deliveries/i })
      expect(deliveriesLink).toHaveAttribute('aria-current', 'page')

      const dispatchLink = screen.getByRole('link', { name: /Dispatch/i })
      expect(dispatchLink).not.toHaveAttribute('aria-current')
    })

    it('Sign Out button in footer resets token, clears API cache, and closes all sheets', async () => {
      // Pre-seed an access token, an open sheet, and a cached API query
      store.dispatch(setAccessToken('test-admin-token'))
      store.dispatch(
        openSheet({
          id: 'test-open-sheet',
          children: 'Open Sheet Content',
        })
      )
      // Inject and initiate a lightweight query to populate store.getState().api.queries
      const testApi = api.injectEndpoints({
        endpoints: (build) => ({
          getSignOutTestQuery: build.query<{ ok: boolean }, void>({
            queryFn: () => ({ data: { ok: true } }),
          }),
        }),
        overrideExisting: true,
      })
      await store.dispatch(testApi.endpoints.getSignOutTestQuery.initiate())

      // Verify pre-conditions: store has token, cached queries, and open sheets
      expect(selectAccessToken(store.getState())).toBe('test-admin-token')
      expect(Object.keys(store.getState().api.queries).length).toBeGreaterThan(0)
      expect(selectSheets(store.getState()).length).toBeGreaterThan(0)

      const dispatchSpy = jest.spyOn(store, 'dispatch')
      renderLayout()

      const signOutButton = screen.getByRole('button', { name: /Sign Out/i })
      expect(signOutButton).toBeInTheDocument()

      fireEvent.click(signOutButton)

      // Dispatches setAccessToken(null), api.util.resetApiState(), and closeAllSheets()
      expect(dispatchSpy).toHaveBeenCalledWith(setAccessToken(null))
      expect(dispatchSpy).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'api/resetApiState' })
      )
      expect(dispatchSpy).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'sheets/closeAllSheets' })
      )

      // Post-conditions: after Sign Out the store has no token, no cached queries and no open sheets
      expect(selectAccessToken(store.getState())).toBeNull()
      expect(Object.keys(store.getState().api.queries)).toHaveLength(0)
      expect(selectSheets(store.getState())).toHaveLength(0)
    })
  })

  describe('isActivePath helper unit logic', () => {
    it('accurately matches exact routes and subpaths while keeping root strict', () => {
      expect(isActivePath('/', '/')).toBe(true)
      expect(isActivePath('/deliveries', '/')).toBe(false)
      expect(isActivePath('/deliveries', '/deliveries')).toBe(true)
      expect(isActivePath('/deliveries/dlv-123', '/deliveries')).toBe(true)
      expect(isActivePath('/deliveries-archived', '/deliveries')).toBe(false)
      expect(isActivePath('/partners', '/partners')).toBe(true)
      expect(isActivePath('/partners/p-1', '/partners')).toBe(true)
      expect(isActivePath('/couriers', '/couriers')).toBe(true)
      expect(isActivePath('/sos', '/sos')).toBe(true)
      expect(isActivePath('/sos/sos-123', '/sos')).toBe(true)
      expect(isActivePath('/product-reports', '/product-reports')).toBe(true)
      // Handles trailing slashes cleanly
      expect(isActivePath('/deliveries/', '/deliveries')).toBe(true)
      expect(isActivePath('/deliveries', '/deliveries/')).toBe(true)
    })
  })

  describe('Mobile Navigation below 1024px', () => {
    it('menu button opens mobile sheet, and route navigation closes it', () => {
      currentPathname = '/'
      const { rerender } = renderLayout()

      const menuButton = screen.getByRole('button', { name: 'Open menu' })
      expect(menuButton).toBeInTheDocument()

      // Before clicking, the mobile sheet dialog is not open
      expect(screen.queryByRole('dialog')).toBeNull()

      // Clicking menu button opens the sheet
      fireEvent.click(menuButton)
      const dialog = screen.getByRole('dialog')
      expect(dialog).toBeInTheDocument()
      expect(within(dialog).getByText('Menu')).toBeInTheDocument()

      // Navigating to another page (pathname change) closes the sheet
      currentPathname = '/deliveries'
      rerender(
        <Provider store={store}>
          <DefaultLayout>
            <div>New Page Content</div>
          </DefaultLayout>
        </Provider>
      )

      expect(screen.queryByRole('dialog')).toBeNull()
    })
  })

  describe('Design System Integrity Guards', () => {
    const rootDir = path.resolve(__dirname, '../../../')
    const filesToCheck = [
      'src/components/layouts/DefaultLayout.tsx',
      'src/components/layouts/AdminSidebar.tsx',
      'src/components/layouts/PageHeader.tsx',
      'src/modules/auth/components/SignInScreen.tsx',
      'src/admin-web-components/components/atoms/Field.tsx',
      'src/admin-web-components/components/molecules/Sidebar.tsx',
    ]

    it('ensures none of the new files import from lucide', () => {
      const forbiddenPkg = ['lucide', 'react'].join('-')
      const forbiddenImportRegex = new RegExp(`from ['"]${forbiddenPkg}['"]|from ['"]lucide['"]`)
      const offending: string[] = []
      filesToCheck.forEach((relPath) => {
        const fullPath = path.join(rootDir, relPath)
        const content = fs.readFileSync(fullPath, 'utf8')
        if (forbiddenImportRegex.test(content)) {
          offending.push(relPath)
        }
      })
      expect(offending).toEqual([])
    })

    it('ensures none of the new files contain raw hex colors', () => {
      const offending: string[] = []
      filesToCheck.forEach((relPath) => {
        const fullPath = path.join(rootDir, relPath)
        const content = fs.readFileSync(fullPath, 'utf8')
        // Match hex colors like #fff or #123456 (not URL fragments or CSS vars)
        const matches = content.match(/#[0-9a-fA-F]{3,6}\b/g)
        if (matches && matches.length > 0) {
          offending.push(`${relPath}: ${matches.join(', ')}`)
        }
      })
      expect(offending).toEqual([])
    })

    it('ensures none of the new files contain raw gray-* classes', () => {
      const offending: string[] = []
      filesToCheck.forEach((relPath) => {
        const fullPath = path.join(rootDir, relPath)
        const content = fs.readFileSync(fullPath, 'utf8')
        const matches = content.match(/\b(text|bg|border|ring)-gray-\d+\b/g)
        if (matches && matches.length > 0) {
          offending.push(`${relPath}: ${matches.join(', ')}`)
        }
      })
      expect(offending).toEqual([])
    })
  })
})
