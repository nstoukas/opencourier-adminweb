import { useGetCourierAccountQuery } from '@/api/courierAccountApi'
import Link from 'next/link'

// Row 123: the rider's emergency contact on an open SOS, so the admin knows who to call without leaving
// the alert. It comes from the rider's account (spec 0051, `GET admin/v1/courier/:id/account`), the same
// answer the rider's page shows, and it is the contact as it is now (the rider may change it).
export function SosEmergencyContact({ courierId }: { courierId: string }) {
  // `currentData`: never the previous rider's contact while the next incident's loads (adminweb AGENTS.md).
  const { currentData: account, isError } = useGetCourierAccountQuery({ id: courierId })

  let body
  if (isError) {
    // Said in words, so a failed load never reads as "No emergency contact".
    body = (
      <p role="alert" className="text-sm text-destructive">
        The emergency contact could not be loaded.{' '}
        <Link className="underline" href={`/couriers/${courierId}`}>
          Open the rider&apos;s page
        </Link>
      </p>
    )
  } else if (!account) {
    body = <p className="text-sm text-muted-foreground">Loading…</p>
  } else {
    const name = account.emergencyContactName?.trim() || null
    const phone = account.emergencyContactPhone?.trim() || null
    if (!name && !phone) {
      body = <p className="text-sm">No emergency contact</p>
    } else {
      body = (
        <p className="text-sm">
          {name ? <span className="font-medium">{name}</span> : null}
          {name && phone ? ', ' : null}
          {phone ? (
            // A `tel:` link: a click opens the computer's or phone's dialler with the number typed.
            <a className="font-medium underline" href={`tel:${phone.replace(/\s+/g, '')}`}>
              {phone}
            </a>
          ) : null}
        </p>
      )
    }
  }

  return (
    <section aria-labelledby="sos-emergency-contact" className="mb-6 flex flex-col gap-1 rounded-md border p-4">
      <h2 id="sos-emergency-contact" className="text-base font-semibold">
        Emergency contact
      </h2>
      {body}
    </section>
  )
}
