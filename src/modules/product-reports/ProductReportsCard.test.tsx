import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ProductReportsCard } from './ProductReportsCard'
import {
  useGetDeliveryProductReportsQuery,
  useCreateDeliveryProductReportMutation,
} from '../../api/deliveriesApi'
import { usePageVisible } from '../../hooks/usePageVisible'
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
  useGetDeliveryProductReportsQuery: jest.fn(),
  useCreateDeliveryProductReportMutation: jest.fn(),
  useResolveProductReportMutation: jest.fn().mockReturnValue([jest.fn(), { isLoading: false }]),
}))

jest.mock('../../hooks/usePageVisible', () => ({
  usePageVisible: jest.fn(),
}))

const mockUseGetDeliveryProductReportsQuery = useGetDeliveryProductReportsQuery as jest.Mock
const mockUseCreateDeliveryProductReportMutation = useCreateDeliveryProductReportMutation as jest.Mock
const mockUsePageVisible = usePageVisible as jest.Mock

describe('ProductReportsCard component (spec 0032, AC-6, AC-9)', () => {
  const mockCreateReport = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    mockUsePageVisible.mockReturnValue(true)
    mockCreateReport.mockReturnValue({
      unwrap: jest.fn().mockResolvedValue({ id: 'rep-new' }),
    })
    mockUseCreateDeliveryProductReportMutation.mockReturnValue([
      mockCreateReport,
      { isLoading: false },
    ])
    mockUseGetDeliveryProductReportsQuery.mockReturnValue({
      currentData: [],
      isLoading: false,
      isError: false,
      error: null,
    })
  })

  describe('Card rendering, loading, error, and empty states', () => {
    it('renders card title "Product reports" and empty state message when there are no reports', () => {
      render(<ProductReportsCard deliveryId="del-1" />)

      expect(screen.getByRole('heading', { name: 'Product reports' })).toBeInTheDocument()
      expect(
        screen.getByText('No product has been reported for this delivery.')
      ).toBeInTheDocument()
    })

    it('renders error message when query fails', () => {
      mockUseGetDeliveryProductReportsQuery.mockReturnValue({
        currentData: undefined,
        isLoading: false,
        isError: true,
        error: { message: 'Network failure' },
      })

      render(<ProductReportsCard deliveryId="del-1" />)

      expect(screen.getByText('Could not load the product reports.')).toBeInTheDocument()
      expect(
        screen.queryByText('No product has been reported for this delivery.')
      ).not.toBeInTheDocument()
    })

    it('renders report rows when reports exist', () => {
      const reports: ProductReportAdminDto[] = [
        {
          id: 'rep-1',
          deliveryId: 'del-1',
          kind: 'WRONG_ITEM',
          source: 'COURIER',
          reporterEmail: 'rider@example.com',
          itemName: 'Greek Salad',
          note: 'Delivered Caesar instead',
          resolvedAt: null,
          resolution: null,
          createdAt: new Date('2026-11-09T08:00:00Z'),
        },
      ]
      mockUseGetDeliveryProductReportsQuery.mockReturnValue({
        currentData: reports,
        isLoading: false,
        isError: false,
      })

      render(<ProductReportsCard deliveryId="del-1" />)

      expect(screen.getByText('Wrong item: Greek Salad')).toBeInTheDocument()
      expect(screen.getByText('Delivered Caesar instead')).toBeInTheDocument()
      expect(
        screen.queryByText('No product has been reported for this delivery.')
      ).not.toBeInTheDocument()
    })

    it('Value 5 guard: does not display report counts in card header', () => {
      const reports: ProductReportAdminDto[] = [
        {
          id: 'rep-1',
          deliveryId: 'del-1',
          kind: 'WRONG_ITEM',
          source: 'COURIER',
          reporterEmail: null,
          itemName: 'Item 1',
          note: null,
          resolvedAt: null,
          resolution: null,
          createdAt: new Date('2026-11-09T08:00:00Z'),
        },
        {
          id: 'rep-2',
          deliveryId: 'del-1',
          kind: 'MISSING_ITEM',
          source: 'PARTNER',
          reporterEmail: null,
          itemName: 'Item 2',
          note: null,
          resolvedAt: null,
          resolution: null,
          createdAt: new Date('2026-11-09T08:05:00Z'),
        },
      ]
      mockUseGetDeliveryProductReportsQuery.mockReturnValue({
        currentData: reports,
        isLoading: false,
        isError: false,
      })

      render(<ProductReportsCard deliveryId="del-1" />)

      const title = screen.getByRole('heading', { name: 'Product reports' })
      expect(title.textContent).toBe('Product reports')
      expect(screen.queryByText(/Product reports\s*\(/i)).not.toBeInTheDocument()
    })
  })

  describe('Polling behavior', () => {
    it('polls every 30 seconds when page is visible and 0 when tab is hidden', () => {
      mockUsePageVisible.mockReturnValue(true)
      const { rerender } = render(<ProductReportsCard deliveryId="del-1" />)

      expect(mockUseGetDeliveryProductReportsQuery).toHaveBeenCalledWith(
        { deliveryId: 'del-1' },
        { skip: false, pollingInterval: 30_000 }
      )

      mockUsePageVisible.mockReturnValue(false)
      rerender(<ProductReportsCard deliveryId="del-1" />)

      expect(mockUseGetDeliveryProductReportsQuery).toHaveBeenCalledWith(
        { deliveryId: 'del-1' },
        { skip: false, pollingInterval: 0 }
      )
    })

    it('skips query if deliveryId is empty', () => {
      render(<ProductReportsCard deliveryId="" />)

      expect(mockUseGetDeliveryProductReportsQuery).toHaveBeenCalledWith(
        { deliveryId: '' },
        { skip: true, pollingInterval: 30_000 }
      )
    })
  })

  describe('Add report form and validation (AC-1, AC-9)', () => {
    it('opens add report form when "Add report" button is clicked', () => {
      render(<ProductReportsCard deliveryId="del-1" />)

      const addBtn = screen.getByRole('button', { name: 'Add report' })
      fireEvent.click(addBtn)

      expect(screen.getByRole('button', { name: 'Wrong item' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Missing item' })).toBeInTheDocument()
      expect(screen.getByRole('textbox', { name: 'Item' })).toBeInTheDocument()
      expect(screen.getByRole('textbox', { name: 'Note' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Save report' })).toBeInTheDocument()
    })

    it('refuses to save when neither item nor note is provided, showing destructive toast (AC-1, AC-9)', async () => {
      render(<ProductReportsCard deliveryId="del-1" />)

      fireEvent.click(screen.getByRole('button', { name: 'Add report' }))

      // Click "Save report" without entering item or note
      fireEvent.click(screen.getByRole('button', { name: 'Save report' }))

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Name the item or add a note.',
        variant: 'destructive',
      })
      expect(mockCreateReport).not.toHaveBeenCalled()
    })

    it('refuses to save when item and note contain only whitespace', async () => {
      render(<ProductReportsCard deliveryId="del-1" />)

      fireEvent.click(screen.getByRole('button', { name: 'Add report' }))

      fireEvent.change(screen.getByRole('textbox', { name: 'Item' }), { target: { value: '   ' } })
      fireEvent.change(screen.getByRole('textbox', { name: 'Note' }), { target: { value: '   ' } })

      fireEvent.click(screen.getByRole('button', { name: 'Save report' }))

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Name the item or add a note.',
        variant: 'destructive',
      })
      expect(mockCreateReport).not.toHaveBeenCalled()
    })

    it('successfully saves report with item name only, trimming whitespace', async () => {
      render(<ProductReportsCard deliveryId="del-1" />)

      fireEvent.click(screen.getByRole('button', { name: 'Add report' }))

      // Change kind to MISSING_ITEM
      fireEvent.click(screen.getByRole('button', { name: 'Missing item' }))

      fireEvent.change(screen.getByRole('textbox', { name: 'Item' }), {
        target: { value: '  Coca Cola Zero  ' },
      })

      fireEvent.click(screen.getByRole('button', { name: 'Save report' }))

      await waitFor(() => {
        expect(mockCreateReport).toHaveBeenCalledWith({
          deliveryId: 'del-1',
          kind: 'MISSING_ITEM',
          itemName: 'Coca Cola Zero',
          note: undefined,
        })
      })

      // Form should close on success and restore "Add report" button
      expect(screen.queryByRole('button', { name: 'Save report' })).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Add report' })).toBeInTheDocument()
    })

    it('successfully saves report with note only, trimming whitespace', async () => {
      render(<ProductReportsCard deliveryId="del-1" />)

      fireEvent.click(screen.getByRole('button', { name: 'Add report' }))

      fireEvent.change(screen.getByRole('textbox', { name: 'Note' }), {
        target: { value: '  Customer says bag was missing a drink  ' },
      })

      fireEvent.click(screen.getByRole('button', { name: 'Save report' }))

      await waitFor(() => {
        expect(mockCreateReport).toHaveBeenCalledWith({
          deliveryId: 'del-1',
          kind: 'WRONG_ITEM',
          itemName: undefined,
          note: 'Customer says bag was missing a drink',
        })
      })

      expect(screen.queryByRole('button', { name: 'Save report' })).not.toBeInTheDocument()
    })

    it('successfully saves report with both item name and note', async () => {
      render(<ProductReportsCard deliveryId="del-1" />)

      fireEvent.click(screen.getByRole('button', { name: 'Add report' }))

      fireEvent.change(screen.getByRole('textbox', { name: 'Item' }), {
        target: { value: 'Pita Souvlaki' },
      })
      fireEvent.change(screen.getByRole('textbox', { name: 'Note' }), {
        target: { value: 'Got pork instead of chicken' },
      })

      fireEvent.click(screen.getByRole('button', { name: 'Save report' }))

      await waitFor(() => {
        expect(mockCreateReport).toHaveBeenCalledWith({
          deliveryId: 'del-1',
          kind: 'WRONG_ITEM',
          itemName: 'Pita Souvlaki',
          note: 'Got pork instead of chicken',
        })
      })
    })

    it('shows destructive toast when report submission fails', async () => {
      mockCreateReport.mockReturnValue({
        unwrap: jest.fn().mockRejectedValue(new Error('Backend rejected report')),
      })

      render(<ProductReportsCard deliveryId="del-1" />)

      fireEvent.click(screen.getByRole('button', { name: 'Add report' }))
      fireEvent.change(screen.getByRole('textbox', { name: 'Item' }), {
        target: { value: 'Pizza' },
      })

      fireEvent.click(screen.getByRole('button', { name: 'Save report' }))

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Backend rejected report',
          variant: 'destructive',
        })
      })

      // Form remains open so admin does not lose text
      expect(screen.getByRole('button', { name: 'Save report' })).toBeInTheDocument()
    })

    it('disables Save report button while mutation is loading', () => {
      mockUseCreateDeliveryProductReportMutation.mockReturnValue([
        mockCreateReport,
        { isLoading: true },
      ])

      render(<ProductReportsCard deliveryId="del-1" />)

      fireEvent.click(screen.getByRole('button', { name: 'Add report' }))

      expect(screen.getByRole('button', { name: 'Save report' })).toBeDisabled()
    })
  })
})
