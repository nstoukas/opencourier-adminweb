// Scope row 175: adminweb's hand mirrors of backend lists are checked against the backend.
// Precedent: src/shared-types/backend-types.test.ts (row 170).
// Compares hand-copied backend lists outside src/shared-types/ with backend originals:
// 1. CancelledBy in src/modules/deliveries/utils/cancellationDisplay.ts vs backend EnumCancelledBy
// 2. PICKED_UP_STATUSES in cancellationDisplay.ts vs backend DELIVERY_PICKED_UP_STATUSES
// 3. ONGOING_STATUSES in cancellationDisplay.ts vs backend DELIVERY_ONGOING_STATUSES
// 4. ONGOING_DELIVERY_STATUSES in src/modules/deliveries/components/ReassignCourierDialog.tsx vs backend DELIVERY_ONGOING_STATUSES
// Hand mirrors are not exported from source, so they are extracted via TypeScript compiler API.
// Compares as sets where order does not matter, checking both directions (missing in app, extra in app).
// Honours OPENCOURIER_BACKEND_DIR, BACKEND_SCHEMA_PATH, BACKEND_SHARED_TYPES_DIR, and REQUIRE_BACKEND=1.
import fs from 'fs'
import path from 'path'
import os from 'os'
import vm from 'vm'
import ts from 'typescript'

interface BackendPathsOptions {
  defaultDir?: string
  env?: Record<string, string | undefined>
}

// Resolves backend file locations with support for overrides (e.g. scratch copies in tests).
export function getBackendPaths(options?: BackendPathsOptions) {
  const env = options?.env ?? process.env
  const defaultDir =
    options?.defaultDir ?? path.resolve(__dirname, '../../../../../opencourier-backend')

  const hasOverride = Boolean(
    env.OPENCOURIER_BACKEND_DIR ||
      env.BACKEND_SCHEMA_PATH ||
      env.BACKEND_SHARED_TYPES_DIR
  )

  const allFilesOverridden = Boolean(
    env.BACKEND_SCHEMA_PATH && env.BACKEND_SHARED_TYPES_DIR
  )

  const backendDir = env.OPENCOURIER_BACKEND_DIR || defaultDir
  const backendSharedTypesDir =
    env.BACKEND_SHARED_TYPES_DIR || path.join(backendDir, 'src/shared-types')
  const backendSchemaPath =
    env.BACKEND_SCHEMA_PATH || path.join(backendDir, 'prisma/schema.prisma')

  const dirExists = fs.existsSync(backendDir)
  const requireBackend = env.REQUIRE_BACKEND === '1'

  // Skip only when the backend folder itself is absent and no override is set.
  // When REQUIRE_BACKEND=1, never skip (it turns the absence into a failure).
  const shouldSkip = !hasOverride && !dirExists && !requireBackend

  return {
    backendDir,
    backendSharedTypesDir,
    backendSchemaPath,
    hasOverride,
    allFilesOverridden,
    dirExists,
    requireBackend,
    shouldSkip,
  }
}

// Verifies required backend files exist; only checks directory existence when paths are derived from it.
export function assertBackendFilesExist(paths: ReturnType<typeof getBackendPaths>) {
  if (paths.requireBackend && !paths.dirExists && !paths.allFilesOverridden) {
    throw new Error(
      `REQUIRE_BACKEND=1 is set, but backend directory was not found under ${paths.backendDir}`
    )
  }
  if (!paths.dirExists && !paths.allFilesOverridden) {
    throw new Error(`Backend directory was not found under ${paths.backendDir}`)
  }
  if (!fs.existsSync(paths.backendSchemaPath)) {
    throw new Error(
      `Backend Prisma schema missing: checked ${paths.backendSchemaPath}`
    )
  }
  if (!fs.existsSync(paths.backendSharedTypesDir)) {
    throw new Error(
      `Backend shared-types dir missing: checked ${paths.backendSharedTypesDir}`
    )
  }
}

