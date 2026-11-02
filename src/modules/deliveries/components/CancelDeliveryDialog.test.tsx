import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { CancelDeliveryDialog } from './CancelDeliveryDialog'
import { useSubmitDeliveryEventMutation } from '../../../api/deliveriesApi'
import type { DeliveryAdminDto } from '../../../backend-admin-sdk'
import { EnumDeliveryEventType } from '../../../shared-types'

const mockToast = jest.fn()
jest.mock('../../../admin-web-components', () => {
  const actual = jest.requireActual('../../../admin-web-components')
  return {
    ...actual,
    useToast: () => ({ toast: mockToast }),
  }
})

jest.mock('../../../api/deliveriesApi', () => ({
  useSubmitDeliveryEventMutation: jest.fn(),
}))

const mockUseSubmitDeliveryEventMutation = useSubmitDeliveryEventMutation as jest.Mock

const sampleHeldDelivery= {
  id: 'del-held-1',
  status: 'DISPATCHED',
  courierId: 'c1',
  currencyCode: 'EUR',
} as DeliveryAdminDto

const sampleNotHeldDelivery= {
  id: 'del-not-held-2',
  status: 'ASSIGNING_COURIER',
  courierId: null,
  currencyCode: 'EUR',
} as DeliveryAdminDto

