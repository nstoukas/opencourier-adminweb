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

    // Row 162: apiKeyRemovedByResetAt parsing (ISO text to Date, null or missing to null)
    it('reads apiKeyRemovedByResetAt as a Date instance when present (row 162)', () => {
      const json = {
        ...baseJson,
        apiKeyRemovedByResetAt: '2026-11-25T12:05:00.000Z',
      }

      const dto = PartnerAdminDtoFromJSON(json)

      expect(dto.apiKeyRemovedByResetAt).toBeInstanceOf(Date)
      expect(dto.apiKeyRemovedByResetAt).toEqual(new Date('2026-11-25T12:05:00.000Z'))
    })

    it('reads apiKeyRemovedByResetAt as null when null (row 162)', () => {
      const json = {
        ...baseJson,
        apiKeyRemovedByResetAt: null,
      }

      const dto = PartnerAdminDtoFromJSON(json)

      expect(dto.apiKeyRemovedByResetAt).toBeNull()
    })

    it('reads apiKeyRemovedByResetAt as null when missing from json (row 162)', () => {
      const json = {
        ...baseJson,
      }

      const dto = PartnerAdminDtoFromJSON(json)

      expect(dto.apiKeyRemovedByResetAt).toBeNull()
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

    it('serializes apiKeyCreatedAt as null when undefined (minor 4)', () => {
      const dto: any = {
        id: 'partner-123',
        name: 'Volos Kitchen',
        phoneNumber: '+302421099999',
        logo: null,
        webhookUrl: null,
        usualPrepMinutes: 15,
        userId: 'user-456',
        email: 'volos@kitchen.gr',
        apiKeyCreatedAt: undefined,
        pickupAddress: null,
        createdAt: new Date('2026-11-01T10:00:00.000Z'),
        updatedAt: new Date('2026-11-01T10:00:00.000Z'),
      }

      const json = PartnerAdminDtoToJSON(dto)

      expect(json.apiKeyCreatedAt).toBeNull()
    })

    // Row 162: apiKeyRemovedByResetAt serialization (Date to ISO string, null or undefined to null)
    it('serializes apiKeyRemovedByResetAt to ISO string when Date (row 162)', () => {
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
        apiKeyRemovedByResetAt: new Date('2026-11-25T12:05:00.000Z'),
        pickupAddress: null,
        createdAt: new Date('2026-11-01T10:00:00.000Z'),
        updatedAt: new Date('2026-11-01T10:00:00.000Z'),
      }

      const json = PartnerAdminDtoToJSON(dto)

      expect(json.apiKeyRemovedByResetAt).toBe('2026-11-25T12:05:00.000Z')
    })

    it('serializes apiKeyRemovedByResetAt as null when null (row 162)', () => {
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
        apiKeyRemovedByResetAt: null,
        pickupAddress: null,
        createdAt: new Date('2026-11-01T10:00:00.000Z'),
        updatedAt: new Date('2026-11-01T10:00:00.000Z'),
      }

      const json = PartnerAdminDtoToJSON(dto)

      expect(json.apiKeyRemovedByResetAt).toBeNull()
    })

    it('serializes apiKeyRemovedByResetAt as null when undefined (row 162)', () => {
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
        apiKeyRemovedByResetAt: undefined,
        pickupAddress: null,
        createdAt: new Date('2026-11-01T10:00:00.000Z'),
        updatedAt: new Date('2026-11-01T10:00:00.000Z'),
      }

      const json = PartnerAdminDtoToJSON(dto)

      expect(json.apiKeyRemovedByResetAt).toBeNull()
    })
  })
})
