import type { TFunction } from 'i18next'

// The rules the backend applies to a rider's login (spec 0013, AC-3), checked here first so the
// admin sees what is wrong before sending. The backend checks again; it has the last word.

// "+30 690 000 0000" is fine: spaces are removed, then a plus and 8 to 15 digits.
export function phoneWithoutSpaces(phone: string): string {
  return phone.replace(/\s+/g, '')
}

export function isValidRiderPhone(phone: string): boolean {
  return /^\+\d{8,15}$/.test(phoneWithoutSpaces(phone))
}

// A plain shape check (something@something.something); the backend validates it properly.
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
}

// 8 characters at least, as restaurant passwords; 72 at most (bcrypt ignores the rest).
export const PASSWORD_MIN = 8
export const PASSWORD_MAX = 72

// The problem in words, in the reader's language (`t` comes from the component's useTranslation).
export function passwordProblem(password: string, confirm: string, t: TFunction): string | null {
  if (password.length > 0 && password.length < PASSWORD_MIN) return t('couriers.password.tooShort', { min: PASSWORD_MIN })
  if (password.length > PASSWORD_MAX) return t('couriers.password.tooLong', { max: PASSWORD_MAX })
  if (confirm.length > 0 && password !== confirm) return t('couriers.password.mismatch')
  return null
}

export function isValidPasswordPair(password: string, confirm: string): boolean {
  return password.length >= PASSWORD_MIN && password.length <= PASSWORD_MAX && password === confirm
}

// The backend's own sentence when it sent one. Kept for the modules that still call it; the couriers,
// shift slots and SOS screens use useServerText().errorText instead, which also knows the error codes
// the server translates (spec 0054, AC-6).
// The backend's own sentence when it sent one ("That phone is already used by another rider."),
// else the fallback. `err` is whatever the mutation threw, so every step is checked.
export function backendMessage(err: unknown, fallback: string): string {
  if (err && typeof err === 'object' && 'message' in err) {
    const message = (err as { message: unknown }).message
    if (typeof message === 'string' && message) return message
    // A 400 from the backend's validation carries a list ("email must be an email").
    if (Array.isArray(message)) {
      const parts = message.filter((part): part is string => typeof part === 'string' && part.length > 0)
      if (parts.length > 0) return parts.join(' ')
    }
  }
  return fallback
}
