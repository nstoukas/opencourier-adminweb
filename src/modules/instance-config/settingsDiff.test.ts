import {
  blockers,
  EMPTY_FORM,
  formFromSettings,
  labelOf,
  normalizeRegion,
  pendingChanges,
  sameValue,
  savePayload,
  SETTINGS,
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
    arrivalRadiusMetres: '50',
    quoteExpirationMinutes: '15',
    defaultCourierPayRate: '250',
    defaultMaxWorkingHours: '8',
    offerExpiryEnabled: true,
    offerExpirySeconds: '60',
    noCourierRetrySeconds: '30',
    offerTimingEnabled: false,
    offerLeadMinutes: '3',
    offerTimingCandidates: '5',
    handBackSeconds: '60',
    cancellationPayoutPolicy: 'FULL_COMPENSATION',
    savedCustomerRetentionMonths: '12',
    restaurantHistoryDays: '30',
    sosLocationRetentionDays: '30',
    dispatchPhoneNumber: '+302421012345',
    shiftsEnabled: false,
    shiftDropNoticeHours: '12',
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

    // Ported settings: dispatchPhoneNumber, handBackSeconds, cancellationPayoutPolicy, restaurantHistoryDays
    it('compares dispatchPhoneNumber without spaces, dashes, dots and brackets', () => {
      const saved: SettingsForm = { ...baseSavedForm, dispatchPhoneNumber: '+302421012345' }
      const withSpaces: SettingsForm = { ...baseSavedForm, dispatchPhoneNumber: '+30 24210 12345' }
      const withDashes: SettingsForm = { ...baseSavedForm, dispatchPhoneNumber: '+30-24210-12345' }
      const withBrackets: SettingsForm = { ...baseSavedForm, dispatchPhoneNumber: '+30 (24210) 12345' }
      const withDots: SettingsForm = { ...baseSavedForm, dispatchPhoneNumber: '+30.24210.12345' }

      expect(pendingChanges(saved, withSpaces)).toEqual([])
      expect(pendingChanges(saved, withDashes)).toEqual([])
      expect(pendingChanges(saved, withBrackets)).toEqual([])
      expect(pendingChanges(saved, withDots)).toEqual([])

      const different: SettingsForm = { ...baseSavedForm, dispatchPhoneNumber: '+30 24210 99999' }
      const changes = pendingChanges(saved, different)
      expect(changes).toHaveLength(1)
      expect(changes[0]?.key).toBe('dispatchPhoneNumber')
      expect(changes[0]?.label).toBe('Dispatch phone number')
      expect(changes[0]?.from).toBe('+302421012345')
      expect(changes[0]?.to).toBe('+30 24210 99999')
    })

    it('shows cleared dispatchPhoneNumber as (empty)', () => {
      const saved: SettingsForm = { ...baseSavedForm, dispatchPhoneNumber: '+302421012345' }
      const cleared: SettingsForm = { ...baseSavedForm, dispatchPhoneNumber: '' }
      const changes = pendingChanges(saved, cleared)
      expect(changes).toHaveLength(1)
      expect(changes[0]?.key).toBe('dispatchPhoneNumber')
      expect(changes[0]?.to).toBe('(empty)')
    })

    it('detects changes to handBackSeconds including setting to 0', () => {
      const editedTo0: SettingsForm = { ...baseSavedForm, handBackSeconds: '0' }
      const changes0 = pendingChanges(baseSavedForm, editedTo0)
      expect(changes0).toHaveLength(1)
      expect(changes0[0]?.key).toBe('handBackSeconds')
      expect(changes0[0]?.label).toBe('Seconds a rider can hand back an order for free')
      expect(changes0[0]?.from).toBe('60')
      expect(changes0[0]?.to).toBe('0')

      const editedTo45: SettingsForm = { ...baseSavedForm, handBackSeconds: '45' }
      const changes45 = pendingChanges(baseSavedForm, editedTo45)
      expect(changes45).toHaveLength(1)
      expect(changes45[0]?.key).toBe('handBackSeconds')
      expect(changes45[0]?.from).toBe('60')
      expect(changes45[0]?.to).toBe('45')
    })

    it('detects changes to cancellationPayoutPolicy', () => {
      const edited: SettingsForm = { ...baseSavedForm, cancellationPayoutPolicy: 'HALF_COMPENSATION' }
      const changes = pendingChanges(baseSavedForm, edited)
      expect(changes).toHaveLength(1)
      expect(changes[0]?.key).toBe('cancellationPayoutPolicy')
      expect(changes[0]?.label).toBe('Pay when a job is cancelled')
      expect(changes[0]?.from).toBe('FULL_COMPENSATION')
      expect(changes[0]?.to).toBe('HALF_COMPENSATION')
    })

    it('detects changes to restaurantHistoryDays', () => {
      const edited: SettingsForm = { ...baseSavedForm, restaurantHistoryDays: '7' }
      const changes = pendingChanges(baseSavedForm, edited)
      expect(changes).toHaveLength(1)
      expect(changes[0]?.key).toBe('restaurantHistoryDays')
      expect(changes[0]?.label).toBe('Restaurant order history (days)')
      expect(changes[0]?.from).toBe('30')
      expect(changes[0]?.to).toBe('7')
    })

    it('detects changes to sosLocationRetentionDays (spec 0022, AC-11)', () => {
      const edited: SettingsForm = { ...baseSavedForm, sosLocationRetentionDays: '15' }
      const changes = pendingChanges(baseSavedForm, edited)
      expect(changes).toHaveLength(1)
      expect(changes[0]?.key).toBe('sosLocationRetentionDays')
      expect(changes[0]?.label).toBe('SOS location kept for (days)')
      expect(changes[0]?.from).toBe('30')
      expect(changes[0]?.to).toBe('15')
    })

    it('detects changes to arrivalRadiusMetres including setting to 0 (spec 0021, AC-11)', () => {
      const editedTo80: SettingsForm = { ...baseSavedForm, arrivalRadiusMetres: '80' }
      const changes80 = pendingChanges(baseSavedForm, editedTo80)
      expect(changes80).toHaveLength(1)
      expect(changes80[0]?.key).toBe('arrivalRadiusMetres')
      expect(changes80[0]?.label).toBe('Arrival radius (metres)')
      expect(changes80[0]?.from).toBe('50')
      expect(changes80[0]?.to).toBe('80')

      const editedTo0: SettingsForm = { ...baseSavedForm, arrivalRadiusMetres: '0' }
      const changes0 = pendingChanges(baseSavedForm, editedTo0)
      expect(changes0).toHaveLength(1)
      expect(changes0[0]?.key).toBe('arrivalRadiusMetres')
      expect(changes0[0]?.label).toBe('Arrival radius (metres)')
      expect(changes0[0]?.from).toBe('50')
      expect(changes0[0]?.to).toBe('0')
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

    it('blocks save when restaurantHistoryDays or handBackSeconds is empty', () => {
      const historyChanges = [{ key: 'restaurantHistoryDays', label: 'Restaurant order history (days)', from: '30', to: '(empty)' }]
      const historyEdited: SettingsForm = {
        ...baseSavedForm,
        restaurantHistoryDays: '',
      }
      expect(blockers(historyChanges as any, historyEdited)).toContain('Restaurant order history (days) is empty')

      const sosChanges = [{ key: 'sosLocationRetentionDays', label: 'SOS location kept for (days)', from: '30', to: '(empty)' }]
      const sosEdited: SettingsForm = {
        ...baseSavedForm,
        sosLocationRetentionDays: '',
      }
      expect(blockers(sosChanges as any, sosEdited)).toContain('SOS location kept for (days) is empty')

      const handBackChanges = [{ key: 'handBackSeconds', label: 'Seconds a rider can hand back an order for free', from: '60', to: '(empty)' }]
      const handBackEdited: SettingsForm = {
        ...baseSavedForm,
        handBackSeconds: '',
      }
      expect(blockers(handBackChanges as any, handBackEdited)).toContain('Seconds a rider can hand back an order for free is empty')

      const arrivalRadiusChanges = [{ key: 'arrivalRadiusMetres', label: 'Arrival radius (metres)', from: '50', to: '(empty)' }]
      const arrivalRadiusEdited: SettingsForm = {
        ...baseSavedForm,
        arrivalRadiusMetres: '',
      }
      expect(blockers(arrivalRadiusChanges as any, arrivalRadiusEdited)).toContain('Arrival radius (metres) is empty')
    })

    it('does not block save when dispatchPhoneNumber is empty (clearing is allowed)', () => {
      const changes = [{ key: 'dispatchPhoneNumber', label: 'Dispatch phone number', from: '+302421012345', to: '(empty)' }]
      const edited: SettingsForm = {
        ...baseSavedForm,
        dispatchPhoneNumber: '',
      }
      expect(blockers(changes as any, edited)).toEqual([])
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

    it('sends ported settings with numbers as numbers and phone as typed string', () => {
      const changes = [
        { key: 'handBackSeconds', label: 'Seconds a rider can hand back an order for free', from: '60', to: '45' },
        { key: 'restaurantHistoryDays', label: 'Restaurant order history (days)', from: '30', to: '7' },
        { key: 'sosLocationRetentionDays', label: 'SOS location kept for (days)', from: '30', to: '14' },
        { key: 'dispatchPhoneNumber', label: 'Dispatch phone number', from: '+302421012345', to: '+30 24210 99999' },
        { key: 'cancellationPayoutPolicy', label: 'Pay when a job is cancelled', from: 'FULL_COMPENSATION', to: 'HALF_COMPENSATION' },
      ]
      const edited: SettingsForm = {
        ...baseSavedForm,
        handBackSeconds: '45',
        restaurantHistoryDays: '7',
        sosLocationRetentionDays: '14',
        dispatchPhoneNumber: '+30 24210 99999',
        cancellationPayoutPolicy: 'HALF_COMPENSATION',
      }
      const payload = savePayload(changes as any, edited, savedDetails)
      expect(payload).toEqual({
        handBackSeconds: 45,
        restaurantHistoryDays: 7,
        sosLocationRetentionDays: 14,
        dispatchPhoneNumber: '+30 24210 99999',
        cancellationPayoutPolicy: 'HALF_COMPENSATION',
      })
      expect(payload).not.toHaveProperty('details')
    })

    it('sends handBackSeconds 0 as number 0', () => {
      const changes = [
        { key: 'handBackSeconds', label: 'Seconds a rider can hand back an order for free', from: '60', to: '0' },
      ]
      const edited: SettingsForm = {
        ...baseSavedForm,
        handBackSeconds: '0',
      }
      const payload = savePayload(changes as any, edited, savedDetails)
      expect(payload).toEqual({
        handBackSeconds: 0,
      })
    })

    it('sends empty dispatchPhoneNumber as empty string', () => {
      const changes = [
        { key: 'dispatchPhoneNumber', label: 'Dispatch phone number', from: '+302421012345', to: '(empty)' },
      ]
      const edited: SettingsForm = {
        ...baseSavedForm,
        dispatchPhoneNumber: '',
      }
      const payload = savePayload(changes as any, edited, savedDetails)
      expect(payload).toEqual({
        dispatchPhoneNumber: '',
      })
    })

    it('sends arrivalRadiusMetres as a number and 0 as number 0 (spec 0021, AC-11)', () => {
      const changes80 = [
        { key: 'arrivalRadiusMetres', label: 'Arrival radius (metres)', from: '50', to: '80' },
      ]
      const edited80: SettingsForm = {
        ...baseSavedForm,
        arrivalRadiusMetres: '80',
      }
      const payload80 = savePayload(changes80 as any, edited80, savedDetails)
      expect(payload80).toEqual({
        arrivalRadiusMetres: 80,
      })
      expect(payload80).not.toHaveProperty('details')

      const changes0 = [
        { key: 'arrivalRadiusMetres', label: 'Arrival radius (metres)', from: '50', to: '0' },
      ]
      const edited0: SettingsForm = {
        ...baseSavedForm,
        arrivalRadiusMetres: '0',
      }
      const payload0 = savePayload(changes0 as any, edited0, savedDetails)
      expect(payload0).toEqual({
        arrivalRadiusMetres: 0,
      })
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

    it('appends handBackSeconds sentence when hand back setting is changed', () => {
      const changes = [{ key: 'handBackSeconds', label: 'Seconds a rider can hand back an order for free', from: '60', to: '45' }]
      expect(successMessage(changes as any)).toBe(
        'Saved: Seconds a rider can hand back an order for free. The hand back applies to the next accept; a running hand back keeps its end.'
      )
    })

    it('appends cancellationPayoutPolicy sentence when cancelled job pay is changed', () => {
      const changes = [{ key: 'cancellationPayoutPolicy', label: 'Pay when a job is cancelled', from: 'FULL_COMPENSATION', to: 'HALF_COMPENSATION' }]
      expect(successMessage(changes as any)).toBe(
        'Saved: Pay when a job is cancelled. Cancelled job pay applies to cancellations from now on.'
      )
    })

    it('appends restaurantHistoryDays sentence when history days is changed', () => {
      const changes = [{ key: 'restaurantHistoryDays', label: 'Restaurant order history (days)', from: '30', to: '7' }]
      expect(successMessage(changes as any)).toBe(
        'Saved: Restaurant order history (days). Restaurants see the new order history period at once.'
      )
    })

    it('appends sosLocationRetentionDays sentence when retention days is changed (spec 0022, AC-11)', () => {
      const changes = [{ key: 'sosLocationRetentionDays', label: 'SOS location kept for (days)', from: '30', to: '14' }]
      expect(successMessage(changes as any)).toBe(
        'Saved: SOS location kept for (days). The daily job deletes SOS positions under the new period from its next run.'
      )
    })

    it('appends dispatchPhoneNumber sentence when set or cleared', () => {
      const setChanges = [{ key: 'dispatchPhoneNumber', label: 'Dispatch phone number', from: '', to: '+30 24210 12345' }]
      expect(successMessage(setChanges as any)).toBe(
        'Saved: Dispatch phone number. Riders see the Call dispatch button within ten minutes.'
      )

      const clearedChanges = [{ key: 'dispatchPhoneNumber', label: 'Dispatch phone number', from: '+302421012345', to: '(empty)' }]
      expect(successMessage(clearedChanges as any)).toBe(
        'Saved: Dispatch phone number. Riders no longer see a Call dispatch button.'
      )
    })

    it('appends arrivalRadiusMetres sentence when arrival radius is changed (spec 0021, AC-11)', () => {
      const changes = [{ key: 'arrivalRadiusMetres', label: 'Arrival radius (metres)', from: '50', to: '80' }]
      expect(successMessage(changes as any)).toBe(
        "Saved: Arrival radius (metres). Riders' apps use the new arrival radius within ten minutes."
      )
    })
  })

  describe('formFromSettings & EMPTY_FORM', () => {
    it('converts numbers to strings and handles missing or null values safely', () => {
      const form = formFromSettings({
        quoteBaseFee: 200,
        quoteRatePerDistanceUnit: null,
        details: { name: 'Test' },
        arrivalRadiusMetres: 50,
        handBackSeconds: 60,
        cancellationPayoutPolicy: 'FULL_COMPENSATION',
        restaurantHistoryDays: 30,
        sosLocationRetentionDays: 30,
        dispatchPhoneNumber: '+302421012345',
      })
      expect(form.quoteBaseFee).toBe('200')
      expect(form.quoteRatePerDistanceUnit).toBe('')
      expect(form.name).toBe('Test')
      expect(form.offerExpiryEnabled).toBeNull()
      expect(form.arrivalRadiusMetres).toBe('50')
      expect(form.handBackSeconds).toBe('60')
      expect(form.cancellationPayoutPolicy).toBe('FULL_COMPENSATION')
      expect(form.restaurantHistoryDays).toBe('30')
      expect(form.sosLocationRetentionDays).toBe('30')
      expect(form.dispatchPhoneNumber).toBe('+302421012345')

      const zeroForm = formFromSettings({ arrivalRadiusMetres: 0, handBackSeconds: 0 })
      expect(zeroForm.arrivalRadiusMetres).toBe('0')
      expect(zeroForm.handBackSeconds).toBe('0')
    })

    it('EMPTY_FORM has empty strings for all text/number fields and null for switch and region', () => {
      expect(EMPTY_FORM.name).toBe('')
      expect(EMPTY_FORM.quoteBaseFee).toBe('')
      expect(EMPTY_FORM.offerExpiryEnabled).toBeNull()
      expect(EMPTY_FORM.region).toBeNull()
      expect(EMPTY_FORM.arrivalRadiusMetres).toBe('')
      expect(EMPTY_FORM.handBackSeconds).toBe('')
      expect(EMPTY_FORM.cancellationPayoutPolicy).toBe('')
      expect(EMPTY_FORM.restaurantHistoryDays).toBe('')
      expect(EMPTY_FORM.sosLocationRetentionDays).toBe('')
      expect(EMPTY_FORM.dispatchPhoneNumber).toBe('')
      expect(EMPTY_FORM.offerTimingEnabled).toBeNull()
      expect(EMPTY_FORM.offerLeadMinutes).toBe('')
      expect(EMPTY_FORM.offerTimingCandidates).toBe('')
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
      expect(labelOf('arrivalRadiusMetres')).toBe('Arrival radius (metres)')
      expect(labelOf('handBackSeconds')).toBe('Seconds a rider can hand back an order for free')
      expect(labelOf('cancellationPayoutPolicy')).toBe('Pay when a job is cancelled')
      expect(labelOf('restaurantHistoryDays')).toBe('Restaurant order history (days)')
      expect(labelOf('sosLocationRetentionDays')).toBe('SOS location kept for (days)')
      expect(labelOf('dispatchPhoneNumber')).toBe('Dispatch phone number')
      expect(labelOf('offerTimingEnabled')).toBe('Timed offers')
      expect(labelOf('offerLeadMinutes')).toBe('Lead time before an offer (minutes)')
      expect(labelOf('offerTimingCandidates')).toBe('Riders compared by road time')
    })
  })

  describe('SETTINGS definition (spec 0022, AC-11)', () => {
    it('declares sosLocationRetentionDays with kind number', () => {
      const setting = SETTINGS.find((s) => s.key === 'sosLocationRetentionDays')
      expect(setting).toBeDefined()
      expect(setting?.kind).toBe('number')
      expect(setting?.label).toBe('SOS location kept for (days)')
    })

    it('declares timed offers settings (spec 0031, AC-1)', () => {
      const timingEnabled = SETTINGS.find((s) => s.key === 'offerTimingEnabled')
      expect(timingEnabled).toMatchObject({ key: 'offerTimingEnabled', kind: 'switch', label: 'Timed offers' })

      const leadMinutes = SETTINGS.find((s) => s.key === 'offerLeadMinutes')
      expect(leadMinutes).toMatchObject({
        key: 'offerLeadMinutes',
        kind: 'number',
        label: 'Lead time before an offer (minutes)',
      })

      const candidates = SETTINGS.find((s) => s.key === 'offerTimingCandidates')
      expect(candidates).toMatchObject({
        key: 'offerTimingCandidates',
        kind: 'number',
        label: 'Riders compared by road time',
      })
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
      expect(sameValue('arrivalRadiusMetres', '50', 50)).toBe(true)
      expect(sameValue('arrivalRadiusMetres', '0', 0)).toBe(true)
      expect(sameValue('arrivalRadiusMetres', '50', '80')).toBe(false)
      expect(sameValue('handBackSeconds', '60', 60)).toBe(true)
      expect(sameValue('handBackSeconds', '0', 0)).toBe(true)
      expect(sameValue('handBackSeconds', '60', '45')).toBe(false)
      expect(sameValue('restaurantHistoryDays', '30', 30)).toBe(true)
      expect(sameValue('restaurantHistoryDays', '30', '7')).toBe(false)
      expect(sameValue('sosLocationRetentionDays', '30', 30)).toBe(true)
      expect(sameValue('sosLocationRetentionDays', '30', '14')).toBe(false)
      expect(sameValue('cancellationPayoutPolicy', 'FULL_COMPENSATION', 'FULL_COMPENSATION')).toBe(true)
      expect(sameValue('cancellationPayoutPolicy', 'FULL_COMPENSATION', 'HALF_COMPENSATION')).toBe(false)
    })

    it('compares dispatchPhoneNumber as stripped phone string', () => {
      expect(sameValue('dispatchPhoneNumber', '+30 24210 12345', '+302421012345')).toBe(true)
      expect(sameValue('dispatchPhoneNumber', '+30-24210-12345', '+302421012345')).toBe(true)
      expect(sameValue('dispatchPhoneNumber', '+30 (24210) 12345', '+302421012345')).toBe(true)
      expect(sameValue('dispatchPhoneNumber', '+30.24210.12345', '+302421012345')).toBe(true)
      expect(sameValue('dispatchPhoneNumber', '+30 24210 12345', '+30 24210 99999')).toBe(false)
      expect(sameValue('dispatchPhoneNumber', '', '')).toBe(true)
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

  // ---------------------------------------------------------------------------
  // Shifts (spec 0026, row 77, AC-5): the switch and the drop notice
  // ---------------------------------------------------------------------------
  describe('Shift settings (spec 0026, AC-5)', () => {
    const savedDetails = { name: 'Volos Couriers', region: { type: 'FeatureCollection', features: [] } }

    it('SETTINGS has shiftsEnabled as a switch labelled "Shifts" and shiftDropNoticeHours as a number', () => {
      const enabled = SETTINGS.find((s) => s.key === 'shiftsEnabled')
      expect(enabled).toMatchObject({ kind: 'switch', label: 'Shifts' })
      expect(enabled?.details).toBeFalsy()
      const notice = SETTINGS.find((s) => s.key === 'shiftDropNoticeHours')
      expect(notice).toMatchObject({ kind: 'number', label: 'Notice to drop a shift, in hours' })
      expect(notice?.details).toBeFalsy()
      expect(labelOf('shiftDropNoticeHours')).toBe('Notice to drop a shift, in hours')
    })

    it('formFromSettings keeps the switch as a boolean (false included) and the notice as text (0 included)', () => {
      const on = formFromSettings({ shiftsEnabled: true, shiftDropNoticeHours: 12 })
      expect(on.shiftsEnabled).toBe(true)
      expect(on.shiftDropNoticeHours).toBe('12')

      const off = formFromSettings({ shiftsEnabled: false, shiftDropNoticeHours: 0 })
      expect(off.shiftsEnabled).toBe(false)
      expect(off.shiftDropNoticeHours).toBe('0')
    })

    it('formFromSettings leaves the switch unknown (null) and the notice empty when missing, as EMPTY_FORM does', () => {
      const form = formFromSettings({ shiftsEnabled: null })
      expect(form.shiftsEnabled).toBeNull()
      expect(form.shiftDropNoticeHours).toBe('')
      expect(EMPTY_FORM.shiftsEnabled).toBeNull()
      expect(EMPTY_FORM.shiftDropNoticeHours).toBe('')
    })

    it('pendingChanges shows the switch as Off → On and the notice 12 → 0', () => {
      const changes = pendingChanges(baseSavedForm, { ...baseSavedForm, shiftsEnabled: true, shiftDropNoticeHours: '0' })
      expect(changes).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ key: 'shiftsEnabled', label: 'Shifts', from: 'Off', to: 'On' }),
          expect.objectContaining({ key: 'shiftDropNoticeHours', label: 'Notice to drop a shift, in hours', from: '12', to: '0' }),
        ])
      )
      expect(changes).toHaveLength(2)
    })

    it('blocks Save when the changed notice box is emptied', () => {
      const edited = { ...baseSavedForm, shiftDropNoticeHours: '' }
      const changes = pendingChanges(baseSavedForm, edited)
      expect(blockers(changes, edited).join(' ')).toContain('Notice to drop a shift, in hours')
    })

    it('savePayload sends shiftDropNoticeHours as a number (0 as 0) and shiftsEnabled as a boolean', () => {
      const edited: SettingsForm = { ...baseSavedForm, shiftsEnabled: true, shiftDropNoticeHours: '24' }
      const payload = savePayload(pendingChanges(baseSavedForm, edited), edited, savedDetails)
      expect(payload).toEqual({ shiftsEnabled: true, shiftDropNoticeHours: 24 })
      expect(typeof payload.shiftDropNoticeHours).toBe('number')
      expect(typeof payload.shiftsEnabled).toBe('boolean')

      const savedOn: SettingsForm = { ...baseSavedForm, shiftsEnabled: true }
      const editedOff: SettingsForm = { ...savedOn, shiftsEnabled: false, shiftDropNoticeHours: '0' }
      const payloadOff = savePayload(pendingChanges(savedOn, editedOff), editedOff, savedDetails)
      expect(payloadOff).toEqual({ shiftsEnabled: false, shiftDropNoticeHours: 0 })
      expect(payloadOff).not.toHaveProperty('details')
    })

    it('successMessage adds the shifts sentence for either setting, once', () => {
      expect(successMessage([{ key: 'shiftsEnabled', label: 'Shifts', from: 'Off', to: 'On' }] as any)).toBe(
        'Saved: Shifts. Riders see nothing of shifts until shift booking is built.'
      )
      expect(
        successMessage([
          { key: 'shiftsEnabled', label: 'Shifts', from: 'Off', to: 'On' },
          { key: 'shiftDropNoticeHours', label: 'Notice to drop a shift, in hours', from: '12', to: '24' },
        ] as any)
      ).toBe('Saved: Shifts, Notice to drop a shift, in hours. Riders see nothing of shifts until shift booking is built.')
    })
  })

  // ---------------------------------------------------------------------------
  // Timed offers (spec 0031, row 22, AC-1)
  // ---------------------------------------------------------------------------
  describe('Timed offers settings (spec 0031, row 22, AC-1)', () => {
    const savedDetails = { name: 'Volos Couriers', region: { type: 'FeatureCollection', features: [] } }

    it('formFromSettings preserves boolean switch (false included) and numbers as strings (0 included)', () => {
      const on = formFromSettings({
        offerTimingEnabled: true,
        offerLeadMinutes: 3,
        offerTimingCandidates: 5,
      })
      expect(on.offerTimingEnabled).toBe(true)
      expect(on.offerLeadMinutes).toBe('3')
      expect(on.offerTimingCandidates).toBe('5')

      const off = formFromSettings({
        offerTimingEnabled: false,
        offerLeadMinutes: 0,
        offerTimingCandidates: 1,
      })
      expect(off.offerTimingEnabled).toBe(false)
      expect(off.offerLeadMinutes).toBe('0')
      expect(off.offerTimingCandidates).toBe('1')
    })

    it('formFromSettings handles missing and null values as null/empty string', () => {
      const form = formFromSettings({
        offerTimingEnabled: null,
      })
      expect(form.offerTimingEnabled).toBeNull()
      expect(form.offerLeadMinutes).toBe('')
      expect(form.offerTimingCandidates).toBe('')
    })

    it('pendingChanges detects toggling switch from Off to On and from On to Off', () => {
      // Off -> On
      const baseOff: SettingsForm = { ...baseSavedForm, offerTimingEnabled: false }
      const changesOn = pendingChanges(baseOff, { ...baseOff, offerTimingEnabled: true })
      expect(changesOn).toHaveLength(1)
      expect(changesOn[0]).toMatchObject({
        key: 'offerTimingEnabled',
        label: 'Timed offers',
        from: 'Off',
        to: 'On',
      })

      // On -> Off
      const baseOn: SettingsForm = { ...baseSavedForm, offerTimingEnabled: true }
      const changesOff = pendingChanges(baseOn, { ...baseOn, offerTimingEnabled: false })
      expect(changesOff).toHaveLength(1)
      expect(changesOff[0]).toMatchObject({
        key: 'offerTimingEnabled',
        label: 'Timed offers',
        from: 'On',
        to: 'Off',
      })
    })

    it('pendingChanges detects edits to offerLeadMinutes and offerTimingCandidates', () => {
      const edited: SettingsForm = {
        ...baseSavedForm,
        offerLeadMinutes: '0',
        offerTimingCandidates: '10',
      }
      const changes = pendingChanges(baseSavedForm, edited)
      expect(changes).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            key: 'offerLeadMinutes',
            label: 'Lead time before an offer (minutes)',
            from: '3',
            to: '0',
          }),
          expect.objectContaining({
            key: 'offerTimingCandidates',
            label: 'Riders compared by road time',
            from: '5',
            to: '10',
          }),
        ])
      )
    })

    it('blockers blocks save when offerLeadMinutes or offerTimingCandidates is emptied', () => {
      const editedEmptyLead: SettingsForm = { ...baseSavedForm, offerLeadMinutes: '' }
      const changesLead = pendingChanges(baseSavedForm, editedEmptyLead)
      expect(blockers(changesLead, editedEmptyLead)).toContain('Lead time before an offer (minutes) is empty')

      const editedEmptyCandidates: SettingsForm = { ...baseSavedForm, offerTimingCandidates: '' }
      const changesCandidates = pendingChanges(baseSavedForm, editedEmptyCandidates)
      expect(blockers(changesCandidates, editedEmptyCandidates)).toContain('Riders compared by road time is empty')
    })

    it('savePayload sends offerTimingEnabled as boolean (false sent as false) and numbers as numbers', () => {
      // Saving switch ON
      const editedOn: SettingsForm = {
        ...baseSavedForm,
        offerTimingEnabled: true,
        offerLeadMinutes: '10',
        offerTimingCandidates: '8',
      }
      const payloadOn = savePayload(pendingChanges(baseSavedForm, editedOn), editedOn, savedDetails)
      expect(payloadOn).toEqual({
        offerTimingEnabled: true,
        offerLeadMinutes: 10,
        offerTimingCandidates: 8,
      })
      expect(typeof payloadOn.offerTimingEnabled).toBe('boolean')
      expect(typeof payloadOn.offerLeadMinutes).toBe('number')
      expect(typeof payloadOn.offerTimingCandidates).toBe('number')
      expect(payloadOn).not.toHaveProperty('details')

      // Saving switch OFF: crucial invariant - false must be sent as false, not omitted or dropped!
      const savedOn: SettingsForm = { ...baseSavedForm, offerTimingEnabled: true }
      const editedOff: SettingsForm = {
        ...savedOn,
        offerTimingEnabled: false,
        offerLeadMinutes: '0',
      }
      const payloadOff = savePayload(pendingChanges(savedOn, editedOff), editedOff, savedDetails)
      expect(payloadOff).toEqual({
        offerTimingEnabled: false,
        offerLeadMinutes: 0,
      })
      expect(payloadOff.offerTimingEnabled).toBe(false)
      expect(payloadOff.offerLeadMinutes).toBe(0)
      expect(payloadOff).not.toHaveProperty('details')
    })

    it('successMessage appends timed offers sentence when any timed offer setting changes', () => {
      expect(
        successMessage([{ key: 'offerTimingEnabled', label: 'Timed offers', from: 'Off', to: 'On' }] as any)
      ).toBe('Saved: Timed offers. Timed offers apply to the next offer; an offer already out is not moved.')

      expect(
        successMessage([
          { key: 'offerLeadMinutes', label: 'Lead time before an offer (minutes)', from: '3', to: '5' },
        ] as any)
      ).toBe(
        'Saved: Lead time before an offer (minutes). Timed offers apply to the next offer; an offer already out is not moved.'
      )

      expect(
        successMessage([
          { key: 'offerTimingCandidates', label: 'Riders compared by road time', from: '5', to: '10' },
        ] as any)
      ).toBe(
        'Saved: Riders compared by road time. Timed offers apply to the next offer; an offer already out is not moved.'
      )

      // When multiple timed offers settings change, the sentence is appended only once
      expect(
        successMessage([
          { key: 'offerTimingEnabled', label: 'Timed offers', from: 'Off', to: 'On' },
          { key: 'offerLeadMinutes', label: 'Lead time before an offer (minutes)', from: '3', to: '5' },
          { key: 'offerTimingCandidates', label: 'Riders compared by road time', from: '5', to: '10' },
        ] as any)
      ).toBe(
        'Saved: Timed offers, Lead time before an offer (minutes), Riders compared by road time. Timed offers apply to the next offer; an offer already out is not moved.'
      )
    })
  })
})
