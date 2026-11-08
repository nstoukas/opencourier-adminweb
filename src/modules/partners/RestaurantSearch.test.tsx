import React from 'react'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { RestaurantSearch, RESTAURANT_SEARCH_DELAY_MS } from './RestaurantSearch'

// Row 106: the restaurants board's search box. It waits 300 ms after the last key, sends the
// trimmed text (undefined for nothing), and sends nothing when the search did not change.
describe('RestaurantSearch (row 106)', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.runOnlyPendingTimers()
    jest.useRealTimers()
  })

  const box = () => screen.getByRole('searchbox', { name: 'Search restaurants' })
  const type = (value: string) => fireEvent.change(box(), { target: { value } })
  const wait = (ms: number) =>
    act(() => {
      jest.advanceTimersByTime(ms)
    })

  it('is a search box labelled "Search restaurants", with the placeholder "Name, street or email" and maxLength 100', () => {
    render(<RestaurantSearch onSearchChange={jest.fn()} />)

    const input = box()
    expect(input).toHaveAttribute('type', 'search')
    expect(input).toHaveAttribute('placeholder', 'Name, street or email')
    expect(input).toHaveAttribute('maxLength', '100')
    expect(input).toHaveValue('')
  })

  it('waits 300 ms', () => {
    expect(RESTAURANT_SEARCH_DELAY_MS).toBe(300)
  })

  it('sends nothing when it first renders', () => {
    const onSearchChange = jest.fn()
    render(<RestaurantSearch onSearchChange={onSearchChange} />)

    wait(1000)

    expect(onSearchChange).not.toHaveBeenCalled()
  })

  it('sends once, 300 ms after the last key, not once per key', () => {
    const onSearchChange = jest.fn()
    render(<RestaurantSearch onSearchChange={onSearchChange} />)

    type('n')
    wait(100)
    type('no')
    wait(100)
    type('nos')
    wait(100)
    type('nosh')
    expect(onSearchChange).not.toHaveBeenCalled()

    wait(299)
    expect(onSearchChange).not.toHaveBeenCalled()

    wait(1)
    expect(onSearchChange).toHaveBeenCalledTimes(1)
    expect(onSearchChange).toHaveBeenCalledWith('nosh')
  })

  it('sends the text trimmed', () => {
    const onSearchChange = jest.fn()
    render(<RestaurantSearch onSearchChange={onSearchChange} />)

    type('  Νόσης Ιάσονος  ')
    wait(300)

    expect(onSearchChange).toHaveBeenCalledTimes(1)
    expect(onSearchChange).toHaveBeenCalledWith('Νόσης Ιάσονος')
  })

  it('sends undefined when the box is cleared or holds only spaces', () => {
    const onSearchChange = jest.fn()
    render(<RestaurantSearch onSearchChange={onSearchChange} />)

    type('nosh')
    wait(300)
    type('   ')
    wait(300)

    expect(onSearchChange).toHaveBeenCalledTimes(2)
    expect(onSearchChange).toHaveBeenNthCalledWith(1, 'nosh')
    expect(onSearchChange).toHaveBeenNthCalledWith(2, undefined)

    type('nosh')
    wait(300)
    type('')
    wait(300)
    expect(onSearchChange).toHaveBeenCalledTimes(4)
    expect(onSearchChange).toHaveBeenLastCalledWith(undefined)
  })

  it('sends nothing again when the trimmed text did not change', () => {
    const onSearchChange = jest.fn()
    render(<RestaurantSearch onSearchChange={onSearchChange} />)

    type('nosh')
    wait(300)
    type('nosh ')
    wait(300)
    type(' nosh')
    wait(300)

    expect(onSearchChange).toHaveBeenCalledTimes(1)
    expect(onSearchChange).toHaveBeenCalledWith('nosh')
  })

  it('sends nothing for spaces typed into an empty box', () => {
    const onSearchChange = jest.fn()
    render(<RestaurantSearch onSearchChange={onSearchChange} />)

    type('   ')
    wait(300)

    expect(onSearchChange).not.toHaveBeenCalled()
  })
})
