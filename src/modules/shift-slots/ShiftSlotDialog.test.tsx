import React from 'react'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import type { ShiftSlotAdminDto } from '@/backend-admin-sdk'
import { ShiftSlotDialog } from './ShiftSlotDialog'

const mockCreateSlot = jest.fn()
const mockUpdateSlot = jest.fn()
const mockUseCreate = jest.fn()
const mockUseUpdate = jest.fn()

jest.mock('../../api/shiftSlotApi', () => ({
  useCreateShiftSlotMutation: () => mockUseCreate(),
  useUpdateShiftSlotMutation: () => mockUseUpdate(),
}))

const START_SENTENCE = 'Type the start as HH:mm on the 24 hour clock, for example 19:00.'
const END_SENTENCE = 'Type the end as HH:mm on the 24 hour clock, for example 23:00, or 24:00 for midnight.'
const ORDER_SENTENCE = 'The end must be after the start, on the same day. Two slots can cover a late night.'
const CAP_SENTENCE = 'The rider cap must be a whole number from 1 to 50.'

const fridaySlot: ShiftSlotAdminDto = {
  id: 'slot-fri',
  weekday: 5,
  startMinute: 1140,
  endMinute: 1380,
  riderCap: 6,
  createdAt: '2026-11-01T10:00:00.000Z',
  updatedAt: '2026-11-01T10:00:00.000Z',
  removedAt: null,
}

const resolved = (value: unknown = {}) => ({ unwrap: () => Promise.resolve(value) })
const rejected = (error: unknown) => ({ unwrap: () => Promise.reject(error) })

const box = (id: string) => document.getElementById(id) as HTMLInputElement
const type = (id: string, value: string) => fireEvent.change(box(id), { target: { value } })

