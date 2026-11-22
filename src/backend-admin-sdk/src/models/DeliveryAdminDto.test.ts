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

// Spec 0044 (AC-6, AC-8): why each offer went to its rider.
describe('DeliveryAdminDto offerReasons (spec 0044, AC-6, AC-8)', () => {
  const baseJson = {
    id: 'd-100',
    pickupReadyAt: '2026-11-20T10:00:00.000Z',
    pickupDeadlineAt: '2026-11-20T10:30:00.000Z',
    dropoffReadyAt: '2026-11-20T10:15:00.000Z',
    dropoffEta: null,
    dropoffDeadlineAt: '2026-11-20T10:45:00.000Z',
    createdAt: '2026-11-20T09:55:00.000Z',
    dropoffNotes: 'Floor: 2',
  }

  const sampleOfferReasons = [
    {
      id: 'reason-1',
      deliveryEventId: 'evt-1',
      courierId: 'c-1',
      strategy: 'FAIRNESS',
      weights: { roadTime: 50, earnings: 30, waiting: 20 },
      values: {
        roadSeconds: 120,
        roadEstimated: false,
        centsPerHour: 800,
        earningsAssumed: false,
        earningsEqual: false,
        waitingSeconds: 300,
      },
      score: 0.15,
      candidateCount: 5,
      ridersInRange: 8,
      candidates: [
        { courierId: 'c-1', roadSeconds: 120, centsPerHour: 800, waitingSeconds: 300, score: 0.15 },
        { courierId: 'c-2', roadSeconds: 180, centsPerHour: 900, waitingSeconds: 200, score: 0.25 },
      ],
      kind: 'SINGLE',
      createdAt: '2026-11-20T10:00:00.000Z',
    },
  ]

  it('DeliveryAdminDtoFromJSON reads offerReasons when the API sends them', () => {
    const dto = DeliveryAdminDtoFromJSON({ ...baseJson, offerReasons: sampleOfferReasons })

    expect(dto.offerReasons).toEqual(sampleOfferReasons)
  })

  it('DeliveryAdminDtoFromJSON reads an absent offerReasons field as an empty list (never undefined or null)', () => {
    const dto = DeliveryAdminDtoFromJSON(baseJson)

    expect(dto.offerReasons).toEqual([])
  })

  it('DeliveryAdminDtoToJSON writes offerReasons', () => {
    const dto = DeliveryAdminDtoFromJSON({ ...baseJson, offerReasons: sampleOfferReasons })

    const json = DeliveryAdminDtoToJSON(dto)

    expect(json.offerReasons).toEqual(sampleOfferReasons)
  })

  it('round trips offerReasons through ToJSON and FromJSON unchanged', () => {
    const first = DeliveryAdminDtoFromJSON({ ...baseJson, offerReasons: sampleOfferReasons })

    const again = DeliveryAdminDtoFromJSON(DeliveryAdminDtoToJSON(first))

    expect(again.offerReasons).toEqual(sampleOfferReasons)
  })
})

