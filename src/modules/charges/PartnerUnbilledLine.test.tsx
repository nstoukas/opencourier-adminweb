import React from 'react'
import { render, screen } from '@testing-library/react'
import { PartnerUnbilledLine } from './PartnerUnbilledLine'
import { useGetPartnerChargeMonthQuery } from '@/api/partnerChargeApi'
import type { PartnerChargeMonthDto } from '@/backend-admin-sdk'

jest.mock('../../api/partnerChargeApi', () => ({
  useGetPartnerChargeMonthQuery: jest.fn(),
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
      resolvedHref = path
    }
    return (
      <a href={resolvedHref} {...rest}>
        {children}
      </a>
    )
  }
})

const mockUseGetPartnerChargeMonthQuery = useGetPartnerChargeMonthQuery as jest.Mock

describe('PartnerUnbilledLine (spec 0036, AC-11)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders "Could not load this month\'s charges." on query error (never null or looks like nothing owed)', () => {
    mockUseGetPartnerChargeMonthQuery.mockReturnValue({
      currentData: undefined,
      isLoading: false,
      isFetching: false,
      isError: true,
      error: { statusCode: 500 },
    })

    const { container } = render(<PartnerUnbilledLine partnerId="p-1" />)

    expect(screen.getByText("Could not load this month's charges.")).toBeInTheDocument()
    expect(container.firstChild).not.toBeNull()
  })

  it('renders null when partnerId is empty', () => {
    mockUseGetPartnerChargeMonthQuery.mockReturnValue({
      currentData: undefined,
      isLoading: false,
      isFetching: false,
      isError: false,
    })

    const { container } = render(<PartnerUnbilledLine partnerId="" />)
    expect(container.firstChild).toBeNull()
  })

  it('renders null while data is not yet available', () => {
    mockUseGetPartnerChargeMonthQuery.mockReturnValue({
      currentData: undefined,
      isLoading: true,
      isFetching: true,
      isError: false,
    })

    const { container } = render(<PartnerUnbilledLine partnerId="p-1" />)
    expect(container.firstChild).toBeNull()
  })

  it('renders link to partner month page with "Unbilled charges this month: €12.40"', () => {
    mockUseGetPartnerChargeMonthQuery.mockReturnValue({
      currentData: {
        month: '2026-11',
        restaurants: [],
        charges: [
          {
            id: 'c-1',
            billId: null,
            amount: 1240,
            currencyCode: 'EUR',
          },
        ],
        earlierUnbilled: [],
      } as unknown as PartnerChargeMonthDto,
      isLoading: false,
      isFetching: false,
      isError: false,
    })

    render(<PartnerUnbilledLine partnerId="p-1" />)

    const link = screen.getByRole('link', { name: 'Unbilled charges this month: €12.40' })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', '/charges/2026-11/p-1')
  })

  it('renders link with "No charges this month" when restaurant has zero charges', () => {
    mockUseGetPartnerChargeMonthQuery.mockReturnValue({
      currentData: {
        month: '2026-11',
        restaurants: [],
        charges: [],
        earlierUnbilled: [],
      } as unknown as PartnerChargeMonthDto,
      isLoading: false,
      isFetching: false,
      isError: false,
    })

    render(<PartnerUnbilledLine partnerId="p-1" />)

    const link = screen.getByRole('link', { name: 'No charges this month' })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', '/charges/2026-11/p-1')
  })

  it('renders link with "No unbilled charges this month" when every charge has a billId', () => {
    mockUseGetPartnerChargeMonthQuery.mockReturnValue({
      currentData: {
        month: '2026-11',
        restaurants: [],
        charges: [
          {
            id: 'c-1',
            billId: 'b-1',
            amount: 1240,
            currencyCode: 'EUR',
          },
        ],
        earlierUnbilled: [],
      } as unknown as PartnerChargeMonthDto,
      isLoading: false,
      isFetching: false,
      isError: false,
    })

    render(<PartnerUnbilledLine partnerId="p-1" />)

    const link = screen.getByRole('link', { name: 'No unbilled charges this month' })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', '/charges/2026-11/p-1')
  })
})
