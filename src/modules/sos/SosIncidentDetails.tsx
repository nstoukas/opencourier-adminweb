import { useGetSosIncidentQuery } from '@/api/sosApi'
import { PageHeader } from '@/components/layouts/PageHeader'
import { useFormat } from '@/i18n/useFormat'
import { Button, DetailList, Spinner } from '../../admin-web-components'
import { CheckCircle } from '@phosphor-icons/react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CloseSosDialog } from './CloseSosDialog'
import { SosEmergencyContact } from './SosEmergencyContact'
import { riderName } from './sosAlerts'
import { closedByName, outcomeLabel, riderEnd, sosTime } from './sosDisplay'
import { SosStateBadge } from './SosStateBadge'

// Leaflet needs `window`, so the map loads only in the browser.
const SosTrailMap = dynamic(() => import('./SosTrailMap'), {
  ssr: false,
  loading: () => <div className="h-[420px] w-full animate-pulse rounded-lg bg-muted" />,
})

// While an SOS is active its trail grows: ask again every 10 s, like the banner.
const ACTIVE_POLL_MS = 10_000

// Spec 0022 (AC-9, AC-10): one SOS. Who, when, how it ended, the trail while its points exist, and
// the close.
export function SosIncidentDetails({ incidentId }: { incidentId: string }) {
  // useTranslation gives t, which looks a key up in the reader's language; useFormat gives times in it.
  const { t } = useTranslation()
  const f = useFormat()
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const [closeOpen, setCloseOpen] = useState(false)
  const query = useGetSosIncidentQuery({ id: incidentId }, { skip: incidentId === '' })
  // `currentData`: never the previous incident's while the next one loads (adminweb AGENTS.md).
  const incident = query.currentData
  const active = incident?.state === 'ACTIVE'
  // Asked again every 10 s until it is closed: the trail grows while it is active, and an awaiting
  // close one may be closed by another admin or tab (row 73 review). A second subscription to the
  // same incident, because the interval depends on the first one's answer; RTK Query polls at the
  // shortest interval among subscribers, and stops when this one is skipped.
  const polling = !!incident && incident.state !== 'CLOSED'
  useGetSosIncidentQuery(
    { id: incidentId },
    { skip: incidentId === '' || !polling, pollingInterval: polling ? ACTIVE_POLL_MS : 0 },
  )

  if (query.isError) {
    return (
      <>
        <PageHeader title="SOS" />
        <p role="alert" className="text-sm text-destructive">
          {t('sos.details.loadFailed')}{' '}
          <Link href="/sos" className="underline">
            {t('sos.details.back')}
          </Link>
        </p>
      </>
    )
  }
  if (!incident) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Spinner className="h-4 w-4" /> {t('common.loading')}
      </div>
    )
  }

  const name = riderName(incident)
  const open = incident.state !== 'CLOSED'
  const firstPoint = incident.points[0]
  const lastPoint = incident.points[incident.points.length - 1]

  return (
    <>
      <PageHeader
        title={t('sos.titleNamed', { name })}
        action={
          // The header's description is a <p>, which a badge (a <div>) may not sit in: it goes here.
          <>
            <SosStateBadge state={incident.state} />
            {open ? (
              <Button ref={closeButtonRef} type="button" variant="destructive" onClick={() => setCloseOpen(true)}>
                <CheckCircle aria-hidden="true" className="mr-2 h-4 w-4" />
                {t('sos.details.close')}
              </Button>
            ) : null}
          </>
        }
      />
      <CloseSosDialog
        open={closeOpen}
        onOpenChange={setCloseOpen}
        incidentId={incident.id}
        riderName={name}
        active={active}
        riderOutcome={incident.falseAlarmAt ? 'FALSE_ALARM' : incident.safeAt ? 'RIDER_SAFE' : null}
        returnFocusTo={closeButtonRef}
      />

      {/* Row 123: who to call, first on the page while the SOS is open (above the map, so a narrow
          window shows it without scrolling). Once closed it is gone: it is the contact as it is now,
          not as it was during the SOS. */}
      {open ? <SosEmergencyContact courierId={incident.courier.id} /> : null}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_360px]">
        <section aria-labelledby="sos-trail" className="flex flex-col gap-2">
          <h2 id="sos-trail" className="text-lg font-semibold">
            {t('sos.details.trailTitle')}
          </h2>
          {firstPoint && lastPoint ? (
            <>
              <SosTrailMap points={incident.points} />
              <p className="text-xs text-muted-foreground">
                {t('sos.details.positions', {
                  count: incident.points.length,
                  from: sosTime(f, firstPoint.recordedAt),
                  to: sosTime(f, lastPoint.recordedAt),
                })}
                {active ? ` ${t('sos.details.updates')}` : ''}
              </p>
            </>
          ) : (
            <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
              {incident.pointsDeletedAt
                ? t('sos.details.pointsDeleted', { time: sosTime(f, incident.pointsDeletedAt) })
                : t('sos.details.noPoints')}
            </p>
          )}
        </section>

        <section aria-labelledby="sos-facts" className="flex flex-col gap-2">
          <h2 id="sos-facts" className="text-lg font-semibold">
            {t('sos.details.record')}
          </h2>
          <DetailList
            items={[
              {
                label: t('sos.details.rider'),
                value: (
                  <Link className="underline" href={`/couriers/${incident.courier.id}`}>
                    {name}
                  </Link>
                ),
              },
              { label: t('sos.details.started'), value: sosTime(f, incident.startedAt) },
              {
                label: t('sos.details.jobHeld'),
                value: incident.deliveryId ? (
                  <Link className="underline" href={`/deliveries/${incident.deliveryId}`}>
                    {t('sos.details.openDelivery')}
                  </Link>
                ) : null,
              },
              { label: t('sos.details.riderEnded'), value: riderEnd(incident, t, f) },
              { label: t('sos.details.closed'), value: incident.closedAt ? sosTime(f, incident.closedAt) : null },
              { label: t('sos.details.closedBy'), value: closedByName(incident, t) },
              { label: t('sos.details.outcome'), value: incident.outcome ? outcomeLabel(incident.outcome, t) : null },
              { label: t('sos.details.note'), value: incident.note },
            ]}
          />
        </section>
      </div>
    </>
  )
}
