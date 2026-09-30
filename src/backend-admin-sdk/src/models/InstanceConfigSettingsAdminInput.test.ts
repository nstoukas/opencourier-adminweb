import {
  InstanceConfigSettingsAdminInputFromJSON,
  InstanceConfigSettingsAdminInputToJSON,
} from './InstanceConfigSettingsAdminInput'
import {
  InstanceConfigSettingsDtoFromJSON,
  InstanceConfigSettingsDtoToJSON,
} from './InstanceConfigSettingsDto'

describe('InstanceConfigSettings SDK serialization guards', () => {
  describe('InstanceConfigSettingsAdminInput (request payload whitelist guard)', () => {
    it('preserves quoteRatePerDistanceUnit and reassignment payout fields in ToJSON serialization', () => {
      // Load-bearing test guard: InstanceConfigSettingsAdminInputToJSON must copy all three fields
      // so they are not silently dropped when building HTTP POST request bodies.
      const input = {
        quoteRatePerDistanceUnit: 150,
        reassignmentPayoutPolicies: { FULL_COMPENSATION: 100, HALF_COMPENSATION: 50 },
        reassignmentPayoutDefaultPolicy: 'FULL_COMPENSATION',
      }

      const json = InstanceConfigSettingsAdminInputToJSON(input)

      expect(json).toBeDefined()
      expect(json.quoteRatePerDistanceUnit).toBe(150)
      expect(json.reassignmentPayoutPolicies).toEqual({
        FULL_COMPENSATION: 100,
        HALF_COMPENSATION: 50,
      })
      expect(json.reassignmentPayoutDefaultPolicy).toBe('FULL_COMPENSATION')
    })

    it('round-trips quoteRatePerDistanceUnit and reassignment payout fields through FromJSON and ToJSON', () => {
      const originalJson = {
        quoteRatePerDistanceUnit: 200,
        reassignmentPayoutPolicies: { CUSTOM_POLICY: 75 },
        reassignmentPayoutDefaultPolicy: 'CUSTOM_POLICY',
      }

      const model = InstanceConfigSettingsAdminInputFromJSON(originalJson)
      expect(model.quoteRatePerDistanceUnit).toBe(200)
      expect(model.reassignmentPayoutPolicies).toEqual({ CUSTOM_POLICY: 75 })
      expect(model.reassignmentPayoutDefaultPolicy).toBe('CUSTOM_POLICY')

      const serialized = InstanceConfigSettingsAdminInputToJSON(model)
      expect(serialized.quoteRatePerDistanceUnit).toBe(200)
      expect(serialized.reassignmentPayoutPolicies).toEqual({ CUSTOM_POLICY: 75 })
      expect(serialized.reassignmentPayoutDefaultPolicy).toBe('CUSTOM_POLICY')
    })
  })

  describe('InstanceConfigSettingsDto (response deserialization guard)', () => {
    it('deserializes quoteRatePerDistanceUnit as 0 when backend sends 0', () => {
      const json = {
        courierMatcherType: 'NEAREST_COURIER',
        quoteCalculationType: 'BY_DISTANCE',
        geoCalculationType: 'HAVERSINE',
        deliveryDurationCalculationType: 'SIMPLE',
        courierCompensationCalculationType: 'FROM_QUOTE_FROM',
        defaultDietaryRestrictions: 'NONE',
        distanceUnit: 'KILOMETERS',
        currency: 'EUR',
        maxAssignmentDistance: 20,
        maxDriftDistance: 5,
        quoteExpirationMinutes: 15,
        feePercentageAmount: 10,
        quoteRatePerDistanceUnit: 0,
        defaultCourierPayRate: 250,
        defaultMinimumCourierPay: 250,
        defaultMaxWorkingHours: 8,
        details: {},
      }

      const dto = InstanceConfigSettingsDtoFromJSON(json)
      expect(dto.quoteRatePerDistanceUnit).toBe(0)
    })

    it('deserializes quoteRatePerDistanceUnit as null when key is absent in backend response', () => {
      // 0 and null must not collapse: absent key means "no row configured" while 0 is a 0-rate
      const json = {
        courierMatcherType: 'NEAREST_COURIER',
        quoteCalculationType: 'BY_DISTANCE',
        geoCalculationType: 'HAVERSINE',
        deliveryDurationCalculationType: 'SIMPLE',
        courierCompensationCalculationType: 'FROM_QUOTE_FROM',
        defaultDietaryRestrictions: 'NONE',
        distanceUnit: 'KILOMETERS',
        currency: 'EUR',
        maxAssignmentDistance: 20,
        maxDriftDistance: 5,
        quoteExpirationMinutes: 15,
        feePercentageAmount: 10,
        defaultCourierPayRate: 250,
        defaultMinimumCourierPay: 250,
        defaultMaxWorkingHours: 8,
        details: {},
      }

      const dto = InstanceConfigSettingsDtoFromJSON(json)
      expect(dto.quoteRatePerDistanceUnit).toBeNull()
    })

    it('serializes DTO carrying quoteRatePerDistanceUnit and reassignment fields back to JSON', () => {
      const dto = InstanceConfigSettingsDtoFromJSON({
        courierMatcherType: 'NEAREST_COURIER',
        quoteCalculationType: 'BY_DISTANCE',
        geoCalculationType: 'HAVERSINE',
        deliveryDurationCalculationType: 'SIMPLE',
        courierCompensationCalculationType: 'FROM_QUOTE_FROM',
        defaultDietaryRestrictions: 'NONE',
        distanceUnit: 'KILOMETERS',
        currency: 'EUR',
        maxAssignmentDistance: 20,
        maxDriftDistance: 5,
        quoteExpirationMinutes: 15,
        feePercentageAmount: 10,
        quoteRatePerDistanceUnit: 150,
        defaultCourierPayRate: 250,
        defaultMinimumCourierPay: 250,
        defaultMaxWorkingHours: 8,
        details: {},
        reassignmentPayoutPolicies: { FULL_COMPENSATION: 100 },
        reassignmentPayoutDefaultPolicy: 'FULL_COMPENSATION',
      })

      const json = InstanceConfigSettingsDtoToJSON(dto)
      expect(json.quoteRatePerDistanceUnit).toBe(150)
      expect(json.reassignmentPayoutPolicies).toEqual({ FULL_COMPENSATION: 100 })
      expect(json.reassignmentPayoutDefaultPolicy).toBe('FULL_COMPENSATION')
    })
  })
})
