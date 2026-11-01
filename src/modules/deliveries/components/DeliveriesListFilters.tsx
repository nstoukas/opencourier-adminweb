import { useEffect, useState } from 'react'
import { MagnifyingGlass } from '@phosphor-icons/react'
import { Input } from '@/admin-web-components'

// The deliveries list's filter row (row 96, the board's ToggleGroup and search): which deliveries
// to show, and a search by order reference, customer, restaurant or the end of the id. Both reach
// the backend (they did not before row 96).
export type DeliveryListState = 'all' | 'active' | 'dropped_off' | 'canceled'

export const DELIVERY_LIST_STATES: { value: DeliveryListState; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'dropped_off', label: 'Dropped off' },
  { value: 'canceled', label: 'Canceled' },
]

// How long after the last key the search is sent, so typing a word sends one request, not one per letter.
export const SEARCH_DELAY_MS = 300

type Props = {
  state: DeliveryListState
  onStateChange: (state: DeliveryListState) => void
  onSearchChange: (search: string | undefined) => void
}

export function DeliveriesListFilters({ state, onStateChange, onSearchChange }: Props) {
  const [text, setText] = useState('')

  // Sends the search SEARCH_DELAY_MS after typing stops; an empty box clears it.
  useEffect(() => {
    const timer = setTimeout(() => onSearchChange(text.trim() || undefined), SEARCH_DELAY_MS)
    return () => clearTimeout(timer)
    // onSearchChange is left out on purpose: the page passes a new one each render, and the
    // search must follow the text, not the render.
  }, [text])

  return (
    <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      {/* A segmented control: plain buttons, the pressed one marked with aria-pressed. */}
      <div role="group" aria-label="Show deliveries" className="inline-flex flex-wrap rounded-md border border-input p-0.5">
        {DELIVERY_LIST_STATES.map((option) => {
          const pressed = option.value === state
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={pressed}
              onClick={() => onStateChange(option.value)}
              className={`rounded px-3 py-1.5 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                pressed ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent hover:text-foreground'
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
          aria-label="Search deliveries"
          placeholder="Order #, customer, restaurant"
          maxLength={100}
          value={text}
          onChange={(event) => setText(event.target.value)}
          className="pl-8"
        />
      </div>
    </div>
  )
}
