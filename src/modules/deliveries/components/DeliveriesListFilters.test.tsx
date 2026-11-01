import React from 'react'
import { render, screen, fireEvent, act } from '@testing-library/react'
import type { DeliveriesApiGetDeliveriesRequest } from '@/backend-admin-sdk'
import {
  DeliveriesListFilters,
  DELIVERY_LIST_STATES,
  SEARCH_DELAY_MS,
  type DeliveryListState,
} from './DeliveriesListFilters'

describe('DeliveriesListFilters (row 96: filter and search controls)', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.runOnlyPendingTimers()
    jest.useRealTimers()
  })

  it('renders a button group named "Show deliveries" with the four state options', () => {
    render(
      <DeliveriesListFilters
        state="all"
        onStateChange={jest.fn()}
        onSearchChange={jest.fn()}
      />
    )

    // The group container must have role="group" and aria-label="Show deliveries"
    const group = screen.getByRole('group', { name: 'Show deliveries' })
    expect(group).toBeInTheDocument()

    // Exactly four buttons: All, Active, Dropped off, Canceled
    const buttons = screen.getAllByRole('button')
    expect(buttons).toHaveLength(4)
    expect(buttons[0]).toHaveTextContent('All')
    expect(buttons[1]).toHaveTextContent('Active')
    expect(buttons[2]).toHaveTextContent('Dropped off')
    expect(buttons[3]).toHaveTextContent('Canceled')
  })

  it.each(DELIVERY_LIST_STATES)(
    'sets aria-pressed="true" on exactly one button ($label) when state is "$value"',
    ({ value, label }) => {
      render(
        <DeliveriesListFilters
          state={value}
          onStateChange={jest.fn()}
          onSearchChange={jest.fn()}
        />
      )

      // Exactly one button across the group must have aria-pressed="true"
      const pressedButtons = screen.getAllByRole('button', { pressed: true })
      expect(pressedButtons).toHaveLength(1)
      expect(pressedButtons[0]).toHaveTextContent(label)

      // The other three buttons must have aria-pressed="false"
      const unpressedButtons = screen.getAllByRole('button', { pressed: false })
      expect(unpressedButtons).toHaveLength(3)

      for (const option of DELIVERY_LIST_STATES) {
        const btn = screen.getByRole('button', { name: option.label })
        expect(btn).toHaveAttribute('aria-pressed', option.value === value ? 'true' : 'false')
      }
    }
  )

  it.each([
    { label: 'All', expected: 'all' as DeliveryListState },
    { label: 'Active', expected: 'active' as DeliveryListState },
    { label: 'Dropped off', expected: 'dropped_off' as DeliveryListState },
    { label: 'Canceled', expected: 'canceled' as DeliveryListState },
  ])('clicking "$label" calls onStateChange with "$expected"', ({ label, expected }) => {
    const onStateChange = jest.fn()
    render(
      <DeliveriesListFilters
        state="all"
        onStateChange={onStateChange}
        onSearchChange={jest.fn()}
      />
    )

    const button = screen.getByRole('button', { name: label })
    fireEvent.click(button)

    expect(onStateChange).toHaveBeenCalledTimes(1)
    expect(onStateChange).toHaveBeenCalledWith(expected)
  })

  it('renders a search box labelled "Search deliveries" with type="search" and maxLength 100', () => {
    render(
      <DeliveriesListFilters
        state="all"
        onStateChange={jest.fn()}
        onSearchChange={jest.fn()}
      />
    )

    const searchInput = screen.getByRole('searchbox', { name: 'Search deliveries' })
    expect(searchInput).toBeInTheDocument()
    expect(searchInput).toHaveAttribute('maxLength', '100')
    expect(searchInput).toHaveAttribute('type', 'search')
    expect(searchInput).toHaveAttribute('placeholder', 'Order #, customer, restaurant')
  })

  it('calls onSearchChange once, 300 ms after the last key (not before), with trimmed text', () => {
    const onSearchChange = jest.fn()
    render(
      <DeliveriesListFilters
        state="all"
        onStateChange={jest.fn()}
        onSearchChange={onSearchChange}
      />
    )

    const searchInput = screen.getByRole('searchbox', { name: 'Search deliveries' })

    // Type text with leading and trailing spaces
    fireEvent.change(searchInput, { target: { value: '   ORD-101   ' } })

    // Immediately after typing: not called
    expect(onSearchChange).not.toHaveBeenCalled()

    // 299 ms later: still not called
    act(() => {
      jest.advanceTimersByTime(SEARCH_DELAY_MS - 1)
    })
    expect(onSearchChange).not.toHaveBeenCalled()

    // At 300 ms: called exactly once with the trimmed text
    act(() => {
      jest.advanceTimersByTime(1)
    })
    expect(onSearchChange).toHaveBeenCalledTimes(1)
    expect(onSearchChange).toHaveBeenCalledWith('ORD-101')
  })

  it('debounces rapid keystrokes so typing a word sends only one request 300 ms after the last key', () => {
    const onSearchChange = jest.fn()
    render(
      <DeliveriesListFilters
        state="all"
        onStateChange={jest.fn()}
        onSearchChange={onSearchChange}
      />
    )

    const searchInput = screen.getByRole('searchbox', { name: 'Search deliveries' })

    // Simulate user typing "Volos" letter by letter with 100 ms pauses
    fireEvent.change(searchInput, { target: { value: 'V' } })
    act(() => {
      jest.advanceTimersByTime(100)
    })
    fireEvent.change(searchInput, { target: { value: 'Vo' } })
    act(() => {
      jest.advanceTimersByTime(100)
    })
    fireEvent.change(searchInput, { target: { value: 'Vol' } })
    act(() => {
      jest.advanceTimersByTime(100)
    })
    fireEvent.change(searchInput, { target: { value: 'Volo' } })
    act(() => {
      jest.advanceTimersByTime(100)
    })
    fireEvent.change(searchInput, { target: { value: 'Volos' } })

    // Still not called before the 300 ms delay from the LAST key
    expect(onSearchChange).not.toHaveBeenCalled()

    act(() => {
      jest.advanceTimersByTime(299)
    })
    expect(onSearchChange).not.toHaveBeenCalled()

    // At 300 ms after the final keystroke: called exactly once with "Volos"
    act(() => {
      jest.advanceTimersByTime(1)
    })
    expect(onSearchChange).toHaveBeenCalledTimes(1)
    expect(onSearchChange).toHaveBeenCalledWith('Volos')
  })

  it('calls onSearchChange with undefined when the search box contains only spaces', () => {
    const onSearchChange = jest.fn()
    render(
      <DeliveriesListFilters
        state="all"
        onStateChange={jest.fn()}
        onSearchChange={onSearchChange}
      />
    )

    const searchInput = screen.getByRole('searchbox', { name: 'Search deliveries' })

    // Spaces only typed into an empty box sends nothing (trimmed search unchanged from undefined)
    fireEvent.change(searchInput, { target: { value: '     ' } })
    act(() => {
      jest.advanceTimersByTime(SEARCH_DELAY_MS)
    })
    expect(onSearchChange).not.toHaveBeenCalled()

    // Typing "abc", waiting, then clearing to spaces only calls onSearchChange(undefined) once
    fireEvent.change(searchInput, { target: { value: 'abc' } })
    act(() => {
      jest.advanceTimersByTime(SEARCH_DELAY_MS)
    })
    expect(onSearchChange).toHaveBeenCalledTimes(1)
    expect(onSearchChange).toHaveBeenCalledWith('abc')

    // Clearing to spaces only triggers onSearchChange(undefined)
    fireEvent.change(searchInput, { target: { value: '   ' } })
    act(() => {
      jest.advanceTimersByTime(SEARCH_DELAY_MS)
    })
    expect(onSearchChange).toHaveBeenCalledTimes(2)
    expect(onSearchChange).toHaveBeenLastCalledWith(undefined)
    expect(onSearchChange.mock.calls.filter((call) => call[0] === undefined)).toHaveLength(1)
  })

  it('does not call onSearchChange on the first render (mount)', () => {
    const onSearchChange = jest.fn()
    render(
      <DeliveriesListFilters
        state="all"
        onStateChange={jest.fn()}
        onSearchChange={onSearchChange}
      />
    )

    // Advancing past the debounce delay does not fire onSearchChange on mount
    act(() => {
      jest.advanceTimersByTime(SEARCH_DELAY_MS * 2)
    })
    expect(onSearchChange).not.toHaveBeenCalled()
  })

  it('does not call onSearchChange when settled text trims to the same search as last sent ("abc" then "abc ")', () => {
    const onSearchChange = jest.fn()
    render(
      <DeliveriesListFilters
        state="all"
        onStateChange={jest.fn()}
        onSearchChange={onSearchChange}
      />
    )

    const searchInput = screen.getByRole('searchbox', { name: 'Search deliveries' })

    // First search: "abc"
    fireEvent.change(searchInput, { target: { value: 'abc' } })
    act(() => {
      jest.advanceTimersByTime(SEARCH_DELAY_MS)
    })
    expect(onSearchChange).toHaveBeenCalledTimes(1)
    expect(onSearchChange).toHaveBeenCalledWith('abc')

    // Append space: "abc " trims to "abc", which matches last sent
    fireEvent.change(searchInput, { target: { value: 'abc ' } })
    act(() => {
      jest.advanceTimersByTime(SEARCH_DELAY_MS)
    })
    // No second call because the trimmed search did not change
    expect(onSearchChange).toHaveBeenCalledTimes(1)
  })

  it('sends search 300 ms after the last key through the shared useDebouncedValue hook (fake timers)', () => {
    const onSearchChange = jest.fn()
    render(
      <DeliveriesListFilters
        state="all"
        onStateChange={jest.fn()}
        onSearchChange={onSearchChange}
      />
    )

    const searchInput = screen.getByRole('searchbox', { name: 'Search deliveries' })

    // Typing sets state and schedules debounce via useDebouncedValue
    fireEvent.change(searchInput, { target: { value: 'Athens' } })

    // 150 ms in: still waiting
    act(() => {
      jest.advanceTimersByTime(150)
    })
    expect(onSearchChange).not.toHaveBeenCalled()

    // Typing another key before 300 ms resets the debounce timer in useDebouncedValue
    fireEvent.change(searchInput, { target: { value: 'Athens central' } })

    // Advance 299 ms after the second key: still pending
    act(() => {
      jest.advanceTimersByTime(299)
    })
    expect(onSearchChange).not.toHaveBeenCalled()

    // Exactly 300 ms after the last key: hook settles and fires onSearchChange
    act(() => {
      jest.advanceTimersByTime(1)
    })
    expect(onSearchChange).toHaveBeenCalledTimes(1)
    expect(onSearchChange).toHaveBeenCalledWith('Athens central')
  })

  it('derives DeliveryListState from DeliveriesApiGetDeliveriesRequest["state"] (compile-time check)', () => {
    // DeliveryListState comes from DeliveriesApiGetDeliveriesRequest['state'] (row 96 review ruling).
    // Assigning each of the four values to a DeliveriesApiGetDeliveriesRequest['state']
    // confirms compile-time compatibility between the two types.
    const all: DeliveryListState = 'all'
    const active: DeliveryListState = 'active'
    const droppedOff: DeliveryListState = 'dropped_off'
    const canceled: DeliveryListState = 'canceled'

    const sdkAll: DeliveriesApiGetDeliveriesRequest['state'] = all
    const sdkActive: DeliveriesApiGetDeliveriesRequest['state'] = active
    const sdkDroppedOff: DeliveriesApiGetDeliveriesRequest['state'] = droppedOff
    const sdkCanceled: DeliveriesApiGetDeliveriesRequest['state'] = canceled

    expect([sdkAll, sdkActive, sdkDroppedOff, sdkCanceled]).toEqual([
      'all',
      'active',
      'dropped_off',
      'canceled',
    ])
  })

  it('calls onSearchChange with undefined when the search box is emptied', () => {
    const onSearchChange = jest.fn()
    render(
      <DeliveriesListFilters
        state="all"
        onStateChange={jest.fn()}
        onSearchChange={onSearchChange}
      />
    )

    const searchInput = screen.getByRole('searchbox', { name: 'Search deliveries' })

    // First, search for a delivery
    fireEvent.change(searchInput, { target: { value: 'Souvlaki' } })
    act(() => {
      jest.advanceTimersByTime(SEARCH_DELAY_MS)
    })
    expect(onSearchChange).toHaveBeenCalledWith('Souvlaki')

    // Then empty the search box
    fireEvent.change(searchInput, { target: { value: '' } })
    act(() => {
      jest.advanceTimersByTime(SEARCH_DELAY_MS)
    })

    // Last call must be undefined
    expect(onSearchChange).toHaveBeenLastCalledWith(undefined)
  })

  it('cancels pending search timer on unmount', () => {
    const onSearchChange = jest.fn()
    const { unmount } = render(
      <DeliveriesListFilters
        state="all"
        onStateChange={jest.fn()}
        onSearchChange={onSearchChange}
      />
    )

    const searchInput = screen.getByRole('searchbox', { name: 'Search deliveries' })
    fireEvent.change(searchInput, { target: { value: 'Nikou' } })

    unmount()

    act(() => {
      jest.advanceTimersByTime(SEARCH_DELAY_MS + 100)
    })

    // Not called after unmount
    expect(onSearchChange).not.toHaveBeenCalled()
  })
})
