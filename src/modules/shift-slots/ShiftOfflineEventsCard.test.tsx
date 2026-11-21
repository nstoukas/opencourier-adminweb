import React from 'react'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { Provider } from 'react-redux'
import { makeStore } from '@/redux/store'
import { prepareAdminSdk } from '../../api'
import { ApiError } from '@/backend-admin-sdk'
import type { ShiftOfflineEventAdminDto } from '@/backend-admin-sdk'
import { ShiftOfflineEventsCard } from './ShiftOfflineEventsCard'

// The card runs on the real store and the real RTK slice; only the SDK under it is replaced, so a
// refusal reaches the card the way a real 409 does.
jest.mock('../../api', () => {
  const actual = jest.requireActual('../../api')
  return { ...actual, prepareAdminSdk: jest.fn() }
})

const mockPrepareAdminSdk = prepareAdminSdk as jest.Mock

const item = (overrides: Partial<ShiftOfflineEventAdminDto> = {}): ShiftOfflineEventAdminDto => ({
  id: 'event-1',
  courierId: 'rider-1',
  courierName: 'Maria Papadopoulou',
  offlineAt: '2026-11-20T19:10:00.000Z',
  offlineTime: '21:10',
  shiftDate: '2026-11-20',
  shiftText: 'Fri 20 Nov, 20:00 to 24:00',
  cause: 'RIDER',
  causeText: 'The rider switched to Offline',
  followedUpAt: null,
  followedUpByEmail: null,
  ...overrides,
})

