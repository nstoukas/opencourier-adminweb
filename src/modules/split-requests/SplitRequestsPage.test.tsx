import React from 'react'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import type { SplitRequestAdminDto } from '@/backend-admin-sdk'
import { SPLIT_COUNT_POLL_MS } from './SplitRequestsBadge'
import { SplitRequestsPage, legsWords } from './SplitRequestsPage'

jest.mock('next/link', () => {
  return function MockLink({ children, href, ...rest }: any) {
    return (
      <a href={String(href)} {...rest}>
        {children}
      </a>
    )
  }
})

// The page's three hooks. A mutation hook hands back [send, state]; `send(arg).unwrap()` is the promise
// the page awaits, so each test decides whether the answer is saved or refused.
const mockUseGetSplitRequestsQuery = jest.fn()
const mockConfirm = jest.fn()
const mockRefuse = jest.fn()
let mockConfirmState = { isLoading: false }
let mockRefuseState = { isLoading: false }
jest.mock('../../api/splitRequestApi', () => ({
  useGetSplitRequestsQuery: (arg: any, opts: any) => mockUseGetSplitRequestsQuery(arg, opts),
  useGetSplitRequestCountQuery: () => ({ data: { open: 0 } }),
  useConfirmSplitRequestMutation: () => [mockConfirm, mockConfirmState],
  useRefuseSplitRequestMutation: () => [mockRefuse, mockRefuseState],
}))

let mockPageVisible = true
jest.mock('../../hooks/usePageVisible', () => ({
  usePageVisible: () => mockPageVisible,
}))

