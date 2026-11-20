import React from 'react'
import { render, screen } from '@testing-library/react'
import {
  boxOverCapacityOf,
  BoxOverCapacityWarning,
} from './BoxOverCapacityWarning'

describe('boxOverCapacityOf (spec 0043, AC-6)', () => {
  it('extracts heldUnits and deliveryUnits from 409 BOX_OVER_CAPACITY error', () => {
    const error = {
      code: 'BOX_OVER_CAPACITY',
      heldUnits: 50,
      deliveryUnits: 60,
    }
    expect(boxOverCapacityOf(error)).toEqual({ heldUnits: 50, deliveryUnits: 60 })
  })

  it('returns null when error is null or undefined or not an object', () => {
    expect(boxOverCapacityOf(null)).toBeNull()
    expect(boxOverCapacityOf(undefined)).toBeNull()
    expect(boxOverCapacityOf('string error')).toBeNull()
    expect(boxOverCapacityOf(123)).toBeNull()
  })

  it('returns null when error code is not BOX_OVER_CAPACITY', () => {
    expect(
      boxOverCapacityOf({ code: 'BAD_REQUEST', heldUnits: 50, deliveryUnits: 60 })
    ).toBeNull()
  })

  it('returns null when heldUnits or deliveryUnits is not a number', () => {
    expect(
      boxOverCapacityOf({
        code: 'BOX_OVER_CAPACITY',
        heldUnits: '50',
        deliveryUnits: 60,
      })
    ).toBeNull()
    expect(
      boxOverCapacityOf({
        code: 'BOX_OVER_CAPACITY',
        heldUnits: 50,
        deliveryUnits: null,
      })
    ).toBeNull()
  })
})

describe('BoxOverCapacityWarning component (spec 0043, AC-6, AC-8)', () => {
  it('returns null when value is null', () => {
    const { container } = render(<BoxOverCapacityWarning value={null} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders role="alert" with held, order and total units', () => {
    render(
      <BoxOverCapacityWarning
        value={{ heldUnits: 50, deliveryUnits: 100 }}
      />
    )

    const alert = screen.getByRole('alert')
    expect(alert).toBeInTheDocument()
    expect(alert).toHaveTextContent("This would overfill the rider's box.")
    expect(alert).toHaveTextContent(
      'They already hold 50 of 100 box units, and this order takes 100: 150 in all.'
    )
    expect(alert).toHaveTextContent('An overstuffed box is unsafe to ride with.')
  })
})
