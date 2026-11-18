import { PartnerAdminDtoFromJSON, PartnerAdminDtoToJSON, PartnerAdminDto } from './PartnerAdminDto'

// Spec 0037 (AC-5): PartnerAdminDto apiKeyCreatedAt parsing and serialization
describe('PartnerAdminDto (spec 0037)', () => {
  const baseJson = {
    id: 'partner-123',
    name: 'Volos Kitchen',
    phoneNumber: '+302421099999',
    logo: null,
    webhookUrl: null,
    usualPrepMinutes: 15,
    userId: 'user-456',
    email: 'volos@kitchen.gr',
    pickupAddress: null,
    createdAt: '2026-11-01T10:00:00.000Z',
    updatedAt: '2026-11-01T10:00:00.000Z',
  }

  describe('PartnerAdminDtoFromJSON', () => {
    it('reads apiKeyCreatedAt as a Date instance when present', () => {
      const json = {
        ...baseJson,
        apiKeyCreatedAt: '2026-11-18T15:30:00.000Z',
      }

      const dto = PartnerAdminDtoFromJSON(json)

      expect(dto.apiKeyCreatedAt).toBeInstanceOf(Date)
      expect(dto.apiKeyCreatedAt).toEqual(new Date('2026-11-18T15:30:00.000Z'))
    })

    it('reads apiKeyCreatedAt as null when null', () => {
      const json = {
        ...baseJson,
        apiKeyCreatedAt: null,
      }

      const dto = PartnerAdminDtoFromJSON(json)

      expect(dto.apiKeyCreatedAt).toBeNull()
    })

    it('reads apiKeyCreatedAt as null when missing from json', () => {
      const json = {
        ...baseJson,
      }

      const dto = PartnerAdminDtoFromJSON(json)

      expect(dto.apiKeyCreatedAt).toBeNull()
    })
  })

  describe('PartnerAdminDtoToJSON', () => {
    it('serializes apiKeyCreatedAt to ISO string when Date', () => {
      const dto: PartnerAdminDto = {
        id: 'partner-123',
        name: 'Volos Kitchen',
        phoneNumber: '+302421099999',
        logo: null,
        webhookUrl: null,
        usualPrepMinutes: 15,
        userId: 'user-456',
        email: 'volos@kitchen.gr',
        apiKeyCreatedAt: new Date('2026-11-18T15:30:00.000Z'),
        pickupAddress: null,
        createdAt: new Date('2026-11-01T10:00:00.000Z'),
        updatedAt: new Date('2026-11-01T10:00:00.000Z'),
      }

      const json = PartnerAdminDtoToJSON(dto)

      expect(json.apiKeyCreatedAt).toBe('2026-11-18T15:30:00.000Z')
    })

    it('serializes apiKeyCreatedAt as null when null', () => {
      const dto: PartnerAdminDto = {
        id: 'partner-123',
        name: 'Volos Kitchen',
        phoneNumber: '+302421099999',
        logo: null,
        webhookUrl: null,
        usualPrepMinutes: 15,
        userId: 'user-456',
        email: 'volos@kitchen.gr',
        apiKeyCreatedAt: null,
        pickupAddress: null,
        createdAt: new Date('2026-11-01T10:00:00.000Z'),
        updatedAt: new Date('2026-11-01T10:00:00.000Z'),
      }

      const json = PartnerAdminDtoToJSON(dto)

      expect(json.apiKeyCreatedAt).toBeNull()
    })
  })
})
