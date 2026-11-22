import React from 'react'
import { render, screen, fireEvent, within } from '@testing-library/react'
import {
  PricingCard,
  MatchingCard,
  BoxCard,
  FairnessCard,
  OffersCard,
  TwoOrdersCard,
  RestaurantDelaysCard,
  RiderPayCard,
  InstanceCard,
  PublicPagesCard,
  ReviewRequestsCard,
  TimeWorkedCard,
  PUBLIC_PAGES,
  SECTIONS,
  optionLabel,
} from './SettingsCards'
import {
  EMPTY_FORM,
  blockers as rawBlockers,
  pendingChanges as rawPendingChanges,
  type SettingsForm,
} from '../settingsDiff'
import { createI18n } from '@/i18n/createI18n'

const t = createI18n('en').t
const blockers = (changes: any[], form: SettingsForm) => rawBlockers(t, changes, form)
const pendingChanges = (saved: SettingsForm, form: SettingsForm) => rawPendingChanges(t, 'en', saved, form)

const TWO_ORDER_POLICY_LABELS = {
  SHORTAGE_ONLY: optionLabel(t, 'twoOrderPolicy', 'SHORTAGE_ONLY'),
  WHENEVER_FITS: optionLabel(t, 'twoOrderPolicy', 'WHENEVER_FITS'),
}
const ADD_ON_MOMENT_LABELS = {
  BEFORE_PICKUP: optionLabel(t, 'addOnMoment', 'BEFORE_PICKUP'),
  BEFORE_DROPOFF: optionLabel(t, 'addOnMoment', 'BEFORE_DROPOFF'),
  SAME_RESTAURANT: optionLabel(t, 'addOnMoment', 'SAME_RESTAURANT'),
}
const MATCHER_COPY = {
  FAIRNESS: {
    title: t('settings.matcher.FAIRNESS.title'),
    description: t('settings.matcher.FAIRNESS.description'),
  },
}

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
  // PricingCard: feePercentageCeiling & fee error (spec 0041, AC-8)
  // ---------------------------------------------------------------------------
  describe('PricingCard feePercentageCeiling (spec 0041, AC-8)', () => {
    it('renders field labelled "Co-op fee ceiling (%)" next to fee, with loaded value, min 0, max 100, and calls set on change', () => {
      const mockSet = jest.fn()
      render(
        <PricingCard
          form={{ ...dummyForm, feePercentageAmount: '10', feePercentageCeiling: '25' }}
          set={mockSet}
          options={dummyOptions}
          loaded={true}
        />
      )

      const input = screen.getByLabelText('Co-op fee ceiling (%)') as HTMLInputElement
      expect(input).toBeInTheDocument()
      expect(input.id).toBe('feePercentageCeiling')
      expect(input.value).toBe('25')
      expect(input).toHaveAttribute('type', 'number')
      expect(input).toHaveAttribute('min', '0')
      expect(input).toHaveAttribute('max', '100')
      expect(input).not.toBeDisabled()

      expect(
        screen.getByText('The highest fee % a save accepts. Whole numbers, 0 to 100.')
      ).toBeInTheDocument()

      fireEvent.change(input, { target: { value: '30' } })
      expect(mockSet).toHaveBeenCalledWith('feePercentageCeiling', '30')
    })

    it('fee description says "At most 25 %, the co-op\'s ceiling." when ceiling is 25', () => {
      render(
        <PricingCard
          form={{ ...dummyForm, feePercentageAmount: '10', feePercentageCeiling: '25' }}
          set={jest.fn()}
          options={dummyOptions}
          loaded={true}
        />
      )

      expect(
        screen.getByText("On top of the rider's pay. At most 25 %, the co-op's ceiling.")
      ).toBeInTheDocument()
    })

    it('fee description falls back to base text when ceiling is empty', () => {
      render(
        <PricingCard
          form={{ ...dummyForm, feePercentageAmount: '10', feePercentageCeiling: '   ' }}
          set={jest.fn()}
          options={dummyOptions}
          loaded={true}
        />
      )

      expect(screen.getByText("On top of the rider's pay.")).toBeInTheDocument()
      expect(screen.queryByText(/the co-op's ceiling/i)).toBeNull()
    })

    it('fee description falls back to base text without "At most" for invalid ceilings (150, -5, 25.5, abc) and formats valid whole numbers (05 -> 5 %, 100 -> 100 %)', () => {
      // Ceilings '150', '-5', '25.5' and 'abc' all give "On top of the rider's pay." with no "At most"
      for (const ceiling of ['150', '-5', '25.5', 'abc']) {
        const { unmount } = render(
          <PricingCard
            form={{ ...dummyForm, feePercentageAmount: '10', feePercentageCeiling: ceiling }}
            set={jest.fn()}
            options={dummyOptions}
            loaded={true}
          />
        )
        expect(screen.getByText("On top of the rider's pay.")).toBeInTheDocument()
        expect(screen.queryByText(/At most/i)).toBeNull()
        unmount()
      }

      // '05' gives "At most 5 %"
      const { unmount: unmount05 } = render(
        <PricingCard
          form={{ ...dummyForm, feePercentageAmount: '10', feePercentageCeiling: '05' }}
          set={jest.fn()}
          options={dummyOptions}
          loaded={true}
        />
      )
      expect(
        screen.getByText("On top of the rider's pay. At most 5 %, the co-op's ceiling.")
      ).toBeInTheDocument()
      unmount05()

      // '100' gives "At most 100 %"
      const { unmount: unmount100 } = render(
        <PricingCard
          form={{ ...dummyForm, feePercentageAmount: '10', feePercentageCeiling: '100' }}
          set={jest.fn()}
          options={dummyOptions}
          loaded={true}
        />
      )
      expect(
        screen.getByText("On top of the rider's pay. At most 100 %, the co-op's ceiling.")
      ).toBeInTheDocument()
      unmount100()
    })

    it('shows inline error "Above the co-op\'s ceiling of 25 %." for stored fee 30 and ceiling 25 when nothing changed while blockers([]) holds no ceiling sentence, and blocker appears once fee changed (split from Fable review, decision 53.3)', () => {
      const storedForm: SettingsForm = {
        ...dummyForm,
        feePercentageAmount: '30',
        feePercentageCeiling: '25',
      }
      render(
        <PricingCard
          form={storedForm}
          set={jest.fn()}
          options={dummyOptions}
          loaded={true}
        />
      )

      // Fee field shows its inline error even though nothing was changed
      expect(screen.getByText("Above the co-op's ceiling of 25 %.")).toBeInTheDocument()

      // Save is not blocked by an unchanged pair (decision 53.3): blockers([]) holds no ceiling sentence
      const noChangesBlockers = blockers([], storedForm)
      expect(noChangesBlockers.some((msg) => msg.includes("above the co-op's ceiling"))).toBe(false)

      // Once the fee is changed, the blocker appears
      const changedForm: SettingsForm = { ...storedForm, feePercentageAmount: '35' }
      const changes = pendingChanges(storedForm, changedForm)
      const changedBlockers = blockers(changes, changedForm)
      expect(changedBlockers).toContain(
        "Co-op fee (%) is 35, above the co-op's ceiling of 25 %"
      )
    })

    it('shows error "Above the co-op\'s ceiling of 25 %." when fee is 100 and ceiling is 25', () => {
      render(
        <PricingCard
          form={{ ...dummyForm, feePercentageAmount: '100', feePercentageCeiling: '25' }}
          set={jest.fn()}
          options={dummyOptions}
          loaded={true}
        />
      )

      expect(screen.getByText("Above the co-op's ceiling of 25 %.")).toBeInTheDocument()
    })

    it('shows no error when fee is equal to ceiling (25 % / 25 %)', () => {
      render(
        <PricingCard
          form={{ ...dummyForm, feePercentageAmount: '25', feePercentageCeiling: '25' }}
          set={jest.fn()}
          options={dummyOptions}
          loaded={true}
        />
      )

      expect(screen.queryByText(/Above the co-op's ceiling/i)).toBeNull()
    })

    it('disables feePercentageCeiling input before settings load (loaded = false)', () => {
      render(
        <PricingCard
          form={{ ...dummyForm, feePercentageCeiling: '' }}
          set={jest.fn()}
          options={dummyOptions}
          loaded={false}
        />
      )

      const input = screen.getByLabelText('Co-op fee ceiling (%)') as HTMLInputElement
      expect(input).toBeDisabled()
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
      expect(section?.titleKey).toBe('settings.sections.restaurantDelays')
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

    // Spec 0053 (AC-6): Address notes retention period on Instance configuration
    it('renders addressNoteRetentionDays with min 30 max 730, description, and calls set on change', () => {
      const mockSet = jest.fn()
      render(
        <InstanceCard
          form={{ ...dummyForm, addressNoteRetentionDays: '182', chatRetentionDays: '90' }}
          set={mockSet}
          options={dummyOptions}
          loaded={true}
          linkLocked={true}
        />
      )

      const input = screen.getByLabelText('Address notes kept without an upvote (days)') as HTMLInputElement
      expect(input).toBeInTheDocument()
      expect(input.value).toBe('182')
      expect(input).toHaveAttribute('min', '30')
      expect(input).toHaveAttribute('max', '730')
      expect(input).not.toBeDisabled()
      expect(
        screen.getByText(
          'A note about a place (by a rider, an admin or a restaurant) that no rider other than its author upvotes for this many days is deleted, at 03:30. Each such upvote restarts the period. Riders are told the period. Whole days, 30 to 730; 182 is about 6 months.'
        )
      ).toBeInTheDocument()

      fireEvent.change(input, { target: { value: '200' } })
      expect(mockSet).toHaveBeenCalledWith('addressNoteRetentionDays', '200')
    })

    it('disables restaurantHistoryDays, dispatchPhoneNumber, and addressNoteRetentionDays when not loaded', () => {
      render(
        <InstanceCard
          form={{ ...dummyForm, restaurantHistoryDays: '', dispatchPhoneNumber: '', addressNoteRetentionDays: '' }}
          set={jest.fn()}
          options={dummyOptions}
          loaded={false}
          linkLocked={true}
        />
      )

      expect(screen.getByLabelText('Restaurant order history (days)')).toBeDisabled()
      expect(screen.getByLabelText('Dispatch phone number')).toBeDisabled()
      expect(screen.getByLabelText('Address notes kept without an upvote (days)')).toBeDisabled()
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
        const editBtn = screen.getByRole('button', { name: new RegExp(`Edit ${t(page.titleKey)}`, 'i') })
        expect(editBtn).toBeInTheDocument()
        fireEvent.click(editBtn)
        expect(mockOnEdit).toHaveBeenCalledWith(page.view)
      })

      expect(mockOnEdit).toHaveBeenCalledTimes(4)
    })
  })

  // ---------------------------------------------------------------------------
  // ReviewRequestsCard (spec 0038, AC-3, AC-7)
  // ---------------------------------------------------------------------------
  describe('ReviewRequestsCard (spec 0038, AC-3, AC-7)', () => {
    it('renders heading "Review requests", link to /reviews, and input fields with proper ranges', () => {
      const mockSet = jest.fn()
      render(
        <ReviewRequestsCard
          form={{
            ...dummyForm,
            reviewAnswerDays: '7',
            reviewCorrectionMaxCents: '5000',
          }}
          set={mockSet}
          options={dummyOptions}
          loaded={true}
        />
      )

      expect(screen.getByRole('heading', { name: 'Review requests' })).toBeInTheDocument()
      const link = screen.getByRole('link', { name: 'Reviews' })
      expect(link).toHaveAttribute('href', '/reviews')

      const daysInput = screen.getByLabelText(/Days to answer a review request/i) as HTMLInputElement
      expect(daysInput.value).toBe('7')
      expect(daysInput).toHaveAttribute('type', 'number')
      expect(daysInput).toHaveAttribute('min', '1')
      expect(daysInput).toHaveAttribute('max', '14')
      expect(daysInput).not.toBeDisabled()

      fireEvent.change(daysInput, { target: { value: '10' } })
      expect(mockSet).toHaveBeenCalledWith('reviewAnswerDays', '10')

      const centsInput = screen.getByLabelText(/Largest review pay correction \(cents\)/i) as HTMLInputElement
      expect(centsInput.value).toBe('5000')
      expect(centsInput).toHaveAttribute('type', 'number')
      expect(centsInput).toHaveAttribute('min', '1')
      expect(centsInput).not.toBeDisabled()

      fireEvent.change(centsInput, { target: { value: '7500' } })
      expect(mockSet).toHaveBeenCalledWith('reviewCorrectionMaxCents', '7500')
    })

    it('disables input fields before settings load (loaded = false)', () => {
      render(
        <ReviewRequestsCard
          form={{
            ...dummyForm,
            reviewAnswerDays: '',
            reviewCorrectionMaxCents: '',
          }}
          set={jest.fn()}
          options={dummyOptions}
          loaded={false}
        />
      )

      const daysInput = screen.getByLabelText(/Days to answer a review request/i)
      expect(daysInput).toBeDisabled()

      const centsInput = screen.getByLabelText(/Largest review pay correction \(cents\)/i)
      expect(centsInput).toBeDisabled()
    })
  })

  // ---------------------------------------------------------------------------
  // TimeWorkedCard (spec 0040, AC-17, AC-9)
  // ---------------------------------------------------------------------------
  describe('TimeWorkedCard (spec 0040, AC-17, AC-9)', () => {
    it('renders heading "Time worked", description, and NumberField bound to shiftBreakMinutes with proper min/max and 0 explanation', () => {
      const mockSet = jest.fn()
      render(
        <TimeWorkedCard
          form={{
            ...dummyForm,
            shiftBreakMinutes: '30',
          }}
          set={mockSet}
          options={dummyOptions}
          loaded={true}
        />
      )

      expect(screen.getByRole('heading', { name: 'Time worked' })).toBeInTheDocument()
      const input = screen.getByLabelText(/Longest break inside a worked shift, in minutes/i) as HTMLInputElement
      expect(input.value).toBe('30')
      expect(input).toHaveAttribute('type', 'number')
      expect(input).toHaveAttribute('min', '0')
      expect(input).toHaveAttribute('max', '240')
      expect(input).not.toBeDisabled()

      // Description explains 0
      expect(screen.getByText(/0 means every Offline with no job ends the shift/i)).toBeInTheDocument()

      fireEvent.change(input, { target: { value: '45' } })
      expect(mockSet).toHaveBeenCalledWith('shiftBreakMinutes', '45')
    })

    it('disables shiftBreakMinutes input before settings load (loaded = false)', () => {
      render(
        <TimeWorkedCard
          form={{
            ...dummyForm,
            shiftBreakMinutes: '',
          }}
          set={jest.fn()}
          options={dummyOptions}
          loaded={false}
        />
      )

      const input = screen.getByLabelText(/Longest break inside a worked shift, in minutes/i)
      expect(input).toBeDisabled()
    })
  })

  // ---------------------------------------------------------------------------
  // BoxCard (spec 0043, AC-2, AC-8)
  // ---------------------------------------------------------------------------
  describe('BoxCard (spec 0043, AC-2, AC-8)', () => {
    it('renders Box section heading and binds each of the four settings', () => {
      const mockSet = jest.fn()
      render(
        <BoxCard
          form={{
            ...dummyForm,
            boxUnitsSmall: '30',
            boxUnitsMedium: '50',
            boxUnitsLarge: '100',
            boxDefaultSize: 'MEDIUM',
          }}
          set={mockSet}
          options={dummyOptions}
          loaded={true}
        />
      )

      expect(screen.getByRole('heading', { name: 'Box' })).toBeInTheDocument()

      const smallInput = screen.getByLabelText('Box units a Small order takes') as HTMLInputElement
      expect(smallInput.value).toBe('30')
      expect(smallInput).toHaveAttribute('type', 'number')
      expect(smallInput).toHaveAttribute('min', '1')
      expect(smallInput).toHaveAttribute('max', '100')
      expect(smallInput).not.toBeDisabled()

      const mediumInput = screen.getByLabelText('Box units a Medium order takes') as HTMLInputElement
      expect(mediumInput.value).toBe('50')
      expect(mediumInput).toHaveAttribute('type', 'number')
      expect(mediumInput).toHaveAttribute('min', '1')
      expect(mediumInput).toHaveAttribute('max', '100')
      expect(mediumInput).not.toBeDisabled()

      const largeInput = screen.getByLabelText('Box units a Large order takes') as HTMLInputElement
      expect(largeInput.value).toBe('100')
      expect(largeInput).toHaveAttribute('type', 'number')
      expect(largeInput).toHaveAttribute('min', '1')
      expect(largeInput).toHaveAttribute('max', '100')
      expect(largeInput).not.toBeDisabled()

      const defaultSelect = screen.getByLabelText('Size of an order sent with none') as HTMLSelectElement
      expect(defaultSelect.value).toBe('MEDIUM')
      expect(defaultSelect).not.toBeDisabled()

      fireEvent.change(smallInput, { target: { value: '35' } })
      expect(mockSet).toHaveBeenCalledWith('boxUnitsSmall', '35')

      fireEvent.change(mediumInput, { target: { value: '55' } })
      expect(mockSet).toHaveBeenCalledWith('boxUnitsMedium', '55')

      fireEvent.change(largeInput, { target: { value: '95' } })
      expect(mockSet).toHaveBeenCalledWith('boxUnitsLarge', '95')

      fireEvent.change(defaultSelect, { target: { value: 'LARGE' } })
      expect(mockSet).toHaveBeenCalledWith('boxDefaultSize', 'LARGE')
    })

    it('disables all four inputs before settings load (loaded = false)', () => {
      render(
        <BoxCard
          form={{
            ...dummyForm,
            boxUnitsSmall: '30',
            boxUnitsMedium: '50',
            boxUnitsLarge: '100',
            boxDefaultSize: 'MEDIUM',
          }}
          set={jest.fn()}
          options={dummyOptions}
          loaded={false}
        />
      )

      expect(screen.getByLabelText('Box units a Small order takes')).toBeDisabled()
      expect(screen.getByLabelText('Box units a Medium order takes')).toBeDisabled()
      expect(screen.getByLabelText('Box units a Large order takes')).toBeDisabled()
      expect(screen.getByLabelText('Size of an order sent with none')).toBeDisabled()
    })

    it('defines SECTIONS entry with id "box" and title "Box"', () => {
      const boxSection = SECTIONS.find((s) => s.id === 'box')
      expect(boxSection).toBeDefined()
      expect(boxSection?.titleKey).toBe('settings.sections.box')
    })
  })

  // ---------------------------------------------------------------------------
  // FairnessCard (spec 0044, AC-5)
  // ---------------------------------------------------------------------------
  describe('FairnessCard (spec 0044, AC-5)', () => {
    it('renders Fairness section heading and binds each of the five settings', () => {
      const mockSet = jest.fn()
      render(
        <FairnessCard
          form={{
            ...dummyForm,
            fairnessWeightRoadTime: '50',
            fairnessWeightEarnings: '30',
            fairnessWeightWaiting: '20',
            fairnessCandidateLimit: '10',
            fairnessMinOnlineMinutes: '30',
          }}
          set={mockSet}
          options={dummyOptions}
          loaded={true}
        />
      )

      expect(screen.getByRole('heading', { name: 'Fairness' })).toBeInTheDocument()

      const roadTimeInput = screen.getByLabelText('Weight of road time to the restaurant') as HTMLInputElement
      expect(roadTimeInput.value).toBe('50')
      expect(roadTimeInput).toHaveAttribute('type', 'number')
      expect(roadTimeInput).toHaveAttribute('min', '0')
      expect(roadTimeInput).toHaveAttribute('max', '100')
      expect(roadTimeInput).not.toBeDisabled()

      const earningsInput = screen.getByLabelText("Weight of the rider's pay per hour today") as HTMLInputElement
      expect(earningsInput.value).toBe('30')
      expect(earningsInput).toHaveAttribute('type', 'number')
      expect(earningsInput).toHaveAttribute('min', '0')
      expect(earningsInput).toHaveAttribute('max', '100')
      expect(earningsInput).not.toBeDisabled()

      const waitingInput = screen.getByLabelText('Weight of waiting since the last job or going Online') as HTMLInputElement
      expect(waitingInput.value).toBe('20')
      expect(waitingInput).toHaveAttribute('type', 'number')
      expect(waitingInput).toHaveAttribute('min', '0')
      expect(waitingInput).toHaveAttribute('max', '100')
      expect(waitingInput).not.toBeDisabled()

      const limitInput = screen.getByLabelText('Nearest riders compared for each offer') as HTMLInputElement
      expect(limitInput.value).toBe('10')
      expect(limitInput).toHaveAttribute('type', 'number')
      expect(limitInput).toHaveAttribute('min', '1')
      expect(limitInput).toHaveAttribute('max', '50')
      expect(limitInput).not.toBeDisabled()

      const minOnlineInput = screen.getByLabelText('Minutes online before own pay per hour counts') as HTMLInputElement
      expect(minOnlineInput.value).toBe('30')
      expect(minOnlineInput).toHaveAttribute('type', 'number')
      expect(minOnlineInput).toHaveAttribute('min', '0')
      expect(minOnlineInput).toHaveAttribute('max', '240')
      expect(minOnlineInput).not.toBeDisabled()

      fireEvent.change(roadTimeInput, { target: { value: '40' } })
      expect(mockSet).toHaveBeenCalledWith('fairnessWeightRoadTime', '40')

      fireEvent.change(earningsInput, { target: { value: '35' } })
      expect(mockSet).toHaveBeenCalledWith('fairnessWeightEarnings', '35')

      fireEvent.change(waitingInput, { target: { value: '25' } })
      expect(mockSet).toHaveBeenCalledWith('fairnessWeightWaiting', '25')

      fireEvent.change(limitInput, { target: { value: '15' } })
      expect(mockSet).toHaveBeenCalledWith('fairnessCandidateLimit', '15')

      fireEvent.change(minOnlineInput, { target: { value: '45' } })
      expect(mockSet).toHaveBeenCalledWith('fairnessMinOnlineMinutes', '45')
    })

    it('disables all five inputs before settings load (loaded = false)', () => {
      render(
        <FairnessCard
          form={{
            ...dummyForm,
            fairnessWeightRoadTime: '50',
            fairnessWeightEarnings: '30',
            fairnessWeightWaiting: '20',
            fairnessCandidateLimit: '10',
            fairnessMinOnlineMinutes: '30',
          }}
          set={jest.fn()}
          options={dummyOptions}
          loaded={false}
        />
      )

      expect(screen.getByLabelText('Weight of road time to the restaurant')).toBeDisabled()
      expect(screen.getByLabelText("Weight of the rider's pay per hour today")).toBeDisabled()
      expect(screen.getByLabelText('Weight of waiting since the last job or going Online')).toBeDisabled()
      expect(screen.getByLabelText('Nearest riders compared for each offer')).toBeDisabled()
      expect(screen.getByLabelText('Minutes online before own pay per hour counts')).toBeDisabled()
    })

    it('defines SECTIONS entry with id "fairness" and title "Fairness"', () => {
      const fairnessSection = SECTIONS.find((s) => s.id === 'fairness')
      expect(fairnessSection).toBeDefined()
      expect(fairnessSection?.titleKey).toBe('settings.sections.fairness')
    })

    it('includes Fairness in MATCHER_COPY with honest copy', () => {
      expect(MATCHER_COPY.FAIRNESS).toBeDefined()
      expect(MATCHER_COPY.FAIRNESS.title).toBe('Fairness')
      expect(MATCHER_COPY.FAIRNESS.description).toContain('Fairness card')
    })

    it('renders Fairness as a choice of the matcher in MatchingCard and calls set on change', () => {
      const mockSet = jest.fn()
      render(
        <MatchingCard
          form={{ ...dummyForm, courierMatcherType: 'NEAREST_COURIER' }}
          set={mockSet}
          options={{
            ...dummyOptions,
            courierMatcherType: ['NEAREST_COURIER', 'COURIER_SENIORITY', 'STATIC', 'FAIRNESS'],
          }}
          loaded={true}
        />
      )

      expect(screen.getByText('Fairness')).toBeInTheDocument()
      expect(
        screen.getByText(
          'Among the nearest free riders, road time, pay per hour today and waiting, weighed as set in the Fairness card.'
        )
      ).toBeInTheDocument()

      const fairnessRadio = screen.getByRole('radio', { name: /Fairness/i })
      fireEvent.click(fairnessRadio)
      expect(mockSet).toHaveBeenCalledWith('courierMatcherType', 'FAIRNESS')
    })
  })

  // ---------------------------------------------------------------------------
  // TwoOrdersCard (spec 0048, row 80, AC-1)
  // ---------------------------------------------------------------------------
  describe('TwoOrdersCard (spec 0048, row 80, AC-1)', () => {
    it('defines SECTIONS entry with id "two-orders" and title "Two orders"', () => {
      const section = SECTIONS.find((s) => s.id === 'two-orders')
      expect(section).toBeDefined()
      expect(section?.titleKey).toBe('settings.sections.twoOrders')
    })

    it('exports TWO_ORDER_POLICY_LABELS with plain language labels for each policy', () => {
      // Spec 0048 (AC-1, row 80 review): labels for the two policy choices in plain words
      expect(TWO_ORDER_POLICY_LABELS).toEqual({
        SHORTAGE_ONLY: 'Only when no free rider is a good fit',
        WHENEVER_FITS: 'Whenever the two orders fit',
      })
    })

    it('renders Two orders section heading, description and binds switch, select and number field', () => {
      const mockSet = jest.fn()
      render(
        <TwoOrdersCard
          form={{
            ...dummyForm,
            stackingEnabled: false,
            twoOrderPolicy: 'SHORTAGE_ONLY',
            twoOrderDelayLimitMinutes: '10',
          }}
          set={mockSet}
          options={dummyOptions}
          loaded={true}
        />
      )

      expect(screen.getByRole('heading', { name: 'Two orders' })).toBeInTheDocument()
      expect(
        screen.getByText('Whether one rider may be offered two orders at once, and within which limits.')
      ).toBeInTheDocument()

      const switchEl = screen.getByLabelText('Two orders offered together')
      expect(switchEl).toBeInTheDocument()
      expect(switchEl).toHaveAttribute('aria-checked', 'false')
      fireEvent.click(switchEl)
      expect(mockSet).toHaveBeenCalledWith('stackingEnabled', true)

      const selectEl = screen.getByLabelText('When two orders may go together') as HTMLSelectElement
      expect(selectEl).toBeInTheDocument()
      expect(selectEl.value).toBe('SHORTAGE_ONLY')
      expect(within(selectEl).getByText('Only when no free rider is a good fit')).toBeInTheDocument()
      expect(within(selectEl).getByText('Whenever the two orders fit')).toBeInTheDocument()
      expect(
        screen.getByText(
          /"Whenever the two orders fit": with One more order offered while on a job on, a fitting order goes to a rider already on a job before a free rider, even when a free rider is waiting\./
        )
      ).toBeInTheDocument()
      fireEvent.change(selectEl, { target: { value: 'WHENEVER_FITS' } })
      expect(mockSet).toHaveBeenCalledWith('twoOrderPolicy', 'WHENEVER_FITS')

      const delayEl = screen.getByLabelText('Most minutes a pair may delay a customer') as HTMLInputElement
      expect(delayEl).toBeInTheDocument()
      expect(delayEl.value).toBe('10')
      expect(delayEl).toHaveAttribute('min', '0')
      expect(delayEl).toHaveAttribute('max', '30')
      fireEvent.change(delayEl, { target: { value: '15' } })
      expect(mockSet).toHaveBeenCalledWith('twoOrderDelayLimitMinutes', '15')
    })

    it('allows entering boundary and out-of-range delay limits (0, 30, -5, 35), passing raw input to set (spec 0048, row 80, AC-1)', () => {
      const mockSet = jest.fn()
      render(
        <TwoOrdersCard
          form={{
            ...dummyForm,
            stackingEnabled: true,
            twoOrderPolicy: 'SHORTAGE_ONLY',
            twoOrderDelayLimitMinutes: '10',
          }}
          set={mockSet}
          options={dummyOptions}
          loaded={true}
        />
      )

      const delayEl = screen.getByLabelText('Most minutes a pair may delay a customer') as HTMLInputElement

      fireEvent.change(delayEl, { target: { value: '0' } })
      expect(mockSet).toHaveBeenCalledWith('twoOrderDelayLimitMinutes', '0')

      fireEvent.change(delayEl, { target: { value: '30' } })
      expect(mockSet).toHaveBeenCalledWith('twoOrderDelayLimitMinutes', '30')

      fireEvent.change(delayEl, { target: { value: '-5' } })
      expect(mockSet).toHaveBeenCalledWith('twoOrderDelayLimitMinutes', '-5')

      fireEvent.change(delayEl, { target: { value: '35' } })
      expect(mockSet).toHaveBeenCalledWith('twoOrderDelayLimitMinutes', '35')
    })

    it('disables all five inputs and displays "Not loaded yet" for both switches when stackingEnabled and addOnOffersEnabled are null', () => {
      render(
        <TwoOrdersCard
          form={{
            ...dummyForm,
            stackingEnabled: null,
            twoOrderPolicy: '',
            twoOrderDelayLimitMinutes: '',
            addOnOffersEnabled: null,
            addOnMoment: '',
          }}
          set={jest.fn()}
          options={dummyOptions}
          loaded={true}
        />
      )

      expect(screen.getAllByText('Not loaded yet')).toHaveLength(2)
      expect(screen.getByLabelText('Two orders offered together')).toBeDisabled()
      expect(screen.getByLabelText('When two orders may go together')).toBeDisabled()
      expect(screen.getByLabelText('Most minutes a pair may delay a customer')).toBeDisabled()
      expect(screen.getByLabelText('One more order offered while on a job')).toBeDisabled()
      expect(screen.getByLabelText('When one more order may be offered')).toBeDisabled()
    })

    it('disables all five inputs when loaded is false', () => {
      render(
        <TwoOrdersCard
          form={{
            ...dummyForm,
            stackingEnabled: false,
            twoOrderPolicy: 'SHORTAGE_ONLY',
            twoOrderDelayLimitMinutes: '10',
            addOnOffersEnabled: false,
            addOnMoment: 'BEFORE_PICKUP',
          }}
          set={jest.fn()}
          options={dummyOptions}
          loaded={false}
        />
      )

      expect(screen.getByLabelText('Two orders offered together')).toBeDisabled()
      expect(screen.getByLabelText('When two orders may go together')).toBeDisabled()
      expect(screen.getByLabelText('Most minutes a pair may delay a customer')).toBeDisabled()
      expect(screen.getByLabelText('One more order offered while on a job')).toBeDisabled()
      expect(screen.getByLabelText('When one more order may be offered')).toBeDisabled()
    })
  })

  // ---------------------------------------------------------------------------
  // TwoOrdersCard: add-on offers (spec 0048, row 81, AC-1)
  // ---------------------------------------------------------------------------
  describe('TwoOrdersCard add-on offers (spec 0048, row 81, AC-1)', () => {
    it('renders add-on switch and moment select with labels, description and options', () => {
      render(
        <TwoOrdersCard
          form={{
            ...dummyForm,
            stackingEnabled: false,
            twoOrderPolicy: 'SHORTAGE_ONLY',
            twoOrderDelayLimitMinutes: '10',
            addOnOffersEnabled: false,
            addOnMoment: 'BEFORE_PICKUP',
          }}
          set={jest.fn()}
          options={dummyOptions}
          loaded={true}
        />
      )

      const addOnSwitch = screen.getByLabelText('One more order offered while on a job')
      expect(addOnSwitch).toBeInTheDocument()
      expect(addOnSwitch).not.toBeDisabled()
      expect(addOnSwitch).toHaveAttribute('aria-checked', 'false')

      // Check field description covers safety rule, no auto accept, free decline, deadline, calm offer, policy and override
      expect(
        screen.getByText(
          /On: a rider on a job may be offered one more order on the way, showing the km and minutes it adds\./
        )
      ).toBeInTheDocument()
      expect(
        screen.getByText(
          /Declining is free and changes nothing about the job, and the phone never accepts it by itself\./
        )
      ).toBeInTheDocument()
      expect(
        screen.getByText(
          /It pays in full from its own quote, and the limits above apply\./
        )
      ).toBeInTheDocument()
      expect(
        screen.getByText(
          /It always ends after Seconds before an unanswered offer ends \(under Offers\), even with Offer expiry off, and goes back to matching\./
        )
      ).toBeInTheDocument()
      expect(
        screen.getByText(
          /While the rider carries food it never rings insistently and gets twice that time\./
        )
      ).toBeInTheDocument()
      expect(
        screen.getByText(
          /Under "Whenever the two orders fit" it goes before a free rider\./
        )
      ).toBeInTheDocument()
      expect(
        screen.getByText(
          /Never while the matcher is Fixed courier \(the override\)\./
        )
      ).toBeInTheDocument()
      expect(
        screen.getByText(/Off: no rider on a job is offered anything\./)
      ).toBeInTheDocument()

      const momentSelect = screen.getByLabelText('When one more order may be offered') as HTMLSelectElement
      expect(momentSelect).toBeInTheDocument()
      expect(momentSelect).not.toBeDisabled()
      expect(momentSelect.value).toBe('BEFORE_PICKUP')

      // Verify all 3 options with ADD_ON_MOMENT_LABELS
      expect(within(momentSelect).getByRole('option', { name: ADD_ON_MOMENT_LABELS.BEFORE_PICKUP })).toHaveValue('BEFORE_PICKUP')
      expect(within(momentSelect).getByRole('option', { name: ADD_ON_MOMENT_LABELS.BEFORE_DROPOFF })).toHaveValue('BEFORE_DROPOFF')
      expect(within(momentSelect).getByRole('option', { name: ADD_ON_MOMENT_LABELS.SAME_RESTAURANT })).toHaveValue('SAME_RESTAURANT')
    })

    it('calls set("addOnOffersEnabled", true/false) when toggle is clicked', () => {
      const mockSet = jest.fn()
      const { rerender } = render(
        <TwoOrdersCard
          form={{
            ...dummyForm,
            addOnOffersEnabled: false,
            addOnMoment: 'BEFORE_PICKUP',
          }}
          set={mockSet}
          options={dummyOptions}
          loaded={true}
        />
      )

      const addOnSwitch = screen.getByLabelText('One more order offered while on a job')
      fireEvent.click(addOnSwitch)
      expect(mockSet).toHaveBeenCalledWith('addOnOffersEnabled', true)

      rerender(
        <TwoOrdersCard
          form={{
            ...dummyForm,
            addOnOffersEnabled: true,
            addOnMoment: 'BEFORE_PICKUP',
          }}
          set={mockSet}
          options={dummyOptions}
          loaded={true}
        />
      )
      expect(screen.getByLabelText('One more order offered while on a job')).toHaveAttribute('aria-checked', 'true')
      fireEvent.click(screen.getByLabelText('One more order offered while on a job'))
      expect(mockSet).toHaveBeenCalledWith('addOnOffersEnabled', false)
    })

    it('calls set("addOnMoment", value) when moment selection changes', () => {
      const mockSet = jest.fn()
      render(
        <TwoOrdersCard
          form={{
            ...dummyForm,
            addOnOffersEnabled: true,
            addOnMoment: 'BEFORE_PICKUP',
          }}
          set={mockSet}
          options={dummyOptions}
          loaded={true}
        />
      )

      const momentSelect = screen.getByLabelText('When one more order may be offered')
      fireEvent.change(momentSelect, { target: { value: 'BEFORE_DROPOFF' } })
      expect(mockSet).toHaveBeenCalledWith('addOnMoment', 'BEFORE_DROPOFF')

      fireEvent.change(momentSelect, { target: { value: 'SAME_RESTAURANT' } })
      expect(mockSet).toHaveBeenCalledWith('addOnMoment', 'SAME_RESTAURANT')
    })

    it('renders "Not set" disabled option when addOnMoment is empty string', () => {
      render(
        <TwoOrdersCard
          form={{
            ...dummyForm,
            addOnOffersEnabled: true,
            addOnMoment: '',
          }}
          set={jest.fn()}
          options={dummyOptions}
          loaded={true}
        />
      )

      const momentSelect = screen.getByLabelText('When one more order may be offered') as HTMLSelectElement
      expect(momentSelect.value).toBe('')
      const notSetOption = within(momentSelect).getByRole('option', { name: 'Not set' })
      expect(notSetOption).toBeDisabled()
    })
  })
})
