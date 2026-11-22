import { useGetCourierAccountQuery } from '@/api/courierAccountApi'
import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'

// Row 123: the rider's emergency contact on an open SOS, so the admin knows who to call without leaving
// the alert. It comes from the rider's account (spec 0051, `GET admin/v1/courier/:id/account`), the same
// answer the rider's page shows, and it is the contact as it is now (the rider may change it).
// Every 10 s, the same as the open incident it sits on.
const CONTACT_POLL_MS = 10_000

// A contact already loaded stays on screen if a later poll fails (checked first, before the error).
// `t` comes from the component's useTranslation, so "No emergency contact" is in the reader's language.
function contactLine(
  account: { emergencyContactName?: string | null; emergencyContactPhone?: string | null },
  t: TFunction,
) {
  const name = account.emergencyContactName?.trim() || null
  const phone = account.emergencyContactPhone?.trim() || null
  if (!name && !phone) {
    return <p className="text-sm">{t('sos.contact.none')}</p>
  }
  return (
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

export function SosEmergencyContact({ courierId }: { courierId: string }) {
  // useTranslation gives t, which looks a key up in the reader's language.
  const { t } = useTranslation()
  // `currentData`: never the previous rider's contact while the next incident's loads (adminweb AGENTS.md).
  // Polled like the incident (row 123's review): a failed load retries by itself, and a changed contact shows.
  const { currentData: account, isError } = useGetCourierAccountQuery(
    { id: courierId },
    { pollingInterval: CONTACT_POLL_MS },
  )

  let body
  if (account) {
    body = contactLine(account, t)
  } else if (isError) {
    // Said in words, so a failed load never reads as "No emergency contact".
    body = (
      <p role="alert" className="text-sm text-destructive">
        {t('sos.contact.failed')}{' '}
        <Link className="underline" href={`/couriers/${courierId}`}>
          {t('sos.contact.openRider')}
        </Link>
      </p>
    )
  } else {
    body = <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
  }

  return (
    <section aria-labelledby="sos-emergency-contact" className="mb-6 flex flex-col gap-1 rounded-md border p-4">
      <h2 id="sos-emergency-contact" className="text-lg font-semibold">
        {t('sos.contact.title')}
      </h2>
      {body}
    </section>
  )
}
