import React from 'react'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import type { ShiftSlotAdminDto } from '@/backend-admin-sdk'
import { ShiftSlotsPage } from './ShiftSlotsPage'

const mockUseGetShiftSlotsQuery = jest.fn()
const mockUseGetShiftSlotChangesQuery = jest.fn()
const mockCreateSlot = jest.fn()
const mockUpdateSlot = jest.fn()
const mockRemoveSlot = jest.fn()
const mockUseGetInstanceConfigQuery = jest.fn()

jest.mock('../../api/shiftSlotApi', () => ({
  useGetShiftSlotsQuery: (arg: unknown) => mockUseGetShiftSlotsQuery(arg),
  useGetShiftSlotChangesQuery: (arg: unknown) => mockUseGetShiftSlotChangesQuery(arg),
  useCreateShiftSlotMutation: () => [mockCreateSlot, { isLoading: false }],
  useUpdateShiftSlotMutation: () => [mockUpdateSlot, { isLoading: false }],
  useRemoveShiftSlotMutation: () => [mockRemoveSlot, { isLoading: false }],
}))

jest.mock('../../api/configApi', () => ({
  useGetInstanceConfigQuery: (arg: unknown) => mockUseGetInstanceConfigQuery(arg),
}))

const OFF_NOTICE = 'Shifts are off. Riders see none of this until you switch them on in Settings.'

const slot = (overrides: Partial<ShiftSlotAdminDto>): ShiftSlotAdminDto => ({
  id: 'slot',
  weekday: 5,
  startMinute: 1140,
  endMinute: 1380,
  riderCap: 6,
  createdAt: '2026-11-01T10:00:00.000Z',
  updatedAt: '2026-11-01T10:00:00.000Z',
  removedAt: null,
  ...overrides,
})

// As the backend sends them: by weekday, then start.
const currentSlots: ShiftSlotAdminDto[] = [
  slot({ id: 'mon-am', weekday: 1, startMinute: 420, endMinute: 660, riderCap: 1 }),
  slot({ id: 'fri-eve', weekday: 5, startMinute: 1140, endMinute: 1380, riderCap: 6 }),
  slot({ id: 'fri-late', weekday: 5, startMinute: 1320, endMinute: 1440, riderCap: 2 }),
  slot({ id: 'sun-noon', weekday: 7, startMinute: 720, endMinute: 900, riderCap: 3 }),
]

const removedSlot = slot({ id: 'tue-old', weekday: 2, startMinute: 600, endMinute: 720, riderCap: 4, removedAt: '2026-11-02T10:00:00.000Z' })

function slotsResult(data: ShiftSlotAdminDto[] | undefined, extra: Record<string, unknown> = {}) {
  return { data, isLoading: false, isError: false, ...extra }
}

