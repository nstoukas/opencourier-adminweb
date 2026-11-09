import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import ProductReportsPage from '../../pages/product-reports'
import { useGetProductReportsQuery } from '../../api/deliveriesApi'
import type { ProductReportAdminDto } from '../../backend-admin-sdk'

// Mock DefaultLayout to avoid needing full Redux store provider / router
jest.mock('../../components/layouts/DefaultLayout', () => ({
  DefaultLayout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="default-layout">{children}</div>
  ),
}))

jest.mock('../../api/deliveriesApi', () => ({
  useGetProductReportsQuery: jest.fn(),
  useResolveProductReportMutation: jest.fn().mockReturnValue([jest.fn(), { isLoading: false }]),
}))

const mockUseGetProductReportsQuery = useGetProductReportsQuery as jest.Mock

describe('ProductReportsPage (spec 0032, AC-6, AC-9)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseGetProductReportsQuery.mockReturnValue({
      currentData: {
        data: [],
        pagination: { total: 0, page: 1, perPage: 20, totalPages: 1 },
      },
      isLoading: false,
      isError: false,
    })
  })

  describe('Header and Default State Filter (AC-6)', () => {
    it('renders page header and queries open reports by default', () => {
      render(<ProductReportsPage />)

      expect(screen.getByRole('heading', { name: 'Product reports' })).toBeInTheDocument()
      expect(
        screen.getByText('Wrong or missing products reported by riders, restaurants or the co-op.')
      ).toBeInTheDocument()

      // AC-6 requires default filter to be open
      expect(mockUseGetProductReportsQuery).toHaveBeenCalledWith({
        state: 'open',
        page: 1,
        perPage: 20,
      })
    })

    it('renders state filter buttons: Open, Resolved, All', () => {
      render(<ProductReportsPage />)

      expect(screen.getByRole('button', { name: 'Open' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Resolved' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'All' })).toBeInTheDocument()
    })
  })

  describe('State filter switching and page reset (AC-6)', () => {
    it('switches state to "resolved" and calls query when Resolved button is clicked', () => {
      render(<ProductReportsPage />)

      fireEvent.click(screen.getByRole('button', { name: 'Resolved' }))

      expect(mockUseGetProductReportsQuery).toHaveBeenLastCalledWith({
        state: 'resolved',
        page: 1,
        perPage: 20,
      })
    })

    it('switches state to "all" and calls query when All button is clicked', () => {
      render(<ProductReportsPage />)

      fireEvent.click(screen.getByRole('button', { name: 'All' }))

      expect(mockUseGetProductReportsQuery).toHaveBeenLastCalledWith({
        state: 'all',
        page: 1,
        perPage: 20,
      })
    })

    it('switches back to "open" and calls query when Open button is clicked', () => {
      render(<ProductReportsPage />)

      fireEvent.click(screen.getByRole('button', { name: 'Resolved' }))
      fireEvent.click(screen.getByRole('button', { name: 'Open' }))

      expect(mockUseGetProductReportsQuery).toHaveBeenLastCalledWith({
        state: 'open',
        page: 1,
        perPage: 20,
      })
    })
  })

  describe('Empty and error states', () => {
    it('shows empty message "No product reports here." when data array is empty', () => {
      render(<ProductReportsPage />)

      expect(screen.getByText('No product reports here.')).toBeInTheDocument()
      expect(screen.queryByText('Could not load the product reports.')).not.toBeInTheDocument()
    })

    it('shows error message "Could not load the product reports." on query error', () => {
      mockUseGetProductReportsQuery.mockReturnValue({
        currentData: undefined,
        isLoading: false,
        isError: true,
      })

      render(<ProductReportsPage />)

      expect(screen.getByText('Could not load the product reports.')).toBeInTheDocument()
      expect(screen.queryByText('No product reports here.')).not.toBeInTheDocument()
    })
  })

  describe('Reports list and pagination', () => {
    const mockReports: ProductReportAdminDto[] = [
      {
        id: 'rep-1',
        deliveryId: 'del-1',
        kind: 'WRONG_ITEM',
        source: 'COURIER',
        reporterEmail: 'rider@example.com',
        itemName: 'Burger',
        note: null,
        resolvedAt: null,
        resolution: null,
        createdAt: new Date('2026-11-09T10:00:00Z'),
      },
      {
        id: 'rep-2',
        deliveryId: 'del-2',
        kind: 'MISSING_ITEM',
        source: 'PARTNER',
        reporterEmail: 'chef@restaurant.gr',
        itemName: 'Fries',
        note: 'Forgot to pack fries',
        resolvedAt: new Date('2026-11-09T10:30:00Z'),
        resolution: 'Credit given',
        createdAt: new Date('2026-11-09T10:15:00Z'),
      },
    ]

    it('renders report rows when reports are returned', () => {
      mockUseGetProductReportsQuery.mockReturnValue({
        currentData: {
          data: mockReports,
          pagination: { total: 2, page: 1, perPage: 20, totalPages: 1 },
        },
        isLoading: false,
        isError: false,
      })

      render(<ProductReportsPage />)

      expect(screen.getByText('Wrong item: Burger')).toBeInTheDocument()
      expect(screen.getByText('Missing item: Fries')).toBeInTheDocument()
      expect(screen.queryByText('No product reports here.')).not.toBeInTheDocument()
    })

    it('handles pagination: shows Page X of Y, enables Next, disables Previous on page 1, and changes page', () => {
      mockUseGetProductReportsQuery.mockReturnValue({
        currentData: {
          data: mockReports,
          pagination: { total: 50, page: 1, perPage: 20, totalPages: 3 },
        },
        isLoading: false,
        isError: false,
      })

      render(<ProductReportsPage />)

      expect(screen.getByText('Page 1 of 3')).toBeInTheDocument()

      const prevBtn = screen.getByRole('button', { name: 'Previous' })
      const nextBtn = screen.getByRole('button', { name: 'Next' })

      expect(prevBtn).toBeDisabled()
      expect(nextBtn).toBeEnabled()

      // Click Next -> advances to page 2
      fireEvent.click(nextBtn)

      expect(mockUseGetProductReportsQuery).toHaveBeenLastCalledWith({
        state: 'open',
        page: 2,
        perPage: 20,
      })
    })

    it('resets page to 1 when changing state filter while on page 2', () => {
      mockUseGetProductReportsQuery.mockReturnValue({
        currentData: {
          data: mockReports,
          pagination: { total: 50, page: 1, perPage: 20, totalPages: 3 },
        },
        isLoading: false,
        isError: false,
      })

      render(<ProductReportsPage />)

      // Go to page 2
      fireEvent.click(screen.getByRole('button', { name: 'Next' }))
      expect(mockUseGetProductReportsQuery).toHaveBeenLastCalledWith({
        state: 'open',
        page: 2,
        perPage: 20,
      })

      // Switch filter to Resolved
      fireEvent.click(screen.getByRole('button', { name: 'Resolved' }))

      // State is resolved, and page is reset back to 1
      expect(mockUseGetProductReportsQuery).toHaveBeenLastCalledWith({
        state: 'resolved',
        page: 1,
        perPage: 20,
      })
    })
  })
})
