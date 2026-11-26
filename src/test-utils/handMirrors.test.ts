// Scope row 181: adminweb's other hand mirrors of backend lists are checked against the backend.
// Row 175 (src/modules/deliveries/utils/cancellationDisplay.mirrors.test.ts) checked the first ones; this
// file checks the rest its review found, the matching settings first. Each list is read from adminweb's
// source (most are private constants, so the TypeScript compiler API reads the file rather than an
// import) and compared as a set, both ways, with the backend's Prisma enum or shared-types enum.
//
// Each entry in MIRRORS below says:
// - where the copy is and how to read it (a list constant, an SDK union type, or an inline union);
// - which backend values it copies;
// - `appOnly`: values that are adminweb's own and not the backend's (a filter's "ALL", which sends no
//   filter). Each must still be in the list, so an allowance that is no longer needed fails;
// - `leftOut`: backend values the list leaves out on purpose, each with its reason. Each must still be a
//   backend value and still absent from the list; a backend value that is neither copied nor left out
//   fails, so a new backend value always asks for a decision;
// - `labels`: where the values' words are in the language files; every copied backend value needs a
//   word in English and Greek, so a new value never reaches the screen as its raw code.
//
// Skip rules and helpers are shared with the other copy checks (src/test-utils/backendCopies.ts).
import fs from 'fs'
import os from 'os'
import path from 'path'
import { en } from '@/i18n/resources/en'
import { el } from '@/i18n/resources/el'
import {
  PrismaEnums,
  assertBackendFilesExist,
  compareSets,
  findBrokenComparedElsewhere,
  getBackendPaths,
  loadBackendSharedFile,
  parsePrismaEnums,
  readPropertyUnions,
  readStringList,
  readStringUnion,
  warnBackendAbsentOnce,
} from './backendCopies'

// adminweb's src folder: every path in MIRRORS is relative to it.
export const SRC = path.resolve(__dirname, '..')

// Where a backend list comes from: an enum in the Prisma schema, or an exported enum in a backend
// shared-types file.
export type BackendSource =
  | { prismaEnum: string }
  | { sharedTypesFile: string; exportName: string }

export interface Mirror {
  // The copy's name, as the test title shows it.
  name: string
  // The adminweb file holding it, relative to src.
  file: string
  // Reads the copy: one list, or one per place an inline union is written.
  read: (filePath: string) => string[][]
  backend: BackendSource
  appOnly?: string[]
  leftOut?: Record<string, string>
  labels?: string
}

// Small readers, so each entry below reads as one line.
const list = (constName: string) => (filePath: string) => [readStringList(filePath, constName)]
const union = (typeName: string) => (filePath: string) => [readStringUnion(filePath, typeName)]
const inlineUnions = (propName: string) => (filePath: string) => readPropertyUnions(filePath, propName)

const SETTINGS_CARDS = 'modules/instance-config/cards/SettingsCards.tsx'

