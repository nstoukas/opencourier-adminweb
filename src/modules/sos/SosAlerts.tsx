import { useGetCurrentSosQuery } from '@/api/sosApi'
import { selectAccessToken } from '@/modules/auth/slices/authSlice'
import { useSelector } from 'react-redux'
import { useNow } from '@/hooks/useNow'
import type { SosIncidentAdminDto } from '@/backend-admin-sdk'
import { Button } from '../../admin-web-components'
import { cn } from '../../ui-shared-utils'
import { BellSlash, Siren } from '@phosphor-icons/react'
import Link from 'next/link'
// The router singleton, not the hook: it is only needed when a notification is clicked.
import Router from 'next/router'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { bannerText } from './sosDisplay'
import {
  enableSosAlerts,
  notificationsAllowed,
  notificationsSupported,
  notifyNewSos,
  playSosSound,
  sosAlertsChosen,
  soundUnlocked,
  startSosTicker,
  unlockSound,
} from './sosAlerts'

// The path of one incident's page.
const incidentPath = (id: string) => `/sos/${encodeURIComponent(id)}`

// Spec 0022 (AC-8): on top of every admin page. Asks the backend for active and awaiting close SOS
// incidents every 10 s, in a background tab too, and shows one red banner each. An active one also
// plays a sound on every poll and raises one browser notification, once "Enable SOS alerts" was
// clicked on this browser.
export function SosAlerts() {
  // Only while signed in: after Sign Out nothing asks the backend again.
  const signedIn = !!useSelector(selectAccessToken)
  const { data, refetch } = useGetCurrentSosQuery(undefined, { skip: !signedIn })
  const incidents = data ?? []
  const now = useNow(10_000)

  // Whether the admin turned alerts on here, and whether the browser lets this page play sound
  // right now (it locks it again after every reload, until the next click).
  const [chosen, setChosen] = useState(false)
  const [audible, setAudible] = useState(false)
  useEffect(() => {
    setChosen(sosAlertsChosen())
    setAudible(soundUnlocked())
  }, [])

  // The newest list, read by the ticker without restarting it.
  const latest = useRef<SosIncidentAdminDto[]>([])
  latest.current = incidents
  const chosenRef = useRef(chosen)
  chosenRef.current = chosen

  const open = useCallback((id: string) => void Router.push(incidentPath(id)), [])

  // Every 10 s: ask again, and sound the alarm while any SOS is active.
  useEffect(() => {
    if (!signedIn) return
    return startSosTicker(() => {
      void refetch()
      if (chosenRef.current && latest.current.some((incident) => incident.state === 'ACTIVE')) {
        playSosSound()
      }
    })
  }, [refetch, signedIn])

  // A new active SOS: a notification, and the sound at once rather than at the next tick.
  const activeIds = incidents
    .filter((incident) => incident.state === 'ACTIVE')
    .map((incident) => incident.id)
    .join(',')
  useEffect(() => {
    if (!chosen || activeIds === '') return
    notifyNewSos(latest.current, open)
    playSosSound()
  }, [activeIds, chosen, open])

  // After a reload the sound stays locked until the admin clicks anywhere: unlock it then.
  useEffect(() => {
    if (!chosen || audible) return
    const onClick = () => {
      void unlockSound().then(setAudible)
    }
    document.addEventListener('click', onClick)
    return () => document.removeEventListener('click', onClick)
  }, [chosen, audible])

  const onEnable = async () => {
    await enableSosAlerts()
    setChosen(true)
    setAudible(soundUnlocked())
  }

  const alertsOff = !chosen || !audible || (notificationsSupported() && !notificationsAllowed())

  return (
    <div className="flex flex-col gap-2 px-4 pt-4 sm:px-6 empty:hidden">
      {alertsOff && (
        <div className="flex flex-wrap items-center justify-end gap-2" data-testid="sos-alerts-off">
          <span className="inline-flex items-center gap-1 rounded-full bg-destructive px-2.5 py-0.5 text-xs font-semibold text-destructive-foreground">
            <BellSlash size={14} aria-hidden="true" weight="bold" />
            SOS alerts off
          </span>
          <Button size="sm" variant="outline" onClick={onEnable}>
            {chosen && !audible ? 'Turn SOS sound on' : 'Enable SOS alerts'}
          </Button>
        </div>
      )}
      {incidents.length > 0 && (
        <ul className="flex flex-col gap-2" aria-label="Riders' SOS" data-testid="sos-banners">
          {incidents.map((incident) => {
            const active = incident.state === 'ACTIVE'
            return (
              <li key={incident.id}>
                <Link
                  href={incidentPath(incident.id)}
                  role="alert"
                  className={cn(
                    'flex items-center gap-3 rounded-md px-4 py-3 text-sm font-semibold shadow-sm',
                    active
                      ? 'bg-destructive text-destructive-foreground'
                      : 'border border-destructive bg-destructive/10 text-destructive',
                  )}
                >
                  <Siren size={20} aria-hidden="true" weight="fill" className={active ? 'animate-pulse' : undefined} />
                  <span className="flex-1">{bannerText(incident, now)}</span>
                  <span className="text-xs font-normal underline">Open</span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
