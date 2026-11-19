import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { DayRangeForm } from './DayRangeForm'

describe('DayRangeForm (spec 0040)', () => {
  it('calls onChange with a valid range when submitted', () => {
    const handleChange = jest.fn()
    render(
      <DayRangeForm
        idPrefix="test"
        value={{ from: '2026-11-01', to: '2026-11-07' }}
        maxDays={31}
        onChange={handleChange}
      />
    )

    const fromInput = screen.getByLabelText('From')
    const toInput = screen.getByLabelText('To')
    const submitButton = screen.getByRole('button', { name: 'Show' })

    fireEvent.change(fromInput, { target: { value: '2026-11-10' } })
    fireEvent.change(toInput, { target: { value: '2026-11-15' } })
    fireEvent.click(submitButton)

    expect(handleChange).toHaveBeenCalledWith({
      from: '2026-11-10',
      to: '2026-11-15',
    })
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('refuses from after to with an alert sentence and does not call onChange', () => {
    const handleChange = jest.fn()
    render(
      <DayRangeForm
        idPrefix="test"
        value={{ from: '2026-11-01', to: '2026-11-07' }}
        maxDays={31}
        onChange={handleChange}
      />
    )

    const fromInput = screen.getByLabelText('From')
    const toInput = screen.getByLabelText('To')
    const submitButton = screen.getByRole('button', { name: 'Show' })

    fireEvent.change(fromInput, { target: { value: '2026-11-20' } })
    fireEvent.change(toInput, { target: { value: '2026-11-10' } })
    fireEvent.click(submitButton)

    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent('The first day must be on or before the last day.')
    expect(handleChange).not.toHaveBeenCalled()
  })

  it('refuses a range over maxDays with the limit in words and does not call onChange', () => {
    const handleChange = jest.fn()
    render(
      <DayRangeForm
        idPrefix="test"
        value={{ from: '2026-01-01', to: '2026-01-07' }}
        maxDays={31}
        onChange={handleChange}
      />
    )

    const fromInput = screen.getByLabelText('From')
    const toInput = screen.getByLabelText('To')
    const submitButton = screen.getByRole('button', { name: 'Show' })

    // 2026-01-01 to 2026-02-01 is 32 days
    fireEvent.change(fromInput, { target: { value: '2026-01-01' } })
    fireEvent.change(toInput, { target: { value: '2026-02-01' } })
    fireEvent.click(submitButton)

    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent('A range may cover at most 31 days.')
    expect(handleChange).not.toHaveBeenCalled()
  })

  it('refuses empty or non-calendar dates and does not call onChange', () => {
    const handleChange = jest.fn()
    render(
      <DayRangeForm
        idPrefix="test"
        value={{ from: '2026-11-01', to: '2026-11-07' }}
        maxDays={31}
        onChange={handleChange}
      />
    )

    const fromInput = screen.getByLabelText('From')
    const submitButton = screen.getByRole('button', { name: 'Show' })

    fireEvent.change(fromInput, { target: { value: '' } })
    fireEvent.click(submitButton)

    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent('Choose both days.')
    expect(handleChange).not.toHaveBeenCalled()
  })

  it('updates form inputs when external value prop changes', () => {
    const handleChange = jest.fn()
    const { rerender } = render(
      <DayRangeForm
        idPrefix="test"
        value={{ from: '2026-11-01', to: '2026-11-07' }}
        maxDays={31}
        onChange={handleChange}
      />
    )

    expect(screen.getByLabelText('From')).toHaveValue('2026-11-01')
    expect(screen.getByLabelText('To')).toHaveValue('2026-11-07')

    rerender(
      <DayRangeForm
        idPrefix="test"
        value={{ from: '2026-11-10', to: '2026-11-20' }}
        maxDays={31}
        onChange={handleChange}
      />
    )

    expect(screen.getByLabelText('From')).toHaveValue('2026-11-10')
    expect(screen.getByLabelText('To')).toHaveValue('2026-11-20')
  })
})