export const MIRRORS: Mirror[] = [
  // Matching settings (spec 0048): what the co-op may choose for two orders and add ons.
  {
    name: 'TWO_ORDER_POLICIES',
    file: SETTINGS_CARDS,
    read: list('TWO_ORDER_POLICIES'),
    backend: { sharedTypesFile: 'stacking.ts', exportName: 'EnumTwoOrderPolicy' },
    labels: 'settings.twoOrderPolicy',
  },
  {
    name: 'ADD_ON_MOMENTS',
    file: SETTINGS_CARDS,
    read: list('ADD_ON_MOMENTS'),
    backend: { sharedTypesFile: 'stacking.ts', exportName: 'EnumAddOnMoment' },
    labels: 'settings.addOnMoment',
  },
  // Box sizes (spec 0043, 0047).
  {
    name: 'BOX_SIZES',
    file: SETTINGS_CARDS,
    read: list('BOX_SIZES'),
    backend: { prismaEnum: 'BoxSize' },
    labels: 'settings.boxSize',
  },
  {
    name: 'SIZES',
    file: 'modules/split-requests/SplitRequestsPage.tsx',
    read: list('SIZES'),
    backend: { prismaEnum: 'BoxSize' },
    labels: 'splitRequests.size',
  },
  {
    name: 'SplitBoxSize (SDK)',
    file: 'backend-admin-sdk/src/apis/SplitRequestApi.ts',
    read: union('SplitBoxSize'),
    backend: { prismaEnum: 'BoxSize' },
  },
  // Product reports (spec 0032).
  {
    name: 'KINDS',
    file: 'modules/product-reports/ProductReportRow.tsx',
    read: list('KINDS'),
    backend: { prismaEnum: 'EnumProductReportKind' },
    labels: 'productReports.kind',
  },
  {
    name: 'kind in createDeliveryProductReport',
    file: 'api/deliveriesApi.ts',
    read: inlineUnions('kind'),
    backend: { prismaEnum: 'EnumProductReportKind' },
  },
  {
    name: 'kind in the SDK call',
    file: 'backend-admin-sdk/src/apis/DeliveriesApi.ts',
    read: inlineUnions('kind'),
    backend: { prismaEnum: 'EnumProductReportKind' },
  },
  {
    name: 'kind in ProductReportAdminDto (SDK)',
    file: 'backend-admin-sdk/src/models/ProductReportAdminDto.ts',
    read: inlineUnions('kind'),
    backend: { prismaEnum: 'EnumProductReportKind' },
  },
  // SOS (spec 0022).
  {
    name: 'SOS_OUTCOMES',
    file: 'modules/sos/sosDisplay.ts',
    read: list('SOS_OUTCOMES'),
    backend: { prismaEnum: 'EnumSosOutcome' },
    labels: 'sos.outcome',
  },
  {
    name: 'SosOutcome (SDK)',
    file: 'backend-admin-sdk/src/apis/SosApi.ts',
    read: union('SosOutcome'),
    backend: { prismaEnum: 'EnumSosOutcome' },
  },
  // Complaints (spec 0052).
  {
    name: 'COMPLAINT_STATUS_FILTERS',
    file: 'modules/complaints/complaintDisplay.ts',
    read: list('COMPLAINT_STATUS_FILTERS'),
    backend: { prismaEnum: 'EnumComplaintStatus' },
    appOnly: ['ALL'],
    labels: 'complaints.statusFilter',
  },
  {
    name: 'ComplaintStatus (SDK)',
    file: 'backend-admin-sdk/src/apis/ComplaintApi.ts',
    read: union('ComplaintStatus'),
    backend: { prismaEnum: 'EnumComplaintStatus' },
  },
  {
    name: 'COMPLAINT_ABOUT_FILTERS',
    file: 'modules/complaints/complaintDisplay.ts',
    read: list('COMPLAINT_ABOUT_FILTERS'),
    backend: { prismaEnum: 'EnumComplaintAbout' },
    appOnly: ['ALL'],
    labels: 'complaints.aboutFilter',
  },
  {
    name: 'ComplaintAbout (SDK)',
    file: 'backend-admin-sdk/src/apis/ComplaintApi.ts',
    read: union('ComplaintAbout'),
    backend: { prismaEnum: 'EnumComplaintAbout' },
  },
  // Review answers (spec 0038).
  {
    name: 'REVIEW_OUTCOMES',
    file: 'modules/reviews/AnswerReviewDialog.tsx',
    read: list('REVIEW_OUTCOMES'),
    backend: { prismaEnum: 'EnumReviewOutcome' },
    labels: 'reviews.outcome',
  },
  {
    name: 'ReviewOutcome (SDK)',
    file: 'backend-admin-sdk/src/apis/ReviewRequestApi.ts',
    read: union('ReviewOutcome'),
    backend: { prismaEnum: 'EnumReviewOutcome' },
  },
  // Chat senders (spec 0034): only some senders make a sound.
  {
    name: 'SOUNDING_SENDERS',
    file: 'modules/chat/ChatLive.tsx',
    read: list('SOUNDING_SENDERS'),
    backend: { prismaEnum: 'EnumChatSenderKind' },
    leftOut: {
      DISPATCH: "dispatch's own lines: the sound is for the lines dispatch has to read (AC-7, AC-9)",
      SYSTEM: "a SYSTEM line repeats a rider's report, which has its own board row (decision 111.2)",
    },
  },
  {
    name: 'ChatSenderKind (SDK)',
    file: 'backend-admin-sdk/src/apis/ChatApi.ts',
    read: union('ChatSenderKind'),
    backend: { prismaEnum: 'EnumChatSenderKind' },
  },
]

