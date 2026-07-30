import { listPayoutPolicies, previewReassignmentPayout } from './reassignmentPayout'

// Fixture menu with non-seeded keys to ensure no policy names are hard-coded in the implementation
const fixtureMenu: Record<string, number> = {
  FULL_COMPENSATION: 100,
  HALF_COMPENSATION: 50,
  QUARTER_COMPENSATION: 25,
  NO_COMPENSATION: 0,
}
const defaultPolicyKey = 'HALF_COMPENSATION'

describe('reassignmentPayout utilities', () => {
  describe('listPayoutPolicies', () => {
    it('returns policy options sorted by percentage descending with default flagged', () => {
      const result = listPayoutPolicies(fixtureMenu, defaultPolicyKey)

      expect(result).toEqual([
        { key: 'FULL_COMPENSATION', percent: 100, isDefault: false },
        { key: 'HALF_COMPENSATION', percent: 50, isDefault: true },
        { key: 'QUARTER_COMPENSATION', percent: 25, isDefault: false },
        { key: 'NO_COMPENSATION', percent: 0, isDefault: false },
      ])
    })

    it('returns empty array when policies menu is empty or undefined', () => {
      expect(listPayoutPolicies({}, 'ANYTHING')).toEqual([])
      expect(listPayoutPolicies(undefined, undefined)).toEqual([])
      expect(listPayoutPolicies(null, null)).toEqual([])
    })
  })

  describe('previewReassignmentPayout', () => {
    it('prices custom member-voted policy keys correctly', () => {
      // Binding value 2 check: custom policy voted in after code shipped
      const customMenu = { CO_OP_VOTE_2027: 37 }
      const result = previewReassignmentPayout(customMenu, 'CO_OP_VOTE_2027', undefined, 1000)

      expect(result).toEqual({
        ok: true,
        policy: 'CO_OP_VOTE_2027',
        percent: 37,
        amount: 370,
      })
    })

    it('uses the default policy when no explicit policy is requested', () => {
      const result = previewReassignmentPayout(fixtureMenu, 'HALF_COMPENSATION', undefined, 800)

      expect(result).toEqual({
        ok: true,
        policy: 'HALF_COMPENSATION',
        percent: 50,
        amount: 400,
      })
    })

    it('prefers explicit policy choice over the default policy', () => {
      const result = previewReassignmentPayout(fixtureMenu, 'HALF_COMPENSATION', 'FULL_COMPENSATION', 800)

      expect(result).toEqual({
        ok: true,
        policy: 'FULL_COMPENSATION',
        percent: 100,
        amount: 800,
      })
    })

    it('rounds calculation to nearest integer cents correctly', () => {
      // 333 * 25% = 83.25 => 83 cents
      const res25 = previewReassignmentPayout(fixtureMenu, 'HALF_COMPENSATION', 'QUARTER_COMPENSATION', 333)
      expect(res25).toEqual({
        ok: true,
        policy: 'QUARTER_COMPENSATION',
        percent: 25,
        amount: 83,
      })

      // 333 * 50% = 166.5 => 167 cents
      const res50 = previewReassignmentPayout(fixtureMenu, 'HALF_COMPENSATION', 'HALF_COMPENSATION', 333)
      expect(res50).toEqual({
        ok: true,
        policy: 'HALF_COMPENSATION',
        percent: 50,
        amount: 167,
      })
    })

    it('returns zero amount when totalCompensation is null', () => {
      const result = previewReassignmentPayout(fixtureMenu, 'HALF_COMPENSATION', undefined, null)

      expect(result).toEqual({
        ok: true,
        policy: 'HALF_COMPENSATION',
        percent: 50,
        amount: 0,
      })
    })

    it('returns ok: false and lists all allowed policies when an unknown key is requested', () => {
      const result = previewReassignmentPayout(fixtureMenu, 'HALF_COMPENSATION', 'MADE_UP_KEY', 800)

      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.reason).toContain('MADE_UP_KEY')
        expect(result.reason).toContain('FULL_COMPENSATION')
        expect(result.reason).toContain('HALF_COMPENSATION')
        expect(result.reason).toContain('QUARTER_COMPENSATION')
        expect(result.reason).toContain('NO_COMPENSATION')
      }
    })

    it('blocks invalid percentage values in instance config', () => {
      const overMenu = { BAD: 150 }
      const overResult = previewReassignmentPayout(overMenu, 'BAD', undefined, 800)
      expect(overResult.ok).toBe(false)
      if (!overResult.ok) {
        expect(overResult.reason).toContain('150')
      }

      const nanMenu = { BAD: NaN }
      const nanResult = previewReassignmentPayout(nanMenu, 'BAD', undefined, 800)
      expect(nanResult.ok).toBe(false)
    })

    it('treats 0% as a valid policy rather than a failure', () => {
      const result = previewReassignmentPayout(fixtureMenu, 'HALF_COMPENSATION', 'NO_COMPENSATION', 800)

      expect(result).toEqual({
        ok: true,
        policy: 'NO_COMPENSATION',
        percent: 0,
        amount: 0,
      })
    })
  })
})