// Spec 0043 (AC-1, AC-8): boxSize, boxUnits, and boxSizeAssumed on the delivery record.
describe('DeliveryAdminDto box fields (spec 0043, AC-1, AC-8)', () => {
  const baseJson = {
    id: 'd-box-1',
    pickupReadyAt: '2026-11-20T10:00:00.000Z',
    pickupDeadlineAt: '2026-11-20T10:30:00.000Z',
    dropoffReadyAt: '2026-11-20T10:15:00.000Z',
    dropoffEta: null,
    dropoffDeadlineAt: '2026-11-20T10:45:00.000Z',
    createdAt: '2026-11-20T09:55:00.000Z',
  }

  it('DeliveryAdminDtoFromJSON reads boxSize, boxUnits, and boxSizeAssumed when sent', () => {
    const dto = DeliveryAdminDtoFromJSON({
      ...baseJson,
      boxSize: 'MEDIUM',
      boxUnits: 50,
      boxSizeAssumed: true,
    })

    expect(dto.boxSize).toBe('MEDIUM')
    expect(dto.boxUnits).toBe(50)
    expect(dto.boxSizeAssumed).toBe(true)
  })

  it('DeliveryAdminDtoFromJSON leaves them undefined when absent from older backend', () => {
    const dto = DeliveryAdminDtoFromJSON(baseJson)

    expect(dto.boxSize).toBeUndefined()
    expect(dto.boxUnits).toBeUndefined()
    expect(dto.boxSizeAssumed).toBeUndefined()
  })

  it('DeliveryAdminDtoToJSON writes boxSize, boxUnits, and boxSizeAssumed', () => {
    const dto = DeliveryAdminDtoFromJSON({
      ...baseJson,
      boxSize: 'SMALL',
      boxUnits: 30,
      boxSizeAssumed: false,
    })

    const json = DeliveryAdminDtoToJSON(dto)

    expect(json.boxSize).toBe('SMALL')
    expect(json.boxUnits).toBe(30)
    expect(json.boxSizeAssumed).toBe(false)
  })

  it('round-trips box fields through ToJSON and FromJSON unchanged', () => {
    const first = DeliveryAdminDtoFromJSON({
      ...baseJson,
      boxSize: 'LARGE',
      boxUnits: 100,
      boxSizeAssumed: false,
    })

    const second = DeliveryAdminDtoFromJSON(DeliveryAdminDtoToJSON(first))

    expect(second.boxSize).toBe('LARGE')
    expect(second.boxUnits).toBe(100)
    expect(second.boxSizeAssumed).toBe(false)
  })
})

// Spec 0048 (AC-12, row 80): offerGroupId and stackStops for two deliveries offered together (a stack).
describe('DeliveryAdminDto offerGroupId and stackStops (spec 0048, row 80)', () => {
  const baseJson = {
    id: 'd-stack-1',
    pickupReadyAt: '2026-11-22T10:00:00.000Z',
    pickupDeadlineAt: '2026-11-22T10:30:00.000Z',
    dropoffReadyAt: '2026-11-22T10:15:00.000Z',
    dropoffEta: null,
    dropoffDeadlineAt: '2026-11-22T10:45:00.000Z',
    createdAt: '2026-11-22T09:55:00.000Z',
  }

  const sampleStops = [
    { deliveryId: 'd-stack-1', stop: 'PICKUP' as const },
    { deliveryId: 'd-stack-2', stop: 'PICKUP' as const },
    { deliveryId: 'd-stack-1', stop: 'DROPOFF' as const },
    { deliveryId: 'd-stack-2', stop: 'DROPOFF' as const },
  ]

  it('DeliveryAdminDtoFromJSON reads offerGroupId and stackStops when provided', () => {
    const dto = DeliveryAdminDtoFromJSON({
      ...baseJson,
      offerGroupId: 'og-stack-123',
      stackStops: sampleStops,
    })

    expect(dto.offerGroupId).toBe('og-stack-123')
    expect(dto.stackStops).toEqual(sampleStops)
  })

  it('DeliveryAdminDtoFromJSON defaults offerGroupId and stackStops to null when omitted', () => {
    const dto = DeliveryAdminDtoFromJSON(baseJson)

    expect(dto.offerGroupId).toBeNull()
    expect(dto.stackStops).toBeNull()
  })

  it('DeliveryAdminDtoToJSON writes offerGroupId and stackStops', () => {
    const dto = DeliveryAdminDtoFromJSON({
      ...baseJson,
      offerGroupId: 'og-stack-456',
      stackStops: sampleStops,
    })

    const json = DeliveryAdminDtoToJSON(dto)

    expect(json.offerGroupId).toBe('og-stack-456')
    expect(json.stackStops).toEqual(sampleStops)
  })

  it('round-trips offerGroupId and stackStops through ToJSON and FromJSON unchanged', () => {
    const first = DeliveryAdminDtoFromJSON({
      ...baseJson,
      offerGroupId: 'og-stack-789',
      stackStops: sampleStops,
    })

    const second = DeliveryAdminDtoFromJSON(DeliveryAdminDtoToJSON(first))

    expect(second.offerGroupId).toBe('og-stack-789')
    expect(second.stackStops).toEqual(sampleStops)
  })
})
