// Spec 0054 (row 47), AC-8: the completeness guard. It fails when a key is in one language and not
// the other, when a text is empty, when an event code has no template, or when a template names a
// value its code does not carry.
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

  it('defines offerSkipMinutes label, help (with at least / τουλάχιστον), and success note in en and el (row 144)', () => {
    // English
    expect(en.settings.labels.offerSkipMinutes).toBe(
      'Minutes before a declined or missed offer goes back to the same rider'
    )
    expect(en.settings.offers.offerSkipHelp).toContain('at least')
    expect(en.settings.success.offerSkip).toBe(
      'The skip time applies from the next decline or missed offer.'
    )

    // Greek
    expect(el.settings.labels.offerSkipMinutes).toBe(
      'Λεπτά πριν μια πρόταση που απορρίφθηκε ή χάθηκε ξαναπάει στον ίδιο διανομέα'
    )
    expect(el.settings.offers.offerSkipHelp).toContain('τουλάχιστον')
    expect(el.settings.success.offerSkip).toBe(
      'Ο χρόνος παράλειψης ισχύει από την επόμενη απόρριψη ή χαμένη πρόταση.'
    )
  })
})