// Spec 0026 (row 77, AC-6 and the precisions): the one dialog for Add and Edit.
describe('ShiftSlotDialog (spec 0026, AC-6)', () => {
  const onOpenChange = jest.fn()
  const returnFocusTo = { current: document.createElement('button') }

  beforeEach(() => {
    jest.clearAllMocks()
    mockUseCreate.mockReturnValue([mockCreateSlot, { isLoading: false }])
    mockUseUpdate.mockReturnValue([mockUpdateSlot, { isLoading: false }])
    mockCreateSlot.mockReturnValue(resolved(fridaySlot))
    mockUpdateSlot.mockReturnValue(resolved(fridaySlot))
  })

  const renderAdd = () =>
    render(<ShiftSlotDialog open slot={null} onOpenChange={onOpenChange} returnFocusTo={returnFocusTo} />)
  const renderEdit = (slot: ShiftSlotAdminDto = fridaySlot) =>
    render(<ShiftSlotDialog open slot={slot} onOpenChange={onOpenChange} returnFocusTo={returnFocusTo} />)

  describe('fields', () => {
    it('shows Day, Start, End and Rider cap in that order, each label bound to its box', () => {
      renderAdd()
      const dialog = screen.getByRole('dialog')
      const labels = Array.from(dialog.querySelectorAll('label')).map((label) => label.textContent)
      expect(labels).toEqual(['Day', 'Start', 'End', 'Rider cap'])

      expect(within(dialog).getByLabelText('Day').tagName).toBe('SELECT')
      expect(within(dialog).getByLabelText('Start')).toBe(box('shift-slot-start'))
      expect(within(dialog).getByLabelText('End')).toBe(box('shift-slot-end'))
      expect(within(dialog).getByLabelText('Rider cap')).toBe(box('shift-slot-cap'))
    })

    it('offers the seven days Monday first, with ISO values 1 to 7', () => {
      renderAdd()
      const options = Array.from((screen.getByLabelText('Day') as HTMLSelectElement).options)
      expect(options.map((o) => [o.value, o.textContent])).toEqual([
        ['1', 'Monday'],
        ['2', 'Tuesday'],
        ['3', 'Wednesday'],
        ['4', 'Thursday'],
        ['5', 'Friday'],
        ['6', 'Saturday'],
        ['7', 'Sunday'],
      ])
    })

    it('Add is titled "Add slot" and starts empty', () => {
      renderAdd()
      expect(screen.getByRole('heading', { name: 'Add slot' })).toBeInTheDocument()
      expect(box('shift-slot-start').value).toBe('')
      expect(box('shift-slot-end').value).toBe('')
      expect(box('shift-slot-cap').value).toBe('')
      expect(screen.getByRole('button', { name: 'Add slot' })).toBeInTheDocument()
    })
  })

  describe('client refusals (nothing is sent)', () => {
    const fillAndSave = (fields: { day?: string; start?: string; end?: string; cap?: string }) => {
      renderAdd()
      if (fields.day) fireEvent.change(screen.getByLabelText('Day'), { target: { value: fields.day } })
      type('shift-slot-start', fields.start ?? '19:00')
      type('shift-slot-end', fields.end ?? '23:00')
      type('shift-slot-cap', fields.cap ?? '6')
      fireEvent.click(screen.getByRole('button', { name: 'Add slot' }))
    }

    it.each([
      ['an empty start', { start: '' }, START_SENTENCE],
      ['a start of 7:00 (one digit hour)', { start: '7:00' }, START_SENTENCE],
      ['a start of 24:00 (midnight is an end only)', { start: '24:00', end: '24:00' }, START_SENTENCE],
      ['a start of 19:60', { start: '19:60' }, START_SENTENCE],
      ['a start typed as text', { start: 'seven' }, START_SENTENCE],
      ['an empty end', { end: '' }, END_SENTENCE],
      ['an end of 24:01', { end: '24:01' }, END_SENTENCE],
      ['an end of 7:00', { end: '7:00' }, END_SENTENCE],
      ['an end equal to the start', { start: '19:00', end: '19:00' }, ORDER_SENTENCE],
      ['an end before the start (crossing midnight)', { start: '22:00', end: '02:00' }, ORDER_SENTENCE],
      ['an empty cap', { cap: '' }, CAP_SENTENCE],
      ['a cap of 0', { cap: '0' }, CAP_SENTENCE],
      ['a cap of 51', { cap: '51' }, CAP_SENTENCE],
      ['a fractional cap', { cap: '2.5' }, CAP_SENTENCE],
      ['a cap typed as text', { cap: 'six' }, CAP_SENTENCE],
    ])('refuses %s with its sentence', async (_label, fields, sentence) => {
      fillAndSave(fields)
      expect(await screen.findByRole('alert')).toHaveTextContent(sentence)
      expect(mockCreateSlot).not.toHaveBeenCalled()
      expect(mockUpdateSlot).not.toHaveBeenCalled()
      expect(onOpenChange).not.toHaveBeenCalled()
    })
  })

  describe('Add', () => {
    it('sends { weekday, startMinute, endMinute, riderCap } as numbers and closes', async () => {
      renderAdd()
      fireEvent.change(screen.getByLabelText('Day'), { target: { value: '3' } })
      type('shift-slot-start', '19:00')
      type('shift-slot-end', '23:30')
      type('shift-slot-cap', ' 6 ')
      fireEvent.click(screen.getByRole('button', { name: 'Add slot' }))

      await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false))
      expect(mockCreateSlot).toHaveBeenCalledTimes(1)
      expect(mockCreateSlot).toHaveBeenCalledWith({ weekday: 3, startMinute: 1140, endMinute: 1410, riderCap: 6 })
      const sent = mockCreateSlot.mock.calls[0][0]
      for (const key of ['weekday', 'startMinute', 'endMinute', 'riderCap']) {
        expect(typeof sent[key]).toBe('number')
      }
      expect(mockUpdateSlot).not.toHaveBeenCalled()
    })

    it('sends an End of "24:00" as 1440', async () => {
      renderAdd()
      fireEvent.change(screen.getByLabelText('Day'), { target: { value: '7' } })
      type('shift-slot-start', '22:00')
      type('shift-slot-end', '24:00')
      type('shift-slot-cap', '2')
      fireEvent.click(screen.getByRole('button', { name: 'Add slot' }))

      await waitFor(() =>
        expect(mockCreateSlot).toHaveBeenCalledWith({ weekday: 7, startMinute: 1320, endMinute: 1440, riderCap: 2 })
      )
    })

    it('sends a slot starting at 00:00 as minute 0', async () => {
      renderAdd()
      fireEvent.change(screen.getByLabelText('Day'), { target: { value: '1' } })
      type('shift-slot-start', '00:00')
      type('shift-slot-end', '02:00')
      type('shift-slot-cap', '1')
      fireEvent.click(screen.getByRole('button', { name: 'Add slot' }))

      await waitFor(() =>
        expect(mockCreateSlot).toHaveBeenCalledWith({ weekday: 1, startMinute: 0, endMinute: 120, riderCap: 1 })
      )
    })
  })

  describe('Edit', () => {
    it('is titled "Edit slot" and prefills the slot (24:00 for a midnight end)', () => {
      renderEdit({ ...fridaySlot, startMinute: 1320, endMinute: 1440, riderCap: 3 })
      expect(screen.getByRole('heading', { name: 'Edit slot' })).toBeInTheDocument()
      expect((screen.getByLabelText('Day') as HTMLSelectElement).value).toBe('5')
      expect(box('shift-slot-start').value).toBe('22:00')
      expect(box('shift-slot-end').value).toBe('24:00')
      expect(box('shift-slot-cap').value).toBe('3')
      expect(screen.getByRole('button', { name: 'Save slot' })).toBeInTheDocument()
    })

    it('sends the update for that slot id with the four numbers, and closes', async () => {
      renderEdit()
      type('shift-slot-cap', '8')
      fireEvent.click(screen.getByRole('button', { name: 'Save slot' }))

      await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false))
      expect(mockUpdateSlot).toHaveBeenCalledWith({
        id: 'slot-fri',
        input: { weekday: 5, startMinute: 1140, endMinute: 1380, riderCap: 8 },
      })
      expect(mockCreateSlot).not.toHaveBeenCalled()
    })

    it('reopening on another slot shows that slot, not the last one typed', () => {
      const { rerender } = renderEdit()
      type('shift-slot-cap', '9')
      rerender(<ShiftSlotDialog open={false} slot={fridaySlot} onOpenChange={onOpenChange} returnFocusTo={returnFocusTo} />)
      rerender(
        <ShiftSlotDialog
          open
          slot={{ ...fridaySlot, id: 'slot-mon', weekday: 1, startMinute: 420, endMinute: 660, riderCap: 4 }}
          onOpenChange={onOpenChange}
          returnFocusTo={returnFocusTo}
        />
      )
      expect((screen.getByLabelText('Day') as HTMLSelectElement).value).toBe('1')
      expect(box('shift-slot-start').value).toBe('07:00')
      expect(box('shift-slot-end').value).toBe('11:00')
      expect(box('shift-slot-cap').value).toBe('4')
    })
  })

  describe('backend errors', () => {
    it('shows the backend sentence and stays open', async () => {
      mockUpdateSlot.mockReturnValue(rejected({ message: 'This slot just changed. Look again.' }))
      renderEdit()
      type('shift-slot-cap', '8')
      fireEvent.click(screen.getByRole('button', { name: 'Save slot' }))

      expect(await screen.findByRole('alert')).toHaveTextContent('This slot just changed. Look again.')
      expect(onOpenChange).not.toHaveBeenCalled()
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    it('shows a validation list from the backend as one sentence', async () => {
      mockCreateSlot.mockReturnValue(rejected({ message: ['The rider cap must be a whole number from 1 to 50.'] }))
      renderAdd()
      type('shift-slot-start', '19:00')
      type('shift-slot-end', '23:00')
      type('shift-slot-cap', '6')
      fireEvent.click(screen.getByRole('button', { name: 'Add slot' }))
      expect(await screen.findByRole('alert')).toHaveTextContent(CAP_SENTENCE)
    })

    it('falls back to a plain sentence when the error carries none', async () => {
      mockCreateSlot.mockReturnValue(rejected(new Error('')))
      renderAdd()
      type('shift-slot-start', '19:00')
      type('shift-slot-end', '23:00')
      type('shift-slot-cap', '6')
      fireEvent.click(screen.getByRole('button', { name: 'Add slot' }))
      expect(await screen.findByRole('alert')).toHaveTextContent('The slot could not be saved. Try again in a moment.')
    })

    it('disables Save and Cancel while saving', () => {
      mockUseCreate.mockReturnValue([mockCreateSlot, { isLoading: true }])
      renderAdd()
      // The spinner joins the button's name while saving.
      expect(screen.getByRole('button', { name: /Add slot/ })).toBeDisabled()
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled()
    })
  })

  describe('closing', () => {
    // JSDOM runs no CSS animation, so Radix unmounts a closed dialog at once and any title would pass.
    // Reporting an exit animation keeps the dialog mounted while it "animates closed", as a browser does.
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

    it('keeps the "Edit slot" title while the dialog animates closed (open and mode are separate)', () => {
      function Harness() {
        const [open, setOpen] = React.useState(true)
        return (
          <ShiftSlotDialog
            open={open}
            slot={fridaySlot}
            onOpenChange={(next) => {
              animationName = 'exit'
              setOpen(next)
            }}
            returnFocusTo={returnFocusTo}
          />
        )
      }
      render(<Harness />)
      expect(screen.getByRole('heading', { name: 'Edit slot' })).toBeInTheDocument()

      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

      // Still mounted, closing, and still the Edit title.
      const closing = screen.getByRole('dialog', { hidden: true })
      expect(closing).toHaveAttribute('data-state', 'closed')
      expect(within(closing).getByRole('heading', { name: 'Edit slot', hidden: true })).toBeInTheDocument()
      expect(within(closing).queryByRole('heading', { name: 'Add slot', hidden: true })).toBeNull()
    })
  })

  describe('focus', () => {
    it('returns focus to returnFocusTo when the dialog closes', async () => {
      function Harness() {
        const [open, setOpen] = React.useState(true)
        const opener = React.useRef<HTMLButtonElement>(null)
        return (
          <div>
            <button ref={opener} type="button">
              Edit Friday 19:00
            </button>
            <ShiftSlotDialog open={open} slot={fridaySlot} onOpenChange={setOpen} returnFocusTo={opener} />
          </div>
        )
      }
      render(<Harness />)
      const opener = screen.getByRole('button', { name: 'Edit Friday 19:00', hidden: true })

      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).toBeNull()
        expect(document.activeElement).toBe(opener)
      })
    })

    it('returns focus to returnFocusTo after a successful save too', async () => {
      function Harness() {
        const [open, setOpen] = React.useState(true)
        const opener = React.useRef<HTMLButtonElement>(null)
        return (
          <div>
            <button ref={opener} type="button">
              Add slot opener
            </button>
            <ShiftSlotDialog open={open} slot={null} onOpenChange={setOpen} returnFocusTo={opener} />
          </div>
        )
      }
      render(<Harness />)
      const opener = screen.getByRole('button', { name: 'Add slot opener', hidden: true })
      type('shift-slot-start', '19:00')
      type('shift-slot-end', '23:00')
      type('shift-slot-cap', '6')
      fireEvent.click(screen.getByRole('button', { name: 'Add slot' }))

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).toBeNull()
        expect(document.activeElement).toBe(opener)
      })
    })
  })
})