// Spec 0047 (AC-4): the Split requests queue. Each open request shows the restaurant, the rider, the
// proposed legs and the wait so far; the admin confirms as proposed, edits the legs (2 to 4, a size each),
// or refuses ("It fits", with an optional sentence).
describe('SplitRequestsPage (spec 0047, AC-4, AC-9)', () => {
  const request = (overrides: Partial<SplitRequestAdminDto> = {}): SplitRequestAdminDto => ({
    id: 'split-1',
    deliveryId: 'delivery-abcdef123456',
    courierId: 'rider-1',
    courierName: 'Nikos Rider',
    restaurantName: 'Volos Test Kitchen',
    orderReference: 'ORDER-77',
    currentBoxSize: 'LARGE',
    legNumber: null,
    legCount: null,
    proposedLegs: [{ boxSize: 'LARGE' }, { boxSize: 'SMALL' }],
    createdAt: '2026-11-21T12:00:00.000Z',
    waitedMinutes: 6,
    ...overrides,
  })

  const showQueue = (rows: SplitRequestAdminDto[]) =>
    mockUseGetSplitRequestsQuery.mockReturnValue({ data: rows, isError: false, isLoading: false })
  const row = (id = 'split-1') => within(screen.getByTestId(`split-request-${id}`))
  // What a saved answer and a refused one look like to the page.
  const saved = () => ({ unwrap: () => Promise.resolve({ status: 'OK' }) })
  const refusedWith = (error: unknown) => ({ unwrap: () => Promise.reject(error) })

  beforeEach(() => {
    jest.clearAllMocks()
    mockPageVisible = true
    mockConfirmState = { isLoading: false }
    mockRefuseState = { isLoading: false }
    mockConfirm.mockReturnValue(saved())
    mockRefuse.mockReturnValue(saved())
  })

  describe('legsWords', () => {
    it('words a proposal the way the record does', () => {
      expect(legsWords([{ boxSize: 'LARGE' }, { boxSize: 'SMALL' }])).toBe('2 boxes: Large and Small')
      expect(legsWords([{ boxSize: 'LARGE' }, { boxSize: 'MEDIUM' }, { boxSize: 'SMALL' }])).toBe('3 boxes: Large, Medium and Small')
      expect(legsWords([{ boxSize: 'SMALL' }, { boxSize: 'SMALL' }, { boxSize: 'SMALL' }, { boxSize: 'SMALL' }])).toBe(
        '4 boxes: Small, Small, Small and Small'
      )
    })
  })

  describe('the list', () => {
    it('says it is loading', () => {
      mockUseGetSplitRequestsQuery.mockReturnValue({ data: undefined, isError: false, isLoading: true })
      render(<SplitRequestsPage />)
      expect(screen.getByText('Loading split requests…')).toBeInTheDocument()
    })

    it('says so when the queue could not be loaded, and never "no rider is waiting"', () => {
      mockUseGetSplitRequestsQuery.mockReturnValue({ data: undefined, isError: true, isLoading: false })
      render(<SplitRequestsPage />)
      expect(screen.getByText('The split requests could not be loaded.')).toBeInTheDocument()
      expect(screen.queryByText('No rider is waiting for a split.')).toBeNull()
    })

    it('says no rider is waiting when the queue is empty', () => {
      showQueue([])
      render(<SplitRequestsPage />)
      expect(screen.getByText('No rider is waiting for a split.')).toBeInTheDocument()
      expect(screen.queryByRole('table')).toBeNull()
    })

    it('shows the restaurant, the rider, the proposed legs, the size it was sent as and the wait so far', () => {
      showQueue([request()])
      render(<SplitRequestsPage />)

      expect(row().getByText('Volos Test Kitchen')).toBeInTheDocument()
      expect(row().getByText('Nikos Rider')).toBeInTheDocument()
      expect(row().getByText('2 boxes: Large and Small')).toBeInTheDocument()
      expect(row().getByText('Sent as Large')).toBeInTheDocument()
      // The figure the server worked out, not one the page counts itself.
      expect(row().getByText('6 min')).toBeInTheDocument()
    })

    it('links to the delivery', () => {
      showQueue([request()])
      render(<SplitRequestsPage />)
      expect(row().getByRole('link')).toHaveAttribute('href', '/deliveries/delivery-abcdef123456')
    })

    it('says which leg it is when the delivery is already a leg of an order', () => {
      showQueue([request({ legNumber: 1, legCount: 2 })])
      render(<SplitRequestsPage />)
      expect(row().getByText('Leg 1 of 2')).toBeInTheDocument()
    })

    it('shows no leg line for a single delivery', () => {
      showQueue([request()])
      render(<SplitRequestsPage />)
      expect(row().queryByText(/^Leg \d of \d$/)).toBeNull()
    })

    it('keeps the order the server sent (oldest first), one row per request', () => {
      showQueue([
        request({ id: 'split-oldest', waitedMinutes: 9, courierName: 'First Rider' }),
        request({ id: 'split-newest', waitedMinutes: 1, courierName: 'Second Rider' }),
      ])
      render(<SplitRequestsPage />)

      const rows = screen.getAllByTestId(/^split-request-/)
      expect(rows.map((item) => item.getAttribute('data-testid'))).toEqual(['split-request-split-oldest', 'split-request-split-newest'])
      expect(row('split-oldest').getByText('9 min')).toBeInTheDocument()
      expect(row('split-newest').getByText('1 min')).toBeInTheDocument()
    })

    it('reads the queue again every 15 seconds while visible, and not at all in the background', () => {
      showQueue([])
      const { unmount } = render(<SplitRequestsPage />)
      expect(mockUseGetSplitRequestsQuery).toHaveBeenLastCalledWith(
        undefined,
        expect.objectContaining({ pollingInterval: SPLIT_COUNT_POLL_MS })
      )
      unmount()

      mockPageVisible = false
      render(<SplitRequestsPage />)
      expect(mockUseGetSplitRequestsQuery).toHaveBeenLastCalledWith(undefined, expect.objectContaining({ pollingInterval: 0 }))
    })

    it("tells the admin what a confirm does: the rider keeps the first box, the rest are charged to the restaurant", () => {
      showQueue([])
      render(<SplitRequestsPage />)
      expect(screen.getByText(/The rider keeps the first box/)).toBeInTheDocument()
      expect(screen.getByText(/paid in full and charged to the restaurant/)).toBeInTheDocument()
    })
  })

  describe('Confirm as proposed', () => {
    it('sends the request id only, so the server uses the rider\'s own proposal', async () => {
      showQueue([request()])
      render(<SplitRequestsPage />)

      fireEvent.click(row().getByRole('button', { name: 'Confirm' }))

      await waitFor(() => expect(mockConfirm).toHaveBeenCalledTimes(1))
      expect(mockConfirm).toHaveBeenCalledWith({ id: 'split-1' })
      expect(mockRefuse).not.toHaveBeenCalled()
    })

    it('answers only the row that was clicked', async () => {
      showQueue([request({ id: 'split-a' }), request({ id: 'split-b' })])
      render(<SplitRequestsPage />)

      fireEvent.click(row('split-b').getByRole('button', { name: 'Confirm' }))

      await waitFor(() => expect(mockConfirm).toHaveBeenCalledWith({ id: 'split-b' }))
      expect(mockConfirm).toHaveBeenCalledTimes(1)
    })
  })

  describe('Change boxes (2 to 4, a size each)', () => {
    const openEditor = () => fireEvent.click(row().getByRole('button', { name: 'Change boxes' }))
    const boxes = () => row().getAllByRole('combobox') as HTMLSelectElement[]

    it("starts from the rider's proposal, one size box per leg", () => {
      showQueue([request()])
      render(<SplitRequestsPage />)

      openEditor()

      expect(boxes().map((select) => select.value)).toEqual(['LARGE', 'SMALL'])
      expect(row().getByRole('button', { name: 'Split into 2' })).toBeInTheDocument()
      expect(row().queryByRole('button', { name: 'Confirm' })).toBeNull()
    })

    it('offers Small, Medium and Large for each box', () => {
      showQueue([request()])
      render(<SplitRequestsPage />)
      openEditor()

      for (const select of boxes()) {
        expect(within(select).getAllByRole('option').map((option) => option.textContent)).toEqual(['Small', 'Medium', 'Large'])
      }
    })

    it('sends the changed boxes with the confirm', async () => {
      showQueue([request()])
      render(<SplitRequestsPage />)
      openEditor()

      fireEvent.change(boxes()[1] as HTMLSelectElement, { target: { value: 'MEDIUM' } })
      fireEvent.click(row().getByRole('button', { name: 'Split into 2' }))

      await waitFor(() => expect(mockConfirm).toHaveBeenCalledTimes(1))
      expect(mockConfirm).toHaveBeenCalledWith({ id: 'split-1', legs: [{ boxSize: 'LARGE' }, { boxSize: 'MEDIUM' }] })
    })

    it('adds a box up to four, then no more', async () => {
      showQueue([request()])
      render(<SplitRequestsPage />)
      openEditor()

      const add = row().getByRole('button', { name: 'Add a box' })
      fireEvent.click(add)
      expect(boxes()).toHaveLength(3)
      expect(row().getByRole('button', { name: 'Split into 3' })).toBeInTheDocument()
      fireEvent.click(add)
      expect(boxes()).toHaveLength(4)
      expect(add).toBeDisabled()

      fireEvent.click(row().getByRole('button', { name: 'Split into 4' }))
      await waitFor(() => expect(mockConfirm).toHaveBeenCalledTimes(1))
      expect(mockConfirm.mock.calls[0][0].legs).toHaveLength(4)
    })

    it('removes the last box down to two, then no fewer', () => {
      showQueue([request({ proposedLegs: [{ boxSize: 'LARGE' }, { boxSize: 'MEDIUM' }, { boxSize: 'SMALL' }] })])
      render(<SplitRequestsPage />)
      openEditor()

      const remove = row().getByRole('button', { name: 'Remove the last box' })
      expect(remove).not.toBeDisabled()
      fireEvent.click(remove)

      expect(boxes().map((select) => select.value)).toEqual(['LARGE', 'MEDIUM'])
      expect(remove).toBeDisabled()
    })

    it("does not change the rider's proposal shown above the editor", () => {
      showQueue([request()])
      render(<SplitRequestsPage />)
      openEditor()

      fireEvent.change(boxes()[0] as HTMLSelectElement, { target: { value: 'SMALL' } })

      expect(row().getByText('2 boxes: Large and Small')).toBeInTheDocument()
    })
  })

  describe('"It fits" (refuse, with an optional sentence)', () => {
    const openRefusal = () => fireEvent.click(row().getByRole('button', { name: 'It fits' }))

    it('asks for an optional sentence first, and refuses nothing until the admin says so', () => {
      showQueue([request()])
      render(<SplitRequestsPage />)

      openRefusal()

      expect(row().getByLabelText('A sentence for the rider (optional)')).toBeInTheDocument()
      expect(mockRefuse).not.toHaveBeenCalled()
    })

    it('refuses with the sentence, trimmed', async () => {
      showQueue([request()])
      render(<SplitRequestsPage />)
      openRefusal()

      fireEvent.change(row().getByLabelText('A sentence for the rider (optional)'), {
        target: { value: '  It fits if you turn the platter  ' },
      })
      fireEvent.click(row().getByRole('button', { name: 'Refuse the split' }))

      await waitFor(() => expect(mockRefuse).toHaveBeenCalledTimes(1))
      expect(mockRefuse).toHaveBeenCalledWith({ id: 'split-1', note: 'It fits if you turn the platter' })
      expect(mockConfirm).not.toHaveBeenCalled()
    })

    it('refuses with no sentence when none was typed (or only spaces)', async () => {
      showQueue([request()])
      render(<SplitRequestsPage />)
      openRefusal()

      fireEvent.change(row().getByLabelText('A sentence for the rider (optional)'), { target: { value: '   ' } })
      fireEvent.click(row().getByRole('button', { name: 'Refuse the split' }))

      await waitFor(() => expect(mockRefuse).toHaveBeenCalledTimes(1))
      expect(mockRefuse).toHaveBeenCalledWith({ id: 'split-1' })
    })

    it('takes at most 300 characters, as the server stores', () => {
      showQueue([request()])
      render(<SplitRequestsPage />)
      openRefusal()
      expect(row().getByLabelText('A sentence for the rider (optional)')).toHaveAttribute('maxLength', '300')
    })
  })

  describe('an answer the server refused (AC-9: already answered, or the rider left)', () => {
    it("shows the server's own sentence after a confirm", async () => {
      mockConfirm.mockReturnValue(refusedWith({ statusCode: 409, message: 'This split request was already answered or closed.' }))
      showQueue([request()])
      render(<SplitRequestsPage />)

      fireEvent.click(row().getByRole('button', { name: 'Confirm' }))

      expect(await row().findByRole('alert')).toHaveTextContent('This split request was already answered or closed.')
    })

    it("shows the server's own sentence after a refusal", async () => {
      mockRefuse.mockReturnValue(refusedWith({ statusCode: 409, message: 'This split request was already answered or closed.' }))
      showQueue([request()])
      render(<SplitRequestsPage />)

      fireEvent.click(row().getByRole('button', { name: 'It fits' }))
      fireEvent.click(row().getByRole('button', { name: 'Refuse the split' }))

      expect(await row().findByRole('alert')).toHaveTextContent('This split request was already answered or closed.')
    })

    it('says the answer could not be saved when the error has no sentence', async () => {
      mockConfirm.mockReturnValue(refusedWith({}))
      showQueue([request()])
      render(<SplitRequestsPage />)

      fireEvent.click(row().getByRole('button', { name: 'Confirm' }))

      expect(await row().findByRole('alert')).toHaveTextContent('The answer could not be saved. Try again.')
    })

    it('shows the problem on its own row only', async () => {
      mockConfirm.mockReturnValue(refusedWith({ message: 'This order changed before the split could be made. Look again.' }))
      showQueue([request({ id: 'split-a' }), request({ id: 'split-b' })])
      render(<SplitRequestsPage />)

      fireEvent.click(row('split-a').getByRole('button', { name: 'Confirm' }))

      expect(await row('split-a').findByRole('alert')).toHaveTextContent('This order changed before the split could be made.')
      expect(row('split-b').queryByRole('alert')).toBeNull()
    })

    it('clears an old problem when the admin tries again and it is saved', async () => {
      mockConfirm.mockReturnValueOnce(refusedWith({ message: 'Try later.' })).mockReturnValueOnce(saved())
      showQueue([request()])
      render(<SplitRequestsPage />)

      fireEvent.click(row().getByRole('button', { name: 'Confirm' }))
      expect(await row().findByRole('alert')).toHaveTextContent('Try later.')
      fireEvent.click(row().getByRole('button', { name: 'Confirm' }))

      await waitFor(() => expect(row().queryByRole('alert')).toBeNull())
    })
  })

  describe('while an answer is on its way', () => {
    it('every answer button of the row is off, so one request cannot be answered twice', () => {
      mockConfirmState = { isLoading: true }
      showQueue([request()])
      render(<SplitRequestsPage />)

      expect(row().getByRole('button', { name: 'Confirm' })).toBeDisabled()
      expect(row().getByRole('button', { name: 'Change boxes' })).toBeDisabled()
      expect(row().getByRole('button', { name: 'It fits' })).toBeDisabled()
    })

    it('the same while a refusal is on its way', () => {
      mockRefuseState = { isLoading: true }
      showQueue([request()])
      render(<SplitRequestsPage />)

      expect(row().getByRole('button', { name: 'Confirm' })).toBeDisabled()
      expect(row().getByRole('button', { name: 'It fits' })).toBeDisabled()
    })
  })
})
