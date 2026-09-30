import {
  InstanceConfigSettingsAdminInputFromJSON,
  InstanceConfigSettingsAdminInputToJSON,
} from './InstanceConfigSettingsAdminInput'
import {
  InstanceConfigSettingsDtoFromJSON,
  InstanceConfigSettingsDtoToJSON,
} from './InstanceConfigSettingsDto'
import {
  DeliveryAdminDtoFromJSON,
  DeliveryAdminDtoToJSON,
} from './DeliveryAdminDto'

describe('InstanceConfigSettings SDK serialization guards', () => {
  describe('InstanceConfigSettingsAdminInput (request payload whitelist guard - AC-5)', () => {
    it('preserves quoteRatePerDistanceUnit, quoteBaseFee, and reassignment payout fields in ToJSON serialization', () => {
      // Load-bearing test guard: InstanceConfigSettingsAdminInputToJSON must copy these fields
      // so they are not silently dropped when building HTTP POST request bodies.
      const input = {
        quoteRatePerDistanceUnit: 150,
        quoteBaseFee: 200,
        reassignmentPayoutPolicies: { FULL_COMPENSATION: 100, HALF_COMPENSATION: 50 },
        reassignmentPayoutDefaultPolicy: 'FULL_COMPENSATION',
      }

      const json = InstanceConfigSettingsAdminInputToJSON(input)

      expect(json).toBeDefined()
      expect(json.quoteRatePerDistanceUnit).toBe(150)
      expect(json.quoteBaseFee).toBe(200)
      expect(json.reassignmentPayoutPolicies).toEqual({
        FULL_COMPENSATION: 100,
        HALF_COMPENSATION: 50,
      })
      expect(json.reassignmentPayoutDefaultPolicy).toBe('FULL_COMPENSATION')
    })

    it('carries quoteBaseFee (0 stays 0) and does not serialize defaultMinimumCourierPay (AC-5)', () => {
      const inputWithZero = {
        quoteBaseFee: 0,
      } as any

      const json = InstanceConfigSettingsAdminInputToJSON(inputWithZero)
      expect(json.quoteBaseFee).toBe(0)
      expect(json).not.toHaveProperty('defaultMinimumCourierPay')
    })

    it('round-trips quoteRatePerDistanceUnit and quoteBaseFee through FromJSON and ToJSON', () => {
      const originalJson = {
        quoteRatePerDistanceUnit: 200,
        quoteBaseFee: 200,
        reassignmentPayoutPolicies: { CUSTOM_POLICY: 75 },
        reassignmentPayoutDefaultPolicy: 'CUSTOM_POLICY',
      }

      const model = InstanceConfigSettingsAdminInputFromJSON(originalJson)
      expect(model.quoteRatePerDistanceUnit).toBe(200)
      expect(model.quoteBaseFee).toBe(200)
      expect(model.reassignmentPayoutPolicies).toEqual({ CUSTOM_POLICY: 75 })
      expect(model.reassignmentPayoutDefaultPolicy).toBe('CUSTOM_POLICY')

      const serialized = InstanceConfigSettingsAdminInputToJSON(model)
      expect(serialized.quoteRatePerDistanceUnit).toBe(200)
      expect(serialized.quoteBaseFee).toBe(200)
      expect(serialized.reassignmentPayoutPolicies).toEqual({ CUSTOM_POLICY: 75 })
      expect(serialized.reassignmentPayoutDefaultPolicy).toBe('CUSTOM_POLICY')
      expect(serialized).not.toHaveProperty('defaultMinimumCourierPay')
    })
  })

  describe('InstanceConfigSettingsDto (response deserialization guard - AC-5)', () => {
    it('deserializes quoteBaseFee as 0 when backend sends 0 (AC-5)', () => {
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
        quoteBaseFee: 0,
        defaultCourierPayRate: 250,
        defaultMaxWorkingHours: 8,
        details: {},
      }

      const dto = InstanceConfigSettingsDtoFromJSON(json)
      expect(dto.quoteBaseFee).toBe(0)
      expect(dto).not.toHaveProperty('defaultMinimumCourierPay')
    })

    it('deserializes quoteBaseFee as null when key is absent in backend response', () => {
      // 0 and null must not collapse: absent key means "no row configured" while 0 is a 0 base fee
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
        defaultMaxWorkingHours: 8,
        details: {},
      }

      const dto = InstanceConfigSettingsDtoFromJSON(json)
      expect(dto.quoteBaseFee).toBeNull()
      expect(dto).not.toHaveProperty('defaultMinimumCourierPay')
    })

    it('serializes DTO carrying quoteBaseFee back to JSON without defaultMinimumCourierPay', () => {
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
        quoteBaseFee: 200,
        defaultCourierPayRate: 250,
        defaultMaxWorkingHours: 8,
        details: {},
      })

      const json = InstanceConfigSettingsDtoToJSON(dto)
      expect(json.quoteBaseFee).toBe(200)
      expect(json).not.toHaveProperty('defaultMinimumCourierPay')
    })
  })

  describe('DeliveryAdminDto (price breakdown field serializer guard - AC-7)', () => {
    it('keeps baseFee, distanceFee, feePercentage through FromJSON and ToJSON serialization', () => {
      const jsonInput = {
        id: 'del-123',
        status: 'DISPATCHED',
        currencyCode: 'EUR',
        orderTotalValue: 1000,
        totalCost: 338,
        fee: 31,
        totalCompensation: 307,
        baseFee: 200,
        distanceFee: 107,
        feePercentage: 10,
        pickupReadyAt: '2026-07-30T10:00:00Z',
        pickupDeadlineAt: '2026-07-30T10:30:00Z',
        dropoffReadyAt: '2026-07-30T10:15:00Z',
        dropoffEta: null,
        dropoffDeadlineAt: '2026-07-30T10:45:00Z',
        createdAt: '2026-07-30T09:00:00Z',
        updatedAt: '2026-07-30T09:00:00Z',
      }

      const dto = DeliveryAdminDtoFromJSON(jsonInput)
      expect(dto.baseFee).toBe(200)
      expect(dto.distanceFee).toBe(107)
      expect(dto.feePercentage).toBe(10)

      const serialized = DeliveryAdminDtoToJSON(dto)
      expect(serialized.baseFee).toBe(200)
      expect(serialized.distanceFee).toBe(107)
      expect(serialized.feePercentage).toBe(10)
    })

    it('reads missing baseFee, distanceFee, feePercentage keys as null', () => {
      const jsonInput = {
        id: 'del-123',
        status: 'CREATED',
        currencyCode: 'EUR',
      }

      const dto = DeliveryAdminDtoFromJSON(jsonInput)
      expect(dto.baseFee).toBeNull()
      expect(dto.distanceFee).toBeNull()
      expect(dto.feePercentage).toBeNull()
    })
  })
})
