import {
  buildPayoutPolicyInput,
  normalizePolicyKey,
  policiesToRows,
} from './payoutPolicyForm'
import type { PayoutPolicyFormState } from './payoutPolicyForm'

describe('payoutPolicyForm utility', () => {
  describe('normalizePolicyKey', () => {
    it('trims, uppercases, and replaces spaces with underscores', () => {
      expect(normalizePolicyKey('  half compensation ')).toBe('HALF_COMPENSATION')
    })
  })

  describe('policiesToRows', () => {
    it('orders rows by percentage descending and sets defaultRowId to matching key', () => {
      const policies = { FULL: 100, HALF: 50, NONE: 0 }
      const result = policiesToRows(policies, 'HALF')

      expect(result.rows).toHaveLength(3)
      expect(result.rows[0]?.key).toBe('FULL')
      expect(result.rows[0]?.percent).toBe('100')
      expect(result.rows[1]?.key).toBe('HALF')
      expect(result.rows[1]?.percent).toBe('50')
      expect(result.rows[2]?.key).toBe('NONE')
      expect(result.rows[2]?.percent).toBe('0')
      // defaultRowId points to the row with key === 'HALF'
      expect(result.defaultRowId).toBe(result.rows[1]?.id)
    })

    it('returns empty rows and empty defaultRowId when policies menu is empty', () => {
      expect(policiesToRows({}, 'FULL')).toEqual({ rows: [], defaultRowId: '' })
      expect(policiesToRows(null, null)).toEqual({ rows: [], defaultRowId: '' })
      expect(policiesToRows(undefined, undefined)).toEqual({ rows: [], defaultRowId: '' })
    })

    it('falls back to the first row id when requested default policy is missing from menu', () => {
      const result = policiesToRows({ A: 10 }, 'MISSING')
      expect(result.rows).toHaveLength(1)
      expect(result.defaultRowId).toBe(result.rows[0]?.id)
    })
  })

  describe('buildPayoutPolicyInput', () => {
    it('successfully builds payload object with numeric percentages for valid rows', () => {
      const state: PayoutPolicyFormState = {
        rows: [
          { id: 'row-1', key: 'FULL_COMPENSATION', percent: '100' },
          { id: 'row-2', key: 'HALF_COMPENSATION', percent: '50' },
        ],
        defaultRowId: 'row-1',
      }

      const result = buildPayoutPolicyInput(state)

      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.policies).toEqual({
          FULL_COMPENSATION: 100,
          HALF_COMPENSATION: 50,
        })
        expect(result.defaultPolicy).toBe('FULL_COMPENSATION')
        // Explicitly check that percentages are stored as numbers, not strings
        expect(typeof result.policies.FULL_COMPENSATION).toBe('number')
        expect(typeof result.policies.HALF_COMPENSATION).toBe('number')
      }
    })

    it('treats percentage of "0" as valid (NO_COMPENSATION policy)', () => {
      const state: PayoutPolicyFormState = {
        rows: [{ id: 'row-1', key: 'NO_COMPENSATION', percent: '0' }],
        defaultRowId: 'row-1',
      }

      const result = buildPayoutPolicyInput(state)

      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.policies).toEqual({ NO_COMPENSATION: 0 })
      }
    })

    it('fails validation when rows array is empty', () => {
      const state: PayoutPolicyFormState = { rows: [], defaultRowId: '' }
      const result = buildPayoutPolicyInput(state)

      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.errors).toContain('Add at least one payout policy. Reassignment cannot run without one.')
      }
    })

    it('fails validation when policy name is blank', () => {
      const state: PayoutPolicyFormState = {
        rows: [{ id: 'row-1', key: '   ', percent: '100' }],
        defaultRowId: 'row-1',
      }
      const result = buildPayoutPolicyInput(state)

      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.errors).toContain('Row 1: policy name is required.')
      }
    })

    it('fails validation when policy name contains invalid characters', () => {
      const state: PayoutPolicyFormState = {
        rows: [{ id: 'row-1', key: 'half comp!', percent: '50' }],
        defaultRowId: 'row-1',
      }
      const result = buildPayoutPolicyInput(state)

      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.errors).toContain('Row 1: use only letters, numbers and underscores in a policy name.')
      }
    })

    it('fails validation when percentage is out of range or empty', () => {
      // Out of range > 100
      const resOver = buildPayoutPolicyInput({
        rows: [{ id: 'r1', key: 'P1', percent: '150' }],
        defaultRowId: 'r1',
      })
      expect(resOver.ok).toBe(false)
      if (!resOver.ok) {
        expect(resOver.errors).toContain('Row 1: percentage must be a number between 0 and 100.')
      }

      // Negative < 0
      const resNeg = buildPayoutPolicyInput({
        rows: [{ id: 'r1', key: 'P1', percent: '-1' }],
        defaultRowId: 'r1',
      })
      expect(resNeg.ok).toBe(false)
      if (!resNeg.ok) {
        expect(resNeg.errors).toContain('Row 1: percentage must be a number between 0 and 100.')
      }

      // Empty string (must not be silently coerced to 0 via Number(''))
      const resEmpty = buildPayoutPolicyInput({
        rows: [{ id: 'r1', key: 'P1', percent: '' }],
        defaultRowId: 'r1',
      })
      expect(resEmpty.ok).toBe(false)
      if (!resEmpty.ok) {
        expect(resEmpty.errors).toContain('Row 1: percentage is required.')
      }

      // Whitespace string (must not be silently coerced to 0 via Number('   '))
      const resSpace = buildPayoutPolicyInput({
        rows: [{ id: 'r1', key: 'P1', percent: '   ' }],
        defaultRowId: 'r1',
      })
      expect(resSpace.ok).toBe(false)
      if (!resSpace.ok) {
        expect(resSpace.errors).toContain('Row 1: percentage is required.')
      }
    })

    it('fails validation when two rows normalize to the same policy key', () => {
      const state: PayoutPolicyFormState = {
        rows: [
          { id: 'r1', key: 'FULL', percent: '100' },
          { id: 'r2', key: 'full', percent: '50' },
        ],
        defaultRowId: 'r1',
      }
      const result = buildPayoutPolicyInput(state)

      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.errors).toContain('Two policies are both named FULL. Policy names must be unique.')
      }
    })

    it('fails validation when defaultRowId does not match any existing row', () => {
      const state: PayoutPolicyFormState = {
        rows: [{ id: 'r1', key: 'FULL', percent: '100' }],
        defaultRowId: 'non-existent-id',
      }
      const result = buildPayoutPolicyInput(state)

      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.errors).toContain('Choose which policy is the default.')
      }
    })

    it('collects and reports all validation errors together', () => {
      const state: PayoutPolicyFormState = {
        rows: [
          { id: 'r1', key: '', percent: '150' }, // Row 1: missing name AND percent > 100
          { id: 'r2', key: 'VALID_KEY', percent: '50' },
        ],
        defaultRowId: 'non-existent',
      }
      const result = buildPayoutPolicyInput(state)

      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.errors.length).toBeGreaterThanOrEqual(3)
        expect(result.errors).toContain('Row 1: policy name is required.')
        expect(result.errors).toContain('Row 1: percentage must be a number between 0 and 100.')
        expect(result.errors).toContain('Choose which policy is the default.')
      }
    })

    it('preserves policies and defaultPolicy through a conversion round trip', () => {
      const inputPolicies = {
        FULL_COMPENSATION: 100,
        HALF_COMPENSATION: 50,
        NO_COMPENSATION: 0,
      }
      const inputDefault = 'FULL_COMPENSATION'

      const formState = policiesToRows(inputPolicies, inputDefault)
      const built = buildPayoutPolicyInput(formState)

      expect(built.ok).toBe(true)
      if (built.ok) {
        expect(built.policies).toEqual(inputPolicies)
        expect(built.defaultPolicy).toBe(inputDefault)
      }
    })
  })
})
