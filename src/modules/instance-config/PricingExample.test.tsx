import React from 'react'
import { render, screen } from '@testing-library/react'
import { PricingExample, pricingBreakdown, EXAMPLE_DISTANCE } from './PricingExample'

describe('PricingExample & pricingBreakdown (spec 0010, AC-6, AC-7)', () => {
  describe('pricingBreakdown pure calculation', () => {
    it('computes exact sums for a standard 3 km delivery', () => {
      // Base €2.00 (200c), Rate €1.50 (150c), 10% co-op fee
      const result = pricingBreakdown('200', '150', '10')
      expect(result).not.toBeNull()
      expect(result).toEqual({
        baseFee: 200,
        distanceFee: 450, // 3 * 150
        riderPay: 650, // 200 + 450
        coopFee: 65, // Math.round(650 * 10 / 100)
        customerPays: 715, // 650 + 65
      })
    })

    it('uses Math.round for distance fee and co-op fee rounding', () => {
      // Rate 149 (3 * 149 = 447), Base 200 -> Rider pay 647.
      // 15% co-op fee: 647 * 0.15 = 97.05 -> rounds to 97.
      const result = pricingBreakdown('200', '149', '15')
      expect(result).not.toBeNull()
      expect(result?.distanceFee).toBe(447)
      expect(result?.riderPay).toBe(647)
      expect(result?.coopFee).toBe(97)
      expect(result?.customerPays).toBe(744)
    })

    it('sets co-op fee to 0 when pay or fee % is 0 or less', () => {
      // 1. Pay is 0
      const zeroPay = pricingBreakdown('0', '0', '10')
      expect(zeroPay).not.toBeNull()
      expect(zeroPay?.riderPay).toBe(0)
      expect(zeroPay?.coopFee).toBe(0)
      expect(zeroPay?.customerPays).toBe(0)

      // 2. Fee percentage is 0
      const zeroFee = pricingBreakdown('200', '150', '0')
      expect(zeroFee).not.toBeNull()
      expect(zeroFee?.riderPay).toBe(650)
      expect(zeroFee?.coopFee).toBe(0)
      expect(zeroFee?.customerPays).toBe(650)

      // 3. Fee percentage is negative
      const negFee = pricingBreakdown('200', '150', '-5')
      expect(negFee).not.toBeNull()
      expect(negFee?.coopFee).toBe(0)
      expect(negFee?.customerPays).toBe(650)
    })

    it('returns null while any box is unusable (empty, non-integer cents, NaN)', () => {
      expect(pricingBreakdown('', '150', '10')).toBeNull()
      expect(pricingBreakdown('200', '', '10')).toBeNull()
      expect(pricingBreakdown('200', '150', '')).toBeNull()
      expect(pricingBreakdown('12.5', '150', '10')).toBeNull()
      expect(pricingBreakdown('-10', '150', '10')).toBeNull()
      expect(pricingBreakdown('200', 'abc', '10')).toBeNull()
      expect(pricingBreakdown('200', '150', 'abc')).toBeNull()
    })
  })

  describe('PricingExample component rendering', () => {
    it('renders placeholder prompt when any box is incomplete', () => {
      render(
        <PricingExample
          baseFeeText=""
          rateText="150"
          feePercentText="10"
          currency="EUR"
          distanceUnit="KILOMETERS"
        />
      )
      expect(screen.getByText('Fill in the three boxes to see the example.')).toBeInTheDocument()
    })

    it('renders breakdown, formats currency, and uses "Customer pays" (never "Restaurant pays")', () => {
      const { container } = render(
        <PricingExample
          baseFeeText="200"
          rateText="150"
          feePercentText="10"
          currency="EUR"
          distanceUnit="KILOMETERS"
        />
      )

      expect(screen.getByText(`A ${EXAMPLE_DISTANCE} km delivery`)).toBeInTheDocument()
      expect(screen.getByText('Base fee')).toBeInTheDocument()
      expect(screen.getByText('€2.00')).toBeInTheDocument()
      expect(screen.getByText('Rider gets')).toBeInTheDocument()
      expect(screen.getByText('€6.50')).toBeInTheDocument()
      expect(screen.getByText('Co-op fee 10%')).toBeInTheDocument()
      expect(screen.getByText('€0.65')).toBeInTheDocument()

      // The critical binding value invariant (AC-7)
      expect(screen.getByText('Customer pays')).toBeInTheDocument()
      expect(screen.getByText('€7.15')).toBeInTheDocument()
      expect(container.textContent).not.toContain('Restaurant pays')
    })

    it('displays unit as "mi" when distanceUnit is MILES', () => {
      render(
        <PricingExample
          baseFeeText="200"
          rateText="150"
          feePercentText="10"
          currency="USD"
          distanceUnit="MILES"
        />
      )
      expect(screen.getByText(`A ${EXAMPLE_DISTANCE} mi delivery`)).toBeInTheDocument()
    })
  })
})
