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
import path from 'path'
import { en } from '@/i18n/resources/en'
import { el } from '@/i18n/resources/el'
import {
  PrismaEnums,
  assertBackendFilesExist,
  compareSets,
  getBackendPaths,
  loadBackendSharedFile,
  parsePrismaEnums,
  readPropertyUnions,
  readStringList,
  readStringUnion,
  warnBackendAbsentOnce,
} from './backendCopies'

// adminweb's src folder: every path in MIRRORS is relative to it.
const SRC = path.resolve(__dirname, '..')

// Where a backend list comes from: an enum in the Prisma schema, or an exported enum in a backend
// shared-types file.
type BackendSource =
  | { prismaEnum: string }
  | { sharedTypesFile: string; exportName: string }

interface Mirror {
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

const MIRRORS: Mirror[] = [
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
function textsAt(resources: unknown, dottedPath: string): Record<string, unknown> | undefined {
  let node: unknown = resources
  for (const part of dottedPath.split('.')) {
    if (node === null || typeof node !== 'object') return undefined
    node = (node as Record<string, unknown>)[part]
  }
  return node !== null && typeof node === 'object' ? (node as Record<string, unknown>) : undefined
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
  const backendValues = (source: BackendSource): string[] => {
    if ('prismaEnum' in source) {
      const found = getPrismaEnums()[source.prismaEnum]
      if (!found) {
        throw new Error(`Prisma enum '${source.prismaEnum}' not found in ${backendPaths.backendSchemaPath}`)
      }
      return Object.keys(found)
    }
    const filePath = path.join(backendPaths.backendSharedTypesDir, source.sharedTypesFile)
    const mod = loadBackendSharedFile<Record<string, unknown>>(filePath, getPrismaEnums())
    const found = mod[source.exportName]
    if (!found || typeof found !== 'object') {
      throw new Error(`Export '${source.exportName}' not found in ${filePath}`)
    }
    // A TypeScript string enum compiles to an object of NAME: 'value'; its values are the stored text.
    return Object.values(found as Record<string, string>)
  }

  // Not a test of the backend: the table itself must not repeat an entry.
  it('names each mirror once', () => {
    const keys = MIRRORS.map((m) => `${m.file}#${m.name}`)
    expect(new Set(keys).size).toBe(keys.length)
  })

  describe.each(MIRRORS.map((m) => [m.name, m] as const))('%s', (_name, mirror) => {
    const filePath = path.join(SRC, mirror.file)
    const appOnly = mirror.appOnly ?? []
    const leftOut = mirror.leftOut ?? {}

    itRow181(`matches the backend's values both ways (${mirror.file})`, () => {
      const backend = backendValues(mirror.backend)
      expect(backend.length).toBeGreaterThan(0)

      // Every value left out on purpose is still a backend value (else the allowance is stale).
      const staleLeftOut = Object.keys(leftOut).filter((value) => !backend.includes(value))
      expect({ file: mirror.file, copy: mirror.name, staleLeftOut }).toEqual({
        file: mirror.file,
        copy: mirror.name,
        staleLeftOut: [],
      })
      const expected = backend.filter((value) => !(value in leftOut))

      for (const values of mirror.read(filePath)) {
        // adminweb's own values must still be there, then are set aside.
        const missingAppOnly = appOnly.filter((value) => !values.includes(value))
        const copied = values.filter((value) => !appOnly.includes(value))
        const { missingInApp, extraInApp } = compareSets(copied, expected)
        // Named in the comparison, so a failure says which copy and which value.
        expect({ file: mirror.file, copy: mirror.name, missingInApp, extraInApp, missingAppOnly }).toEqual({
          file: mirror.file,
          copy: mirror.name,
          missingInApp: [],
          extraInApp: [],
          missingAppOnly: [],
        })
        expect(copied.length).toBeGreaterThan(0)
      }
    })

    if (mirror.labels) {
      const labelsPath = mirror.labels
      itRow181(`has English and Greek words for every backend value (${labelsPath})`, () => {
        const expected = backendValues(mirror.backend).filter((value) => !(value in leftOut))
        for (const [language, resources] of [
          ['en', en],
          ['el', el],
        ] as const) {
          const texts = textsAt(resources, labelsPath)
          const withoutWords = expected.filter((value) => {
            const word = texts?.[value]
            return typeof word !== 'string' || word.trim() === ''
          })
          expect({ language, labels: labelsPath, withoutWords }).toEqual({
            language,
            labels: labelsPath,
            withoutWords: [],
          })
        }
      })
    }
  })
})