let loggedSkipWarning = false
export function warnBackendAbsentOnce(backendDir: string) {
  if (!loggedSkipWarning) {
    loggedSkipWarning = true
    console.warn(
      '\n=================================================================================\n' +
        `WARNING: Backend directory not found under ${backendDir}.\n` +
        'Skipping hand mirror parity checks because backend repo is absent.\n' +
        '=================================================================================\n'
    )
  }
}

// Parses Prisma schema enums into string-record dictionaries.
export function parsePrismaEnums(schemaPath: string): Record<string, Record<string, string>> {
  if (!fs.existsSync(schemaPath)) {
    throw new Error(`Prisma schema file missing: ${schemaPath}`)
  }
  const schemaContent = fs.readFileSync(schemaPath, 'utf-8')
  const enums: Record<string, Record<string, string>> = {}
  for (const match of Array.from(schemaContent.matchAll(/enum\s+(\w+)\s+\{([^}]+)\}/g))) {
    const enumName = match[1]
    const body = match[2]
    if (!enumName || !body) continue
    const members = body
      .split('\n')
      .map((line: string) => line.trim())
      .filter((line: string) => line && !line.startsWith('//'))
      .map((line: string) => line.split(/\s+/)[0])
      .filter(Boolean)
    enums[enumName] = Object.fromEntries(members.map((m: string) => [m, m]))
  }
  return enums
}

// Loads a backend TypeScript file by transpiling to CommonJS and executing in a vm context.
// Passes Prisma enums when `@prisma/types` is imported, and resolves relative imports within shared-types.
export function loadBackendSharedFile<T = Record<string, unknown>>(
  filePath: string,
  prismaEnums: Record<string, Record<string, string>>
): T {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Backend file not found: ${filePath}`)
  }
  const code = fs.readFileSync(filePath, 'utf-8')
  const js = ts.transpileModule(code, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  }).outputText

  const exportsObj: Record<string, unknown> = {}
  const moduleObj = { exports: exportsObj }

  const customRequire = (id: string): unknown => {
    if (id === '@prisma/types' || id.endsWith('prisma/schema.prisma')) {
      return prismaEnums
    }
    if (id.startsWith('.')) {
      const dir = path.dirname(filePath)
      let target = path.resolve(dir, id)
      if (fs.existsSync(target) && fs.statSync(target).isDirectory()) {
        target = path.join(target, 'index')
      }
      if (!fs.existsSync(target) && fs.existsSync(target + '.ts')) target = target + '.ts'
      if (!fs.existsSync(target) && fs.existsSync(target + '.d.ts')) return {}
      if (fs.existsSync(target)) {
        return loadBackendSharedFile(target, prismaEnums)
      }
    }
    throw new Error(
      `Evaluating ${filePath} attempted to call require('${id}'). ` +
        'This loader runs the co-op plain data files and does not support value imports.'
    )
  }

  const context = vm.createContext({
    exports: exportsObj,
    module: moduleObj,
    require: customRequire,
  })

  try {
    vm.runInContext(js, context)
  } catch (err: unknown) {
    if (
      err instanceof Error &&
      err.message.includes('attempted to call require')
    ) {
      throw err
    }
    const message = err instanceof Error ? err.message : String(err)
    throw new Error(`Failed to evaluate ${filePath}: ${message}`)
  }

  return moduleObj.exports as T
}

// Uses the TypeScript compiler API to extract hand mirrors from cancellationDisplay.ts
// without needing runtime exports or editing source code.
export function readCancellationDisplayMirrors(filePath: string) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`)
  }
  const code = fs.readFileSync(filePath, 'utf-8')
  const sf = ts.createSourceFile(path.basename(filePath), code, ts.ScriptTarget.Latest, true)

  const localArrays: Record<string, string[]> = {}
  const cancelledBy: string[] = []
  let pickedUpStatuses: string[] = []
  let ongoingStatuses: string[] = []

  const extractArray = (init: ts.ArrayLiteralExpression): string[] => {
    const values: string[] = []
    for (const elem of init.elements) {
      if (ts.isStringLiteral(elem)) {
        values.push(elem.text)
      } else if (ts.isSpreadElement(elem) && ts.isIdentifier(elem.expression)) {
        const refName = elem.expression.text
        const existing = localArrays[refName]
        if (existing) {
          values.push(...existing)
        }
      }
    }
    return values
  }

  sf.statements.forEach((stmt) => {
    // Extracts: export type CancelledBy = 'RESTAURANT' | 'CUSTOMER' | 'COOP'
    if (ts.isTypeAliasDeclaration(stmt) && stmt.name.text === 'CancelledBy') {
      if (ts.isUnionTypeNode(stmt.type)) {
        stmt.type.types.forEach((t) => {
          if (ts.isLiteralTypeNode(t) && ts.isStringLiteral(t.literal)) {
            cancelledBy.push(t.literal.text)
          }
        })
      }
    }

    // Extracts: const PICKED_UP_STATUSES = [...] and const ONGOING_STATUSES = [...]
    if (ts.isVariableStatement(stmt)) {
      stmt.declarationList.declarations.forEach((decl) => {
        if (
          ts.isIdentifier(decl.name) &&
          decl.initializer &&
          ts.isArrayLiteralExpression(decl.initializer)
        ) {
          const name = decl.name.text
          const vals = extractArray(decl.initializer)
          localArrays[name] = vals
          if (name === 'PICKED_UP_STATUSES') pickedUpStatuses = vals
          if (name === 'ONGOING_STATUSES') ongoingStatuses = vals
        }
      })
    }
  })

  return { cancelledBy, pickedUpStatuses, ongoingStatuses }
}

