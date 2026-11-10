import React from 'react'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { RemovalReasonsCard } from './RemovalReasonsCard'
import type { RemovalReasonAdminDto } from '@/backend-admin-sdk'
import {
  useGetRemovalReasonsQuery,
  useCreateRemovalReasonMutation,
  useUpdateRemovalReasonMutation,
  useRemoveRemovalReasonMutation,
} from '../../../api/removalRequestApi'
import { EMPTY_FORM, type SettingsForm } from '../settingsDiff'

jest.mock('../../../api/removalRequestApi', () => ({
  useGetRemovalReasonsQuery: jest.fn(),
  useCreateRemovalReasonMutation: jest.fn(),
  useUpdateRemovalReasonMutation: jest.fn(),
  useRemoveRemovalReasonMutation: jest.fn(),
}))

const mockUseGetRemovalReasonsQuery = useGetRemovalReasonsQuery as jest.Mock
const mockUseCreateRemovalReasonMutation = useCreateRemovalReasonMutation as jest.Mock
const mockUseUpdateRemovalReasonMutation = useUpdateRemovalReasonMutation as jest.Mock
const mockUseRemoveRemovalReasonMutation = useRemoveRemovalReasonMutation as jest.Mock

const mockCreateReason = jest.fn()
const mockUpdateReason = jest.fn()
const mockRemoveReason = jest.fn()

const sampleReasons: RemovalReasonAdminDto[] = [
  {
    id: 'reason-1',
    label: 'Moped breakdown or accident',
    paidToRider: true,
    chargedToRestaurant: false,
    needsNote: false,
    position: 1,
    removedAt: null,
  },
  {
    id: 'reason-2',
    label: 'Other',
    paidToRider: false,
    chargedToRestaurant: true,
    needsNote: true,
    position: 2,
    removedAt: null,
  },
]

const resolved = (value: unknown = {}) => ({ unwrap: () => Promise.resolve(value) })
const rejected = (error: unknown) => ({ unwrap: () => Promise.reject(error) })

