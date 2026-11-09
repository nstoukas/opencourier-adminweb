import React from 'react'
import { render, screen, fireEvent, within } from '@testing-library/react'
import {
  PricingCard,
  MatchingCard,
  OffersCard,
  RestaurantDelaysCard,
  RiderPayCard,
  InstanceCard,
  PublicPagesCard,
  PUBLIC_PAGES,
  SECTIONS,
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

  // ---------------------------------------------------------------------------
  // OffersCard: Timed offers settings (spec 0031, AC-1)
  // ---------------------------------------------------------------------------
  describe('OffersCard timed offers (spec 0031, AC-1)', () => {
    it('renders Timed offers switch with loaded boolean and toggles via set', () => {
      const mockSet = jest.fn()
      const { rerender } = render(
        <OffersCard
          form={{ ...dummyForm, offerTimingEnabled: false }}
          set={mockSet}
          options={dummyOptions}
          loaded={true}
        />
      )

      const toggle = screen.getByRole('switch', { name: 'Timed offers' })
      expect(toggle).toBeInTheDocument()
      expect(toggle).toHaveAttribute('aria-checked', 'false')
      expect(toggle).not.toBeDisabled()

      // Description text per spec 0031
      expect(
        screen.getByText(
          /Hold an offer until the rider needs to leave, so they arrive about when the food is ready/i
        )
      ).toBeInTheDocument()

      fireEvent.click(toggle)
      expect(mockSet).toHaveBeenCalledWith('offerTimingEnabled', true)

      // Rerender with offerTimingEnabled true
      rerender(
        <OffersCard
          form={{ ...dummyForm, offerTimingEnabled: true }}
          set={mockSet}
          options={dummyOptions}
          loaded={true}
        />
      )
      expect(toggle).toHaveAttribute('aria-checked', 'true')

      fireEvent.click(toggle)
      expect(mockSet).toHaveBeenCalledWith('offerTimingEnabled', false)
    })

    it('Timed offers switch is disabled before settings load or when value is null', () => {
      const { rerender } = render(
        <OffersCard
          form={{ ...dummyForm, offerTimingEnabled: null }}
          set={jest.fn()}
          options={dummyOptions}
          loaded={true}
        />
      )
      expect(screen.getByRole('switch', { name: 'Timed offers' })).toBeDisabled()

      rerender(
        <OffersCard
          form={{ ...dummyForm, offerTimingEnabled: false }}
          set={jest.fn()}
          options={dummyOptions}
          loaded={false}
        />
      )
      expect(screen.getByRole('switch', { name: 'Timed offers' })).toBeDisabled()
    })

    it('shows "Not loaded yet" next to Timed offers switch when offerTimingEnabled is null, and hides it when loaded', () => {
      const { rerender } = render(
        <OffersCard
          form={{ ...dummyForm, offerTimingEnabled: null }}
          set={jest.fn()}
          options={dummyOptions}
          loaded={true}
        />
      )

      const toggle = screen.getByRole('switch', { name: 'Timed offers' })
      const switchContainer = toggle.parentElement as HTMLElement
      expect(within(switchContainer).getByText('Not loaded yet')).toBeInTheDocument()

      rerender(
        <OffersCard
          form={{ ...dummyForm, offerTimingEnabled: false }}
          set={jest.fn()}
          options={dummyOptions}
          loaded={true}
        />
      )

      expect(within(switchContainer).queryByText('Not loaded yet')).toBeNull()
    })

    it('renders the Offers card title and updated description mentioning when offers go out', () => {
      render(
        <OffersCard
          form={{ ...dummyForm, offerTimingEnabled: false }}
          set={jest.fn()}
          options={dummyOptions}
          loaded={true}
        />
      )

      expect(
        screen.getByText('How long an offer to a rider lasts, and when it goes out.')
      ).toBeInTheDocument()
    })

    it('renders offerLeadMinutes with range limits 0 to 30, loaded value, and calls set on change', () => {
      const mockSet = jest.fn()
      render(
        <OffersCard
          form={{ ...dummyForm, offerTimingEnabled: false, offerLeadMinutes: '3' }}
          set={mockSet}
          options={dummyOptions}
          loaded={true}
        />
      )

      const input = screen.getByLabelText('Lead time before an offer (minutes)') as HTMLInputElement
      expect(input).toBeInTheDocument()
      expect(input.id).toBe('offerLeadMinutes')
      expect(input.value).toBe('3')
      expect(input).toHaveAttribute('min', '0')
      expect(input).toHaveAttribute('max', '30')
      expect(input).not.toBeDisabled()

      expect(
        screen.getByText(/Whole minutes, 0 to 30, added before the rider's road time/i)
      ).toBeInTheDocument()

      fireEvent.change(input, { target: { value: '0' } })
      expect(mockSet).toHaveBeenCalledWith('offerLeadMinutes', '0')

      fireEvent.change(input, { target: { value: '30' } })
      expect(mockSet).toHaveBeenCalledWith('offerLeadMinutes', '30')
    })

    it('disables offerLeadMinutes input when offerTimingEnabled is null even when loaded is true', () => {
      render(
        <OffersCard
          form={{ ...dummyForm, offerTimingEnabled: null, offerLeadMinutes: '3' }}
          set={jest.fn()}
          options={dummyOptions}
          loaded={true}
        />
      )

      expect(screen.getByLabelText('Lead time before an offer (minutes)')).toBeDisabled()
    })

    it('disables offerLeadMinutes input before settings load', () => {
      render(
        <OffersCard
          form={{ ...dummyForm, offerLeadMinutes: '' }}
          set={jest.fn()}
          options={dummyOptions}
          loaded={false}
        />
      )

      expect(screen.getByLabelText('Lead time before an offer (minutes)')).toBeDisabled()
    })

    it('renders offerTimingCandidates with range limits 1 to 20, loaded value, and calls set on change', () => {
      const mockSet = jest.fn()
      render(
        <OffersCard
          form={{ ...dummyForm, offerTimingEnabled: false, offerTimingCandidates: '5' }}
          set={mockSet}
          options={dummyOptions}
          loaded={true}
        />
      )

      const input = screen.getByLabelText('Riders compared by road time') as HTMLInputElement
      expect(input).toBeInTheDocument()
      expect(input.id).toBe('offerTimingCandidates')
      expect(input.value).toBe('5')
      expect(input).toHaveAttribute('min', '1')
      expect(input).toHaveAttribute('max', '20')
      expect(input).not.toBeDisabled()

      expect(
        screen.getByText(/How many of the nearest riders are compared, 1 to 20/i)
      ).toBeInTheDocument()

      fireEvent.change(input, { target: { value: '1' } })
      expect(mockSet).toHaveBeenCalledWith('offerTimingCandidates', '1')

      fireEvent.change(input, { target: { value: '20' } })
      expect(mockSet).toHaveBeenCalledWith('offerTimingCandidates', '20')
    })

    it('disables offerTimingCandidates input when offerTimingEnabled is null even when loaded is true', () => {
      render(
        <OffersCard
          form={{ ...dummyForm, offerTimingEnabled: null, offerTimingCandidates: '5' }}
          set={jest.fn()}
          options={dummyOptions}
          loaded={true}
        />
      )

      expect(screen.getByLabelText('Riders compared by road time')).toBeDisabled()
    })

    it('disables offerTimingCandidates input before settings load', () => {
      render(
        <OffersCard
          form={{ ...dummyForm, offerTimingCandidates: '' }}
          set={jest.fn()}
          options={dummyOptions}
          loaded={false}
        />
      )

      expect(screen.getByLabelText('Riders compared by road time')).toBeDisabled()
    })
  })

  // ---------------------------------------------------------------------------
  // RestaurantDelaysCard: Restaurant delays settings (spec 0033, AC-1)
  // ---------------------------------------------------------------------------
  describe('RestaurantDelaysCard (spec 0033, AC-1)', () => {
    it('SECTIONS includes restaurant-delays with title "Restaurant delays"', () => {
      const section = SECTIONS.find((s) => s.id === 'restaurant-delays')
      expect(section).toBeDefined()
      expect(section?.title).toBe('Restaurant delays')
    })

    it('renders the Restaurant delays card title and description', () => {
      render(
        <RestaurantDelaysCard
          form={{ ...dummyForm, waitPayEnabled: false }}
          set={jest.fn()}
          options={dummyOptions}
          loaded={true}
        />
      )

      expect(screen.getByText('Restaurant delays')).toBeInTheDocument()
      expect(
        screen.getByText(
          'What a rider is paid when a restaurant keeps them past its promised time, and when they can leave.'
        )
      ).toBeInTheDocument()
    })

    it('renders Delay pay switch with loaded boolean and toggles via set', () => {
      const mockSet = jest.fn()
      const { rerender } = render(
        <RestaurantDelaysCard
          form={{ ...dummyForm, waitPayEnabled: false }}
          set={mockSet}
          options={dummyOptions}
          loaded={true}
        />
      )

      const toggle = screen.getByRole('switch', { name: 'Delay pay' })
      expect(toggle).toBeInTheDocument()
      expect(toggle).toHaveAttribute('aria-checked', 'false')
      expect(toggle).not.toBeDisabled()

      expect(
        screen.getByText(
          /Pays a rider per minute once the restaurant's promised time plus the free minutes below has passed and the rider is still waiting, and charges the restaurant all of it\. A rider who arrives after that, to food already marked ready, is not paid and the restaurant is not charged\. Off: nothing is paid or charged\. The waiting clock and leaving still work\./i
        )
      ).toBeInTheDocument()

      fireEvent.click(toggle)
      expect(mockSet).toHaveBeenCalledWith('waitPayEnabled', true)

      rerender(
        <RestaurantDelaysCard
          form={{ ...dummyForm, waitPayEnabled: true }}
          set={mockSet}
          options={dummyOptions}
          loaded={true}
        />
      )
      expect(toggle).toHaveAttribute('aria-checked', 'true')

      fireEvent.click(toggle)
      expect(mockSet).toHaveBeenCalledWith('waitPayEnabled', false)
    })

    it('Delay pay switch is disabled before settings load or when value is null', () => {
      const { rerender } = render(
        <RestaurantDelaysCard
          form={{ ...dummyForm, waitPayEnabled: null }}
          set={jest.fn()}
          options={dummyOptions}
          loaded={true}
        />
      )
      expect(screen.getByRole('switch', { name: 'Delay pay' })).toBeDisabled()

      rerender(
        <RestaurantDelaysCard
          form={{ ...dummyForm, waitPayEnabled: false }}
          set={jest.fn()}
          options={dummyOptions}
          loaded={false}
        />
      )
      expect(screen.getByRole('switch', { name: 'Delay pay' })).toBeDisabled()
    })

    it('shows "Not loaded yet" next to Delay pay switch when waitPayEnabled is null, and hides it when loaded', () => {
      const { rerender } = render(
        <RestaurantDelaysCard
          form={{ ...dummyForm, waitPayEnabled: null }}
          set={jest.fn()}
          options={dummyOptions}
          loaded={true}
        />
      )

      const toggle = screen.getByRole('switch', { name: 'Delay pay' })
      const switchContainer = toggle.parentElement as HTMLElement
      expect(within(switchContainer).getByText('Not loaded yet')).toBeInTheDocument()

      rerender(
        <RestaurantDelaysCard
          form={{ ...dummyForm, waitPayEnabled: false }}
          set={jest.fn()}
          options={dummyOptions}
          loaded={true}
        />
      )

      expect(within(switchContainer).queryByText('Not loaded yet')).toBeNull()
    })

    it('renders waitPayFreeMinutes with range limits 0 to 60, loaded value, and calls set on change', () => {
      const mockSet = jest.fn()
      render(
        <RestaurantDelaysCard
          form={{ ...dummyForm, waitPayEnabled: false, waitPayFreeMinutes: '5' }}
          set={mockSet}
          options={dummyOptions}
          loaded={true}
        />
      )

      const input = screen.getByLabelText('Free minutes after the promised time') as HTMLInputElement
      expect(input).toBeInTheDocument()
      expect(input.id).toBe('waitPayFreeMinutes')
      expect(input.value).toBe('5')
      expect(input).toHaveAttribute('min', '0')
      expect(input).toHaveAttribute('max', '60')
      expect(input).not.toBeDisabled()

      expect(
        screen.getByText('Whole minutes, 0 to 60. Used only while Delay pay is on.')
      ).toBeInTheDocument()

      fireEvent.change(input, { target: { value: '0' } })
      expect(mockSet).toHaveBeenCalledWith('waitPayFreeMinutes', '0')

      fireEvent.change(input, { target: { value: '60' } })
      expect(mockSet).toHaveBeenCalledWith('waitPayFreeMinutes', '60')
    })

    it('disables waitPayFreeMinutes input when waitPayEnabled is null even when loaded is true', () => {
      render(
        <RestaurantDelaysCard
          form={{ ...dummyForm, waitPayEnabled: null, waitPayFreeMinutes: '5' }}
          set={jest.fn()}
          options={dummyOptions}
          loaded={true}
        />
      )

      expect(screen.getByLabelText('Free minutes after the promised time')).toBeDisabled()
    })

    it('disables waitPayFreeMinutes input before settings load', () => {
      render(
        <RestaurantDelaysCard
          form={{ ...dummyForm, waitPayFreeMinutes: '' }}
          set={jest.fn()}
          options={dummyOptions}
          loaded={false}
        />
      )

      expect(screen.getByLabelText('Free minutes after the promised time')).toBeDisabled()
    })

    it('renders waitPayCentsPerMinute with range limits 0 to 200, loaded value, and calls set on change', () => {
      const mockSet = jest.fn()
      render(
        <RestaurantDelaysCard
          form={{ ...dummyForm, waitPayEnabled: false, waitPayCentsPerMinute: '10' }}
          set={mockSet}
          options={dummyOptions}
          loaded={true}
        />
      )

      const input = screen.getByLabelText('Delay pay per minute (cents)') as HTMLInputElement
      expect(input).toBeInTheDocument()
      expect(input.id).toBe('waitPayCentsPerMinute')
      expect(input.value).toBe('10')
      expect(input).toHaveAttribute('min', '0')
      expect(input).toHaveAttribute('max', '200')
      expect(input).not.toBeDisabled()

      expect(
        screen.getByText(
          'Whole cents, 0 to 200. The restaurant is charged the same. Used only while Delay pay is on.'
        )
      ).toBeInTheDocument()

      fireEvent.change(input, { target: { value: '0' } })
      expect(mockSet).toHaveBeenCalledWith('waitPayCentsPerMinute', '0')

      fireEvent.change(input, { target: { value: '200' } })
      expect(mockSet).toHaveBeenCalledWith('waitPayCentsPerMinute', '200')
    })

    it('disables waitPayCentsPerMinute input when waitPayEnabled is null even when loaded is true', () => {
      render(
        <RestaurantDelaysCard
          form={{ ...dummyForm, waitPayEnabled: null, waitPayCentsPerMinute: '10' }}
          set={jest.fn()}
          options={dummyOptions}
          loaded={true}
        />
      )

      expect(screen.getByLabelText('Delay pay per minute (cents)')).toBeDisabled()
    })

    it('disables waitPayCentsPerMinute input before settings load', () => {
      render(
        <RestaurantDelaysCard
          form={{ ...dummyForm, waitPayCentsPerMinute: '' }}
          set={jest.fn()}
          options={dummyOptions}
          loaded={false}
        />
      )

      expect(screen.getByLabelText('Delay pay per minute (cents)')).toBeDisabled()
    })

    it('renders waitLimitMinutes with range limits 1 to 60, loaded value, and calls set on change', () => {
      const mockSet = jest.fn()
      render(
        <RestaurantDelaysCard
          form={{ ...dummyForm, waitPayEnabled: false, waitLimitMinutes: '10' }}
          set={mockSet}
          options={dummyOptions}
          loaded={true}
        />
      )

      const input = screen.getByLabelText('Minutes before a rider can leave') as HTMLInputElement
      expect(input).toBeInTheDocument()
      expect(input.id).toBe('waitLimitMinutes')
      expect(input.value).toBe('10')
      expect(input).toHaveAttribute('min', '1')
      expect(input).toHaveAttribute('max', '60')
      expect(input).not.toBeDisabled()

      expect(
        screen.getByText(
          "Whole minutes, 1 to 60, counted from the restaurant's promised time, or from the rider's arrival if that was later. Applies whether Delay pay is on or off."
        )
      ).toBeInTheDocument()

      fireEvent.change(input, { target: { value: '1' } })
      expect(mockSet).toHaveBeenCalledWith('waitLimitMinutes', '1')

      fireEvent.change(input, { target: { value: '60' } })
      expect(mockSet).toHaveBeenCalledWith('waitLimitMinutes', '60')
    })

    it('disables waitLimitMinutes input when waitPayEnabled is null even when loaded is true', () => {
      render(
        <RestaurantDelaysCard
          form={{ ...dummyForm, waitPayEnabled: null, waitLimitMinutes: '10' }}
          set={jest.fn()}
          options={dummyOptions}
          loaded={true}
        />
      )

      expect(screen.getByLabelText('Minutes before a rider can leave')).toBeDisabled()
    })

    it('disables waitLimitMinutes input before settings load', () => {
      render(
        <RestaurantDelaysCard
          form={{ ...dummyForm, waitLimitMinutes: '' }}
          set={jest.fn()}
          options={dummyOptions}
          loaded={false}
        />
      )

      expect(screen.getByLabelText('Minutes before a rider can leave')).toBeDisabled()
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
  // MatchingCard: arrivalRadiusMetres (spec 0021, AC-11, row 19)
  // ---------------------------------------------------------------------------
  describe('MatchingCard (spec 0021, AC-11)', () => {
    it('renders arrivalRadiusMetres with loaded value, min 0 max 300, and calls set on change', () => {
      const mockSet = jest.fn()
      render(
        <MatchingCard
          form={{ ...dummyForm, arrivalRadiusMetres: '50' }}
          set={mockSet}
          options={dummyOptions}
          loaded={true}
        />
      )

      const input = screen.getByLabelText('Arrival radius (metres)') as HTMLInputElement
      expect(input).toBeInTheDocument()
      expect(input.id).toBe('arrivalRadiusMetres')
      expect(input.value).toBe('50')
      expect(input).toHaveAttribute('min', '0')
      expect(input).toHaveAttribute('max', '300')
      expect(input).not.toBeDisabled()

      fireEvent.change(input, { target: { value: '80' } })
      expect(mockSet).toHaveBeenCalledWith('arrivalRadiusMetres', '80')
    })

    it('renders description explaining 0 switches detection off and town GPS accuracy', () => {
      render(
        <MatchingCard
          form={{ ...dummyForm, arrivalRadiusMetres: '50' }}
          set={jest.fn()}
          options={dummyOptions}
          loaded={true}
        />
      )

      expect(
        screen.getByText(/0 switches detection off \(riders tap I'm here or swipe\); otherwise 20 to 300/i)
      ).toBeInTheDocument()
      expect(
        screen.getByText(/GPS in town is often only good to 10 to 30 m/i)
      ).toBeInTheDocument()
    })

    it('disables arrivalRadiusMetres input before settings load', () => {
      render(
        <MatchingCard
          form={{ ...dummyForm, arrivalRadiusMetres: '' }}
          set={jest.fn()}
          options={dummyOptions}
          loaded={false}
        />
      )

      const input = screen.getByLabelText('Arrival radius (metres)') as HTMLInputElement
      expect(input).toBeDisabled()
    })
  })

  // ---------------------------------------------------------------------------
  // MatchingCard: maxDriftDistance (scope row 107)
  // ---------------------------------------------------------------------------
  describe('MatchingCard maxDriftDistance (scope row 107)', () => {
    it("with distance unit KILOMETERS the field's label contains km and not metres", () => {
      // Setup: dummy form with distanceUnit set to KILOMETERS
      render(
        <MatchingCard
          form={{ ...dummyForm, distanceUnit: 'KILOMETERS' }}
          set={jest.fn()}
          options={dummyOptions}
          loaded={true}
        />
      )

      const input = screen.getByLabelText(/max drift distance \(km\)/i) as HTMLInputElement
      expect(input).toBeInTheDocument()
      expect(input.id).toBe('maxDriftDistance')

      // Field label must contain km and not say metres
      const label = document.querySelector('label[for="maxDriftDistance"]')
      expect(label).not.toBeNull()
      expect(label?.textContent).toContain('km')
      expect(label?.textContent?.toLowerCase()).not.toContain('metres')
      expect(label?.textContent?.toLowerCase()).not.toContain('meters')

      // Querying specifically for metres on maxDriftDistance must return null
      expect(screen.queryByLabelText(/max drift distance.*metres/i)).toBeNull()
    })

    it('with MILES it contains mile', () => {
      // Setup: dummy form with distanceUnit set to MILES
      render(
        <MatchingCard
          form={{ ...dummyForm, distanceUnit: 'MILES' }}
          set={jest.fn()}
          options={dummyOptions}
          loaded={true}
        />
      )

      const input = screen.getByLabelText(/max drift distance \(mile\)/i) as HTMLInputElement
      expect(input).toBeInTheDocument()
      expect(input.id).toBe('maxDriftDistance')

      // Field label must contain mile and not metres or km
      const label = document.querySelector('label[for="maxDriftDistance"]')
      expect(label).not.toBeNull()
      expect(label?.textContent).toContain('mile')
      expect(label?.textContent?.toLowerCase()).not.toContain('metres')
      expect(label?.textContent?.toLowerCase()).not.toContain('meters')
      expect(label?.textContent).not.toContain('km')
    })

    it('the help text mentions where the delivery was quoted', () => {
      // Setup: MatchingCard loaded with maxDriftDistance configured
      render(
        <MatchingCard
          form={{ ...dummyForm, maxDriftDistance: '5' }}
          set={jest.fn()}
          options={dummyOptions}
          loaded={true}
        />
      )

      // The description must name where the delivery was quoted and what limit is measured against
      const description = screen.getByText(/where (?:it|the delivery) was quoted/i)
      expect(description).toBeInTheDocument()
      expect(description.textContent).toMatch(/delivery/i)
      expect(description.textContent).toMatch(/pickup or drop off/i)
      expect(description.textContent).toBe(
        "How far a delivery's pickup or drop off may be from where it was quoted."
      )
    })

    it('renders maxDriftDistance with loaded value, min 0, and calls set on change', () => {
      const mockSet = jest.fn()
      render(
        <MatchingCard
          form={{ ...dummyForm, maxDriftDistance: '5' }}
          set={mockSet}
          options={dummyOptions}
          loaded={true}
        />
      )

      const input = screen.getByLabelText(/max drift distance/i) as HTMLInputElement
      expect(input.value).toBe('5')
      expect(input).toHaveAttribute('min', '0')
      expect(input).not.toBeDisabled()

      fireEvent.change(input, { target: { value: '10' } })
      expect(mockSet).toHaveBeenCalledWith('maxDriftDistance', '10')
    })

    it('disables maxDriftDistance input before settings load', () => {
      render(
        <MatchingCard
          form={{ ...dummyForm, maxDriftDistance: '' }}
          set={jest.fn()}
          options={dummyOptions}
          loaded={false}
        />
      )

      const input = screen.getByLabelText(/max drift distance/i) as HTMLInputElement
      expect(input).toBeDisabled()
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
