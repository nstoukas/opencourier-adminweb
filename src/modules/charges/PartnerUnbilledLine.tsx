import React from 'react'
import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import { useGetPartnerChargeMonthQuery } from '@/api/partnerChargeApi'
import { EAdminRoutes } from '@/hooks/useAdminPageNavigator'
import { toLanguage } from '@/i18n/language'
import { currentAthensMonth } from '@/utils/athensMonth'
import { unbilledThisMonthText } from './chargeTotals'

// Spec 0036, AC-11. One line on a restaurant's page for the current Athens month, linking to its
// month of charges.
export function PartnerUnbilledLine({ partnerId }: { partnerId: string }) {
  // useTranslation gives t (a key in the reader's language) and i18n (which language that is, for money).
  const { t, i18n } = useTranslation()
  const month = currentAthensMonth()
  const query = useGetPartnerChargeMonthQuery({ month, partnerId }, { skip: !partnerId })
  const data = query.currentData
  if (!partnerId) return null
  // A failed read must not look like "nothing owed": say it.
  if (query.isError) return <p className="text-sm text-destructive">{t('charges.unbilledLine.loadFailed')}</p>
  if (!data) return null
  return (
    <p className="text-sm">
      <Link
        className="underline underline-offset-2"
        href={{ pathname: EAdminRoutes.CHARGES_PARTNER_MONTH, query: { month, partnerId } }}
      >
        {unbilledThisMonthText(t, data.charges, toLanguage(i18n.language))}
      </Link>
    </p>
  )
}