// Uses the TypeScript compiler API to extract ONGOING_DELIVERY_STATUSES from ReassignCourierDialog.tsx
export function readReassignCourierDialogMirrors(filePath: string) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`)
  }
  const code = fs.readFileSync(filePath, 'utf-8')
  const sf = ts.createSourceFile(path.basename(filePath), code, ts.ScriptTarget.Latest, true)

  const ongoingDeliveryStatuses: string[] = []

  sf.statements.forEach((stmt) => {
    if (ts.isVariableStatement(stmt)) {
      stmt.declarationList.declarations.forEach((decl) => {
        if (
          ts.isIdentifier(decl.name) &&
          decl.name.text === 'ONGOING_DELIVERY_STATUSES' &&
          decl.initializer &&
          ts.isArrayLiteralExpression(decl.initializer)
        ) {
          decl.initializer.elements.forEach((elem) => {
            if (ts.isStringLiteral(elem)) {
              ongoingDeliveryStatuses.push(elem.text)
            }
          })
        }
      })
    }
  })

  return { ongoingDeliveryStatuses }
}

// Compares two lists as sets both ways: detects items missing in app, extra in app.
// Order does not matter.
export function compareSets(
  adminItems: string[],
  backendItems: string[]
): {
  missingInApp: string[]
  extraInApp: string[]
} {
  const adminSet = new Set(adminItems)
  const backendSet = new Set(backendItems)

  const missingInApp = backendItems.filter((item) => !adminSet.has(item))
  const extraInApp = adminItems.filter((item) => !backendSet.has(item))

  return { missingInApp, extraInApp }
}

describe('Hand mirrors parity (row 175: adminweb mirrors checked against backend)', () => {
  describe('Backend path resolution and skip guard', () => {
    it('skips when default backend dir is absent and no override is set', () => {
      const paths = getBackendPaths({
        defaultDir: path.resolve(__dirname, '../../../../../nonexistent-backend-for-test'),
        env: {},
      })
      expect(paths.shouldSkip).toBe(true)
      expect(paths.dirExists).toBe(false)
    })

    it('turns skip into failure when REQUIRE_BACKEND=1 even if backend dir is absent', () => {
      const paths = getBackendPaths({
        defaultDir: path.resolve(__dirname, '../../../../../nonexistent-backend-for-test'),
        env: { REQUIRE_BACKEND: '1' },
      })
      expect(paths.shouldSkip).toBe(false)
      expect(paths.requireBackend).toBe(true)
      expect(paths.dirExists).toBe(false)
      expect(() => assertBackendFilesExist(paths)).toThrow(
        `REQUIRE_BACKEND=1 is set, but backend directory was not found under ${paths.backendDir}`
      )
    })

    it('does not skip when an override path is set, even if the directory does not exist', () => {
      const paths = getBackendPaths({
        env: { OPENCOURIER_BACKEND_DIR: '/nonexistent/override/dir' },
      })
      expect(paths.shouldSkip).toBe(false)
      expect(paths.hasOverride).toBe(true)
      expect(paths.dirExists).toBe(false)
      expect(() => assertBackendFilesExist(paths)).toThrow(
        `Backend directory was not found under ${paths.backendDir}`
      )
    })

    it('detects missing required file in present directory', () => {
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'oc-scratch-backend-'))
      try {
        const paths = getBackendPaths({
          env: { OPENCOURIER_BACKEND_DIR: tempDir },
        })
        expect(paths.shouldSkip).toBe(false)
        expect(paths.dirExists).toBe(true)
        expect(() => assertBackendFilesExist(paths)).toThrow(
          `Backend Prisma schema missing: checked ${paths.backendSchemaPath}`
        )
      } finally {
        fs.rmSync(tempDir, { recursive: true, force: true })
      }
    })

    it('does not fail existence check when all per target overrides exist even if default dir is absent', () => {
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'oc-scratch-overrides-'))
      try {
        const schemaPath = path.join(tempDir, 'schema.prisma')
        const sharedTypesDir = path.join(tempDir, 'shared-types')
        fs.writeFileSync(schemaPath, 'enum Test { A }')
        fs.mkdirSync(sharedTypesDir)

        const paths = getBackendPaths({
          defaultDir: path.resolve(__dirname, '../../../../../nonexistent-backend-for-test'),
          env: {
            BACKEND_SCHEMA_PATH: schemaPath,
            BACKEND_SHARED_TYPES_DIR: sharedTypesDir,
          },
        })
        expect(paths.shouldSkip).toBe(false)
        expect(paths.allFilesOverridden).toBe(true)
        expect(paths.dirExists).toBe(false)
        expect(fs.existsSync(paths.backendSchemaPath)).toBe(true)
        expect(fs.existsSync(paths.backendSharedTypesDir)).toBe(true)

        expect(() => assertBackendFilesExist(paths)).not.toThrow()
      } finally {
        fs.rmSync(tempDir, { recursive: true, force: true })
      }
    })
  })

  describe('compareSets and AST extraction helpers', () => {
    it('detects missing and extra items correctly as sets', () => {
      const admin = ['A', 'B']
      const backend = ['B', 'C']
      const diff = compareSets(admin, backend)
      expect(diff.missingInApp).toEqual(['C'])
      expect(diff.extraInApp).toEqual(['A'])
    })

    it('considers sets equal regardless of element order', () => {
      const admin = ['A', 'B', 'C']
      const backend = ['C', 'A', 'B']
      const diff = compareSets(admin, backend)
      expect(diff.missingInApp).toEqual([])
      expect(diff.extraInApp).toEqual([])
      expect(new Set(admin)).toEqual(new Set(backend))
    })

    it('throws when AST extractor is given a nonexistent file', () => {
      expect(() => readCancellationDisplayMirrors('/nonexistent/path.ts')).toThrow(
        'File not found: /nonexistent/path.ts'
      )
      expect(() => readReassignCourierDialogMirrors('/nonexistent/path.tsx')).toThrow(
        'File not found: /nonexistent/path.tsx'
      )
    })
  })

  describe('Row 175: Hand mirrors compared with backend originals', () => {
    const backendPaths = getBackendPaths()

    if (backendPaths.shouldSkip) {
      warnBackendAbsentOnce(backendPaths.backendDir)
    }

    const itRow175 = backendPaths.shouldSkip ? it.skip : it

    itRow175('ensures backend directory and core files exist', () => {
      assertBackendFilesExist(backendPaths)
    })

    // Lazy parse backend files only when backend is present
    let prismaEnums: Record<string, Record<string, string>> = {}
    if (!backendPaths.shouldSkip && fs.existsSync(backendPaths.backendSchemaPath)) {
      prismaEnums = parsePrismaEnums(backendPaths.backendSchemaPath)
    }

    interface BackendStateMachineModule {
      DELIVERY_ONGOING_STATUSES: string[]
      DELIVERY_PICKED_UP_STATUSES: string[]
    }

    const loadStateMachine = (): BackendStateMachineModule => {
      const filePath = path.join(backendPaths.backendSharedTypesDir, 'stateMachine.ts')
      return loadBackendSharedFile<BackendStateMachineModule>(filePath, prismaEnums)
    }

    const cancellationDisplayPath = path.resolve(__dirname, 'cancellationDisplay.ts')
    const reassignCourierDialogPath = path.resolve(
      __dirname,
      '../components/ReassignCourierDialog.tsx'
    )

    itRow175(
      'cancellationDisplay.ts: CancelledBy matches backend EnumCancelledBy both ways (as sets, order does not matter)',
      () => {
        const backendCancelledByDict = prismaEnums.EnumCancelledBy ?? {}
        const backendValues = Object.keys(backendCancelledByDict)
        expect(backendValues.length).toBeGreaterThan(0)

        const adminMirrors = readCancellationDisplayMirrors(cancellationDisplayPath)
        const adminValues = adminMirrors.cancelledBy
        expect(adminValues.length).toBeGreaterThan(0)

        const diff = compareSets(adminValues, backendValues)
        expect(diff.missingInApp).toEqual([])
        expect(diff.extraInApp).toEqual([])
        // Compared as sets: order in source files does not matter
        expect(new Set(adminValues)).toEqual(new Set(backendValues))
      }
    )

    itRow175(
      'cancellationDisplay.ts: PICKED_UP_STATUSES matches backend DELIVERY_PICKED_UP_STATUSES both ways (as sets, order does not matter)',
      () => {
        const stateMachine = loadStateMachine()
        const backendValues = stateMachine.DELIVERY_PICKED_UP_STATUSES
        expect(backendValues.length).toBeGreaterThan(0)

        const adminMirrors = readCancellationDisplayMirrors(cancellationDisplayPath)
        const adminValues = adminMirrors.pickedUpStatuses
        expect(adminValues.length).toBeGreaterThan(0)

        const diff = compareSets(adminValues, backendValues)
        expect(diff.missingInApp).toEqual([])
        expect(diff.extraInApp).toEqual([])
        // Compared as sets: order in source files does not matter
        expect(new Set(adminValues)).toEqual(new Set(backendValues))
      }
    )

    itRow175(
      'cancellationDisplay.ts: ONGOING_STATUSES matches backend DELIVERY_ONGOING_STATUSES both ways (as sets, order does not matter)',
      () => {
        const stateMachine = loadStateMachine()
        const backendValues = stateMachine.DELIVERY_ONGOING_STATUSES
        expect(backendValues.length).toBeGreaterThan(0)

        const adminMirrors = readCancellationDisplayMirrors(cancellationDisplayPath)
        const adminValues = adminMirrors.ongoingStatuses
        expect(adminValues.length).toBeGreaterThan(0)

        const diff = compareSets(adminValues, backendValues)
        expect(diff.missingInApp).toEqual([])
        expect(diff.extraInApp).toEqual([])
        // Compared as sets: order in source files does not matter
        expect(new Set(adminValues)).toEqual(new Set(backendValues))
      }
    )

    itRow175(
      'ReassignCourierDialog.tsx: ONGOING_DELIVERY_STATUSES matches backend DELIVERY_ONGOING_STATUSES both ways (as sets, order does not matter)',
      () => {
        const stateMachine = loadStateMachine()
        const backendValues = stateMachine.DELIVERY_ONGOING_STATUSES
        expect(backendValues.length).toBeGreaterThan(0)

        const adminMirrors = readReassignCourierDialogMirrors(reassignCourierDialogPath)
        const adminValues = adminMirrors.ongoingDeliveryStatuses
        expect(adminValues.length).toBeGreaterThan(0)

        const diff = compareSets(adminValues, backendValues)
        expect(diff.missingInApp).toEqual([])
        expect(diff.extraInApp).toEqual([])
        // Compared as sets: order in source files does not matter
        expect(new Set(adminValues)).toEqual(new Set(backendValues))
      }
    )
  })
})
