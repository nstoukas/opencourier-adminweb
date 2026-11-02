import {
  DeliveryIssueAdminDtoFromJSON,
  DeliveryIssueAdminDtoToJSON,
  instanceOfDeliveryIssueAdminDto,
  DeliveryIssueAdminDto,
} from './DeliveryIssueAdminDto'

describe('DeliveryIssueAdminDto (decision 66.11)', () => {
  it('DeliveryIssueAdminDtoFromJSON turns createdAt into a Date and maps missing or null note to null, preserving all report fields', () => {
    // Contract (1): parses valid JSON, transforms createdAt to Date, keeps all required fields
    const json = {
      id: 'issue-101',
      reason: 'WRONG_ADDRESS',
      note: 'Gate code 4321 did not work',
      createdAt: '2026-10-27T10:14:00.000Z',
      courierId: 'courier-1',
      courierName: 'Testing Courier',
    }

    const dto = DeliveryIssueAdminDtoFromJSON(json)

    expect(dto.id).toBe('issue-101')
    expect(dto.reason).toBe('WRONG_ADDRESS')
    expect(dto.note).toBe('Gate code 4321 did not work')
    expect(dto.createdAt).toBeInstanceOf(Date)
    expect(dto.createdAt.toISOString()).toBe('2026-10-27T10:14:00.000Z')
    expect(dto.courierId).toBe('courier-1')
    expect(dto.courierName).toBe('Testing Courier')
  })

  it('DeliveryIssueAdminDtoFromJSON maps undefined (missing) note to null', () => {
    // Contract (1): a missing note must become null, not undefined
    const jsonWithoutNote = {
      id: 'issue-102',
      reason: 'NO_SIGNAL',
      createdAt: '2026-10-27T10:15:00.000Z',
      courierId: 'courier-2',
      courierName: 'Second Courier',
    }

    const dto = DeliveryIssueAdminDtoFromJSON(jsonWithoutNote)

    expect(dto.note).toBeNull()
  })

  it('DeliveryIssueAdminDtoFromJSON maps explicit null note to null', () => {
    // Contract (1): an explicit null note stays null
    const jsonWithNullNote = {
      id: 'issue-103',
      reason: 'ORDER_HANDED',
      note: null,
      createdAt: '2026-10-27T10:16:00.000Z',
      courierId: 'courier-3',
      courierName: 'Third Courier',
    }

    const dto = DeliveryIssueAdminDtoFromJSON(jsonWithNullNote)

    expect(dto.note).toBeNull()
  })

  it('DeliveryIssueAdminDtoFromJSON handles null and undefined inputs cleanly', () => {
    expect(DeliveryIssueAdminDtoFromJSON(null)).toBeNull()
    expect(DeliveryIssueAdminDtoFromJSON(undefined)).toBeUndefined()
  })

  it('DeliveryIssueAdminDtoToJSON serializes Date back to ISO string and handles null/undefined', () => {
    const dto: DeliveryIssueAdminDto = {
      id: 'issue-104',
      reason: 'OTHER',
      note: 'Customer asked to wait 5 minutes',
      createdAt: new Date('2026-10-27T10:20:00.000Z'),
      courierId: 'courier-4',
      courierName: 'Fourth Courier',
    }

    const json = DeliveryIssueAdminDtoToJSON(dto)

    expect(json).toEqual({
      id: 'issue-104',
      reason: 'OTHER',
      note: 'Customer asked to wait 5 minutes',
      createdAt: '2026-10-27T10:20:00.000Z',
      courierId: 'courier-4',
      courierName: 'Fourth Courier',
    })

    expect(DeliveryIssueAdminDtoToJSON(null)).toBeNull()
    expect(DeliveryIssueAdminDtoToJSON(undefined)).toBeUndefined()
  })

  it('instanceOfDeliveryIssueAdminDto verifies presence of id and reason', () => {
    expect(instanceOfDeliveryIssueAdminDto({ id: 'i1', reason: 'WRONG_ADDRESS' })).toBe(true)
    expect(instanceOfDeliveryIssueAdminDto({ id: 'i1' })).toBe(false)
    expect(instanceOfDeliveryIssueAdminDto({ reason: 'WRONG_ADDRESS' })).toBe(false)
    expect(instanceOfDeliveryIssueAdminDto({})).toBe(false)
  })
})
