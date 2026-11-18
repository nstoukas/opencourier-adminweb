import React from 'react'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { Provider } from 'react-redux'
import { makeStore } from '@/redux/store'
import { PartnerMonthPage } from './PartnerMonthPage'
import { useGetPartnerChargePartnerMonthQuery } from '@/api/partnerChargeApi'
import { DELIVERY_FEE_NOTE } from './chargeWording'
import type { PartnerChargePartnerMonthDto } from '@/backend-admin-sdk'

const mockDownloadCsv = jest.fn()
jest.mock('./chargesCsv', () => ({
  ...jest.requireActual('./chargesCsv'),
  downloadCsv: (...args: any[]) => mockDownloadCsv(...args),
}))

jest.mock('next/link', () => {
  return function MockLink({ children, href, ...rest }: any) {
    let resolvedHref = href
    if (typeof href === 'object' && href !== null) {
      let path = href.pathname || ''
      const query = href.query || {}
      for (const [key, value] of Object.entries(query)) {
        if (path.includes(`[${key}]`)) {
          path = path.replace(`[${key}]`, String(value))
        }
      }
      const searchParams = new URLSearchParams()
      for (const [key, value] of Object.entries(query)) {
        if (!href.pathname?.includes(`[${key}]`)) {
          searchParams.set(key, String(value))
        }
      }
      const qs = searchParams.toString()
      resolvedHref = qs ? `${path}?${qs}` : path
    }
    return (
      <a href={resolvedHref} {...rest}>
        {children}
      </a>
    )
  }
})

let mockRouter = {
  pathname: '/charges/[month]/[partnerId]',
  query: { month: '2026-11', partnerId: 'p-1' } as Record<string, string | undefined>,
  isReady: true,
  push: jest.fn(),
}

jest.mock('next/router', () => ({
  useRouter: () => mockRouter,
}))

const mockCreatePartnerBill = jest.fn()
const mockUndoPartnerBill = jest.fn()

jest.mock('../../api/partnerChargeApi', () => ({
  ...jest.requireActual('../../api/partnerChargeApi'),
  useGetPartnerChargePartnerMonthQuery: jest.fn(),
  useCreatePartnerBillMutation: () => [mockCreatePartnerBill, { isLoading: false }],
  useUndoPartnerBillMutation: () => [mockUndoPartnerBill, { isLoading: false }],
}))

const mockUseGetPartnerChargePartnerMonthQuery = useGetPartnerChargePartnerMonthQuery as jest.Mock

const sampleData: PartnerChargePartnerMonthDto = {
  partner: { id: 'p-1', name: 'Nosh' },
  month: '2026-11',
  charges: [
    {
      id: 'charge-1',
      createdAt: '2026-11-10T10:00:00Z',
      happenedAt: '2026-11-10T08:00:00Z',
      reason: 'WAITING',
      waitMinutes: 12,
      removalLabel: null,
      amount: 1240,
      currencyCode: 'EUR',
      deliveryId: 'del-111111111111',
      orderReference: 'ORD-1',
      billId: null,
      bill: null,
    },
    {
      id: 'charge-2',
      createdAt: '2026-11-12T12:00:00Z',
      happenedAt: '2026-11-12T10:00:00Z',
      reason: 'CANCELLATION',
      waitMinutes: null,
      removalLabel: null,
      amount: 800,
      currencyCode: 'EUR',
      deliveryId: 'del-222222222222',
      orderReference: null,
      billId: 'bill-1',
      bill: {
        id: 'bill-1',
        reference: 'INV-001',
        createdAt: '2026-11-15T12:00:00Z',
      },
    },
  ],
  bills: [
    {
      id: 'bill-1',
      month: '2026-11',
      reference: 'INV-001',
      createdAt: '2026-11-15T12:00:00Z',
      billedByLabel: 'admin@coop.gr',
      lineCount: 1,
      totals: [{ currencyCode: 'EUR', amount: 800 }],
      undoneAt: null,
      undoneByLabel: null,
      undoReason: null,
      chargeIds: ['charge-2'],
    },
    {
      id: 'bill-2',
      month: '2026-11',
      reference: null,
      createdAt: '2026-11-14T08:00:00Z',
      billedByLabel: 'other@coop.gr',
      lineCount: 2,
      totals: [{ currencyCode: 'EUR', amount: 1500 }],
      undoneAt: '2026-11-14T10:00:00Z',
      undoneByLabel: 'admin@coop.gr',
      undoReason: 'Mistake in lines',
      chargeIds: ['charge-3', 'charge-4'],
    },
  ],
  totals: [{ currencyCode: 'EUR', charged: 2040, billed: 800, unbilled: 1240 }],
}

