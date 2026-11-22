import {
  blockers,
  boxUnitsOutOfOrder,
  EMPTY_FORM,
  feeAboveCeiling,
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
import { InstanceConfigSettingsAdminInputToJSON } from '../../backend-admin-sdk/src/models/InstanceConfigSettingsAdminInput'
import { InstanceConfigSettingsDtoFromJSON } from '../../backend-admin-sdk/src/models/InstanceConfigSettingsDto'

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
    feePercentageCeiling: '25',
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
    waitPayEnabled: false,
    waitPayFreeMinutes: '5',
    waitPayCentsPerMinute: '10',
    waitLimitMinutes: '10',
    // Spec 0047: the form has the split answer time too.
    splitAnswerMinutes: '10',
    handBackSeconds: '60',
    cancellationPayoutPolicy: 'FULL_COMPENSATION',
    returnTripPayPercent: '100',
    savedCustomerRetentionMonths: '12',
    restaurantHistoryDays: '30',
    sosLocationRetentionDays: '30',
    dispatchPhoneNumber: '+302421012345',
    shiftsEnabled: false,
    shiftDropNoticeHours: '12',
    shiftBreakMinutes: '30',
    chatQuickRepliesDispatch: 'Line 1\nLine 2',
    chatQuickRepliesCourier: 'Courier line 1\nCourier line 2',
    chatRetentionDays: '90',
    // Address notes (spec 0053): days a courier note is kept when no rider upvotes it.
    addressNoteRetentionDays: '182',
    reviewAnswerDays: '14',
    reviewCorrectionMaxCents: '5000',
    boxUnitsSmall: '30',
    boxUnitsMedium: '50',
    boxUnitsLarge: '100',
    boxDefaultSize: 'MEDIUM',
    fairnessWeightRoadTime: '50',
    fairnessWeightEarnings: '30',
    fairnessWeightWaiting: '20',
    fairnessWeightShift: '0',
    fairnessCandidateLimit: '10',
    fairnessMinOnlineMinutes: '30',
    stackingEnabled: false,
    twoOrderPolicy: 'SHORTAGE_ONLY',
    twoOrderDelayLimitMinutes: '10',
    addOnOffersEnabled: false,
    addOnMoment: 'BEFORE_PICKUP',
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

    it('detects changes to addressNoteRetentionDays (spec 0053, AC-6)', () => {
      const edited: SettingsForm = { ...baseSavedForm, addressNoteRetentionDays: '200' }
      const changes = pendingChanges(baseSavedForm, edited)
      expect(changes).toHaveLength(1)
      expect(changes[0]?.key).toBe('addressNoteRetentionDays')
      expect(changes[0]?.label).toBe('Address notes kept without an upvote (days)')
      expect(changes[0]?.from).toBe('182')
      expect(changes[0]?.to).toBe('200')
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

      const addressNotesChanges = [{ key: 'addressNoteRetentionDays', label: 'Address notes kept without an upvote (days)', from: '182', to: '(empty)' }]
      const addressNotesEdited: SettingsForm = {
        ...baseSavedForm,
        addressNoteRetentionDays: '',
      }
      expect(blockers(addressNotesChanges as any, addressNotesEdited)).toContain('Address notes kept without an upvote (days) is empty')
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

    describe('fairness weights blockers (spec 0044, AC-5)', () => {
      const allZeroFairnessMessage = `${labelOf('fairnessWeightRoadTime')}, ${labelOf('fairnessWeightEarnings')} and ${labelOf('fairnessWeightWaiting')} cannot all be 0`

      it('refuses all three weights at 0 on the values the save would leave (one changed, the others saved at 0)', () => {
        // Saved state has roadTime: 0, earnings: 0, waiting: 20
        const savedWithTwoZeros: SettingsForm = {
          ...baseSavedForm,
          fairnessWeightRoadTime: '0',
          fairnessWeightEarnings: '0',
          fairnessWeightWaiting: '20',
        }
        // User changes only fairnessWeightWaiting from '20' to '0'
        const changes = [
          { key: 'fairnessWeightWaiting', label: labelOf('fairnessWeightWaiting'), from: '20', to: '0' },
        ]
        const edited: SettingsForm = {
          ...savedWithTwoZeros,
          fairnessWeightWaiting: '0',
        }

        const blocked = blockers(changes as any, edited)
        expect(blocked).toContain(allZeroFairnessMessage)
      })

      it('refuses all three weights at 0 when all three are changed to 0', () => {
        const changes = [
          { key: 'fairnessWeightRoadTime', label: labelOf('fairnessWeightRoadTime'), from: '50', to: '0' },
          { key: 'fairnessWeightEarnings', label: labelOf('fairnessWeightEarnings'), from: '30', to: '0' },
          { key: 'fairnessWeightWaiting', label: labelOf('fairnessWeightWaiting'), from: '20', to: '0' },
        ]
        const edited: SettingsForm = {
          ...baseSavedForm,
          fairnessWeightRoadTime: '0',
          fairnessWeightEarnings: '0',
          fairnessWeightWaiting: '0',
        }

        const blocked = blockers(changes as any, edited)
        expect(blocked).toContain(allZeroFairnessMessage)
      })

      it('names the three settings by their labels in the all zero blocker message', () => {
        const changes = [
          { key: 'fairnessWeightRoadTime', label: labelOf('fairnessWeightRoadTime'), from: '50', to: '0' },
          { key: 'fairnessWeightEarnings', label: labelOf('fairnessWeightEarnings'), from: '30', to: '0' },
          { key: 'fairnessWeightWaiting', label: labelOf('fairnessWeightWaiting'), from: '20', to: '0' },
        ]
        const edited: SettingsForm = {
          ...baseSavedForm,
          fairnessWeightRoadTime: '0',
          fairnessWeightEarnings: '0',
          fairnessWeightWaiting: '0',
        }

        const blocked = blockers(changes as any, edited)
        expect(blocked).toContain(allZeroFairnessMessage)
        expect(allZeroFairnessMessage).toContain('Weight of road time to the restaurant')
        expect(allZeroFairnessMessage).toContain("Weight of the rider's pay per hour today")
        expect(allZeroFairnessMessage).toContain('Weight of waiting since the last job or going Online')
        expect(allZeroFairnessMessage).toBe(
          'Weight of road time to the restaurant, Weight of the rider\'s pay per hour today and Weight of waiting since the last job or going Online cannot all be 0'
        )
      })

      it('allows one weight at 0 (and two above 0)', () => {
        const changes = [
          { key: 'fairnessWeightRoadTime', label: labelOf('fairnessWeightRoadTime'), from: '50', to: '0' },
        ]
        const edited: SettingsForm = {
          ...baseSavedForm,
          fairnessWeightRoadTime: '0',
          fairnessWeightEarnings: '30',
          fairnessWeightWaiting: '20',
        }

        const blocked = blockers(changes as any, edited)
        expect(blocked).not.toContain(allZeroFairnessMessage)
      })

      it('allows two weights at 0 (and one above 0)', () => {
        const changes = [
          { key: 'fairnessWeightEarnings', label: labelOf('fairnessWeightEarnings'), from: '30', to: '0' },
        ]
        const edited: SettingsForm = {
          ...baseSavedForm,
          fairnessWeightRoadTime: '0',
          fairnessWeightEarnings: '0',
          fairnessWeightWaiting: '20',
        }

        const blocked = blockers(changes as any, edited)
        expect(blocked).not.toContain(allZeroFairnessMessage)
      })

      it('says nothing when none of the three fairness weights changed even if all three in edited are 0', () => {
        // Only quoteBaseFee changed, fairness weights are not in changes list
        const changes = [
          { key: 'quoteBaseFee', label: 'Base fee', from: '€2.00', to: '€2.50' },
        ]
        const editedWithZeroWeights: SettingsForm = {
          ...baseSavedForm,
          quoteBaseFee: '250',
          fairnessWeightRoadTime: '0',
          fairnessWeightEarnings: '0',
          fairnessWeightWaiting: '0',
        }

        const blocked = blockers(changes as any, editedWithZeroWeights)
        expect(blocked).not.toContain(allZeroFairnessMessage)
      })
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

    it('sends fairness settings as numbers and preserves 0 as number 0 (spec 0044, AC-5)', () => {
      const changes = [
        { key: 'fairnessWeightRoadTime', label: 'Weight of road time to the restaurant', from: '50', to: '0' },
        { key: 'fairnessWeightEarnings', label: "Weight of the rider's pay per hour today", from: '30', to: '70' },
        { key: 'fairnessWeightWaiting', label: 'Weight of waiting since the last job', from: '20', to: '30' },
        { key: 'fairnessCandidateLimit', label: 'Nearest riders compared for each offer', from: '10', to: '15' },
        { key: 'fairnessMinOnlineMinutes', label: 'Minutes online before own pay per hour counts', from: '30', to: '45' },
      ]
      const edited: SettingsForm = {
        ...baseSavedForm,
        fairnessWeightRoadTime: '0',
        fairnessWeightEarnings: '70',
        fairnessWeightWaiting: '30',
        fairnessCandidateLimit: '15',
        fairnessMinOnlineMinutes: '45',
      }
      const payload = savePayload(changes as any, edited, savedDetails)
      expect(payload).toEqual({
        fairnessWeightRoadTime: 0,
        fairnessWeightEarnings: 70,
        fairnessWeightWaiting: 30,
        fairnessCandidateLimit: 15,
        fairnessMinOnlineMinutes: 45,
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

      const changesAddressNotes = [
        { key: 'addressNoteRetentionDays', label: 'Address notes kept without an upvote (days)', from: '182', to: '200' },
      ]
      const editedAddressNotes: SettingsForm = {
        ...baseSavedForm,
        addressNoteRetentionDays: '200',
      }
      const payloadAddressNotes = savePayload(changesAddressNotes as any, editedAddressNotes, savedDetails)
      expect(payloadAddressNotes).toEqual({
        addressNoteRetentionDays: 200,
      })
      expect(payloadAddressNotes).not.toHaveProperty('details')
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

    it('appends addressNoteRetentionDays sentence when retention days is changed (spec 0053, AC-6)', () => {
      const changes = [{ key: 'addressNoteRetentionDays', label: 'Address notes kept without an upvote (days)', from: '182', to: '200' }]
      expect(successMessage(changes as any)).toBe(
        'Saved: Address notes kept without an upvote (days). The nightly job deletes address notes under the new period from its next run, and riders see the new period in How notes work.'
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

    it('declares restaurant delay settings (spec 0033, AC-1)', () => {
      const waitPayEnabled = SETTINGS.find((s) => s.key === 'waitPayEnabled')
      expect(waitPayEnabled).toMatchObject({ key: 'waitPayEnabled', kind: 'switch', label: 'Delay pay' })

      const freeMinutes = SETTINGS.find((s) => s.key === 'waitPayFreeMinutes')
      expect(freeMinutes).toMatchObject({
        key: 'waitPayFreeMinutes',
        kind: 'number',
        label: 'Free minutes after the promised time',
      })

      const centsPerMinute = SETTINGS.find((s) => s.key === 'waitPayCentsPerMinute')
      expect(centsPerMinute).toMatchObject({
        key: 'waitPayCentsPerMinute',
        kind: 'number',
        label: 'Delay pay per minute (cents)',
      })

      const waitLimit = SETTINGS.find((s) => s.key === 'waitLimitMinutes')
      expect(waitLimit).toMatchObject({
        key: 'waitLimitMinutes',
        kind: 'number',
        label: 'Minutes before a rider can leave',
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

  describe('Restaurant delays settings (spec 0033, AC-1)', () => {
    const savedDetails = { name: 'Volos Couriers', region: { type: 'FeatureCollection', features: [] } }

    it('formFromSettings preserves boolean switch (false included) and numbers as strings (0 included)', () => {
      const form = formFromSettings({
        waitPayEnabled: false,
        waitPayFreeMinutes: 0,
        waitPayCentsPerMinute: 0,
        waitLimitMinutes: 1,
      })
      expect(form.waitPayEnabled).toBe(false)
      expect(form.waitPayFreeMinutes).toBe('0')
      expect(form.waitPayCentsPerMinute).toBe('0')
      expect(form.waitLimitMinutes).toBe('1')

      const enabledForm = formFromSettings({
        waitPayEnabled: true,
        waitPayFreeMinutes: 5,
        waitPayCentsPerMinute: 10,
        waitLimitMinutes: 15,
      })
      expect(enabledForm.waitPayEnabled).toBe(true)
      expect(enabledForm.waitPayFreeMinutes).toBe('5')
      expect(enabledForm.waitPayCentsPerMinute).toBe('10')
      expect(enabledForm.waitLimitMinutes).toBe('15')
    })

    it('formFromSettings handles missing and null values as null/empty string', () => {
      const formMissing = formFromSettings({})
      expect(formMissing.waitPayEnabled).toBeNull()
      expect(formMissing.waitPayFreeMinutes).toBe('')
      expect(formMissing.waitPayCentsPerMinute).toBe('')
      expect(formMissing.waitLimitMinutes).toBe('')

      const formNull = formFromSettings({
        waitPayEnabled: null,
        waitPayFreeMinutes: null,
        waitPayCentsPerMinute: null,
        waitLimitMinutes: null,
      })
      expect(formNull.waitPayEnabled).toBeNull()
      expect(formNull.waitPayFreeMinutes).toBe('')
      expect(formNull.waitPayCentsPerMinute).toBe('')
      expect(formNull.waitLimitMinutes).toBe('')
    })

    it('pendingChanges detects toggling switch from Off to On and from On to Off', () => {
      const savedOff: SettingsForm = { ...baseSavedForm, waitPayEnabled: false }
      const editedOn: SettingsForm = { ...savedOff, waitPayEnabled: true }
      const changesOn = pendingChanges(savedOff, editedOn)
      expect(changesOn).toHaveLength(1)
      expect(changesOn[0]).toMatchObject({
        key: 'waitPayEnabled',
        label: 'Delay pay',
        from: 'Off',
        to: 'On',
      })

      const savedOn: SettingsForm = { ...baseSavedForm, waitPayEnabled: true }
      const editedOff: SettingsForm = { ...savedOn, waitPayEnabled: false }
      const changesOff = pendingChanges(savedOn, editedOff)
      expect(changesOff).toHaveLength(1)
      expect(changesOff[0]).toMatchObject({
        key: 'waitPayEnabled',
        label: 'Delay pay',
        from: 'On',
        to: 'Off',
      })
    })

    it('pendingChanges detects edits to waitPayFreeMinutes, waitPayCentsPerMinute, and waitLimitMinutes', () => {
      const edited: SettingsForm = {
        ...baseSavedForm,
        waitPayFreeMinutes: '0',
        waitPayCentsPerMinute: '20',
        waitLimitMinutes: '15',
      }
      const changes = pendingChanges(baseSavedForm, edited)
      expect(changes).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            key: 'waitPayFreeMinutes',
            label: 'Free minutes after the promised time',
            from: '5',
            to: '0',
          }),
          expect.objectContaining({
            key: 'waitPayCentsPerMinute',
            label: 'Delay pay per minute (cents)',
            from: '10',
            to: '20',
          }),
          expect.objectContaining({
            key: 'waitLimitMinutes',
            label: 'Minutes before a rider can leave',
            from: '10',
            to: '15',
          }),
        ])
      )
    })

    it('blockers blocks save when waitPayFreeMinutes, waitPayCentsPerMinute, or waitLimitMinutes is emptied', () => {
      const editedEmptyFree: SettingsForm = { ...baseSavedForm, waitPayFreeMinutes: '' }
      const changesFree = pendingChanges(baseSavedForm, editedEmptyFree)
      expect(blockers(changesFree, editedEmptyFree)).toContain('Free minutes after the promised time is empty')

      const editedEmptyCents: SettingsForm = { ...baseSavedForm, waitPayCentsPerMinute: '' }
      const changesCents = pendingChanges(baseSavedForm, editedEmptyCents)
      expect(blockers(changesCents, editedEmptyCents)).toContain('Delay pay per minute (cents) is empty')

      const editedEmptyLimit: SettingsForm = { ...baseSavedForm, waitLimitMinutes: '' }
      const changesLimit = pendingChanges(baseSavedForm, editedEmptyLimit)
      expect(blockers(changesLimit, editedEmptyLimit)).toContain('Minutes before a rider can leave is empty')
    })

    it('savePayload sends waitPayEnabled as boolean (false sent as false) and numbers as numbers', () => {
      // Saving switch ON
      const editedOn: SettingsForm = {
        ...baseSavedForm,
        waitPayEnabled: true,
        waitPayFreeMinutes: '10',
        waitPayCentsPerMinute: '15',
        waitLimitMinutes: '20',
      }
      const payloadOn = savePayload(pendingChanges(baseSavedForm, editedOn), editedOn, savedDetails)
      expect(payloadOn).toEqual({
        waitPayEnabled: true,
        waitPayFreeMinutes: 10,
        waitPayCentsPerMinute: 15,
        waitLimitMinutes: 20,
      })
      expect(typeof payloadOn.waitPayEnabled).toBe('boolean')
      expect(typeof payloadOn.waitPayFreeMinutes).toBe('number')
      expect(typeof payloadOn.waitPayCentsPerMinute).toBe('number')
      expect(typeof payloadOn.waitLimitMinutes).toBe('number')
      expect(payloadOn).not.toHaveProperty('details')

      // Saving switch OFF: crucial invariant - false must be sent as false, not omitted or dropped!
      const savedOn: SettingsForm = { ...baseSavedForm, waitPayEnabled: true }
      const editedOff: SettingsForm = {
        ...savedOn,
        waitPayEnabled: false,
        waitPayFreeMinutes: '0',
      }
      const payloadOff = savePayload(pendingChanges(savedOn, editedOff), editedOff, savedDetails)
      expect(payloadOff).toEqual({
        waitPayEnabled: false,
        waitPayFreeMinutes: 0,
      })
      expect(payloadOff.waitPayEnabled).toBe(false)
      expect(payloadOff.waitPayFreeMinutes).toBe(0)
      expect(payloadOff).not.toHaveProperty('details')
    })

    it('successMessage appends restaurant delay sentence when any restaurant delay setting changes', () => {
      const sentence =
        'Restaurant delay settings apply to waits that end from now on; a wait already paid keeps its amount.'

      expect(
        successMessage([{ key: 'waitPayEnabled', label: 'Delay pay', from: 'Off', to: 'On' }] as any)
      ).toBe(`Saved: Delay pay. ${sentence}`)

      expect(
        successMessage([
          { key: 'waitPayFreeMinutes', label: 'Free minutes after the promised time', from: '5', to: '10' },
        ] as any)
      ).toBe(`Saved: Free minutes after the promised time. ${sentence}`)

      expect(
        successMessage([
          { key: 'waitPayCentsPerMinute', label: 'Delay pay per minute (cents)', from: '10', to: '15' },
        ] as any)
      ).toBe(`Saved: Delay pay per minute (cents). ${sentence}`)

      expect(
        successMessage([
          { key: 'waitLimitMinutes', label: 'Minutes before a rider can leave', from: '10', to: '15' },
        ] as any)
      ).toBe(`Saved: Minutes before a rider can leave. ${sentence}`)

      // When multiple restaurant delay settings change, the sentence is appended only once
      expect(
        successMessage([
          { key: 'waitPayEnabled', label: 'Delay pay', from: 'Off', to: 'On' },
          { key: 'waitPayFreeMinutes', label: 'Free minutes after the promised time', from: '5', to: '10' },
          { key: 'waitPayCentsPerMinute', label: 'Delay pay per minute (cents)', from: '10', to: '15' },
          { key: 'waitLimitMinutes', label: 'Minutes before a rider can leave', from: '10', to: '15' },
        ] as any)
      ).toBe(
        `Saved: Delay pay, Free minutes after the promised time, Delay pay per minute (cents), Minutes before a rider can leave. ${sentence}`
      )
    })
  })

  describe('returnTripPayPercent setting (spec 0035, AC-2)', () => {
    const savedDetails = { name: 'Volos Couriers', region: { type: 'FeatureCollection', features: [] } }

    it('declares returnTripPayPercent in SETTINGS with kind number and correct label', () => {
      const setting = SETTINGS.find((s) => s.key === 'returnTripPayPercent')
      expect(setting).toBeDefined()
      expect(setting?.kind).toBe('number')
      expect(setting?.label).toBe('Return trip pay (%)')
    })

    it('formFromSettings preserves returnTripPayPercent as string and handles 0, null, missing', () => {
      expect(formFromSettings({ returnTripPayPercent: 100 }).returnTripPayPercent).toBe('100')
      expect(formFromSettings({ returnTripPayPercent: 0 }).returnTripPayPercent).toBe('0')
      expect(formFromSettings({ returnTripPayPercent: null }).returnTripPayPercent).toBe('')
      expect(formFromSettings({}).returnTripPayPercent).toBe('')
      expect(EMPTY_FORM.returnTripPayPercent).toBe('')
    })

    it('pendingChanges detects edits to returnTripPayPercent', () => {
      const edited: SettingsForm = { ...baseSavedForm, returnTripPayPercent: '50' }
      const changes = pendingChanges(baseSavedForm, edited)
      expect(changes).toHaveLength(1)
      expect(changes[0]?.key).toBe('returnTripPayPercent')
      expect(changes[0]?.from).toBe('100')
      expect(changes[0]?.to).toBe('50')
      expect(changes[0]?.label).toBe('Return trip pay (%)')
    })

    it('blockers blocks save when returnTripPayPercent is emptied', () => {
      const editedEmpty: SettingsForm = { ...baseSavedForm, returnTripPayPercent: '' }
      const changes = pendingChanges(baseSavedForm, editedEmpty)
      expect(blockers(changes, editedEmpty)).toContain('Return trip pay (%) is empty')
    })

    it('savePayload sends returnTripPayPercent as a number and 0 as number 0', () => {
      const edited: SettingsForm = { ...baseSavedForm, returnTripPayPercent: '75' }
      const payload = savePayload(pendingChanges(baseSavedForm, edited), edited, savedDetails)
      expect(payload).toEqual({ returnTripPayPercent: 75 })
      expect(typeof payload.returnTripPayPercent).toBe('number')
      expect(payload).not.toHaveProperty('details')

      const editedZero: SettingsForm = { ...baseSavedForm, returnTripPayPercent: '0' }
      const payloadZero = savePayload(pendingChanges(baseSavedForm, editedZero), editedZero, savedDetails)
      expect(payloadZero).toEqual({ returnTripPayPercent: 0 })
      expect(payloadZero.returnTripPayPercent).toBe(0)
    })

    it('successMessage appends return trip pay sentence when returnTripPayPercent changed', () => {
      const sentence = 'Return trip pay applies to food recorded as returned from now on.'
      const changes = [{ key: 'returnTripPayPercent', label: 'Return trip pay (%)', from: '100', to: '75' }]
      expect(successMessage(changes as any)).toBe(`Saved: Return trip pay (%). ${sentence}`)
    })

    it('hand edited SDK serializer carries returnTripPayPercent to JSON and Dto reads it', () => {
      const serialized = InstanceConfigSettingsAdminInputToJSON({ returnTripPayPercent: 85 } as any)
      expect(serialized.returnTripPayPercent).toBe(85)

      const deserialized = InstanceConfigSettingsDtoFromJSON({ returnTripPayPercent: 65 })
      expect(deserialized.returnTripPayPercent).toBe(65)
    })
  })

  describe('Chat settings (spec 0034, AC-13, AC-18)', () => {
    const savedDetails = { name: 'Volos Couriers', region: { type: 'FeatureCollection', features: [] } }

    it('formFromSettings joins quick replies lists with newlines and converts retention days to string', () => {
      const backendData = {
        chatQuickRepliesDispatch: ['Wait 5 min', 'Leave at door'],
        chatQuickRepliesCourier: ['At the door', 'Food not ready'],
        chatRetentionDays: 90,
      }
      const form = formFromSettings(backendData)
      expect(form.chatQuickRepliesDispatch).toBe('Wait 5 min\nLeave at door')
      expect(form.chatQuickRepliesCourier).toBe('At the door\nFood not ready')
      expect(form.chatRetentionDays).toBe('90')

      // Empty or missing falls back to empty strings
      expect(EMPTY_FORM.chatQuickRepliesDispatch).toBe('')
      expect(EMPTY_FORM.chatQuickRepliesCourier).toBe('')
      expect(EMPTY_FORM.chatRetentionDays).toBe('')
    })

    it('pendingChanges detects edits to chatQuickRepliesDispatch and chatQuickRepliesCourier as kind "lines"', () => {
      const edited: SettingsForm = {
        ...baseSavedForm,
        chatQuickRepliesDispatch: 'Wait 5 min\nLeave at door\nBring back to store',
      }
      const changes = pendingChanges(baseSavedForm, edited)
      expect(changes).toHaveLength(1)
      expect(changes[0]?.key).toBe('chatQuickRepliesDispatch')
      expect(changes[0]?.label).toBe('Dispatch quick replies')
      expect(changes[0]?.from).toBe('Line 1 · Line 2')
      expect(changes[0]?.to).toBe('Wait 5 min · Leave at door · Bring back to store')
    })

    it('sameValue ignores blank lines and trailing whitespace on lines kind', () => {
      const a = 'Line 1\nLine 2'
      const b = '  Line 1  \n\n  Line 2\n'
      expect(sameValue('chatQuickRepliesDispatch', a, b)).toBe(true)
      expect(sameValue('chatQuickRepliesCourier', a, b)).toBe(true)
    })

    it('blockers rejects more than 8 lines for dispatch or courier presets, naming the setting', () => {
      const nineLines = Array.from({ length: 9 }, (_, i) => `Preset ${i + 1}`).join('\n')

      const editedDispatch: SettingsForm = {
        ...baseSavedForm,
        chatQuickRepliesDispatch: nineLines,
      }
      const changesDispatch = pendingChanges(baseSavedForm, editedDispatch)
      const dispatchBlockers = blockers(changesDispatch, editedDispatch)
      expect(dispatchBlockers).toContain('Dispatch quick replies: at most 8, one per line')

      const editedCourier: SettingsForm = {
        ...baseSavedForm,
        chatQuickRepliesCourier: nineLines,
      }
      const changesCourier = pendingChanges(baseSavedForm, editedCourier)
      const courierBlockers = blockers(changesCourier, editedCourier)
      expect(courierBlockers).toContain('Courier quick replies: at most 8, one per line')
    })

    it('blockers rejects any line over 100 characters in presets, naming the setting', () => {
      const longLine = 'a'.repeat(101)

      const editedDispatch: SettingsForm = {
        ...baseSavedForm,
        chatQuickRepliesDispatch: `Short line\n${longLine}`,
      }
      const changesDispatch = pendingChanges(baseSavedForm, editedDispatch)
      expect(blockers(changesDispatch, editedDispatch)).toContain('Dispatch quick replies: each at most 100 characters')

      const editedCourier: SettingsForm = {
        ...baseSavedForm,
        chatQuickRepliesCourier: longLine,
      }
      const changesCourier = pendingChanges(baseSavedForm, editedCourier)
      expect(courierBlockers(changesCourier, editedCourier)).toContain('Courier quick replies: each at most 100 characters')

      function courierBlockers(c: any, e: any) {
        return blockers(c, e)
      }
    })

    it('blockers rejects empty chatRetentionDays', () => {
      const edited: SettingsForm = {
        ...baseSavedForm,
        chatRetentionDays: '   ',
      }
      const changes = pendingChanges(baseSavedForm, edited)
      expect(blockers(changes, edited)).toContain('Chat messages kept for (days) is empty')
    })

    it('savePayload sends presets as trimmed lists with blank lines dropped, and retention days as a number', () => {
      const edited: SettingsForm = {
        ...baseSavedForm,
        chatQuickRepliesDispatch: '  First reply  \n\n  Second reply  \n',
        chatQuickRepliesCourier: 'Courier reply 1\nCourier reply 2',
        chatRetentionDays: '60',
      }
      const changes = pendingChanges(baseSavedForm, edited)
      const payload = savePayload(changes, edited, savedDetails)

      expect(payload.chatQuickRepliesDispatch).toEqual(['First reply', 'Second reply'])
      expect(payload.chatQuickRepliesCourier).toEqual(['Courier reply 1', 'Courier reply 2'])
      expect(payload.chatRetentionDays).toBe(60)
      expect(typeof payload.chatRetentionDays).toBe('number')
      expect(payload).not.toHaveProperty('details')
    })

    it('InstanceConfigSettingsAdminInputToJSON and InstanceConfigSettingsDtoFromJSON carry all three chat keys', () => {
      const input = {
        chatQuickRepliesDispatch: ['Dispatch reply 1'],
        chatQuickRepliesCourier: ['Courier reply 1'],
        chatRetentionDays: 90,
      }
      const serialized = InstanceConfigSettingsAdminInputToJSON(input as any)
      expect(serialized.chatQuickRepliesDispatch).toEqual(['Dispatch reply 1'])
      expect(serialized.chatQuickRepliesCourier).toEqual(['Courier reply 1'])
      expect(serialized.chatRetentionDays).toBe(90)

      const dtoData = {
        chatQuickRepliesDispatch: ['Preset A', 'Preset B'],
        chatQuickRepliesCourier: ['Rider Preset'],
        chatRetentionDays: 45,
      }
      const deserialized = InstanceConfigSettingsDtoFromJSON(dtoData)
      expect(deserialized.chatQuickRepliesDispatch).toEqual(['Preset A', 'Preset B'])
      expect(deserialized.chatQuickRepliesCourier).toEqual(['Rider Preset'])
      expect(deserialized.chatRetentionDays).toBe(45)
    })
  })

  describe('Review requests settings (spec 0038, AC-3, AC-7, AC-13)', () => {
    const savedDetails = { name: 'Volos Couriers', region: { type: 'FeatureCollection', features: [] } }

    it('declares reviewAnswerDays and reviewCorrectionMaxCents in SETTINGS with kind number and correct labels', () => {
      const answerDays = SETTINGS.find((s) => s.key === 'reviewAnswerDays')
      expect(answerDays).toBeDefined()
      expect(answerDays?.kind).toBe('number')
      expect(answerDays?.label).toBe('Days to answer a review request')

      const maxCents = SETTINGS.find((s) => s.key === 'reviewCorrectionMaxCents')
      expect(maxCents).toBeDefined()
      expect(maxCents?.kind).toBe('number')
      expect(maxCents?.label).toBe('Largest review pay correction (cents)')
    })

    it('formFromSettings converts reviewAnswerDays and reviewCorrectionMaxCents numbers to strings', () => {
      const form = formFromSettings({
        reviewAnswerDays: 7,
        reviewCorrectionMaxCents: 10000,
      })
      expect(form.reviewAnswerDays).toBe('7')
      expect(form.reviewCorrectionMaxCents).toBe('10000')

      const empty = formFromSettings({})
      expect(empty.reviewAnswerDays).toBe('')
      expect(empty.reviewCorrectionMaxCents).toBe('')
    })

    it('pendingChanges detects edits to reviewAnswerDays and reviewCorrectionMaxCents', () => {
      const edited: SettingsForm = {
        ...baseSavedForm,
        reviewAnswerDays: '7',
        reviewCorrectionMaxCents: '10000',
      }
      const changes = pendingChanges(baseSavedForm, edited)
      const keys = changes.map((c) => c.key)

      expect(keys).toContain('reviewAnswerDays')
      expect(keys).toContain('reviewCorrectionMaxCents')

      const daysChange = changes.find((c) => c.key === 'reviewAnswerDays')
      expect(daysChange?.from).toBe('14')
      expect(daysChange?.to).toBe('7')

      const centsChange = changes.find((c) => c.key === 'reviewCorrectionMaxCents')
      expect(centsChange?.from).toBe('5000')
      expect(centsChange?.to).toBe('10000')
    })

    it('blockers blocks save when reviewAnswerDays or reviewCorrectionMaxCents is emptied', () => {
      const edited: SettingsForm = {
        ...baseSavedForm,
        reviewAnswerDays: '',
        reviewCorrectionMaxCents: '',
      }
      const changes = pendingChanges(baseSavedForm, edited)
      const errors = blockers(changes, edited)

      expect(errors).toContain('Days to answer a review request is empty')
      expect(errors).toContain('Largest review pay correction (cents) is empty')
    })

    it('savePayload sends reviewAnswerDays and reviewCorrectionMaxCents as numbers', () => {
      const edited: SettingsForm = {
        ...baseSavedForm,
        reviewAnswerDays: '10',
        reviewCorrectionMaxCents: '7500',
      }
      const changes = pendingChanges(baseSavedForm, edited)
      const payload = savePayload(changes, edited, savedDetails)

      expect(payload.reviewAnswerDays).toBe(10)
      expect(typeof payload.reviewAnswerDays).toBe('number')
      expect(payload.reviewCorrectionMaxCents).toBe(7500)
      expect(typeof payload.reviewCorrectionMaxCents).toBe('number')
    })

    it('successMessage appends respective review sentence when review settings change', () => {
      const daysChange = [{ key: 'reviewAnswerDays' as const, label: 'Days to answer a review request', from: '14', to: '7' }]
      expect(successMessage(daysChange)).toContain(
        'New review requests get the new answer period; requests already sent keep their date.'
      )

      const centsChange = [{ key: 'reviewCorrectionMaxCents' as const, label: 'Largest review pay correction (cents)', from: '5000', to: '10000' }]
      expect(successMessage(centsChange)).toContain(
        'The new limit applies to the next answer with a pay correction.'
      )
    })

    it('InstanceConfigSettingsAdminInputToJSON serializes reviewAnswerDays and reviewCorrectionMaxCents (AC-3, AC-13)', () => {
      const input = {
        reviewAnswerDays: 7,
        reviewCorrectionMaxCents: 5000,
      }
      const serialized = InstanceConfigSettingsAdminInputToJSON(input as any)
      expect(serialized.reviewAnswerDays).toBe(7)
      expect(serialized.reviewCorrectionMaxCents).toBe(5000)
    })

    it('InstanceConfigSettingsDtoFromJSON deserializes reviewAnswerDays and reviewCorrectionMaxCents (AC-3, AC-13)', () => {
      const dto = {
        reviewAnswerDays: 14,
        reviewCorrectionMaxCents: 10000,
      }
      const deserialized = InstanceConfigSettingsDtoFromJSON(dto)
      expect(deserialized.reviewAnswerDays).toBe(14)
      expect(deserialized.reviewCorrectionMaxCents).toBe(10000)
    })
  })

  // ---------------------------------------------------------------------------
  // Time worked setting (spec 0040, AC-17, AC-9)
  // ---------------------------------------------------------------------------
  describe('shiftBreakMinutes setting (spec 0040, AC-17, AC-9)', () => {
    const savedDetails = { name: 'Volos Couriers', region: { type: 'FeatureCollection', features: [] } }

    it('defines shiftBreakMinutes in SETTINGS as a number with its label', () => {
      const definition = SETTINGS.find((s) => s.key === 'shiftBreakMinutes')
      expect(definition).toBeDefined()
      expect(definition?.kind).toBe('number')
      expect(definition?.label).toBe('Longest break inside a worked shift, in minutes')
      expect(definition?.details).toBeUndefined()
    })

    it('formFromSettings populates shiftBreakMinutes from data and falls back to empty string', () => {
      const form1 = formFromSettings({ shiftBreakMinutes: 30 })
      expect(form1.shiftBreakMinutes).toBe('30')

      const form2 = formFromSettings({ shiftBreakMinutes: null })
      expect(form2.shiftBreakMinutes).toBe('')

      const form3 = formFromSettings({})
      expect(form3.shiftBreakMinutes).toBe('')
    })

    it('blocks saving when shiftBreakMinutes is empty string', () => {
      const edited: SettingsForm = {
        ...baseSavedForm,
        shiftBreakMinutes: '',
      }
      const changes = pendingChanges(baseSavedForm, edited)
      const found = blockers(changes, edited)
      expect(found).toContain('Longest break inside a worked shift, in minutes is empty')
    })

    it('savePayload converts shiftBreakMinutes to a Number', () => {
      const edited: SettingsForm = {
        ...baseSavedForm,
        shiftBreakMinutes: '45',
      }
      const changes = pendingChanges(baseSavedForm, edited)
      const payload = savePayload(changes, edited, savedDetails)

      expect(payload.shiftBreakMinutes).toBe(45)
      expect(typeof payload.shiftBreakMinutes).toBe('number')
    })

    it('successMessage indicates past shifts are worked out again when shiftBreakMinutes changes', () => {
      const change = [
        {
          key: 'shiftBreakMinutes' as const,
          label: 'Longest break inside a worked shift, in minutes',
          from: '30',
          to: '45',
        },
      ]
      const msg = successMessage(change)
      expect(msg).toContain(
        "Every rider's time worked, past shifts included, is worked out again with the new break length."
      )
    })

    it('InstanceConfigSettingsAdminInputToJSON preserves shiftBreakMinutes', () => {
      const input = {
        shiftBreakMinutes: 30,
      }
      const serialized = InstanceConfigSettingsAdminInputToJSON(input as any)
      expect(serialized.shiftBreakMinutes).toBe(30)
    })

    it('InstanceConfigSettingsDtoFromJSON deserializes shiftBreakMinutes and falls back to null when absent', () => {
      const dtoWith = { shiftBreakMinutes: 45 }
      const deserialized1 = InstanceConfigSettingsDtoFromJSON(dtoWith)
      expect(deserialized1.shiftBreakMinutes).toBe(45)

      const dtoWithout = {}
      const deserialized2 = InstanceConfigSettingsDtoFromJSON(dtoWithout)
      expect(deserialized2.shiftBreakMinutes).toBeNull()
    })
  })

  // ---------------------------------------------------------------------------
  // Fee ceiling setting (spec 0041, row 53, AC-1, AC-8)
  // ---------------------------------------------------------------------------
  describe('feePercentageCeiling setting (spec 0041, row 53, AC-1, AC-8)', () => {
    const savedDetails = { name: 'Volos Couriers', region: { type: 'FeatureCollection', features: [] } }

    it('declares feePercentageCeiling in SETTINGS as a number with correct label', () => {
      const setting = SETTINGS.find((s) => s.key === 'feePercentageCeiling')
      expect(setting).toBeDefined()
      expect(setting?.kind).toBe('number')
      expect(setting?.label).toBe('Co-op fee ceiling (%)')
      expect(labelOf('feePercentageCeiling')).toBe('Co-op fee ceiling (%)')
    })

    it('formFromSettings turns 25 into "25", and handles 0, null, missing as empty string', () => {
      expect(formFromSettings({ feePercentageCeiling: 25 }).feePercentageCeiling).toBe('25')
      expect(formFromSettings({ feePercentageCeiling: 0 }).feePercentageCeiling).toBe('0')
      expect(formFromSettings({ feePercentageCeiling: null }).feePercentageCeiling).toBe('')
      expect(formFromSettings({}).feePercentageCeiling).toBe('')
      expect(EMPTY_FORM.feePercentageCeiling).toBe('')
    })

    it('pendingChanges detects edits to feePercentageCeiling', () => {
      const edited: SettingsForm = { ...baseSavedForm, feePercentageCeiling: '30' }
      const changes = pendingChanges(baseSavedForm, edited)
      expect(changes).toHaveLength(1)
      expect(changes[0]?.key).toBe('feePercentageCeiling')
      expect(changes[0]?.from).toBe('25')
      expect(changes[0]?.to).toBe('30')
      expect(changes[0]?.label).toBe('Co-op fee ceiling (%)')
    })

    it('savePayload sends feePercentageCeiling as number 25 when changed', () => {
      const edited: SettingsForm = { ...baseSavedForm, feePercentageCeiling: '25' }
      const savedDifferent: SettingsForm = { ...baseSavedForm, feePercentageCeiling: '20' }
      const changes = pendingChanges(savedDifferent, edited)
      const payload = savePayload(changes, edited, savedDetails)
      expect(payload).toEqual({ feePercentageCeiling: 25 })
      expect(typeof payload.feePercentageCeiling).toBe('number')
      expect(payload).not.toHaveProperty('details')

      // Also verify 0 sends as number 0
      const editedZero: SettingsForm = { ...baseSavedForm, feePercentageCeiling: '0', feePercentageAmount: '0' }
      const changesZero = pendingChanges(baseSavedForm, editedZero)
      const payloadZero = savePayload(changesZero, editedZero, savedDetails)
      expect(payloadZero.feePercentageCeiling).toBe(0)
      expect(payloadZero.feePercentageAmount).toBe(0)
    })

    it('blockers blocks save when feePercentageCeiling is emptied', () => {
      const edited: SettingsForm = { ...baseSavedForm, feePercentageCeiling: '' }
      const changes = pendingChanges(baseSavedForm, edited)
      expect(blockers(changes, edited)).toContain('Co-op fee ceiling (%) is empty')
    })

    it('feeAboveCeiling returns null for valid fee/ceiling pairs and empty fields, and returns numbers when above', () => {
      // Fee below ceiling (10 / 25)
      expect(feeAboveCeiling({ feePercentageAmount: '10', feePercentageCeiling: '25' })).toBeNull()
      // Fee equal to ceiling (25 / 25)
      expect(feeAboveCeiling({ feePercentageAmount: '25', feePercentageCeiling: '25' })).toBeNull()
      // Fee 0 with any ceiling
      expect(feeAboveCeiling({ feePercentageAmount: '0', feePercentageCeiling: '25' })).toBeNull()
      expect(feeAboveCeiling({ feePercentageAmount: '0', feePercentageCeiling: '0' })).toBeNull()
      // Empty fee
      expect(feeAboveCeiling({ feePercentageAmount: '', feePercentageCeiling: '25' })).toBeNull()
      // Empty ceiling
      expect(feeAboveCeiling({ feePercentageAmount: '10', feePercentageCeiling: '' })).toBeNull()
      // Fee above ceiling (100 / 25)
      expect(feeAboveCeiling({ feePercentageAmount: '100', feePercentageCeiling: '25' })).toEqual({
        fee: 100,
        ceiling: 25,
      })
    })

    it('blockers holds error when fee is changed above ceiling', () => {
      const edited: SettingsForm = { ...baseSavedForm, feePercentageAmount: '100', feePercentageCeiling: '25' }
      const changes = pendingChanges(baseSavedForm, edited)
      expect(blockers(changes, edited)).toContain(
        "Co-op fee (%) is 100, above the co-op's ceiling of 25 %"
      )
    })

    it('blockers holds error when only ceiling is changed below current fee', () => {
      // Base saved fee is 10; lowering ceiling to 5 creates a blocker
      const edited: SettingsForm = { ...baseSavedForm, feePercentageAmount: '10', feePercentageCeiling: '5' }
      const changes = pendingChanges(baseSavedForm, edited)
      expect(blockers(changes, edited)).toContain(
        "Co-op fee (%) is 10, above the co-op's ceiling of 5 %"
      )
    })

    it('feeAboveCeiling returns null for non-numeric text and handles fractions (spec 0041, AC-8)', () => {
      // Non-numeric text returns null ({ fee: 'abc', ceiling: '25' } -> null)
      expect(feeAboveCeiling({ feePercentageAmount: 'abc', feePercentageCeiling: '25' })).toBeNull()
      expect(feeAboveCeiling({ feePercentageAmount: '25', feePercentageCeiling: 'abc' })).toBeNull()

      // Fractions ('25.5' against '25' -> { fee: 25.5, ceiling: 25 })
      expect(feeAboveCeiling({ feePercentageAmount: '25.5', feePercentageCeiling: '25' })).toEqual({
        fee: 25.5,
        ceiling: 25,
      })

      // Fractions ('25' against '25.5' -> null)
      expect(feeAboveCeiling({ feePercentageAmount: '25', feePercentageCeiling: '25.5' })).toBeNull()
    })

    it('blockers holds error when fee is a fraction above ceiling', () => {
      const edited: SettingsForm = { ...baseSavedForm, feePercentageAmount: '25.5', feePercentageCeiling: '25' }
      const changes = pendingChanges(baseSavedForm, edited)
      expect(blockers(changes, edited)).toContain(
        "Co-op fee (%) is 25.5, above the co-op's ceiling of 25 %"
      )
    })

    it('blockers([]) holds no ceiling sentence when stored fee 30 exceeds ceiling 25 and nothing changed; blocker appears once fee changed (decision 53.3)', () => {
      const stored: SettingsForm = { ...baseSavedForm, feePercentageAmount: '30', feePercentageCeiling: '25' }
      expect(blockers([], stored).some((msg) => msg.includes("above the co-op's ceiling"))).toBe(false)

      const edited: SettingsForm = { ...stored, feePercentageAmount: '35' }
      const changes = pendingChanges(stored, edited)
      expect(blockers(changes, edited)).toContain(
        "Co-op fee (%) is 35, above the co-op's ceiling of 25 %"
      )
    })

    it('blockers gives no ceiling blocker when fee is equal to ceiling', () => {
      const edited: SettingsForm = { ...baseSavedForm, feePercentageAmount: '25', feePercentageCeiling: '25' }
      const changes = pendingChanges(baseSavedForm, edited)
      const res = blockers(changes, edited)
      expect(res.some((msg) => msg.includes("above the co-op's ceiling"))).toBe(false)
    })

    it('blockers gives no ceiling blocker when a field is empty or neither changed', () => {
      // Empty fee
      const editedEmptyFee: SettingsForm = { ...baseSavedForm, feePercentageAmount: '' }
      const changesEmptyFee = pendingChanges(baseSavedForm, editedEmptyFee)
      const resEmptyFee = blockers(changesEmptyFee, editedEmptyFee)
      expect(resEmptyFee.some((msg) => msg.includes("above the co-op's ceiling"))).toBe(false)

      // Empty ceiling
      const editedEmptyCeiling: SettingsForm = { ...baseSavedForm, feePercentageCeiling: '' }
      const changesEmptyCeiling = pendingChanges(baseSavedForm, editedEmptyCeiling)
      const resEmptyCeiling = blockers(changesEmptyCeiling, editedEmptyCeiling)
      expect(resEmptyCeiling.some((msg) => msg.includes("above the co-op's ceiling"))).toBe(false)

      // Neither fee nor ceiling changed, even if edited values hypothetically had fee > ceiling
      const nonFeeChanges = [{ key: 'quoteBaseFee' as const, label: 'Base fee', from: '€2.00', to: '€2.50' }]
      const editedNonFee: SettingsForm = { ...baseSavedForm, feePercentageAmount: '100', feePercentageCeiling: '25' }
      const resNonFee = blockers(nonFeeChanges as any, editedNonFee)
      expect(resNonFee.some((msg) => msg.includes("above the co-op's ceiling"))).toBe(false)
    })

    it('InstanceConfigSettingsAdminInputToJSON and InstanceConfigSettingsDtoFromJSON carry feePercentageCeiling (spec 0041, AC-1)', () => {
      const serialized = InstanceConfigSettingsAdminInputToJSON({ feePercentageCeiling: 25 } as any)
      expect(serialized.feePercentageCeiling).toBe(25)

      const deserialized = InstanceConfigSettingsDtoFromJSON({ feePercentageCeiling: 25 })
      expect(deserialized.feePercentageCeiling).toBe(25)
    })
  })

  describe('Box model settings (spec 0043, AC-2, AC-8)', () => {
    const savedDetails = {
      name: 'Volos Courier Co-op',
      link: 'https://volos.courier.coop',
      websocketLink: 'wss://volos.courier.coop/ws',
      imageUrl: 'https://volos.courier.coop/logo.png',
      region: null,
    }

    it('boxUnitsOutOfOrder catches Small above Medium and Medium above Large', () => {
      expect(
        boxUnitsOutOfOrder({ boxUnitsSmall: '60', boxUnitsMedium: '50', boxUnitsLarge: '100' })
      ).toBe('Small (60 units) cannot take more room than Medium (50 units)')

      expect(
        boxUnitsOutOfOrder({ boxUnitsSmall: '30', boxUnitsMedium: '120', boxUnitsLarge: '100' })
      ).toBe('Medium (120 units) cannot take more room than Large (100 units)')

      expect(
        boxUnitsOutOfOrder({ boxUnitsSmall: '30', boxUnitsMedium: '50', boxUnitsLarge: '100' })
      ).toBeNull()

      // Equal values are allowed
      expect(
        boxUnitsOutOfOrder({ boxUnitsSmall: '50', boxUnitsMedium: '50', boxUnitsLarge: '100' })
      ).toBeNull()
    })

    it('blockers refuses Small above Medium and Medium above Large on the values the save would leave (one changed, the others saved)', () => {
      // Small changed to 60, Medium saved is 50, Large saved is 100
      const editedSmall: SettingsForm = {
        ...baseSavedForm,
        boxUnitsSmall: '60',
      }
      const changesSmall = pendingChanges(baseSavedForm, editedSmall)
      expect(changesSmall).toHaveLength(1)
      expect(changesSmall[0]?.key).toBe('boxUnitsSmall')
      expect(blockers(changesSmall, editedSmall)).toContain(
        'Small (60 units) cannot take more room than Medium (50 units)'
      )

      // Medium changed to 120, Small saved is 30, Large saved is 100
      const editedMedium: SettingsForm = {
        ...baseSavedForm,
        boxUnitsMedium: '120',
      }
      const changesMedium = pendingChanges(baseSavedForm, editedMedium)
      expect(changesMedium).toHaveLength(1)
      expect(changesMedium[0]?.key).toBe('boxUnitsMedium')
      expect(blockers(changesMedium, editedMedium)).toContain(
        'Medium (120 units) cannot take more room than Large (100 units)'
      )

      // Large changed to 40, Small saved is 30, Medium saved is 50
      const editedLarge: SettingsForm = {
        ...baseSavedForm,
        boxUnitsLarge: '40',
      }
      const changesLarge = pendingChanges(baseSavedForm, editedLarge)
      expect(changesLarge).toHaveLength(1)
      expect(changesLarge[0]?.key).toBe('boxUnitsLarge')
      expect(blockers(changesLarge, editedLarge)).toContain(
        'Medium (50 units) cannot take more room than Large (40 units)'
      )
    })

    it('blockers says nothing about box order when none of the three changed', () => {
      // Even if form hypothetically has Small > Medium, if none of the three changed,
      // no box order blocker is emitted.
      const changesNonBox = [{ key: 'quoteBaseFee' as const, label: 'Base fee', from: '€2.00', to: '€2.50' }]
      const editedNonBox: SettingsForm = {
        ...baseSavedForm,
        quoteBaseFee: '250',
        boxUnitsSmall: '80',
        boxUnitsMedium: '50',
        boxUnitsLarge: '100',
      }
      const res = blockers(changesNonBox as any, editedNonBox)
      expect(res.some((msg) => msg.includes('cannot take more room'))).toBe(false)
    })

    it('savePayload sends the numbers as numbers and boxDefaultSize as text', () => {
      const edited: SettingsForm = {
        ...baseSavedForm,
        boxUnitsSmall: '30',
        boxUnitsMedium: '50',
        boxUnitsLarge: '100',
        boxDefaultSize: 'MEDIUM',
      }
      const changes = [
        { key: 'boxUnitsSmall' as const, label: 'Box units a Small order takes', from: '25', to: '30' },
        { key: 'boxUnitsMedium' as const, label: 'Box units a Medium order takes', from: '45', to: '50' },
        { key: 'boxUnitsLarge' as const, label: 'Box units a Large order takes', from: '90', to: '100' },
        { key: 'boxDefaultSize' as const, label: 'Size of an order sent with none', from: 'SMALL', to: 'MEDIUM' },
      ]

      const payload = savePayload(changes, edited, savedDetails)

      expect(payload.boxUnitsSmall).toBe(30)
      expect(typeof payload.boxUnitsSmall).toBe('number')

      expect(payload.boxUnitsMedium).toBe(50)
      expect(typeof payload.boxUnitsMedium).toBe('number')

      expect(payload.boxUnitsLarge).toBe(100)
      expect(typeof payload.boxUnitsLarge).toBe('number')

      expect(payload.boxDefaultSize).toBe('MEDIUM')
      expect(typeof payload.boxDefaultSize).toBe('string')
    })
  })

  describe('Address notes settings (spec 0053, AC-6)', () => {
    it('declares addressNoteRetentionDays in SETTINGS with kind number and label', () => {
      const setting = SETTINGS.find((s) => s.key === 'addressNoteRetentionDays')
      expect(setting).toBeDefined()
      expect(setting?.kind).toBe('number')
      expect(setting?.label).toBe('Address notes kept without an upvote (days)')
    })

    it('formFromSettings converts addressNoteRetentionDays to string and does not read chatRetentionDays', () => {
      // Differing fixture values (182 vs 90) guard against reading chatRetentionDays into addressNoteRetentionDays
      const backendData = {
        addressNoteRetentionDays: 182,
        chatRetentionDays: 90,
      }
      const form = formFromSettings(backendData)
      expect(form.addressNoteRetentionDays).toBe('182')
      expect(form.chatRetentionDays).toBe('90')

      const empty = formFromSettings({})
      expect(empty.addressNoteRetentionDays).toBe('')
      expect(EMPTY_FORM.addressNoteRetentionDays).toBe('')
    })
  })

  describe('Two orders at once settings (spec 0048, row 80, AC-1)', () => {
    it('declares stackingEnabled, twoOrderPolicy, and twoOrderDelayLimitMinutes in SETTINGS with expected kinds and labels', () => {
      const stacking = SETTINGS.find((s) => s.key === 'stackingEnabled')
      expect(stacking).toBeDefined()
      expect(stacking?.kind).toBe('switch')
      expect(stacking?.label).toBe('Two orders offered together')

      const policy = SETTINGS.find((s) => s.key === 'twoOrderPolicy')
      expect(policy).toBeDefined()
      expect(policy?.kind).toBe('select')
      expect(policy?.label).toBe('When two orders may go together')

      const delay = SETTINGS.find((s) => s.key === 'twoOrderDelayLimitMinutes')
      expect(delay).toBeDefined()
      expect(delay?.kind).toBe('number')
      expect(delay?.label).toBe('Most minutes a pair may delay a customer')
    })

    it('formFromSettings maps stacking fields from backend data, with null and empty string fallbacks', () => {
      const backendData = {
        stackingEnabled: true,
        twoOrderPolicy: 'WHENEVER_FITS',
        twoOrderDelayLimitMinutes: 15,
      }
      const form = formFromSettings(backendData)
      expect(form.stackingEnabled).toBe(true)
      expect(form.twoOrderPolicy).toBe('WHENEVER_FITS')
      expect(form.twoOrderDelayLimitMinutes).toBe('15')

      const empty = formFromSettings({})
      expect(empty.stackingEnabled).toBeNull()
      expect(empty.twoOrderPolicy).toBe('')
      expect(empty.twoOrderDelayLimitMinutes).toBe('')
      expect(EMPTY_FORM.stackingEnabled).toBeNull()
      expect(EMPTY_FORM.twoOrderPolicy).toBe('')
      expect(EMPTY_FORM.twoOrderDelayLimitMinutes).toBe('')
    })

    it('pendingChanges tracks changes to stacking settings', () => {
      const edited: SettingsForm = {
        ...baseSavedForm,
        stackingEnabled: true,
        twoOrderPolicy: 'WHENEVER_FITS',
        twoOrderDelayLimitMinutes: '20',
      }
      const changes = pendingChanges(baseSavedForm, edited)
      const keys = changes.map((c) => c.key)
      expect(keys).toContain('stackingEnabled')
      expect(keys).toContain('twoOrderPolicy')
      expect(keys).toContain('twoOrderDelayLimitMinutes')

      const stackingChange = changes.find((c) => c.key === 'stackingEnabled')
      expect(stackingChange?.from).toBe('Off')
      expect(stackingChange?.to).toBe('On')

      const policyChange = changes.find((c) => c.key === 'twoOrderPolicy')
      expect(policyChange?.from).toBe('SHORTAGE_ONLY')
      expect(policyChange?.to).toBe('WHENEVER_FITS')

      const delayChange = changes.find((c) => c.key === 'twoOrderDelayLimitMinutes')
      expect(delayChange?.from).toBe('10')
      expect(delayChange?.to).toBe('20')
    })

    it('savePayload converts twoOrderDelayLimitMinutes to number (including 0) and preserves boolean and string types', () => {
      const edited: SettingsForm = {
        ...baseSavedForm,
        stackingEnabled: true,
        twoOrderPolicy: 'WHENEVER_FITS',
        twoOrderDelayLimitMinutes: '0',
      }
      const savedDetails = { name: 'Volos' }
      const changes = pendingChanges(baseSavedForm, edited)
      const payload = savePayload(changes, edited, savedDetails)

      expect(payload.stackingEnabled).toBe(true)
      expect(typeof payload.stackingEnabled).toBe('boolean')
      expect(payload.twoOrderPolicy).toBe('WHENEVER_FITS')
      expect(typeof payload.twoOrderPolicy).toBe('string')
      expect(payload.twoOrderDelayLimitMinutes).toBe(0)
      expect(typeof payload.twoOrderDelayLimitMinutes).toBe('number')
    })

    it('formFromSettings and savePayload handle boundary and out-of-range delay limit values (spec 0048, row 80, AC-1)', () => {
      // Out-of-range backend values (< 0, > 30, floats) are mapped to strings by formFromSettings
      const backendNegative = { twoOrderDelayLimitMinutes: -5 }
      expect(formFromSettings(backendNegative).twoOrderDelayLimitMinutes).toBe('-5')

      const backendAboveMax = { twoOrderDelayLimitMinutes: 35 }
      expect(formFromSettings(backendAboveMax).twoOrderDelayLimitMinutes).toBe('35')

      const backendFloat = { twoOrderDelayLimitMinutes: 12.5 }
      expect(formFromSettings(backendFloat).twoOrderDelayLimitMinutes).toBe('12.5')

      const backendMax = { twoOrderDelayLimitMinutes: 30 }
      expect(formFromSettings(backendMax).twoOrderDelayLimitMinutes).toBe('30')

      // Out-of-range edited values are converted to numbers by savePayload
      const savedDetails = { name: 'Volos' }
      const editedNegative: SettingsForm = { ...baseSavedForm, twoOrderDelayLimitMinutes: '-5' }
      const payloadNeg = savePayload(pendingChanges(baseSavedForm, editedNegative), editedNegative, savedDetails)
      expect(payloadNeg.twoOrderDelayLimitMinutes).toBe(-5)

      const editedAboveMax: SettingsForm = { ...baseSavedForm, twoOrderDelayLimitMinutes: '35' }
      const payloadAbove = savePayload(pendingChanges(baseSavedForm, editedAboveMax), editedAboveMax, savedDetails)
      expect(payloadAbove.twoOrderDelayLimitMinutes).toBe(35)

      const editedFloat: SettingsForm = { ...baseSavedForm, twoOrderDelayLimitMinutes: '12.5' }
      const payloadFloat = savePayload(pendingChanges(baseSavedForm, editedFloat), editedFloat, savedDetails)
      expect(payloadFloat.twoOrderDelayLimitMinutes).toBe(12.5)
    })

    it('blockers rejects empty or whitespace twoOrderDelayLimitMinutes and accepts valid numbers (spec 0048, row 80, AC-1)', () => {
      // Empty delay limit is rejected
      const editedEmpty: SettingsForm = { ...baseSavedForm, twoOrderDelayLimitMinutes: '' }
      const changesEmpty = pendingChanges(baseSavedForm, editedEmpty)
      expect(blockers(changesEmpty, editedEmpty)).toContain('Most minutes a pair may delay a customer is empty')

      // Whitespace delay limit is rejected
      const editedWhitespace: SettingsForm = { ...baseSavedForm, twoOrderDelayLimitMinutes: '   ' }
      const changesWhitespace = pendingChanges(baseSavedForm, editedWhitespace)
      expect(blockers(changesWhitespace, editedWhitespace)).toContain('Most minutes a pair may delay a customer is empty')

      // Boundary values 0 and 30 are not rejected as empty
      const editedZero: SettingsForm = { ...baseSavedForm, twoOrderDelayLimitMinutes: '0' }
      const changesZero = pendingChanges(baseSavedForm, editedZero)
      expect(blockers(changesZero, editedZero)).not.toContain('Most minutes a pair may delay a customer is empty')

      const editedThirty: SettingsForm = { ...baseSavedForm, twoOrderDelayLimitMinutes: '30' }
      const changesThirty = pendingChanges(baseSavedForm, editedThirty)
      expect(blockers(changesThirty, editedThirty)).not.toContain('Most minutes a pair may delay a customer is empty')
    })

    it('successMessage appends two orders sentence when any stacking setting changes, and only once if all change', () => {
      const sentence =
        'Two orders together: applies to the next offer; offers already out and jobs already taken are unchanged.'

      expect(
        successMessage([{ key: 'stackingEnabled', label: 'Two orders offered together', from: 'Off', to: 'On' }] as any)
      ).toBe(`Saved: Two orders offered together. ${sentence}`)

      expect(
        successMessage([
          { key: 'twoOrderPolicy', label: 'When two orders may go together', from: 'SHORTAGE_ONLY', to: 'WHENEVER_FITS' },
        ] as any)
      ).toBe(`Saved: When two orders may go together. ${sentence}`)

      expect(
        successMessage([
          { key: 'twoOrderDelayLimitMinutes', label: 'Most minutes a pair may delay a customer', from: '10', to: '15' },
        ] as any)
      ).toBe(`Saved: Most minutes a pair may delay a customer. ${sentence}`)

      // Appended only once when all three change
      const allThree = [
        { key: 'stackingEnabled', label: 'Two orders offered together', from: 'Off', to: 'On' },
        { key: 'twoOrderPolicy', label: 'When two orders may go together', from: 'SHORTAGE_ONLY', to: 'WHENEVER_FITS' },
        { key: 'twoOrderDelayLimitMinutes', label: 'Most minutes a pair may delay a customer', from: '10', to: '15' },
      ]
      const msg = successMessage(allThree as any)
      const occurrences = msg.split(sentence).length - 1
      expect(occurrences).toBe(1)
    })

    it('formFromSettings maps addOnOffersEnabled and addOnMoment (spec 0048, row 81, AC-1)', () => {
      const fromBackend = {
        addOnOffersEnabled: true,
        addOnMoment: 'BEFORE_DROPOFF',
      }
      const form = formFromSettings(fromBackend)
      expect(form.addOnOffersEnabled).toBe(true)
      expect(form.addOnMoment).toBe('BEFORE_DROPOFF')

      const missing = formFromSettings({})
      expect(missing.addOnOffersEnabled).toBeNull()
      expect(missing.addOnMoment).toBe('')
    })

    it('pendingChanges detects changes to addOnOffersEnabled and addOnMoment (spec 0048, row 81, AC-1)', () => {
      const saved: SettingsForm = {
        ...baseSavedForm,
        addOnOffersEnabled: false,
        addOnMoment: 'BEFORE_PICKUP',
      }
      const edited: SettingsForm = {
        ...saved,
        addOnOffersEnabled: true,
        addOnMoment: 'SAME_RESTAURANT',
      }
      const changes = pendingChanges(saved, edited)
      expect(changes).toEqual([
        {
          key: 'addOnOffersEnabled',
          label: 'One more order offered while on a job',
          from: 'Off',
          to: 'On',
        },
        {
          key: 'addOnMoment',
          label: 'When one more order may be offered',
          from: 'BEFORE_PICKUP',
          to: 'SAME_RESTAURANT',
        },
      ])
    })

    it('savePayload includes addOnOffersEnabled and addOnMoment when changed (spec 0048, row 81, AC-1)', () => {
      const saved: SettingsForm = {
        ...baseSavedForm,
        addOnOffersEnabled: false,
        addOnMoment: 'BEFORE_PICKUP',
      }
      const edited: SettingsForm = {
        ...saved,
        addOnOffersEnabled: true,
        addOnMoment: 'BEFORE_DROPOFF',
      }
      const changes = pendingChanges(saved, edited)
      const savedDetails = { name: 'Volos' }
      const payload = savePayload(changes, edited, savedDetails)

      expect(payload.addOnOffersEnabled).toBe(true)
      expect(payload.addOnMoment).toBe('BEFORE_DROPOFF')
    })

    it('successMessage appends two orders sentence for addOnOffersEnabled and addOnMoment changes', () => {
      const addOnSentence =
        'One more order on a job: applies to the next offer; offers already out and jobs already taken are unchanged.'

      expect(
        successMessage([
          { key: 'addOnOffersEnabled', label: 'One more order offered while on a job', from: 'Off', to: 'On' },
        ] as any)
      ).toBe(`Saved: One more order offered while on a job. ${addOnSentence}`)

      expect(
        successMessage([
          {
            key: 'addOnMoment',
            label: 'When one more order may be offered',
            from: 'BEFORE_PICKUP',
            to: 'BEFORE_DROPOFF',
          },
        ] as any)
      ).toBe(`Saved: When one more order may be offered. ${addOnSentence}`)

      // Appended only once when all five two-order settings change, naming both
      const bothSentence =
        'Two orders together and one more order on a job: applies to the next offer; offers already out and jobs already taken are unchanged.'
      const allFive = [
        { key: 'stackingEnabled', label: 'Two orders offered together', from: 'Off', to: 'On' },
        { key: 'twoOrderPolicy', label: 'When two orders may go together', from: 'SHORTAGE_ONLY', to: 'WHENEVER_FITS' },
        { key: 'twoOrderDelayLimitMinutes', label: 'Most minutes a pair may delay a customer', from: '10', to: '15' },
        { key: 'addOnOffersEnabled', label: 'One more order offered while on a job', from: 'Off', to: 'On' },
        { key: 'addOnMoment', label: 'When one more order may be offered', from: 'BEFORE_PICKUP', to: 'BEFORE_DROPOFF' },
      ]
      const msg = successMessage(allFive as any)
      const occurrences = msg.split(bothSentence).length - 1
      expect(occurrences).toBe(1)
      expect(msg).toContain(bothSentence)
    })
  })
})
