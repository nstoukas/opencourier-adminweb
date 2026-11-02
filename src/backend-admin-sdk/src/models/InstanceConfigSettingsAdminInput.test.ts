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
import {
  DeliveryEventAdminDtoFromJSON,
  DeliveryEventAdminDtoToJSON,
} from './DeliveryEventAdminDto'

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

    it('preserves offerExpiryEnabled, offerExpirySeconds, and noCourierRetrySeconds in ToJSON (AC-10)', () => {
      // Load-bearing test guard: without these fields in ToJSON, the SDK silently drops them
      // and the save reports success for a change never sent.
      const input = {
        offerExpiryEnabled: true,
        offerExpirySeconds: 60,
        noCourierRetrySeconds: 30,
      }

      const json = InstanceConfigSettingsAdminInputToJSON(input)
      expect(json).toBeDefined()
      expect(json.offerExpiryEnabled).toBe(true)
      expect(json.offerExpirySeconds).toBe(60)
      expect(json.noCourierRetrySeconds).toBe(30)

      // Ensure false is also preserved and not dropped
      const inputDisabled = {
        offerExpiryEnabled: false,
        offerExpirySeconds: 120,
        noCourierRetrySeconds: 45,
      }
      const jsonDisabled = InstanceConfigSettingsAdminInputToJSON(inputDisabled)
      expect(jsonDisabled.offerExpiryEnabled).toBe(false)
      expect(jsonDisabled.offerExpirySeconds).toBe(120)
      expect(jsonDisabled.noCourierRetrySeconds).toBe(45)
    })

    it('round-trips offer expiry settings through FromJSON and ToJSON (AC-10)', () => {
      const originalJson = {
        offerExpiryEnabled: true,
        offerExpirySeconds: 90,
        noCourierRetrySeconds: 20,
      }

      const model = InstanceConfigSettingsAdminInputFromJSON(originalJson)
      expect(model.offerExpiryEnabled).toBe(true)
      expect(model.offerExpirySeconds).toBe(90)
      expect(model.noCourierRetrySeconds).toBe(20)

      const serialized = InstanceConfigSettingsAdminInputToJSON(model)
      expect(serialized.offerExpiryEnabled).toBe(true)
      expect(serialized.offerExpirySeconds).toBe(90)
      expect(serialized.noCourierRetrySeconds).toBe(20)
    })

    it('preserves savedCustomerRetentionMonths in ToJSON serialization (spec 0005, AC-7)', () => {
      // Load-bearing test guard: without savedCustomerRetentionMonths in ToJSON, the SDK silently drops
      // it and the save reports success for a change never sent.
      const input = {
        savedCustomerRetentionMonths: 12,
      }

      const json = InstanceConfigSettingsAdminInputToJSON(input)
      expect(json).toBeDefined()
      expect(json.savedCustomerRetentionMonths).toBe(12)
    })

    it('round-trips savedCustomerRetentionMonths through FromJSON and ToJSON (spec 0005, AC-7)', () => {
      const originalJson = {
        savedCustomerRetentionMonths: 24,
      }

      const model = InstanceConfigSettingsAdminInputFromJSON(originalJson)
      expect(model.savedCustomerRetentionMonths).toBe(24)

      const serialized = InstanceConfigSettingsAdminInputToJSON(model)
      expect(serialized.savedCustomerRetentionMonths).toBe(24)
    })

    it('preserves restaurantHistoryDays in ToJSON serialization (spec 0017, AC-1)', () => {
      // Load-bearing test guard: without restaurantHistoryDays in ToJSON, the SDK silently drops
      // it and the save reports success for a change never sent.
      const input = {
        restaurantHistoryDays: 30,
      }

      const json = InstanceConfigSettingsAdminInputToJSON(input)
      expect(json).toBeDefined()
      expect(json.restaurantHistoryDays).toBe(30)
    })

    it('round-trips restaurantHistoryDays through FromJSON and ToJSON (spec 0017, AC-1)', () => {
      const originalJson = {
        restaurantHistoryDays: 14,
      }

      const model = InstanceConfigSettingsAdminInputFromJSON(originalJson)
      expect(model.restaurantHistoryDays).toBe(14)

      const serialized = InstanceConfigSettingsAdminInputToJSON(model)
      expect(serialized.restaurantHistoryDays).toBe(14)
    })

    it('handles undefined restaurantHistoryDays in FromJSON and ToJSON', () => {
      const model = InstanceConfigSettingsAdminInputFromJSON({})
      expect(model.restaurantHistoryDays).toBeUndefined()

      const serialized = InstanceConfigSettingsAdminInputToJSON(model)
      expect(serialized.restaurantHistoryDays).toBeUndefined()
    })

    it('preserves handBackSeconds in ToJSON serialization, including 0 (spec 0020, AC-2)', () => {
      // Load-bearing test guard: without handBackSeconds in ToJSON, the SDK silently drops
      // it and the save reports success for a setting never sent to the backend.
      const input = {
        handBackSeconds: 60,
      }

      const json = InstanceConfigSettingsAdminInputToJSON(input)
      expect(json).toBeDefined()
      expect(json.handBackSeconds).toBe(60)

      // 0 is the off switch and must be preserved (not dropped as falsy)
      const inputZero = {
        handBackSeconds: 0,
      }

      const jsonZero = InstanceConfigSettingsAdminInputToJSON(inputZero)
      expect(jsonZero.handBackSeconds).toBe(0)
    })

    it('round-trips handBackSeconds through FromJSON and ToJSON (spec 0020, AC-2)', () => {
      const originalJson = {
        handBackSeconds: 45,
      }

      const model = InstanceConfigSettingsAdminInputFromJSON(originalJson)
      expect(model.handBackSeconds).toBe(45)

      const serialized = InstanceConfigSettingsAdminInputToJSON(model)
      expect(serialized.handBackSeconds).toBe(45)

      const zeroModel = InstanceConfigSettingsAdminInputFromJSON({
        handBackSeconds: 0,
      })
      expect(zeroModel.handBackSeconds).toBe(0)

      const zeroSerialized = InstanceConfigSettingsAdminInputToJSON(zeroModel)
      expect(zeroSerialized.handBackSeconds).toBe(0)
    })

    it('handles undefined handBackSeconds in FromJSON and ToJSON (spec 0020, AC-2)', () => {
      const model = InstanceConfigSettingsAdminInputFromJSON({})
      expect(model.handBackSeconds).toBeUndefined()

      const serialized = InstanceConfigSettingsAdminInputToJSON(model)
      expect(serialized.handBackSeconds).toBeUndefined()
    })

    it('preserves arrivalRadiusMetres in ToJSON serialization, including 0 (spec 0021, AC-11)', () => {
      // Load-bearing test guard: without arrivalRadiusMetres in ToJSON, the SDK silently drops
      // it and the save reports success for a setting never sent to the backend.
      const input = {
        arrivalRadiusMetres: 80,
      }

      const json = InstanceConfigSettingsAdminInputToJSON(input)
      expect(json).toBeDefined()
      expect(json.arrivalRadiusMetres).toBe(80)

      // 0 is the off switch and must be preserved (not dropped as falsy)
      const inputZero = {
        arrivalRadiusMetres: 0,
      }

      const jsonZero = InstanceConfigSettingsAdminInputToJSON(inputZero)
      expect(jsonZero.arrivalRadiusMetres).toBe(0)
    })

    it('round-trips arrivalRadiusMetres through FromJSON and ToJSON (spec 0021, AC-11)', () => {
      const originalJson = {
        arrivalRadiusMetres: 50,
      }

      const model = InstanceConfigSettingsAdminInputFromJSON(originalJson)
      expect(model.arrivalRadiusMetres).toBe(50)

      const serialized = InstanceConfigSettingsAdminInputToJSON(model)
      expect(serialized.arrivalRadiusMetres).toBe(50)

      const zeroModel = InstanceConfigSettingsAdminInputFromJSON({
        arrivalRadiusMetres: 0,
      })
      expect(zeroModel.arrivalRadiusMetres).toBe(0)

      const zeroSerialized = InstanceConfigSettingsAdminInputToJSON(zeroModel)
      expect(zeroSerialized.arrivalRadiusMetres).toBe(0)
    })

    it('preserves sosLocationRetentionDays in ToJSON serialization (spec 0022, AC-11)', () => {
      // Load-bearing test guard: without sosLocationRetentionDays in ToJSON, the SDK silently drops
      // it and the save reports success for a change never sent.
      const input = {
        sosLocationRetentionDays: 30,
      }

      const json = InstanceConfigSettingsAdminInputToJSON(input)
      expect(json).toBeDefined()
      expect(json.sosLocationRetentionDays).toBe(30)
    })

    it('round-trips sosLocationRetentionDays through FromJSON and ToJSON (spec 0022, AC-11)', () => {
      const originalJson = {
        sosLocationRetentionDays: 14,
      }

      const model = InstanceConfigSettingsAdminInputFromJSON(originalJson)
      expect(model.sosLocationRetentionDays).toBe(14)

      const serialized = InstanceConfigSettingsAdminInputToJSON(model)
      expect(serialized.sosLocationRetentionDays).toBe(14)
    })

    it('handles undefined sosLocationRetentionDays in FromJSON and ToJSON (spec 0022, AC-11)', () => {
      const model = InstanceConfigSettingsAdminInputFromJSON({})
      expect(model.sosLocationRetentionDays).toBeUndefined()

      const serialized = InstanceConfigSettingsAdminInputToJSON(model)
      expect(serialized.sosLocationRetentionDays).toBeUndefined()
    })

    it('handles undefined arrivalRadiusMetres in FromJSON and ToJSON (spec 0021, AC-11)', () => {
      const model = InstanceConfigSettingsAdminInputFromJSON({})
      expect(model.arrivalRadiusMetres).toBeUndefined()

      const serialized = InstanceConfigSettingsAdminInputToJSON(model)
      expect(serialized.arrivalRadiusMetres).toBeUndefined()
    })

    it('preserves dispatchPhoneNumber in ToJSON serialization, including empty text (row 72)', () => {
      // Load-bearing test guard: without dispatchPhoneNumber in ToJSON, the SDK silently drops
      // it and the save reports success for a number never sent to the backend.
      const input = {
        dispatchPhoneNumber: '+30 24210 12345',
      }

      const json = InstanceConfigSettingsAdminInputToJSON(input)
      expect(json).toBeDefined()
      expect(json.dispatchPhoneNumber).toBe('+30 24210 12345')

      // Empty string must also be preserved so clearing the dispatch line sends ''
      const inputEmpty = {
        dispatchPhoneNumber: '',
      }

      const jsonEmpty = InstanceConfigSettingsAdminInputToJSON(inputEmpty)
      expect(jsonEmpty).toBeDefined()
      expect(jsonEmpty.dispatchPhoneNumber).toBe('')
    })

    it('round-trips dispatchPhoneNumber through FromJSON and ToJSON (row 72)', () => {
      const originalJson = {
        dispatchPhoneNumber: '+302421012345',
      }

      const model = InstanceConfigSettingsAdminInputFromJSON(originalJson)
      expect(model.dispatchPhoneNumber).toBe('+302421012345')

      const serialized = InstanceConfigSettingsAdminInputToJSON(model)
      expect(serialized.dispatchPhoneNumber).toBe('+302421012345')

      // Also round-trip empty string
      const emptyModel = InstanceConfigSettingsAdminInputFromJSON({
        dispatchPhoneNumber: '',
      })
      expect(emptyModel.dispatchPhoneNumber).toBe('')

      const emptySerialized = InstanceConfigSettingsAdminInputToJSON(emptyModel)
      expect(emptySerialized.dispatchPhoneNumber).toBe('')
    })

    it('preserves cancellationPayoutPolicy in ToJSON serialization (spec 0015, AC-4)', () => {
      // Load-bearing test guard: without cancellationPayoutPolicy in ToJSON, the SDK silently drops
      // it and the save reports success for a rule never sent to the backend.
      const input = {
        cancellationPayoutPolicy: 'FULL_COMPENSATION',
      }

      const json = InstanceConfigSettingsAdminInputToJSON(input)
      expect(json).toBeDefined()
      expect(json.cancellationPayoutPolicy).toBe('FULL_COMPENSATION')

      const inputHalf = {
        cancellationPayoutPolicy: 'HALF_COMPENSATION',
      }
      const jsonHalf = InstanceConfigSettingsAdminInputToJSON(inputHalf)
      expect(jsonHalf.cancellationPayoutPolicy).toBe('HALF_COMPENSATION')
    })

    it('round-trips cancellationPayoutPolicy through FromJSON and ToJSON (spec 0015, AC-4)', () => {
      const originalJson = {
        cancellationPayoutPolicy: 'SEVENTY_PERCENT',
      }

      const model = InstanceConfigSettingsAdminInputFromJSON(originalJson)
      expect(model.cancellationPayoutPolicy).toBe('SEVENTY_PERCENT')

      const serialized = InstanceConfigSettingsAdminInputToJSON(model)
      expect(serialized.cancellationPayoutPolicy).toBe('SEVENTY_PERCENT')
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

    it('deserializes offerExpiryEnabled, offerExpirySeconds, and noCourierRetrySeconds when present (AC-10)', () => {
      const json = {
        details: {},
        offerExpiryEnabled: true,
        offerExpirySeconds: 45,
        noCourierRetrySeconds: 25,
      }

      const dto = InstanceConfigSettingsDtoFromJSON(json)
      expect(dto.offerExpiryEnabled).toBe(true)
      expect(dto.offerExpirySeconds).toBe(45)
      expect(dto.noCourierRetrySeconds).toBe(25)
    })

    it('deserializes offer expiry fields as null when keys are absent in backend response (AC-10)', () => {
      // Missing keys mean "not sent" (older backend) rather than false/0, so the page can distinguish
      const json = {
        details: {},
      }

      const dto = InstanceConfigSettingsDtoFromJSON(json)
      expect(dto.offerExpiryEnabled).toBeNull()
      expect(dto.offerExpirySeconds).toBeNull()
      expect(dto.noCourierRetrySeconds).toBeNull()
    })

    it('serializes DTO carrying offer expiry fields back to JSON (AC-10)', () => {
      const dto = InstanceConfigSettingsDtoFromJSON({
        details: {},
        offerExpiryEnabled: false,
        offerExpirySeconds: 60,
        noCourierRetrySeconds: 30,
      })

      const json = InstanceConfigSettingsDtoToJSON(dto)
      expect(json.offerExpiryEnabled).toBe(false)
      expect(json.offerExpirySeconds).toBe(60)
      expect(json.noCourierRetrySeconds).toBe(30)
    })

    it('deserializes savedCustomerRetentionMonths when present (spec 0005, AC-7)', () => {
      const json = {
        details: {},
        savedCustomerRetentionMonths: 18,
      }

      const dto = InstanceConfigSettingsDtoFromJSON(json)
      expect(dto.savedCustomerRetentionMonths).toBe(18)
    })

    it('deserializes savedCustomerRetentionMonths as null when absent in backend response (spec 0005, AC-7)', () => {
      const json = {
        details: {},
      }

      const dto = InstanceConfigSettingsDtoFromJSON(json)
      expect(dto.savedCustomerRetentionMonths).toBeNull()
    })

    it('serializes DTO carrying savedCustomerRetentionMonths back to JSON (spec 0005, AC-7)', () => {
      const dto = InstanceConfigSettingsDtoFromJSON({
        details: {},
        savedCustomerRetentionMonths: 12,
      })

      const json = InstanceConfigSettingsDtoToJSON(dto)
      expect(json.savedCustomerRetentionMonths).toBe(12)
    })

    it('deserializes restaurantHistoryDays when present (spec 0017, AC-1)', () => {
      const json = {
        details: {},
        restaurantHistoryDays: 30,
      }

      const dto = InstanceConfigSettingsDtoFromJSON(json)
      expect(dto.restaurantHistoryDays).toBe(30)
    })

    it('deserializes restaurantHistoryDays as null when absent in backend response (spec 0017, AC-1)', () => {
      const json = {
        details: {},
      }

      const dto = InstanceConfigSettingsDtoFromJSON(json)
      expect(dto.restaurantHistoryDays).toBeNull()
    })

    it('serializes DTO carrying restaurantHistoryDays back to JSON (spec 0017, AC-1)', () => {
      const dto = InstanceConfigSettingsDtoFromJSON({
        details: {},
        restaurantHistoryDays: 7,
      })

      const json = InstanceConfigSettingsDtoToJSON(dto)
      expect(json.restaurantHistoryDays).toBe(7)
    })

    it('deserializes handBackSeconds when present, including 0 (spec 0020, AC-2)', () => {
      const json = {
        details: {},
        handBackSeconds: 60,
      }

      const dto = InstanceConfigSettingsDtoFromJSON(json)
      expect(dto.handBackSeconds).toBe(60)

      const jsonZero = {
        details: {},
        handBackSeconds: 0,
      }

      const dtoZero = InstanceConfigSettingsDtoFromJSON(jsonZero)
      expect(dtoZero.handBackSeconds).toBe(0)
    })

    it('deserializes handBackSeconds as null when absent in backend response (spec 0020, AC-2)', () => {
      // Missing key means absent in backend, mapped to null so the page can distinguish from 0
      const json = {
        details: {},
      }

      const dto = InstanceConfigSettingsDtoFromJSON(json)
      expect(dto.handBackSeconds).toBeNull()
    })

    it('serializes DTO carrying handBackSeconds back to JSON (spec 0020, AC-2)', () => {
      const dto = InstanceConfigSettingsDtoFromJSON({
        details: {},
        handBackSeconds: 60,
      })

      const json = InstanceConfigSettingsDtoToJSON(dto)
      expect(json.handBackSeconds).toBe(60)
    })

    it('deserializes arrivalRadiusMetres when present, including 0 (spec 0021, AC-11)', () => {
      const json = {
        details: {},
        arrivalRadiusMetres: 50,
      }

      const dto = InstanceConfigSettingsDtoFromJSON(json)
      expect(dto.arrivalRadiusMetres).toBe(50)

      const jsonZero = {
        details: {},
        arrivalRadiusMetres: 0,
      }

      const dtoZero = InstanceConfigSettingsDtoFromJSON(jsonZero)
      expect(dtoZero.arrivalRadiusMetres).toBe(0)
    })

    it('deserializes arrivalRadiusMetres as null when absent in backend response (spec 0021, AC-11)', () => {
      // Missing key means absent in backend, mapped to null
      const json = {
        details: {},
      }

      const dto = InstanceConfigSettingsDtoFromJSON(json)
      expect(dto.arrivalRadiusMetres).toBeNull()
    })

    it('serializes DTO carrying arrivalRadiusMetres back to JSON (spec 0021, AC-11)', () => {
      const dto = InstanceConfigSettingsDtoFromJSON({
        details: {},
        arrivalRadiusMetres: 50,
      })

      const json = InstanceConfigSettingsDtoToJSON(dto)
      expect(json.arrivalRadiusMetres).toBe(50)
    })

    it('deserializes sosLocationRetentionDays when present (spec 0022, AC-11)', () => {
      const json = {
        details: {},
        sosLocationRetentionDays: 30,
      }

      const dto = InstanceConfigSettingsDtoFromJSON(json)
      expect(dto.sosLocationRetentionDays).toBe(30)
    })

    it('deserializes sosLocationRetentionDays as null when absent in backend response (spec 0022, AC-11)', () => {
      const json = {
        details: {},
      }

      const dto = InstanceConfigSettingsDtoFromJSON(json)
      expect(dto.sosLocationRetentionDays).toBeNull()
    })

    it('serializes DTO carrying sosLocationRetentionDays back to JSON (spec 0022, AC-11)', () => {
      const dto = InstanceConfigSettingsDtoFromJSON({
        details: {},
        sosLocationRetentionDays: 14,
      })

      const json = InstanceConfigSettingsDtoToJSON(dto)
      expect(json.sosLocationRetentionDays).toBe(14)
    })

    it('deserializes dispatchPhoneNumber when present (row 72)', () => {
      const json = {
        details: {},
        dispatchPhoneNumber: '+302421012345',
      }

      const dto = InstanceConfigSettingsDtoFromJSON(json)
      expect(dto.dispatchPhoneNumber).toBe('+302421012345')
    })

    it('deserializes dispatchPhoneNumber as null when absent in backend response (row 72)', () => {
      // Absent key must read as null, so the page can show an empty input rather than undefined
      const json = {
        details: {},
      }

      const dto = InstanceConfigSettingsDtoFromJSON(json)
      expect(dto.dispatchPhoneNumber).toBeNull()
    })

    it('serializes DTO carrying dispatchPhoneNumber back to JSON (row 72)', () => {
      const dto = InstanceConfigSettingsDtoFromJSON({
        details: {},
        dispatchPhoneNumber: '+302421012345',
      })

      const json = InstanceConfigSettingsDtoToJSON(dto)
      expect(json.dispatchPhoneNumber).toBe('+302421012345')
    })

    it('deserializes cancellationPayoutPolicy when present (spec 0015, AC-4)', () => {
      const json = {
        details: {},
        cancellationPayoutPolicy: 'HALF_COMPENSATION',
      }

      const dto = InstanceConfigSettingsDtoFromJSON(json)
      expect(dto.cancellationPayoutPolicy).toBe('HALF_COMPENSATION')
    })

    it('deserializes cancellationPayoutPolicy as null when absent in backend response (spec 0015, AC-4)', () => {
      // Missing key means "no row configured" / "older backend", mapped to null so fallback logic applies
      const json = {
        details: {},
      }

      const dto = InstanceConfigSettingsDtoFromJSON(json)
      expect(dto.cancellationPayoutPolicy).toBeNull()
    })

    it('serializes DTO carrying cancellationPayoutPolicy back to JSON (spec 0015, AC-4)', () => {
      const dto = InstanceConfigSettingsDtoFromJSON({
        details: {},
        cancellationPayoutPolicy: 'FULL_COMPENSATION',
      })

      const json = InstanceConfigSettingsDtoToJSON(dto)
      expect(json.cancellationPayoutPolicy).toBe('FULL_COMPENSATION')
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

    it('keeps offeredAt, offerExpiresAt, matchedCourierName, waitingForCourierSince through FromJSON and ToJSON (AC-11)', () => {
      const jsonInput = {
        id: 'del-123',
        status: 'ASSIGNING_COURIER',
        currencyCode: 'EUR',
        orderTotalValue: 1000,
        totalCost: 338,
        fee: 31,
        totalCompensation: 307,
        pickupReadyAt: '2026-10-26T10:00:00.000Z',
        pickupDeadlineAt: '2026-10-26T10:30:00.000Z',
        dropoffReadyAt: '2026-10-26T10:15:00.000Z',
        dropoffEta: null,
        dropoffDeadlineAt: '2026-10-26T10:45:00.000Z',
        createdAt: '2026-10-26T10:00:00.000Z',
        updatedAt: '2026-10-26T10:00:00.000Z',
        offeredAt: '2026-10-26T10:01:00.000Z',
        offerExpiresAt: '2026-10-26T10:02:00.000Z',
        matchedCourierName: 'Ana Papadopoulou',
        waitingForCourierSince: '2026-10-26T10:00:30.000Z',
      }

      const dto = DeliveryAdminDtoFromJSON(jsonInput)
      expect(dto.offeredAt).toEqual(new Date('2026-10-26T10:01:00.000Z'))
      expect(dto.offerExpiresAt).toEqual(new Date('2026-10-26T10:02:00.000Z'))
      expect(dto.matchedCourierName).toBe('Ana Papadopoulou')
      expect(dto.waitingForCourierSince).toEqual(new Date('2026-10-26T10:00:30.000Z'))

      const serialized = DeliveryAdminDtoToJSON(dto)
      expect(serialized.offeredAt).toBe('2026-10-26T10:01:00.000Z')
      expect(serialized.offerExpiresAt).toBe('2026-10-26T10:02:00.000Z')
      expect(serialized.matchedCourierName).toBe('Ana Papadopoulou')
      expect(serialized.waitingForCourierSince).toBe('2026-10-26T10:00:30.000Z')
    })

    it('reads missing offer fields as null (never Invalid Date or 1970)', () => {
      const jsonInput = {
        id: 'del-123',
        status: 'CREATED',
        currencyCode: 'EUR',
        pickupReadyAt: '2026-10-26T10:00:00.000Z',
        pickupDeadlineAt: '2026-10-26T10:30:00.000Z',
        dropoffReadyAt: '2026-10-26T10:15:00.000Z',
        dropoffEta: null,
        dropoffDeadlineAt: '2026-10-26T10:45:00.000Z',
        createdAt: '2026-10-26T10:00:00.000Z',
        updatedAt: '2026-10-26T10:00:00.000Z',
      }

      const dto = DeliveryAdminDtoFromJSON(jsonInput)
      expect(dto.offeredAt).toBeNull()
      expect(dto.offerExpiresAt).toBeNull()
      expect(dto.matchedCourierName).toBeNull()
      expect(dto.waitingForCourierSince).toBeNull()

      const serialized = DeliveryAdminDtoToJSON(dto)
      expect(serialized.offeredAt).toBeNull()
      expect(serialized.offerExpiresAt).toBeNull()
      expect(serialized.matchedCourierName).toBeNull()
      expect(serialized.waitingForCourierSince).toBeNull()
    })

    it('tolerates undefined dates in DeliveryAdminDtoToJSON (e.g. fixtures created without offer dates - F4)', () => {
      // Regression guard (F4): DeliveryAdminDtoToJSON uses `== null` so undefined dates serialize
      // to null instead of throwing TypeError: Cannot read properties of undefined (reading 'toISOString')
      const baseDto = DeliveryAdminDtoFromJSON({
        id: 'del-undef',
        status: 'ASSIGNING_COURIER',
        currencyCode: 'EUR',
        orderTotalValue: 1000,
        totalCost: 338,
        fee: 31,
        totalCompensation: 307,
        pickupReadyAt: '2026-10-26T10:00:00.000Z',
        pickupDeadlineAt: '2026-10-26T10:30:00.000Z',
        dropoffReadyAt: '2026-10-26T10:15:00.000Z',
        dropoffEta: null,
        dropoffDeadlineAt: '2026-10-26T10:45:00.000Z',
        createdAt: '2026-10-26T10:00:00.000Z',
        updatedAt: '2026-10-26T10:00:00.000Z',
      })

      const dtoWithUndefinedDates = {
        ...baseDto,
        offeredAt: undefined as any,
        offerExpiresAt: undefined as any,
        waitingForCourierSince: undefined as any,
      }

      expect(() => DeliveryAdminDtoToJSON(dtoWithUndefinedDates)).not.toThrow()
      const json = DeliveryAdminDtoToJSON(dtoWithUndefinedDates)
      expect(json.offeredAt).toBeNull()
      expect(json.offerExpiresAt).toBeNull()
      expect(json.waitingForCourierSince).toBeNull()
    })

    it('keeps cancellation fields and partnerCharge through FromJSON and ToJSON serialization (spec 0015, AC-13)', () => {
      const jsonInput = {
        id: 'del-cancelled-1',
        status: 'CANCELED',
        currencyCode: 'EUR',
        orderTotalValue: 1000,
        totalCost: 500,
        fee: 30,
        totalCompensation: 350,
        pickupReadyAt: '2026-11-01T10:00:00.000Z',
        pickupDeadlineAt: '2026-11-01T10:30:00.000Z',
        dropoffReadyAt: '2026-11-01T10:15:00.000Z',
        dropoffEta: null,
        dropoffDeadlineAt: '2026-11-01T10:45:00.000Z',
        createdAt: '2026-11-01T09:00:00.000Z',
        updatedAt: '2026-11-01T09:00:00.000Z',
        cancelledBy: 'RESTAURANT',
        cancelledFromStatus: 'PICKED_UP',
        cancelledAt: '2026-11-01T10:00:00.000Z',
        foodOutcome: 'RETURNED',
        foodOutcomeAt: '2026-11-01T10:15:00.000Z',
        partnerCharge: {
          amount: 500,
          currencyCode: 'EUR',
          createdAt: '2026-11-01T10:00:05.000Z',
        },
      }

      const dto = DeliveryAdminDtoFromJSON(jsonInput)
      expect(dto.cancelledBy).toBe('RESTAURANT')
      expect(dto.cancelledFromStatus).toBe('PICKED_UP')
      expect(dto.cancelledAt).toEqual(new Date('2026-11-01T10:00:00.000Z'))
      expect(dto.foodOutcome).toBe('RETURNED')
      expect(dto.foodOutcomeAt).toEqual(new Date('2026-11-01T10:15:00.000Z'))
      expect(dto.partnerCharge).toEqual({
        amount: 500,
        currencyCode: 'EUR',
        createdAt: '2026-11-01T10:00:05.000Z',
      })

      const serialized = DeliveryAdminDtoToJSON(dto)
      expect(serialized.cancelledBy).toBe('RESTAURANT')
      expect(serialized.cancelledFromStatus).toBe('PICKED_UP')
      expect(serialized.cancelledAt).toBe('2026-11-01T10:00:00.000Z')
      expect(serialized.foodOutcome).toBe('RETURNED')
      expect(serialized.foodOutcomeAt).toBe('2026-11-01T10:15:00.000Z')
      expect(serialized.partnerCharge).toEqual({
        amount: 500,
        currencyCode: 'EUR',
        createdAt: '2026-11-01T10:00:05.000Z',
      })
    })

    it('reads missing cancellation fields and partnerCharge as null (never undefined or invalid Date) (spec 0015, AC-13)', () => {
      const jsonInput = {
        id: 'del-active',
        status: 'DISPATCHED',
        currencyCode: 'EUR',
        pickupReadyAt: '2026-11-01T10:00:00.000Z',
        pickupDeadlineAt: '2026-11-01T10:30:00.000Z',
        dropoffReadyAt: '2026-11-01T10:15:00.000Z',
        dropoffEta: null,
        dropoffDeadlineAt: '2026-11-01T10:45:00.000Z',
        createdAt: '2026-11-01T09:00:00.000Z',
        updatedAt: '2026-11-01T09:00:00.000Z',
      }

      const dto = DeliveryAdminDtoFromJSON(jsonInput)
      expect(dto.cancelledBy).toBeNull()
      expect(dto.cancelledFromStatus).toBeNull()
      expect(dto.cancelledAt).toBeNull()
      expect(dto.foodOutcome).toBeNull()
      expect(dto.foodOutcomeAt).toBeNull()
      expect(dto.partnerCharge).toBeNull()

      const serialized = DeliveryAdminDtoToJSON(dto)
      expect(serialized.cancelledBy).toBeNull()
      expect(serialized.cancelledFromStatus).toBeNull()
      expect(serialized.cancelledAt).toBeNull()
      expect(serialized.foodOutcome).toBeNull()
      expect(serialized.foodOutcomeAt).toBeNull()
      expect(serialized.partnerCharge).toBeNull()
    })

    it('tolerates undefined cancellation dates in DeliveryAdminDtoToJSON', () => {
      const baseDto = DeliveryAdminDtoFromJSON({
        id: 'del-cancellation-undef',
        status: 'CANCELED',
        currencyCode: 'EUR',
        pickupReadyAt: '2026-11-01T10:00:00.000Z',
        pickupDeadlineAt: '2026-11-01T10:30:00.000Z',
        dropoffReadyAt: '2026-11-01T10:15:00.000Z',
        dropoffEta: null,
        dropoffDeadlineAt: '2026-11-01T10:45:00.000Z',
        createdAt: '2026-11-01T09:00:00.000Z',
        updatedAt: '2026-11-01T09:00:00.000Z',
      })

      const dtoWithUndefinedDates = {
        ...baseDto,
        cancelledAt: undefined as any,
        foodOutcomeAt: undefined as any,
      }

      expect(() => DeliveryAdminDtoToJSON(dtoWithUndefinedDates)).not.toThrow()
      const json = DeliveryAdminDtoToJSON(dtoWithUndefinedDates)
      expect(json.cancelledAt).toBeNull()
      expect(json.foodOutcomeAt).toBeNull()
    })
  })

  describe('DeliveryEventAdminDto (rider serializer guard - AC-11, Value 5)', () => {
    it('preserves courierId through FromJSON and ToJSON serialization', () => {
      const jsonInput = {
        id: 'ev-1',
        type: 'OFFERED',
        actor: 'SYSTEM',
        eventSource: 'OPENCOURIER',
        oldStatus: 'ASSIGNING_COURIER',
        newStatus: 'ASSIGNING_COURIER',
        transitionSuccessful: true,
        message: null,
        createdAt: '2026-10-26T10:00:00.000Z',
        courierId: 'courier-123',
      }

      const dto = DeliveryEventAdminDtoFromJSON(jsonInput)
      expect(dto.courierId).toBe('courier-123')

      const serialized = DeliveryEventAdminDtoToJSON(dto)
      expect(serialized.courierId).toBe('courier-123')
    })

    it('reads missing or null courierId as null without error', () => {
      const jsonWithoutCourier = {
        id: 'ev-2',
        type: 'NO_COURIER_AVAILABLE',
        actor: 'SYSTEM',
        eventSource: 'OPENCOURIER',
        oldStatus: 'ASSIGNING_COURIER',
        newStatus: 'ASSIGNING_COURIER',
        transitionSuccessful: true,
        message: null,
        createdAt: '2026-10-26T10:00:00.000Z',
      }

      const dto = DeliveryEventAdminDtoFromJSON(jsonWithoutCourier)
      expect(dto.courierId).toBeNull()

      const serialized = DeliveryEventAdminDtoToJSON(dto)
      expect(serialized.courierId).toBeNull()
    })
  })
})
