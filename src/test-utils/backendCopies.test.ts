// The shared helpers of the copy checks (src/test-utils/backendCopies.ts), tested once here rather than
// in each copy check (row 181). These tests need no backend: they use missing folders and scratch files.
import fs from 'fs'
import os from 'os'
import path from 'path'
import {
  DEFAULT_BACKEND_DIR,
  assertBackendFilesExist,
  compareSets,
  findBrokenComparedElsewhere,
  getBackendPaths,
  loadBackendSharedFile,
  readPropertyUnions,
  readStringList,
  readStringUnion,
} from './backendCopies'

const MISSING_DIR = path.resolve(__dirname, '../../../nonexistent-backend-for-test')

// Writes `code` to a scratch file named `name`, runs `check` with its path, and always removes it.
function withScratchFile(name: string, code: string, check: (filePath: string) => void) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'oc-backend-copies-'))
  try {
    const filePath = path.join(dir, name)
    fs.writeFileSync(filePath, code)
    check(filePath)
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
}

describe('backendCopies: skip rules (rows 163 and 170)', () => {
  // Row 181 review: this expected folder is found a different way from DEFAULT_BACKEND_DIR's own
  // expression (walking up to adminweb's package.json, not counting '../'), so moving backendCopies.ts
  // and this test together cannot make both wrong at once and quietly skip all five copy checks.
  it('defaults to the backend repo beside this one', () => {
    let adminwebRoot = process.cwd()
    while (!fs.existsSync(path.join(adminwebRoot, 'package.json'))) {
      const parent = path.dirname(adminwebRoot)
      if (parent === adminwebRoot) throw new Error(`No package.json above ${process.cwd()}`)
      adminwebRoot = parent
    }
    const packageName = JSON.parse(fs.readFileSync(path.join(adminwebRoot, 'package.json'), 'utf-8')).name
    expect(packageName).toBe('admin-web')
    const expectedDir = path.join(path.dirname(adminwebRoot), 'opencourier-backend')

    expect(DEFAULT_BACKEND_DIR).toBe(expectedDir)
    const paths = getBackendPaths({ env: {} })
    expect(paths.backendDir).toBe(expectedDir)
    expect(paths.backendSchemaPath).toBe(path.join(expectedDir, 'prisma/schema.prisma'))
  })

  it('skips when default backend dir is absent and no override is set', () => {
    const paths = getBackendPaths({ defaultDir: MISSING_DIR, env: {} })
    expect(paths.shouldSkip).toBe(true)
    expect(paths.dirExists).toBe(false)
  })

  it('turns skip into failure when REQUIRE_BACKEND=1 even if backend dir is absent', () => {
    const paths = getBackendPaths({ defaultDir: MISSING_DIR, env: { REQUIRE_BACKEND: '1' } })
    expect(paths.shouldSkip).toBe(false)
    expect(paths.requireBackend).toBe(true)
    expect(() => assertBackendFilesExist(paths)).toThrow(
      `REQUIRE_BACKEND=1 is set, but backend directory was not found under ${paths.backendDir}`
    )
  })

  it('does not skip when an override path is set, even if the directory does not exist', () => {
    const paths = getBackendPaths({ env: { OPENCOURIER_BACKEND_DIR: '/nonexistent/override/dir' } })
    expect(paths.shouldSkip).toBe(false)
    expect(paths.hasOverride).toBe(true)
    expect(() => assertBackendFilesExist(paths)).toThrow(
      'Backend directory was not found under /nonexistent/override/dir'
    )
  })

  it.each(['BACKEND_SCHEMA_PATH', 'BACKEND_SHARED_TYPES_DIR', 'BACKEND_EN_PATH', 'BACKEND_EL_PATH', 'BACKEND_MESSAGES_PATH'])(
    'does not skip when only %s is set',
    (name) => {
      const paths = getBackendPaths({ defaultDir: MISSING_DIR, env: { [name]: '/scratch/file' } })
      expect(paths.shouldSkip).toBe(false)
      expect(paths.overriddenPaths).toEqual(['/scratch/file'])
    }
  )

  it('detects missing required file in present directory', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'oc-scratch-backend-'))
    try {
      const paths = getBackendPaths({ env: { OPENCOURIER_BACKEND_DIR: tempDir } })
      expect(paths.shouldSkip).toBe(false)
      expect(() => assertBackendFilesExist(paths)).toThrow(
        `Backend Prisma schema missing: checked ${paths.backendSchemaPath}`
      )
      expect(() =>
        assertBackendFilesExist(paths, { 'localization file en.ts': paths.backendEnPath })
      ).toThrow(`Backend localization file en.ts missing: checked ${paths.backendEnPath}`)
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true })
    }
  })

  it('does not need the folder when every required file has its own override', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'oc-scratch-overrides-'))
    try {
      const schemaPath = path.join(tempDir, 'schema.prisma')
      const sharedTypesDir = path.join(tempDir, 'shared-types')
      fs.writeFileSync(schemaPath, 'enum Test { A }')
      fs.mkdirSync(sharedTypesDir)
      const paths = getBackendPaths({
        defaultDir: MISSING_DIR,
        env: { BACKEND_SCHEMA_PATH: schemaPath, BACKEND_SHARED_TYPES_DIR: sharedTypesDir },
      })
      expect(paths.dirExists).toBe(false)
      expect(() => assertBackendFilesExist(paths)).not.toThrow()
      // A required file that is not overridden still needs the folder.
      expect(() =>
        assertBackendFilesExist(paths, { 'Prisma schema': paths.backendSchemaPath, en: paths.backendEnPath })
      ).toThrow(`Backend directory was not found under ${paths.backendDir}`)
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true })
    }
  })
})

