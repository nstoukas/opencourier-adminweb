import { createI18n } from './createI18n'
import {
  eventMessageText,
  codedSentenceText,
  serverErrorText,
  renderServerText,
  hasServerText,
  type StoredEventText,
  type ServerError,
} from './serverText'

describe('serverText helpers (spec 0054, AC-4, AC-6)', () => {
  const i18nEn = createI18n('en')
  const i18nEl = createI18n('el')

  describe('eventMessageText (AC-4)', () => {
    it('renders known messageCode in reader language with recordedInEnglish: false', () => {
      const event: StoredEventText = {
        message: 'Delivery was created delivery del-1 from partner p-1, ready at 12:00',
        messageCode: 'CREATED',
        messageParams: { deliveryId: 'del-1', partnerId: 'p-1', readyAt: '2026-11-20T10:00:00Z' },
        eventSource: 'OPENCOURIER',
      }

      // English
      const resultEn = eventMessageText(i18nEn, event)
      expect(resultEn.text).toContain('Delivery was created')
      expect(resultEn.recordedInEnglish).toBe(false)

      // Greek
      const resultEl = eventMessageText(i18nEl, event)
      expect(resultEl.text).toContain('δημιουργήθηκε')
      expect(resultEl.recordedInEnglish).toBe(false)
    })

    it('renders ADD_ON_JOINED messageCode in reader language naming the add on and courier (row 146)', () => {
      const event: StoredEventText = {
        message: 'Delivery del-99 joined this job as one more order on the way; courier c-12 carries both',
        messageCode: 'ADD_ON_JOINED',
        messageParams: { addOnId: 'del-99', courierId: 'c-12' },
        eventSource: 'OPENCOURIER',
      }

      // English
      const resultEn = eventMessageText(i18nEn, event)
      expect(resultEn.text).toBe(
        'Delivery del-99 joined this job as one more order on the way; courier c-12 carries both'
      )
      expect(resultEn.recordedInEnglish).toBe(false)

      // Greek
      const resultEl = eventMessageText(i18nEl, event)
      expect(resultEl.text).toBe(
        'Η παραγγελία del-99 μπήκε σε αυτή τη δουλειά ως μία ακόμη παραγγελία στον δρόμο· ο διανομέας c-12 μεταφέρει και τις δύο'
      )
      expect(resultEl.recordedInEnglish).toBe(false)
    })

    it('falls back to stored English message with recordedInEnglish: true for legacy rows (source OPENCOURIER)', () => {
      const legacyEvent: StoredEventText = {
        message: 'Courier accepted delivery del-44',
        messageCode: null,
        messageParams: null,
        eventSource: 'OPENCOURIER',
      }

      const result = eventMessageText(i18nEl, legacyEvent)
      expect(result.text).toBe('Courier accepted delivery del-44')
      expect(result.recordedInEnglish).toBe(true)
    })

    it('falls back to stored English with recordedInEnglish: true when messageCode is unknown to this client', () => {
      const unknownCodeEvent: StoredEventText = {
        message: 'A future event sentence from newer backend',
        messageCode: 'SOME_NEW_FUTURE_CODE',
        messageParams: {},
        eventSource: 'OPENCOURIER',
      }

      const result = eventMessageText(i18nEl, unknownCodeEvent)
      expect(result.text).toBe('A future event sentence from newer backend')
      expect(result.recordedInEnglish).toBe(true)
    })

    it('omits recordedInEnglish (sets false) for partner integrations (eventSource != OPENCOURIER, cross check 5)', () => {
      const partnerEvent: StoredEventText = {
        message: 'Custom restaurant note from POS',
        messageCode: null,
        messageParams: null,
        eventSource: 'PARTNER_APP',
      }

      const result = eventMessageText(i18nEl, partnerEvent)
      expect(result.text).toBe('Custom restaurant note from POS')
      expect(result.recordedInEnglish).toBe(false)
    })

    it('returns text: null and recordedInEnglish: false when event has no message and no code', () => {
      const emptyEvent: StoredEventText = {
        message: null,
        messageCode: null,
        messageParams: null,
      }

      const result = eventMessageText(i18nEl, emptyEvent)
      expect(result.text).toBeNull()
      expect(result.recordedInEnglish).toBe(false)
    })
  })

  describe('codedSentenceText (decision 47.50)', () => {
    it('renders coded sentence from server.<group>.<code> in reader language', () => {
      // Board detail code NO_COURIER_ACCEPTED
      const textEn = codedSentenceText(i18nEn, 'board', 'NO_COURIER_ACCEPTED', {}, 'No courier accepted')
      expect(textEn).toBe('No courier accepted')

      const textEl = codedSentenceText(i18nEl, 'board', 'NO_COURIER_ACCEPTED', {}, 'No courier accepted')
      expect(textEl).toBe('Κανένας διανομέας δεν την αποδέχτηκε')
    })

    it('falls back to English sentence when code is null, undefined, or unknown', () => {
      expect(codedSentenceText(i18nEl, 'board', null, null, 'Original English detail')).toBe('Original English detail')
      expect(codedSentenceText(i18nEl, 'board', 'UNKNOWN_BOARD_CODE', {}, 'Original English detail')).toBe(
        'Original English detail'
      )
    })
  })

  describe('serverErrorText (AC-6)', () => {
    it('renders translated text with params for known server error code in Greek and English', () => {
      const err: ServerError = {
        statusCode: 409,
        code: 'BOX_OVER_CAPACITY',
        params: { heldUnits: 80, deliveryUnits: 30 },
      }

      const textEl = serverErrorText(i18nEl, err)
      expect(textEl).toBeDefined()
      expect(textEl).toContain('κουτί')
      expect(textEl).toContain('80')
      expect(textEl).toContain('30')

      const textEn = serverErrorText(i18nEn, err)
      expect(textEn).toBeDefined()
      expect(textEn).toContain('box')
      expect(textEn).toContain('80')
      expect(textEn).toContain('30')
    })

    it('returns undefined when error has no statusCode so caller own sentence shows', () => {
      const callerSentence = 'The operation failed. Try again in a moment.'
      // Missing statusCode indicates server never answered (dropped connection), so caller fallback should show
      expect(serverErrorText(i18nEl, { message: 'Network Error' })).toBeUndefined()
      expect(serverErrorText(i18nEl, { message: 'Network Error' }) ?? callerSentence).toBe(callerSentence)
      expect(serverErrorText(i18nEl, new Error('Network Error'))).toBeUndefined()
      expect(serverErrorText(i18nEl, null)).toBeUndefined()
      expect(serverErrorText(i18nEl, 'raw string')).toBeUndefined()
    })

    it('falls back to error.message when code has no translation in language files', () => {
      const err: ServerError = {
        statusCode: 400,
        code: 'SOME_UNTRANSLATED_CODE',
        message: 'The server refused with this custom message.',
      }

      expect(serverErrorText(i18nEl, err)).toBe('The server refused with this custom message.')
    })
  })

  describe('renderServerText and interpolation formatting', () => {
    it('formats ISO time with clock format into Athens time HH:mm', () => {
      // 2026-11-20 10:00 UTC = 12:00 in Athens
      const text = renderServerText(i18nEn, 'server.event.FOOD_READY', { at: '2026-11-20T10:00:00Z' })
      expect(text).toBe('Food ready at 12:00')
    })

    it('formats money format with currency symbol/code', () => {
      // Greek uses "3,50 €" (with non-breaking space), English uses "350 EUR (cents)" in the server template
      const textEl = renderServerText(i18nEl, 'server.event.COURIER_PAID_FOR_RETURN_TRIP', {
        courierId: 'c1',
        amount: 350,
        currency: 'EUR',
      })
      expect(textEl).toMatch(/3,50\s*€/)
    })

    it('formats list format with language-specific conjunction', () => {
      const textEn = renderServerText(i18nEn, 'server.event.SPLIT_REQUESTED', {
        count: 2,
        sizes: [
          { part: 'BOX', params: { size: 'MEDIUM' } },
          { part: 'BOX', params: { size: 'SMALL' } },
        ],
        splitId: 'split-1',
      })
      expect(textEn).toContain('Medium and Small')

      const textEl = renderServerText(i18nEl, 'server.event.SPLIT_REQUESTED', {
        count: 2,
        sizes: [
          { part: 'BOX', params: { size: 'MEDIUM' } },
          { part: 'BOX', params: { size: 'SMALL' } },
        ],
        splitId: 'split-1',
      })
      expect(textEl).toContain('Μεσαίο και Μικρό')
    })
  })

  describe('hasServerText', () => {
    it('returns true for existing server keys and false for missing ones', () => {
      expect(hasServerText(i18nEn, 'server.event.CREATED')).toBe(true)
      expect(hasServerText(i18nEn, 'server.event.NONEXISTENT')).toBe(false)
    })
  })
})
