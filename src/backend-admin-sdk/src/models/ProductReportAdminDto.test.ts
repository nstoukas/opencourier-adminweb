import {
  ProductReportAdminDtoFromJSON,
  ProductReportAdminDto,
} from './ProductReportAdminDto'

describe('ProductReportAdminDto (spec 0032, AC-1, AC-6)', () => {
  it('parses valid JSON, turns createdAt and resolvedAt into Dates, and preserves all report fields', () => {
    const json = {
      id: 'pr-101',
      deliveryId: 'del-101',
      kind: 'WRONG_ITEM',
      source: 'COURIER',
      reporterEmail: 'rider@example.com',
      itemName: 'Greek Salad',
      note: 'Ordered Greek salad but received caesar',
      resolvedAt: '2026-11-09T09:30:00.000Z',
      resolution: 'Refunded customer',
      createdAt: '2026-11-09T09:00:00.000Z',
    }

    const dto = ProductReportAdminDtoFromJSON(json)

    expect(dto.id).toBe('pr-101')
    expect(dto.deliveryId).toBe('del-101')
    expect(dto.kind).toBe('WRONG_ITEM')
    expect(dto.source).toBe('COURIER')
    expect(dto.reporterEmail).toBe('rider@example.com')
    expect(dto.itemName).toBe('Greek Salad')
    expect(dto.note).toBe('Ordered Greek salad but received caesar')
    expect(dto.resolution).toBe('Refunded customer')
    expect(dto.createdAt).toBeInstanceOf(Date)
    expect(dto.createdAt.toISOString()).toBe('2026-11-09T09:00:00.000Z')
    expect(dto.resolvedAt).toBeInstanceOf(Date)
    expect(dto.resolvedAt?.toISOString()).toBe('2026-11-09T09:30:00.000Z')
  })

  it('maps missing (undefined) optional fields to null for an open report', () => {
    const json = {
      id: 'pr-102',
      deliveryId: 'del-102',
      kind: 'MISSING_ITEM',
      source: 'PARTNER',
      createdAt: '2026-11-09T10:00:00.000Z',
    }

    const dto = ProductReportAdminDtoFromJSON(json)

    expect(dto.id).toBe('pr-102')
    expect(dto.deliveryId).toBe('del-102')
    expect(dto.kind).toBe('MISSING_ITEM')
    expect(dto.source).toBe('PARTNER')
    expect(dto.reporterEmail).toBeNull()
    expect(dto.itemName).toBeNull()
    expect(dto.note).toBeNull()
    expect(dto.resolvedAt).toBeNull()
    expect(dto.resolution).toBeNull()
    expect(dto.createdAt).toBeInstanceOf(Date)
    expect(dto.createdAt.toISOString()).toBe('2026-11-09T10:00:00.000Z')
  })

  it('maps explicit null optional fields to null', () => {
    const json = {
      id: 'pr-103',
      deliveryId: 'del-103',
      kind: 'WRONG_ITEM',
      source: 'ADMIN',
      reporterEmail: null,
      itemName: null,
      note: 'Phoned co-op: missing drink',
      resolvedAt: null,
      resolution: null,
      createdAt: '2026-11-09T11:00:00.000Z',
    }

    const dto = ProductReportAdminDtoFromJSON(json)

    expect(dto.id).toBe('pr-103')
    expect(dto.deliveryId).toBe('del-103')
    expect(dto.kind).toBe('WRONG_ITEM')
    expect(dto.source).toBe('ADMIN')
    expect(dto.reporterEmail).toBeNull()
    expect(dto.itemName).toBeNull()
    expect(dto.note).toBe('Phoned co-op: missing drink')
    expect(dto.resolvedAt).toBeNull()
    expect(dto.resolution).toBeNull()
    expect(dto.createdAt).toBeInstanceOf(Date)
  })
})