// The object at a dotted path in a language's texts ('settings.twoOrderPolicy'), or undefined.
export function textsAt(resources: unknown, dottedPath: string): Record<string, unknown> | undefined {
  let node: unknown = resources
  for (const part of dottedPath.split('.')) {
    if (node === null || typeof node !== 'object') return undefined
    node = (node as Record<string, unknown>)[part]
  }
  return node !== null && typeof node === 'object' ? (node as Record<string, unknown>) : undefined
}

// Reads backend values for a backend source (Prisma enum or shared-types file).
export function getBackendValues(
  source: BackendSource,
  paths: ReturnType<typeof getBackendPaths> = getBackendPaths(),
  cachedPrismaEnums?: PrismaEnums
): string[] {
  const enums = cachedPrismaEnums ?? parsePrismaEnums(paths.backendSchemaPath)
  if ('prismaEnum' in source) {
    const found = enums[source.prismaEnum]
    if (!found) {
      throw new Error(`Prisma enum '${source.prismaEnum}' not found in ${paths.backendSchemaPath}`)
    }
    return Object.keys(found)
  }
  const filePath = path.join(paths.backendSharedTypesDir, source.sharedTypesFile)
  const mod = loadBackendSharedFile<Record<string, unknown>>(filePath, enums)
  const found = mod[source.exportName]
  if (!found || typeof found !== 'object') {
    throw new Error(`Export '${source.exportName}' not found in ${filePath}`)
  }
  return Object.values(found as Record<string, string>)
}

// Compares a mirror against expected backend values and reports diffs both ways, stale allowances, etc.
export function compareMirror(
  mirror: Mirror,
  filePath: string,
  backend: string[]
): {
  staleLeftOut: string[]
  diffs: Array<{
    missingInApp: string[]
    extraInApp: string[]
    missingAppOnly: string[]
    copied: string[]
  }>
} {
  const appOnly = mirror.appOnly ?? []
  const leftOut = mirror.leftOut ?? {}

  const staleLeftOut = Object.keys(leftOut).filter((value) => !backend.includes(value))
  const expected = backend.filter((value) => !(value in leftOut))

  const diffs = mirror.read(filePath).map((values) => {
    const missingAppOnly = appOnly.filter((value) => !values.includes(value))
    const copied = values.filter((value) => !appOnly.includes(value))
    const { missingInApp, extraInApp } = compareSets(copied, expected)
    return { missingInApp, extraInApp, missingAppOnly, copied }
  })

  return { staleLeftOut, diffs }
}

// Asserts that a mirror matches expected backend values both ways.
export function assertMirrorMatches(
  mirror: Mirror,
  filePath: string,
  backend: string[]
) {
  const { staleLeftOut, diffs } = compareMirror(mirror, filePath, backend)
  expect({ file: mirror.file, copy: mirror.name, staleLeftOut }).toEqual({
    file: mirror.file,
    copy: mirror.name,
    staleLeftOut: [],
  })
  for (const { missingInApp, extraInApp, missingAppOnly, copied } of diffs) {
    expect({ file: mirror.file, copy: mirror.name, missingInApp, extraInApp, missingAppOnly }).toEqual({
      file: mirror.file,
      copy: mirror.name,
      missingInApp: [],
      extraInApp: [],
      missingAppOnly: [],
    })
    expect(copied.length).toBeGreaterThan(0)
  }
}

// Checks English and Greek labels for a mirror.
export function checkMirrorLabels(
  labelsPath: string,
  expected: string[],
  resources: { en: unknown; el: unknown } = { en, el }
): { language: string; labels: string; withoutWords: string[] }[] {
  const results: { language: string; labels: string; withoutWords: string[] }[] = []
  for (const [language, res] of [
    ['en', resources.en],
    ['el', resources.el],
  ] as const) {
    const texts = textsAt(res, labelsPath)
    const withoutWords = expected.filter((value) => {
      const word = texts?.[value]
      return typeof word !== 'string' || word.trim() === ''
    })
    results.push({ language, labels: labelsPath, withoutWords })
  }
  return results
}

