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

  it('defines offerSkipMinutes label, help (each rider counted on their own / για τον καθένα χωριστά, not at least / τουλάχιστον, and 1 to 60 / 1 έως 60), and success note in en and el (rows 144, 148)', () => {
    // English
    expect(en.settings.labels.offerSkipMinutes).toBe(
      'Skip time after a rider leaves an order, in minutes'
    )
    expect(en.settings.offers.offerSkipHelp).not.toContain('at least')
    expect(en.settings.offers.offerSkipHelp).not.toContain('starts the time again')
    expect(en.settings.offers.offerSkipHelp).toContain('counted for each rider on their own')
    expect(en.settings.offers.offerSkipHelp).toContain('1 to 60')
    expect(en.settings.offers.offerSkipHelp).not.toContain('240')
    expect(en.settings.success.offerSkip).toBe(
      'The new skip time applies from the next skip.'
    )

    // Greek
    expect(el.settings.labels.offerSkipMinutes).toBe(
      'Χρόνος παράλειψης αφού ένας διανομέας αφήσει μια παραγγελία, σε λεπτά'
    )
    expect(el.settings.offers.offerSkipHelp).not.toContain('τουλάχιστον')
    expect(el.settings.offers.offerSkipHelp).not.toContain('ξεκινά τον χρόνο από την αρχή')
    expect(el.settings.offers.offerSkipHelp).toContain('μετρημένο για τον καθένα χωριστά')
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

    it('Minor 2: English and Greek help name all six ways onto skip list, count each rider on their own (row 148, dropping at least / τουλάχιστον and starts the time again), and success note is general (row 144)', () => {
      // English help names all six ways: decline, missed offer, hand back, leaving late restaurant, removal, reassignment
      expect(en.settings.offers.offerSkipHelp).toContain('declines')
      expect(en.settings.offers.offerSkipHelp).toContain('misses')
      expect(en.settings.offers.offerSkipHelp).toContain('hands an order back')
      expect(en.settings.offers.offerSkipHelp).toContain('leaves a late restaurant')
      expect(en.settings.offers.offerSkipHelp).toContain('is removed')
      expect(en.settings.offers.offerSkipHelp).toContain('is reassigned')
      expect(en.settings.offers.offerSkipHelp).not.toContain('at least')
      expect(en.settings.offers.offerSkipHelp).not.toContain('starts the time again')
      expect(en.settings.offers.offerSkipHelp).toContain('counted for each rider on their own')
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
      expect(el.settings.offers.offerSkipHelp).not.toContain('τουλάχιστον')
      expect(el.settings.offers.offerSkipHelp).not.toContain('ξεκινά τον χρόνο από την αρχή')
      expect(el.settings.offers.offerSkipHelp).toContain('μετρημένο για τον καθένα χωριστά')
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
      expect(en.deliveries.eventType.ADD_ON_JOINED).toBe('One more order added')
      expect(el.deliveries.eventType.ADD_ON_JOINED).toBe('Προστέθηκε μία ακόμα παραγγελία')
    })

    it('defines server.event.ADD_ON_JOINED sentence in English and Greek naming {{addOnId}} and {{courierId}} (row 146)', () => {
      expect(en.server.event.ADD_ON_JOINED).toContain('{{addOnId}}')
      expect(en.server.event.ADD_ON_JOINED).toContain('{{courierId}}')
      expect(el.server.event.ADD_ON_JOINED).toContain('{{addOnId}}')
      expect(el.server.event.ADD_ON_JOINED).toContain('{{courierId}}')
    })

    it('ensures Greek no longer says "μεταφέρει" and English no longer says "carries both" (row 146)', () => {
      // Both untrue before pickup; replaced with "has taken both" / "έχει αναλάβει και τις δύο"
      expect(en.server.event.ADD_ON_JOINED).not.toContain('carries both')
      expect(el.server.event.ADD_ON_JOINED).not.toContain('μεταφέρει')
    })

    it('ensures server.event.ADD_ON_JOINED includes both {{addOnId}} and {{courierId}} placeholders in both languages (row 146)', () => {
      expect(placeholders(en.server.event.ADD_ON_JOINED)).toEqual(
        expect.arrayContaining(['addOnId', 'courierId'])
      )
      expect(placeholders(el.server.event.ADD_ON_JOINED)).toEqual(
        expect.arrayContaining(['addOnId', 'courierId'])
      )
    })

    const backendDir = path.resolve(__dirname, '../../../opencourier-backend')
    const backendEnPath = path.join(backendDir, 'src/localization/en.ts')
    const backendElPath = path.join(backendDir, 'src/localization/el.ts')
    const backendMessagesPath = path.join(backendDir, 'src/shared-types/event-messages.ts')

    const backendPresent =
      fs.existsSync(backendEnPath) && fs.existsSync(backendElPath) && fs.existsSync(backendMessagesPath)

    if (!backendPresent) {
      console.warn(
        '\n=================================================================================\n' +
          `WARNING: Backend localization files not found under ${backendDir}.\n` +
          'Skipping ADD_ON_JOINED backend copy consistency check because backend repo is absent.\n' +
          '=================================================================================\n'
      )
    }

    const itBackendCopy = backendPresent ? it : it.skip

    itBackendCopy('verifies copies stay identical to the backend when backend repo is present (row 146 copy check)', () => {
      const backendEnContent = fs.readFileSync(backendEnPath, 'utf-8')
      const backendElContent = fs.readFileSync(backendElPath, 'utf-8')
      const backendMessagesContent = fs.readFileSync(backendMessagesPath, 'utf-8')

      // Extract backend message code params: ADD_ON_JOINED: ['courierId', 'addOnId'],
      const backendCodeMatch = backendMessagesContent.match(/ADD_ON_JOINED:\s*\[([^\]]+)\]/)
      expect(backendCodeMatch).not.toBeNull()
      const backendParams = (backendCodeMatch?.[1] ?? '')
        .split(',')
        .map((s) => s.trim().replace(/['"]/g, ''))
      expect(EVENT_MESSAGE_CODES.ADD_ON_JOINED).toEqual(backendParams)

      // Extract backend sentences
      const backendEnSentenceMatch = backendEnContent.match(/ADD_ON_JOINED:\s*'([^']+)'/)
      expect(backendEnSentenceMatch).not.toBeNull()
      expect(en.server.event.ADD_ON_JOINED).toBe((backendEnSentenceMatch?.[1] ?? ''))

      const backendElSentenceMatch = backendElContent.match(/ADD_ON_JOINED:\s*\n?\s*'([^']+)'/)
      expect(backendElSentenceMatch).not.toBeNull()
      expect(el.server.event.ADD_ON_JOINED).toBe((backendElSentenceMatch?.[1] ?? ''))
    })
  })

  describe('Row 147: stackPairBlockMinutes translations and auto-accept stacking help', () => {
    it('defines stackPairBlockMinutes label and pairBlockHelp in en and el (row 147)', () => {
      // English label and help
      expect(en.settings.labels.stackPairBlockMinutes).toBe(
        'Minutes before a turned down pair can be offered together again'
      )
      expect(en.settings.twoOrders.pairBlockHelp).toContain('0 to 60')
      expect(en.settings.twoOrders.pairBlockHelp).toContain(
        '0: the same pair can go to another rider at once'
      )
      expect(en.settings.twoOrders.pairBlockHelp).toContain(
        'The rider who declined is kept away by the skip time either way'
      )
      expect(en.settings.twoOrders.pairBlockHelp.toLowerCase()).toContain('skip time')

      // Greek label and help
      expect(el.settings.labels.stackPairBlockMinutes).toBe(
        'Λεπτά πριν ένα ζευγάρι που απορρίφθηκε ξαναπροταθεί μαζί'
      )
      expect(el.settings.twoOrders.pairBlockHelp).toContain('0 έως 60')
      expect(el.settings.twoOrders.pairBlockHelp).toContain(
        '0: το ίδιο ζευγάρι μπορεί να πάει αμέσως σε άλλον διανομέα'
      )
      expect(el.settings.twoOrders.pairBlockHelp).toContain(
        'Τον διανομέα που το απέρριψε τον κρατά μακριά ο χρόνος παράλειψης σε κάθε περίπτωση'
      )
      expect(el.settings.twoOrders.pairBlockHelp).toContain('χρόνος παράλειψης')
    })

    it('ensures stacking help in en and el reflects auto-accept pairs and no longer says the phone never accepts a pair by itself (row 128 / row 147)', () => {
      // English: phone never accepts a pair by itself was removed in row 147 review fix;
      // auto accept rule from row 128 is explained instead.
      expect(en.settings.twoOrders.stackingHelp).not.toContain(
        'the phone never accepts a pair by itself'
      )
      expect(en.settings.twoOrders.stackingHelp).not.toContain(
        'phone never accepts a pair by itself'
      )
      expect(en.settings.twoOrders.stackingHelp).toContain(
        'a rider on auto accept takes it like a single order'
      )

      // Greek: removed "το κινητό δεν το δέχεται ποτέ μόνο του"; added auto accept explanation
      expect(el.settings.twoOrders.stackingHelp).not.toContain(
        'το κινητό δεν το δέχεται ποτέ μόνο του'
      )
      expect(el.settings.twoOrders.stackingHelp).toContain(
        'με αυτόματη αποδοχή το κινητό το δέχεται όπως μία μόνο παραγγελία'
      )
    })

    it('ensures Two orders card description exists in en and el', () => {
      expect(en.settings.twoOrders.description).toBe(
        'Whether one rider may be offered two orders at once, and within which limits.'
      )
      expect(el.settings.twoOrders.description).toBe(
        'Αν ένας διανομέας μπορεί να πάρει πρόταση για δύο παραγγελίες μαζί, και με ποια όρια.'
      )
    })
  })

  describe('Row 148: Each rider is skipped for exactly the co-op\'s time (offerSkipHelp wording)', () => {
    it('English offerSkipHelp drops "at least", no longer says each new skip starts the time again, and says time is counted for each rider on their own', () => {
      // Must drop 'at least'
      expect(en.settings.offers.offerSkipHelp).not.toContain('at least')

      // Must no longer say each new skip starts the time again
      expect(en.settings.offers.offerSkipHelp).not.toContain('starts the time again')
      expect(en.settings.offers.offerSkipHelp).not.toContain(
        'Each new skip on the order starts the time again'
      )

      // Must say the time is counted for each rider on their own
      expect(en.settings.offers.offerSkipHelp).toContain(
        'counted for each rider on their own'
      )

      // Pin exact complete text
      expect(en.settings.offers.offerSkipHelp).toBe(
        'Whole minutes, 1 to 60. A rider who declines or misses an offer, hands an order back, leaves a late restaurant, is removed or is reassigned is not offered that order again for this long, counted for each rider on their own. Other riders can still be offered it.'
      )
    })

    it('Greek offerSkipHelp drops "τουλάχιστον", no longer says each new skip starts the time again, and says time is counted for each rider on their own', () => {
      // Must drop 'τουλάχιστον'
      expect(el.settings.offers.offerSkipHelp).not.toContain('τουλάχιστον')

      // Must no longer say each new skip starts the time again
      expect(el.settings.offers.offerSkipHelp).not.toContain('ξεκινά τον χρόνο από την αρχή')
      expect(el.settings.offers.offerSkipHelp).not.toContain(
        'Κάθε νέα παράλειψη ξεκινά τον χρόνο από την αρχή'
      )

      // Must say the time is counted for each rider on their own
      expect(el.settings.offers.offerSkipHelp).toContain(
        'μετρημένο για τον καθένα χωριστά'
      )

      // Pin exact complete text
      expect(el.settings.offers.offerSkipHelp).toBe(
        'Ακέραια λεπτά, 1 έως 60. Σε διανομέα που απορρίπτει ή χάνει μια πρόταση, επιστρέφει μια παραγγελία, φεύγει από κατάστημα που καθυστερεί, απομακρύνεται ή αντικαθίσταται, η παραγγελία δεν του προτείνεται ξανά για τόσο, μετρημένο για τον καθένα χωριστά. Οι άλλοι διανομείς μπορούν να την πάρουν.'
      )
    })
  })
})
