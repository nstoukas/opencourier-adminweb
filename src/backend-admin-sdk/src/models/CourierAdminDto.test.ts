import { CourierAdminDtoFromJSON } from './CourierAdminDto'

// Spec 0051 (AC-6): the couriers list and a rider's page read deactivatedAt to label a deactivated rider.
describe('CourierAdminDto deactivatedAt (spec 0051, AC-6)', () => {
  const baseJson = {
    id: 'rider-1',
    node_uri: null,
    firstName: 'Nikos',
    lastName: 'Pappas',
    phoneNumber: '+306912345678',
    status: 'OFFLINE',
    deliverySetting: 'MANUAL',
    userId: 'user-1',
    createdAt: '2026-07-15T10:00:00.000Z',
  }

  it('reads deactivatedAt as a Date when the rider is deactivated', () => {
    const dto = CourierAdminDtoFromJSON({ ...baseJson, deactivatedAt: '2026-11-21T10:00:00.000Z' })

    expect(dto.deactivatedAt).toBeInstanceOf(Date)
    expect(dto.deactivatedAt).toEqual(new Date('2026-11-21T10:00:00.000Z'))
  })

  it('reads null for an active rider', () => {
    expect(CourierAdminDtoFromJSON({ ...baseJson, deactivatedAt: null }).deactivatedAt).toBeNull()
  })

  it('reads a missing deactivatedAt (an older backend) as not deactivated, never an Invalid Date', () => {
    const dto = CourierAdminDtoFromJSON(baseJson)

    expect(dto.deactivatedAt ?? null).toBeNull()
    expect(Boolean(dto.deactivatedAt)).toBe(false)
  })

  it('keeps the fields it had', () => {
    const dto = CourierAdminDtoFromJSON({ ...baseJson, deactivatedAt: '2026-11-21T10:00:00.000Z' })

    expect(dto).toMatchObject({
      id: 'rider-1',
      firstName: 'Nikos',
      lastName: 'Pappas',
      phoneNumber: '+306912345678',
      status: 'OFFLINE',
      deliverySetting: 'MANUAL',
    })
    expect(dto.createdAt).toEqual(new Date('2026-07-15T10:00:00.000Z'))
  })
})
