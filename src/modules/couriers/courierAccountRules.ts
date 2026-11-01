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

export function passwordProblem(password: string, confirm: string): string | null {
  if (password.length > 0 && password.length < PASSWORD_MIN) return `At least ${PASSWORD_MIN} characters.`
  if (password.length > PASSWORD_MAX) return `At most ${PASSWORD_MAX} characters.`
  if (confirm.length > 0 && password !== confirm) return 'The two passwords do not match.'
  return null
}

export function isValidPasswordPair(password: string, confirm: string): boolean {
  return password.length >= PASSWORD_MIN && password.length <= PASSWORD_MAX && password === confirm
}

// The backend's own sentence when it sent one ("That phone is already used by another rider."),
// else the fallback. `err` is whatever the mutation threw, so every step is checked.
export function backendMessage(err: unknown, fallback: string): string {
  if (err && typeof err === 'object' && 'message' in err) {
    const message = (err as { message: unknown }).message
    if (typeof message === 'string' && message) return message
  }
  return fallback
}
