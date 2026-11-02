import { useEffect, useRef, useState } from 'react'
import { MagnifyingGlass } from '@phosphor-icons/react'
import { Input } from '@/admin-web-components'
import type { CourierApiGetManyCouriersRequest } from '@/backend-admin-sdk'
import { useDebouncedValue } from '@/ui-shared-utils'

// The couriers list's filter row (row 97, the board's tabs and search): which riders to show, and a
// search by name or phone. Both reach the backend. It follows DeliveriesListFilters (row 96) line
// for line; a plain copy reads more easily than one generic component for both lists.
// The values come from the SDK's request, so the two can never disagree.
// `NonNullable<…>` drops `undefined` from the optional field's type.
export type CourierListStatus = NonNullable<CourierApiGetManyCouriersRequest['status']>

// "Working now" is Online or Last call: a rider finishing their last deliveries is still working
// (decision 97.1).
export const COURIER_LIST_STATUSES: { value: CourierListStatus; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'working', label: 'Working now' },
  { value: 'offline', label: 'Offline' },
]

// How long after the last key the search is sent, so typing a name sends one request, not one per
// letter (the backend allows 30 requests a minute per admin).
export const SEARCH_DELAY_MS = 300

type Props = {
  status: CourierListStatus
  onStatusChange: (status: CourierListStatus) => void
  onSearchChange: (search: string | undefined) => void
}

export function CouriersListFilters({ status, onStatusChange, onSearchChange }: Props) {
  const [text, setText] = useState('')
  // The text as it was SEARCH_DELAY_MS after the last key (the shared debounce hook).
  const settled = useDebouncedValue(text, SEARCH_DELAY_MS)
  // The search last handed to the page, so an unchanged one (on first render, or "nikos" then
  // "nikos ") does not reset the page for nothing.
  const lastSent = useRef<string | undefined>(undefined)

  useEffect(() => {
    const next = settled.trim() || undefined
    if (next === lastSent.current) return
    lastSent.current = next
    onSearchChange(next)
    // onSearchChange is left out on purpose: the page passes a new one each render, and the
    // search must follow the text, not the render.
  }, [settled])

  return (
    <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      {/* A segmented control: plain buttons, the pressed one marked with aria-pressed. */}
      <div
        role="group"
        aria-label="Show couriers"
        className="inline-flex flex-wrap rounded-md border border-input p-0.5"
      >
        {COURIER_LIST_STATUSES.map((option) => {
          const pressed = option.value === status
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={pressed}
              onClick={() => onStatusChange(option.value)}
              className={`rounded px-3 py-1.5 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                pressed
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              }`}
            >
              {option.label}
            </button>
          )
        })}
      </div>
      <div className="relative w-full md:max-w-xs">
        <MagnifyingGlass
          aria-hidden="true"
          className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          type="search"
          aria-label="Search couriers"
          placeholder="Name or phone"
          maxLength={100}
          value={text}
          onChange={(event) => setText(event.target.value)}
          className="pl-8"
        />
      </div>
    </div>
  )
}
