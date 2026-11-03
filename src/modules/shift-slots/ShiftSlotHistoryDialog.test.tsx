import React from 'react'
import { render, screen, within } from '@testing-library/react'
import type { ShiftSlotAdminDto, ShiftSlotChangeAdminDto } from '@/backend-admin-sdk'
import { athensDateTime } from '@/modules/dispatch-stop/dispatchStopDisplay'
import { ShiftSlotHistoryDialog } from './ShiftSlotHistoryDialog'

const mockUseChanges = jest.fn()

jest.mock('../../api/shiftSlotApi', () => ({
  useGetShiftSlotChangesQuery: (arg: unknown) => mockUseChanges(arg),
}))

const slot: ShiftSlotAdminDto = {
  id: 'slot-fri',
  weekday: 5,
  startMinute: 1140,
  endMinute: 1380,
  riderCap: 8,
  createdAt: '2026-11-01T10:00:00.000Z',
  updatedAt: '2026-11-02T10:00:00.000Z',
  removedAt: '2026-11-03T08:00:00.000Z',
}

const ADMIN_ID = 'cmadminuser00000abc123'

// Newest first, as the backend sends them.
const changes: ShiftSlotChangeAdminDto[] = [
  {
    id: 'c3',
    action: 'REMOVED',
    changedByUserId: ADMIN_ID,
    before: { weekday: 5, startMinute: 1140, endMinute: 1380, riderCap: 8 },
    after: null,
    createdAt: '2026-11-03T08:00:00.000Z',
  },
  {
    id: 'c2',
    action: 'UPDATED',
    changedByUserId: 'cmotheradmin0000zyx987',
    before: { weekday: 5, startMinute: 1140, endMinute: 1380, riderCap: 6 },
    after: { weekday: 5, startMinute: 1140, endMinute: 1440, riderCap: 8 },
    createdAt: '2026-11-02T10:00:00.000Z',
  },
  {
    id: 'c1',
    action: 'CREATED',
    changedByUserId: ADMIN_ID,
    before: null,
    after: { weekday: 5, startMinute: 1140, endMinute: 1380, riderCap: 6 },
    createdAt: '2026-11-01T10:00:00.000Z',
  },
]

// Spec 0026 (row 77, AC-3 and the precisions): a slot's record in words.
describe('ShiftSlotHistoryDialog (spec 0026, AC-3)', () => {
  const onClose = jest.fn()
  const onCloseAutoFocus = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    mockUseChanges.mockReturnValue({ data: changes, isLoading: false, isError: false })
  })

  const renderIt = () =>
    render(<ShiftSlotHistoryDialog slot={slot} onClose={onClose} onCloseAutoFocus={onCloseAutoFocus} />)

  it('asks for this slot changes by id', () => {
    renderIt()
    expect(mockUseChanges).toHaveBeenCalledWith({ id: 'slot-fri' })
    expect(screen.getByRole('heading', { name: 'Slot history' })).toBeInTheDocument()
  })

  it('lists the changes newest first, in the order given', () => {
    renderIt()
    const items = within(screen.getByRole('list')).getAllByRole('listitem')
    expect(items).toHaveLength(3)
    expect(items[0]).toHaveTextContent(/^Removed/)
    expect(items[1]).toHaveTextContent(/^Changed/)
    expect(items[2]).toHaveTextContent(/^Added/)
  })

  it('says each action in words, when in Athens time, and the slot as times and cap', () => {
    renderIt()
    const items = within(screen.getByRole('list')).getAllByRole('listitem')

    expect(items[0]).toHaveTextContent(`Removed · ${athensDateTime('2026-11-03T08:00:00.000Z')} · by`)
    expect(items[0]).toHaveTextContent('Friday 19:00 to 23:00, 8 riders')

    expect(items[1]).toHaveTextContent(`Changed · ${athensDateTime('2026-11-02T10:00:00.000Z')} · by`)
    expect(items[1]).toHaveTextContent('Friday 19:00 to 23:00, 6 riders → Friday 19:00 to 24:00, 8 riders')

    expect(items[2]).toHaveTextContent(`Added · ${athensDateTime('2026-11-01T10:00:00.000Z')} · by`)
    expect(items[2]).toHaveTextContent('Friday 19:00 to 23:00, 6 riders')
    expect(items[2]).not.toHaveTextContent('→')
  })

  it('shows the admin as the last 6 characters in mono, with the full id in title', () => {
    renderIt()
    const items = within(screen.getByRole('list')).getAllByRole('listitem') as [HTMLElement, HTMLElement, HTMLElement]

    const first = within(items[0]).getByTitle(ADMIN_ID)
    expect(first).toHaveTextContent(/^abc123$/)
    expect(first).toHaveClass('font-mono')

    const second = within(items[1]).getByTitle('cmotheradmin0000zyx987')
    expect(second).toHaveTextContent(/^zyx987$/)
  })

  it('says it is loading, and says so in words when the history cannot load', () => {
    mockUseChanges.mockReturnValue({ data: undefined, isLoading: true, isError: false })
    const { unmount } = renderIt()
    expect(screen.getByText('Loading…')).toBeInTheDocument()
    unmount()

    mockUseChanges.mockReturnValue({ data: undefined, isLoading: false, isError: true })
    renderIt()
    expect(screen.getByText('Could not load the history.')).toBeInTheDocument()
  })
})
