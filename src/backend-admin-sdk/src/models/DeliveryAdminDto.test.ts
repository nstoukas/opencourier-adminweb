import { DeliveryAdminDtoFromJSON, DeliveryAdminDtoToJSON } from './DeliveryAdminDto'

// Row 99 (spec 0016): the hand edited SDK carries the drop off floor and doorbell both ways, so the
// delivery page can show them as their own fields.
describe('DeliveryAdminDto floor and doorbell (row 99)', () => {
  // The smallest delivery JSON the serializers accept: the date fields they convert must be present.
  const baseJson = {
    id: 'd-99',
    pickupReadyAt: '2026-11-03T10:00:00.000Z',
    pickupDeadlineAt: '2026-11-03T10:30:00.000Z',
    dropoffReadyAt: '2026-11-03T10:15:00.000Z',
    dropoffEta: null,
    dropoffDeadlineAt: '2026-11-03T10:45:00.000Z',
    createdAt: '2026-11-03T09:55:00.000Z',
    dropoffNotes: 'Floor: 3 · Doorbell: Dimas',
  }

  it('DeliveryAdminDtoFromJSON reads dropoffFloor and dropoffDoorbell when the API sends them', () => {
    const dto = DeliveryAdminDtoFromJSON({ ...baseJson, dropoffFloor: '3rd', dropoffDoorbell: 'Dimas' })

    expect(dto.dropoffFloor).toBe('3rd')
    expect(dto.dropoffDoorbell).toBe('Dimas')
  })

  it('DeliveryAdminDtoFromJSON gives null for both when the API sends null', () => {
    const dto = DeliveryAdminDtoFromJSON({ ...baseJson, dropoffFloor: null, dropoffDoorbell: null })

    expect(dto.dropoffFloor).toBeNull()
    expect(dto.dropoffDoorbell).toBeNull()
  })

  it('DeliveryAdminDtoFromJSON gives null (never undefined) for both when an older backend omits them', () => {
    const dto = DeliveryAdminDtoFromJSON(baseJson)

    expect(dto.dropoffFloor).toBeNull()
    expect(dto.dropoffDoorbell).toBeNull()
  })

  it('DeliveryAdminDtoToJSON writes dropoffFloor and dropoffDoorbell', () => {
    const dto = DeliveryAdminDtoFromJSON({ ...baseJson, dropoffFloor: 'Ground', dropoffDoorbell: 'Papas 2' })

    const json = DeliveryAdminDtoToJSON(dto)

    expect(json.dropoffFloor).toBe('Ground')
    expect(json.dropoffDoorbell).toBe('Papas 2')
  })

  it('round trips floor and doorbell through ToJSON and FromJSON unchanged', () => {
    const first = DeliveryAdminDtoFromJSON({ ...baseJson, dropoffFloor: '1', dropoffDoorbell: 'K. Dimas' })

    const again = DeliveryAdminDtoFromJSON(DeliveryAdminDtoToJSON(first))

    expect(again.dropoffFloor).toBe('1')
    expect(again.dropoffDoorbell).toBe('K. Dimas')
  })
})

// Spec 0033 (AC-10, decision 23.20): what the restaurant was charged for keeping riders waiting.
describe('DeliveryAdminDto waitCharges (spec 0033, AC-10)', () => {
  const baseJson = {
    id: 'd-99',
    pickupReadyAt: '2026-11-03T10:00:00.000Z',
    pickupDeadlineAt: '2026-11-03T10:30:00.000Z',
    dropoffReadyAt: '2026-11-03T10:15:00.000Z',
    dropoffEta: null,
    dropoffDeadlineAt: '2026-11-03T10:45:00.000Z',
    createdAt: '2026-11-03T09:55:00.000Z',
    dropoffNotes: 'Floor: 3 · Doorbell: Dimas',
  }

  it('DeliveryAdminDtoFromJSON reads waitCharges when the API sends them', () => {
    const charges = [
      { amount: 150, currencyCode: 'EUR', createdAt: '2026-11-09T10:00:00.000Z' },
      { amount: 100, currencyCode: 'EUR', createdAt: '2026-11-09T10:45:00.000Z' },
    ]
    const dto = DeliveryAdminDtoFromJSON({ ...baseJson, waitCharges: charges })

    expect(dto.waitCharges).toEqual(charges)
  })

  it('DeliveryAdminDtoFromJSON reads an absent waitCharges field as an empty list (never undefined)', () => {
    const dto = DeliveryAdminDtoFromJSON(baseJson)

    expect(dto.waitCharges).toEqual([])
  })

  it('DeliveryAdminDtoToJSON writes waitCharges', () => {
    const charges = [{ amount: 200, currencyCode: 'EUR', createdAt: '2026-11-09T11:00:00.000Z' }]
    const dto = DeliveryAdminDtoFromJSON({ ...baseJson, waitCharges: charges })

    const json = DeliveryAdminDtoToJSON(dto)

    expect(json.waitCharges).toEqual(charges)
  })

  it('round trips waitCharges through ToJSON and FromJSON unchanged', () => {
    const charges = [{ amount: 250, currencyCode: 'EUR', createdAt: '2026-11-09T11:30:00.000Z' }]
    const first = DeliveryAdminDtoFromJSON({ ...baseJson, waitCharges: charges })

    const again = DeliveryAdminDtoFromJSON(DeliveryAdminDtoToJSON(first))

    expect(again.waitCharges).toEqual(charges)
  })
})
