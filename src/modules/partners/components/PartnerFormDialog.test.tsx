import { useRef, useState } from 'react'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
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

// The toast is spied on, so a test can say the create toast is gone (spec 0024, AC-7).
const mockToast = jest.fn()
jest.mock('../../../admin-web-components', () => {
  const actual = jest.requireActual('../../../admin-web-components')
  return {
    ...actual,
    useToast: () => ({ toast: mockToast }),
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
    fireEvent.change(screen.getByLabelText(/sign-in email/i), {
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

    fireEvent.click(screen.getByRole('button', { name: /add restaurant/i }))

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

    // Gap-3 assertion: the password is shown once after creation, in the Restaurant Added panel (spec 0024, AC-8)
    expect(screen.getByRole('heading', { name: 'Restaurant Added' })).toBeInTheDocument()
    expect(screen.getByText('nikou@volos.test')).toBeInTheDocument()
    expect(screen.getByText('securepassword123')).toBeInTheDocument()

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
    fireEvent.change(screen.getByLabelText(/sign-in email/i), {
      target: { value: 'nikou@volos.test' },
    })
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'securepassword123' },
    })

    // Fill street but leave city blank
    fireEvent.change(screen.getByLabelText(/street/i), { target: { value: 'Ermou' } })

    fireEvent.click(screen.getByRole('button', { name: /add restaurant/i }))

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
    const phoneInput = screen.getByLabelText(/phone couriers call/i)
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
    fireEvent.change(screen.getByLabelText(/sign-in email/i), {
      target: { value: 'test@volos.test' },
    })
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'password123' },
    })
    fireEvent.change(screen.getByLabelText(/street/i), { target: { value: 'Ermou' } })
    fireEvent.change(screen.getByLabelText(/city/i), { target: { value: 'Volos' } })
    fireEvent.change(screen.getByLabelText(/latitude/i), { target: { value: '39.3628' } })
    fireEvent.change(screen.getByLabelText(/longitude/i), { target: { value: '22.9435' } })

    fireEvent.click(screen.getByRole('button', { name: /add restaurant/i }))

    await waitFor(() => {
      expect(mockCreatePartnerMutation).toHaveBeenCalledTimes(1)
    })

    expect(confirmSpy).not.toHaveBeenCalled()
    confirmSpy.mockRestore()
  })
})