describe('RemovalReasonsCard (spec 0035, AC-2, decision 24.29)', () => {
  const mockSet = jest.fn()
  const defaultForm: SettingsForm = {
    ...EMPTY_FORM,
    returnTripPayPercent: '100',
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockUseGetRemovalReasonsQuery.mockReturnValue({
      data: sampleReasons,
      isLoading: false,
      isError: false,
    })
    mockUseCreateRemovalReasonMutation.mockReturnValue([mockCreateReason, { isLoading: false }])
    mockUseUpdateRemovalReasonMutation.mockReturnValue([mockUpdateReason, { isLoading: false }])
    mockUseRemoveRemovalReasonMutation.mockReturnValue([mockRemoveReason, { isLoading: false }])

    mockCreateReason.mockReturnValue(resolved(sampleReasons[0]))
    mockUpdateReason.mockReturnValue(resolved(sampleReasons[0]))
    mockRemoveReason.mockReturnValue(resolved(sampleReasons[0]))
  })

  const renderCard = (props: Partial<Parameters<typeof RemovalReasonsCard>[0]> = {}) => {
    return render(
      <RemovalReasonsCard
        form={defaultForm}
        set={mockSet}
        loaded={true}
        {...props}
      />
    )
  }

  describe('display and states', () => {
    it('renders loading state when reasons are loading', () => {
      mockUseGetRemovalReasonsQuery.mockReturnValue({
        data: undefined,
        isLoading: true,
        isError: false,
      })

      renderCard()
      expect(screen.getByText('Loading the reasons.')).toBeInTheDocument()
    })

    it('renders error state when reasons query fails', () => {
      mockUseGetRemovalReasonsQuery.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
      })

      renderCard()
      expect(screen.getByRole('alert')).toHaveTextContent('Could not load the reasons.')
    })

    it('renders empty message when no reasons exist', () => {
      mockUseGetRemovalReasonsQuery.mockReturnValue({
        data: [],
        isLoading: false,
        isError: false,
      })

      renderCard()
      expect(
        screen.getByText('No reasons yet. Riders cannot ask to come off an order until one is added.')
      ).toBeInTheDocument()
    })

    it('lists reasons, each with label, position, and in words what it does (paid, charged, needs note)', () => {
      renderCard()

      const [firstRow, secondRow] = screen.getAllByTestId('removal-reason-row')
      if (!firstRow || !secondRow) throw new Error('Expected rows')

      // Reason 1: position 1, paid, not charged, no note
      expect(firstRow).toHaveTextContent('1. Moped breakdown or accident')
      expect(firstRow).toHaveTextContent('Paid to the rider · Not charged')
      expect(firstRow).not.toHaveTextContent('Needs a note')

      // Reason 2: position 2, not paid, charged, needs note
      expect(secondRow).toHaveTextContent('2. Other')
      expect(secondRow).toHaveTextContent('Not paid · Charged to the restaurant · Needs a note')

      // Edit and remove buttons
      expect(within(firstRow).getByRole('button', { name: /Edit/i })).toBeInTheDocument()
      expect(within(firstRow).getByRole('button', { name: /Remove/i })).toBeInTheDocument()
    })
  })

  describe('Add reason dialog (decision 24.29)', () => {
    it('opens dialog with new reason defaults: paid on, charged off, needs note off', () => {
      renderCard()

      fireEvent.click(screen.getByRole('button', { name: 'Add reason' }))

      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(screen.getByRole('heading', { name: 'Add reason' })).toBeInTheDocument()

      const labelInput = document.getElementById('removal-reason-label') as HTMLInputElement
      expect(labelInput.value).toBe('')

      const paidSwitch = document.getElementById('removal-reason-paid') as HTMLButtonElement
      const chargedSwitch = document.getElementById('removal-reason-charged') as HTMLButtonElement
      const noteSwitch = document.getElementById('removal-reason-note') as HTMLButtonElement

      expect(paidSwitch.getAttribute('aria-checked')).toBe('true')
      expect(chargedSwitch.getAttribute('aria-checked')).toBe('false')
      expect(noteSwitch.getAttribute('aria-checked')).toBe('false')

      // Decision 24.29: The add dialog has no position field!
      expect(document.getElementById('removal-reason-position')).toBeNull()
      expect(screen.getByText('A new reason goes to the end of the list.')).toBeInTheDocument()
    })

    it('refuses empty or spaces-only label with a message and sends nothing', async () => {
      renderCard()

      fireEvent.click(screen.getByRole('button', { name: 'Add reason' }))

      const labelInput = document.getElementById('removal-reason-label') as HTMLInputElement
      fireEvent.change(labelInput, { target: { value: '   ' } })

      const submitBtn = screen.getByRole('button', { name: 'Add reason' })
      fireEvent.click(submitBtn)

      expect(await screen.findByRole('alert')).toHaveTextContent('Type what the rider reads for this reason.')
      expect(mockCreateReason).not.toHaveBeenCalled()
    })

    it('sends trimmed label, paidToRider, chargedToRestaurant, needsNote without position key', async () => {
      renderCard()

      fireEvent.click(screen.getByRole('button', { name: 'Add reason' }))

      const labelInput = document.getElementById('removal-reason-label') as HTMLInputElement
      fireEvent.change(labelInput, { target: { value: '  Customer unreachable  ' } })

      // Toggle charged to on
      const chargedSwitch = document.getElementById('removal-reason-charged') as HTMLButtonElement
      fireEvent.click(chargedSwitch)

      const submitBtn = screen.getByRole('button', { name: 'Add reason' })
      fireEvent.click(submitBtn)

      await waitFor(() => {
        expect(mockCreateReason).toHaveBeenCalledWith({
          label: 'Customer unreachable',
          paidToRider: true,
          chargedToRestaurant: true,
          needsNote: false,
        })
      })

      // Ensure create call has no position key (decision 24.29)
      const callArg = mockCreateReason.mock.calls[0][0]
      expect(callArg).not.toHaveProperty('position')
    })

    it('turns paid off and needs note on before adding and asserts paidToRider: false and needsNote: true with no position key', async () => {
      renderCard()

      fireEvent.click(screen.getByRole('button', { name: 'Add reason' }))

      const labelInput = document.getElementById('removal-reason-label') as HTMLInputElement
      fireEvent.change(labelInput, { target: { value: 'Customer emergency' } })

      // Turn paid off (defaults to true, clicking toggles to false)
      const paidSwitch = document.getElementById('removal-reason-paid') as HTMLButtonElement
      fireEvent.click(paidSwitch)

      // Turn needs note on (defaults to false, clicking toggles to true)
      const noteSwitch = document.getElementById('removal-reason-note') as HTMLButtonElement
      fireEvent.click(noteSwitch)

      const submitBtn = screen.getByRole('button', { name: 'Add reason' })
      fireEvent.click(submitBtn)

      await waitFor(() => {
        expect(mockCreateReason).toHaveBeenCalledWith({
          label: 'Customer emergency',
          paidToRider: false,
          chargedToRestaurant: false,
          needsNote: true,
        })
      })

      // Ensure create call has no position key (decision 24.29)
      const callArg = mockCreateReason.mock.calls[0][0]
      expect(callArg).not.toHaveProperty('position')
    })

    it('shows backend sentence inside dialog when create fails and keeps dialog open', async () => {
      mockCreateReason.mockReturnValue(rejected({ message: 'A reason with this label already exists' }))

      renderCard()

      fireEvent.click(screen.getByRole('button', { name: 'Add reason' }))
      const labelInput = document.getElementById('removal-reason-label') as HTMLInputElement
      fireEvent.change(labelInput, { target: { value: 'Duplicate reason' } })

      fireEvent.click(screen.getByRole('button', { name: 'Add reason' }))

      expect(await screen.findByRole('alert')).toHaveTextContent('A reason with this label already exists')
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })
  })

  describe('Edit reason dialog', () => {
    it('opens with reason values, shows position field, and sends position as a number', async () => {
      renderCard()

      const [firstRow] = screen.getAllByTestId('removal-reason-row')
      if (!firstRow) throw new Error('Expected firstRow')
      const editBtn = within(firstRow).getByRole('button', { name: /Edit/i })
      fireEvent.click(editBtn)

      expect(screen.getByRole('heading', { name: 'Edit reason' })).toBeInTheDocument()

      const labelInput = document.getElementById('removal-reason-label') as HTMLInputElement
      expect(labelInput.value).toBe('Moped breakdown or accident')

      const positionInput = document.getElementById('removal-reason-position') as HTMLInputElement
      expect(positionInput).toBeInTheDocument()
      expect(positionInput.value).toBe('1')

      // Edit values
      fireEvent.change(labelInput, { target: { value: 'Moped breakdown (severe)' } })
      fireEvent.change(positionInput, { target: { value: '5' } })

      const saveBtn = screen.getByRole('button', { name: 'Save reason' })
      fireEvent.click(saveBtn)

      await waitFor(() => {
        expect(mockUpdateReason).toHaveBeenCalledWith({
          id: 'reason-1',
          input: {
            label: 'Moped breakdown (severe)',
            paidToRider: true,
            chargedToRestaurant: false,
            needsNote: false,
            position: 5,
          },
        })
      })
    })

    it('refuses empty position with a message and sends nothing', async () => {
      renderCard()

      const [firstRow] = screen.getAllByTestId('removal-reason-row')
      if (!firstRow) throw new Error('Expected firstRow')
      fireEvent.click(within(firstRow).getByRole('button', { name: /Edit/i }))

      const positionInput = document.getElementById('removal-reason-position') as HTMLInputElement
      fireEvent.change(positionInput, { target: { value: '   ' } })

      fireEvent.click(screen.getByRole('button', { name: 'Save reason' }))

      expect(await screen.findByRole('alert')).toHaveTextContent('The position must be a whole number.')
      expect(mockUpdateReason).not.toHaveBeenCalled()
    })

    it('refuses non-integer position with a message and sends nothing', async () => {
      renderCard()

      const [firstRow] = screen.getAllByTestId('removal-reason-row')
      if (!firstRow) throw new Error('Expected firstRow')
      fireEvent.click(within(firstRow).getByRole('button', { name: /Edit/i }))

      const positionInput = document.getElementById('removal-reason-position') as HTMLInputElement
      fireEvent.change(positionInput, { target: { value: '2.5' } })

      fireEvent.click(screen.getByRole('button', { name: 'Save reason' }))

      expect(await screen.findByRole('alert')).toHaveTextContent('The position must be a whole number.')
      expect(mockUpdateReason).not.toHaveBeenCalled()
    })

    it('shows backend sentence inside dialog when update fails and keeps dialog open', async () => {
      mockUpdateReason.mockReturnValue(rejected({ message: 'Position is out of bounds' }))

      renderCard()

      const [firstRow] = screen.getAllByTestId('removal-reason-row')
      if (!firstRow) throw new Error('Expected firstRow')
      fireEvent.click(within(firstRow).getByRole('button', { name: /Edit/i }))

      fireEvent.click(screen.getByRole('button', { name: 'Save reason' }))

      expect(await screen.findByRole('alert')).toHaveTextContent('Position is out of bounds')
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })
  })

  describe('Remove reason dialog', () => {
    it('asks first, names the reason, and calls remove only on confirmation', async () => {
      renderCard()

      const [firstRow] = screen.getAllByTestId('removal-reason-row')
      if (!firstRow) throw new Error('Expected firstRow')
      const removeBtn = within(firstRow).getByRole('button', { name: /Remove/i })
      fireEvent.click(removeBtn)

      // Alert dialog opens
      expect(screen.getByRole('alertdialog')).toBeInTheDocument()
      expect(screen.getByRole('heading', { name: 'Remove this reason?' })).toBeInTheDocument()
      expect(
        screen.getByText('Moped breakdown or accident. Riders stop seeing it. Requests already sent keep it.')
      ).toBeInTheDocument()

      expect(mockRemoveReason).not.toHaveBeenCalled()

      // Click remove button in confirmation dialog
      const confirmBtn = screen.getByRole('button', { name: 'Remove reason' })
      fireEvent.click(confirmBtn)

      await waitFor(() => {
        expect(mockRemoveReason).toHaveBeenCalledWith({ id: 'reason-1' })
      })
    })

    it('shows backend sentence on 409 from removing last active reason and keeps dialog open', async () => {
      mockRemoveReason.mockReturnValue(
        rejected({ statusCode: 409, message: 'Cannot remove the last active removal reason' })
      )

      renderCard()

      const [firstRow] = screen.getAllByTestId('removal-reason-row')
      if (!firstRow) throw new Error('Expected firstRow')
      fireEvent.click(within(firstRow).getByRole('button', { name: /Remove/i }))

      const confirmBtn = screen.getByRole('button', { name: 'Remove reason' })
      fireEvent.click(confirmBtn)

      expect(await screen.findByRole('alert')).toHaveTextContent(
        'Cannot remove the last active removal reason'
      )
      expect(screen.getByRole('alertdialog')).toBeInTheDocument()
    })

    it('returns focus to the Add reason button after successful removal even though removed row button remains', async () => {
      renderCard()

      const addButton = screen.getByRole('button', { name: 'Add reason' })
      const [firstRow] = screen.getAllByTestId('removal-reason-row')
      if (!firstRow) throw new Error('Expected firstRow')
      const firstRowRemoveBtn = within(firstRow).getByRole('button', { name: /Remove/i })

      fireEvent.click(firstRowRemoveBtn)

      expect(screen.getByRole('alertdialog')).toBeInTheDocument()
      const confirmBtn = screen.getByRole('button', { name: 'Remove reason' })
      fireEvent.click(confirmBtn)

      await waitFor(() => {
        expect(mockRemoveReason).toHaveBeenCalledWith({ id: 'reason-1' })
      })

      // Even though the removed row's Remove button is still connected (mutation mocked, list not refetched)
      expect(firstRowRemoveBtn).toBeInTheDocument()
      await waitFor(() => {
        expect(document.activeElement).not.toBe(firstRowRemoveBtn)
        expect(document.activeElement).toBe(addButton)
      })
    })

    it('returns focus to that same row Remove button after Cancel on remove dialog (picking a row that is not the first)', async () => {
      renderCard()

      const rows = screen.getAllByTestId('removal-reason-row')
      expect(rows.length).toBeGreaterThanOrEqual(2)
      const [firstRow, secondRow] = rows
      if (!firstRow || !secondRow) throw new Error('Expected two rows')
      // Pick row 2 (not the first)
      const secondRowRemoveBtn = within(secondRow).getByRole('button', { name: /Remove/i })
      const firstRowRemoveBtn = within(firstRow).getByRole('button', { name: /Remove/i })

      fireEvent.click(secondRowRemoveBtn)

      expect(screen.getByRole('alertdialog')).toBeInTheDocument()
      const cancelBtn = screen.getByRole('button', { name: 'Cancel' })
      fireEvent.click(cancelBtn)

      await waitFor(() => {
        expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
      })

      await waitFor(() => {
        expect(document.activeElement).toBe(secondRowRemoveBtn)
        expect(document.activeElement).not.toBe(firstRowRemoveBtn)
      })
    })

    it('keeps dialog open with error and does not move focus to Add button on failed removal', async () => {
      mockRemoveReason.mockReturnValue(
        rejected({ message: 'The reason could not be removed. Try again in a moment.' })
      )

      renderCard()

      const addButton = screen.getByRole('button', { name: 'Add reason' })
      const [firstRow] = screen.getAllByTestId('removal-reason-row')
      if (!firstRow) throw new Error('Expected firstRow')
      const removeBtn = within(firstRow).getByRole('button', { name: /Remove/i })

      fireEvent.click(removeBtn)

      const confirmBtn = screen.getByRole('button', { name: 'Remove reason' })
      fireEvent.click(confirmBtn)

      expect(
        await screen.findByText('The reason could not be removed. Try again in a moment.')
      ).toBeInTheDocument()
      expect(screen.getByRole('alertdialog')).toBeInTheDocument()
      expect(document.activeElement).not.toBe(addButton)
    })
  })

  describe('returnTripPayPercent number field', () => {
    it('renders returnTripPayPercent box bound to form with min 0 max 100, and typing calls set', () => {
      renderCard()

      const input = document.getElementById('returnTripPayPercent') as HTMLInputElement
      expect(input).toBeInTheDocument()
      expect(input.value).toBe('100')
      expect(input.getAttribute('min')).toBe('0')
      expect(input.getAttribute('max')).toBe('100')
      expect(input.disabled).toBe(false)

      fireEvent.change(input, { target: { value: '80' } })
      expect(mockSet).toHaveBeenCalledWith('returnTripPayPercent', '80')
    })

    it('disables returnTripPayPercent box when loaded is false', () => {
      renderCard({ loaded: false })

      const input = document.getElementById('returnTripPayPercent') as HTMLInputElement
      expect(input.disabled).toBe(true)
    })
  })
})
