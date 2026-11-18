import React from 'react'
import Link from 'next/link'
import { useGetPartnerChargeMonthQuery } from '@/api/partnerChargeApi'
import { EAdminRoutes } from '@/hooks/useAdminPageNavigator'
import { currentAthensMonth } from '@/utils/athensMonth'
import { unbilledThisMonthText } from './chargeTotals'

// Spec 0036, AC-11. One line on a restaurant's page for the current Athens month, linking to its
// month of charges.
export function PartnerUnbilledLine({ partnerId }: { partnerId: string }) {
  const month = currentAthensMonth()
  const query = useGetPartnerChargeMonthQuery({ month, partnerId }, { skip: !partnerId })
  const data = query.currentData
  if (!partnerId) return null
  // A failed read must not look like "nothing owed": say it.
  if (query.isError) return <p className="text-sm text-destructive">Could not load this month&apos;s charges.</p>
  if (!data) return null
  return (
    <p className="text-sm">
      <Link
        className="underline underline-offset-2"
        href={{ pathname: EAdminRoutes.CHARGES_PARTNER_MONTH, query: { month, partnerId } }}
      >
        {unbilledThisMonthText(data.charges)}
      </Link>
    </p>
  )
}