// Spec 0026 (row 77, AC-6): the Shift slots page.
describe('ShiftSlotsPage (spec 0026, AC-6)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseGetShiftSlotsQuery.mockImplementation(({ includeRemoved }: { includeRemoved: boolean }) =>
      slotsResult(includeRemoved ? [...currentSlots.slice(0, 1), removedSlot, ...currentSlots.slice(1)] : currentSlots)
    )
    mockUseGetShiftSlotChangesQuery.mockReturnValue({ data: [], isLoading: false, isError: false })
    mockUseGetInstanceConfigQuery.mockReturnValue({ data: { shiftsEnabled: true } })
  })

  const dayCards = () => screen.getAllByRole('list').map((list) => list.parentElement?.parentElement as HTMLElement)
  const dayTitles = () =>
    dayCards().map((card) => within(card).getByText(/day$/).textContent)

  it('has one h1, "Shift slots", and an Add slot button', () => {
    render(<ShiftSlotsPage />)
    const headings = screen.getAllByRole('heading', { level: 1 })
    expect(headings).toHaveLength(1)
    expect(headings[0]).toHaveTextContent('Shift slots')
    expect(screen.getByRole('button', { name: 'Add slot' })).toBeInTheDocument()
  })

  describe('the list', () => {
    it('asks for the current slots only, by default', () => {
      render(<ShiftSlotsPage />)
      expect(mockUseGetShiftSlotsQuery).toHaveBeenCalledWith({ includeRemoved: false })
      expect(mockUseGetShiftSlotsQuery).not.toHaveBeenCalledWith({ includeRemoved: true })
    })

    it('groups the slots by weekday, Monday first, showing only days that have slots', () => {
      // Given out of day order, the page still groups Monday first.
      mockUseGetShiftSlotsQuery.mockReturnValue(
        slotsResult([3, 1, 0, 2].map((index) => currentSlots[index] as ShiftSlotAdminDto))
      )
      render(<ShiftSlotsPage />)
      expect(dayTitles()).toEqual(['Monday', 'Friday', 'Sunday'])
      expect(screen.queryByText('Tuesday')).toBeNull()
    })

    it('shows each slot with its times on the 24 hour clock and its cap', () => {
      render(<ShiftSlotsPage />)
      const [monday, friday, sunday] = dayCards() as [HTMLElement, HTMLElement, HTMLElement]
      const mondayRows = within(monday).getAllByRole('listitem')
      expect(mondayRows).toHaveLength(1)
      expect(mondayRows[0]).toHaveTextContent('07:00 to 11:00 · 1 rider')

      const fridayRows = within(friday).getAllByRole('listitem')
      expect(fridayRows).toHaveLength(2)
      expect(fridayRows[0]).toHaveTextContent('19:00 to 23:00 · 6 riders')
      expect(fridayRows[1]).toHaveTextContent('22:00 to 24:00 · 2 riders')

      expect(within(sunday).getAllByRole('listitem')[0]).toHaveTextContent('12:00 to 15:00 · 3 riders')
    })

    it('gives each current slot Edit, Remove and History, named by day and start', () => {
      render(<ShiftSlotsPage />)
      expect(screen.getByRole('button', { name: 'Edit Friday 19:00' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Remove Friday 19:00' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'History of Friday 19:00' })).toBeInTheDocument()
    })

    it('says so when there are no slots', () => {
      mockUseGetShiftSlotsQuery.mockReturnValue(slotsResult([]))
      render(<ShiftSlotsPage />)
      expect(screen.getByText('No shift slots yet.')).toBeInTheDocument()
      expect(screen.queryByRole('list')).toBeNull()
    })

    it('says it is loading', () => {
      mockUseGetShiftSlotsQuery.mockReturnValue({ data: undefined, isLoading: true, isError: false })
      render(<ShiftSlotsPage />)
      expect(screen.getByText('Loading…')).toBeInTheDocument()
      expect(screen.queryByText('No shift slots yet.')).toBeNull()
    })

    it('says so in words when the slots cannot load, never "No shift slots yet."', () => {
      mockUseGetShiftSlotsQuery.mockReturnValue({ data: undefined, isLoading: false, isError: true })
      render(<ShiftSlotsPage />)
      expect(screen.getByText('Could not load the shift slots.')).toBeInTheDocument()
      expect(screen.queryByText('No shift slots yet.')).toBeNull()
    })
  })

  describe('the Shifts off notice', () => {
    it('shows on top when the config says Shifts are off, and the page still lets the admin prepare slots', () => {
      mockUseGetInstanceConfigQuery.mockReturnValue({ data: { shiftsEnabled: false } })
      render(<ShiftSlotsPage />)
      expect(screen.getByText(OFF_NOTICE)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Add slot' })).not.toBeDisabled()
      expect(screen.getByRole('button', { name: 'Edit Friday 19:00' })).not.toBeDisabled()
    })

    it('treats a missing switch in a loaded config as off', () => {
      mockUseGetInstanceConfigQuery.mockReturnValue({ data: {} })
      render(<ShiftSlotsPage />)
      expect(screen.getByText(OFF_NOTICE)).toBeInTheDocument()
    })

    it('does not show when Shifts are on', () => {
      mockUseGetInstanceConfigQuery.mockReturnValue({ data: { shiftsEnabled: true } })
      render(<ShiftSlotsPage />)
      expect(screen.queryByText(OFF_NOTICE)).toBeNull()
    })

    it('does not show before the config has loaded', () => {
      mockUseGetInstanceConfigQuery.mockReturnValue({ data: undefined })
      render(<ShiftSlotsPage />)
      expect(screen.queryByText(OFF_NOTICE)).toBeNull()
    })
  })

  describe('Show removed slots', () => {
    it('asks with includeRemoved: true once switched on, and back to false when off', () => {
      render(<ShiftSlotsPage />)
      const toggle = screen.getByLabelText('Show removed slots')
      expect(toggle).toHaveAttribute('aria-checked', 'false')

      fireEvent.click(toggle)
      expect(mockUseGetShiftSlotsQuery).toHaveBeenLastCalledWith({ includeRemoved: true })
      expect(toggle).toHaveAttribute('aria-checked', 'true')

      fireEvent.click(toggle)
      expect(mockUseGetShiftSlotsQuery).toHaveBeenLastCalledWith({ includeRemoved: false })
    })

    it('shows a removed slot struck through and marked removed, with only History', () => {
      render(<ShiftSlotsPage />)
      fireEvent.click(screen.getByLabelText('Show removed slots'))

      const tuesday = dayCards().find((card) => within(card).queryByText('Tuesday')) as HTMLElement
      expect(tuesday).toBeDefined()
      const row = within(tuesday).getByRole('listitem')
      expect(row).toHaveTextContent('10:00 to 12:00 · 4 riders · removed')
      expect(row.querySelector('.line-through')).not.toBeNull()

      const buttons = within(row).getAllByRole('button')
      expect(buttons).toHaveLength(1)
      expect(buttons[0]).toHaveAccessibleName('History of Tuesday 10:00')
      expect(within(row).queryByRole('button', { name: /^Edit/ })).toBeNull()
      expect(within(row).queryByRole('button', { name: /^Remove/ })).toBeNull()

      // Current slots keep their Edit and are not struck through.
      const fridayRow = screen.getByRole('button', { name: 'Edit Friday 19:00' }).closest('li') as HTMLElement
      expect(fridayRow.querySelector('.line-through')).toBeNull()
    })

    it('a removed slot History opens its record', () => {
      render(<ShiftSlotsPage />)
      fireEvent.click(screen.getByLabelText('Show removed slots'))
      fireEvent.click(screen.getByRole('button', { name: 'History of Tuesday 10:00' }))
      expect(screen.getByRole('heading', { name: 'Slot history' })).toBeInTheDocument()
      expect(mockUseGetShiftSlotChangesQuery).toHaveBeenCalledWith({ id: 'tue-old' })
    })
  })

  describe('the dialogs', () => {
    it('Add slot opens the dialog in Add mode, empty', () => {
      render(<ShiftSlotsPage />)
      fireEvent.click(screen.getByRole('button', { name: 'Add slot' }))
      const dialog = screen.getByRole('dialog')
      expect(within(dialog).getByRole('heading', { name: 'Add slot' })).toBeInTheDocument()
      expect((document.getElementById('shift-slot-start') as HTMLInputElement).value).toBe('')
    })

    it('Edit opens the same dialog in Edit mode, filled with that slot', () => {
      render(<ShiftSlotsPage />)
      fireEvent.click(screen.getByRole('button', { name: 'Edit Friday 22:00' }))
      const dialog = screen.getByRole('dialog')
      expect(within(dialog).getByRole('heading', { name: 'Edit slot' })).toBeInTheDocument()
      expect((within(dialog).getByLabelText('Day') as HTMLSelectElement).value).toBe('5')
      expect((document.getElementById('shift-slot-start') as HTMLInputElement).value).toBe('22:00')
      expect((document.getElementById('shift-slot-end') as HTMLInputElement).value).toBe('24:00')
      expect((document.getElementById('shift-slot-cap') as HTMLInputElement).value).toBe('2')
    })

    it('Add after an Edit is back in Add mode and empty', async () => {
      render(<ShiftSlotsPage />)
      fireEvent.click(screen.getByRole('button', { name: 'Edit Friday 19:00' }))
      fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' }))
      await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())

      fireEvent.click(screen.getByRole('button', { name: 'Add slot' }))
      expect(within(screen.getByRole('dialog')).getByRole('heading', { name: 'Add slot' })).toBeInTheDocument()
      expect((document.getElementById('shift-slot-cap') as HTMLInputElement).value).toBe('')
    })

    it('Edit saves the update for that slot id', async () => {
      mockUpdateSlot.mockReturnValue({ unwrap: () => Promise.resolve({}) })
      render(<ShiftSlotsPage />)
      fireEvent.click(screen.getByRole('button', { name: 'Edit Monday 07:00' }))
      fireEvent.change(document.getElementById('shift-slot-cap') as HTMLInputElement, { target: { value: '5' } })
      fireEvent.click(screen.getByRole('button', { name: 'Save slot' }))
      await waitFor(() =>
        expect(mockUpdateSlot).toHaveBeenCalledWith({
          id: 'mon-am',
          input: { weekday: 1, startMinute: 420, endMinute: 660, riderCap: 5 },
        })
      )
    })

    it('Remove asks first, for that slot', async () => {
      mockRemoveSlot.mockReturnValue({ unwrap: () => Promise.resolve({}) })
      render(<ShiftSlotsPage />)
      fireEvent.click(screen.getByRole('button', { name: 'Remove Sunday 12:00' }))
      const ask = screen.getByRole('alertdialog')
      expect(ask).toHaveTextContent('Sunday 12:00 to 15:00, 3 riders')
      expect(mockRemoveSlot).not.toHaveBeenCalled()

      fireEvent.click(within(ask).getByRole('button', { name: 'Remove' }))
      await waitFor(() => expect(mockRemoveSlot).toHaveBeenCalledWith({ id: 'sun-noon' }))
    })

    it('History opens the record of that slot', () => {
      render(<ShiftSlotsPage />)
      fireEvent.click(screen.getByRole('button', { name: 'History of Friday 19:00' }))
      expect(screen.getByRole('heading', { name: 'Slot history' })).toBeInTheDocument()
      expect(mockUseGetShiftSlotChangesQuery).toHaveBeenCalledWith({ id: 'fri-eve' })
    })
  })

  describe('focus returns to the button that opened a dialog', () => {
    it('to Add slot after the Add dialog closes', async () => {
      render(<ShiftSlotsPage />)
      const add = screen.getByRole('button', { name: 'Add slot' })
      fireEvent.click(add)
      fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' }))
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).toBeNull()
        expect(document.activeElement).toBe(add)
      })
    })

    it('to that row Edit after the Edit dialog closes', async () => {
      render(<ShiftSlotsPage />)
      const edit = screen.getByRole('button', { name: 'Edit Friday 22:00' })
      fireEvent.click(edit)
      fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' }))
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).toBeNull()
        expect(document.activeElement).toBe(edit)
      })
    })

    it('to that row Remove after the Remove question closes', async () => {
      render(<ShiftSlotsPage />)
      const remove = screen.getByRole('button', { name: 'Remove Monday 07:00' })
      fireEvent.click(remove)
      fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Cancel' }))
      await waitFor(() => {
        expect(screen.queryByRole('alertdialog')).toBeNull()
        expect(document.activeElement).toBe(remove)
      })
    })
  })

  describe('closing the Edit dialog', () => {
    // JSDOM runs no animation, so Radix would unmount at once and any title would pass; report an exit
    // animation so the dialog stays mounted while it closes, as in a browser.
    let animationName = 'enter'
    let computedStyleSpy: jest.SpyInstance
    beforeEach(() => {
      animationName = 'enter'
      const original = window.getComputedStyle.bind(window)
      computedStyleSpy = jest.spyOn(window, 'getComputedStyle').mockImplementation((element: Element) => {
        const real = original(element)
        return new Proxy(real, {
          get(target, property) {
            if (property === 'animationName') return animationName
            if (property === 'display') return 'block'
            const value = Reflect.get(target, property)
            return typeof value === 'function' ? value.bind(target) : value
          },
        })
      })
    })
    afterEach(() => computedStyleSpy.mockRestore())

    it('keeps the "Edit slot" title while it animates closed', () => {
      render(<ShiftSlotsPage />)
      fireEvent.click(screen.getByRole('button', { name: 'Edit Friday 19:00' }))
      expect(screen.getByRole('heading', { name: 'Edit slot' })).toBeInTheDocument()

      animationName = 'exit'
      fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' }))

      const closing = screen.getByRole('dialog', { hidden: true })
      expect(closing).toHaveAttribute('data-state', 'closed')
      expect(within(closing).getByRole('heading', { name: 'Edit slot', hidden: true })).toBeInTheDocument()
    })
  })
})
