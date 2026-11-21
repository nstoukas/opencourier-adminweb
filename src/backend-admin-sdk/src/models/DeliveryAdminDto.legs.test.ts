import { DeliveryAdminDtoFromJSON, DeliveryAdminDtoToJSON } from './DeliveryAdminDto'

// Spec 0046 (row 10, AC-6, cross check 5): the hand edited SDK carries the leg labels, the order's legs
// and the leg numbers never sent. A field missing from the reader is dropped silently, and the page then
// shows a leg as a single delivery with no error anywhere.
describe('DeliveryAdminDto leg fields (spec 0046, AC-6)', () => {
  // The smallest delivery JSON the serializers accept: the date fields they convert must be present.
  const baseJson = {
    id: 'd-legs',
    pickupReadyAt: '2026-11-21T10:00:00.000Z',
    pickupDeadlineAt: '2026-11-21T10:30:00.000Z',
    dropoffReadyAt: '2026-11-21T10:15:00.000Z',
    dropoffEta: null,
    dropoffDeadlineAt: '2026-11-21T10:45:00.000Z',
    createdAt: '2026-11-21T09:55:00.000Z',
  }
  const legs = [
    { id: 'd-legs', legNumber: 1, status: 'ACCEPTED', courierId: 'c1', courierName: 'Maria Papadopoulou' },
  ]

  it('reads legNumber, legCount, orderLegs and missingLegNumbers when the API sends them', () => {
    const dto = DeliveryAdminDtoFromJSON({ ...baseJson, legNumber: 1, legCount: 3, orderLegs: legs, missingLegNumbers: [2, 3] })

    expect(dto.legNumber).toBe(1)
    expect(dto.legCount).toBe(3)
    expect(dto.orderLegs).toEqual(legs)
    expect(dto.missingLegNumbers).toEqual([2, 3])
  })

  it('a single delivery reads null labels and empty lists', () => {
    const dto = DeliveryAdminDtoFromJSON({ ...baseJson, legNumber: null, legCount: null, orderLegs: [], missingLegNumbers: [] })

    expect(dto.legNumber).toBeNull()
    expect(dto.legCount).toBeNull()
    expect(dto.orderLegs).toEqual([])
    expect(dto.missingLegNumbers).toEqual([])
  })

  it('an older backend that sends none of them reads null labels and empty lists (never undefined)', () => {
    const dto = DeliveryAdminDtoFromJSON(baseJson)

    expect(dto.legNumber).toBeNull()
    expect(dto.legCount).toBeNull()
    expect(dto.orderLegs).toEqual([])
    expect(dto.missingLegNumbers).toEqual([])
  })

  it('writes the four fields back out', () => {
    const dto = DeliveryAdminDtoFromJSON({ ...baseJson, legNumber: 2, legCount: 2, orderLegs: legs, missingLegNumbers: [1] })
    const json = DeliveryAdminDtoToJSON(dto)

    expect(json).toMatchObject({ legNumber: 2, legCount: 2, orderLegs: legs, missingLegNumbers: [1] })
  })
})
