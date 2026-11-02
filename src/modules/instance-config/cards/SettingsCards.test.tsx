import React from 'react'
import { render, screen, fireEvent, within } from '@testing-library/react'
import {
  PricingCard,
  OffersCard,
  RiderPayCard,
  InstanceCard,
  PublicPagesCard,
  PUBLIC_PAGES,
} from './SettingsCards'
import { EMPTY_FORM, type SettingsForm } from '../settingsDiff'

describe('SettingsCards components (row 87 review fixes)', () => {
  const dummyForm: SettingsForm = {
    ...EMPTY_FORM,
    quoteBaseFee: '200',
    quoteRatePerDistanceUnit: '150',
    feePercentageAmount: '10',
    currency: 'EUR',
    distanceUnit: 'KILOMETERS',
    quoteCalculationType: 'BY_DISTANCE',
    name: 'Volos Courier Co-op',
    link: 'https://volos.courier.coop',
    websocketLink: 'wss://volos.courier.coop/ws',
    imageUrl: 'https://volos.courier.coop/logo.png',
  }

  const dummyOptions = {
    currency: ['EUR', 'USD'],
    distanceUnit: ['KILOMETERS', 'MILES'],
    quoteCalculationType: ['BY_DISTANCE'],
    courierMatcherType: ['NEAREST_COURIER'],
    geoCalculationType: ['HAVERSINE'],
    deliveryDurationCalculationType: ['SIMPLE'],
    courierCompensationCalculationType: ['FROM_QUOTE_FROM'],
    defaultDietaryRestrictions: ['NONE', 'VEGAN'],
  }

  // ---------------------------------------------------------------------------
  // Fix 5: Rate label follows distanceUnit
  // ---------------------------------------------------------------------------
  describe('PricingCard rate label (fix 5)', () => {
    it('labels rate box as "Rate per km (cents)" when distanceUnit is KILOMETERS', () => {
      render(
        <PricingCard
          form={{ ...dummyForm, distanceUnit: 'KILOMETERS' }}
          set={jest.fn()}
          options={dummyOptions}
          loaded={true}
        />
      )
      expect(screen.getByLabelText(/Rate per km \(cents\)/i)).toBeInTheDocument()
    })

    it('labels rate box as "Rate per mile (cents)" when distanceUnit is MILES', () => {
      render(
        <PricingCard
          form={{ ...dummyForm, distanceUnit: 'MILES' }}
          set={jest.fn()}
          options={dummyOptions}
          loaded={true}
        />
      )
      expect(screen.getByLabelText(/Rate per mile \(cents\)/i)).toBeInTheDocument()
    })
  })

  // ---------------------------------------------------------------------------
  // Fix 6: Select with value="" renders disabled "Not set" option
  // ---------------------------------------------------------------------------
  describe('OptionSelect "Not set" option when value is empty (fix 6)', () => {
    it('shows a "Not set" option and nothing else selected when value is empty string', () => {
      render(
        <PricingCard
          form={{ ...dummyForm, currency: '' }}
          set={jest.fn()}
          options={dummyOptions}
          loaded={true}
        />
      )

      const select = screen.getByLabelText(/^Currency/i) as HTMLSelectElement
      expect(select.value).toBe('')

      const notSetOption = within(select).getByRole('option', { name: 'Not set' }) as HTMLOptionElement
      expect(notSetOption).toBeInTheDocument()
      expect(notSetOption.value).toBe('')
      expect(notSetOption.disabled).toBe(true)
      expect(notSetOption.selected).toBe(true)

      const eurOption = within(select).getByRole('option', { name: 'EUR (Euro)' }) as HTMLOptionElement
      expect(eurOption.selected).toBe(false)
    })

    it('does not render "Not set" option when value is non-empty', () => {
      render(
        <PricingCard
          form={{ ...dummyForm, currency: 'EUR' }}
          set={jest.fn()}
          options={dummyOptions}
          loaded={true}
        />
      )

      const select = screen.getByLabelText(/^Currency/i) as HTMLSelectElement
      expect(within(select).queryByRole('option', { name: 'Not set' })).toBeNull()
      const eurOption = within(select).getByRole('option', { name: 'EUR (Euro)' }) as HTMLOptionElement
      expect(eurOption.selected).toBe(true)
    })
  })

  // ---------------------------------------------------------------------------
  // Fix 7: Bad URL shows "<Label> is not a valid URL" under the box
  // ---------------------------------------------------------------------------
  describe('InstanceCard URL validation error (fix 7)', () => {
    it('renders "<Label> is not a valid URL" for invalid websocketLink', () => {
      render(
        <InstanceCard
          form={{ ...dummyForm, websocketLink: 'bad-websocket-url' }}
          set={jest.fn()}
          options={dummyOptions}
          loaded={true}
          linkLocked={true}
        />
      )
      expect(screen.getByText('Websocket URL is not a valid URL')).toBeInTheDocument()
    })

    it('renders "<Label> is not a valid URL" for invalid imageUrl', () => {
      render(
        <InstanceCard
          form={{ ...dummyForm, imageUrl: 'bad-image-url' }}
          set={jest.fn()}
          options={dummyOptions}
          loaded={true}
          linkLocked={true}
        />
      )
      expect(screen.getByText('Logo image URL is not a valid URL')).toBeInTheDocument()
    })

    it('renders "<Label> is not a valid URL" for invalid link when unlocked', () => {
      render(
        <InstanceCard
          form={{ ...dummyForm, link: 'bad-instance-url' }}
          set={jest.fn()}
          options={dummyOptions}
          loaded={true}
          linkLocked={false}
        />
      )
      expect(screen.getByText('URL is not a valid URL')).toBeInTheDocument()
    })
  })

  // ---------------------------------------------------------------------------
  // Ported settings: OffersCard (handBackSeconds), RiderPayCard (cancellationPayoutPolicy),
  // InstanceCard (restaurantHistoryDays, dispatchPhoneNumber)
  // ---------------------------------------------------------------------------
  describe('OffersCard (spec 0020, row 71)', () => {
    it('renders handBackSeconds with loaded value and calls set on change', () => {
      const mockSet = jest.fn()
      render(
        <OffersCard
          form={{ ...dummyForm, handBackSeconds: '60', offerExpiryEnabled: true }}
          set={mockSet}
          options={dummyOptions}
          loaded={true}
        />
      )

      const input = screen.getByLabelText('Seconds a rider can hand back an order for free') as HTMLInputElement
      expect(input).toBeInTheDocument()
      expect(input.value).toBe('60')
      expect(input).not.toBeDisabled()

      fireEvent.change(input, { target: { value: '45' } })
      expect(mockSet).toHaveBeenCalledWith('handBackSeconds', '45')
    })

    it('handBackSeconds is editable once loaded even when offerExpiryEnabled is false', () => {
      render(
        <OffersCard
          form={{ ...dummyForm, handBackSeconds: '60', offerExpiryEnabled: false }}
          set={jest.fn()}
          options={dummyOptions}
          loaded={true}
        />
      )

      const input = screen.getByLabelText('Seconds a rider can hand back an order for free') as HTMLInputElement
      expect(input).not.toBeDisabled()
    })

    it('handBackSeconds is disabled before settings load', () => {
      render(
        <OffersCard
          form={{ ...dummyForm, handBackSeconds: '' }}
          set={jest.fn()}
          options={dummyOptions}
          loaded={false}
        />
      )

      const input = screen.getByLabelText('Seconds a rider can hand back an order for free') as HTMLInputElement
      expect(input).toBeDisabled()
    })
  })

  describe('RiderPayCard (spec 0015, row 32)', () => {
    const mockPayoutPolicies = {
      DEFAULT: 50,
      FULL_COMPENSATION: 100,
      HALF_COMPENSATION: 50,
    }

    it('renders cancellationPayoutPolicy select with keys of reassignmentPayoutPolicies menu formatted as KEY (N%)', () => {
      const mockSet = jest.fn()
      render(
        <RiderPayCard
          form={{ ...dummyForm, cancellationPayoutPolicy: 'FULL_COMPENSATION' }}
          set={mockSet}
          options={dummyOptions}
          loaded={true}
          policyEditor={<div data-testid="policy-editor">Policy Editor</div>}
          payoutPolicies={mockPayoutPolicies}
        />
      )

      const select = screen.getByLabelText('Pay when a job is cancelled') as HTMLSelectElement
      expect(select).toBeInTheDocument()
      expect(select.value).toBe('FULL_COMPENSATION')
      expect(select).not.toBeDisabled()

      const options = Array.from(select.options).map((opt) => opt.text)
      expect(options).toContain('DEFAULT (50%)')
      expect(options).toContain('FULL_COMPENSATION (100%)')
      expect(options).toContain('HALF_COMPENSATION (50%)')

      fireEvent.change(select, { target: { value: 'DEFAULT' } })
      expect(mockSet).toHaveBeenCalledWith('cancellationPayoutPolicy', 'DEFAULT')
    })

    it('shows a saved policy no longer on the menu as a disabled option and the box holds it', () => {
      render(
        <RiderPayCard
          form={{ ...dummyForm, cancellationPayoutPolicy: 'RETIRED_POLICY' }}
          set={jest.fn()}
          options={dummyOptions}
          loaded={true}
          policyEditor={null}
          payoutPolicies={mockPayoutPolicies}
        />
      )

      const select = screen.getByLabelText('Pay when a job is cancelled') as HTMLSelectElement
      expect(select.value).toBe('RETIRED_POLICY')

      const retiredOption = Array.from(select.options).find((opt) => opt.value === 'RETIRED_POLICY')
      expect(retiredOption).toBeDefined()
      expect(retiredOption?.text).toBe('RETIRED_POLICY (no longer on the menu)')
      expect(retiredOption?.disabled).toBe(true)
    })

    it('shows "Not set" disabled option when cancellationPayoutPolicy is empty', () => {
      render(
        <RiderPayCard
          form={{ ...dummyForm, cancellationPayoutPolicy: '' }}
          set={jest.fn()}
          options={dummyOptions}
          loaded={true}
          policyEditor={null}
          payoutPolicies={mockPayoutPolicies}
        />
      )

      const select = screen.getByLabelText('Pay when a job is cancelled') as HTMLSelectElement
      expect(select.value).toBe('')
      const notSetOption = Array.from(select.options).find((opt) => opt.value === '')
      expect(notSetOption).toBeDefined()
      expect(notSetOption?.text).toBe('Not set')
      expect(notSetOption?.disabled).toBe(true)
    })

    it('is disabled before settings load', () => {
      render(
        <RiderPayCard
          form={{ ...dummyForm, cancellationPayoutPolicy: 'FULL_COMPENSATION' }}
          set={jest.fn()}
          options={dummyOptions}
          loaded={false}
          policyEditor={null}
          payoutPolicies={mockPayoutPolicies}
        />
      )

      const select = screen.getByLabelText('Pay when a job is cancelled') as HTMLSelectElement
      expect(select).toBeDisabled()
    })
  })

  describe('InstanceCard ported settings (spec 0017 row 28, scope row 72)', () => {
    it('renders restaurantHistoryDays with min 1 max 365 and calls set on change', () => {
      const mockSet = jest.fn()
      render(
        <InstanceCard
          form={{ ...dummyForm, restaurantHistoryDays: '30' }}
          set={mockSet}
          options={dummyOptions}
          loaded={true}
          linkLocked={true}
        />
      )

      const input = screen.getByLabelText('Restaurant order history (days)') as HTMLInputElement
      expect(input).toBeInTheDocument()
      expect(input.value).toBe('30')
      expect(input).toHaveAttribute('min', '1')
      expect(input).toHaveAttribute('max', '365')
      expect(input).not.toBeDisabled()

      fireEvent.change(input, { target: { value: '60' } })
      expect(mockSet).toHaveBeenCalledWith('restaurantHistoryDays', '60')
    })

    it('renders dispatchPhoneNumber with type tel and calls set on change', () => {
      const mockSet = jest.fn()
      render(
        <InstanceCard
          form={{ ...dummyForm, dispatchPhoneNumber: '+30 24210 12345' }}
          set={mockSet}
          options={dummyOptions}
          loaded={true}
          linkLocked={true}
        />
      )

      const input = screen.getByLabelText('Dispatch phone number') as HTMLInputElement
      expect(input).toBeInTheDocument()
      expect(input.value).toBe('+30 24210 12345')
      expect(input).toHaveAttribute('type', 'tel')
      expect(input).not.toBeDisabled()

      fireEvent.change(input, { target: { value: '+30 24210 99999' } })
      expect(mockSet).toHaveBeenCalledWith('dispatchPhoneNumber', '+30 24210 99999')
    })

    it('disables restaurantHistoryDays and dispatchPhoneNumber when not loaded', () => {
      render(
        <InstanceCard
          form={{ ...dummyForm, restaurantHistoryDays: '', dispatchPhoneNumber: '' }}
          set={jest.fn()}
          options={dummyOptions}
          loaded={false}
          linkLocked={true}
        />
      )

      expect(screen.getByLabelText('Restaurant order history (days)')).toBeDisabled()
      expect(screen.getByLabelText('Dispatch phone number')).toBeDisabled()
    })
  })

  // ---------------------------------------------------------------------------
  // Fix 9: PublicPagesCard
  // ---------------------------------------------------------------------------
  describe('PublicPagesCard (fix 9)', () => {
    it('renders all four public pages and clicking Edit triggers onEdit with the view', () => {
      const mockOnEdit = jest.fn()
      render(<PublicPagesCard onEdit={mockOnEdit} />)

      PUBLIC_PAGES.forEach((page) => {
        const editBtn = screen.getByRole('button', { name: new RegExp(`Edit ${page.title}`, 'i') })
        expect(editBtn).toBeInTheDocument()
        fireEvent.click(editBtn)
        expect(mockOnEdit).toHaveBeenCalledWith(page.view)
      })

      expect(mockOnEdit).toHaveBeenCalledTimes(4)
    })
  })
})
