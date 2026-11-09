import {
  PartnerAvailabilityAdminDtoFromJSON,
  PartnerAvailabilityChangeAdminDtoFromJSON,
} from './PartnerAvailabilityAdminDto'
import { PartnerAdminDtoFromJSON } from './PartnerAdminDto'

// Spec 0029 (AC-7, AC-9): restaurant availability and change history DTOs in the hand-edited SDK.
describe('PartnerAvailabilityAdminDto (spec 0029)', () => {
  describe('PartnerAvailabilityAdminDtoFromJSON', () => {
    it('parses availability fields with dates and booleans when fully populated', () => {
      const json = {
        busyExtraMinutes: 15,
        pausedUntil: '2026-11-09T14:30:00.000Z',
        disabledAt: '2026-11-09T12:00:00.000Z',
        disabledReason: 'Health inspection pending',
        acceptingOrders: false,
        notAcceptingReason: 'The co-op has disabled this restaurant: Health inspection pending',
      }

      const dto = PartnerAvailabilityAdminDtoFromJSON(json)

      expect(dto.busyExtraMinutes).toBe(15)
      expect(dto.pausedUntil).toEqual(new Date('2026-11-09T14:30:00.000Z'))
      expect(dto.disabledAt).toEqual(new Date('2026-11-09T12:00:00.000Z'))
      expect(dto.disabledReason).toBe('Health inspection pending')
      expect(dto.acceptingOrders).toBe(false)
      expect(dto.notAcceptingReason).toBe('The co-op has disabled this restaurant: Health inspection pending')
    })

    it('converts null fields to null (not undefined) when availability is off/enabled', () => {
      const json = {
        busyExtraMinutes: null,
        pausedUntil: null,
        disabledAt: null,
        disabledReason: null,
        acceptingOrders: true,
        notAcceptingReason: null,
      }

      const dto = PartnerAvailabilityAdminDtoFromJSON(json)

      expect(dto.busyExtraMinutes).toBeNull()
      expect(dto.pausedUntil).toBeNull()
      expect(dto.disabledAt).toBeNull()
      expect(dto.disabledReason).toBeNull()
      expect(dto.acceptingOrders).toBe(true)
      expect(dto.notAcceptingReason).toBeNull()
    })
  })

  describe('PartnerAvailabilityChangeAdminDtoFromJSON', () => {
    it('parses change record with all fields and converts dates', () => {
      const json = {
        id: 'change-1',
        action: 'BUSY_ON',
        actorRole: 'ADMIN',
        actorEmail: 'admin@opencourier.org',
        extraMinutes: 15,
        pausedUntil: null,
        reason: null,
        createdAt: '2026-11-09T10:00:00.000Z',
      }

      const dto = PartnerAvailabilityChangeAdminDtoFromJSON(json)

      expect(dto.id).toBe('change-1')
      expect(dto.action).toBe('BUSY_ON')
      expect(dto.actorRole).toBe('ADMIN')
      expect(dto.actorEmail).toBe('admin@opencourier.org')
      expect(dto.extraMinutes).toBe(15)
      expect(dto.pausedUntil).toBeNull()
      expect(dto.reason).toBeNull()
      expect(dto.createdAt).toEqual(new Date('2026-11-09T10:00:00.000Z'))
    })

    it('parses PAUSED change with pausedUntil date', () => {
      const json = {
        id: 'change-2',
        action: 'PAUSED',
        actorRole: 'PARTNER',
        actorEmail: null,
        extraMinutes: null,
        pausedUntil: '2026-11-09T15:00:00.000Z',
        reason: null,
        createdAt: '2026-11-09T13:00:00.000Z',
      }

      const dto = PartnerAvailabilityChangeAdminDtoFromJSON(json)

      expect(dto.action).toBe('PAUSED')
      expect(dto.actorEmail).toBeNull()
      expect(dto.pausedUntil).toEqual(new Date('2026-11-09T15:00:00.000Z'))
      expect(dto.createdAt).toEqual(new Date('2026-11-09T13:00:00.000Z'))
    })
  })

  describe('PartnerAdminDto integration with availability', () => {
    const minimalPartnerJson = {
      id: 'partner-1',
      name: 'Test Kitchen',
      phoneNumber: '+302421012345',
      createdAt: '2026-11-01T10:00:00.000Z',
      updatedAt: '2026-11-01T10:00:00.000Z',
    }

    it('deserializes availability on PartnerAdminDto when present', () => {
      const json = {
        ...minimalPartnerJson,
        availability: {
          busyExtraMinutes: 10,
          pausedUntil: null,
          disabledAt: null,
          disabledReason: null,
          acceptingOrders: true,
          notAcceptingReason: null,
        },
      }

      const partner = PartnerAdminDtoFromJSON(json)

      expect(partner.availability).toBeDefined()
      expect(partner.availability?.busyExtraMinutes).toBe(10)
      expect(partner.availability?.acceptingOrders).toBe(true)
    })

    it('leaves availability as undefined when omitted from PartnerAdminDto (backward compatibility)', () => {
      const partner = PartnerAdminDtoFromJSON(minimalPartnerJson)

      expect(partner.availability).toBeUndefined()
    })
  })
})
