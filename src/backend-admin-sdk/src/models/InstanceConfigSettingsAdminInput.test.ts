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
