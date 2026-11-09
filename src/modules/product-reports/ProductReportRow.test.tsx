import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ProductReportRow } from './ProductReportRow'
import { useResolveProductReportMutation } from '../../api/deliveriesApi'
import { formatDate } from '../../ui-shared-utils'
import type { ProductReportAdminDto } from '../../backend-admin-sdk'

const mockToast = jest.fn()
jest.mock('../../admin-web-components', () => {
  const actual = jest.requireActual('../../admin-web-components')
  return {
    ...actual,
    useToast: () => ({ toast: mockToast }),
  }
})

jest.mock('../../api/deliveriesApi', () => ({
  useResolveProductReportMutation: jest.fn(),
}))

const mockUseResolveProductReportMutation = useResolveProductReportMutation as jest.Mock

describe('ProductReportRow component (spec 0032, AC-6, AC-7)', () => {
  const mockResolveReport = jest.fn()

  const openReport: ProductReportAdminDto = {
    id: 'report-101',
    deliveryId: 'del-555',
    kind: 'WRONG_ITEM',
    source: 'COURIER',
    reporterEmail: 'rider@example.com',
    itemName: 'Burger Deluxe',
    note: 'Customer ordered cheeseburger, got vegan burger',
    resolvedAt: null,
    resolution: null,
    createdAt: new Date('2026-11-09T10:00:00Z'),
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockResolveReport.mockReturnValue({
      unwrap: jest.fn().mockResolvedValue({ id: 'report-101' }),
    })
    mockUseResolveProductReportMutation.mockReturnValue([
      mockResolveReport,
      { isLoading: false },
    ])
  })

  describe('Report rendering', () => {
    it('renders report details: kind, item name, delivery link, created date, source, reporter email, and note', () => {
      render(<ProductReportRow report={openReport} />)

      expect(screen.getByText('Wrong item: Burger Deluxe')).toBeInTheDocument()
      const deliveryLink = screen.getByRole('link', { name: 'Delivery' })
      expect(deliveryLink).toHaveAttribute('href', '/deliveries/del-555')
      expect(screen.getByText(formatDate(openReport.createdAt))).toBeInTheDocument()
      expect(screen.getByText('Rider · rider@example.com')).toBeInTheDocument()
      expect(
        screen.getByText('Customer ordered cheeseburger, got vegan burger')
      ).toBeInTheDocument()
    })

    it('renders MISSING_ITEM kind and PARTNER source without reporter email or note when they are null', () => {
      const partnerReport: ProductReportAdminDto = {
        id: 'report-102',
        deliveryId: 'del-777',
        kind: 'MISSING_ITEM',
        source: 'PARTNER',
        reporterEmail: null,
        itemName: null,
        note: null,
        resolvedAt: null,
        resolution: null,
        createdAt: new Date('2026-11-09T11:00:00Z'),
      }

      render(<ProductReportRow report={partnerReport} />)

      expect(screen.getByText('Missing item')).toBeInTheDocument()
      expect(screen.getByText('Restaurant')).toBeInTheDocument()
      expect(screen.queryByText(/·/)).not.toBeInTheDocument()
    })

    it('renders ADMIN source correctly', () => {
      const adminReport: ProductReportAdminDto = {
        id: 'report-103',
        deliveryId: 'del-888',
        kind: 'WRONG_ITEM',
        source: 'ADMIN',
        reporterEmail: 'admin@coop.gr',
        itemName: 'Fries',
        note: null,
        resolvedAt: null,
        resolution: null,
        createdAt: new Date('2026-11-09T12:00:00Z'),
      }

      render(<ProductReportRow report={adminReport} />)

      expect(screen.getByText('Admin · admin@coop.gr')).toBeInTheDocument()
    })

    it('renders resolved status with resolution text and hides Resolve button when resolvedAt is present', () => {
      const resolvedReport: ProductReportAdminDto = {
        ...openReport,
        resolvedAt: new Date('2026-11-09T11:30:00Z'),
        resolution: 'Sent replacement dish to customer',
      }

      render(<ProductReportRow report={resolvedReport} />)

      expect(
        screen.getByText(`Resolved ${formatDate(resolvedReport.resolvedAt!)}: Sent replacement dish to customer`)
      ).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Resolve' })).not.toBeInTheDocument()
    })

    it('renders resolved status without resolution suffix when resolution is null', () => {
      const resolvedWithoutResolution: ProductReportAdminDto = {
        ...openReport,
        resolvedAt: new Date('2026-11-09T11:30:00Z'),
        resolution: null,
      }

      render(<ProductReportRow report={resolvedWithoutResolution} />)

      expect(
        screen.getByText(`Resolved ${formatDate(resolvedWithoutResolution.resolvedAt!)}`)
      ).toBeInTheDocument()
    })
  })

  describe('Resolving an open report (AC-7, AC-9)', () => {
    it('shows Resolve button for open reports and toggles resolution textarea on click', () => {
      render(<ProductReportRow report={openReport} />)

      const resolveBtn = screen.getByRole('button', { name: 'Resolve' })
      expect(resolveBtn).toBeInTheDocument()

      fireEvent.click(resolveBtn)

      expect(screen.getByRole('textbox', { name: 'Resolution' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Resolve' })).not.toBeInTheDocument()
    })

    it('submits resolution text and closes resolve form on successful save', async () => {
      render(<ProductReportRow report={openReport} />)

      fireEvent.click(screen.getByRole('button', { name: 'Resolve' }))

      fireEvent.change(screen.getByRole('textbox', { name: 'Resolution' }), {
        target: { value: '  Customer received voucher code  ' },
      })

      fireEvent.click(screen.getByRole('button', { name: 'Save' }))

      await waitFor(() => {
        expect(mockResolveReport).toHaveBeenCalledWith({
          id: 'report-101',
          resolution: 'Customer received voucher code',
        })
      })

      // On success, resolution form closes
      expect(screen.queryByRole('textbox', { name: 'Resolution' })).not.toBeInTheDocument()
    })

    it('submits undefined resolution when resolution input is empty or whitespace only', async () => {
      render(<ProductReportRow report={openReport} />)

      fireEvent.click(screen.getByRole('button', { name: 'Resolve' }))

      fireEvent.change(screen.getByRole('textbox', { name: 'Resolution' }), {
        target: { value: '    ' },
      })

      fireEvent.click(screen.getByRole('button', { name: 'Save' }))

      await waitFor(() => {
        expect(mockResolveReport).toHaveBeenCalledWith({
          id: 'report-101',
          resolution: undefined,
        })
      })
    })

    it('displays destructive toast when resolution save fails and leaves form open', async () => {
      mockResolveReport.mockReturnValue({
        unwrap: jest.fn().mockRejectedValue(new Error('Resolve permission denied')),
      })

      render(<ProductReportRow report={openReport} />)

      fireEvent.click(screen.getByRole('button', { name: 'Resolve' }))
      fireEvent.change(screen.getByRole('textbox', { name: 'Resolution' }), {
        target: { value: 'Attempted resolution' },
      })

      fireEvent.click(screen.getByRole('button', { name: 'Save' }))

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Resolve permission denied',
          variant: 'destructive',
        })
      })

      expect(screen.getByRole('textbox', { name: 'Resolution' })).toBeInTheDocument()
    })

    it('disables Save button while resolve mutation is loading', () => {
      mockUseResolveProductReportMutation.mockReturnValue([
        mockResolveReport,
        { isLoading: true },
      ])

      render(<ProductReportRow report={openReport} />)

      fireEvent.click(screen.getByRole('button', { name: 'Resolve' }))

      expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()
    })
  })
})
