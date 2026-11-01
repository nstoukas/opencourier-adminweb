import {
  PASSWORD_MAX,
  PASSWORD_MIN,
  backendMessage,
  isValidEmail,
  isValidPasswordPair,
  isValidRiderPhone,
  passwordProblem,
  phoneWithoutSpaces,
} from './courierAccountRules'

describe('courierAccountRules (spec 0013, AC-3)', () => {
  describe('phoneWithoutSpaces', () => {
    it('removes spaces and tabs from phone number', () => {
      expect(phoneWithoutSpaces('+30 690 000 0000')).toBe('+306900000000')
      expect(phoneWithoutSpaces('  +30 \t 690 123 4567  ')).toBe('+306901234567')
    })
  })

  describe('isValidRiderPhone (phone with spaces accepted, without plus or 7/16 digits refused)', () => {
    it('accepts valid phone numbers with spaces', () => {
      expect(isValidRiderPhone('+30 690 000 0000')).toBe(true)
      expect(isValidRiderPhone('+1 555 123 4567')).toBe(true)
    })

    it('accepts boundary digit counts: 8 digits and 15 digits with plus', () => {
      // 8 digits (minimum)
      expect(isValidRiderPhone('+12345678')).toBe(true)
      // 15 digits (maximum)
      expect(isValidRiderPhone('+123456789012345')).toBe(true)
    })

    it('refuses phone number without a plus', () => {
      expect(isValidRiderPhone('306900000000')).toBe(false)
      expect(isValidRiderPhone('6900000000')).toBe(false)
      expect(isValidRiderPhone('00306900000000')).toBe(false)
    })

    it('refuses phone number with 7 digits (too short)', () => {
      expect(isValidRiderPhone('+1234567')).toBe(false)
      expect(isValidRiderPhone('+30 69 00')).toBe(false)
    })

    it('refuses phone number with 16 digits (too long)', () => {
      expect(isValidRiderPhone('+1234567890123456')).toBe(false)
      expect(isValidRiderPhone('+30 690 0000 0000 0000')).toBe(false)
    })

    it('refuses empty string or non-digit characters', () => {
      expect(isValidRiderPhone('')).toBe(false)
      expect(isValidRiderPhone('   ')).toBe(false)
      expect(isValidRiderPhone('+30690abc0000')).toBe(false)
    })
  })

  describe('isValidEmail (shape check)', () => {
    it('accepts valid email addresses and trims whitespace', () => {
      expect(isValidEmail('rider@example.com')).toBe(true)
      expect(isValidEmail('  rider.name@volos.coop  ')).toBe(true)
      expect(isValidEmail('a@b.co')).toBe(true)
    })

    it('refuses invalid email addresses', () => {
      expect(isValidEmail('')).toBe(false)
      expect(isValidEmail('notanemail')).toBe(false)
      expect(isValidEmail('rider@')).toBe(false)
      expect(isValidEmail('@domain.com')).toBe(false)
      expect(isValidEmail('rider@domain')).toBe(false)
      expect(isValidEmail('rider @domain.com')).toBe(false)
    })
  })

  describe('isValidPasswordPair (8 to 72 characters, passwords match)', () => {
    it('accepts matching passwords between 8 and 72 characters', () => {
      const minPw = 'a'.repeat(PASSWORD_MIN)
      const maxPw = 'a'.repeat(PASSWORD_MAX)
      const normalPw = 'strongPassword123'

      expect(isValidPasswordPair(minPw, minPw)).toBe(true)
      expect(isValidPasswordPair(maxPw, maxPw)).toBe(true)
      expect(isValidPasswordPair(normalPw, normalPw)).toBe(true)
    })

    it('refuses matching passwords under 8 characters or over 72 characters', () => {
      const shortPw = 'a'.repeat(PASSWORD_MIN - 1)
      const longPw = 'a'.repeat(PASSWORD_MAX + 1)

      expect(isValidPasswordPair(shortPw, shortPw)).toBe(false)
      expect(isValidPasswordPair(longPw, longPw)).toBe(false)
    })

    it('refuses passwords that do not match confirm', () => {
      expect(isValidPasswordPair('validPass123', 'differentPass123')).toBe(false)
    })
  })

  describe('passwordProblem (three messages)', () => {
    it('returns "At least 8 characters." when password length is between 1 and 7', () => {
      expect(passwordProblem('short', '')).toBe(`At least ${PASSWORD_MIN} characters.`)
      expect(passwordProblem('1234567', '1234567')).toBe(`At least ${PASSWORD_MIN} characters.`)
    })

    it('returns "At most 72 characters." when password length exceeds 72', () => {
      const longPw = 'x'.repeat(PASSWORD_MAX + 1)
      expect(passwordProblem(longPw, longPw)).toBe(`At most ${PASSWORD_MAX} characters.`)
    })

    it('returns "The two passwords do not match." when confirm is entered and differs', () => {
      expect(passwordProblem('validPassword123', 'mismatch')).toBe('The two passwords do not match.')
    })

    it('returns null when valid and matching, or when both are empty', () => {
      expect(passwordProblem('', '')).toBeNull()
      expect(passwordProblem('validPassword123', 'validPassword123')).toBeNull()
      // Password valid length, confirm not typed yet: no error yet
      expect(passwordProblem('validPassword123', '')).toBeNull()
    })
  })

  describe('backendMessage (extracts message or returns fallback)', () => {
    const fallback = 'Something went wrong. Please try again.'

    it('returns the error string message when present', () => {
      const err = { message: 'That phone is already used by another rider.' }
      expect(backendMessage(err, fallback)).toBe('That phone is already used by another rider.')
    })

    it('returns the fallback for null or undefined', () => {
      expect(backendMessage(null, fallback)).toBe(fallback)
      expect(backendMessage(undefined, fallback)).toBe(fallback)
    })

    it('returns the fallback for a plain string error', () => {
      expect(backendMessage('Network Error', fallback)).toBe(fallback)
    })

    it('returns the fallback for an object without message or with non-string/empty message', () => {
      expect(backendMessage({}, fallback)).toBe(fallback)
      expect(backendMessage({ status: 500 }, fallback)).toBe(fallback)
      expect(backendMessage({ message: '' }, fallback)).toBe(fallback)
      expect(backendMessage({ message: 404 }, fallback)).toBe(fallback)
      expect(backendMessage({ message: null }, fallback)).toBe(fallback)
    })
  })
})
