import React from 'react'
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { SosAlerts } from './SosAlerts'
import { sosApi, useGetCurrentSosQuery } from '../../api/sosApi'
import { authSlice } from '@/modules/auth/slices/authSlice'
import {
  enableSosAlerts,
  notificationsAllowed,
  notificationsBlocked,
  notificationsSupported,
  notifyNewSos,
  playSosSound,
  sosAlertsChosen,
  soundUnlocked,
  unlockSound,
} from './sosAlerts'
import type { SosIncidentAdminDto } from '@/backend-admin-sdk'

// Mock next/router singleton
const mockPush = jest.fn()
jest.mock('next/router', () => ({
  __esModule: true,
  default: {
    push: (...args: any[]) => mockPush(...args),
  },
  push: (...args: any[]) => mockPush(...args),
}))

jest.mock('./sosAlerts', () => {
  const actual = jest.requireActual('./sosAlerts')
  return {
    ...actual,
    enableSosAlerts: jest.fn(),
    playSosSound: jest.fn(),
    sosAlertsChosen: jest.fn(),
    soundUnlocked: jest.fn(),
    notificationsAllowed: jest.fn(),
    notificationsBlocked: jest.fn(),
    notificationsSupported: jest.fn(),
    notifyNewSos: jest.fn(),
    unlockSound: jest.fn(),
  }
})

jest.mock('../../api/sosApi', () => {
  const actual = jest.requireActual('../../api/sosApi')
  return {
    ...actual,
    useGetCurrentSosQuery: jest.fn(),
  }
})

const mockUseGetCurrentSosQuery = useGetCurrentSosQuery as jest.Mock
const mockPlaySosSound = playSosSound as jest.Mock
const mockSosAlertsChosen = sosAlertsChosen as jest.Mock
const mockSoundUnlocked = soundUnlocked as jest.Mock
const mockNotificationsAllowed = notificationsAllowed as jest.Mock
const mockNotificationsSupported = notificationsSupported as jest.Mock
const mockEnableSosAlerts = enableSosAlerts as jest.Mock
const mockUnlockSound = unlockSound as jest.Mock
const mockNotificationsBlocked = notificationsBlocked as jest.Mock
const mockNotifyNewSos = notifyNewSos as jest.Mock

function createTestStore(accessToken: string | null = 'test-bearer-token') {
  return configureStore({
    reducer: {
      [sosApi.reducerPath]: sosApi.reducer,
      [authSlice.name]: authSlice.reducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: false,
        immutableCheck: false,
      }).concat(sosApi.middleware),
    preloadedState: {
      auth: { accessToken },
    },
  })
}

