import React from 'react'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { CourierAccountCard, accountChangeText, REASON_MAX } from './CourierAccountCard'
import type { CourierAccountChangeAdminDto, CourierAdminDto } from '@/backend-admin-sdk'

// Spec 0051 (row 108, AC-6): the Account card on a rider's page. Written from the spec's acceptance
// criteria and its cross check: the login email and emergency contact, Deactivate or Reactivate with a
// confirm that names the effects, the edit of every detail, and the account history, newest first.

const mockUseGetCourierAccountQuery = jest.fn()
const mockUseGetCourierAccountChangesQuery = jest.fn()
const mockDeactivate = jest.fn()
const mockReactivate = jest.fn()
const mockEdit = jest.fn()
let mutationLoading = false
jest.mock('../../api/courierAccountApi', () => ({
  useGetCourierAccountQuery: (args: unknown, options: unknown) => mockUseGetCourierAccountQuery(args, options),
  useGetCourierAccountChangesQuery: (args: unknown, options: unknown) =>
    mockUseGetCourierAccountChangesQuery(args, options),
  useDeactivateCourierMutation: () => [mockDeactivate, { isLoading: mutationLoading }],
  useReactivateCourierMutation: () => [mockReactivate, { isLoading: mutationLoading }],
  useEditCourierDetailsMutation: () => [mockEdit, { isLoading: mutationLoading }],
}))

const mockToast = jest.fn()
jest.mock('../../admin-web-components', () => {
  const actual = jest.requireActual('../../admin-web-components')
  return { ...actual, useToast: () => ({ toast: mockToast }) }
})

// What a mutation trigger returns: an object whose unwrap() resolves, or rejects with the backend's error.
const succeeds = () => ({ unwrap: () => Promise.resolve(null) })
const refusesWith = (error: unknown) => ({ unwrap: () => Promise.reject(error) })

const courier = (overrides: Partial<CourierAdminDto> = {}): CourierAdminDto =>
  ({
    id: 'rider-1',
    firstName: 'Nikos',
    lastName: 'Pappas',
    phoneNumber: '+306912345678',
    status: 'OFFLINE',
    deliverySetting: 'MANUAL',
    userId: 'user-1',
    createdAt: new Date('2026-07-15T10:00:00.000Z'),
    deactivatedAt: null,
    ...overrides,
  } as CourierAdminDto)

const account = (overrides: Record<string, unknown> = {}) => ({
  email: 'nikos@coop.gr',
  deactivatedAt: null,
  emergencyContactName: 'Maria Pappa',
  emergencyContactPhone: '+306922222222',
  ...overrides,
})

const change = (overrides: Partial<CourierAccountChangeAdminDto>): CourierAccountChangeAdminDto => ({
  id: 'change-1',
  kind: 'FIELD_EDITED',
  field: null,
  oldValue: null,
  newValue: null,
  reason: null,
  actorIsRider: false,
  actorEmail: 'anna.admin@coop.gr',
  createdAt: '2026-11-21T10:00:00.000Z',
  ...overrides,
})

const withAccount = (data: ReturnType<typeof account> | undefined, isError = false) =>
  mockUseGetCourierAccountQuery.mockReturnValue({ data, isError, isLoading: false })
const withChanges = (data: CourierAccountChangeAdminDto[] | undefined, isError = false) =>
  mockUseGetCourierAccountChangesQuery.mockReturnValue({ data, isError, isLoading: false })

const renderCard = (rider: CourierAdminDto = courier()) =>
  render(<CourierAccountCard courier={rider} name="Nikos Pappas" />)

const reasonBox = () => screen.getByLabelText(/^Reason/) as HTMLInputElement
const type = (input: HTMLElement, value: string) => fireEvent.change(input, { target: { value } })