describe('backendCopies: the loader', () => {
  it('fails with a clear message naming the file if an evaluated file calls require', () => {
    withScratchFile('scratch-require.ts', 'const crypto = require("crypto"); export const data = { crypto };', (file) => {
      expect(() => loadBackendSharedFile(file)).toThrow(
        `Evaluating ${file} attempted to call require('crypto')`
      )
    })
  })

  it('answers @prisma/types with the Prisma enums it is given', () => {
    withScratchFile(
      'uses-prisma.ts',
      "import { BoxSize } from '@prisma/types'\nexport const SIZES = Object.keys(BoxSize)\n",
      (file) => {
        const mod = loadBackendSharedFile<{ SIZES: string[] }>(file, { BoxSize: { SMALL: 'SMALL' } })
        expect(mod.SIZES).toEqual(['SMALL'])
      }
    )
  })
})

describe('backendCopies: compareSets', () => {
  it('detects missing and extra items correctly as sets', () => {
    expect(compareSets(['A', 'B'], ['B', 'C'])).toEqual({ missingInApp: ['C'], extraInApp: ['A'] })
  })

  it('considers sets equal regardless of element order', () => {
    expect(compareSets(['A', 'B', 'C'], ['C', 'A', 'B'])).toEqual({ missingInApp: [], extraInApp: [] })
  })
})

