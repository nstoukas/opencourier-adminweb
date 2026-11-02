import React from 'react'
import { render, screen, fireEvent, act } from '@testing-library/react'
import type { CourierApiGetManyCouriersRequest } from '@/backend-admin-sdk'
import {
  CouriersListFilters,
  COURIER_LIST_STATUSES,
  SEARCH_DELAY_MS,
  type CourierListStatus,
} from './CouriersListFilters'

describe('CouriersListFilters (row 97: filter and search controls)', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.runOnlyPendingTimers()
    jest.useRealTimers()
  })

  it('renders a button group named "Show couriers" with the three status options', () => {
    render(
      <CouriersListFilters
        status="all"
        onStatusChange={jest.fn()}
        onSearchChange={jest.fn()}
      />
    )

    // The group container must have role="group" and aria-label="Show couriers"
    const group = screen.getByRole('group', { name: 'Show couriers' })
    expect(group).toBeInTheDocument()

    // Exactly three buttons: All, Working now, Offline
    const buttons = screen.getAllByRole('button')
    expect(buttons).toHaveLength(3)
    expect(buttons[0]).toHaveTextContent('All')
    expect(buttons[1]).toHaveTextContent('Working now')
    expect(buttons[2]).toHaveTextContent('Offline')
  })

  it.each(COURIER_LIST_STATUSES)(
    'sets aria-pressed="true" on exactly one button ($label) when status is "$value"',
    ({ value, label }) => {
      render(
        <CouriersListFilters
          status={value}
          onStatusChange={jest.fn()}
          onSearchChange={jest.fn()}
        />
      )

      // Exactly one button across the group must have aria-pressed="true"
      const pressedButtons = screen.getAllByRole('button', { pressed: true })
      expect(pressedButtons).toHaveLength(1)
      expect(pressedButtons[0]).toHaveTextContent(label)

      // The other two buttons must have aria-pressed="false"
      const unpressedButtons = screen.getAllByRole('button', { pressed: false })
      expect(unpressedButtons).toHaveLength(2)

      for (const option of COURIER_LIST_STATUSES) {
        const btn = screen.getByRole('button', { name: option.label })
        expect(btn).toHaveAttribute('aria-pressed', option.value === value ? 'true' : 'false')
      }
    }
  )

  it.each([
    { label: 'All', expected: 'all' as CourierListStatus },
    { label: 'Working now', expected: 'working' as CourierListStatus },
    { label: 'Offline', expected: 'offline' as CourierListStatus },
  ])('clicking "$label" calls onStatusChange with "$expected"', ({ label, expected }) => {
    const onStatusChange = jest.fn()
    render(
      <CouriersListFilters
        status="all"
        onStatusChange={onStatusChange}
        onSearchChange={jest.fn()}
      />
    )

    const button = screen.getByRole('button', { name: label })
    fireEvent.click(button)

    expect(onStatusChange).toHaveBeenCalledTimes(1)
    expect(onStatusChange).toHaveBeenCalledWith(expected)
  })

  it('renders a search box labelled "Search couriers" with type="search" and maxLength 100', () => {
    render(
      <CouriersListFilters
        status="all"
        onStatusChange={jest.fn()}
        onSearchChange={jest.fn()}
      />
    )

    const searchInput = screen.getByRole('searchbox', { name: 'Search couriers' })
    expect(searchInput).toBeInTheDocument()
    expect(searchInput).toHaveAttribute('maxLength', '100')
    expect(searchInput).toHaveAttribute('type', 'search')
    expect(searchInput).toHaveAttribute('placeholder', 'Name or phone')
  })

  it('calls onSearchChange once, 300 ms after the last key (not before), with trimmed text', () => {
    const onSearchChange = jest.fn()
    render(
      <CouriersListFilters
        status="all"
        onStatusChange={jest.fn()}
        onSearchChange={onSearchChange}
      />
    )

    const searchInput = screen.getByRole('searchbox', { name: 'Search couriers' })

    // Type text with leading and trailing spaces
    fireEvent.change(searchInput, { target: { value: '   Nikos Pappas   ' } })

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
    expect(onSearchChange).toHaveBeenCalledWith('Nikos Pappas')
  })

  it('debounces rapid keystrokes so typing a name sends only one request 300 ms after the last key', () => {
    const onSearchChange = jest.fn()
    render(
      <CouriersListFilters
        status="all"
        onStatusChange={jest.fn()}
        onSearchChange={onSearchChange}
      />
    )

    const searchInput = screen.getByRole('searchbox', { name: 'Search couriers' })

    // Simulate typing letter by letter with 100 ms pauses
    fireEvent.change(searchInput, { target: { value: 'N' } })
    act(() => {
      jest.advanceTimersByTime(100)
    })
    fireEvent.change(searchInput, { target: { value: 'Ni' } })
    act(() => {
      jest.advanceTimersByTime(100)
    })
    fireEvent.change(searchInput, { target: { value: 'Nik' } })
    act(() => {
      jest.advanceTimersByTime(100)
    })
    fireEvent.change(searchInput, { target: { value: 'Niko' } })
    act(() => {
      jest.advanceTimersByTime(100)
    })
    fireEvent.change(searchInput, { target: { value: 'Nikos' } })

    // Still not called before the 300 ms delay from the LAST key
    expect(onSearchChange).not.toHaveBeenCalled()

    act(() => {
      jest.advanceTimersByTime(299)
    })
    expect(onSearchChange).not.toHaveBeenCalled()

    // At 300 ms after the final keystroke: called exactly once with "Nikos"
    act(() => {
      jest.advanceTimersByTime(1)
    })
    expect(onSearchChange).toHaveBeenCalledTimes(1)
    expect(onSearchChange).toHaveBeenCalledWith('Nikos')
  })

  it('calls onSearchChange with undefined when the search box contains only spaces or is blank', () => {
    const onSearchChange = jest.fn()
    render(
      <CouriersListFilters
        status="all"
        onStatusChange={jest.fn()}
        onSearchChange={onSearchChange}
      />
    )

    const searchInput = screen.getByRole('searchbox', { name: 'Search couriers' })

    // Spaces only typed into an empty box sends nothing (trimmed search unchanged from undefined)
    fireEvent.change(searchInput, { target: { value: '     ' } })
    act(() => {
      jest.advanceTimersByTime(SEARCH_DELAY_MS)
    })
    expect(onSearchChange).not.toHaveBeenCalled()

    // Typing "nikos", waiting, then clearing to spaces only calls onSearchChange(undefined) once
    fireEvent.change(searchInput, { target: { value: 'nikos' } })
    act(() => {
      jest.advanceTimersByTime(SEARCH_DELAY_MS)
    })
    expect(onSearchChange).toHaveBeenCalledTimes(1)
    expect(onSearchChange).toHaveBeenCalledWith('nikos')

    // Clearing to spaces only triggers onSearchChange(undefined)
    fireEvent.change(searchInput, { target: { value: '   ' } })
    act(() => {
      jest.advanceTimersByTime(SEARCH_DELAY_MS)
    })
    expect(onSearchChange).toHaveBeenCalledTimes(2)
    expect(onSearchChange).toHaveBeenLastCalledWith(undefined)
  })

  it('does not call onSearchChange on the first render (mount)', () => {
    const onSearchChange = jest.fn()
    render(
      <CouriersListFilters
        status="all"
        onStatusChange={jest.fn()}
        onSearchChange={onSearchChange}
      />
    )

    // Advancing past the debounce delay does not fire onSearchChange on mount
    act(() => {
      jest.advanceTimersByTime(SEARCH_DELAY_MS * 2)
    })
    expect(onSearchChange).not.toHaveBeenCalled()
  })

  it('does not call onSearchChange when settled text trims to the same search as last sent ("nikos" then "nikos ")', () => {
    const onSearchChange = jest.fn()
    render(
      <CouriersListFilters
        status="all"
        onStatusChange={jest.fn()}
        onSearchChange={onSearchChange}
      />
    )

    const searchInput = screen.getByRole('searchbox', { name: 'Search couriers' })

    // First search: "nikos"
    fireEvent.change(searchInput, { target: { value: 'nikos' } })
    act(() => {
      jest.advanceTimersByTime(SEARCH_DELAY_MS)
    })
    expect(onSearchChange).toHaveBeenCalledTimes(1)
    expect(onSearchChange).toHaveBeenCalledWith('nikos')

    // Append space: "nikos " trims to "nikos", which matches last sent
    fireEvent.change(searchInput, { target: { value: 'nikos ' } })
    act(() => {
      jest.advanceTimersByTime(SEARCH_DELAY_MS)
    })
    // No second call because the trimmed search did not change
    expect(onSearchChange).toHaveBeenCalledTimes(1)
  })

  it('calls onSearchChange with undefined when the search box is emptied', () => {
    const onSearchChange = jest.fn()
    render(
      <CouriersListFilters
        status="all"
        onStatusChange={jest.fn()}
        onSearchChange={onSearchChange}
      />
    )

    const searchInput = screen.getByRole('searchbox', { name: 'Search couriers' })

    // First, search for a courier
    fireEvent.change(searchInput, { target: { value: 'Pappas' } })
    act(() => {
      jest.advanceTimersByTime(SEARCH_DELAY_MS)
    })
    expect(onSearchChange).toHaveBeenCalledWith('Pappas')

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
      <CouriersListFilters
        status="all"
        onStatusChange={jest.fn()}
        onSearchChange={onSearchChange}
      />
    )

    const searchInput = screen.getByRole('searchbox', { name: 'Search couriers' })
    fireEvent.change(searchInput, { target: { value: 'Eleni' } })

    unmount()

    act(() => {
      jest.advanceTimersByTime(SEARCH_DELAY_MS + 100)
    })

    // Not called after unmount
    expect(onSearchChange).not.toHaveBeenCalled()
  })

  it('derives CourierListStatus from CourierApiGetManyCouriersRequest["status"] (compile-time check)', () => {
    const all: CourierListStatus = 'all'
    const working: CourierListStatus = 'working'
    const offline: CourierListStatus = 'offline'

    const sdkAll: CourierApiGetManyCouriersRequest['status'] = all
    const sdkWorking: CourierApiGetManyCouriersRequest['status'] = working
    const sdkOffline: CourierApiGetManyCouriersRequest['status'] = offline

    expect([sdkAll, sdkWorking, sdkOffline]).toEqual([
      'all',
      'working',
      'offline',
    ])
  })
})
