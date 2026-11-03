import {
  enableSosAlerts,
  notificationsBlocked,
  notifyNewSos,
  riderName,
  sosAlertsChosen,
  startSosTicker,
  soundUnlocked,
} from './sosAlerts'
import type { SosIncidentAdminDto } from '@/backend-admin-sdk'

describe('sosAlerts (spec 0022, AC-8)', () => {
  const originalLocalStorage = window.localStorage
  let mockStorage: Record<string, string> = {}

  beforeEach(() => {
    mockStorage = {}
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn((key: string) => mockStorage[key] ?? null),
        setItem: jest.fn((key: string, val: string) => {
          mockStorage[key] = String(val)
        }),
        removeItem: jest.fn((key: string) => {
          delete mockStorage[key]
        }),
        clear: jest.fn(() => {
          mockStorage = {}
        }),
      },
      writable: true,
      configurable: true,
    })
  })

  afterAll(() => {
    Object.defineProperty(window, 'localStorage', {
      value: originalLocalStorage,
      writable: true,
      configurable: true,
    })
  })

  describe('sosAlertsChosen', () => {
    it("returns true only when localStorage 'sosAlertsEnabled' === '1'", () => {
      expect(sosAlertsChosen()).toBe(false)

      mockStorage['sosAlertsEnabled'] = '1'
      expect(sosAlertsChosen()).toBe(true)

      mockStorage['sosAlertsEnabled'] = '0'
      expect(sosAlertsChosen()).toBe(false)
    })

    it('returns false when localStorage throws (private window or blocked storage)', () => {
      (window.localStorage.getItem as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Access denied to storage')
      })
      expect(sosAlertsChosen()).toBe(false)
    })
  })

  describe('enableSosAlerts', () => {
    let mockResume: jest.Mock
    let mockRequestPermission: jest.Mock
    const originalNotification = window.Notification

    beforeEach(() => {
      mockResume = jest.fn().mockResolvedValue(undefined)
      const mockAudioCtx = jest.fn().mockImplementation(() => ({
        state: 'running',
        resume: mockResume,
        currentTime: 0,
        createOscillator: jest.fn().mockReturnValue({
          type: 'square',
          frequency: { setValueAtTime: jest.fn() },
          connect: jest.fn().mockReturnThis(),
          start: jest.fn(),
          stop: jest.fn(),
        }),
        createGain: jest.fn().mockReturnValue({
          gain: {
            setValueAtTime: jest.fn(),
            exponentialRampToValueAtTime: jest.fn(),
          },
          connect: jest.fn().mockReturnThis(),
        }),
        destination: {},
      }))
      ;(window as any).AudioContext = mockAudioCtx

      mockRequestPermission = jest.fn().mockResolvedValue('granted')
      ;(window as any).Notification = {
        permission: 'default',
        requestPermission: mockRequestPermission,
      }
    })

    afterEach(() => {
      (window as any).Notification = originalNotification
    })

    it("stores choice '1' in localStorage and unlocks sound", async () => {
      await enableSosAlerts()

      expect(window.localStorage.setItem).toHaveBeenCalledWith('sosAlertsEnabled', '1')
      expect(mockResume).toHaveBeenCalled()
      expect(soundUnlocked()).toBe(true)
    })

    it("asks Notification.requestPermission only when permission is 'default'", async () => {
      (window as any).Notification.permission = 'default'
      await enableSosAlerts()
      expect(mockRequestPermission).toHaveBeenCalledTimes(1)

      mockRequestPermission.mockClear()
      ;(window as any).Notification.permission = 'granted'
      await enableSosAlerts()
      expect(mockRequestPermission).not.toHaveBeenCalled()

      mockRequestPermission.mockClear()
      ;(window as any).Notification.permission = 'denied'
      await enableSosAlerts()
      expect(mockRequestPermission).not.toHaveBeenCalled()
    })

    it('handles localStorage throwing on setItem without crashing', async () => {
      (window.localStorage.setItem as jest.Mock).mockImplementationOnce(() => {
        throw new Error('QuotaExceeded')
      })
      await expect(enableSosAlerts()).resolves.toBeUndefined()
    })
  })

  describe('notifyNewSos', () => {
    let mockNotificationInstances: any[] = []
    let mockNotificationConstructor: jest.Mock
    const originalNotification = window.Notification

    const activeIncident: SosIncidentAdminDto = {
      id: 'sos-act-1',
      state: 'ACTIVE',
      courier: { id: 'c-1', firstName: 'Giorgos', lastName: 'Oikonomou' },
      deliveryId: null,
      startedAt: '2026-11-03T01:00:00Z',
      createdAt: '2026-11-03T01:00:00Z',
      safeAt: null,
      falseAlarmAt: null,
      closedAt: null,
      closedBy: null,
      outcome: null,
      note: null,
      pointsDeletedAt: null,
    }

    const awaitingCloseIncident: SosIncidentAdminDto = {
      id: 'sos-await-2',
      state: 'AWAITING_CLOSE',
      courier: { id: 'c-2', firstName: 'Elena', lastName: 'Dimitriou' },
      deliveryId: null,
      startedAt: '2026-11-03T00:50:00Z',
      createdAt: '2026-11-03T00:50:00Z',
      safeAt: '2026-11-03T01:00:00Z',
      falseAlarmAt: null,
      closedAt: null,
      closedBy: null,
      outcome: null,
      note: null,
      pointsDeletedAt: null,
    }

    beforeEach(() => {
      mockNotificationInstances = []
      mockNotificationConstructor = jest.fn().mockImplementation(function (title: string, options: any) {
        const instance = {
          title,
          options,
          onclick: null as any,
          close: jest.fn(),
        }
        mockNotificationInstances.push(instance)
        return instance
      })
      ;(mockNotificationConstructor as any).permission = 'granted'
      ;(mockNotificationConstructor as any).requestPermission = jest.fn()
      ;(window as any).Notification = mockNotificationConstructor
    })

    afterEach(() => {
      (window as any).Notification = originalNotification
    })

    it("emits one notification per ACTIVE incident not yet notified with tag 'sos-<id>' and title 'SOS: <name>'", () => {
      const onOpen = jest.fn()
      notifyNewSos([activeIncident], onOpen)

      expect(mockNotificationConstructor).toHaveBeenCalledTimes(1)
      expect(mockNotificationConstructor).toHaveBeenCalledWith(
        'SOS: Giorgos Oikonomou',
        expect.objectContaining({
          tag: 'sos-sos-act-1',
          requireInteraction: true,
        }),
      )
    })

    it('emits NO notification for AWAITING_CLOSE incidents', () => {
      const onOpen = jest.fn()
      notifyNewSos([awaitingCloseIncident], onOpen)

      expect(mockNotificationConstructor).not.toHaveBeenCalled()
    })

    it("emits NO notification for an id already in localStorage 'sosNotifiedIds'", () => {
      mockStorage['sosNotifiedIds'] = JSON.stringify(['sos-act-1'])
      const onOpen = jest.fn()

      notifyNewSos([activeIncident], onOpen)
      expect(mockNotificationConstructor).not.toHaveBeenCalled()
    })

    it('the stored list keeps only ids still open', () => {
      // Previous storage had 'sos-closed-old' and 'sos-act-1'
      mockStorage['sosNotifiedIds'] = JSON.stringify(['sos-closed-old', 'sos-act-1'])
      const onOpen = jest.fn()

      // Active list only has 'sos-act-1' and a new one 'sos-act-3'
      const newActive: SosIncidentAdminDto = {
        ...activeIncident,
        id: 'sos-act-3',
        courier: { id: 'c-3', firstName: 'Dimitris', lastName: 'K' },
      }

      notifyNewSos([activeIncident, newActive], onOpen)

      // Only 'sos-act-3' was notified since 'sos-act-1' was already notified
      expect(mockNotificationConstructor).toHaveBeenCalledTimes(1)
      expect(mockNotificationConstructor).toHaveBeenCalledWith(
        'SOS: Dimitris K',
        expect.anything(),
      )

      // The saved notified list should keep only still-open ones ('sos-act-1' and 'sos-act-3'), pruning 'sos-closed-old'
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      const saved = JSON.parse(mockStorage['sosNotifiedIds'] ?? '[]')
      expect(saved).toContain('sos-act-1')
      expect(saved).toContain('sos-act-3')
      expect(saved).not.toContain('sos-closed-old')
    })

    it('does nothing when permission is not granted', () => {
      (window as any).Notification.permission = 'default'
      const onOpen = jest.fn()

      notifyNewSos([activeIncident], onOpen)
      expect(mockNotificationConstructor).not.toHaveBeenCalled()
    })

    it('clicking a notification calls window.focus(), onOpen(id), and notification.close()', () => {
      const onOpen = jest.fn()
      const focusSpy = jest.spyOn(window, 'focus').mockImplementation(() => {})

      notifyNewSos([activeIncident], onOpen)
      expect(mockNotificationInstances).toHaveLength(1)

      const notif = mockNotificationInstances[0]
      notif.onclick()

      expect(focusSpy).toHaveBeenCalled()
      expect(onOpen).toHaveBeenCalledWith('sos-act-1')
      expect(notif.close).toHaveBeenCalled()

      focusSpy.mockRestore()
    })

    it('no notification body or title contains a coordinate (AC-13)', () => {
      const onOpen = jest.fn()
      notifyNewSos([activeIncident], onOpen)

      const [title, options] = mockNotificationConstructor.mock.calls[0]
      const body = options?.body ?? ''

      // Coordinate patterns (latitude/longitude coordinates, e.g. 39.3622, 22.9425)
      const coordinateRegex = /\b\d{1,3}\.\d{3,}\b/
      expect(title).not.toMatch(coordinateRegex)
      expect(body).not.toMatch(coordinateRegex)
      expect(body.toLowerCase()).not.toContain('lat')
      expect(body.toLowerCase()).not.toContain('lon')
    })
  })

  describe('startSosTicker fallback with fake timers', () => {
    beforeEach(() => {
      jest.useFakeTimers()
    })

    afterEach(() => {
      jest.useRealTimers()
    })

    it('polls after 10 s, none before, and clears interval on cleanup', () => {
      // Ensure Worker is undefined to exercise the setInterval fallback
      const originalWorker = (window as any).Worker
      delete (window as any).Worker

      try {
        const onTick = jest.fn()
        const stop = startSosTicker(onTick)

        expect(onTick).not.toHaveBeenCalled()

        // Advance 9,999 ms -> none before 10 s
        jest.advanceTimersByTime(9_999)
        expect(onTick).not.toHaveBeenCalled()

        // Advance 1 ms (total 10,000 ms) -> exactly one call
        jest.advanceTimersByTime(1)
        expect(onTick).toHaveBeenCalledTimes(1)

        // Advance another 10,000 ms -> second call
        jest.advanceTimersByTime(10_000)
        expect(onTick).toHaveBeenCalledTimes(2)

        // Stop ticker
        stop()

        // Advance another 20,000 ms -> no more calls
        jest.advanceTimersByTime(20_000)
        expect(onTick).toHaveBeenCalledTimes(2)
      } finally {
        if (originalWorker) (window as any).Worker = originalWorker
      }
    })
  })

  describe('riderName', () => {
    it("joins firstName and lastName trimmed", () => {
      expect(riderName({ courier: { id: 'c-1', firstName: 'Kostas', lastName: 'Papadopoulos' } })).toBe(
        'Kostas Papadopoulos',
      )
      expect(riderName({ courier: { id: 'c-2', firstName: ' Anna', lastName: 'V ' } })).toBe('Anna V')
    })
  })

  // Row 73 review: Safari shows the notification question only when it is asked straight from the
  // click, so it must be asked before anything is awaited (here, before the sound unlock finishes).
  describe('enableSosAlerts asks for notifications inside the click', () => {
    const originalNotification = window.Notification
    let finishResume: () => void
    let mockResume: jest.Mock
    let mockRequestPermission: jest.Mock
    // A fresh copy of the module each test, so its one AudioContext is this test's.
    let fresh: typeof import('./sosAlerts')

    beforeEach(() => {
      mockResume = jest.fn(
        () =>
          new Promise<void>((resolve) => {
            finishResume = resolve
          }),
      )
      ;(window as any).AudioContext = jest.fn().mockImplementation(() => ({ state: 'running', resume: mockResume }))
      mockRequestPermission = jest.fn().mockResolvedValue('granted')
      ;(window as any).Notification = { permission: 'default', requestPermission: mockRequestPermission }
      jest.isolateModules(() => {
        fresh = jest.requireActual('./sosAlerts')
      })
    })

    afterEach(() => {
      (window as any).Notification = originalNotification
    })

    it('calls Notification.requestPermission synchronously, before the sound unlock resolves', async () => {
      const done = fresh.enableSosAlerts()

      // Nothing awaited yet: the click's own call stack has just returned.
      expect(mockRequestPermission).toHaveBeenCalledTimes(1)
      expect(mockResume).toHaveBeenCalledTimes(1)

      finishResume()
      await done
      expect(mockRequestPermission).toHaveBeenCalledTimes(1)
    })

    it('does not ask when permission is already granted or denied', async () => {
      for (const permission of ['granted', 'denied']) {
        (window as any).Notification.permission = permission
        const done = fresh.enableSosAlerts()
        finishResume()
        await done
      }
      expect(mockRequestPermission).not.toHaveBeenCalled()
    })

    it('a refused or failing question still lets the sound unlock finish', async () => {
      mockRequestPermission.mockRejectedValue(new Error('refused'))
      const done = fresh.enableSosAlerts()
      finishResume()
      await expect(done).resolves.toBeUndefined()
    })
  })

  describe('notificationsBlocked', () => {
    const originalNotification = window.Notification

    afterEach(() => {
      (window as any).Notification = originalNotification
    })

    it("is true only when Notification.permission is 'denied'", () => {
      (window as any).Notification = { permission: 'denied', requestPermission: jest.fn() }
      expect(notificationsBlocked()).toBe(true)
      ;(window as any).Notification.permission = 'default'
      expect(notificationsBlocked()).toBe(false)
      ;(window as any).Notification.permission = 'granted'
      expect(notificationsBlocked()).toBe(false)
    })

    it('is false in a browser without notifications', () => {
      delete (window as any).Notification
      expect(notificationsBlocked()).toBe(false)
    })
  })
})
