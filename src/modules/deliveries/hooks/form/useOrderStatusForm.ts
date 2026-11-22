import { useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'
import { OrderEventFormValues } from '../../types'

export const useOrderStatusForm = () => {
  // useTranslation gives t, which looks a key up in the reader's language; the form shows the
  // schema's message as it is, so the message is put in that language here.
  const { t } = useTranslation()
  // useMemo builds the schema again only when the language (and so `t`) changes.
  const formSchema = useMemo(
    () =>
      z.object({
        eventType: z.string().min(1, { message: t('deliveries.statusPage.eventRequired') }),
      }),
    [t]
  )
  return useForm<OrderEventFormValues>({
    mode: 'onTouched',
    resolver: zodResolver(formSchema),
    defaultValues: {
      eventType: '',
    },
  })
}
