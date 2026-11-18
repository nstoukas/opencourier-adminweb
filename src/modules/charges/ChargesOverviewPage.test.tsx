import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { ChargesOverviewPage } from './ChargesOverviewPage'
import { useGetPartnerChargeMonthQuery } from '@/api/partnerChargeApi'
import { DELIVERY_FEE_NOTE } from './chargeWording'
import type { PartnerChargeMonthDto } from '@/backend-admin-sdk'

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
  pathname: '/charges',
  query: {} as Record<string, string | undefined>,
  isReady: true,
  push: jest.fn(),
}

jest.mock('next/router', () => ({
  useRouter: () => mockRouter,
}))

jest.mock('../../api/partnerChargeApi', () => ({
  useGetPartnerChargeMonthQuery: jest.fn(),
}))

const mockUseGetPartnerChargeMonthQuery = useGetPartnerChargeMonthQuery as jest.Mock

describe('ChargesOverviewPage (spec 0036, AC-1, AC-2, AC-4, AC-10)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRouter = {
      pathname: '/charges',
      query: { month: '2026-11' },
      isReady: true,
      push: jest.fn(),
    }
  })

  it('shows empty state "No charges in November 2026" for a month with no charges', () => {
    mockUseGetPartnerChargeMonthQuery.mockReturnValue({
      currentData: {
        month: '2026-11',
        restaurants: [],
        charges: [],
        earlierUnbilled: [],
      } as PartnerChargeMonthDto,
      isLoading: false,
      isFetching: false,
      isError: false,
    })

    render(<ChargesOverviewPage />)

    expect(screen.getByText('No charges in November 2026')).toBeInTheDocument()
    const downloadButton = screen.getByRole('button', { name: /Download CSV/i })
    expect(downloadButton).toBeDisabled()
  })

  it('renders restaurants in server order with name, count, charged, billed, unbilled', () => {
    mockUseGetPartnerChargeMonthQuery.mockReturnValue({
      currentData: {
        month: '2026-11',
        restaurants: [
          {
            partnerId: 'p-1',
            partnerName: 'Nosh',
            count: 3,
            totals: [{ currencyCode: 'EUR', charged: 3500, billed: 1500, unbilled: 2000 }],
          },
          {
            partnerId: 'p-2',
            partnerName: 'Souvlaki Bar',
            count: 1,
            totals: [{ currencyCode: 'EUR', charged: 1000, billed: 1000, unbilled: 0 }],
          },
        ],
        charges: [
          {
            id: 'c-1',
            partnerId: 'p-1',
            partnerName: 'Nosh',
            createdAt: '2026-11-10T10:00:00Z',
            happenedAt: '2026-11-10T10:00:00Z',
            reason: 'WAITING',
            waitMinutes: 10,
            removalLabel: null,
            amount: 2000,
            currencyCode: 'EUR',
            deliveryId: 'del-123456789012',
            orderReference: 'ORD-1',
            billId: null,
            bill: null,
          },
        ],
        earlierUnbilled: [],
      } as PartnerChargeMonthDto,
      isLoading: false,
      isFetching: false,
      isError: false,
    })

    render(<ChargesOverviewPage />)

    // Restaurant links
    const noshLink = screen.getByRole('link', { name: 'Nosh' })
    expect(noshLink).toHaveAttribute('href', '/charges/2026-11/p-1')

    const souvlakiLink = screen.getByRole('link', { name: 'Souvlaki Bar' })
    expect(souvlakiLink).toHaveAttribute('href', '/charges/2026-11/p-2')

    // Table values for Nosh
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByText('€35.00')).toBeInTheDocument()
    expect(screen.getByText('€15.00')).toBeInTheDocument()
    expect(screen.getByText('€20.00')).toBeInTheDocument()

    // Fixed note under table
    expect(screen.getByText(DELIVERY_FEE_NOTE)).toBeInTheDocument()

    // Download CSV button is enabled
    const downloadButton = screen.getByRole('button', { name: /Download CSV/i })
    expect(downloadButton).toBeEnabled()
    fireEvent.click(downloadButton)
    expect(mockDownloadCsv).toHaveBeenCalledWith('charges-2026-11.csv', expect.any(String))
  })

  it('renders earlier unbilled months line with links to each month', () => {
    mockUseGetPartnerChargeMonthQuery.mockReturnValue({
      currentData: {
        month: '2026-11',
        restaurants: [],
        charges: [],
        earlierUnbilled: [
          { month: '2026-09', count: 2 },
          { month: '2026-10', count: 1 },
        ],
      } as PartnerChargeMonthDto,
      isLoading: false,
      isFetching: false,
      isError: false,
    })

    render(<ChargesOverviewPage />)

    // 3 unbilled charges in earlier months: September 2026, October 2026
    expect(screen.getByText(/3 unbilled charges in earlier months:/i)).toBeInTheDocument()

    const sepLink = screen.getByRole('link', { name: 'September 2026' })
    expect(sepLink).toHaveAttribute('href', '/charges?month=2026-09')

    const octLink = screen.getByRole('link', { name: 'October 2026' })
    expect(octLink).toHaveAttribute('href', '/charges?month=2026-10')
  })

  it('Previous and Next buttons push ?month= to router', () => {
    mockUseGetPartnerChargeMonthQuery.mockReturnValue({
      currentData: {
        month: '2026-11',
        restaurants: [],
        charges: [],
        earlierUnbilled: [],
      } as PartnerChargeMonthDto,
      isLoading: false,
      isFetching: false,
      isError: false,
    })

    render(<ChargesOverviewPage />)

    const prevButton = screen.getByRole('button', { name: /Previous/i })
    fireEvent.click(prevButton)
    expect(mockRouter.push).toHaveBeenCalledWith({
      pathname: '/charges',
      query: { month: '2026-10' },
    })

    const nextButton = screen.getByRole('button', { name: /Next/i })
    fireEvent.click(nextButton)
    expect(mockRouter.push).toHaveBeenCalledWith({
      pathname: '/charges',
      query: { month: '2026-12' },
    })
  })

  it('scans visible text on ChargesOverviewPage for "fee" and "delivery price", allowing only DELIVERY_FEE_NOTE', () => {
    mockUseGetPartnerChargeMonthQuery.mockReturnValue({
      currentData: {
        month: '2026-11',
        restaurants: [
          {
            partnerId: 'p-1',
            partnerName: 'Nosh',
            count: 1,
            totals: [{ currencyCode: 'EUR', charged: 1000, billed: 0, unbilled: 1000 }],
          },
        ],
        charges: [
          {
            id: 'c-1',
            partnerId: 'p-1',
            partnerName: 'Nosh',
            createdAt: '2026-11-10T10:00:00Z',
            happenedAt: '2026-11-10T10:00:00Z',
            reason: 'WAITING',
            waitMinutes: 10,
            removalLabel: null,
            amount: 1000,
            currencyCode: 'EUR',
            deliveryId: 'del-123456789012',
            orderReference: 'ORD-1',
            billId: null,
            bill: null,
          },
        ],
        earlierUnbilled: [],
      } as PartnerChargeMonthDto,
      isLoading: false,
      isFetching: false,
      isError: false,
    })

    const { container } = render(<ChargesOverviewPage />)
    const textContent = container.textContent || ''

    // Remove the allowed DELIVERY_FEE_NOTE
    const sanitized = textContent.replace(DELIVERY_FEE_NOTE, '')

    expect(sanitized).not.toMatch(/\bfee\b/i)
    expect(sanitized).not.toMatch(/delivery price/i)
  })
})
