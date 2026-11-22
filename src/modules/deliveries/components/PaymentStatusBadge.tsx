import { useTranslation } from 'react-i18next'
import { Badge } from '../../../admin-web-components'
import { EnumPaymentStatus } from '../../../shared-types'
import { enumLabel } from '@/i18n/enumLabel'

type PaymentStatusBadgeProps = {
  status: EnumPaymentStatus
}

export function PaymentStatusBadge({ status }: PaymentStatusBadgeProps) {
  // useTranslation gives t, which looks a key up in the reader's language.
  const { t } = useTranslation()
  return (
    <Badge variant="secondary" className="text-xs py-1 px-2 inline-flex items-center gap-2 ml-4">
      {enumLabel(t, 'paymentStatus', status)}
    </Badge>
  )
}