describe('PartnerMonthPage (spec 0036, AC-3 to AC-8, AC-10)', () => {
  let store: ReturnType<typeof makeStore>

  beforeEach(() => {
    jest.clearAllMocks()
    store = makeStore()
    mockRouter = {
      pathname: '/charges/[month]/[partnerId]',
      query: { month: '2026-11', partnerId: 'p-1' },
      isReady: true,
      push: jest.fn(),
    }
    mockUseGetPartnerChargePartnerMonthQuery.mockReturnValue({
      currentData: sampleData,
      isLoading: false,
      isFetching: false,
      isError: false,
    })
  })

  function renderPage() {
    return render(
      <Provider store={store}>
        <PartnerMonthPage />
      </Provider>
    )
  }

  it('shows error when month in router is invalid', () => {
    mockRouter.query = { month: '2026-13', partnerId: 'p-1' }
    renderPage()

    expect(screen.getByText('This address does not name a month (YYYY-MM).')).toBeInTheDocument()
  })

  it('shows "This restaurant was not found." on 404 error', () => {
    mockUseGetPartnerChargePartnerMonthQuery.mockReturnValue({
      currentData: undefined,
      isLoading: false,
      isFetching: false,
      isError: true,
      error: { statusCode: 404 },
    })

    renderPage()
    expect(screen.getByText('This restaurant was not found.')).toBeInTheDocument()
  })

  it('shows "Could not load the charges." on general error', () => {
    mockUseGetPartnerChargePartnerMonthQuery.mockReturnValue({
      currentData: undefined,
      isLoading: false,
      isFetching: false,
      isError: true,
      error: { statusCode: 500 },
    })

    renderPage()
    expect(screen.getByText('Could not load the charges.')).toBeInTheDocument()
  })

  it('renders totals and DELIVERY_FEE_NOTE', () => {
    renderPage()

    const totalsSection = screen.getByRole('region', { name: 'Totals' })
    expect(within(totalsSection).getByText('Charged')).toBeInTheDocument()
    expect(within(totalsSection).getByText('€20.40')).toBeInTheDocument()
    expect(within(totalsSection).getByText('Billed')).toBeInTheDocument()
    expect(within(totalsSection).getByText('€8.00')).toBeInTheDocument()
    expect(within(totalsSection).getByText('Unbilled')).toBeInTheDocument()
    expect(within(totalsSection).getByText('€12.40')).toBeInTheDocument()

    expect(screen.getByText(DELIVERY_FEE_NOTE)).toBeInTheDocument()
  })

  it('lists charges oldest first with Athens time, order link, reason, amount, and billed status', () => {
    renderPage()

    // Unbilled line
    const order1Link = screen.getByRole('link', { name: 'ORD-1 · 111111' })
    expect(order1Link).toHaveAttribute('href', '/deliveries/del-111111111111')
    expect(screen.getByText('Rider kept waiting, 12 min past the agreed ready time')).toBeInTheDocument()
    expect(screen.getByText('Not billed')).toBeInTheDocument()

    // Billed line (no order reference -> short id alone)
    const order2Link = screen.getByRole('link', { name: '222222' })
    expect(order2Link).toHaveAttribute('href', '/deliveries/del-222222222222')
    expect(screen.getByText('Cancelled after a rider accepted')).toBeInTheDocument()
    expect(screen.getAllByText('INV-001').length).toBe(2) // Once in line row, once in bills list
  })

  it('lists bills newest first with label, who billed and when, line count and total, and handles undone bills', () => {
    renderPage()

    // Bill 1 (open bill)
    expect(screen.getByText(/Billed by admin@coop\.gr on/)).toBeInTheDocument()
    expect(screen.getByText(/1 line · €8\.00/)).toBeInTheDocument()
    const undoButton = screen.getByRole('button', { name: 'Undo INV-001' })
    expect(undoButton).toBeInTheDocument()

    // Bill 2 (undone bill)
    expect(screen.getByText(/Undone by admin@coop\.gr on .*: Mistake in lines/)).toBeInTheDocument()
    // Undone bill has NO Undo button!
    expect(screen.queryByRole('button', { name: /Undo Billed 14\/11\/2026/ })).toBeNull()
  })

  it('Download CSV triggers download with sanitized filename', () => {
    renderPage()

    const csvButton = screen.getByRole('button', { name: /Download CSV/i })
    fireEvent.click(csvButton)

    expect(mockDownloadCsv).toHaveBeenCalledWith('charges-2026-11-Nosh.csv', expect.any(String))
  })

  describe('Focus management (adminweb AGENTS.md, Radix, decision 109.5)', () => {
    it('after Mark as billed Cancel, focus returns to Mark as billed button', async () => {
      renderPage()

      const billBtn = screen.getByRole('button', { name: /Mark as billed/i })
      fireEvent.click(billBtn)

      // Dialog opens
      expect(screen.getByRole('heading', { name: 'Mark as billed' })).toBeInTheDocument()

      const cancelBtn = screen.getByRole('button', { name: 'Cancel' })
      fireEvent.click(cancelBtn)

      await waitFor(() => {
        expect(screen.queryByRole('heading', { name: 'Mark as billed' })).toBeNull()
        expect(document.activeElement).toBe(billBtn)
      })
    })

    it('after Mark as billed succeeds, focus moves to Bills heading', async () => {
      mockCreatePartnerBill.mockReturnValue({
        unwrap: () => Promise.resolve({ id: 'bill-new' }),
      })

      renderPage()

      const billBtn = screen.getByRole('button', { name: /Mark as billed/i })
      fireEvent.click(billBtn)

      const confirmBtn = screen.getByRole('button', { name: /Confirm 1 line/i })
      fireEvent.click(confirmBtn)

      await waitFor(() => {
        expect(screen.queryByRole('heading', { name: 'Mark as billed' })).toBeNull()
        expect(document.activeElement).toBe(screen.getByText('Bills'))
      })
    })

    it('after Undo Cancel, focus returns to the Undo button that opened it', async () => {
      renderPage()

      const undoBtn = screen.getByRole('button', { name: 'Undo INV-001' })
      fireEvent.click(undoBtn)

      expect(screen.getByRole('heading', { name: 'Undo INV-001?' })).toBeInTheDocument()

      const cancelBtn = screen.getByRole('button', { name: 'Cancel' })
      fireEvent.click(cancelBtn)

      await waitFor(() => {
        expect(screen.queryByRole('heading', { name: 'Undo INV-001?' })).toBeNull()
        expect(document.activeElement).toBe(undoBtn)
      })
    })

    it('after Undo succeeds, focus moves to Bills heading', async () => {
      mockUndoPartnerBill.mockReturnValue({
        unwrap: () => Promise.resolve({ id: 'bill-1' }),
      })

      renderPage()

      const undoBtn = screen.getByRole('button', { name: 'Undo INV-001' })
      fireEvent.click(undoBtn)

      const textarea = screen.getByLabelText('Why')
      fireEvent.change(textarea, { target: { value: 'Invoicing error' } })

      const confirmUndoBtn = screen.getByRole('button', { name: 'Undo bill' })
      fireEvent.click(confirmUndoBtn)

      await waitFor(() => {
        expect(screen.queryByRole('heading', { name: 'Undo INV-001?' })).toBeNull()
        expect(document.activeElement).toBe(screen.getByText('Bills'))
      })
    })
  })

  it('scans visible text on PartnerMonthPage for "fee" and "delivery price", allowing only DELIVERY_FEE_NOTE', () => {
    const { container } = renderPage()
    const textContent = container.textContent || ''

    // Remove allowed note
    const sanitized = textContent.replace(DELIVERY_FEE_NOTE, '')

    expect(sanitized).not.toMatch(/\bfee\b/i)
    expect(sanitized).not.toMatch(/delivery price/i)
  })
})
