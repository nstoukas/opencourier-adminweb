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

// Result of validating and building reassignment payout policy data.
export type BuiltPayoutPolicies =
  | { ok: true; policies: Record<string, number>; defaultPolicy: string }
  | { ok: false; errors: string[] }

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

// Validates policy form state and produces payload object or array of error strings.
export function buildPayoutPolicyInput(state: PayoutPolicyFormState): BuiltPayoutPolicies {
  const errors: string[] = []

  if (state.rows.length === 0) {
    errors.push('Add at least one payout policy. Reassignment cannot run without one.')
  }

  const keyCounts = new Map<string, number>()

  state.rows.forEach((row, index) => {
    const position = index + 1
    const key = normalizePolicyKey(row.key)

    if (key === '') {
      errors.push(`Row ${position}: policy name is required.`)
    } else if (!/^[A-Z0-9_]+$/.test(key)) {
      errors.push(`Row ${position}: use only letters, numbers and underscores in a policy name.`)
    } else {
      keyCounts.set(key, (keyCounts.get(key) ?? 0) + 1)
    }

    if (row.percent.trim() === '') {
      errors.push(`Row ${position}: percentage is required.`)
    } else {
      const percent = Number(row.percent)
      if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
        errors.push(`Row ${position}: percentage must be a number between 0 and 100.`)
      }
    }
  })

  keyCounts.forEach((count, key) => {
    if (count > 1) {
      errors.push(`Two policies are both named ${key}. Policy names must be unique.`)
    }
  })

  const hasDefaultRow = state.rows.some((row) => row.id === state.defaultRowId)
  if (state.rows.length > 0 && !hasDefaultRow) {
    errors.push('Choose which policy is the default.')
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
