import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, Input, Label } from '@/admin-web-components'
import { keyMessage, showMessage, type ShownMessage } from '@/i18n/shownMessage'
import { DayRange, daysInRange, isDay } from './timeWorkedFormat'

type Props = {
  // Prefixes the inputs' ids, so two forms on one page never share an id.
  idPrefix: string
  value: DayRange
  maxDays: number
  onChange: (range: DayRange) => void
}

// Spec 0040: two days (Athens) and a Show button. A range the server would refuse is refused here
// first, with the same limit in words, and nothing is asked of the server.
export function DayRangeForm({ idPrefix, value, maxDays, onChange }: Props) {
  const [from, setFrom] = useState(value.from)
  const [to, setTo] = useState(value.to)
  // useTranslation gives t, which looks a key up in the reader's language.
  const { t } = useTranslation()
  // A translation key (with values), not words, so a language switch reaches a message already shown.
  const [problem, setProblem] = useState<ShownMessage | null>(null)

  // A new range from outside (the URL, Back) replaces what is typed.
  useEffect(() => {
    setFrom(value.from)
    setTo(value.to)
  }, [value.from, value.to])

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!isDay(from) || !isDay(to)) return setProblem(keyMessage('timeWorked.problem.chooseBoth'))
    if (from > to) return setProblem(keyMessage('timeWorked.problem.order'))
    if (daysInRange(from, to) > maxDays) return setProblem(keyMessage('timeWorked.problem.tooLong', { max: maxDays }))
    setProblem(null)
    onChange({ from, to })
  }

  return (
    <form className="flex flex-wrap items-end gap-3" onSubmit={submit} aria-label={t('timeWorked.form.label')}>
      <div className="flex flex-col gap-1">
        <Label htmlFor={`${idPrefix}-from`}>{t('timeWorked.form.from')}</Label>
        <Input id={`${idPrefix}-from`} type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor={`${idPrefix}-to`}>{t('timeWorked.form.to')}</Label>
        <Input id={`${idPrefix}-to`} type="date" value={to} onChange={(event) => setTo(event.target.value)} />
      </div>
      <Button type="submit" variant="outline">
        {t('timeWorked.form.show')}
      </Button>
      <p className="w-full text-sm text-muted-foreground">{t('timeWorked.form.hint', { max: maxDays })}</p>
      {problem ? (
        <p role="alert" className="w-full text-sm text-destructive">
          {showMessage(problem, t)}
        </p>
      ) : null}
    </form>
  )
}
