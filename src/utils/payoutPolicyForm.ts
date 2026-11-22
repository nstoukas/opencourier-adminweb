import { keyMessage, type ShownMessage } from '@/i18n/shownMessage'
import { listPayoutPolicies } from './reassignmentPayout'

// Represents a single editable row in the reassignment payout policy editor.
export type PayoutPolicyRow = {
  id: string
  key: string
  percent: string
}

// Form state containing editable rows and selected default row ID.
export type PayoutPolicyFormState = {
  rows: PayoutPolicyRow[]
  defaultRowId: string
}

// Result of validating and building reassignment payout policy data. Each error is a translation key with
// its values (spec 0054), so the editor keeps it in state and words it in the reader's language when drawn.
export type BuiltPayoutPolicies =
  | { ok: true; policies: Record<string, number>; defaultPolicy: string }
  | { ok: false; errors: ShownMessage[] }

// Converts raw policy key string into uppercase snake_case format.
export function normalizePolicyKey(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, '_')
}

// Maps backend policy record and default policy name into editable form state.
export function policiesToRows(
  policies: Record<string, number> | null | undefined,
  defaultPolicy: string | null | undefined,
): PayoutPolicyFormState {
  const options = listPayoutPolicies(policies, defaultPolicy)
  const rows: PayoutPolicyRow[] = options.map((option, index) => ({
    id: `policy-${index}`,
    key: option.key,
    percent: String(option.percent),
  }))

  const defaultRow = rows.find((row) => row.key === defaultPolicy)
  const firstRow = rows[0]
  const defaultRowId = defaultRow ? defaultRow.id : firstRow ? firstRow.id : ''

  return { rows, defaultRowId }
}

// Validates policy form state and produces payload object or array of error messages.
export function buildPayoutPolicyInput(state: PayoutPolicyFormState): BuiltPayoutPolicies {
  const errors: ShownMessage[] = []

  if (state.rows.length === 0) {
    errors.push(keyMessage('settings.payoutPolicies.errors.none'))
  }

  const keyCounts = new Map<string, number>()

  state.rows.forEach((row, index) => {
    const position = index + 1
    const key = normalizePolicyKey(row.key)

    if (key === '') {
      errors.push(keyMessage('settings.payoutPolicies.errors.nameRequired', { position }))
    } else if (!/^[A-Z0-9_]+$/.test(key)) {
      errors.push(keyMessage('settings.payoutPolicies.errors.nameCharacters', { position }))
    } else {
      keyCounts.set(key, (keyCounts.get(key) ?? 0) + 1)
    }

    if (row.percent.trim() === '') {
      errors.push(keyMessage('settings.payoutPolicies.errors.percentRequired', { position }))
    } else {
      const percent = Number(row.percent)
      if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
        errors.push(keyMessage('settings.payoutPolicies.errors.percentRange', { position }))
      }
    }
  })

  keyCounts.forEach((count, key) => {
    if (count > 1) {
      errors.push(keyMessage('settings.payoutPolicies.errors.duplicate', { name: key }))
    }
  })

  const hasDefaultRow = state.rows.some((row) => row.id === state.defaultRowId)
  if (state.rows.length > 0 && !hasDefaultRow) {
    errors.push(keyMessage('settings.payoutPolicies.errors.chooseDefault'))
  }

  if (errors.length > 0) {
    return { ok: false, errors }
  }

  const policies: Record<string, number> = {}
  state.rows.forEach((row) => {
    policies[normalizePolicyKey(row.key)] = Number(row.percent)
  })

  const defaultRow = state.rows.find((row) => row.id === state.defaultRowId)
  const defaultPolicy = defaultRow ? normalizePolicyKey(defaultRow.key) : ''

  return { ok: true, policies, defaultPolicy }
}
