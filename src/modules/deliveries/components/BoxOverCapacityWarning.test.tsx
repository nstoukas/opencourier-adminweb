import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import {
  BOX_OVER_CAPACITY_WARNING_ID,
  boxOverCapacityOf,
  BoxOverCapacityWarning,
  overCapacityConfirmed,
} from './BoxOverCapacityWarning'

describe('boxOverCapacityOf (spec 0043, AC-6)', () => {
  it('extracts heldUnits and deliveryUnits from 409 BOX_OVER_CAPACITY error and attaches courierId', () => {
    const error = {
      code: 'BOX_OVER_CAPACITY',
      heldUnits: 50,
      deliveryUnits: 60,
    }
    expect(boxOverCapacityOf(error, 'c-1')).toEqual({
      courierId: 'c-1',
      heldUnits: 50,
      deliveryUnits: 60,
    })
  })

  it('returns null when error is null or undefined or not an object', () => {
    expect(boxOverCapacityOf(null, 'c-1')).toBeNull()
    expect(boxOverCapacityOf(undefined, 'c-1')).toBeNull()
    expect(boxOverCapacityOf('string error', 'c-1')).toBeNull()
    expect(boxOverCapacityOf(123, 'c-1')).toBeNull()
  })

  it('returns null when error code is not BOX_OVER_CAPACITY', () => {
    expect(
      boxOverCapacityOf({ code: 'BAD_REQUEST', heldUnits: 50, deliveryUnits: 60 }, 'c-1')
    ).toBeNull()
  })

  it('returns null when heldUnits or deliveryUnits is not a number', () => {
    expect(
      boxOverCapacityOf(
        {
          code: 'BOX_OVER_CAPACITY',
          heldUnits: '50',
          deliveryUnits: 60,
        },
        'c-1'
      )
    ).toBeNull()
    expect(
      boxOverCapacityOf(
        {
          code: 'BOX_OVER_CAPACITY',
          heldUnits: 50,
          deliveryUnits: null,
        },
        'c-1'
      )
    ).toBeNull()
  })
})

describe('overCapacityConfirmed helper (spec 0043, AC-6, review fix)', () => {
  const overCapacity = {
    courierId: 'c-1',
    heldUnits: 50,
    deliveryUnits: 60,
  }

  it('returns true only when value is present, courierId matches, and checked is true', () => {
    expect(overCapacityConfirmed(overCapacity, 'c-1', true)).toBe(true)
  })

  it('returns false when checked is false even if courierId matches', () => {
    expect(overCapacityConfirmed(overCapacity, 'c-1', false)).toBe(false)
  })

  it('returns false when courierId differs from value.courierId even if checked is true', () => {
    expect(overCapacityConfirmed(overCapacity, 'c-2', true)).toBe(false)
  })

  it('returns false when value is null or courierId is undefined', () => {
    expect(overCapacityConfirmed(null, 'c-1', true)).toBe(false)
    expect(overCapacityConfirmed(overCapacity, undefined, true)).toBe(false)
    expect(overCapacityConfirmed(null, undefined, false)).toBe(false)
  })
})

describe('BoxOverCapacityWarning component (spec 0043, AC-6, AC-8, review fix)', () => {
  it('returns null when value is null', () => {
    const { container } = render(
      <BoxOverCapacityWarning
        value={null}
        checked={false}
        onCheckedChange={jest.fn()}
      />
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders role="alert" with id, held, order and total units, and tick box', () => {
    const onCheckedChange = jest.fn()
    render(
      <BoxOverCapacityWarning
        value={{ courierId: 'c-1', heldUnits: 50, deliveryUnits: 100 }}
        checked={false}
        onCheckedChange={onCheckedChange}
      />
    )

    const alert = screen.getByRole('alert')
    expect(alert).toBeInTheDocument()
    expect(alert).toHaveAttribute('id', BOX_OVER_CAPACITY_WARNING_ID)
    expect(alert).toHaveTextContent("This would overfill the rider's box.")
    expect(alert).toHaveTextContent(
      'They already hold 50 of 100 box units, and this order takes 100: 150 in all.'
    )
    expect(alert).toHaveTextContent('An overstuffed box is unsafe to ride with.')

    const checkbox = screen.getByRole('checkbox', {
      name: /I checked with the rider that this order fits/i,
    })
    expect(checkbox).toBeInTheDocument()
    expect(checkbox).not.toBeChecked()

    fireEvent.click(checkbox)
    expect(onCheckedChange).toHaveBeenCalledWith(true)
  })

  it('renders checkbox as checked when checked prop is true', () => {
    render(
      <BoxOverCapacityWarning
        value={{ courierId: 'c-1', heldUnits: 40, deliveryUnits: 70 }}
        checked={true}
        onCheckedChange={jest.fn()}
      />
    )

    const checkbox = screen.getByRole('checkbox', {
      name: /I checked with the rider that this order fits/i,
    })
    expect(checkbox).toBeChecked()
  })
})