describe('Hand mirrors parity (row 181: the other adminweb hand mirrors checked against backend)', () => {
  const backendPaths = getBackendPaths()
  if (backendPaths.shouldSkip) {
    warnBackendAbsentOnce(backendPaths.backendDir, 'row 181 hand mirror parity checks')
  }
  const itRow181 = backendPaths.shouldSkip ? it.skip : it

  itRow181('ensures backend directory and core files exist', () => {
    assertBackendFilesExist(backendPaths)
  })

  // Parsed once, and only when the backend is there (a skipped run reads nothing).
  let prismaEnums: PrismaEnums | null = null
  const getPrismaEnums = (): PrismaEnums => {
    prismaEnums = prismaEnums ?? parsePrismaEnums(backendPaths.backendSchemaPath)
    return prismaEnums
  }

  // The backend's values for one source, failing by name when the enum is gone or empty.
  const backendValues = (source: BackendSource): string[] =>
    getBackendValues(source, backendPaths, getPrismaEnums())

  // Not a test of the backend: the table itself must not repeat an entry.
  it('names each mirror once', () => {
    const keys = MIRRORS.map((m) => `${m.file}#${m.name}`)
    expect(new Set(keys).size).toBe(keys.length)
  })

  describe.each(MIRRORS.map((m) => [m.name, m] as const))('%s', (_name, mirror) => {
    const filePath = path.join(SRC, mirror.file)
    const leftOut = mirror.leftOut ?? {}

    itRow181(`matches the backend's values both ways (${mirror.file})`, () => {
      const backend = backendValues(mirror.backend)
      expect(backend.length).toBeGreaterThan(0)
      assertMirrorMatches(mirror, filePath, backend)
    })

    if (mirror.labels) {
      const labelsPath = mirror.labels
      itRow181(`has English and Greek words for every backend value (${labelsPath})`, () => {
        const expected = backendValues(mirror.backend).filter((value) => !(value in leftOut))
        const labelChecks = checkMirrorLabels(labelsPath, expected)
        for (const check of labelChecks) {
          expect(check).toEqual({
            language: check.language,
            labels: labelsPath,
            withoutWords: [],
          })
        }
      })
    }
  })
})

// ===================================================================================================
// Negative tests: hand mirror parity checks fail when either side changes (row 181, clause 2)
// (a) App side: scratch copy of each adminweb file with a value changed, removed or added fails.
// (b) Backend side: scratch Prisma schema (BoxSize, EnumSosOutcome, EnumChatSenderKind) or scratch
//     shared-types folder (EnumTwoOrderPolicy in stacking.ts) with added backend value fails.
// (c) Stale allowances: left out sender backend no longer has, or filter without ALL, fails.
// (d) Labels check: backend value with missing or blank English or Greek translation fails.
// (e) COMPARED_ELSEWHERE guard: entry pointing at non-existent file or file not naming export fails.
// ===================================================================================================

// Helper to run a test with a temporary scratch file and ensure cleanup in finally.
function withScratchFile(name: string, content: string, run: (filePath: string) => void) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'oc-scratch-file-'))
  try {
    const filePath = path.join(dir, name)
    fs.writeFileSync(filePath, content, 'utf-8')
    run(filePath)
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
}

// Helper to run a test with a temporary scratch directory and ensure cleanup in finally.
function withScratchDir(run: (dir: string) => void) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'oc-scratch-dir-'))
  try {
    run(dir)
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
}

