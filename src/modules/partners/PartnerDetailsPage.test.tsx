import React from 'react'
import { render, screen } from '@testing-library/react'
import PartnerDetailsPage from '../../pages/partners/[partnerId]'
import { useGetPartnerQuery } from '../../api/partnersApi'

// Mock DefaultLayout to avoid requiring full layout & nav providers
jest.mock('../../components/layouts/DefaultLayout', () => ({
  DefaultLayout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="default-layout">{children}</div>
  ),
}))

// Mock admin page navigator
jest.mock('../../hooks/useAdminPageNavigator', () => ({
  useAdminPageNavigator: () => ({
    goToPartners: jest.fn(),
  }),
}))

// Mock Next.js router
let mockRouter = {
  pathname: '/partners/[partnerId]',
  query: { partnerId: 'partner-abc-123' } as Record<string, string | undefined>,
  push: jest.fn(),
}

jest.mock('next/router', () => ({
  useRouter: () => mockRouter,
}))

// Mock RTK Query partnersApi
jest.mock('../../api/partnersApi', () => ({
  useGetPartnerQuery: jest.fn(),
}))

// Mock child dialogs and customer card to keep tests focused on page header and navigation
jest.mock('./components/PartnerCustomersCard', () => ({
  PartnerCustomersCard: () => <div data-testid="mock-customers-card" />,
}))
jest.mock('./components/PartnerFormDialog', () => ({
  PartnerFormDialog: () => null,
}))
jest.mock('./components/RotateCredentialsDialog', () => ({
  RotateCredentialsDialog: () => null,
}))

const mockUseGetPartnerQuery = useGetPartnerQuery as jest.Mock

describe('Partner details page (spec 0017, AC-7: "See its orders" link)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRouter = {
      pathname: '/partners/[partnerId]',
      query: { partnerId: 'partner-abc-123' },
      push: jest.fn(),
    }
  })

  it('renders a "See its orders" link pointing to /deliveries?partnerId=<id>', () => {
    mockUseGetPartnerQuery.mockReturnValue({
      data: {
        id: 'partner-abc-123',
        name: 'Souvlaki Bar',
        email: 'souvlaki@bar.gr',
      },
      isLoading: false,
      isError: false,
    })

    render(<PartnerDetailsPage />)

    // Link in PageHeader action per spec 0017, AC-7
    const ordersLink = screen.getByRole('link', { name: /see its orders/i })
    expect(ordersLink).toBeInTheDocument()
    expect(ordersLink).toHaveAttribute('href', '/deliveries?partnerId=partner-abc-123')
  })

  it('does not render "See its orders" link while loading', () => {
    mockUseGetPartnerQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    })

    render(<PartnerDetailsPage />)

    expect(screen.queryByRole('link', { name: /see its orders/i })).toBeNull()
    expect(screen.getByText(/loading restaurant details/i)).toBeInTheDocument()
  })

  it('does not render "See its orders" link when partner is not found or error occurs', () => {
    mockUseGetPartnerQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
    })

    render(<PartnerDetailsPage />)

    expect(screen.queryByRole('link', { name: /see its orders/i })).toBeNull()
    expect(screen.getByText(/restaurant not found or error loading data/i)).toBeInTheDocument()
  })
})
