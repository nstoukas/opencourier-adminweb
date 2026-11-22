import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import { createI18n } from '@/i18n/createI18n'
import { BillStatementPage } from './BillStatementPage'
import { useGetPartnerBillStatementQuery } from '@/api/partnerChargeApi'
import { el } from '@/i18n/resources/el'
import type { PartnerBillStatementDto } from '@/backend-admin-sdk'

const GREEK = {
  statementTitle: el.charges.statement.title,
  total: el.charges.statement.total,
  notATaxDocument: el.charges.statement.notATaxDocument,
  deliveryFeeNote: el.charges.statement.customerPaysDelivery,
  undoneBanner: el.charges.statement.undoneBanner,
}

let mockRouter = {
  pathname: '/charges/statement/[billId]',
  query: { billId: 'bill-1' } as Record<string, string | undefined>,
  isReady: true,
}

jest.mock('next/router', () => ({
  useRouter: () => mockRouter,
}))

jest.mock('../../api/partnerChargeApi', () => ({
  useGetPartnerBillStatementQuery: jest.fn(),
}))

jest.mock('../../components/layouts/AdminSidebar', () => ({
  useCoopName: () => 'Συνεταιρισμός Εργαζομένων Βόλου',
}))

const mockUseGetPartnerBillStatementQuery = useGetPartnerBillStatementQuery as jest.Mock

const sampleStatement: PartnerBillStatementDto = {
  partner: {
    name: 'Nosh',
    pickupAddress: 'Iasonos 42, Volos',
  },
  month: '2026-11',
  bill: {
    id: 'bill-1',
    month: '2026-11',
    reference: 'ΤΠΥ 41',
    createdAt: '2026-11-18T12:05:00Z',
    billedByLabel: 'admin@coop.gr',
    lineCount: 2,
    totals: [{ currencyCode: 'EUR', amount: 1540 }],
    undoneAt: null,
    undoneByLabel: null,
    undoReason: null,
    chargeIds: ['c-1', 'c-2'],
  },
  lines: [
    {
      id: 'c-1',
      createdAt: '2026-11-10T10:00:00Z',
      happenedAt: '2026-11-10T08:00:00Z',
      reason: 'WAITING',
      waitMinutes: 1,
      removalLabel: null,
      amount: 1240,
      currencyCode: 'EUR',
      deliveryId: 'del-111111111111',
      orderReference: 'ORD-1',
    },
    {
      id: 'c-2',
      createdAt: '2026-11-12T12:00:00Z',
      happenedAt: '2026-11-12T10:00:00Z',
      reason: 'CANCELLATION',
      waitMinutes: null,
      removalLabel: null,
      amount: 300,
      currencyCode: 'EUR',
      deliveryId: 'del-222222222222',
      orderReference: null,
    },
  ],
  totals: [{ currencyCode: 'EUR', amount: 1540 }],
}

