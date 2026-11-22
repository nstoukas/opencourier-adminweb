import { keyMessage, type ShownMessage } from '@/i18n/shownMessage'

export type PayoutPolicyOption = {
  key: string
  percent: number
  isDefault: boolean
}

export type PayoutPreview =
  | { ok: true; policy: string; percent: number; amount: number }
  // The reason is a translation key with its values (src/i18n/shownMessage.ts), drawn in the reader's
  // language with showMessage(reason, t).
  | { ok: false; reason: ShownMessage }

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
  // `| undefined` like the three above: the SDK's FromJSON copies totalCompensation with no
  // default, so a response that omits it reaches callers as undefined. The `?? 0` below
  // already handled that case; this is the signature catching up.
  totalCompensation: number | null | undefined,
): PayoutPreview {
  const policyKey = requestedPolicy ?? defaultPolicy ?? ''
  if (!policies || !(policyKey in policies)) {
    return {
      ok: false,
      reason: policies
        ? keyMessage('deliveries.reassign.unknownPolicy', { policy: policyKey, allowed: Object.keys(policies).join(', ') })
        : keyMessage('deliveries.reassign.unknownPolicyNone', { policy: policyKey }),
    }
  }

  const percent = policies[policyKey]
  if (typeof percent !== 'number' || !Number.isFinite(percent) || percent < 0 || percent > 100) {
    return {
      ok: false,
      reason: keyMessage('deliveries.reassign.invalidPercent', { policy: policyKey, percent: String(percent) }),
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
