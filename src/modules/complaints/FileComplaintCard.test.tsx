import React from 'react'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { FileComplaintCard } from './FileComplaintCard'
import { useFileComplaintMutation, useGetComplaintDeliveryRidersQuery } from '@/api/complaintApi'
import { useRouter } from 'next/router'
import { useToast } from '@/admin-web-components'

// Mock Radix Select
jest.mock('@radix-ui/react-select', () => {
  const MockReact = require('react') as typeof import('react')
  const SelectContext = MockReact.createContext<{ onValueChange?: (v: string) => void }>({})
  return {
    Root: ({ children, onValueChange }: any) => (
      <SelectContext.Provider value={{ onValueChange }}>
        <div data-testid="radix-select-root">{children}</div>
      </SelectContext.Provider>
    ),
    Trigger: ({ children, ...props }: any) => (
      <button type="button" role="combobox" {...props}>
        {children}
      </button>
    ),
    Value: ({ placeholder, children }: any) => <span>{children || placeholder}</span>,
    Icon: ({ children }: any) => <span>{children}</span>,
    Portal: ({ children }: any) => <div>{children}</div>,
    Content: ({ children }: any) => <div>{children}</div>,
    Viewport: ({ children }: any) => <div>{children}</div>,
    Item: ({ children, value, ...props }: any) => {
      const { onValueChange } = MockReact.useContext(SelectContext)
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

// Mock useRouter
const mockPush = jest.fn()
jest.mock('next/router', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}))

// Mock API hooks
jest.mock('../../api/complaintApi', () => ({
  useGetComplaintDeliveryRidersQuery: jest.fn(),
  useFileComplaintMutation: jest.fn(),
}))

const mockToast = jest.fn()
jest.mock('../../admin-web-components', () => {
  const actual = jest.requireActual('../../admin-web-components')
  return {
    ...actual,
    useToast: () => ({ toast: mockToast }),
  }
})

const mockUseGetComplaintDeliveryRidersQuery = useGetComplaintDeliveryRidersQuery as jest.Mock
const mockUseFileComplaintMutation = useFileComplaintMutation as jest.Mock

describe('FileComplaintCard (spec 0052, AC-3; cross check 3)', () => {
  const mockFileComplaint = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    mockUseFileComplaintMutation.mockReturnValue([mockFileComplaint, { isLoading: false }])
    mockUseGetComplaintDeliveryRidersQuery.mockReturnValue({
      currentData: [{ id: 'rider-1', name: 'Kostas Moped' }],
      isLoading: false,
      isError: false,
    })
  })

  it('renders collapsed initially with "File a complaint for a caller" button', () => {
    render(<FileComplaintCard deliveryId="del-10" />)

    expect(screen.getByText('Complaint about the rider')).toBeInTheDocument()
    expect(screen.getByText(/Someone phoned in about the rider on this order\?/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'File a complaint for a caller' })).toBeInTheDocument()

    // Riders query was skipped while collapsed
    expect(mockUseGetComplaintDeliveryRidersQuery).toHaveBeenCalledWith(
      { deliveryId: 'del-10' },
      { skip: true }
    )
  })

  it('opens filing form on button click and queries delivery riders', () => {
    render(<FileComplaintCard deliveryId="del-10" />)

    fireEvent.click(screen.getByRole('button', { name: 'File a complaint for a caller' }))

    expect(mockUseGetComplaintDeliveryRidersQuery).toHaveBeenCalledWith(
      { deliveryId: 'del-10' },
      { skip: false }
    )
  })

  it('shows loading message while riders query is in flight', () => {
    mockUseGetComplaintDeliveryRidersQuery.mockReturnValue({
      currentData: undefined,
      isLoading: true,
      isError: false,
    })

    render(<FileComplaintCard deliveryId="del-10" />)
    fireEvent.click(screen.getByRole('button', { name: 'File a complaint for a caller' }))

    expect(screen.getByText('Loading…')).toBeInTheDocument()
  })

  it('shows error alert if delivery riders fail to load', () => {
    mockUseGetComplaintDeliveryRidersQuery.mockReturnValue({
      currentData: undefined,
      isLoading: false,
      isError: true,
    })

    render(<FileComplaintCard deliveryId="del-10" />)
    fireEvent.click(screen.getByRole('button', { name: 'File a complaint for a caller' }))

    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent("The order's riders could not be loaded.")
  })

  it('shows "nobody to complain about" message when order had no riders (cross check 3)', () => {
    mockUseGetComplaintDeliveryRidersQuery.mockReturnValue({
      currentData: [],
      isLoading: false,
      isError: false,
    })

    render(<FileComplaintCard deliveryId="del-10" />)
    fireEvent.click(screen.getByRole('button', { name: 'File a complaint for a caller' }))

    expect(
      screen.getByText('No rider accepted this order, so there is nobody to complain about.')
    ).toBeInTheDocument()
  })

  it('automatically selects single rider when order had only one rider', async () => {
    mockUseGetComplaintDeliveryRidersQuery.mockReturnValue({
      currentData: [{ id: 'rider-1', name: 'Kostas Moped' }],
      isLoading: false,
      isError: false,
    })
    mockFileComplaint.mockReturnValue({
      unwrap: () => Promise.resolve({ id: 'cmp-99' }),
    })

    render(<FileComplaintCard deliveryId="del-10" />)
    fireEvent.click(screen.getByRole('button', { name: 'File a complaint for a caller' }))

    expect(screen.getByText('Kostas Moped')).toBeInTheDocument()

    // Select category "Late"
    const lateRadio = screen.getByRole('radio', { name: 'Late' })
    fireEvent.click(lateRadio)
    expect(lateRadio).toHaveAttribute('aria-checked', 'true')

    // Enter caller text
    const textarea = screen.getByLabelText('What the caller said')
    fireEvent.change(textarea, { target: { value: 'Customer Nikos called: rider was 40 min late.' } })

    // File button should be enabled
    const fileButton = screen.getByRole('button', { name: 'File the complaint' })
    expect(fileButton).toBeEnabled()

    fireEvent.click(fileButton)

    await waitFor(() => {
      expect(mockFileComplaint).toHaveBeenCalledWith({
        deliveryId: 'del-10',
        category: 'LATE',
        text: 'Customer Nikos called: rider was 40 min late.',
        aboutCourierId: 'rider-1',
      })
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Complaint filed. The rider is told and replies before anyone decides.',
      })
      expect(mockPush).toHaveBeenCalledWith({
        pathname: '/complaints/[complaintId]',
        query: { complaintId: 'cmp-99' },
      })
    })
  })

  it('renders rider picker dropdown when order was reassigned and had multiple riders (cross check 3)', async () => {
    mockUseGetComplaintDeliveryRidersQuery.mockReturnValue({
      currentData: [
        { id: 'rider-1', name: 'Kostas First' },
        { id: 'rider-2', name: 'Petros Second' },
      ],
      isLoading: false,
      isError: false,
    })
    mockFileComplaint.mockReturnValue({
      unwrap: () => Promise.resolve({ id: 'cmp-multi' }),
    })

    render(<FileComplaintCard deliveryId="del-reassigned" />)
    fireEvent.click(screen.getByRole('button', { name: 'File a complaint for a caller' }))

    expect(screen.getByText('Which rider (this order was reassigned)')).toBeInTheDocument()

    const fileButton = screen.getByRole('button', { name: 'File the complaint' })
    expect(fileButton).toBeDisabled()

    // Pick rider Petros
    const petrosOption = screen.getByRole('option', { name: 'Petros Second' })
    fireEvent.click(petrosOption)

    // Pick category "Food damaged"
    fireEvent.click(screen.getByRole('radio', { name: 'Food damaged' }))

    // Type text
    fireEvent.change(screen.getByLabelText('What the caller said'), {
      target: { value: 'Restaurant called: Petros dropped the bag.' },
    })

    expect(fileButton).toBeEnabled()
    fireEvent.click(fileButton)

    await waitFor(() => {
      expect(mockFileComplaint).toHaveBeenCalledWith({
        deliveryId: 'del-reassigned',
        category: 'FOOD_DAMAGED',
        text: 'Restaurant called: Petros dropped the bag.',
        aboutCourierId: 'rider-2',
      })
    })
  })

  it('displays destructive error toast when complaint filing fails', async () => {
    mockFileComplaint.mockReturnValue({
      unwrap: () => Promise.reject(new Error('This order had no rider')),
    })

    render(<FileComplaintCard deliveryId="del-10" />)
    fireEvent.click(screen.getByRole('button', { name: 'File a complaint for a caller' }))

    fireEvent.click(screen.getByRole('radio', { name: 'Rude' }))
    fireEvent.change(screen.getByLabelText('What the caller said'), { target: { value: 'Rude behaviour.' } })
    fireEvent.click(screen.getByRole('button', { name: 'File the complaint' }))

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'This order had no rider',
        variant: 'destructive',
      })
    })
  })

  it('collapses form when Cancel button is clicked', () => {
    render(<FileComplaintCard deliveryId="del-10" />)
    fireEvent.click(screen.getByRole('button', { name: 'File a complaint for a caller' }))

    expect(screen.getByLabelText('What the caller said')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(screen.queryByLabelText('What the caller said')).toBeNull()
    expect(screen.getByRole('button', { name: 'File a complaint for a caller' })).toBeInTheDocument()
  })
})