describe('BillStatementPage (spec 0036, AC-9)', () => {
  const originalPrint = window.print

  beforeEach(() => {
    jest.clearAllMocks()
    window.print = jest.fn()
    mockRouter = {
      pathname: '/charges/statement/[billId]',
      query: { billId: 'bill-1' },
      isReady: true,
    }
    mockUseGetPartnerBillStatementQuery.mockReturnValue({
      currentData: sampleStatement,
      isLoading: false,
      isFetching: false,
      isError: false,
    })
  })

  afterAll(() => {
    window.print = originalPrint
  })

  it('renders Greek header with co-op name, restaurant name, pickup address, Greek month and label', () => {
    render(<BillStatementPage />)

    expect(screen.getByText('Συνεταιρισμός Εργαζομένων Βόλου')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: GREEK.statementTitle })).toBeInTheDocument()
    expect(screen.getByText('Nosh')).toBeInTheDocument()
    expect(screen.getByText('Iasonos 42, Volos')).toBeInTheDocument()
    expect(screen.getByText('Νοέμβριος 2026')).toBeInTheDocument()
    // Reference and Athens time (12:05 UTC = 14:05 Athens)
    expect(screen.getByText(/ΤΠΥ 41 · 18\/11\/2026 14:05/)).toBeInTheDocument()
  })

  it('omits pickup address when pickupAddress is null', () => {
    mockUseGetPartnerBillStatementQuery.mockReturnValue({
      currentData: {
        ...sampleStatement,
        partner: { name: 'Souvlaki Bar', pickupAddress: null },
      },
      isLoading: false,
      isFetching: false,
      isError: false,
    })

    render(<BillStatementPage />)
    expect(screen.getByText('Souvlaki Bar')).toBeInTheDocument()
    expect(screen.queryByText('Iasonos 42, Volos')).toBeNull()
  })

  it('renders lines table with Greek reasons and Greek amounts', () => {
    render(<BillStatementPage />)

    // Wait line: 1 min -> 1 λεπτό
    expect(
      screen.getByText('Αναμονή διανομέα, 1 λεπτό μετά την ώρα που είχε συμφωνηθεί')
    ).toBeInTheDocument()
    // Cancellation line
    expect(
      screen.getByText('Ακύρωση αφού διανομέας είχε αποδεχτεί την παραγγελία')
    ).toBeInTheDocument()

    // orderLabel: ORD-1 for c-1, 222222 (short id) for c-2
    expect(screen.getByText('ORD-1')).toBeInTheDocument()
    expect(screen.getByText('222222')).toBeInTheDocument()

    // Amounts format (12,40 € and 3,00 €)
    expect(screen.getByText(/^12,40[\s\u00A0]€$/)).toBeInTheDocument()
    expect(screen.getByText(/^3,00[\s\u00A0]€$/)).toBeInTheDocument()

    // Total row
    expect(screen.getByText(GREEK.total)).toBeInTheDocument()
    expect(screen.getByText(/^15,40[\s\u00A0]€$/)).toBeInTheDocument()
  })

  it('renders both fixed Greek sentences at the bottom', () => {
    render(<BillStatementPage />)

    expect(screen.getByText(GREEK.notATaxDocument)).toBeInTheDocument()
    expect(screen.getByText(GREEK.deliveryFeeNote)).toBeInTheDocument()
  })

  it('does NOT render "Ακυρώθηκε" banner when bill is not undone', () => {
    render(<BillStatementPage />)
    expect(screen.queryByText(GREEK.undoneBanner)).toBeNull()
  })

  it('renders "Ακυρώθηκε" banner when bill is undone', () => {
    mockUseGetPartnerBillStatementQuery.mockReturnValue({
      currentData: {
        ...sampleStatement,
        bill: {
          ...sampleStatement.bill,
          undoneAt: '2026-11-18T14:00:00Z',
          undoneByLabel: 'admin@coop.gr',
          undoReason: 'Wrong invoice number',
        },
      },
      isLoading: false,
      isFetching: false,
      isError: false,
    })

    render(<BillStatementPage />)

    const banner = screen.getByRole('status')
    expect(banner).toHaveTextContent(GREEK.undoneBanner)
  })

  it('Print button is wrapped in a container carrying "print:hidden" and triggers window.print', () => {
    render(<BillStatementPage />)

    const printButton = screen.getByRole('button', { name: /Print/i })
    expect(printButton.parentElement).toHaveClass('print:hidden')

    fireEvent.click(printButton)
    expect(window.print).toHaveBeenCalledTimes(1)
  })

  it('the Print button follows the reader language while statement body stays Greek (cross check 11)', () => {
    // With English reader
    const i18nEn = createI18n('en')
    const { unmount } = render(
      <I18nextProvider i18n={i18nEn}>
        <BillStatementPage />
      </I18nextProvider>
    )

    const printButtonEn = screen.getByRole('button', { name: 'Print' })
    expect(printButtonEn).toHaveAttribute('lang', 'en')
    expect(screen.getByText(GREEK.statementTitle)).toBeInTheDocument()
    unmount()

    // With Greek reader
    const i18nEl = createI18n('el')
    render(
      <I18nextProvider i18n={i18nEl}>
        <BillStatementPage />
      </I18nextProvider>
    )

    const printButtonEl = screen.getByRole('button', { name: 'Εκτύπωση' })
    expect(printButtonEl).toHaveAttribute('lang', 'el')
    expect(screen.getByText(GREEK.statementTitle)).toBeInTheDocument()
  })

  it('shows error state "This bill was not found." on 404 error', () => {
    mockUseGetPartnerBillStatementQuery.mockReturnValue({
      currentData: undefined,
      isLoading: false,
      isFetching: false,
      isError: true,
      error: { statusCode: 404 },
    })

    render(<BillStatementPage />)
    expect(screen.getByText('This bill was not found.')).toBeInTheDocument()
  })
})