describe('backendCopies: the hand mirror readers (row 181)', () => {
  it('reads a list of strings, through as const, a type annotation, filter objects and a spread', () => {
    withScratchFile(
      'lists.tsx',
      [
        "const PLAIN: Size[] = ['SMALL', 'LARGE']",
        "export const FROZEN = ['A', 'B'] as const",
        "const FILTERS = [{ value: 'ALL', labelKey: 'x.ALL' }, { value: 'OPEN', labelKey: 'x.OPEN' }]",
        "const MORE = [...PLAIN, 'MEDIUM']",
      ].join('\n'),
      (file) => {
        expect(readStringList(file, 'PLAIN')).toEqual(['SMALL', 'LARGE'])
        expect(readStringList(file, 'FROZEN')).toEqual(['A', 'B'])
        expect(readStringList(file, 'FILTERS')).toEqual(['ALL', 'OPEN'])
        expect(readStringList(file, 'MORE')).toEqual(['SMALL', 'LARGE', 'MEDIUM'])
      }
    )
  })

  it('throws naming the constant and file for anything it cannot read', () => {
    withScratchFile(
      'bad.ts',
      [
        "const EXTRA = 'X'",
        "const WITH_NAME = ['A', EXTRA]",
        'const NOT_A_LIST = 3',
        "const UNKNOWN_SPREAD = [...ELSEWHERE, 'A']",
        "const NO_VALUE = [{ labelKey: 'x' }]",
      ].join('\n'),
      (file) => {
        expect(() => readStringList(file, 'MISSING')).toThrow(`Constant 'MISSING' not found in ${file}`)
        expect(() => readStringList(file, 'WITH_NAME')).toThrow(`Cannot read element in 'WITH_NAME' in ${file}`)
        expect(() => readStringList(file, 'NOT_A_LIST')).toThrow(
          `Constant 'NOT_A_LIST' in ${file} is not an array literal`
        )
        expect(() => readStringList(file, 'UNKNOWN_SPREAD')).toThrow(
          `Cannot resolve spread '...ELSEWHERE' in 'UNKNOWN_SPREAD' in ${file}`
        )
        expect(() => readStringList(file, 'NO_VALUE')).toThrow(`Cannot read element in 'NO_VALUE' in ${file}`)
        expect(() => readStringList('/nonexistent/file.ts', 'X')).toThrow('File not found: /nonexistent/file.ts')
      }
    )
  })

  it('reads a union type and inline property unions, and throws on what it cannot read', () => {
    withScratchFile(
      'unions.ts',
      [
        "export type Outcome = 'STANDS' | 'CHANGED'",
        "export type One = 'ONLY'",
        'export type Wide = string',
        "type Mixed = 'A' | Other",
        "function f(p: { kind: 'WRONG_ITEM' | 'MISSING_ITEM' }) {}",
        "interface Dto { kind: 'WRONG_ITEM' }",
      ].join('\n'),
      (file) => {
        expect(readStringUnion(file, 'Outcome')).toEqual(['STANDS', 'CHANGED'])
        expect(readStringUnion(file, 'One')).toEqual(['ONLY'])
        expect(() => readStringUnion(file, 'Wide')).toThrow(`Cannot read union member in 'Wide' in ${file}`)
        expect(() => readStringUnion(file, 'Mixed')).toThrow(`Cannot read union member in 'Mixed' in ${file}`)
        expect(() => readStringUnion(file, 'Gone')).toThrow(`Type 'Gone' not found in ${file}`)
        expect(readPropertyUnions(file, 'kind')).toEqual([['WRONG_ITEM', 'MISSING_ITEM'], ['WRONG_ITEM']])
        expect(() => readPropertyUnions(file, 'size')).toThrow(`Property 'size' not found in ${file}`)
      }
    )
  })
})

describe('backendCopies: findBrokenComparedElsewhere (guard in backend-types.test.ts)', () => {
  it('detects missing files and missing export names in files', () => {
    withScratchFile('sample.test.ts', 'export const ExportA = 1\nconst ExportB = 2\n', (filePath) => {
      const dir = path.dirname(filePath)
      const baseName = path.basename(filePath)

      // Both exports present in file -> no broken entries
      expect(findBrokenComparedElsewhere({ ExportA: baseName, ExportB: baseName }, dir)).toEqual([])

      // Export not in file -> reported as broken
      expect(findBrokenComparedElsewhere({ MissingExport: baseName }, dir)).toEqual([
        ['MissingExport', baseName],
      ])

      // File does not exist -> reported as broken
      expect(findBrokenComparedElsewhere({ ExportA: 'nonexistent.test.ts' }, dir)).toEqual([
        ['ExportA', 'nonexistent.test.ts'],
      ])
    })
  })
})