describe('SosAlerts component (spec 0022, AC-8)', () => {
  const activeIncident: SosIncidentAdminDto = {
    id: 'sos-1',
    state: 'ACTIVE',
    courier: { id: 'c-1', firstName: 'Nikos', lastName: 'Kazantzakis' },
    deliveryId: null,
    startedAt: new Date(Date.now() - 4 * 60 * 1000).toISOString(), // 4 min ago
    createdAt: new Date().toISOString(),
    safeAt: null,
    falseAlarmAt: null,
    closedAt: null,
    closedBy: null,
    outcome: null,
    note: null,
    pointsDeletedAt: null,
  }

  const safeIncident: SosIncidentAdminDto = {
    id: 'sos-2',
    state: 'AWAITING_CLOSE',
    courier: { id: 'c-2', firstName: 'Maria', lastName: 'P' },
    deliveryId: null,
    startedAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    createdAt: new Date().toISOString(),
    safeAt: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
    falseAlarmAt: null,
    closedAt: null,
    closedBy: null,
    outcome: null,
    note: null,
    pointsDeletedAt: null,
  }

  const falseAlarmIncident: SosIncidentAdminDto = {
    id: 'sos-3',
    state: 'AWAITING_CLOSE',
    courier: { id: 'c-3', firstName: 'Giorgos', lastName: 'D' },
    deliveryId: null,
    startedAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    createdAt: new Date().toISOString(),
    safeAt: null,
    falseAlarmAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    closedAt: null,
    closedBy: null,
    outcome: null,
    note: null,
    pointsDeletedAt: null,
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockSosAlertsChosen.mockReturnValue(false)
    mockSoundUnlocked.mockReturnValue(false)
    mockNotificationsAllowed.mockReturnValue(false)
    mockNotificationsSupported.mockReturnValue(true)
    mockNotificationsBlocked.mockReturnValue(false)
    mockUnlockSound.mockResolvedValue(true)
    mockEnableSosAlerts.mockResolvedValue(undefined)
  })

  it('with the store signed in and current incidents returned, renders one link per incident to /sos/<id>', () => {
    const store = createTestStore('valid-token')
    mockUseGetCurrentSosQuery.mockReturnValue({
      data: [activeIncident, safeIncident, falseAlarmIncident],
      refetch: jest.fn(),
    })

    render(
      <Provider store={store}>
        <SosAlerts />
      </Provider>,
    )

    const links = screen.getAllByRole('link')
    expect(links).toHaveLength(3)

    expect(links[0]!).toHaveAttribute('href', '/sos/sos-1')
    expect(links[0]!.textContent).toContain('SOS: Nikos Kazantzakis, 4 min ago')

    expect(links[1]!).toHaveAttribute('href', '/sos/sos-2')
    expect(links[1]!.textContent).toContain('Maria P marked safe, awaiting close')

    expect(links[2]!).toHaveAttribute('href', '/sos/sos-3')
    expect(links[2]!.textContent).toContain('Giorgos D marked false alarm, awaiting close')
  })

  it('with no access token the query is skipped (skip: true)', () => {
    const store = createTestStore(null) // Signed out
    mockUseGetCurrentSosQuery.mockReturnValue({
      data: undefined,
      refetch: jest.fn(),
    })

    render(
      <Provider store={store}>
        <SosAlerts />
      </Provider>,
    )

    // Hook called with skip: true
    expect(mockUseGetCurrentSosQuery).toHaveBeenCalledWith(undefined, { skip: true })
    expect(screen.queryByTestId('sos-banners')).not.toBeInTheDocument()
  })

  it('the poll runs every 10 s from startSosTicker (test fallback with fake timers: refetch after 10 s, none before)', () => {
    jest.useFakeTimers()
    try {
      const store = createTestStore('valid-token')
      const mockRefetch = jest.fn()
      mockUseGetCurrentSosQuery.mockReturnValue({
        data: [activeIncident],
        refetch: mockRefetch,
      })
      mockSosAlertsChosen.mockReturnValue(true)

      render(
        <Provider store={store}>
          <SosAlerts />
        </Provider>,
      )

      expect(mockRefetch).not.toHaveBeenCalled()

      // Advance 9,999 ms -> none before 10 s
      act(() => {
        jest.advanceTimersByTime(9_999)
      })
      expect(mockRefetch).not.toHaveBeenCalled()

      // Advance 1 ms (to 10,000 ms) -> refetches once and plays sound because alerts chosen & incident active
      act(() => {
        jest.advanceTimersByTime(1)
      })
      expect(mockRefetch).toHaveBeenCalledTimes(1)
      expect(mockPlaySosSound).toHaveBeenCalled()

      // Advance another 10,000 ms -> second refetch
      act(() => {
        jest.advanceTimersByTime(10_000)
      })
      expect(mockRefetch).toHaveBeenCalledTimes(2)
    } finally {
      jest.useRealTimers()
    }
  })

  it('calls playSosSound on tick only when alerts are chosen AND some incident is ACTIVE', () => {
    jest.useFakeTimers()
    try {
      const store = createTestStore('valid-token')
      const mockRefetch = jest.fn()
      mockUseGetCurrentSosQuery.mockReturnValue({
        data: [safeIncident], // Only AWAITING_CLOSE, none ACTIVE
        refetch: mockRefetch,
      })
      mockSosAlertsChosen.mockReturnValue(true)

      render(
        <Provider store={store}>
          <SosAlerts />
        </Provider>,
      )

      mockPlaySosSound.mockClear()

      act(() => {
        jest.advanceTimersByTime(10_000)
      })

      expect(mockRefetch).toHaveBeenCalledTimes(1)
      // Sound should NOT play because none is ACTIVE
      expect(mockPlaySosSound).not.toHaveBeenCalled()
    } finally {
      jest.useRealTimers()
    }
  })

  it('a tick while an ACTIVE incident exists must NOT call playSosSound when alerts were never chosen, but does once chosen', () => {
    jest.useFakeTimers()
    try {
      const store = createTestStore('valid-token')
      mockUseGetCurrentSosQuery.mockReturnValue({
        data: [activeIncident],
        refetch: jest.fn(),
      })

      // Alerts were never chosen on this browser (localStorage has no 'sosAlertsEnabled')
      mockSosAlertsChosen.mockReturnValue(false)

      const { unmount } = render(
        <Provider store={store}>
          <SosAlerts />
        </Provider>,
      )

      expect(mockPlaySosSound).not.toHaveBeenCalled()

      // Advance 10 s to trigger the ticker callback
      act(() => {
        jest.advanceTimersByTime(10_000)
      })

      // Must NOT call playSosSound when alerts were never chosen
      expect(mockPlaySosSound).not.toHaveBeenCalled()

      unmount()

      // Once alerts are chosen on this browser
      mockSosAlertsChosen.mockReturnValue(true)

      render(
        <Provider store={store}>
          <SosAlerts />
        </Provider>,
      )

      // Clear the immediate sound call triggered on mount for active incidents
      mockPlaySosSound.mockClear()

      act(() => {
        jest.advanceTimersByTime(10_000)
      })

      // Tick must call playSosSound when alerts are chosen
      expect(mockPlaySosSound).toHaveBeenCalledTimes(1)
    } finally {
      jest.useRealTimers()
    }
  })

  it('shows "SOS alerts off" badge and "Enable SOS alerts" button until alerts chosen, sound unlocked, and notifications granted', () => {
    const store = createTestStore('valid-token')
    mockUseGetCurrentSosQuery.mockReturnValue({
      data: [],
      refetch: jest.fn(),
    })

    mockSosAlertsChosen.mockReturnValue(false)
    mockSoundUnlocked.mockReturnValue(false)
    mockNotificationsAllowed.mockReturnValue(false)

    render(
      <Provider store={store}>
        <SosAlerts />
      </Provider>,
    )

    expect(screen.getByText('SOS alerts off')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Enable SOS alerts' })).toBeInTheDocument()
  })

  it('after a choice with sound still locked, the button reads "Turn SOS sound on"', () => {
    const store = createTestStore('valid-token')
    mockUseGetCurrentSosQuery.mockReturnValue({
      data: [],
      refetch: jest.fn(),
    })

    // Chosen is true, but sound is locked (audible false)
    mockSosAlertsChosen.mockReturnValue(true)
    mockSoundUnlocked.mockReturnValue(false)
    mockNotificationsAllowed.mockReturnValue(true)

    render(
      <Provider store={store}>
        <SosAlerts />
      </Provider>,
    )

    expect(screen.getByText('SOS alerts off')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Turn SOS sound on' })).toBeInTheDocument()
  })

  it('hides "SOS alerts off" badge and button once alerts chosen, sound unlocked, and notifications granted', () => {
    const store = createTestStore('valid-token')
    mockUseGetCurrentSosQuery.mockReturnValue({
      data: [],
      refetch: jest.fn(),
    })

    mockSosAlertsChosen.mockReturnValue(true)
    mockSoundUnlocked.mockReturnValue(true)
    mockNotificationsAllowed.mockReturnValue(true)

    render(
      <Provider store={store}>
        <SosAlerts />
      </Provider>,
    )

    expect(screen.queryByTestId('sos-alerts-off')).not.toBeInTheDocument()
  })

  it('with alerts chosen and sound unlocked but Notification.permission still default, "SOS alerts off" badge must still show', () => {
    const store = createTestStore('valid-token')
    mockUseGetCurrentSosQuery.mockReturnValue({
      data: [],
      refetch: jest.fn(),
    })

    // Alerts chosen and sound unlocked, but notification permission is 'default' (not blocked:
    // 'denied' has its own badge since the row 73 review, tested below)
    mockSosAlertsChosen.mockReturnValue(true)
    mockSoundUnlocked.mockReturnValue(true)
    mockNotificationsSupported.mockReturnValue(true)
    mockNotificationsAllowed.mockReturnValue(false)

    const { unmount } = render(
      <Provider store={store}>
        <SosAlerts />
      </Provider>,
    )

    // With permission not granted, the badge must still show
    expect(screen.getByTestId('sos-alerts-off')).toBeInTheDocument()
    expect(screen.getByText('SOS alerts off')).toBeInTheDocument()

    unmount()

    // With permission 'granted' (notificationsAllowed true) alongside chosen and unlocked, badge must not show
    mockNotificationsAllowed.mockReturnValue(true)

    render(
      <Provider store={store}>
        <SosAlerts />
      </Provider>,
    )

    expect(screen.queryByTestId('sos-alerts-off')).not.toBeInTheDocument()
  })

  it('clicking "Enable SOS alerts" triggers enableSosAlerts', async () => {
    const store = createTestStore('valid-token')
    mockUseGetCurrentSosQuery.mockReturnValue({
      data: [],
      refetch: jest.fn(),
    })

    mockSosAlertsChosen.mockReturnValue(false)
    mockSoundUnlocked.mockReturnValue(false)

    render(
      <Provider store={store}>
        <SosAlerts />
      </Provider>,
    )

    const btn = screen.getByRole('button', { name: 'Enable SOS alerts' })
    // async on purpose: act then waits for the click's promises (enableSosAlerts) to settle.
    // eslint-disable-next-line @typescript-eslint/require-await
    await act(async () => {
      fireEvent.click(btn)
    })

    expect(mockEnableSosAlerts).toHaveBeenCalledTimes(1)
  })

  // ---- Row 73 review fixes ----

  const renderAlerts = (store = createTestStore('valid-token')) => {
    const view = render(
      <Provider store={store}>
        <SosAlerts />
      </Provider>,
    )
    const rerender = () =>
      view.rerender(
        <Provider store={store}>
          <SosAlerts />
        </Provider>,
      )
    return { ...view, rerender }
  }

  describe('a failed poll is said in words (Major)', () => {
    // 10:05 UTC on 3 Nov 2026 is 12:05 in Athens (EET, UTC+2), and 05:05 in New York.
    const lastSuccess = Date.UTC(2026, 10, 3, 10, 5)

    // The browser is somewhere else: the time shown must still be Athens time. Jest's sandbox
    // ignores a change to process.env.TZ, and this machine itself runs on Athens time, so the
    // browser's zone is simulated: every date formatter given no timeZone formats in New York.
    const BROWSER_ZONE = 'America/New_York'
    const originals = {
      toLocaleTimeString: Date.prototype.toLocaleTimeString,
      toLocaleString: Date.prototype.toLocaleString,
      toLocaleDateString: Date.prototype.toLocaleDateString,
      DateTimeFormat: Intl.DateTimeFormat,
    }
    const inBrowserZone = (options?: Intl.DateTimeFormatOptions) => ({ timeZone: BROWSER_ZONE, ...options })
    // Only these spies are undone afterwards, never the module mocks above.
    let spies: jest.SpyInstance[] = []

    beforeEach(() => {
      spies = []
      for (const name of ['toLocaleTimeString', 'toLocaleString', 'toLocaleDateString'] as const) {
        const original = originals[name]
        // Typed as the original so it fits every overload of the method it replaces.
        const zoned = function (this: Date, locales?: Intl.LocalesArgument, options?: Intl.DateTimeFormatOptions) {
          return original.call(this, locales, inBrowserZone(options))
        } as typeof original
        spies.push(jest.spyOn(Date.prototype, name).mockImplementation(zoned))
      }
      spies.push(
        jest
          .spyOn(Intl, 'DateTimeFormat')
          .mockImplementation(
            (locales?: string | string[], options?: Intl.DateTimeFormatOptions) =>
              new originals.DateTimeFormat(locales, inBrowserZone(options)),
          ),
      )
    })

    afterEach(() => {
      for (const spy of spies) spy.mockRestore()
    })

    it('after an earlier success, says since when (Athens time, not the browser zone)', () => {
      mockUseGetCurrentSosQuery.mockReturnValue({
        data: [],
        refetch: jest.fn(),
        isError: true,
        fulfilledTimeStamp: lastSuccess,
      })

      renderAlerts()

      expect(
        screen.getByText('No contact with the server since 12:05. SOS alerts may be late.'),
      ).toBeInTheDocument()
      expect(screen.queryByText(/05:05/)).not.toBeInTheDocument()
    })

    it('with no success ever, says the server cannot be reached', () => {
      mockUseGetCurrentSosQuery.mockReturnValue({
        data: undefined,
        refetch: jest.fn(),
        isError: true,
        fulfilledTimeStamp: undefined,
      })

      renderAlerts()

      expect(screen.getByText('Cannot reach the server. SOS alerts may be late.')).toBeInTheDocument()
    })

    it('the message goes away when the next ask succeeds', () => {
      mockUseGetCurrentSosQuery.mockReturnValue({
        data: [activeIncident],
        refetch: jest.fn(),
        isError: true,
        fulfilledTimeStamp: lastSuccess,
      })
      const { rerender } = renderAlerts()
      expect(screen.getByText(/No contact with the server since/)).toBeInTheDocument()

      mockUseGetCurrentSosQuery.mockReturnValue({
        data: [activeIncident],
        refetch: jest.fn(),
        isError: false,
        fulfilledTimeStamp: lastSuccess + 10_000,
      })
      rerender()

      expect(screen.queryByText(/No contact with the server/)).not.toBeInTheDocument()
      expect(screen.queryByText(/Cannot reach the server/)).not.toBeInTheDocument()
      // The banners themselves stay.
      expect(screen.getByRole('link', { name: /SOS: Nikos Kazantzakis/ })).toBeInTheDocument()
    })

    it('no message while the query succeeds', () => {
      mockUseGetCurrentSosQuery.mockReturnValue({
        data: [],
        refetch: jest.fn(),
        isError: false,
        fulfilledTimeStamp: lastSuccess,
      })

      renderAlerts()

      expect(screen.queryByTestId('sos-unreachable')).not.toBeInTheDocument()
    })
  })

  it("with alerts chosen, sound on and notifications denied: a 'blocked' badge, no button, no 'SOS alerts off'", () => {
    mockUseGetCurrentSosQuery.mockReturnValue({ data: [], refetch: jest.fn() })
    mockSosAlertsChosen.mockReturnValue(true)
    mockSoundUnlocked.mockReturnValue(true)
    mockNotificationsSupported.mockReturnValue(true)
    mockNotificationsAllowed.mockReturnValue(false)
    mockNotificationsBlocked.mockReturnValue(true)

    renderAlerts()

    expect(screen.getByTestId('sos-notifications-blocked')).toHaveTextContent(
      'Notifications blocked in this browser',
    )
    expect(screen.queryByRole('button', { name: 'Enable SOS alerts' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(screen.queryByText('SOS alerts off')).not.toBeInTheDocument()
  })

  it('the banners are an assertive live region announcing additions only, each a plain link', () => {
    mockUseGetCurrentSosQuery.mockReturnValue({
      data: [activeIncident, safeIncident],
      refetch: jest.fn(),
    })

    renderAlerts()

    const list = screen.getByTestId('sos-banners')
    expect(list).toHaveAttribute('aria-live', 'assertive')
    expect(list).toHaveAttribute('aria-relevant', 'additions')

    const links = screen.getAllByRole('link')
    expect(links).toHaveLength(2)
    for (const link of links) {
      expect(link).not.toHaveAttribute('role')
    }
    expect(screen.queryAllByRole('alert')).toHaveLength(0)
  })

  describe('notifications for a new active SOS', () => {
    it('notifies when a new active id appears, not again for the same ids, nor for an awaiting-close one', () => {
      mockSosAlertsChosen.mockReturnValue(true)
      mockSoundUnlocked.mockReturnValue(true)
      mockUseGetCurrentSosQuery.mockReturnValue({ data: [activeIncident], refetch: jest.fn() })

      const { rerender } = renderAlerts()
      expect(mockNotifyNewSos).toHaveBeenCalledTimes(1)

      // The next poll: the same incident, a new array of new objects (as RTK Query gives).
      mockUseGetCurrentSosQuery.mockReturnValue({ data: [{ ...activeIncident }], refetch: jest.fn() })
      rerender()
      expect(mockNotifyNewSos).toHaveBeenCalledTimes(1)

      // An awaiting-close one joins: still no new notification.
      mockUseGetCurrentSosQuery.mockReturnValue({ data: [{ ...activeIncident }, safeIncident], refetch: jest.fn() })
      rerender()
      expect(mockNotifyNewSos).toHaveBeenCalledTimes(1)

      // A second rider presses SOS: a notification.
      const second = { ...activeIncident, id: 'sos-9', courier: { id: 'c-9', firstName: 'Eleni', lastName: 'M' } }
      mockUseGetCurrentSosQuery.mockReturnValue({
        data: [{ ...activeIncident }, safeIncident, second],
        refetch: jest.fn(),
      })
      rerender()
      expect(mockNotifyNewSos).toHaveBeenCalledTimes(2)
      expect(mockNotifyNewSos.mock.calls[1][0].map((i: SosIncidentAdminDto) => i.id)).toContain('sos-9')
    })

    it('does not notify for awaiting-close incidents alone', () => {
      mockSosAlertsChosen.mockReturnValue(true)
      mockSoundUnlocked.mockReturnValue(true)
      mockUseGetCurrentSosQuery.mockReturnValue({ data: [safeIncident, falseAlarmIncident], refetch: jest.fn() })

      renderAlerts()

      expect(mockNotifyNewSos).not.toHaveBeenCalled()
    })
  })

  describe('sound after a reload', () => {
    it('with alerts chosen and sound locked, a click anywhere unlocks it', async () => {
      mockSosAlertsChosen.mockReturnValue(true)
      mockSoundUnlocked.mockReturnValue(false)
      mockNotificationsAllowed.mockReturnValue(true)
      mockUseGetCurrentSosQuery.mockReturnValue({ data: [], refetch: jest.fn() })

      renderAlerts()
      expect(screen.getByRole('button', { name: 'Turn SOS sound on' })).toBeInTheDocument()

      // eslint-disable-next-line @typescript-eslint/require-await
      await act(async () => {
        fireEvent.click(document.body)
      })

      expect(mockUnlockSound).toHaveBeenCalledTimes(1)
      await waitFor(() => {
        expect(screen.queryByTestId('sos-alerts-off')).not.toBeInTheDocument()
      })
    })

    it('when alerts were never chosen, a click elsewhere unlocks nothing', async () => {
      mockSosAlertsChosen.mockReturnValue(false)
      mockUseGetCurrentSosQuery.mockReturnValue({ data: [], refetch: jest.fn() })

      renderAlerts()
      // eslint-disable-next-line @typescript-eslint/require-await
      await act(async () => {
        fireEvent.click(document.body)
      })

      expect(mockUnlockSound).not.toHaveBeenCalled()
    })
  })

  it('stops the 10 s ticker when it leaves the page', () => {
    jest.useFakeTimers()
    try {
      const refetch = jest.fn()
      mockUseGetCurrentSosQuery.mockReturnValue({ data: [], refetch })

      const { unmount } = renderAlerts()
      act(() => {
        jest.advanceTimersByTime(10_000)
      })
      expect(refetch).toHaveBeenCalledTimes(1)

      unmount()
      act(() => {
        jest.advanceTimersByTime(60_000)
      })
      expect(refetch).toHaveBeenCalledTimes(1)
    } finally {
      jest.useRealTimers()
    }
  })
})
