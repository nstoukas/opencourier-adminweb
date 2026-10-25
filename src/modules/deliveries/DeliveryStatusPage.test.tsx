import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import DeliveryStatusPage from '../../pages/deliveries/[deliveryId]/status'
import { EnumDeliveryStatus, EnumDeliveryEventType } from '../../shared-types'
import { useGetDeliveryQuery, useSubmitDeliveryEventMutation } from '../../api/deliveriesApi'

// Mock DefaultLayout to isolate the page without requiring full Redux store & App Router navigation
jest.mock('../../components/layouts/DefaultLayout', () => ({
  DefaultLayout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="default-layout">{children}</div>
  ),
}))

// Mock next/router to control query params (specifically testing router.query.deliveryId vs router.query.id)
const mockRouter = {
  pathname: '/deliveries/[deliveryId]/status',
  query: { deliveryId: 'del-123' } as Record<string, string>,
  push: jest.fn(),
}
jest.mock('next/router', () => ({
  useRouter: () => mockRouter,
}))

// Mock admin page navigator
const mockGoToDeliveryDetails = jest.fn()
jest.mock('../../hooks/useAdminPageNavigator', () => ({
  useAdminPageNavigator: () => ({
    goToDeliveryDetails: mockGoToDeliveryDetails,
  }),
}))

// Mock RTK Query deliveriesApi endpoints
jest.mock('../../api/deliveriesApi', () => ({
  useGetDeliveryQuery: jest.fn(),
  useSubmitDeliveryEventMutation: jest.fn(),
}))

// Mock Radix Select primitive so select options can be triggered cleanly in JSDOM
jest.mock('@radix-ui/react-select', () => {
  const ReactActual = require('react') as typeof import('react')
  const { humanizeEventType } = require('../../utils/deliveryEventDisplay')
  const SelectContext = ReactActual.createContext<{ onValueChange?: (v: string) => void; value?: string }>({})
  return {
    Root: ({ children, onValueChange, value }: any) => (
      <SelectContext.Provider value={{ onValueChange, value }}>
        <div data-testid="radix-select-root">{children}</div>
      </SelectContext.Provider>
    ),
    Trigger: ({ children, ...props }: any) => (
      <button type="button" role="combobox" {...props}>
        {children}
      </button>
    ),
    Value: ({ placeholder, children }: any) => {
      const { value } = ReactActual.useContext(SelectContext)
      const display = children || (value ? humanizeEventType(value) : null) || placeholder
      return <span>{display}</span>
    },
    Icon: ({ children }: any) => <span>{children}</span>,
    Portal: ({ children }: any) => <div>{children}</div>,
    Content: ({ children }: any) => <div>{children}</div>,
    Viewport: ({ children }: any) => <div>{children}</div>,
    Item: ({ children, value, ...props }: any) => {
      const { onValueChange } = ReactActual.useContext(SelectContext)
      return (
        <div role="option" onClick={() => onValueChange && onValueChange(value)} {...props}>
          {children}
        </div>
      )
    },
    ItemText: ({ children }: any) => <span>{children}</span>,
    ItemIndicator: ({ children }: any) => <span>{children}</span>,
    Group: ({ children }: any) => <div>{children}</div>,
    Label: ({ children }: any) => <div>{children}</div>,
    Separator: () => <hr />,
  }
})

// Mock toast system
const mockToast = jest.fn()
jest.mock('../../admin-web-components', () => {
  const actual = jest.requireActual('../../admin-web-components')
  return {
    ...actual,
    useToast: () => ({ toast: mockToast }),
  }
})

const mockUseGetDeliveryQuery = useGetDeliveryQuery as jest.Mock
const mockUseSubmitDeliveryEventMutation = useSubmitDeliveryEventMutation as jest.Mock
const mockSubmitDeliveryEvent = jest.fn()

const sampleDelivery = {
  id: 'del-123',
  status: EnumDeliveryStatus.CREATED,
  courierId: 'courier-assigned-99',
  matchedCourierId: 'courier-matched-42',
  customerName: 'Nikos Galis',
}