describe('CancelDeliveryDialog component (spec 0015, AC-5)', () => {
  let mockSubmitDeliveryEvent: jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()
    mockSubmitDeliveryEvent = jest.fn()
    mockUseSubmitDeliveryEventMutation.mockReturnValue([
      mockSubmitDeliveryEvent,
      { isLoading: false },
    ])
  })

  it('renders trigger button "Cancel delivery" and opens dialog on click', async () => {
    render(<CancelDeliveryDialog delivery={sampleHeldDelivery} />)

    const triggerBtn = screen.getByRole('button', { name: 'Cancel delivery' })
    expect(triggerBtn).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Cancel delivery' })).toBeNull()

    fireEvent.click(triggerBtn)

    expect(await screen.findByRole('heading', { name: 'Cancel delivery' })).toBeInTheDocument()
  })

  it('defaults selection to The co-op (COOP)', async () => {
    render(<CancelDeliveryDialog delivery={sampleHeldDelivery} />)
    fireEvent.click(screen.getByRole('button', { name: 'Cancel delivery' }))

    const coopRadio = await screen.findByRole('radio', { name: 'The co-op' })
    const restaurantRadio = screen.getByRole('radio', { name: 'The restaurant' })
    const customerRadio = screen.getByRole('radio', { name: 'The customer' })

    expect(coopRadio).toBeChecked()
    expect(restaurantRadio).not.toBeChecked()
    expect(customerRadio).not.toBeChecked()
  })

  it('submits { deliveryId, eventType: CANCELED, cancelledBy } with default COOP', async () => {
    mockSubmitDeliveryEvent.mockReturnValue({
      unwrap: () => Promise.resolve({ id: 'del-held-1', status: 'CANCELED' }),
    })

    render(<CancelDeliveryDialog delivery={sampleHeldDelivery} />)
    fireEvent.click(screen.getByRole('button', { name: 'Cancel delivery' }))

    // Click confirm Cancel delivery button inside the dialog footer
    const confirmBtn = screen.getByRole('button', { name: 'Cancel delivery' })
    fireEvent.click(confirmBtn)

    await waitFor(() => {
      expect(mockSubmitDeliveryEvent).toHaveBeenCalledTimes(1)
      expect(mockSubmitDeliveryEvent).toHaveBeenCalledWith({
        deliveryId: 'del-held-1',
        eventType: EnumDeliveryEventType.CANCELED,
        cancelledBy: 'COOP',
      })
      expect(mockToast).toHaveBeenCalledWith({ title: 'Delivery cancelled.' })
    })
  })

  it('submits with cancelledBy RESTAURANT or CUSTOMER when selected', async () => {
    mockSubmitDeliveryEvent.mockReturnValue({
      unwrap: () => Promise.resolve({ id: 'del-held-1', status: 'CANCELED' }),
    })

    const { unmount } = render(<CancelDeliveryDialog delivery={sampleHeldDelivery} />)
    fireEvent.click(screen.getByRole('button', { name: 'Cancel delivery' }))

    // Select The restaurant
    fireEvent.click(screen.getByRole('radio', { name: 'The restaurant' }))
    fireEvent.click(screen.getByRole('button', { name: 'Cancel delivery' }))

    await waitFor(() => {
      expect(mockSubmitDeliveryEvent).toHaveBeenCalledWith({
        deliveryId: 'del-held-1',
        eventType: EnumDeliveryEventType.CANCELED,
        cancelledBy: 'RESTAURANT',
      })
    })

    unmount()

    // Test with CUSTOMER
    render(<CancelDeliveryDialog delivery={sampleHeldDelivery} />)
    fireEvent.click(screen.getByRole('button', { name: 'Cancel delivery' }))

    fireEvent.click(screen.getByRole('radio', { name: 'The customer' }))
    fireEvent.click(screen.getByRole('button', { name: 'Cancel delivery' }))

    await waitFor(() => {
      expect(mockSubmitDeliveryEvent).toHaveBeenCalledWith({
        deliveryId: 'del-held-1',
        eventType: EnumDeliveryEventType.CANCELED,
        cancelledBy: 'CUSTOMER',
      })
    })
  })

  it('shows restaurant charge note ONLY when a rider holds the job AND The restaurant is chosen', () => {
    // 1. Rider holds the job (held delivery)
    const { unmount } = render(<CancelDeliveryDialog delivery={sampleHeldDelivery} />)
    fireEvent.click(screen.getByRole('button', { name: 'Cancel delivery' }))

    // Default is COOP: note must not be visible
    expect(screen.queryByRole('note')).toBeNull()

    // Select The restaurant: note must appear
    fireEvent.click(screen.getByRole('radio', { name: 'The restaurant' }))
    expect(screen.getByRole('note')).toHaveTextContent(
      'The restaurant is charged the delivery’s price for cancelling after a rider accepted.'
    )

    // Select The customer: note must disappear
    fireEvent.click(screen.getByRole('radio', { name: 'The customer' }))
    expect(screen.queryByRole('note')).toBeNull()

    unmount()

    // 2. No rider holds the job (not held delivery)
    render(<CancelDeliveryDialog delivery={sampleNotHeldDelivery} />)
    fireEvent.click(screen.getByRole('button', { name: 'Cancel delivery' }))

    // Even if The restaurant is selected, note must NOT be visible because no rider accepted yet
    fireEvent.click(screen.getByRole('radio', { name: 'The restaurant' }))
    expect(screen.queryByRole('note')).toBeNull()
  })

  it('dialog description differs for held vs not held', () => {
    // 1. Held delivery
    const { unmount } = render(<CancelDeliveryDialog delivery={sampleHeldDelivery} />)
    fireEvent.click(screen.getByRole('button', { name: 'Cancel delivery' }))

    expect(
      screen.getByText(
        'A rider holds this job: they are paid under the co-op’s cancelled job pay, whoever asked.'
      )
    ).toBeInTheDocument()

    unmount()

    // 2. Not held delivery
    render(<CancelDeliveryDialog delivery={sampleNotHeldDelivery} />)
    fireEvent.click(screen.getByRole('button', { name: 'Cancel delivery' }))

    expect(
      screen.getByText('No rider holds this job yet: nobody is paid or charged.')
    ).toBeInTheDocument()
  })

  it('error stays in the dialog as an alert role on failure', async () => {
    mockSubmitDeliveryEvent.mockReturnValue({
      unwrap: () => Promise.reject({ message: 'Delivery cannot be cancelled in this status' }),
    })

    render(<CancelDeliveryDialog delivery={sampleHeldDelivery} />)
    fireEvent.click(screen.getByRole('button', { name: 'Cancel delivery' }))

    fireEvent.click(screen.getByRole('button', { name: 'Cancel delivery' }))

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Delivery cannot be cancelled in this status')
    // Dialog remains open
    expect(screen.getByRole('heading', { name: 'Cancel delivery' })).toBeInTheDocument()
  })

  it('falls back to generic error message when rejection has no message property', async () => {
    mockSubmitDeliveryEvent.mockReturnValue({
      unwrap: () => Promise.reject(new Error()),
    })

    render(<CancelDeliveryDialog delivery={sampleHeldDelivery} />)
    fireEvent.click(screen.getByRole('button', { name: 'Cancel delivery' }))

    fireEvent.click(screen.getByRole('button', { name: 'Cancel delivery' }))

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('The delivery could not be cancelled. Try again.')
  })

  it('returns focus to the opening button on close (adminweb gotcha)', async () => {
    render(<CancelDeliveryDialog delivery={sampleHeldDelivery} />)
    const trigger = screen.getByRole('button', { name: 'Cancel delivery' })

    fireEvent.click(trigger)
    expect(await screen.findByRole('heading', { name: 'Cancel delivery' })).toBeInTheDocument()

    // Click "Keep it" button to close the dialog
    fireEvent.click(screen.getByRole('button', { name: 'Keep it' }))

    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: 'Cancel delivery' })).toBeNull()
      expect(document.activeElement).toBe(trigger)
    })
  })
})
