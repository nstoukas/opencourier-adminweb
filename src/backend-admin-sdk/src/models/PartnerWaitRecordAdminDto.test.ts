import { PartnerWaitRecordAdminDtoFromJSON } from './PartnerWaitRecordAdminDto'

// Spec 0030 (AC-6): partner wait record DTO in the hand-edited SDK.
describe('PartnerWaitRecordAdminDto (spec 0030)', () => {
  describe('PartnerWaitRecordAdminDtoFromJSON', () => {
    it('parses all wait record fields when fully populated', () => {
      const json = {
        days: 30,
        orderCount: 45,
        waitSamples: 40,
        averageWaitMinutes: 5.2,
        lateShare: 0.15,
        prepSamples: 38,
        medianPrepMinutes: 20,
        usualPrepMinutes: 15,
      }

      const dto = PartnerWaitRecordAdminDtoFromJSON(json)

      expect(dto.days).toBe(30)
      expect(dto.orderCount).toBe(45)
      expect(dto.waitSamples).toBe(40)
      expect(dto.averageWaitMinutes).toBe(5.2)
      expect(dto.lateShare).toBe(0.15)
      expect(dto.prepSamples).toBe(38)
      expect(dto.medianPrepMinutes).toBe(20)
      expect(dto.usualPrepMinutes).toBe(15)
    })

    it('converts null or missing optional figure fields to null', () => {
      const json = {
        days: 7,
        orderCount: 0,
        waitSamples: 0,
        averageWaitMinutes: null,
        lateShare: null,
        prepSamples: 0,
        medianPrepMinutes: null,
        usualPrepMinutes: 15,
      }

      const dto = PartnerWaitRecordAdminDtoFromJSON(json)

      expect(dto.days).toBe(7)
      expect(dto.orderCount).toBe(0)
      expect(dto.waitSamples).toBe(0)
      expect(dto.averageWaitMinutes).toBeNull()
      expect(dto.lateShare).toBeNull()
      expect(dto.prepSamples).toBe(0)
      expect(dto.medianPrepMinutes).toBeNull()
      expect(dto.usualPrepMinutes).toBe(15)
    })

    it('defaults undefined optional figure fields to null using nullish coalescing', () => {
      const json = {
        days: 90,
        orderCount: 0,
        waitSamples: 0,
        prepSamples: 0,
        usualPrepMinutes: 10,
      }

      const dto = PartnerWaitRecordAdminDtoFromJSON(json)

      expect(dto.averageWaitMinutes).toBeNull()
      expect(dto.lateShare).toBeNull()
      expect(dto.medianPrepMinutes).toBeNull()
    })
  })
})
