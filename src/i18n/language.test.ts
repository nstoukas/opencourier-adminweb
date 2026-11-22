import {
  toLanguage,
  languageFromCookies,
  saveLanguageCookie,
  DEFAULT_LANGUAGE,
  LANGUAGE_COOKIE,
  LANGUAGES,
  LOCALES,
  LANGUAGE_NAMES,
} from './language'
import {
  markChosenBeforeSignIn,
  wasChosenBeforeSignIn,
  forgetChosenBeforeSignIn,
  applyLanguage,
} from './languageChoice'
import { createI18n } from './createI18n'

describe('language and cookie helpers (spec 0054, cross check 2)', () => {
  describe('toLanguage', () => {
    it('returns valid language code for supported languages', () => {
      expect(toLanguage('el')).toBe('el')
      expect(toLanguage('en')).toBe('en')
    })

    it('falls back to DEFAULT_LANGUAGE ("el") for unsupported or invalid values', () => {
      expect(toLanguage('fr')).toBe(DEFAULT_LANGUAGE)
      expect(toLanguage('')).toBe(DEFAULT_LANGUAGE)
      expect(toLanguage(null)).toBe(DEFAULT_LANGUAGE)
      expect(toLanguage(undefined)).toBe(DEFAULT_LANGUAGE)
      expect(toLanguage(123)).toBe(DEFAULT_LANGUAGE)
      expect(toLanguage({})).toBe(DEFAULT_LANGUAGE)
    })
  })

  describe('languageFromCookies', () => {
    it('returns default language when cookie string is empty, null, or undefined', () => {
      expect(languageFromCookies(null)).toBe('el')
      expect(languageFromCookies(undefined)).toBe('el')
      expect(languageFromCookies('')).toBe('el')
    })

    it('extracts language from oc_lang cookie when alone or among other cookies', () => {
      expect(languageFromCookies('oc_lang=en')).toBe('en')
      expect(languageFromCookies('oc_lang=el')).toBe('el')
      expect(languageFromCookies('session=xyz; oc_lang=en; theme=dark')).toBe('en')
      expect(languageFromCookies('foo=bar; oc_lang=el')).toBe('el')
    })

    it('handles percent-encoded cookie values properly', () => {
      expect(languageFromCookies('oc_lang=%65%6e')).toBe('en')
    })

    it('survives malformed percent-encoding (%E0%A4%A) without throwing and falls back to Greek (cross check 2)', () => {
      expect(languageFromCookies('oc_lang=%E0%A4%A')).toBe('el')
      expect(languageFromCookies('oc_lang=%')).toBe('el')
    })

    it('falls back to default language for unknown language values in cookie', () => {
      expect(languageFromCookies('oc_lang=de')).toBe('el')
      expect(languageFromCookies('oc_lang=unknown')).toBe('el')
    })
  })

  describe('saveLanguageCookie', () => {
    let originalCookie: PropertyDescriptor | undefined

    beforeEach(() => {
      let cookieStore = ''
      originalCookie = Object.getOwnPropertyDescriptor(document, 'cookie')
      Object.defineProperty(document, 'cookie', {
        get: () => cookieStore,
        set: (v: string) => {
          cookieStore = v
        },
        configurable: true,
      })
    })

    afterEach(() => {
      if (originalCookie) {
        Object.defineProperty(document, 'cookie', originalCookie)
      }
    })

    it('writes oc_lang cookie with 1-year max-age and SameSite=Lax', () => {
      saveLanguageCookie('en')
      expect(document.cookie).toContain('oc_lang=en')
      expect(document.cookie).toContain('max-age=31536000')
      expect(document.cookie).toContain('SameSite=Lax')
    })
  })

  describe('constants and metadata', () => {
    it('defines expected locales and language names', () => {
      expect(LANGUAGES).toEqual(['el', 'en'])
      expect(LOCALES.el).toBe('el-GR')
      expect(LOCALES.en).toBe('en-GB')
      expect(LANGUAGE_NAMES.el).toBe('Ελληνικά')
      expect(LANGUAGE_NAMES.en).toBe('English')
      expect(LANGUAGE_COOKIE).toBe('oc_lang')
    })
  })

  describe('languageChoice: sign-in state and applyLanguage (decision 47.32)', () => {
    afterEach(() => {
      forgetChosenBeforeSignIn()
    })

    it('tracks whether language was chosen on the sign-in card before submit', () => {
      expect(wasChosenBeforeSignIn()).toBe(false)
      markChosenBeforeSignIn()
      expect(wasChosenBeforeSignIn()).toBe(true)
      forgetChosenBeforeSignIn()
      expect(wasChosenBeforeSignIn()).toBe(false)
    })

    it('applyLanguage updates i18n instance, document lang, and cookie', () => {
      const i18n = createI18n('el')
      expect(i18n.language).toBe('el')

      applyLanguage(i18n, 'en')

      expect(i18n.language).toBe('en')
      expect(document.documentElement.lang).toBe('en')
      expect(document.cookie).toContain('oc_lang=en')
    })
  })
})
