import {
  blockers,
  EMPTY_FORM,
  formFromSettings,
  labelOf,
  normalizeRegion,
  pendingChanges,
  sameValue,
  savePayload,
  successMessage,
  urlErrorText,
  type SettingsForm,
} from './settingsDiff'

describe('settingsDiff unit tests (spec 0010)', () => {
  const baseSavedForm: SettingsForm = {
    name: 'Volos Couriers',
    link: 'https://volos.courier.coop',
    websocketLink: 'wss://volos.courier.coop/ws',
    imageUrl: 'https://volos.courier.coop/logo.png',
    region: {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [
              [
                [22.88, 39.33],
                [23.02, 39.33],
                [23.02, 39.41],
                [22.88, 39.41],
                [22.88, 39.33],
              ],
            ],
          },
          properties: {},
        },
      ],
    },
    courierMatcherType: 'NEAREST_COURIER',
    quoteCalculationType: 'BY_DISTANCE',
    geoCalculationType: 'HAVERSINE',
    deliveryDurationCalculationType: 'SIMPLE',
    courierCompensationCalculationType: 'FROM_QUOTE_FROM',
    currency: 'EUR',
    distanceUnit: 'KILOMETERS',
    defaultDietaryRestrictions: ['NONE'],
    quoteBaseFee: '200',
    quoteRatePerDistanceUnit: '150',
    feePercentageAmount: '10',
    maxAssignmentDistance: '20',
    maxDriftDistance: '5',
    quoteExpirationMinutes: '15',
    defaultCourierPayRate: '250',
    defaultMaxWorkingHours: '8',
    offerExpiryEnabled: true,
    offerExpirySeconds: '60',
    noCourierRetrySeconds: '30',
    savedCustomerRetentionMonths: '12',
  }

  describe('pendingChanges (spec AC-3, AC-12, AC-13)', () => {
    it('returns empty array when saved is null (before settings load, AC-13)', () => {
      expect(pendingChanges(null, baseSavedForm)).toEqual([])
    })

    it('returns empty array when edited matches saved', () => {
      expect(pendingChanges(baseSavedForm, { ...baseSavedForm })).toEqual([])
    })

    it('does not treat trailing spaces or trailing slashes in URLs as changes (AC-12)', () => {
      const edited: SettingsForm = {
        ...baseSavedForm,
        link: ' https://volos.courier.coop/ ',
        websocketLink: 'wss://volos.courier.coop/ws/ ',
      }
      expect(pendingChanges(baseSavedForm, edited)).toEqual([])
    })

    it('does not treat reordered multi-select values as a change (AC-12)', () => {
      const saved: SettingsForm = {
        ...baseSavedForm,
        defaultDietaryRestrictions: ['VEGAN', 'VEGETARIAN', 'NONE'],
      }
      const edited: SettingsForm = {
        ...baseSavedForm,
        defaultDietaryRestrictions: ['NONE', 'VEGAN', 'VEGETARIAN'],
      }
      expect(pendingChanges(saved, edited)).toEqual([])
    })

    it('compares region by JSON text and detects edits (AC-12)', () => {
      const edited: SettingsForm = {
        ...baseSavedForm,
        region: {
          type: 'FeatureCollection',
          features: [
            {
              type: 'Feature',
              geometry: {
                type: 'Polygon',
                coordinates: [
                  [
                    [22.88, 39.33],
                    [23.05, 39.33],
                    [23.05, 39.41],
                    [22.88, 39.41],
                    [22.88, 39.33],
                  ],
                ],
              },
              properties: {},
            },
          ],
        },
      }
      const changes = pendingChanges(baseSavedForm, edited)
      expect(changes).toHaveLength(1)
      expect(changes[0]?.key).toBe('region')
      expect(changes[0]?.label).toBe('Service area')
      // Region 'from' and 'to' are empty in shown(), SaveBar renders it as 'redrawn'
      expect(changes[0]?.from).toBe('')
      expect(changes[0]?.to).toBe('')
    })

    it('formats cents fields as money in the currency (AC-11)', () => {
      const edited: SettingsForm = {
        ...baseSavedForm,
        quoteBaseFee: '250',
      }
      const changes = pendingChanges(baseSavedForm, edited)
      expect(changes).toHaveLength(1)
      expect(changes[0]?.key).toBe('quoteBaseFee')
      expect(changes[0]?.label).toBe('Base fee')
      expect(changes[0]?.from).toBe('€2.00')
      expect(changes[0]?.to).toBe('€2.50')
    })

    it('uses optionLabel mapping for select changes', () => {
      const edited: SettingsForm = {
        ...baseSavedForm,
        courierMatcherType: 'FIFO',
      }
      const optionLabel = (key: string, val: string) => {
        if (key === 'courierMatcherType' && val === 'FIFO') return 'Most senior courier'
        if (key === 'courierMatcherType' && val === 'NEAREST_COURIER') return 'Nearest free courier'
        return val
      }
      const changes = pendingChanges(baseSavedForm, edited, optionLabel as any)
      expect(changes).toHaveLength(1)
      expect(changes[0]?.from).toBe('Nearest free courier')
      expect(changes[0]?.to).toBe('Most senior courier')
    })

    it('sets rate change label to "Rate per mile" when edited distanceUnit is MILES (row 87 review, fix 5)', () => {
      const edited: SettingsForm = {
        ...baseSavedForm,
        distanceUnit: 'MILES',
        quoteRatePerDistanceUnit: '180',
      }
      const changes = pendingChanges(baseSavedForm, edited)
      const rateChange = changes.find((c) => c.key === 'quoteRatePerDistanceUnit')
      expect(rateChange).toBeDefined()
      expect(rateChange?.label).toBe('Rate per mile')
    })

    it('sets rate change label to "Rate per km" when edited distanceUnit is KILOMETERS (row 87 review, fix 5)', () => {
      const edited: SettingsForm = {
        ...baseSavedForm,
        distanceUnit: 'KILOMETERS',
        quoteRatePerDistanceUnit: '180',
      }
      const changes = pendingChanges(baseSavedForm, edited)
      const rateChange = changes.find((c) => c.key === 'quoteRatePerDistanceUnit')
      expect(rateChange).toBeDefined()
      expect(rateChange?.label).toBe('Rate per km')
    })
  })

  describe('blockers (spec AC-14)', () => {
    it('returns empty array when no changes exist', () => {
      expect(blockers([], baseSavedForm)).toEqual([])
    })

    it('blocks save when a changed number box is empty', () => {
      const changes = [{ key: 'maxAssignmentDistance', label: 'Furthest courier to offer', from: '20', to: '(empty)' }]
      const edited: SettingsForm = {
        ...baseSavedForm,
        maxAssignmentDistance: '',
      }
      expect(blockers(changes as any, edited)).toContain('Furthest courier to offer is empty')
    })

    it('blocks save when cents field is not a whole number of cents', () => {
      const changes = [{ key: 'quoteBaseFee', label: 'Base fee', from: '€2.00', to: '12.5' }]
      const edited: SettingsForm = {
        ...baseSavedForm,
        quoteBaseFee: '12.5',
      }
      expect(blockers(changes as any, edited)).toContain('Base fee: enter a whole number of cents, zero or more')
    })

    it('blocks save when cents field is negative', () => {
      const changes = [{ key: 'quoteBaseFee', label: 'Base fee', from: '€2.00', to: '-50' }]
      const edited: SettingsForm = {
        ...baseSavedForm,
        quoteBaseFee: '-50',
      }
      expect(blockers(changes as any, edited)).toContain('Base fee: enter a whole number of cents, zero or more')
    })

    it('blocks save when URL is invalid', () => {
      const changes = [{ key: 'link', label: 'URL', from: 'https://volos.courier.coop', to: 'not-a-url' }]
      const edited: SettingsForm = {
        ...baseSavedForm,
        link: 'not-a-url',
      }
      const res = blockers(changes as any, edited)
      expect(res).toContain('URL is not a valid URL')
    })

    it('blocks save when multi-select has nothing selected', () => {
      const changes = [{ key: 'defaultDietaryRestrictions', label: 'Default dietary restrictions', from: 'None', to: '(none)' }]
      const edited: SettingsForm = {
        ...baseSavedForm,
        defaultDietaryRestrictions: [],
      }
      expect(blockers(changes as any, edited)).toContain('Default dietary restrictions has nothing selected')
    })

    it('only checks details blockers (name, link, region) when a detail changed', () => {
      // If only quoteBaseFee changed, missing name in edited does not block save
      const nonDetailChanges = [{ key: 'quoteBaseFee', label: 'Base fee', from: '€2.00', to: '€2.50' }]
      const editedWithEmptyName: SettingsForm = {
        ...baseSavedForm,
        name: '',
        quoteBaseFee: '250',
      }
      expect(blockers(nonDetailChanges as any, editedWithEmptyName)).toEqual([])

      // But when a detail changed (e.g. imageUrl changed), empty name and empty link and null region DO block save
      const detailChanges = [{ key: 'imageUrl', label: 'Logo image URL', from: 'https://...', to: 'https://new...' }]
      const editedWithEmptyDetails: SettingsForm = {
        ...baseSavedForm,
        name: '',
        link: '',
        region: null,
      }
      const detailBlockers = blockers(detailChanges as any, editedWithEmptyDetails)
      expect(detailBlockers).toContain('Name is empty')
      expect(detailBlockers).toContain('URL is empty')
      expect(detailBlockers).toContain('Service area is not drawn')
    })
  })

  describe('savePayload (spec AC-4, AC-12)', () => {
    const savedDetails = {
      name: 'Volos Couriers',
      link: 'https://volos.courier.coop',
      websocketLink: 'wss://volos.courier.coop/ws',
      imageUrl: 'https://volos.courier.coop/logo.png',
      region: { type: 'FeatureCollection', features: [] },
      customBackendMeta: 'preserved-value',
    }

    it('sends only changed top-level keys and converts numbers from strings to numbers', () => {
      const changes = [
        { key: 'quoteBaseFee', label: 'Base fee', from: '€2.00', to: '€2.50' },
        { key: 'maxAssignmentDistance', label: 'Furthest courier to offer', from: '20', to: '0' },
      ]
      const edited: SettingsForm = {
        ...baseSavedForm,
        quoteBaseFee: '250',
        maxAssignmentDistance: '0',
      }
      const payload = savePayload(changes as any, edited, savedDetails)
      expect(payload).toEqual({
        quoteBaseFee: 250,
        maxAssignmentDistance: 0,
      })
      expect(payload).not.toHaveProperty('details')
      expect(payload).not.toHaveProperty('currency')
    })

    it('sends the whole details object with saved keys kept, region normalised, and computed URLs when any detail changed', () => {
      const changes = [{ key: 'name', label: 'Name', from: 'Volos Couriers', to: 'Volos Workers Co-op' }]
      const edited: SettingsForm = {
        ...baseSavedForm,
        name: '  Volos Workers Co-op  ',
        link: 'https://volos.courier.coop/ ',
      }
      const payload = savePayload(changes as any, edited, savedDetails)
      expect(payload).toHaveProperty('details')
      const details = payload.details as any
      expect(details.customBackendMeta).toBe('preserved-value')
      expect(details.name).toBe('Volos Workers Co-op')
      expect(details.link).toBe('https://volos.courier.coop')
      expect(details.privacyPolicyUrl).toBe('https://volos.courier.coop/privacy-policy')
      expect(details.termsOfServiceUrl).toBe('https://volos.courier.coop/terms-of-service')
      expect(details.rulesUrl).toBe('https://volos.courier.coop/rules')
      expect(details.descriptionUrl).toBe('https://volos.courier.coop/description')
    })

    it('normalises bare Feature or array of features to FeatureCollection in details.region', () => {
      const bareFeature = {
        type: 'Feature',
        geometry: { type: 'Polygon', coordinates: [] },
        properties: {},
      }
      expect(normalizeRegion(bareFeature)).toEqual({
        type: 'FeatureCollection',
        features: [bareFeature],
      })

      const featuresArray = [bareFeature]
      expect(normalizeRegion(featuresArray)).toEqual({
        type: 'FeatureCollection',
        features: featuresArray,
      })
    })

    it('does not include details in payload when no detail changed', () => {
      const changes = [{ key: 'offerExpiryEnabled', label: 'Offer expiry', from: 'On', to: 'Off' }]
      const edited: SettingsForm = {
        ...baseSavedForm,
        offerExpiryEnabled: false,
      }
      const payload = savePayload(changes as any, edited, savedDetails)
      expect(payload).toEqual({
        offerExpiryEnabled: false,
      })
      expect(payload.details).toBeUndefined()
    })
  })

  describe('successMessage (spec AC-15)', () => {
    it('produces "Saved: <labels>." sentence', () => {
      const changes = [{ key: 'name', label: 'Name', from: 'a', to: 'b' }]
      expect(successMessage(changes as any)).toBe('Saved: Name.')
    })

    it('appends pricing sentence when pricing settings are changed', () => {
      const changes = [{ key: 'quoteBaseFee', label: 'Base fee', from: '€2.00', to: '€2.50' }]
      expect(successMessage(changes as any)).toBe(
        'Saved: Base fee. Pricing applies to the next quote; deliveries already quoted keep their price.'
      )
    })

    it('appends offer sentence when offer settings are changed', () => {
      const changes = [{ key: 'offerExpirySeconds', label: 'Seconds before an unanswered offer ends', from: '60', to: '45' }]
      expect(successMessage(changes as any)).toBe(
        'Saved: Seconds before an unanswered offer ends. Offer settings apply to the next offer; an offer already out keeps its deadline.'
      )
    })

    it('appends customer retention sentence when retention setting is changed', () => {
      const changes = [{ key: 'savedCustomerRetentionMonths', label: 'Saved customer retention (months)', from: '12', to: '24' }]
      expect(successMessage(changes as any)).toBe(
        'Saved: Saved customer retention (months). The daily job uses the retention from its next run.'
      )
    })
  })

  describe('formFromSettings & EMPTY_FORM', () => {
    it('converts numbers to strings and handles missing or null values safely', () => {
      const form = formFromSettings({
        quoteBaseFee: 200,
        quoteRatePerDistanceUnit: null,
        details: { name: 'Test' },
      })
      expect(form.quoteBaseFee).toBe('200')
      expect(form.quoteRatePerDistanceUnit).toBe('')
      expect(form.name).toBe('Test')
      expect(form.offerExpiryEnabled).toBeNull()
    })

    it('EMPTY_FORM has empty strings for all text/number fields and null for switch and region', () => {
      expect(EMPTY_FORM.name).toBe('')
      expect(EMPTY_FORM.quoteBaseFee).toBe('')
      expect(EMPTY_FORM.offerExpiryEnabled).toBeNull()
      expect(EMPTY_FORM.region).toBeNull()
    })
  })

  // ---------------------------------------------------------------------------
  // Review fixes (row 87 review): labelOf, sameValue, and urlErrorText
  // ---------------------------------------------------------------------------
  describe('labelOf (row 87 review, fix 5)', () => {
    it('returns "Rate per km" when distanceUnit is KILOMETERS or omitted', () => {
      expect(labelOf('quoteRatePerDistanceUnit', { distanceUnit: 'KILOMETERS' })).toBe('Rate per km')
      expect(labelOf('quoteRatePerDistanceUnit')).toBe('Rate per km')
    })

    it('returns "Rate per mile" when distanceUnit is MILES', () => {
      expect(labelOf('quoteRatePerDistanceUnit', { distanceUnit: 'MILES' })).toBe('Rate per mile')
    })

    it('returns defined labels for settings (e.g. "Co-op fee (%)", "Base fee")', () => {
      expect(labelOf('quoteBaseFee')).toBe('Base fee')
      expect(labelOf('feePercentageAmount')).toBe('Co-op fee (%)')
      expect(labelOf('savedCustomerRetentionMonths')).toBe('Saved customer retention (months)')
      expect(labelOf('link')).toBe('URL')
      expect(labelOf('websocketLink')).toBe('Websocket URL')
      expect(labelOf('imageUrl')).toBe('Logo image URL')
    })
  })

  describe('sameValue (row 87 review, fix 5)', () => {
    it('treats trimmed URLs without trailing slashes as identical', () => {
      expect(sameValue('link', 'https://volos.courier.coop/ ', 'https://volos.courier.coop')).toBe(true)
      expect(sameValue('websocketLink', 'wss://volos.courier.coop/ws/ ', 'wss://volos.courier.coop/ws')).toBe(true)
      expect(sameValue('imageUrl', 'https://volos.coop/logo.png', ' https://volos.coop/logo.png/ ')).toBe(true)
      expect(sameValue('link', 'https://volos.courier.coop', 'https://other.courier.coop')).toBe(false)
    })

    it('treats reordered multi-select options as identical', () => {
      expect(
        sameValue('defaultDietaryRestrictions', ['VEGAN', 'VEGETARIAN', 'NONE'], ['NONE', 'VEGAN', 'VEGETARIAN'])
      ).toBe(true)
      expect(sameValue('defaultDietaryRestrictions', ['VEGAN'], ['NONE'])).toBe(false)
    })

    it('treats equal cents (string vs number) as identical', () => {
      expect(sameValue('quoteBaseFee', '200', 200)).toBe(true)
      expect(sameValue('quoteBaseFee', '200', '250')).toBe(false)
    })

    it('compares standard text and numeric values correctly', () => {
      expect(sameValue('name', 'Volos Co-op', 'Volos Co-op')).toBe(true)
      expect(sameValue('name', 'Volos Co-op', 'Other Co-op')).toBe(false)
      expect(sameValue('maxAssignmentDistance', '20', 20)).toBe(true)
      expect(sameValue('maxAssignmentDistance', '20', 25)).toBe(false)
    })
  })

  describe('urlErrorText & URL blockers (row 87 review, fix 7)', () => {
    it('formats "<Label> is not a valid URL"', () => {
      expect(urlErrorText('URL')).toBe('URL is not a valid URL')
      expect(urlErrorText('Websocket URL')).toBe('Websocket URL is not a valid URL')
      expect(urlErrorText('Logo image URL')).toBe('Logo image URL is not a valid URL')
    })

    it('reports "<Label> is not a valid URL" for websocketLink and imageUrl blockers', () => {
      const wsChange = [{ key: 'websocketLink', label: 'Websocket URL', from: '', to: 'bad-ws' }]
      const wsEdited: SettingsForm = { ...baseSavedForm, websocketLink: 'bad-ws' }
      expect(blockers(wsChange as any, wsEdited)).toContain('Websocket URL is not a valid URL')

      const imgChange = [{ key: 'imageUrl', label: 'Logo image URL', from: '', to: 'bad-img' }]
      const imgEdited: SettingsForm = { ...baseSavedForm, imageUrl: 'bad-img' }
      expect(blockers(imgChange as any, imgEdited)).toContain('Logo image URL is not a valid URL')
    })
  })
})
