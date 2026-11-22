import {
  initials,
  messageStamp,
  messageTime,
  newClientMessageId,
  orderLabel,
  roleLabel,
  sendableText,
  threadTime,
  CHAT_MESSAGE_MAX_LENGTH,
} from './chatDisplay'
import { createI18n } from '@/i18n/createI18n'

const t = createI18n('en').t

describe('chatDisplay (spec 0034, AC-2, AC-3, AC-4, AC-19)', () => {
  describe('initials', () => {
    it('returns first letters of first and last name for multiple words', () => {
      expect(initials('Nikos Pappas')).toBe('NP')
      expect(initials('Tiger Noodles Volos')).toBe('TV')
      expect(initials('  Ana   Torres  ')).toBe('AT')
    })

    it('returns first two letters uppercase for single word', () => {
      expect(initials('Creperie')).toBe('CR')
      expect(initials('p')).toBe('P')
    })

    it('returns ? for empty name', () => {
      expect(initials('')).toBe('?')
      expect(initials('   ')).toBe('?')
    })
  })

  describe('roleLabel', () => {
    it('maps COURIER to Courier and PARTNER to Restaurant', () => {
      expect(roleLabel('COURIER', t)).toBe('Courier')
      expect(roleLabel('PARTNER', t)).toBe('Restaurant')
    })
  })

  describe('orderLabel', () => {
    it('prefers orderReference when set', () => {
      expect(orderLabel('ORD-1234', 'del-987654321')).toBe('#ORD-1234')
      expect(orderLabel('ORD-99', null)).toBe('#ORD-99')
    })

    it('falls back to last 6 characters of deliveryId when orderReference is missing', () => {
      expect(orderLabel(null, 'del-cmvol987654')).toBe('#987654')
      expect(orderLabel(null, '123456')).toBe('#123456')
    })

    it('returns null when both are missing', () => {
      expect(orderLabel(null, null)).toBeNull()
    })
  })

  describe('messageTime & threadTime (Athens Europe/Athens timezone)', () => {
    it('formats time as 24-hour clock HH:mm in Europe/Athens timezone', () => {
      // 14:30 UTC is 16:30 in Greece (UTC+2 in winter)
      const iso = '2026-11-17T14:30:00.000Z'
      expect(messageTime(iso, 'en')).toBe('16:30')
    })

    it('threadTime shows HH:mm for today, and day month for earlier days', () => {
      const todayIso = '2026-11-17T14:30:00.000Z'
      const nowDate = new Date('2026-11-17T18:00:00.000Z')
      expect(threadTime(todayIso, nowDate, 'en')).toBe('16:30')

      const earlierIso = '2026-11-15T10:00:00.000Z'
      expect(threadTime(earlierIso, nowDate, 'en')).toBe('15 Nov')

      expect(threadTime(null, nowDate, 'en')).toBe('')
    })
  })

  describe('messageStamp (Minor 3, Athens Europe/Athens timezone)', () => {
    const fixedNow = new Date('2026-11-18T10:00:00.000Z')

    it('gives "HH:mm" for a message from today (Europe/Athens)', () => {
      // 08:15 UTC is 10:15 Athens time today
      const todayIso = '2026-11-18T08:15:00.000Z'
      expect(messageStamp(todayIso, fixedNow, 'en')).toBe('10:15')
    })

    it('gives day plus time ("d MMM, HH:mm") for a message from an earlier day', () => {
      // 14:05 UTC on Nov 17 is 16:05 Athens time yesterday
      const earlierIso = '2026-11-17T14:05:00.000Z'
      expect(messageStamp(earlierIso, fixedNow, 'en')).toBe('17 Nov, 16:05')

      // Older message
      const olderIso = '2026-11-10T07:30:00.000Z'
      expect(messageStamp(olderIso, fixedNow, 'en')).toBe('10 Nov, 09:30')
    })

    it('respects midnight boundary in Europe/Athens timezone', () => {
      // 2026-11-17T21:59:00.000Z is 2026-11-17 23:59:00 Athens time (yesterday)
      const yesterdayNight = '2026-11-17T21:59:00.000Z'
      expect(messageStamp(yesterdayNight, fixedNow, 'en')).toBe('17 Nov, 23:59')

      // 2026-11-17T22:01:00.000Z is 2026-11-18 00:01:00 Athens time (today)
      const todayMidnight = '2026-11-17T22:01:00.000Z'
      expect(messageStamp(todayMidnight, fixedNow, 'en')).toBe('00:01')
    })
  })

  describe('sendableText (AC-4)', () => {
    it('returns trimmed string for valid text 1 to 1000 characters', () => {
      expect(sendableText('  Hello dispatch  ')).toBe('Hello dispatch')
      expect(sendableText('a')).toBe('a')
      const maxText = 'x'.repeat(CHAT_MESSAGE_MAX_LENGTH)
      expect(sendableText(maxText)).toBe(maxText)
    })

    it('returns null for empty, blank, or text exceeding 1000 characters', () => {
      expect(sendableText('')).toBeNull()
      expect(sendableText('   \n\t  ')).toBeNull()
      const tooLong = 'x'.repeat(CHAT_MESSAGE_MAX_LENGTH + 1)
      expect(sendableText(tooLong)).toBeNull()
    })
  })

  describe('newClientMessageId (AC-19)', () => {
    it('returns an id prefixed with "admin-"', () => {
      const id1 = newClientMessageId()
      const id2 = newClientMessageId()

      expect(id1).toMatch(/^admin-/)
      expect(id2).toMatch(/^admin-/)
      expect(id1).not.toBe(id2)
    })
  })
})
