import { useEffect, useRef, useState } from 'react'
import { MagnifyingGlass } from '@phosphor-icons/react'
import { Input } from '@/admin-web-components'
import { useDebouncedValue } from '@/ui-shared-utils'

// How long after the last key the search is sent, so typing a name sends one request, not one per
// letter (as on the couriers list, row 97).
export const RESTAURANT_SEARCH_DELAY_MS = 300

type Props = {
  onSearchChange: (search: string | undefined) => void
}

// The restaurants board's search box (row 106): a name, a street or a sign in email, sent to the
// backend, which ignores case and accents and wants every word to match (decision 106.1). It follows
// the couriers list's search line for line.
export function RestaurantSearch({ onSearchChange }: Props) {
  const [text, setText] = useState('')
  // The text as it was RESTAURANT_SEARCH_DELAY_MS after the last key (the shared debounce hook).
  const settled = useDebouncedValue(text, RESTAURANT_SEARCH_DELAY_MS)
  // The search last handed to the page, so an unchanged one (on first render, or "nosh" then
  // "nosh ") does not reset the page for nothing.
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
    <div className="relative mb-4 w-full md:max-w-sm">
      <MagnifyingGlass
        aria-hidden="true"
        className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
      />
      <Input
        type="search"
        aria-label="Search restaurants"
        placeholder="Name, street or email"
        maxLength={100}
        value={text}
        onChange={(event) => setText(event.target.value)}
        className="pl-8"
      />
    </div>
  )
}
