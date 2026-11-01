import {
  DeliveryEventAdminDtoFromJSON,
  DeliveryEventAdminDtoToJSON,
  instanceOfDeliveryEventAdminDto,
  DeliveryEventAdminDto,
} from './DeliveryEventAdminDto'

describe('DeliveryEventAdminDto (spec 0011, AC-5)', () => {
  it('DeliveryEventAdminDtoFromJSON parses occurredAt as a Date when sent by the API', () => {
    const json = {
      id: 'ev-1',
      type: 'DROPPED_OFF',
      actor: 'COURIER',
      eventSource: 'OPENCOURIER',
      oldStatus: 'ON_THE_WAY',
      newStatus: 'DELIVERED',
      transitionSuccessful: true,
      message: 'Delivered to customer',
      createdAt: '2026-11-01T00:00:32.000Z',
      courierId: 'c-100',
      occurredAt: '2026-10-31T23:59:00.000Z',
    }

    const dto = DeliveryEventAdminDtoFromJSON(json)

    expect(dto.id).toBe('ev-1')
    expect(dto.type).toBe('DROPPED_OFF')
    expect(dto.createdAt).toBeInstanceOf(Date)
    expect(dto.createdAt.toISOString()).toBe('2026-11-01T00:00:32.000Z')
    expect(dto.occurredAt).toBeInstanceOf(Date)
    expect(dto.occurredAt?.toISOString()).toBe('2026-10-31T23:59:00.000Z')
    expect(dto.courierId).toBe('c-100')
  })

  it('DeliveryEventAdminDtoFromJSON gives occurredAt as undefined when missing from JSON (never an Invalid Date)', () => {
    // When backend does not send occurredAt, it must be undefined, not an Invalid Date object
    const jsonWithoutOccurredAt = {
      id: 'ev-2',
      type: 'CREATED',
      actor: 'PARTNER',
      eventSource: 'PARTNER_APP',
      transitionSuccessful: true,
      createdAt: '2026-11-01T00:00:00.000Z',
    }

    const dto = DeliveryEventAdminDtoFromJSON(jsonWithoutOccurredAt)

    expect(dto.occurredAt).toBeUndefined()
    // Explicit guard: must not be an Invalid Date
    expect(dto.occurredAt instanceof Date).toBe(false)
  })

  it('DeliveryEventAdminDtoFromJSON gives occurredAt as undefined when null in JSON (never an Invalid Date)', () => {
    const jsonWithNullOccurredAt = {
      id: 'ev-3',
      type: 'ACCEPTED',
      actor: 'COURIER',
      eventSource: 'OPENCOURIER',
      transitionSuccessful: true,
      createdAt: '2026-11-01T00:01:00.000Z',
      occurredAt: null,
    }

    const dto = DeliveryEventAdminDtoFromJSON(jsonWithNullOccurredAt)

    expect(dto.occurredAt).toBeUndefined()
    expect(dto.occurredAt instanceof Date).toBe(false)
  })

  it('DeliveryEventAdminDtoFromJSON handles null and undefined inputs cleanly', () => {
    expect(DeliveryEventAdminDtoFromJSON(null)).toBeNull()
    expect(DeliveryEventAdminDtoFromJSON(undefined)).toBeUndefined()
  })

  it('DeliveryEventAdminDtoToJSON serializes occurredAt back to ISO string when present', () => {
    const dto: DeliveryEventAdminDto = {
      id: 'ev-4',
      type: 'PICKED_UP',
      actor: 'COURIER',
      eventSource: 'OPENCOURIER',
      oldStatus: 'COURIER_ARRIVED_AT_PICKUP_LOCATION',
      newStatus: 'PICKED_UP',
      transitionSuccessful: true,
      message: null,
      createdAt: new Date('2026-11-01T00:05:00.000Z'),
      courierId: 'c-200',
      occurredAt: new Date('2026-11-01T00:03:00.000Z'),
    }

    const json = DeliveryEventAdminDtoToJSON(dto)

    expect(json.occurredAt).toBe('2026-11-01T00:03:00.000Z')
    expect(json.createdAt).toBe('2026-11-01T00:05:00.000Z')
    expect(json.courierId).toBe('c-200')
  })

  it('DeliveryEventAdminDtoToJSON leaves occurredAt undefined when omitted', () => {
    const dto: DeliveryEventAdminDto = {
      id: 'ev-5',
      type: 'CREATED',
      actor: 'PARTNER',
      eventSource: 'PARTNER_APP',
      oldStatus: null,
      newStatus: 'CREATED',
      transitionSuccessful: true,
      message: null,
      createdAt: new Date('2026-11-01T00:00:00.000Z'),
    }

    const json = DeliveryEventAdminDtoToJSON(dto)

    expect(json.occurredAt).toBeUndefined()
    expect(DeliveryEventAdminDtoToJSON(null)).toBeNull()
    expect(DeliveryEventAdminDtoToJSON(undefined)).toBeUndefined()
  })

  it('instanceOfDeliveryEventAdminDto verifies presence of required fields', () => {
    expect(
      instanceOfDeliveryEventAdminDto({
        id: 'ev-1',
        type: 'CREATED',
        transitionSuccessful: true,
      })
    ).toBe(true)
    expect(instanceOfDeliveryEventAdminDto({ id: 'ev-1', type: 'CREATED' })).toBe(false)
    expect(instanceOfDeliveryEventAdminDto({ id: 'ev-1', transitionSuccessful: true })).toBe(false)
    expect(instanceOfDeliveryEventAdminDto({})).toBe(false)
  })
})
