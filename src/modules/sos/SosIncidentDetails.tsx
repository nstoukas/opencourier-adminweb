import { useGetSosIncidentQuery } from '@/api/sosApi'
import { PageHeader } from '@/components/layouts/PageHeader'
import { athensDateTime } from '@/modules/dispatch-stop/dispatchStopDisplay'
import { Button, DetailList, Spinner } from '../../admin-web-components'
import { CheckCircle } from '@phosphor-icons/react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useRef, useState } from 'react'
import { CloseSosDialog } from './CloseSosDialog'
import { riderName } from './sosAlerts'
import { SOS_OUTCOME_LABELS, closedByName, riderEnd } from './sosDisplay'
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
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const [closeOpen, setCloseOpen] = useState(false)
  const query = useGetSosIncidentQuery({ id: incidentId }, { skip: incidentId === '' })
  // `currentData`: never the previous incident's while the next one loads (adminweb AGENTS.md).
  const incident = query.currentData
  const active = incident?.state === 'ACTIVE'
  useGetSosIncidentQuery(
    { id: incidentId },
    { skip: incidentId === '' || !active, pollingInterval: active ? ACTIVE_POLL_MS : 0 },
  )

  if (query.isError) {
    return (
      <>
        <PageHeader title="SOS" />
        <p role="alert" className="text-sm text-destructive">
          This SOS could not be loaded. <Link href="/sos" className="underline">Back to SOS</Link>
        </p>
      </>
    )
  }
  if (!incident) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Spinner className="h-4 w-4" /> Loading…
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
        title={`SOS: ${name}`}
        action={
          // The header's description is a <p>, which a badge (a <div>) may not sit in: it goes here.
          <>
            <SosStateBadge state={incident.state} />
            {open ? (
              <Button ref={closeButtonRef} type="button" variant="destructive" onClick={() => setCloseOpen(true)}>
                <CheckCircle aria-hidden="true" className="mr-2 h-4 w-4" />
                Close SOS
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
        returnFocusTo={closeButtonRef}
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_360px]">
        <section aria-labelledby="sos-trail" className="flex flex-col gap-2">
          <h2 id="sos-trail" className="text-lg font-semibold">
            Where the rider was
          </h2>
          {firstPoint && lastPoint ? (
            <>
              <SosTrailMap points={incident.points} />
              <p className="text-xs text-muted-foreground">
                {incident.points.length} positions from {athensDateTime(firstPoint.recordedAt)} to{' '}
                {athensDateTime(lastPoint.recordedAt)}
                {active ? '. Updates every 10 s while the SOS is active.' : '.'}
              </p>
            </>
          ) : (
            <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
              {incident.pointsDeletedAt
                ? `Location points deleted (${athensDateTime(incident.pointsDeletedAt)}).`
                : 'No location points recorded.'}
            </p>
          )}
        </section>

        <section aria-labelledby="sos-facts" className="flex flex-col gap-2">
          <h2 id="sos-facts" className="text-lg font-semibold">
            The record
          </h2>
          <DetailList
            items={[
              { label: 'Rider', value: <Link className="underline" href={`/couriers/${incident.courier.id}`}>{name}</Link> },
              { label: 'Started', value: athensDateTime(incident.startedAt) },
              {
                label: 'Job held',
                value: incident.deliveryId ? (
                  <Link className="underline" href={`/deliveries/${incident.deliveryId}`}>
                    Open the delivery
                  </Link>
                ) : null,
              },
              { label: 'Rider ended it', value: riderEnd(incident) },
              { label: 'Closed', value: incident.closedAt ? athensDateTime(incident.closedAt) : null },
              { label: 'Closed by', value: closedByName(incident) },
              { label: 'Outcome', value: incident.outcome ? SOS_OUTCOME_LABELS[incident.outcome] : null },
              { label: 'Note', value: incident.note },
            ]}
          />
        </section>
      </div>
    </>
  )
}