// Spec 0049 (row 79; AC-6, cross check 2 and 3): "Offline during a booked shift" on the Shift slots page.
describe('ShiftOfflineEventsCard (spec 0049, AC-6)', () => {
  const sdk = { list: jest.fn(), followUp: jest.fn() }

  function renderCard() {
    const store = makeStore()
    return render(
      <Provider store={store}>
        <ShiftOfflineEventsCard />
      </Provider>
    )
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockPrepareAdminSdk.mockReturnValue({ shiftOfflineEvents: () => sdk })
    sdk.list.mockResolvedValue([])
    sdk.followUp.mockResolvedValue(undefined)
  })

  it('is titled "Offline during a booked shift" and says it changes nothing for the rider', async () => {
    renderCard()
    expect(screen.getByText('Offline during a booked shift')).toBeInTheDocument()
    expect(screen.getByText(/nothing here changes their offers or pay/)).toBeInTheDocument()
    expect(screen.getByText(/the rider sees the same record/)).toBeInTheDocument()
    await screen.findByText('Nothing to follow up.')
  })

  describe('states', () => {
    it('says it is loading until the list answers', async () => {
      let answer: (rows: ShiftOfflineEventAdminDto[]) => void = () => undefined
      sdk.list.mockReturnValue(new Promise((resolve) => (answer = resolve)))
      renderCard()
      expect(screen.getByText('Loading…')).toBeInTheDocument()
      expect(screen.queryByText('Nothing to follow up.')).toBeNull()
      answer([])
      await screen.findByText('Nothing to follow up.')
      expect(screen.queryByText('Loading…')).toBeNull()
    })

    it('an empty list says "Nothing to follow up." and shows no item and no button', async () => {
      renderCard()
      await screen.findByText('Nothing to follow up.')
      expect(screen.queryByRole('listitem')).toBeNull()
      expect(screen.queryByRole('button')).toBeNull()
    })

    it('a list that cannot load says so in words, never "Nothing to follow up."', async () => {
      sdk.list.mockRejectedValue(new ApiError('INTERNAL_SERVER_ERROR' as never, 'boom', 500))
      renderCard()
      await screen.findByText('Could not load this list.')
      expect(screen.queryByText('Nothing to follow up.')).toBeNull()
      expect(screen.queryByRole('button')).toBeNull()
    })
  })

  describe('the items', () => {
    it('shows each item with the rider, the shift, the time and the cause, in the order the backend sent', async () => {
      sdk.list.mockResolvedValue([
        item({ id: 'event-2', courierName: 'Nikos Georgiou', offlineTime: '22:05', causeText: "A password change ended the rider's sessions" }),
        item(),
      ])
      renderCard()
      const rows = await screen.findAllByRole('listitem')
      expect(rows).toHaveLength(2)
      expect(within(rows[0] as HTMLElement).getByText('Nikos Georgiou')).toBeInTheDocument()
      expect(rows[0]).toHaveTextContent('Shift Fri 20 Nov, 20:00 to 24:00')
      expect(rows[0]).toHaveTextContent('Offline at 22:05')
      expect(rows[0]).toHaveTextContent("A password change ended the rider's sessions")
      expect(within(rows[1] as HTMLElement).getByText('Maria Papadopoulou')).toBeInTheDocument()
      expect(rows[1]).toHaveTextContent('Offline at 21:10')
      expect(rows[1]).toHaveTextContent('The rider switched to Offline')
    })

    it('an open item has a Followed up button named for its rider and time', async () => {
      sdk.list.mockResolvedValue([item()])
      renderCard()
      const button = await screen.findByRole('button', { name: /Mark followed up: Maria Papadopoulou, Offline at 21:10/ })
      expect(button).toHaveTextContent('Followed up')
      expect(button).toBeEnabled()
    })

    it('an item with no recorded time still reads', async () => {
      sdk.list.mockResolvedValue([item({ offlineAt: null, offlineTime: null })])
      renderCard()
      const row = await screen.findByRole('listitem')
      expect(row).toHaveTextContent('Offline at an unknown time')
    })

    // Cross check 2: an admin caused item arrives already followed up by that admin.
    it('a followed up item says who followed it up and has no button', async () => {
      sdk.list.mockResolvedValue([
        item({
          cause: 'ADMIN',
          causeText: 'An admin set the rider Offline',
          followedUpAt: '2026-11-20T19:41:00.000Z',
          followedUpByEmail: 'rep@coop.example',
        }),
      ])
      renderCard()
      const row = await screen.findByRole('listitem')
      expect(row).toHaveTextContent('Followed up by rep@coop.example')
      expect(row).toHaveTextContent('An admin set the rider Offline')
      expect(within(row).queryByRole('button')).toBeNull()
    })

    it('a followed up item with no admin recorded still says Followed up', async () => {
      sdk.list.mockResolvedValue([item({ followedUpAt: '2026-11-20T19:41:00.000Z', followedUpByEmail: null })])
      renderCard()
      const row = await screen.findByRole('listitem')
      expect(row).toHaveTextContent(/Followed up$/)
      expect(within(row).queryByRole('button')).toBeNull()
    })

    // AC-6, value 5: "The list never groups, counts or sorts by rider, and no screen anywhere shows a per
    // rider total of these events."
    it('two items of the same rider stay two rows, with no count, total or badge anywhere on the card', async () => {
      sdk.list.mockResolvedValue([
        item({ id: 'event-3', offlineTime: '22:40' }),
        item({ id: 'event-2', offlineTime: '21:55' }),
        item({ id: 'event-1', offlineTime: '21:10' }),
      ])
      const { container } = renderCard()
      const rows = await screen.findAllByRole('listitem')
      expect(rows).toHaveLength(3)
      expect(screen.getAllByText('Maria Papadopoulou')).toHaveLength(3)
      // Every digit on the card belongs to a time or the shift text; nothing says "3".
      const text = (container.textContent ?? '')
        .replace(/Fri 20 Nov, 20:00 to 24:00/g, '')
        .replace(/\d{2}:\d{2}/g, '')
      expect(text).not.toMatch(/\d/)
      expect(text).not.toMatch(/\b(times|total|count|in all|this (week|month))\b/i)
    })

    it('offers no search, filter or sort control', async () => {
      sdk.list.mockResolvedValue([item()])
      renderCard()
      await screen.findByRole('listitem')
      expect(screen.queryByRole('textbox')).toBeNull()
      expect(screen.queryByRole('searchbox')).toBeNull()
      expect(screen.queryByRole('combobox')).toBeNull()
      expect(screen.queryByRole('columnheader')).toBeNull()
      expect(screen.getAllByRole('button')).toHaveLength(1)
    })
  })

  describe('Followed up', () => {
    it('calls the follow up for that item only, then reads the list again', async () => {
      sdk.list.mockResolvedValueOnce([item({ id: 'event-2', courierName: 'Nikos Georgiou' }), item()])
      sdk.list.mockResolvedValue([
        item({ id: 'event-2', courierName: 'Nikos Georgiou' }),
        item({ followedUpAt: '2026-11-21T08:00:00.000Z', followedUpByEmail: 'rep@coop.example' }),
      ])
      renderCard()
      fireEvent.click(await screen.findByRole('button', { name: /Mark followed up: Maria Papadopoulou/ }))

      await waitFor(() => expect(sdk.followUp).toHaveBeenCalledTimes(1))
      expect(sdk.followUp).toHaveBeenCalledWith('event-1')
      await screen.findByText('Followed up by rep@coop.example')
      expect(sdk.list).toHaveBeenCalledTimes(2)
      expect(screen.queryByRole('alert')).toBeNull()
      // The other item is still open.
      expect(screen.getByRole('button', { name: /Mark followed up: Nikos Georgiou/ })).toBeInTheDocument()
    })

    it('while one is saving, every Followed up button is disabled and that one says Saving…', async () => {
      let finish: () => void = () => undefined
      sdk.followUp.mockReturnValue(new Promise<void>((resolve) => (finish = () => resolve())))
      sdk.list.mockResolvedValue([item({ id: 'event-2', courierName: 'Nikos Georgiou' }), item()])
      renderCard()
      fireEvent.click(await screen.findByRole('button', { name: /Mark followed up: Maria Papadopoulou/ }))

      const saving = await screen.findByText('Saving…')
      expect(saving.closest('button')).toBeDisabled()
      expect(screen.getByRole('button', { name: /Mark followed up: Nikos Georgiou/ })).toBeDisabled()
      finish()
      await waitFor(() => expect(screen.queryByText('Saving…')).toBeNull())
    })

    it('a 409 says another admin did it first, and the list is read again', async () => {
      sdk.followUp.mockRejectedValue(new ApiError('CONFLICT' as never, 'This item was already followed up.', 409))
      sdk.list.mockResolvedValueOnce([item()])
      sdk.list.mockResolvedValue([item({ followedUpAt: '2026-11-21T08:00:00.000Z', followedUpByEmail: 'other@coop.example' })])
      renderCard()
      fireEvent.click(await screen.findByRole('button', { name: /Mark followed up/ }))

      const alert = await screen.findByRole('alert')
      expect(alert).toHaveTextContent('Another admin followed this up first. The list is up to date now.')
      await screen.findByText('Followed up by other@coop.example')
      expect(sdk.list).toHaveBeenCalledTimes(2)
    })

    it('any other failure says it could not be saved, and the button is there to try again', async () => {
      sdk.followUp.mockRejectedValue(new ApiError('INTERNAL_SERVER_ERROR' as never, 'boom', 500))
      sdk.list.mockResolvedValue([item()])
      renderCard()
      fireEvent.click(await screen.findByRole('button', { name: /Mark followed up/ }))

      const alert = await screen.findByRole('alert')
      expect(alert).toHaveTextContent('Could not save the follow up. Try again.')
      expect(alert).not.toHaveTextContent('Another admin')
      await waitFor(() => expect(screen.getByRole('button', { name: /Mark followed up/ })).toBeEnabled())
    })

    it('a new try clears the last problem', async () => {
      sdk.followUp.mockRejectedValueOnce(new ApiError('INTERNAL_SERVER_ERROR' as never, 'boom', 500))
      sdk.followUp.mockResolvedValue(undefined)
      sdk.list.mockResolvedValue([item()])
      renderCard()
      fireEvent.click(await screen.findByRole('button', { name: /Mark followed up/ }))
      await screen.findByRole('alert')
      await waitFor(() => expect(screen.getByRole('button', { name: /Mark followed up/ })).toBeEnabled())

      fireEvent.click(screen.getByRole('button', { name: /Mark followed up/ }))
      await waitFor(() => expect(sdk.followUp).toHaveBeenCalledTimes(2))
      await waitFor(() => expect(screen.queryByRole('alert')).toBeNull())
    })
  })
})