// Spec 0024: Add a Restaurant (AC-7), Restaurant Added (AC-8) and Edit Details (AC-9).
describe('PartnerFormDialog (spec 0024, AC-7 to AC-9)', () => {
  const originalClipboard = Object.getOwnPropertyDescriptor(navigator, 'clipboard')

  // Replaces navigator.clipboard for one test; `undefined` is the insecure page case.
  function setClipboard(value: unknown) {
    Object.defineProperty(navigator, 'clipboard', { value, configurable: true, writable: true })
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockUseCreatePartnerMutation.mockReturnValue([mockCreatePartnerMutation, { isLoading: false }])
    mockUseUpdatePartnerMutation.mockReturnValue([mockUpdatePartnerMutation, { isLoading: false }])
  })

  afterEach(() => {
    if (originalClipboard) {
      Object.defineProperty(navigator, 'clipboard', originalClipboard)
    } else {
      delete (navigator as any).clipboard
    }
  })

  // The server answers with a different name than the one typed, to prove the panel reads the response.
  const responseName = 'Souvlaki tou Nikou (as saved)'

  function fillAndSubmitCreate({
    name = 'Souvlaki tou Nikou',
    email = 'nikou@volos.test',
    password = 'securepassword123',
  } = {}) {
    fireEvent.change(screen.getByLabelText(/restaurant name/i), { target: { value: name } })
    fireEvent.change(screen.getByLabelText(/sign-in email/i), { target: { value: email } })
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: password } })
    fireEvent.click(screen.getByRole('button', { name: 'Add Restaurant' }))
  }

  function resolveCreateWith(name: string) {
    mockCreatePartnerMutation.mockReturnValue({
      unwrap: () => Promise.resolve({ ...samplePartnerDto, name }),
    })
  }

  // Owns the open state like the list page does, so closing really unmounts the dialog.
  function CreateHarness({ onOpenChangeSpy }: { onOpenChangeSpy?: (open: boolean) => void }) {
    const [open, setOpen] = useState(true)
    const buttonRef = useRef<HTMLButtonElement>(null)
    return (
      <div>
        <button ref={buttonRef} type="button" onClick={() => setOpen(true)}>
          Open add dialog
        </button>
        <PartnerFormDialog
          open={open}
          onOpenChange={(next) => {
            onOpenChangeSpy?.(next)
            setOpen(next)
          }}
          mode="create"
          returnFocusTo={buttonRef}
        />
      </div>
    )
  }

  async function reachCreatedPanel() {
    resolveCreateWith(responseName)
    fillAndSubmitCreate()
    await screen.findByRole('heading', { name: 'Restaurant Added' })
  }

  describe('AC-7: Add a Restaurant', () => {
    it('shows the title, description, and Cancel and Add Restaurant buttons', () => {
      render(<PartnerFormDialog open={true} onOpenChange={jest.fn()} mode="create" />)

      expect(screen.getByRole('heading', { name: 'Add a Restaurant' })).toBeInTheDocument()
      expect(screen.getByText('Issue a restaurant login and set its pickup location.')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Add Restaurant' })).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /create restaurant/i })).toBeNull()
    })

    it('orders the fields: name, phone couriers call, pickup address, sign-in email, password', () => {
      render(<PartnerFormDialog open={true} onOpenChange={jest.fn()} mode="create" />)

      const inOrder = [
        screen.getByLabelText('Restaurant name'),
        screen.getByLabelText('Phone couriers call'),
        // The pickup address block, first and last of its fields.
        screen.getByLabelText('Street'),
        screen.getByLabelText('Longitude'),
        screen.getByLabelText('Sign-in email'),
        screen.getByLabelText('Password'),
      ]
      inOrder.slice(1).forEach((field, i) => {
        const previous = inOrder[i] as HTMLElement
        const followsPrevious = previous.compareDocumentPosition(field) & Node.DOCUMENT_POSITION_FOLLOWING
        expect({ field: (field as HTMLInputElement).name, followsPrevious: !!followsPrevious }).toEqual({
          field: (field as HTMLInputElement).name,
          followsPrevious: true,
        })
      })
    })

    it('still asks for a password of at least 8 characters and sends nothing without one', async () => {
      render(<PartnerFormDialog open={true} onOpenChange={jest.fn()} mode="create" />)

      fillAndSubmitCreate({ password: 'short' })

      expect(await screen.findByText('Password must be at least 8 characters')).toBeInTheDocument()
      expect(mockCreatePartnerMutation).not.toHaveBeenCalled()
    })

    it('shows no "Restaurant created successfully" toast after a create (the panel is the confirmation)', async () => {
      render(<PartnerFormDialog open={true} onOpenChange={jest.fn()} mode="create" />)

      await reachCreatedPanel()

      expect(mockToast).not.toHaveBeenCalled()
    })

    it('keeps the form and toasts the failure when the create fails', async () => {
      mockCreatePartnerMutation.mockReturnValue({
        unwrap: () => Promise.reject({ message: 'Email already taken' }),
      })
      render(<PartnerFormDialog open={true} onOpenChange={jest.fn()} mode="create" />)

      fillAndSubmitCreate()

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({ title: 'Failed to create restaurant', description: 'Email already taken' }),
        )
      })
      expect(screen.queryByRole('heading', { name: 'Restaurant Added' })).toBeNull()
      expect(screen.getByRole('heading', { name: 'Add a Restaurant' })).toBeInTheDocument()
    })
  })

  describe('AC-8: Restaurant Added', () => {
    it('shows the title, description, the success line with the name from the response, and the email and password', async () => {
      render(<PartnerFormDialog open={true} onOpenChange={jest.fn()} mode="create" />)

      resolveCreateWith(responseName)
      fillAndSubmitCreate({ name: 'Typed Name', email: '  typed@volos.test  ', password: 'securepassword123' })

      expect(await screen.findByRole('heading', { name: 'Restaurant Added' })).toBeInTheDocument()
      expect(screen.getByText('Give these details to the restaurant.')).toBeInTheDocument()
      expect(
        screen.getByText(
          `${responseName} can start sending deliveries. Give them these details. The password is shown only now.`,
        ),
      ).toBeInTheDocument()
      expect(screen.queryByText(/Typed Name/)).toBeNull()

      // A DetailList of Email and Password, in mono; the email as sent (trimmed).
      const list = document.querySelector('dl') as HTMLElement
      expect(list).not.toBeNull()
      const terms = within(list).getAllByRole('term').map((el) => el.textContent)
      expect(terms).toEqual(['Email', 'Password'])
      const email = within(list).getByText('typed@volos.test')
      const password = within(list).getByText('securepassword123')
      expect(email).toHaveClass('font-mono')
      expect(password).toHaveClass('font-mono')

      expect(screen.getByRole('button', { name: 'Copy All' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Done' })).toBeInTheDocument()
      // The form is gone: no field still holds the password.
      expect(screen.queryByLabelText('Password')).toBeNull()
    })

    it('Copy All writes "Email: <e>\\nPassword: <p>" to the clipboard, then says "Copied"', async () => {
      const writeText = jest.fn().mockResolvedValue(undefined)
      setClipboard({ writeText })
      render(<PartnerFormDialog open={true} onOpenChange={jest.fn()} mode="create" />)
      await reachCreatedPanel()

      fireEvent.click(screen.getByRole('button', { name: 'Copy All' }))

      expect(await screen.findByRole('button', { name: 'Copied' })).toBeInTheDocument()
      expect(writeText).toHaveBeenCalledTimes(1)
      expect(writeText).toHaveBeenCalledWith('Email: nikou@volos.test\nPassword: securepassword123')
      expect(screen.queryByText('Could not copy. Select the text instead.')).toBeNull()
    })

    it('says "Could not copy. Select the text instead." when the clipboard refuses, and keeps the values on screen', async () => {
      const writeText = jest.fn().mockRejectedValue(new Error('NotAllowedError'))
      setClipboard({ writeText })
      render(<PartnerFormDialog open={true} onOpenChange={jest.fn()} mode="create" />)
      await reachCreatedPanel()

      fireEvent.click(screen.getByRole('button', { name: 'Copy All' }))

      expect(await screen.findByText('Could not copy. Select the text instead.')).toBeInTheDocument()
      expect(writeText).toHaveBeenCalledTimes(1)
      expect(screen.queryByRole('button', { name: 'Copied' })).toBeNull()
      expect(screen.getByText('nikou@volos.test')).toBeInTheDocument()
      expect(screen.getByText('securepassword123')).toBeInTheDocument()
    })

    it('says "Could not copy. Select the text instead." when navigator.clipboard is missing (insecure page)', async () => {
      setClipboard(undefined)
      render(<PartnerFormDialog open={true} onOpenChange={jest.fn()} mode="create" />)
      await reachCreatedPanel()

      fireEvent.click(screen.getByRole('button', { name: 'Copy All' }))

      expect(await screen.findByText('Could not copy. Select the text instead.')).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Copied' })).toBeNull()
    })

    it('ignores Escape on the Restaurant Added panel', async () => {
      const onOpenChangeSpy = jest.fn()
      render(<CreateHarness onOpenChangeSpy={onOpenChangeSpy} />)
      await reachCreatedPanel()

      fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape', code: 'Escape' })

      expect(onOpenChangeSpy).not.toHaveBeenCalled()
      expect(screen.getByRole('heading', { name: 'Restaurant Added' })).toBeInTheDocument()
      expect(screen.getByText('securepassword123')).toBeInTheDocument()
    })

    it('ignores a click outside the Restaurant Added panel', async () => {
      const onOpenChangeSpy = jest.fn()
      render(<CreateHarness onOpenChangeSpy={onOpenChangeSpy} />)
      await reachCreatedPanel()

      fireEvent.pointerDown(document.body)

      expect(onOpenChangeSpy).not.toHaveBeenCalled()
      expect(screen.getByRole('heading', { name: 'Restaurant Added' })).toBeInTheDocument()
    })

    it('still lets Escape close the Add a Restaurant form (the guard is only for the panel)', async () => {
      const onOpenChangeSpy = jest.fn()
      render(<CreateHarness onOpenChangeSpy={onOpenChangeSpy} />)

      fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape', code: 'Escape' })

      expect(onOpenChangeSpy).toHaveBeenCalledWith(false)
      await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    })

    it('Done closes the panel and gives focus back to the returnFocusTo button', async () => {
      const onOpenChangeSpy = jest.fn()
      render(<CreateHarness onOpenChangeSpy={onOpenChangeSpy} />)
      await reachCreatedPanel()

      fireEvent.click(screen.getByRole('button', { name: 'Done' }))

      expect(onOpenChangeSpy).toHaveBeenCalledWith(false)
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).toBeNull()
        expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Open add dialog' }))
      })
    })

    it('keeps the close button (✕) on the panel, and it closes the dialog (decision 91.10)', async () => {
      const onOpenChangeSpy = jest.fn()
      render(<CreateHarness onOpenChangeSpy={onOpenChangeSpy} />)
      await reachCreatedPanel()

      fireEvent.click(screen.getByRole('button', { name: /close/i }))

      expect(onOpenChangeSpy).toHaveBeenCalledWith(false)
      await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    })

    it('forgets the email and password once closed: opening again shows an empty Add a Restaurant form', async () => {
      const writeText = jest.fn().mockResolvedValue(undefined)
      setClipboard({ writeText })
      render(<CreateHarness />)
      await reachCreatedPanel()
      fireEvent.click(screen.getByRole('button', { name: 'Copy All' }))
      await screen.findByRole('button', { name: 'Copied' })

      fireEvent.click(screen.getByRole('button', { name: 'Done' }))
      await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
      fireEvent.click(screen.getByRole('button', { name: 'Open add dialog' }))

      expect(await screen.findByRole('heading', { name: 'Add a Restaurant' })).toBeInTheDocument()
      expect(screen.queryByText('securepassword123')).toBeNull()
      expect(screen.queryByRole('button', { name: 'Copied' })).toBeNull()
      expect(screen.getByLabelText('Password')).toHaveValue('')
      expect(screen.getByLabelText('Sign-in email')).toHaveValue('')
    })
  })

  describe('AC-9: Edit Details', () => {
    it('shows the title "Edit Details", the description and the labels', () => {
      render(<PartnerFormDialog open={true} onOpenChange={jest.fn()} mode="update" partner={samplePartnerDto} />)

      expect(screen.getByRole('heading', { name: 'Edit Details' })).toBeInTheDocument()
      expect(screen.getByText('Update details for Souvlaki tou Nikou.')).toBeInTheDocument()
      expect(screen.getByLabelText('Restaurant name')).toHaveValue('Souvlaki tou Nikou')
      expect(screen.getByLabelText('Phone couriers call')).toHaveValue('+302421012345')
      expect(screen.getByLabelText('Logo URL')).toHaveValue('https://example.com/logo.png')
      expect(screen.getByLabelText('Webhook URL')).toHaveValue('https://example.com/webhook')
      expect(screen.getByLabelText('Street')).toHaveValue('Ermou')
      // The create form's fields are not here.
      expect(screen.queryByLabelText('Sign-in email')).toBeNull()
      expect(screen.queryByLabelText('Password')).toBeNull()
    })

    it('sends only the changed field (the webhook URL) and toasts the update', async () => {
      mockUpdatePartnerMutation.mockReturnValue({ unwrap: () => Promise.resolve(samplePartnerDto) })
      const onOpenChange = jest.fn()
      render(<PartnerFormDialog open={true} onOpenChange={onOpenChange} mode="update" partner={samplePartnerDto} />)

      fireEvent.change(screen.getByLabelText('Webhook URL'), { target: { value: 'https://example.com/new-hook' } })
      fireEvent.click(screen.getByRole('button', { name: /save changes/i }))

      await waitFor(() => {
        expect(mockUpdatePartnerMutation).toHaveBeenCalledTimes(1)
        expect(mockUpdatePartnerMutation).toHaveBeenCalledWith({
          id: 'p1',
          data: { webhookUrl: 'https://example.com/new-hook' },
        })
      })
      await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false))
      expect(mockToast).toHaveBeenCalledWith({ title: 'Restaurant updated successfully' })
    })
  })
})