describe('DeliveryStatusPage (src/pages/deliveries/[deliveryId]/status.tsx)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRouter.query = { deliveryId: 'del-123' }
    mockUseGetDeliveryQuery.mockReturnValue({
      data: sampleDelivery,
      isLoading: false,
    })
    mockUseSubmitDeliveryEventMutation.mockReturnValue([
      mockSubmitDeliveryEvent,
      { isLoading: false },
    ])
  })

  describe('Hydration and rendering (Clause 1)', () => {
    it('renders delivery details and navigation without crashing', () => {
      render(<DeliveryStatusPage />)

      // Heading and container
      expect(screen.getByRole('heading', { name: 'Delivery del-123' })).toBeInTheDocument()
      expect(screen.getByText('Delivery Details')).toBeInTheDocument()

      // Delivery fields
      const statusBadge = screen.getByText('Created')
      expect(statusBadge).toBeInTheDocument()
      expect(statusBadge).toHaveAttribute('data-status', EnumDeliveryStatus.CREATED)
      expect(screen.queryByText('CREATED')).toBeNull()
      expect(screen.getByText('courier-assigned-99')).toBeInTheDocument()
      expect(screen.getByText('Nikos Galis')).toBeInTheDocument()

      // Back to delivery button
      const backButton = screen.getByRole('button', { name: 'Back to delivery' })
      expect(backButton).toBeInTheDocument()
      fireEvent.click(backButton)
      expect(mockGoToDeliveryDetails).toHaveBeenCalledWith('del-123')
    })

    it('displays em dash (—) when courierId is empty or absent', () => {
      mockUseGetDeliveryQuery.mockReturnValue({
        data: { ...sampleDelivery, courierId: '' },
        isLoading: false,
      })

      render(<DeliveryStatusPage />)

      const courierLabel = screen.getByText('Courier ID').closest('label')
      expect(courierLabel).toHaveTextContent('—')
    })
    it('shows no raw enum text in page text (uses StatusBadge and humanized labels)', () => {
      render(<DeliveryStatusPage />)

      // The status must be rendered as a StatusBadge with data-status attribute
      const statusBadge = screen.getByText('Created')
      expect(statusBadge).toBeInTheDocument()
      expect(statusBadge).toHaveAttribute('data-status', EnumDeliveryStatus.CREATED)

      // No raw enum string should appear anywhere in the rendered page text
      const pageText = document.body.textContent || ''
      const rawStatuses = Object.values(EnumDeliveryStatus)
      for (const status of rawStatuses) {
        expect(pageText).not.toContain(status)
      }
      expect(pageText).not.toContain('ACCEPTED')
      expect(pageText).not.toContain('CANCELED')
      expect(pageText).not.toContain('ASSIGNING_COURIER')
    })
  })

  describe('Route parameter binding (router.query.deliveryId vs router.query.id)', () => {
    it('fetches delivery using router.query.deliveryId (not router.query.id)', () => {
      mockRouter.query = { deliveryId: 'del-correct-param' }
      render(<DeliveryStatusPage />)

      expect(mockUseGetDeliveryQuery).toHaveBeenCalledWith({ id: 'del-correct-param' })
    })

    it('fails to load delivery data if query only provides old router.query.id param', () => {
      mockRouter.query = { id: 'del-old-bug' }
      render(<DeliveryStatusPage />)

      // Because router.query.deliveryId is undefined, id passes ''
      expect(mockUseGetDeliveryQuery).toHaveBeenCalledWith({ id: '' })
    })
  })

  describe('Offered events and empty state handling (Clause 2)', () => {
    it('offers state machine transitions for current status and filters out FAILED', () => {
      // In STATE_MACHINE: CREATED transitions are ACCEPTED, CANCELED, and FAILED.
      // adminEventsForStatus must filter out FAILED.
      render(<DeliveryStatusPage />)

      expect(screen.getByText('Change Status')).toBeInTheDocument()
      expect(screen.getByText('Accepted')).toBeInTheDocument()
      expect(screen.getByText('Canceled')).toBeInTheDocument()
      expect(screen.queryByText('Failed')).toBeNull()
      expect(screen.queryByText(EnumDeliveryEventType.ACCEPTED)).toBeNull()
      expect(screen.queryByText(EnumDeliveryEventType.CANCELED)).toBeNull()
    })

    it('omits ACCEPTED from offered transitions when delivery has no rider ids', () => {
      // In CREATED without matchedCourierId or courierId, ACCEPTED is not allowed
      mockUseGetDeliveryQuery.mockReturnValue({
        data: {
          ...sampleDelivery,
          courierId: undefined,
          matchedCourierId: undefined,
        },
        isLoading: false,
      })

      render(<DeliveryStatusPage />)

      expect(screen.getByText('Change Status')).toBeInTheDocument()
      expect(screen.getByText('Canceled')).toBeInTheDocument()
      expect(screen.queryByText('Accepted')).toBeNull()
      expect(screen.queryByText('Failed')).toBeNull()
    })

    it('includes ACCEPTED when delivery has matchedCourierId', () => {
      mockUseGetDeliveryQuery.mockReturnValue({
        data: {
          ...sampleDelivery,
          matchedCourierId: 'courier-matched-42',
          courierId: undefined,
        },
        isLoading: false,
      })

      render(<DeliveryStatusPage />)

      expect(screen.getByText('Accepted')).toBeInTheDocument()
    })

    it('includes ACCEPTED when delivery has courierId fallback', () => {
      mockUseGetDeliveryQuery.mockReturnValue({
        data: {
          ...sampleDelivery,
          matchedCourierId: undefined,
          courierId: 'courier-assigned-99',
        },
        isLoading: false,
      })

      render(<DeliveryStatusPage />)

      expect(screen.getByText('Accepted')).toBeInTheDocument()
    })

    it('renders "No status change is possible from <status>." when no admin transitions exist', () => {
      // DROPPED_OFF has no transitions
      mockUseGetDeliveryQuery.mockReturnValue({
        data: { ...sampleDelivery, status: EnumDeliveryStatus.DROPPED_OFF },
        isLoading: false,
      })

      render(<DeliveryStatusPage />)

      expect(
        screen.getByText('No status change is possible from Dropped Off.')
      ).toBeInTheDocument()
      expect(screen.queryByText(/DROPPED_OFF/)).toBeNull()
      // Form and submit button must not be rendered
      expect(screen.queryByRole('button', { name: /submit event/i })).toBeNull()
    })

    it('renders "No status change is possible from Canceled." when only FAILED transition was available', () => {
      // CANCELED only transitions to FAILED, which is excluded from admin events
      mockUseGetDeliveryQuery.mockReturnValue({
        data: { ...sampleDelivery, status: EnumDeliveryStatus.CANCELED },
        isLoading: false,
      })

      render(<DeliveryStatusPage />)

      expect(
        screen.getByText('No status change is possible from Canceled.')
      ).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /submit event/i })).toBeNull()
    })
  })

  describe('Event submission and confirmation prompt (Clause 2)', () => {
    it('asks window.confirm first and sends nothing if admin cancels confirmation', async () => {
      const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(false)

      render(<DeliveryStatusPage />)

      // Select an event
      fireEvent.click(screen.getByText('Canceled'))

      // Click submit
      const submitBtn = screen.getByRole('button', { name: 'Submit event' })
      fireEvent.click(submitBtn)

      await waitFor(() => {
        expect(confirmSpy).toHaveBeenCalledWith(
          'Submit "Canceled" for this delivery? Its status is now Created.'
        )
      })

      // Mutation is NOT dispatched because admin canceled
      expect(mockSubmitDeliveryEvent).not.toHaveBeenCalled()
      expect(mockToast).not.toHaveBeenCalled()

      confirmSpy.mockRestore()
    })

    it('submits non-ACCEPTED event with deliveryId from router param and courierId undefined', async () => {
      const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true)
      mockSubmitDeliveryEvent.mockReturnValue({
        unwrap: () => Promise.resolve({ id: 'del-123', status: EnumDeliveryStatus.CANCELED }),
      })

      render(<DeliveryStatusPage />)

      // Select CANCELED event
      fireEvent.click(screen.getByText('Canceled'))

      // Submit
      fireEvent.click(screen.getByRole('button', { name: 'Submit event' }))

      await waitFor(() => {
        expect(mockSubmitDeliveryEvent).toHaveBeenCalledWith({
          deliveryId: 'del-123',
          eventType: EnumDeliveryEventType.CANCELED,
          courierId: undefined,
        })
      })

      // Shows success toast with server returned status
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Event submitted',
        description: 'Status is now Canceled.',
      })

      confirmSpy.mockRestore()
    })

    it('submits ACCEPTED event with matchedCourierId when present', async () => {
      const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true)
      mockSubmitDeliveryEvent.mockReturnValue({
        unwrap: () => Promise.resolve({ id: 'del-123', status: EnumDeliveryStatus.ASSIGNING_COURIER }),
      })

      render(<DeliveryStatusPage />)

      // Select ACCEPTED event
      fireEvent.click(screen.getByText('Accepted'))

      fireEvent.click(screen.getByRole('button', { name: 'Submit event' }))

      await waitFor(() => {
        expect(mockSubmitDeliveryEvent).toHaveBeenCalledWith({
          deliveryId: 'del-123',
          eventType: EnumDeliveryEventType.ACCEPTED,
          courierId: 'courier-matched-42',
        })
      })

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Event submitted',
        description: 'Status is now Assigning Courier.',
      })

      confirmSpy.mockRestore()
    })

    it('submits ACCEPTED event with courierId fallback when matchedCourierId is missing', async () => {
      const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true)
      mockSubmitDeliveryEvent.mockReturnValue({
        unwrap: () => Promise.resolve({ id: 'del-123', status: EnumDeliveryStatus.ASSIGNING_COURIER }),
      })

      mockUseGetDeliveryQuery.mockReturnValue({
        data: {
          ...sampleDelivery,
          matchedCourierId: undefined,
          courierId: 'courier-assigned-99',
        },
        isLoading: false,
      })

      render(<DeliveryStatusPage />)

      // Select ACCEPTED event
      fireEvent.click(screen.getByText('Accepted'))

      fireEvent.click(screen.getByRole('button', { name: 'Submit event' }))

      await waitFor(() => {
        expect(mockSubmitDeliveryEvent).toHaveBeenCalledWith({
          deliveryId: 'del-123',
          eventType: EnumDeliveryEventType.ACCEPTED,
          courierId: 'courier-assigned-99',
        })
      })

      confirmSpy.mockRestore()
    })

    it('displays "Nothing changed" toast when the server returns the unchanged delivery status', async () => {
      const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true)
      // The server ignores an event with no legal transition and returns unchanged status
      mockSubmitDeliveryEvent.mockReturnValue({
        unwrap: () => Promise.resolve({ id: 'del-123', status: EnumDeliveryStatus.CREATED }),
      })

      render(<DeliveryStatusPage />)

      // Select CANCELED event
      fireEvent.click(screen.getByText('Canceled'))
      fireEvent.click(screen.getByRole('button', { name: 'Submit event' }))

      await waitFor(() => {
        expect(mockSubmitDeliveryEvent).toHaveBeenCalledWith({
          deliveryId: 'del-123',
          eventType: EnumDeliveryEventType.CANCELED,
          courierId: undefined,
        })
      })

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Nothing changed',
        description: 'The server did not apply "Canceled". Status is still Created.',
      })

      confirmSpy.mockRestore()
    })

    it('resets the form after a successful event submission', async () => {
      const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true)
      mockSubmitDeliveryEvent.mockReturnValue({
        unwrap: () => Promise.resolve({ id: 'del-123', status: EnumDeliveryStatus.CANCELED }),
      })

      render(<DeliveryStatusPage />)

      const combobox = screen.getByRole('combobox')
      expect(combobox).toHaveTextContent('Select delivery event')

      // Select an event
      fireEvent.click(screen.getByText('Canceled'))
      expect(combobox).toHaveTextContent('Canceled')

      // Submit
      fireEvent.click(screen.getByRole('button', { name: 'Submit event' }))

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalled()
      })

      // Form reset restored combobox placeholder
      expect(combobox).toHaveTextContent('Select delivery event')

      confirmSpy.mockRestore()
    })

    it('displays destructive toast with backend error message on mutation failure', async () => {
      const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true)
      mockSubmitDeliveryEvent.mockReturnValue({
        unwrap: () => Promise.reject(new Error('Server error')),
      })

      render(<DeliveryStatusPage />)

      fireEvent.click(screen.getByText('Canceled'))
      fireEvent.click(screen.getByRole('button', { name: 'Submit event' }))

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Submit failed',
          description: 'Server error',
          variant: 'destructive',
        })
      })

      confirmSpy.mockRestore()
    })

    it('displays destructive toast with fallback message when mutation error has no message', async () => {
      const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true)
      // An error without a message property falls back to the generic message
      mockSubmitDeliveryEvent.mockReturnValue({
        unwrap: () => Promise.reject({}),
      })

      render(<DeliveryStatusPage />)

      fireEvent.click(screen.getByText('Canceled'))
      fireEvent.click(screen.getByRole('button', { name: 'Submit event' }))

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Submit failed',
          description: 'Failed to change delivery status',
          variant: 'destructive',
        })
      })

      confirmSpy.mockRestore()
    })
  })
})