describe('CourierAccountCard (spec 0051, AC-6)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mutationLoading = false
    withAccount(account())
    withChanges([])
    mockDeactivate.mockReturnValue(succeeds())
    mockReactivate.mockReturnValue(succeeds())
    mockEdit.mockReturnValue(succeeds())
  })

  describe('what the card shows', () => {
    it("asks for this rider's account and account history", () => {
      renderCard(courier({ id: 'rider-42' }))

      expect(mockUseGetCourierAccountQuery.mock.calls[0][0]).toEqual({ id: 'rider-42' })
      expect(mockUseGetCourierAccountChangesQuery.mock.calls[0][0]).toEqual({ id: 'rider-42' })
    })

    it('an active rider: "Active", the login email, the emergency contact, and a Deactivate button', () => {
      const { container } = renderCard()

      expect(screen.getByRole('heading', { name: 'Account' })).toBeInTheDocument()
      expect(container).toHaveTextContent('Active')
      expect(container).not.toHaveTextContent('Deactivated')
      expect(container).toHaveTextContent('Login email')
      expect(container).toHaveTextContent('nikos@coop.gr')
      expect(container).toHaveTextContent('Emergency contact')
      expect(container).toHaveTextContent('Maria Pappa, +306922222222')
      expect(screen.getByRole('button', { name: 'Deactivate' })).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Reactivate' })).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Edit details' })).toBeEnabled()
    })

    it('a deactivated rider: "Deactivated on" a date, and a Reactivate button in place of Deactivate', () => {
      withAccount(account({ deactivatedAt: '2026-11-21T10:00:00.000Z' }))

      const { container } = renderCard(courier({ deactivatedAt: new Date('2026-11-21T10:00:00.000Z') }))

      expect(container).toHaveTextContent(/Deactivated on .*2026/)
      expect(container).not.toHaveTextContent('Active')
      expect(screen.getByRole('button', { name: 'Reactivate' })).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Deactivate' })).not.toBeInTheDocument()
    })

    it('reads the deactivation from the account when the rider record on the page is older', () => {
      withAccount(account({ deactivatedAt: '2026-11-21T10:00:00.000Z' }))

      renderCard(courier({ deactivatedAt: undefined }))

      expect(screen.getByRole('button', { name: 'Reactivate' })).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Deactivate' })).not.toBeInTheDocument()
    })

    it('a deactivated rider whose account has not loaded yet still offers Reactivate, never Deactivate', () => {
      withAccount(undefined)

      const { container } = renderCard(courier({ deactivatedAt: new Date('2026-11-21T10:00:00.000Z') }))

      expect(container).toHaveTextContent('Deactivated')
      expect(screen.getByRole('button', { name: 'Reactivate' })).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Deactivate' })).not.toBeInTheDocument()
    })

    it.each([
      ['a name only', { emergencyContactName: 'Maria Pappa', emergencyContactPhone: null }, 'Maria Pappa'],
      ['a phone only', { emergencyContactName: null, emergencyContactPhone: '+306922222222' }, '+306922222222'],
      ['nothing', { emergencyContactName: null, emergencyContactPhone: null }, 'None given'],
      ['empty strings', { emergencyContactName: '', emergencyContactPhone: '' }, 'None given'],
    ])('an emergency contact with %s reads plainly', (_name, contact, expected) => {
      withAccount(account(contact))

      const { container } = renderCard()

      expect(container).toHaveTextContent(expected)
      expect(container).not.toHaveTextContent('null')
      expect(container).not.toHaveTextContent('undefined')
    })

    it('a rider with no login email shows a dash, not "null"', () => {
      withAccount(account({ email: null }))

      const { container } = renderCard()

      expect(container).toHaveTextContent('Login email')
      expect(container).not.toHaveTextContent('null')
    })

    it('says so in words when the account cannot be loaded, and Edit details stays off', () => {
      withAccount(undefined, true)

      renderCard()

      expect(screen.getByText('Could not load the account.')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Edit details' })).toBeDisabled()
    })
  })

  describe('Deactivate (AC-1, AC-6, cross check 1)', () => {
    const open = () => {
      renderCard()
      fireEvent.click(screen.getByRole('button', { name: 'Deactivate' }))
      return screen.getByRole('dialog')
    }
    const confirm = (dialog: HTMLElement) => within(dialog).getByRole('button', { name: 'Deactivate' })

    it('the confirm names the rider and every effect of deactivating', () => {
      const dialog = open()

      expect(within(dialog).getByRole('heading', { name: 'Deactivate Nikos Pappas' })).toBeInTheDocument()
      // AC-1's effects, in words an admin reads before confirming.
      expect(dialog).toHaveTextContent(/signed out on every phone/i)
      expect(dialog).toHaveTextContent(/set Offline/)
      expect(dialog).toHaveTextContent(/can no longer sign in or get offers/i)
      expect(dialog).toHaveTextContent(/shift bookings that have not ended are dropped/i)
      // AC-2: what stays.
      expect(dialog).toHaveTextContent(/deliveries, pay and records stay/i)
      // When it is refused.
      expect(dialog).toHaveTextContent(/holds a job or has an open SOS cannot be deactivated/i)
      // The reason is shown to the rider, so the admin is told.
      expect(dialog).toHaveTextContent(/The rider sees it in their account history/i)
    })

    it('needs a reason: the confirm is off while the reason is empty or only spaces, and nothing is sent', () => {
      const dialog = open()

      expect(reasonBox()).toHaveValue('')
      expect(confirm(dialog)).toBeDisabled()

      type(reasonBox(), '     ')
      expect(confirm(dialog)).toBeDisabled()

      fireEvent.submit(reasonBox().closest('form') as HTMLFormElement)
      expect(mockDeactivate).not.toHaveBeenCalled()
    })

    it('the reason is 1 to 300 characters: 1 and 300 pass, 301 does not', () => {
      const dialog = open()

      expect(REASON_MAX).toBe(300)
      expect(reasonBox()).toHaveAttribute('maxLength', '300')

      type(reasonBox(), 'x')
      expect(confirm(dialog)).toBeEnabled()
      type(reasonBox(), 'x'.repeat(300))
      expect(confirm(dialog)).toBeEnabled()
      type(reasonBox(), 'x'.repeat(301))
      expect(confirm(dialog)).toBeDisabled()

      fireEvent.submit(reasonBox().closest('form') as HTMLFormElement)
      expect(mockDeactivate).not.toHaveBeenCalled()
    })

    it('sends the rider and the trimmed reason once, says it is done, and closes', async () => {
      const dialog = open()
      type(reasonBox(), '  Left the co-op in November  ')

      fireEvent.click(confirm(dialog))

      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
      expect(mockDeactivate).toHaveBeenCalledTimes(1)
      expect(mockDeactivate).toHaveBeenCalledWith({ id: 'rider-1', reason: 'Left the co-op in November' })
      expect(mockReactivate).not.toHaveBeenCalled()
      expect(mockToast).toHaveBeenCalledWith({ title: "Nikos Pappas's account is deactivated." })
    })

    it.each([
      'This rider holds a job. Move it first.',
      'This rider has an open SOS. Close it first.',
      'This login is also an admin. Take the admin role away first.',
      "This rider's account is already deactivated.",
    ])('a refusal is shown in the server\'s own words ("%s"), and the dialog stays open', async (sentence) => {
      mockDeactivate.mockReturnValue(refusesWith({ status: 409, message: sentence }))
      const dialog = open()
      type(reasonBox(), 'Left the co-op')

      fireEvent.click(confirm(dialog))

      expect(await screen.findByRole('alert')).toHaveTextContent(sentence)
      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(mockToast).not.toHaveBeenCalled()
      // The reason typed is still there to send again.
      expect(reasonBox()).toHaveValue('Left the co-op')
    })

    it('a failure with no sentence from the server still says something in words', async () => {
      mockDeactivate.mockReturnValue(refusesWith({ status: 500 }))
      const dialog = open()
      type(reasonBox(), 'Left the co-op')

      fireEvent.click(confirm(dialog))

      expect(await screen.findByRole('alert')).toHaveTextContent('This could not be saved. Please try again.')
    })

    it('Cancel sends nothing and closes; opening again starts with an empty reason and no old error', async () => {
      mockDeactivate.mockReturnValue(refusesWith({ message: 'This rider holds a job. Move it first.' }))
      const dialog = open()
      type(reasonBox(), 'Left the co-op')
      fireEvent.click(confirm(dialog))
      await screen.findByRole('alert')

      fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
      expect(mockDeactivate).toHaveBeenCalledTimes(1)

      fireEvent.click(screen.getByRole('button', { name: 'Deactivate' }))
      expect(reasonBox()).toHaveValue('')
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })

    it('while it is being sent, the confirm is off, so it cannot be sent twice', () => {
      mutationLoading = true
      const dialog = open()
      type(reasonBox(), 'Left the co-op')

      // The button shows a spinner beside its word while the request runs.
      expect(within(dialog).getByRole('button', { name: /Deactivate/ })).toBeDisabled()
      fireEvent.submit(reasonBox().closest('form') as HTMLFormElement)
      expect(mockDeactivate).not.toHaveBeenCalled()
    })
  })

  describe('Reactivate (AC-3, AC-6, cross check 9)', () => {
    const open = () => {
      withAccount(account({ deactivatedAt: '2026-11-21T10:00:00.000Z' }))
      renderCard(courier({ deactivatedAt: new Date('2026-11-21T10:00:00.000Z') }))
      fireEvent.click(screen.getByRole('button', { name: 'Reactivate' }))
      return screen.getByRole('dialog')
    }
    const confirm = (dialog: HTMLElement) => within(dialog).getByRole('button', { name: 'Reactivate' })

    it('the confirm names the rider and says what happens: same login and history, Offline, password cleared', () => {
      const dialog = open()

      expect(within(dialog).getByRole('heading', { name: 'Reactivate Nikos Pappas' })).toBeInTheDocument()
      expect(dialog).toHaveTextContent(/keep their login and history/i)
      expect(dialog).toHaveTextContent(/Offline/)
      expect(dialog).toHaveTextContent(/password is cleared/i)
      expect(dialog).toHaveTextContent(/Forgot password/)
    })

    it('the reason is optional: the confirm is on at once, and no reason is sent as none', async () => {
      const dialog = open()

      expect(within(dialog).getByLabelText('Reason (optional)')).toHaveValue('')
      expect(confirm(dialog)).toBeEnabled()
      fireEvent.click(confirm(dialog))

      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
      expect(mockReactivate).toHaveBeenCalledTimes(1)
      expect(mockReactivate).toHaveBeenCalledWith({ id: 'rider-1', reason: undefined })
      expect(mockDeactivate).not.toHaveBeenCalled()
      expect(mockToast).toHaveBeenCalledWith({ title: "Nikos Pappas's account is active again." })
    })

    it('a reason, when given, is sent trimmed', async () => {
      const dialog = open()
      type(reasonBox(), '  Came back for the winter ')

      fireEvent.click(confirm(dialog))

      await waitFor(() => expect(mockReactivate).toHaveBeenCalledTimes(1))
      expect(mockReactivate).toHaveBeenCalledWith({ id: 'rider-1', reason: 'Came back for the winter' })
    })

    it("a refusal is shown in the server's own words, and the dialog stays open", async () => {
      mockReactivate.mockReturnValue(refusesWith({ status: 409, message: "This rider's account is not deactivated." }))
      const dialog = open()

      fireEvent.click(confirm(dialog))

      expect(await screen.findByRole('alert')).toHaveTextContent("This rider's account is not deactivated.")
      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(mockToast).not.toHaveBeenCalled()
    })
  })

  describe('Edit details (AC-4, AC-6, cross check 11)', () => {
    const open = () => {
      renderCard()
      fireEvent.click(screen.getByRole('button', { name: 'Edit details' }))
      return screen.getByRole('dialog')
    }
    const box = (label: string) => screen.getByLabelText(label) as HTMLInputElement
    const save = (dialog: HTMLElement) => within(dialog).getByRole('button', { name: 'Save' })

    it('opens filled with the stored names, phone, login email and emergency contact', () => {
      const dialog = open()

      expect(within(dialog).getByRole('heading', { name: 'Edit details' })).toBeInTheDocument()
      expect(box('First name')).toHaveValue('Nikos')
      expect(box('Last name')).toHaveValue('Pappas')
      expect(box('Phone')).toHaveValue('+306912345678')
      expect(box('Login email')).toHaveValue('nikos@coop.gr')
      expect(box('Emergency contact name')).toHaveValue('Maria Pappa')
      expect(box('Emergency contact phone')).toHaveValue('+306922222222')
      // The admin is told the rider will see the change.
      expect(dialog).toHaveTextContent(/Every change is recorded, and the rider sees it/i)
    })

    it('sends only the listed fields: the two names, phone, login email and emergency contact', async () => {
      const dialog = open()
      type(box('First name'), 'Nikolaos')
      type(box('Phone'), '+306911111111')
      type(box('Emergency contact name'), 'Eleni Pappa')

      fireEvent.click(save(dialog))

      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
      expect(mockEdit).toHaveBeenCalledTimes(1)
      const sent = mockEdit.mock.calls[0][0]
      expect(sent).toEqual({
        id: 'rider-1',
        input: {
          firstName: 'Nikolaos',
          lastName: 'Pappas',
          phoneNumber: '+306911111111',
          email: 'nikos@coop.gr',
          emergencyContactName: 'Eleni Pappa',
          emergencyContactPhone: '+306922222222',
        },
      })
      // Nothing else rides along: no status, no offers setting, no deactivation, no Stripe or node fields.
      expect(Object.keys(sent.input).sort()).toEqual(
        ['email', 'emergencyContactName', 'emergencyContactPhone', 'firstName', 'lastName', 'phoneNumber'].sort()
      )
      expect(mockToast).toHaveBeenCalledWith({ title: 'Details saved.' })
    })

    it('warns that a new login email signs the rider out and that the old address is told, only once the email differs', () => {
      const dialog = open()

      expect(within(dialog).queryByRole('note')).not.toBeInTheDocument()

      type(box('Login email'), 'nikos.new@coop.gr')
      const note = within(dialog).getByRole('note')
      expect(note).toHaveTextContent(/signs the rider out on every phone/i)
      expect(note).toHaveTextContent(/old address is told/i)

      type(box('Login email'), 'nikos@coop.gr')
      expect(within(dialog).queryByRole('note')).not.toBeInTheDocument()
    })

    it('the same email in other capitals or with spaces around it is not a change: no warning', () => {
      const dialog = open()

      type(box('Login email'), '  NIKOS@Coop.GR ')

      expect(within(dialog).queryByRole('note')).not.toBeInTheDocument()
    })

    it('a changed email is sent with the rest', async () => {
      const dialog = open()
      type(box('Login email'), 'nikos.new@coop.gr')

      fireEvent.click(save(dialog))

      await waitFor(() => expect(mockEdit).toHaveBeenCalledTimes(1))
      expect(mockEdit.mock.calls[0][0].input.email).toBe('nikos.new@coop.gr')
    })

    it.each([
      'That email is already used by another account.',
      'That phone is already used by another rider.',
    ])('a refusal is shown in the server\'s own words ("%s"), the dialog stays open and keeps what was typed', async (sentence) => {
      mockEdit.mockReturnValue(refusesWith({ status: 409, message: sentence }))
      const dialog = open()
      type(box('Login email'), 'taken@coop.gr')

      fireEvent.click(save(dialog))

      expect(await screen.findByRole('alert')).toHaveTextContent(sentence)
      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(box('Login email')).toHaveValue('taken@coop.gr')
      expect(mockToast).not.toHaveBeenCalled()
    })

    it("the backend's validation list (a 400) is shown in words too", async () => {
      mockEdit.mockReturnValue(refusesWith({ status: 400, message: ['email must be an email'] }))
      const dialog = open()
      type(box('Login email'), 'not-an-email')

      fireEvent.click(save(dialog))

      expect(await screen.findByRole('alert')).toHaveTextContent('email must be an email')
    })

    it('a failure with no sentence from the server still says something in words', async () => {
      mockEdit.mockReturnValue(refusesWith(undefined))
      const dialog = open()

      fireEvent.click(save(dialog))

      expect(await screen.findByRole('alert')).toHaveTextContent('The details could not be saved. Please try again.')
    })

    it.each(['First name', 'Last name', 'Login email'])('Save is off while "%s" is empty, and nothing is sent', (label) => {
      const dialog = open()

      type(box(label), '   ')

      expect(save(dialog)).toBeDisabled()
      fireEvent.submit(box(label).closest('form') as HTMLFormElement)
      expect(mockEdit).not.toHaveBeenCalled()
    })

    it('Cancel sends nothing', async () => {
      const dialog = open()
      type(box('First name'), 'Nikolaos')

      fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))

      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
      expect(mockEdit).not.toHaveBeenCalled()
    })

    it('a rider with no phone, email or emergency contact opens with empty boxes, not "null"', () => {
      withAccount(account({ email: null, emergencyContactName: null, emergencyContactPhone: null }))
      renderCard(courier({ phoneNumber: null as unknown as string }))
      fireEvent.click(screen.getByRole('button', { name: 'Edit details' }))

      expect(box('Phone')).toHaveValue('')
      expect(box('Login email')).toHaveValue('')
      expect(box('Emergency contact name')).toHaveValue('')
      expect(box('Emergency contact phone')).toHaveValue('')
    })
  })

  describe('Account history (AC-5, AC-6)', () => {
    it('says "No changes yet." for a rider with none', () => {
      renderCard()

      expect(screen.getByRole('heading', { name: 'Account history' })).toBeInTheDocument()
      expect(screen.getByText('No changes yet.')).toBeInTheDocument()
    })

    it('says so in words when the history cannot be loaded', () => {
      withChanges(undefined, true)

      renderCard()

      expect(screen.getByText('Could not load the account history.')).toBeInTheDocument()
      expect(screen.queryByText('No changes yet.')).not.toBeInTheDocument()
    })

    it('lists each change in the order given (newest first), with what changed and who did it', () => {
      withChanges([
        change({ id: 'c5', kind: 'REACTIVATED', reason: 'Came back', actorEmail: 'babis.admin@coop.gr' }),
        change({ id: 'c4', kind: 'DEACTIVATED', reason: 'Left the co-op' }),
        change({ id: 'c3', kind: 'PASSWORD_CHANGED', actorIsRider: true, actorEmail: null }),
        change({ id: 'c2', kind: 'FIELD_EDITED', field: 'phoneNumber', oldValue: '+306900000000', newValue: '+306912345678' }),
        change({ id: 'c1', kind: 'PASSWORD_CHANGED', actorEmail: null }),
      ])

      renderCard()

      const lines = screen.getAllByRole('listitem')
      expect(lines).toHaveLength(5)
      expect(lines[0]).toHaveTextContent('Reactivated: Came back by babis.admin@coop.gr')
      expect(lines[1]).toHaveTextContent('Deactivated: Left the co-op by anna.admin@coop.gr')
      expect(lines[2]).toHaveTextContent('Password changed by the rider')
      expect(lines[3]).toHaveTextContent('Phone: +306900000000 → +306912345678 by anna.admin@coop.gr')
      // An admin whose login is gone is still "an admin", never blank and never the rider.
      expect(lines[4]).toHaveTextContent('Password changed by an admin')
      // Each line says when.
      for (const line of lines) expect(line).toHaveTextContent(/2026/)
    })

    it("the rider's own action never reads as an admin's, even if an email came with it", () => {
      withChanges([change({ kind: 'PASSWORD_CHANGED', actorIsRider: true, actorEmail: 'someone@coop.gr' })])

      renderCard()

      const line = screen.getByRole('listitem')
      expect(line).toHaveTextContent('by the rider')
      expect(line).not.toHaveTextContent('someone@coop.gr')
    })

    it('shows no count or ranking of changes or deactivations (value 5, cross check 15)', () => {
      withChanges([
        change({ id: 'c3', kind: 'DEACTIVATED', reason: 'Left' }),
        change({ id: 'c2', kind: 'REACTIVATED' }),
        change({ id: 'c1', kind: 'DEACTIVATED', reason: 'Away' }),
      ])

      const { container } = renderCard()

      const text = container.textContent ?? ''
      expect(text).not.toMatch(/\b\d+\s+(changes?|deactivations?|times?)\b/i)
      expect(text).not.toMatch(/deactivated\s+\d+\s*(x|times)/i)
      expect(text).not.toMatch(/total/i)
    })
  })

  describe('accountChangeText: one history line in words', () => {
    it.each([
      [{ kind: 'DEACTIVATED', reason: 'Left the co-op' }, 'Deactivated: Left the co-op'],
      [{ kind: 'DEACTIVATED', reason: null }, 'Deactivated'],
      [{ kind: 'REACTIVATED', reason: 'Came back' }, 'Reactivated: Came back'],
      [{ kind: 'REACTIVATED', reason: null }, 'Reactivated'],
      [{ kind: 'PASSWORD_CHANGED' }, 'Password changed'],
      [{ kind: 'FIELD_EDITED', field: 'firstName', oldValue: 'Nikos', newValue: 'Nikolaos' }, 'First name: Nikos → Nikolaos'],
      [{ kind: 'FIELD_EDITED', field: 'lastName', oldValue: 'Pappas', newValue: 'Pappa' }, 'Last name: Pappas → Pappa'],
      [{ kind: 'FIELD_EDITED', field: 'phoneNumber', oldValue: null, newValue: '+306912345678' }, 'Phone: empty → +306912345678'],
      [
        { kind: 'FIELD_EDITED', field: 'email', oldValue: 'old@coop.gr', newValue: 'new@coop.gr' },
        'Login email: old@coop.gr → new@coop.gr',
      ],
      [
        { kind: 'FIELD_EDITED', field: 'emergencyContactName', oldValue: 'Maria', newValue: null },
        'Emergency contact name: Maria → empty',
      ],
      [
        { kind: 'FIELD_EDITED', field: 'emergencyContactPhone', oldValue: null, newValue: '+306922222222' },
        'Emergency contact phone: empty → +306922222222',
      ],
      [{ kind: 'FIELD_EDITED', field: 'deliverySetting', oldValue: 'MANUAL', newValue: 'AUTO_ACCEPT' }, 'Offers: MANUAL → AUTO_ACCEPT'],
    ] as Array<[Partial<CourierAccountChangeAdminDto>, string]>)('%j reads "%s"', (overrides, expected) => {
      expect(accountChangeText(change(overrides))).toBe(expected)
    })

    it('a field this page has no words for is shown as sent, and a kind it does not know as its name', () => {
      expect(accountChangeText(change({ kind: 'FIELD_EDITED', field: 'vehiclePlate', oldValue: 'A', newValue: 'B' }))).toBe(
        'vehiclePlate: A → B'
      )
      expect(accountChangeText(change({ kind: 'SOMETHING_NEW' }))).toBe('SOMETHING_NEW')
    })

    it('a password change never shows a value', () => {
      expect(accountChangeText(change({ kind: 'PASSWORD_CHANGED', oldValue: 'leaked-old', newValue: 'leaked-new' }))).toBe(
        'Password changed'
      )
    })
  })
})
