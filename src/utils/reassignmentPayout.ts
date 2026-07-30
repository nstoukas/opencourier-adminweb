export type PayoutPolicyOption = {
  key: string
  percent: number
  isDefault: boolean
}

export type PayoutPreview =
  | { ok: true; policy: string; percent: number; amount: number }
  | { ok: false; reason: string }

// Formats member-votable reassignment policies into a sorted menu, putting higher percentages first.
export function listPayoutPolicies(
  policies: Record<string, number> | null | undefined,
  defaultPolicy: string | null | undefined,
): PayoutPolicyOption[] {
  if (!policies || typeof policies !== 'object') {
    return []
  }

  const entries = Object.entries(policies)
  if (entries.length === 0) {
    return []
  }

  return entries
    .map(([key, percent]) => ({
      key,
      percent,
      isDefault: key === defaultPolicy,
    }))
    .sort((a, b) => {
      if (b.percent !== a.percent) {
        return b.percent - a.percent
      }
      return a.key.localeCompare(b.key)
    })
}

// Computes the expected compensation amount for a dropped rider before submitting reassignment.
export function previewReassignmentPayout(
  policies: Record<string, number> | null | undefined,
  defaultPolicy: string | null | undefined,
  requestedPolicy: string | undefined,
  totalCompensation: number | null,
): PayoutPreview {
  const policyKey = requestedPolicy ?? defaultPolicy ?? ''
  if (!policies || !(policyKey in policies)) {
    const allowed = policies ? Object.keys(policies).join(', ') : 'none'
    return {
      ok: false,
      reason: `Unknown policy "${policyKey}". Allowed policies: [${allowed}]`,
    }
  }

  const percent = policies[policyKey]
  if (typeof percent !== 'number' || !Number.isFinite(percent) || percent < 0 || percent > 100) {
    return {
      ok: false,
      reason: `Policy "${policyKey}" has invalid percentage ${percent}. Allowed range is 0 to 100.`,
    }
  }

  // Rounding to integer cents matches backend's roundMoney utility.
  const amount = Math.round(((totalCompensation ?? 0) * percent) / 100)

  return {
    ok: true,
    policy: policyKey,
    percent,
    amount,
  }
}