// Produces a mutated version of a source file by changing, removing, or adding a target value.
function mutateFileContent(
  content: string,
  target: string,
  mode: 'change' | 'remove' | 'add'
): string {
  if (mode === 'change') {
    return content.replace(new RegExp(`'${target}'`), `'${target}_CHANGED'`)
  }

  if (mode === 'remove') {
    if (new RegExp(`\\{\\s*value:\\s*'${target}'`).test(content)) {
      return content.replace(new RegExp(`\\{\\s*value:\\s*'${target}'[^}]*\\},?\\s*`), '')
    }
    if (content.includes(`'${target}' | `)) {
      return content.replace(`'${target}' | `, '')
    }
    if (content.includes(` | '${target}'`)) {
      return content.replace(` | '${target}'`, '')
    }
    if (content.includes(`'${target}', `)) {
      return content.replace(`'${target}', `, '')
    }
    if (content.includes(`, '${target}'`)) {
      return content.replace(`, '${target}'`, '')
    }
    return content.replace(new RegExp(`'${target}'`), '')
  }

  // mode === 'add'
  if (new RegExp(`\\{\\s*value:\\s*'${target}'`).test(content)) {
    return content.replace(
      new RegExp(`(\\{\\s*value:\\s*'${target}')`),
      `{ value: 'EXTRA_VAL', labelKey: 'extra' }, $1`
    )
  }
  if (content.includes(`'${target}' | `) || content.includes(` | '${target}'`)) {
    return content.replace(`'${target}'`, `'${target}' | 'EXTRA_VAL'`)
  }
  return content.replace(`'${target}'`, `'${target}', 'EXTRA_VAL'`)
}

// Fails the test, naming what was expected, when a lookup finds nothing (instead of a `!` assertion).
function must<T>(value: T | undefined, what: string): T {
  if (value === undefined) throw new Error(`Expected ${what}, found none`)
  return value
}

