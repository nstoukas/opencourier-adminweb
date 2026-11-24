// Spec 0054 (row 47), AC-8: the completeness guard. It fails when a key is in one language and not
// the other, when a text is empty, when an event code has no template, or when a template names a
// value its code does not carry.
import fs from 'fs'
import path from 'path'
import { EVENT_MESSAGE_CODES, EVENT_PART_CODES } from '@/shared-types/event-messages'
import { EnumDeliveryStatus } from '@/shared-types/delivery-events'
import { en } from './resources/en'
import { el } from './resources/el'

// Every leaf of a translation object as `a.b.c` -> text.
function leaves(node: unknown, prefix = ''): Map<string, unknown> {
  const found = new Map<string, unknown>()
  if (typeof node === 'object' && node !== null) {
    for (const [key, value] of Object.entries(node)) {
      const name = prefix ? `${prefix}.${key}` : key
      if (typeof value === 'object' && value !== null) {
        leaves(value, name).forEach((text, leaf) => {
          found.set(leaf, text)
        })
      } else {
        found.set(name, value)
      }
    }
  }
  return found
}

const placeholders = (text: string | undefined): string[] => {
  if (!text) return []
  const matches: string[] = []
  const re = /\{\{\s*(\w+)/g
  let match: RegExpExecArray | null
  while ((match = re.exec(text)) !== null) {
    if (match[1]) matches.push(match[1])
  }
  return matches
}

const nestedKeys = (text: string): string[] => {
  if (!text) return []
  const matches: string[] = []
  const re = /\$t\(([^)]*)\)/g
  let match: RegExpExecArray | null
  while ((match = re.exec(text)) !== null) {
    if (match[1]) matches.push(match[1])
  }
  return matches
}

describe('Translations completeness (spec 0054, AC-8)', () => {
  const english = leaves(en)
  const greek = leaves(el)

  it('ensures both languages have the exact same set of translation keys', () => {
    expect(Array.from(greek.keys()).sort()).toEqual(Array.from(english.keys()).sort())
  })

  it('ensures no translation text is empty in either language', () => {
    const empty: string[] = []
    english.forEach((text, key) => {
      if (typeof text !== 'string' || text.trim() === '') empty.push(`en: ${key}`)
    })
    greek.forEach((text, key) => {
      if (typeof text !== 'string' || text.trim() === '') empty.push(`el: ${key}`)
    })
    expect(empty).toEqual([])
  })

  it('every event code in EVENT_MESSAGE_CODES has a template in server.event, and every template has a code', () => {
    expect(Object.keys(en.server.event).sort()).toEqual(Object.keys(EVENT_MESSAGE_CODES).sort())
    expect(Object.keys(el.server.event).sort()).toEqual(Object.keys(EVENT_MESSAGE_CODES).sort())
  })

  it('every event part in EVENT_PART_CODES has a template in server.eventPart, and every template has a part', () => {
    expect(Object.keys(en.server.eventPart).sort()).toEqual(Object.keys(EVENT_PART_CODES).sort())
    expect(Object.keys(el.server.eventPart).sort()).toEqual(Object.keys(EVENT_PART_CODES).sort())
  })

  it('each event and eventPart template uses only values its code carries', () => {
    const wrong: string[] = []
    const groups = [
      ['event', EVENT_MESSAGE_CODES],
      ['eventPart', EVENT_PART_CODES],
    ] as const

    for (const [group, codes] of groups) {
      for (const [code, params] of Object.entries(codes)) {
        const allowed = new Set<string>(params)
        for (const [language, file] of [
          ['en', en],
          ['el', el],
        ] as const) {
          const template = (file.server[group] as Record<string, string>)[code]
          for (const name of placeholders(template)) {
            if (!allowed.has(name)) {
              wrong.push(`${language} ${group}.${code}: {{${name}}}`)
            }
          }
        }
      }
    }
    expect(wrong).toEqual([])
  })

  it('every nested key points at a group that exists in both languages', () => {
    const missing: string[] = []
    const checkFile = (language: string, file: Map<string, unknown>) => {
      const keys = Array.from(file.keys())
      file.forEach((text, key) => {
        for (const nested of nestedKeys(String(text))) {
          const group = nested.split('.{{')[0] ?? nested
          const hasGroup = keys.some((leaf) => leaf.startsWith(`${group}.`))
          if (!hasGroup) missing.push(`${language} ${key} -> ${nested}`)
        }
      })
    }
    checkFile('en', english)
    checkFile('el', greek)
    expect(missing).toEqual([])
  })

  it('every EnumDeliveryStatus value has a translation in enums.deliveryStatus for both languages', () => {
    for (const status of Object.values(EnumDeliveryStatus)) {
      expect(en.enums.deliveryStatus).toHaveProperty(status)
      expect(el.enums.deliveryStatus).toHaveProperty(status)
      const enStatus = (en.enums.deliveryStatus as Record<string, string>)[status] ?? ''
      const elStatus = (el.enums.deliveryStatus as Record<string, string>)[status] ?? ''
      expect(enStatus.trim().length).toBeGreaterThan(0)
      expect(elStatus.trim().length).toBeGreaterThan(0)
    }
  })

  it('defines offerSkipMinutes label, help (with at least / τουλάχιστον and 1 to 60 / 1 έως 60), and success note in en and el (row 144)', () => {
    // English
    expect(en.settings.labels.offerSkipMinutes).toBe(
      'Skip time after a rider leaves an order, in minutes'
    )
    expect(en.settings.offers.offerSkipHelp).toContain('at least')
    expect(en.settings.offers.offerSkipHelp).toContain('1 to 60')
    expect(en.settings.offers.offerSkipHelp).not.toContain('240')
    expect(en.settings.success.offerSkip).toBe(
      'The new skip time applies from the next skip.'
    )

    // Greek
    expect(el.settings.labels.offerSkipMinutes).toBe(
      'Χρόνος παράλειψης αφού ένας διανομέας αφήσει μια παραγγελία, σε λεπτά'
    )
    expect(el.settings.offers.offerSkipHelp).toContain('τουλάχιστον')
    expect(el.settings.offers.offerSkipHelp).toContain('1 έως 60')
    expect(el.settings.offers.offerSkipHelp).not.toContain('240')
    expect(el.settings.success.offerSkip).toBe(
      'Ο νέος χρόνος παράλειψης ισχύει από την επόμενη παράλειψη.'
    )
  })

  describe('Row 144 review rulings: offer skip wording', () => {
    it('Minor 1: Greek help says the order is not offered again with προτείνεται and never uses δέχεται (row 144)', () => {
      // The Greek help says the order is not offered again (προτείνεται) and avoids
      // δέχεται (which means rider accepting).
      expect(el.settings.offers.offerSkipHelp).toContain('προτείνεται')
      expect(el.settings.offers.offerSkipHelp).not.toContain('δέχεται')
    })

    it('Minor 2: English and Greek help name all six ways onto skip list, keep at least / τουλάχιστον, and success note is general (row 144)', () => {
      // English help names all six ways: decline, missed offer, hand back, leaving late restaurant, removal, reassignment
      expect(en.settings.offers.offerSkipHelp).toContain('declines')
      expect(en.settings.offers.offerSkipHelp).toContain('misses')
      expect(en.settings.offers.offerSkipHelp).toContain('hands an order back')
      expect(en.settings.offers.offerSkipHelp).toContain('leaves a late restaurant')
      expect(en.settings.offers.offerSkipHelp).toContain('is removed')
      expect(en.settings.offers.offerSkipHelp).toContain('is reassigned')
      expect(en.settings.offers.offerSkipHelp).toContain('at least')
      // English success note applies generally to any skip
      expect(en.settings.success.offerSkip).toContain('applies from the next skip')
      expect(en.settings.success.offerSkip).not.toContain('decline')

      // Greek help names all six ways: απορρίπτει, χάνει, επιστρέφει, φεύγει από κατάστημα που καθυστερεί, απομακρύνεται, αντικαθίσταται
      expect(el.settings.offers.offerSkipHelp).toContain('απορρίπτει')
      expect(el.settings.offers.offerSkipHelp).toContain('χάνει')
      expect(el.settings.offers.offerSkipHelp).toContain('επιστρέφει')
      expect(el.settings.offers.offerSkipHelp).toContain('φεύγει από κατάστημα που καθυστερεί')
      expect(el.settings.offers.offerSkipHelp).toContain('απομακρύνεται')
      expect(el.settings.offers.offerSkipHelp).toContain('αντικαθίσταται')
      expect(el.settings.offers.offerSkipHelp).toContain('τουλάχιστον')
      // Greek success note applies generally to any skip
      expect(el.settings.success.offerSkip).toContain('από την επόμενη παράλειψη')
      expect(el.settings.success.offerSkip).not.toContain('απόρριψη')
    })

    it('Minor 3: unified name skip time / χρόνος παράλειψης across label, note, and card description in both languages (row 144)', () => {
      // English: label and success note use "skip time"; description mentions "skipped"
      expect(en.settings.labels.offerSkipMinutes.toLowerCase()).toContain('skip time')
      expect(en.settings.success.offerSkip.toLowerCase()).toContain('skip time')
      expect(en.settings.offers.description.toLowerCase()).toContain('skipped')

      // Greek: label and success note use "χρόνος παράλειψης"; description mentions "παραλείπεται"
      expect(el.settings.labels.offerSkipMinutes.toLowerCase()).toContain('χρόνος παράλειψης')
      expect(el.settings.success.offerSkip.toLowerCase()).toContain('χρόνος παράλειψης')
      expect(el.settings.offers.description).toContain('παραλείπεται')
    })

    it('states the range 1 to 60 in English and 1 έως 60 in Greek offerSkipHelp, not 240 (decision 144.3)', () => {
      // English help states range 1 to 60 minutes
      expect(en.settings.offers.offerSkipHelp).toContain('1 to 60')
      expect(en.settings.offers.offerSkipHelp).not.toContain('240')

      // Greek help states range 1 έως 60 minutes
      expect(el.settings.offers.offerSkipHelp).toContain('1 έως 60')
      expect(el.settings.offers.offerSkipHelp).not.toContain('240')
    })
  })

  describe('Row 146: ADD_ON_JOINED translations and backend copy consistency', () => {
    it('defines eventType.ADD_ON_JOINED in English and Greek (row 146)', () => {
      expect(en.deliveries.eventType.ADD_ON_JOINED).toBe('One more order joined')
      expect(el.deliveries.eventType.ADD_ON_JOINED).toBe('Προστέθηκε μία ακόμη παραγγελία')
    })

    it('defines server.event.ADD_ON_JOINED sentence in English and Greek naming {{addOnId}} and {{courierId}} (row 146)', () => {
      expect(en.server.event.ADD_ON_JOINED).toBe(
        'Delivery {{addOnId}} joined this job as one more order on the way; courier {{courierId}} carries both'
      )
      expect(el.server.event.ADD_ON_JOINED).toBe(
        'Η παραγγελία {{addOnId}} μπήκε σε αυτή τη δουλειά ως μία ακόμη παραγγελία στον δρόμο· ο διανομέας {{courierId}} μεταφέρει και τις δύο'
      )
    })

    it('ensures server.event.ADD_ON_JOINED includes both {{addOnId}} and {{courierId}} placeholders in both languages (row 146)', () => {
      expect(placeholders(en.server.event.ADD_ON_JOINED)).toEqual(
        expect.arrayContaining(['addOnId', 'courierId'])
      )
      expect(placeholders(el.server.event.ADD_ON_JOINED)).toEqual(
        expect.arrayContaining(['addOnId', 'courierId'])
      )
    })

    it('verifies copies stay identical to the backend when backend repo is present (row 146 copy check)', () => {
      const backendDir = path.resolve(__dirname, '../../../opencourier-backend')
      const backendEnPath = path.join(backendDir, 'src/localization/en.ts')
      const backendElPath = path.join(backendDir, 'src/localization/el.ts')
      const backendMessagesPath = path.join(backendDir, 'src/shared-types/event-messages.ts')

      if (!fs.existsSync(backendEnPath) || !fs.existsSync(backendElPath) || !fs.existsSync(backendMessagesPath)) {
        return
      }

      const backendEnContent = fs.readFileSync(backendEnPath, 'utf-8')
      const backendElContent = fs.readFileSync(backendElPath, 'utf-8')
      const backendMessagesContent = fs.readFileSync(backendMessagesPath, 'utf-8')

      // Extract backend message code params: ADD_ON_JOINED: ['courierId', 'addOnId'],
      const backendCodeMatch = backendMessagesContent.match(/ADD_ON_JOINED:\s*\[([^\]]+)\]/)
      expect(backendCodeMatch).not.toBeNull()
      const backendParams = backendCodeMatch![1]
        .split(',')
        .map((s) => s.trim().replace(/['"]/g, ''))
      expect(EVENT_MESSAGE_CODES.ADD_ON_JOINED).toEqual(backendParams)

      // Extract backend sentences
      const backendEnSentenceMatch = backendEnContent.match(/ADD_ON_JOINED:\s*'([^']+)'/)
      expect(backendEnSentenceMatch).not.toBeNull()
      expect(en.server.event.ADD_ON_JOINED).toBe(backendEnSentenceMatch![1])

      const backendElSentenceMatch = backendElContent.match(/ADD_ON_JOINED:\s*\n?\s*'([^']+)'/)
      expect(backendElSentenceMatch).not.toBeNull()
      expect(el.server.event.ADD_ON_JOINED).toBe(backendElSentenceMatch![1])
    })
  })
})
