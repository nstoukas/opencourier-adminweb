import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { PartnerFormDialog } from './PartnerFormDialog'
import type { PartnerAdminDto } from '../../../backend-admin-sdk'
import { useCreatePartnerMutation, useUpdatePartnerMutation } from '../../../api/partnersApi'

// Mock Radix Select primitive using React Context for JSDOM test safety
jest.mock('@radix-ui/react-select', () => {
  const React = require('react') as typeof import('react')
  const SelectContext = React.createContext<{ onValueChange?: (v: string) => void }>({})
  return {
    Root: ({ children, onValueChange }: any) => (
      <SelectContext.Provider value={{ onValueChange }}>
        <div data-testid="radix-select-root">{children}</div>
      </SelectContext.Provider>
    ),
    Trigger: ({ children, ...props }: any) => <button type="button" role="combobox" {...props}>{children}</button>,
    Value: ({ placeholder, children }: any) => <span>{children || placeholder}</span>,
    Icon: ({ children }: any) => <span>{children}</span>,
    Portal: ({ children }: any) => <div>{children}</div>,
    Content: ({ children }: any) => <div>{children}</div>,
    Viewport: ({ children }: any) => <div>{children}</div>,
    Item: ({ children, value, ...props }: any) => {
      const { onValueChange } = React.useContext(SelectContext)
      return (
        <div
          role="option"
          onClick={() => onValueChange && onValueChange(value)}
          {...props}
        >
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

jest.mock('../../../api/partnersApi', () => ({
  useCreatePartnerMutation: jest.fn(),
  useUpdatePartnerMutation: jest.fn(),
}))

const mockCreatePartnerMutation = jest.fn()
const mockUpdatePartnerMutation = jest.fn()
const mockUseCreatePartnerMutation = useCreatePartnerMutation as jest.Mock
const mockUseUpdatePartnerMutation = useUpdatePartnerMutation as jest.Mock

const samplePartnerDto = {
  id: 'p1',
  name: 'Souvlaki tou Nikou',
  phoneNumber: '+302421012345',
  logo: 'https://example.com/logo.png',
  webhookUrl: 'https://example.com/webhook',
  userId: 'u1',
  email: 'nikou@volos.test',
  pickupAddress: {
    id: 'loc1',
    street: 'Ermou',
    houseNumber: '120',
    city: 'Volos',
    state: 'Thessaly',
    zipCode: '38221',
    countryCode: 'GR' as any,
    latitude: 39.3628,
    longitude: 22.9435,
    formattedAddress: 'Ermou 120, Volos, Thessaly, 38221 GR',
    createdAt: new Date(),
    stateCode: null,
  },
  createdAt: new Date(),
  updatedAt: new Date(),
} as unknown as PartnerAdminDto

describe('PartnerFormDialog component', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseCreatePartnerMutation.mockReturnValue([
      mockCreatePartnerMutation,
      { isLoading: false },
    ])
    mockUseUpdatePartnerMutation.mockReturnValue([
      mockUpdatePartnerMutation,
      { isLoading: false },
    ])
  })

  it('submits exact create payload with address and numeric coordinates on valid create mode submission', async () => {
    mockCreatePartnerMutation.mockReturnValue({
      unwrap: () => Promise.resolve(samplePartnerDto),
    })

    const onOpenChangeMock = jest.fn()
    render(
      <PartnerFormDialog open={true} onOpenChange={onOpenChangeMock} mode="create" />
    )

    // Fill restaurant credentials
    fireEvent.change(screen.getByLabelText(/restaurant name/i), {
      target: { value: 'Souvlaki tou Nikou' },
    })
    fireEvent.change(screen.getByLabelText(/login email/i), {
      target: { value: 'nikou@volos.test' },
    })
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'securepassword123' },
    })

    // Fill pickup address
    fireEvent.change(screen.getByLabelText(/street/i), { target: { value: 'Ermou' } })
    fireEvent.change(screen.getByLabelText(/house number/i), { target: { value: '120' } })
    fireEvent.change(screen.getByLabelText(/city/i), { target: { value: 'Volos' } })
    fireEvent.change(screen.getByLabelText(/state \/ region/i), { target: { value: 'Thessaly' } })
    fireEvent.change(screen.getByLabelText(/zip \/ postal code/i), { target: { value: '38221' } })
    fireEvent.change(screen.getByLabelText(/latitude/i), { target: { value: '39.3628' } })
    fireEvent.change(screen.getByLabelText(/longitude/i), { target: { value: '22.9435' } })

    fireEvent.click(screen.getByRole('button', { name: /create restaurant/i }))

    await waitFor(() => {
      expect(mockCreatePartnerMutation).toHaveBeenCalledTimes(1)
      expect(mockCreatePartnerMutation).toHaveBeenCalledWith({
        name: 'Souvlaki tou Nikou',
        email: 'nikou@volos.test',
        password: 'securepassword123',
        pickupAddress: {
          street: 'Ermou',
          houseNumber: '120',
          city: 'Volos',
          state: 'Thessaly',
          zipCode: '38221',
          countryCode: 'GR',
          latitude: 39.3628,
          longitude: 22.9435,
          formattedAddress: 'Ermou 120, Volos, Thessaly, 38221 GR',
        },
      })
    })

    // Gap-3 assertion: password notice must be visible after creation
    expect(screen.getByText(/Credentials Created/i)).toBeInTheDocument()
    expect(screen.getByText(/Password set for nikou@volos.test/i)).toBeInTheDocument()

    // Dismiss notice via Done button to complete modal closing
    fireEvent.click(screen.getByRole('button', { name: /done/i }))
    expect(onOpenChangeMock).toHaveBeenCalledWith(false)
  })

  it('blocks submit and renders specific error when street is filled but city is blank', async () => {
    render(
      <PartnerFormDialog open={true} onOpenChange={jest.fn()} mode="create" />
    )

    fireEvent.change(screen.getByLabelText(/restaurant name/i), {
      target: { value: 'Souvlaki tou Nikou' },
    })
    fireEvent.change(screen.getByLabelText(/login email/i), {
      target: { value: 'nikou@volos.test' },
    })
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'securepassword123' },
    })

    // Fill street but leave city blank
    fireEvent.change(screen.getByLabelText(/street/i), { target: { value: 'Ermou' } })

    fireEvent.click(screen.getByRole('button', { name: /create restaurant/i }))

    expect(
      await screen.findByText(/City is required when adding a pickup address/i)
    ).toBeInTheDocument()
    expect(mockCreatePartnerMutation).not.toHaveBeenCalled()
  })

  it('submits update payload with modified phone number when updating restaurant', async () => {
    mockUpdatePartnerMutation.mockReturnValue({
      unwrap: () => Promise.resolve(samplePartnerDto),
    })

    render(
      <PartnerFormDialog
        open={true}
        onOpenChange={jest.fn()}
        mode="update"
        partner={samplePartnerDto}
      />
    )

    // Change phone number
    const phoneInput = screen.getByLabelText(/phone number/i)
    fireEvent.change(phoneInput, { target: { value: '+302421099999' } })

    fireEvent.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(() => {
      expect(mockUpdatePartnerMutation).toHaveBeenCalledTimes(1)
      expect(mockUpdatePartnerMutation).toHaveBeenCalledWith({
        id: 'p1',
        data: {
          phoneNumber: '+302421099999',
        },
      })
    })
  })

  it('allows updating partner with pickupAddress: null without triggering address validation errors', async () => {
    mockUpdatePartnerMutation.mockReturnValue({
      unwrap: () => Promise.resolve(samplePartnerDto),
    })

    const partnerNoAddress: PartnerAdminDto = {
      ...samplePartnerDto,
      pickupAddress: null,
    }

    render(
      <PartnerFormDialog
        open={true}
        onOpenChange={jest.fn()}
        mode="update"
        partner={partnerNoAddress}
      />
    )

    const nameInput = screen.getByLabelText(/restaurant name/i)
    fireEvent.change(nameInput, { target: { value: 'Souvlaki tou Nikou 2' } })

    fireEvent.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(() => {
      expect(mockUpdatePartnerMutation).toHaveBeenCalledTimes(1)
      expect(mockUpdatePartnerMutation).toHaveBeenCalledWith({
        id: 'p1',
        data: {
          name: 'Souvlaki tou Nikou 2',
        },
      })
    })
  })

  it('submits update payload with countryCode GR when adding pickup address to a partner with null pickupAddress', async () => {
    mockUpdatePartnerMutation.mockReturnValue({
      unwrap: () => Promise.resolve(samplePartnerDto),
    })

    const partnerNoAddress: PartnerAdminDto = {
      ...samplePartnerDto,
      pickupAddress: null,
    }

    render(
      <PartnerFormDialog
        open={true}
        onOpenChange={jest.fn()}
        mode="update"
        partner={partnerNoAddress}
      />
    )

    // Admin fills pickup address fields without interacting with the Country dropdown
    fireEvent.change(screen.getByLabelText(/street/i), { target: { value: 'Ermou' } })
    fireEvent.change(screen.getByLabelText(/house number/i), { target: { value: '120' } })
    fireEvent.change(screen.getByLabelText(/city/i), { target: { value: 'Volos' } })
    fireEvent.change(screen.getByLabelText(/latitude/i), { target: { value: '39.3628' } })
    fireEvent.change(screen.getByLabelText(/longitude/i), { target: { value: '22.9435' } })

    fireEvent.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(() => {
      expect(mockUpdatePartnerMutation).toHaveBeenCalledTimes(1)
      expect(mockUpdatePartnerMutation).toHaveBeenCalledWith({
        id: 'p1',
        data: {
          pickupAddress: {
            street: 'Ermou',
            houseNumber: '120',
            city: 'Volos',
            state: undefined,
            zipCode: undefined,
            countryCode: 'GR',
            latitude: 39.3628,
            longitude: 22.9435,
            formattedAddress: 'Ermou 120, Volos, GR',
          },
        },
      })
    })

    // Confirm no validation error text is displayed
    expect(screen.queryByText(/Country code is required/i)).not.toBeInTheDocument()
  })

  it('does not call window.confirm during form interaction or submission', async () => {
    const confirmSpy = jest.spyOn(window, 'confirm').mockImplementation(() => true)
    mockCreatePartnerMutation.mockReturnValue({
      unwrap: () => Promise.resolve(samplePartnerDto),
    })

    render(
      <PartnerFormDialog open={true} onOpenChange={jest.fn()} mode="create" />
    )

    fireEvent.change(screen.getByLabelText(/restaurant name/i), {
      target: { value: 'Test Co-op' },
    })
    fireEvent.change(screen.getByLabelText(/login email/i), {
      target: { value: 'test@volos.test' },
    })
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'password123' },
    })
    fireEvent.change(screen.getByLabelText(/street/i), { target: { value: 'Ermou' } })
    fireEvent.change(screen.getByLabelText(/city/i), { target: { value: 'Volos' } })
    fireEvent.change(screen.getByLabelText(/latitude/i), { target: { value: '39.3628' } })
    fireEvent.change(screen.getByLabelText(/longitude/i), { target: { value: '22.9435' } })

    fireEvent.click(screen.getByRole('button', { name: /create restaurant/i }))

    await waitFor(() => {
      expect(mockCreatePartnerMutation).toHaveBeenCalledTimes(1)
    })

    expect(confirmSpy).not.toHaveBeenCalled()
    confirmSpy.mockRestore()
  })
})
