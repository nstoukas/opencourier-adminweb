import React, { useEffect, useState } from 'react'
import { Button, Input, Label } from '@/admin-web-components'
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
  const [problem, setProblem] = useState<string | null>(null)

  // A new range from outside (the URL, Back) replaces what is typed.
  useEffect(() => {
    setFrom(value.from)
    setTo(value.to)
  }, [value.from, value.to])

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!isDay(from) || !isDay(to)) return setProblem('Choose both days.')
    if (from > to) return setProblem('The first day must be on or before the last day.')
    if (daysInRange(from, to) > maxDays) return setProblem(`A range may cover at most ${maxDays} days.`)
    setProblem(null)
    onChange({ from, to })
  }

  return (
    <form className="flex flex-wrap items-end gap-3" onSubmit={submit} aria-label="Days to show">
      <div className="flex flex-col gap-1">
        <Label htmlFor={`${idPrefix}-from`}>From</Label>
        <Input id={`${idPrefix}-from`} type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor={`${idPrefix}-to`}>To</Label>
        <Input id={`${idPrefix}-to`} type="date" value={to} onChange={(event) => setTo(event.target.value)} />
      </div>
      <Button type="submit" variant="outline">
        Show
      </Button>
      <p className="w-full text-sm text-muted-foreground">Days are Athens time, at most {maxDays} days.</p>
      {problem ? (
        <p role="alert" className="w-full text-sm text-destructive">
          {problem}
        </p>
      ) : null}
    </form>
  )
}
