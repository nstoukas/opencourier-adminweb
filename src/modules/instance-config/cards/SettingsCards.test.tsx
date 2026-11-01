import React from 'react'
import { render, screen, fireEvent, within } from '@testing-library/react'
import {
  PricingCard,
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