describe('Negative tests: hand mirror parity checks fail when either side changes (row 181, clause 2)', () => {
  const backendPaths = getBackendPaths()
  const itRow181 = backendPaths.shouldSkip ? it.skip : it

  // (a) App side: mutations in scratch adminweb files report missing or extra values
  describe('(a) App side: mutations in scratch adminweb files report missing or extra values', () => {
    describe.each(MIRRORS.map((m) => [m.name, m] as const))('%s', (_name, mirror: Mirror) => {
      const realFilePath = path.join(SRC, mirror.file)

      itRow181(`detects changed value as missing and extra (${mirror.file})`, () => {
        const backend = getBackendValues(mirror.backend, backendPaths)
        const realContent = fs.readFileSync(realFilePath, 'utf-8')
        const values = must(mirror.read(realFilePath)[0], 'the first list')
        const target = must(values.find((v) => !mirror.appOnly?.includes(v)), 'a copied value')
        expect(target).toBeDefined()

        const mutated = mutateFileContent(realContent, target, 'change')
        withScratchFile(path.basename(mirror.file), mutated, (scratchPath) => {
          const { diffs } = compareMirror(mirror, scratchPath, backend)
          expect(diffs.some((d) => d.missingInApp.includes(target))).toBe(true)
          expect(diffs.some((d) => d.extraInApp.includes(`${target}_CHANGED`))).toBe(true)
          expect(() => assertMirrorMatches(mirror, scratchPath, backend)).toThrow()
        })
      })

      itRow181(`detects removed value as missing in app (${mirror.file})`, () => {
        const backend = getBackendValues(mirror.backend, backendPaths)
        const realContent = fs.readFileSync(realFilePath, 'utf-8')
        const values = must(mirror.read(realFilePath)[0], 'the first list')
        const target = must(values.find((v) => !mirror.appOnly?.includes(v)), 'a copied value')
        expect(target).toBeDefined()

        const mutated = mutateFileContent(realContent, target, 'remove')
        withScratchFile(path.basename(mirror.file), mutated, (scratchPath) => {
          const { diffs } = compareMirror(mirror, scratchPath, backend)
          expect(diffs.some((d) => d.missingInApp.includes(target))).toBe(true)
          expect(() => assertMirrorMatches(mirror, scratchPath, backend)).toThrow()
        })
      })

      itRow181(`detects added value as extra in app (${mirror.file})`, () => {
        const backend = getBackendValues(mirror.backend, backendPaths)
        const realContent = fs.readFileSync(realFilePath, 'utf-8')
        const values = must(mirror.read(realFilePath)[0], 'the first list')
        const target = must(values.find((v) => !mirror.appOnly?.includes(v)), 'a copied value')
        expect(target).toBeDefined()

        const mutated = mutateFileContent(realContent, target, 'add')
        withScratchFile(path.basename(mirror.file), mutated, (scratchPath) => {
          const { diffs } = compareMirror(mirror, scratchPath, backend)
          expect(diffs.some((d) => d.extraInApp.includes('EXTRA_VAL'))).toBe(true)
          expect(() => assertMirrorMatches(mirror, scratchPath, backend)).toThrow()
        })
      })
    })
  })

  // (b) Backend side: additions to backend enums fail comparison
  describe('(b) Backend side: additions to backend enums fail comparison', () => {
    itRow181('adding a value to BoxSize fails BOX_SIZES, SIZES, and SplitBoxSize', () => {
      const realSchema = fs.readFileSync(backendPaths.backendSchemaPath, 'utf-8')
      const mutatedSchema = realSchema.replace(
        /enum\s+BoxSize\s+\{/,
        'enum BoxSize {\n  EXTRA_BOX_SIZE'
      )
      withScratchFile('schema.prisma', mutatedSchema, (scratchSchemaPath) => {
        const scratchPaths = { ...backendPaths, backendSchemaPath: scratchSchemaPath }
        const boxMirrors = MIRRORS.filter(
          (m) => 'prismaEnum' in m.backend && m.backend.prismaEnum === 'BoxSize'
        )
        expect(boxMirrors.length).toBe(3)

        for (const mirror of boxMirrors) {
          const backend = getBackendValues(mirror.backend, scratchPaths)
          expect(backend).toContain('EXTRA_BOX_SIZE')
          const realFile = path.join(SRC, mirror.file)
          const { diffs } = compareMirror(mirror, realFile, backend)
          expect(diffs.some((d) => d.missingInApp.includes('EXTRA_BOX_SIZE'))).toBe(true)
          expect(() => assertMirrorMatches(mirror, realFile, backend)).toThrow()
        }
      })
    })

    itRow181('adding a value to EnumSosOutcome fails SOS_OUTCOMES and SosOutcome (SDK)', () => {
      const realSchema = fs.readFileSync(backendPaths.backendSchemaPath, 'utf-8')
      const mutatedSchema = realSchema.replace(
        /enum\s+EnumSosOutcome\s+\{/,
        'enum EnumSosOutcome {\n  EXTRA_SOS_OUTCOME'
      )
      withScratchFile('schema.prisma', mutatedSchema, (scratchSchemaPath) => {
        const scratchPaths = { ...backendPaths, backendSchemaPath: scratchSchemaPath }
        const sosMirrors = MIRRORS.filter(
          (m) => 'prismaEnum' in m.backend && m.backend.prismaEnum === 'EnumSosOutcome'
        )
        expect(sosMirrors.length).toBe(2)

        for (const mirror of sosMirrors) {
          const backend = getBackendValues(mirror.backend, scratchPaths)
          expect(backend).toContain('EXTRA_SOS_OUTCOME')
          const realFile = path.join(SRC, mirror.file)
          const { diffs } = compareMirror(mirror, realFile, backend)
          expect(diffs.some((d) => d.missingInApp.includes('EXTRA_SOS_OUTCOME'))).toBe(true)
          expect(() => assertMirrorMatches(mirror, realFile, backend)).toThrow()
        }
      })
    })

    itRow181('adding a value to EnumChatSenderKind fails SOUNDING_SENDERS and ChatSenderKind (SDK)', () => {
      const realSchema = fs.readFileSync(backendPaths.backendSchemaPath, 'utf-8')
      const mutatedSchema = realSchema.replace(
        /enum\s+EnumChatSenderKind\s+\{/,
        'enum EnumChatSenderKind {\n  EXTRA_SENDER'
      )
      withScratchFile('schema.prisma', mutatedSchema, (scratchSchemaPath) => {
        const scratchPaths = { ...backendPaths, backendSchemaPath: scratchSchemaPath }
        const chatMirrors = MIRRORS.filter(
          (m) => 'prismaEnum' in m.backend && m.backend.prismaEnum === 'EnumChatSenderKind'
        )
        expect(chatMirrors.length).toBe(2)

        for (const mirror of chatMirrors) {
          const backend = getBackendValues(mirror.backend, scratchPaths)
          expect(backend).toContain('EXTRA_SENDER')
          const realFile = path.join(SRC, mirror.file)
          const { diffs } = compareMirror(mirror, realFile, backend)
          expect(diffs.some((d) => d.missingInApp.includes('EXTRA_SENDER'))).toBe(true)
          expect(() => assertMirrorMatches(mirror, realFile, backend)).toThrow()
        }
      })
    })

    itRow181('adding a third value to EnumTwoOrderPolicy in stacking.ts fails TWO_ORDER_POLICIES', () => {
      const realStacking = fs.readFileSync(
        path.join(backendPaths.backendSharedTypesDir, 'stacking.ts'),
        'utf-8'
      )
      const mutatedStacking = realStacking.replace(
        /export enum EnumTwoOrderPolicy \{/,
        "export enum EnumTwoOrderPolicy {\n  THIRD_POLICY = 'THIRD_POLICY',"
      )

      withScratchDir((scratchSharedTypesDir) => {
        fs.writeFileSync(path.join(scratchSharedTypesDir, 'stacking.ts'), mutatedStacking, 'utf-8')
        const scratchPaths = { ...backendPaths, backendSharedTypesDir: scratchSharedTypesDir }
        const mirror = must(MIRRORS.find((m) => m.name === 'TWO_ORDER_POLICIES'), 'the mirror')
        expect(mirror).toBeDefined()

        const backend = getBackendValues(mirror.backend, scratchPaths)
        expect(backend).toContain('THIRD_POLICY')
        expect(backend.length).toBe(3)

        const realFile = path.join(SRC, mirror.file)
        const { diffs } = compareMirror(mirror, realFile, backend)
        expect(diffs.some((d) => d.missingInApp.includes('THIRD_POLICY'))).toBe(true)
        expect(() => assertMirrorMatches(mirror, realFile, backend)).toThrow()
      })
    })
  })

  // (c) Stale allowances fail comparison
  describe('(c) Stale allowances fail comparison', () => {
    itRow181('a left out sender the backend no longer has fails as staleLeftOut', () => {
      const mirror = must(MIRRORS.find((m) => m.name === 'SOUNDING_SENDERS'), 'the mirror')
      expect(mirror).toBeDefined()
      expect(mirror.leftOut).toHaveProperty('DISPATCH')
      expect(mirror.leftOut).toHaveProperty('SYSTEM')

      const realFile = path.join(SRC, mirror.file)
      // Simulate backend where DISPATCH is missing
      const backendWithoutDispatch = ['COURIER', 'PARTNER', 'SYSTEM']
      const resDispatch = compareMirror(mirror, realFile, backendWithoutDispatch)
      expect(resDispatch.staleLeftOut).toEqual(['DISPATCH'])
      expect(() => assertMirrorMatches(mirror, realFile, backendWithoutDispatch)).toThrow()

      // Simulate backend where SYSTEM is missing
      const backendWithoutSystem = ['COURIER', 'PARTNER', 'DISPATCH']
      const resSystem = compareMirror(mirror, realFile, backendWithoutSystem)
      expect(resSystem.staleLeftOut).toEqual(['SYSTEM'])
      expect(() => assertMirrorMatches(mirror, realFile, backendWithoutSystem)).toThrow()
    })

    itRow181('a filter without its ALL fails as missingAppOnly', () => {
      const filterMirrors = MIRRORS.filter((m) => m.appOnly?.includes('ALL'))
      expect(filterMirrors.length).toBe(2) // COMPLAINT_STATUS_FILTERS and COMPLAINT_ABOUT_FILTERS

      for (const mirror of filterMirrors) {
        const backend = getBackendValues(mirror.backend, backendPaths)
        const realFilePath = path.join(SRC, mirror.file)
        const realContent = fs.readFileSync(realFilePath, 'utf-8')

        // Remove ALL entry for this specific filter list in complaintDisplay.ts
        const mutated = realContent.replace(
          new RegExp(`\\{\\s*value:\\s*'ALL',\\s*labelKey:\\s*'${mirror.labels}\\.ALL'\\s*\\},?\\s*`),
          ''
        )
        withScratchFile(path.basename(mirror.file), mutated, (scratchPath) => {
          const { diffs } = compareMirror(mirror, scratchPath, backend)
          expect(diffs.some((d) => d.missingAppOnly.includes('ALL'))).toBe(true)
          expect(() => assertMirrorMatches(mirror, scratchPath, backend)).toThrow()
        })
      }
    })
  })

  // (d) Labels check fails on missing or blank translations
  describe('(d) Labels check fails on missing or blank translations', () => {
    itRow181('a backend value absent from language resources fails labels check in en and el', () => {
      const mirror = must(MIRRORS.find((m) => m.labels === 'settings.twoOrderPolicy'), 'the mirror')
      expect(mirror).toBeDefined()

      const backend = getBackendValues(mirror.backend, backendPaths)
      const backendWithUntranslated = [...backend, 'UNTRANSLATED_SETTING_VALUE']

      const checks = checkMirrorLabels(must(mirror.labels, 'the labels path'), backendWithUntranslated)
      const enCheck = must(checks.find((c) => c.language === 'en'), 'the language check')
      const elCheck = must(checks.find((c) => c.language === 'el'), 'the language check')

      expect(enCheck.withoutWords).toContain('UNTRANSLATED_SETTING_VALUE')
      expect(elCheck.withoutWords).toContain('UNTRANSLATED_SETTING_VALUE')
    })

    itRow181('a blank or missing English word fails English check only', () => {
      const mirror = must(MIRRORS.find((m) => m.labels === 'settings.twoOrderPolicy'), 'the mirror')
      const backend = getBackendValues(mirror.backend, backendPaths)

      // Mock en with blank string for first backend value
      const target = must(backend[0], 'a backend value')
      const mockEn = {
        settings: {
          twoOrderPolicy: {
            ...((en as Record<string, unknown>).settings as Record<string, unknown>).twoOrderPolicy as Record<string, string>,
            [target]: '',
          },
        },
      }

      const checks = checkMirrorLabels(must(mirror.labels, 'the labels path'), backend, { en: mockEn, el })
      const enCheck = must(checks.find((c) => c.language === 'en'), 'the language check')
      const elCheck = must(checks.find((c) => c.language === 'el'), 'the language check')

      expect(enCheck.withoutWords).toEqual([target])
      expect(elCheck.withoutWords).toEqual([])
    })

    itRow181('a blank or missing Greek word fails Greek check only', () => {
      const mirror = must(MIRRORS.find((m) => m.labels === 'settings.twoOrderPolicy'), 'the mirror')
      const backend = getBackendValues(mirror.backend, backendPaths)

      // Mock el with missing property for first backend value
      const target = must(backend[0], 'a backend value')
      const elCopy = {
        ...((el as Record<string, unknown>).settings as Record<string, unknown>).twoOrderPolicy as Record<string, string>,
      }
      delete elCopy[target]
      const mockEl = {
        settings: {
          twoOrderPolicy: elCopy,
        },
      }

      const checks = checkMirrorLabels(must(mirror.labels, 'the labels path'), backend, { en, el: mockEl })
      const enCheck = must(checks.find((c) => c.language === 'en'), 'the language check')
      const elCheck = must(checks.find((c) => c.language === 'el'), 'the language check')

      expect(enCheck.withoutWords).toEqual([])
      expect(elCheck.withoutWords).toEqual([target])
    })
  })

  // (e) Guard in backend-types.test.ts: COMPARED_ELSEWHERE pointing at a file that does not name
  //     the export fails.
  describe('(e) COMPARED_ELSEWHERE guard predicate fails on missing file or missing export name', () => {
    it('detects missing test files and test files that do not name the export', () => {
      withScratchFile('valid.test.ts', 'export const EnumTwoOrderPolicy = 1\n', (filePath) => {
        const dir = path.dirname(filePath)

        // Non-existent file fails
        expect(
          findBrokenComparedElsewhere({ EnumTwoOrderPolicy: 'does-not-exist.test.ts' }, dir)
        ).toEqual([['EnumTwoOrderPolicy', 'does-not-exist.test.ts']])

        // Existing file without export name fails
        expect(
          findBrokenComparedElsewhere({ EnumOtherExport: 'valid.test.ts' }, dir)
        ).toEqual([['EnumOtherExport', 'valid.test.ts']])

        // Existing file naming export passes
        expect(
          findBrokenComparedElsewhere({ EnumTwoOrderPolicy: 'valid.test.ts' }, dir)
        ).toEqual([])
      })
    })
  })
})
