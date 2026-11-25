// Scope row 170: adminweb's other copied backend types are checked against the backend.
// Precedent: src/i18n/translations.test.ts (row 163).
// Compares private copies of backend types under src/shared-types/ with the backend originals
// (under ../opencourier-backend/src/shared-types/ and ../opencourier-backend/prisma/schema.prisma).
// Tests both directions: missing in app, extra in app, and value mismatches.
// Honours OPENCOURIER_BACKEND_DIR and REQUIRE_BACKEND=1.
import fs from 'fs'
import path from 'path'
import os from 'os'
import vm from 'vm'
import ts from 'typescript'

// Adminweb shared types under test
import * as addressTypes from './address'
import * as cartTypes from './cart'
import * as catalogTypes from './catalog'
import * as configTypes from './config'
import * as courierCompensationTypes from './courier-compensation-calculation'
import * as courierMatchingTypes from './courier-matching'
import * as courierTypes from './courier'
import * as currencyTypes from './currency'
import * as deliveryDurationTypes from './delivery-duration'
import * as deliveryEventsTypes from './delivery-events'
import * as deliveryIssuesTypes from './delivery-issues'
import * as deliveryTypes from './delivery'
import * as dispatchTypes from './dispatch'
import * as distanceUnitTypes from './distance-unit'
import * as geoCalculationTypes from './geo-calculation'
import * as notificationTypes from './notification'
import * as quoteCalculationTypes from './quote-calculation'
import * as quoteToDeliveryConversionTypes from './quote-to-delivery-conversion'
import * as removalRequestsTypes from './removal-requests'
import * as stateMachineTypes from './state-machine'
import * as stripeTypes from './stripe'
import * as generalTypes from './types'

interface BackendPathsOptions {
  defaultDir?: string
  env?: Record<string, string | undefined>
}

// Resolves backend file locations with support for overrides (e.g. scratch copies in tests).
function getBackendPaths(options?: BackendPathsOptions) {
  const env = options?.env ?? process.env
  const defaultDir =
    options?.defaultDir ??
    env.DEFAULT_BACKEND_DIR ??
    path.resolve(__dirname, '../../../opencourier-backend')

  const hasOverride = Boolean(
    env.OPENCOURIER_BACKEND_DIR ||
      env.BACKEND_SCHEMA_PATH ||
      env.BACKEND_SHARED_TYPES_DIR
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
    dirExists,
    requireBackend,
    shouldSkip,
  }
}

// Parses Prisma schema enums into string-record dictionaries.
function parsePrismaEnums(schemaPath: string): Record<string, Record<string, string>> {
  if (!fs.existsSync(schemaPath)) {
    throw new Error(`Prisma schema file missing: ${schemaPath}`)
  }
  const schemaContent = fs.readFileSync(schemaPath, 'utf-8')
  const enums: Record<string, Record<string, string>> = {}
  for (const match of schemaContent.matchAll(/enum\s+(\w+)\s+\{([^}]+)\}/g)) {
    const enumName = match[1]
    const members = match[2]
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('//'))
      .map((line) => line.split(/\s+/)[0])
      .filter(Boolean)
    enums[enumName] = Object.fromEntries(members.map((m) => [m, m]))
  }
  return enums
}

// Loads a backend TypeScript file by transpiling to CommonJS and executing in a vm context.
// Passes Prisma enums when `@prisma/types` is imported, and resolves relative imports within shared-types.
function loadBackendSharedFile<T = Record<string, unknown>>(
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
      if (!fs.existsSync(target) && fs.existsSync(target + '.ts')) target = target + '.ts'
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

interface PropertyDetail {
  name: string
  optional: boolean
  typeText?: string
}

// Uses the TypeScript compiler API to extract interface member field names and optionality.
function getInterfaceDetails(filePath: string): Record<string, Record<string, PropertyDetail>> {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found for AST inspection: ${filePath}`)
  }
  const code = fs.readFileSync(filePath, 'utf-8')
  const sf = ts.createSourceFile(path.basename(filePath), code, ts.ScriptTarget.Latest, true)
  const result: Record<string, Record<string, PropertyDetail>> = {}

  sf.statements.forEach((stmt) => {
    if (ts.isInterfaceDeclaration(stmt)) {
      const name = stmt.name.text
      const fields: Record<string, PropertyDetail> = {}
      stmt.members.forEach((m) => {
        if (ts.isPropertySignature(m) && m.name) {
          const fname = m.name.getText(sf)
          const optional = Boolean(m.questionToken)
          const typeText = m.type ? m.type.getText(sf).trim() : undefined
          fields[fname] = { name: fname, optional, typeText }
        }
      })
      result[name] = fields
    }
  })
  return result
}

// Helper to compare two enums or dictionaries both ways with detailed reporting.
function compareDictionaries(
  adminDict: Record<string, unknown>,
  backendDict: Record<string, unknown>,
  options?: { allowedMissingInApp?: string[]; allowedExtraInApp?: string[] }
) {
  const allowedMissing = new Set(options?.allowedMissingInApp ?? [])
  const allowedExtra = new Set(options?.allowedExtraInApp ?? [])

  const adminKeys = Object.keys(adminDict).sort()
  const backendKeys = Object.keys(backendDict).sort()

  const missingInApp = backendKeys.filter((k) => !adminKeys.includes(k) && !allowedMissing.has(k))
  const extraInApp = adminKeys.filter((k) => !backendKeys.includes(k) && !allowedExtra.has(k))
  const valueMismatches: { key: string; admin: unknown; backend: unknown }[] = []

  for (const key of adminKeys) {
    if (key in backendDict && !allowedExtra.has(key)) {
      const adminVal = adminDict[key]
      const backendVal = backendDict[key]
      if (adminVal !== backendVal) {
        valueMismatches.push({ key, admin: adminVal, backend: backendVal })
      }
    }
  }

  return { missingInApp, extraInApp, valueMismatches }
}

describe('Shared types parity (row 170: adminweb copies checked against backend)', () => {
  describe('Backend path resolution and skip guard', () => {
    it('skips when default backend dir is absent and no override is set', () => {
      const paths = getBackendPaths({
        defaultDir: path.resolve(__dirname, '../../../nonexistent-backend-for-test'),
        env: {},
      })
      expect(paths.shouldSkip).toBe(true)
      expect(paths.dirExists).toBe(false)
    })

    it('turns skip into failure when REQUIRE_BACKEND=1 even if backend dir is absent', () => {
      const paths = getBackendPaths({
        defaultDir: path.resolve(__dirname, '../../../nonexistent-backend-for-test'),
        env: { REQUIRE_BACKEND: '1' },
      })
      expect(paths.shouldSkip).toBe(false)
      expect(paths.requireBackend).toBe(true)
      expect(paths.dirExists).toBe(false)
    })

    it('does not skip when an override path is set, even if the directory does not exist', () => {
      const paths = getBackendPaths({
        env: { OPENCOURIER_BACKEND_DIR: '/nonexistent/override/dir' },
      })
      expect(paths.shouldSkip).toBe(false)
      expect(paths.hasOverride).toBe(true)
      expect(paths.dirExists).toBe(false)
    })

    it('detects missing required file in present directory', () => {
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'oc-scratch-backend-'))
      try {
        const paths = getBackendPaths({
          env: { OPENCOURIER_BACKEND_DIR: tempDir },
        })
        expect(paths.shouldSkip).toBe(false)
        expect(paths.dirExists).toBe(true)
        expect(fs.existsSync(paths.backendSchemaPath)).toBe(false)
      } finally {
        fs.rmSync(tempDir, { recursive: true, force: true })
      }
    })

    it('fails with a clear message naming the file if an evaluated file calls require', () => {
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'oc-adminweb-require-'))
      const scratchRequireFile = path.join(tempDir, 'scratch-require.ts')
      fs.writeFileSync(
        scratchRequireFile,
        'const crypto = require("crypto"); export const data = { crypto };'
      )
      try {
        expect(() => loadBackendSharedFile(scratchRequireFile, {})).toThrow(
          `Evaluating ${scratchRequireFile} attempted to call require('crypto')`
        )
      } finally {
        fs.rmSync(tempDir, { recursive: true, force: true })
      }
    })
  })

  describe('Row 170: Copied backend type values compared with backend originals', () => {
    const backendPaths = getBackendPaths()

    if (backendPaths.shouldSkip) {
      console.warn(
        '\n=================================================================================\n' +
          `WARNING: Backend directory not found under ${backendPaths.backendDir}.\n` +
          'Skipping shared type copy consistency checks because backend repo is absent.\n' +
          '=================================================================================\n'
      )
    }

    const itRow170 = backendPaths.shouldSkip ? it.skip : it

    itRow170('ensures backend directory and core files exist', () => {
      if (backendPaths.requireBackend && !backendPaths.dirExists) {
        throw new Error(
          `REQUIRE_BACKEND=1 is set, but backend directory was not found under ${backendPaths.backendDir}`
        )
      }
      if (!backendPaths.dirExists) {
        throw new Error(`Backend directory was not found under ${backendPaths.backendDir}`)
      }
      if (!fs.existsSync(backendPaths.backendSchemaPath)) {
        throw new Error(
          `Backend Prisma schema missing: checked ${backendPaths.backendSchemaPath}`
        )
      }
      if (!fs.existsSync(backendPaths.backendSharedTypesDir)) {
        throw new Error(
          `Backend shared-types dir missing: checked ${backendPaths.backendSharedTypesDir}`
        )
      }
    })

    // Lazy load backend modules only when backend is present
    let prismaEnums: Record<string, Record<string, string>> = {}
    if (!backendPaths.shouldSkip && backendPaths.dirExists && fs.existsSync(backendPaths.backendSchemaPath)) {
      prismaEnums = parsePrismaEnums(backendPaths.backendSchemaPath)
    }

    const loadBackendType = <T = Record<string, unknown>>(filename: string): T => {
      const filePath = path.join(backendPaths.backendSharedTypesDir, filename)
      return loadBackendSharedFile<T>(filePath, prismaEnums)
    }

    // -----------------------------------------------------------------------------------------
    // cart.ts
    // -----------------------------------------------------------------------------------------
    describe('cart.ts', () => {
      itRow170('cart.ts: EnumRewardStatus matches backend EnumRewardStatus both ways', () => {
        const backendMod = loadBackendType<{ EnumRewardStatus: Record<string, string> }>('cart.ts')
        const diff = compareDictionaries(cartTypes.EnumRewardStatus, backendMod.EnumRewardStatus)
        expect(diff.missingInApp).toEqual([])
        expect(diff.extraInApp).toEqual([])
        expect(diff.valueMismatches).toEqual([])
        expect(cartTypes.EnumRewardStatus).toEqual(backendMod.EnumRewardStatus)
      })

      itRow170('cart.ts: CartValidationErrorCode matches backend CartValidationErrorCode both ways', () => {
        const backendMod = loadBackendType<{ CartValidationErrorCode: Record<string, string> }>('cart.ts')
        const diff = compareDictionaries(cartTypes.CartValidationErrorCode, backendMod.CartValidationErrorCode)
        expect(diff.missingInApp).toEqual([])
        expect(diff.extraInApp).toEqual([])
        expect(diff.valueMismatches).toEqual([])
        expect(cartTypes.CartValidationErrorCode).toEqual(backendMod.CartValidationErrorCode)
      })

      itRow170('cart.ts: Cart interfaces match backend field names and optionality', () => {
        const adminIfaces = getInterfaceDetails(path.resolve(__dirname, 'cart.ts'))
        const backendIfaces = getInterfaceDetails(path.join(backendPaths.backendSharedTypesDir, 'cart.ts'))
        const checkedInterfaces = [
          'CartItemModifierValue',
          'CartModifierGroupValue',
          'SerializeableCartValidationError',
          'CartItemModifierNested',
        ]
        for (const name of checkedInterfaces) {
          expect(backendIfaces).toHaveProperty(name)
          const adminFields = adminIfaces[name] ?? {}
          const backendFields = backendIfaces[name] ?? {}
          expect(Object.keys(adminFields).sort()).toEqual(Object.keys(backendFields).sort())
          for (const fname of Object.keys(adminFields)) {
            expect(adminFields[fname].optional).toBe(backendFields[fname].optional)
          }
        }
      })
    })

    // -----------------------------------------------------------------------------------------
    // courier-compensation-calculation.ts
    // -----------------------------------------------------------------------------------------
    describe('courier-compensation-calculation.ts', () => {
      itRow170(
        'courier-compensation-calculation.ts: EnumCourierCompensationCalculationType matches backend both ways',
        () => {
          const backendMod = loadBackendType<{
            EnumCourierCompensationCalculationType: Record<string, string>
            COURIER_DELIVERY_COMPENSATION_TYPE_TO_HUMAN: Record<string, string>
          }>('courier-compensation-calculation.ts')

          const diffEnum = compareDictionaries(
            courierCompensationTypes.EnumCourierCompensationCalculationType,
            backendMod.EnumCourierCompensationCalculationType
          )
          expect(diffEnum.missingInApp).toEqual([])
          expect(diffEnum.extraInApp).toEqual([])
          expect(diffEnum.valueMismatches).toEqual([])

          const diffHuman = compareDictionaries(
            courierCompensationTypes.COURIER_DELIVERY_COMPENSATION_TYPE_TO_HUMAN,
            backendMod.COURIER_DELIVERY_COMPENSATION_TYPE_TO_HUMAN
          )
          expect(diffHuman.missingInApp).toEqual([])
          expect(diffHuman.extraInApp).toEqual([])
          expect(diffHuman.valueMismatches).toEqual([])
        }
      )
    })

    // -----------------------------------------------------------------------------------------
    // courier-matching.ts
    // -----------------------------------------------------------------------------------------
    describe('courier-matching.ts', () => {
      itRow170('courier-matching.ts: EnumCourierMatcherType and human map match backend both ways', () => {
        const backendMod = loadBackendType<{
          EnumCourierMatcherType: Record<string, string>
          COURIER_MATCHER_TYPE_TO_HUMAN: Record<string, string>
        }>('courier-matching.ts')

        const diffEnum = compareDictionaries(
          courierMatchingTypes.EnumCourierMatcherType,
          backendMod.EnumCourierMatcherType
        )
        expect(diffEnum.missingInApp).toEqual([])
        expect(diffEnum.extraInApp).toEqual([])
        expect(diffEnum.valueMismatches).toEqual([])

        const diffHuman = compareDictionaries(
          courierMatchingTypes.COURIER_MATCHER_TYPE_TO_HUMAN,
          backendMod.COURIER_MATCHER_TYPE_TO_HUMAN
        )
        expect(diffHuman.missingInApp).toEqual([])
        expect(diffHuman.extraInApp).toEqual([])
        expect(diffHuman.valueMismatches).toEqual([])
      })
    })

    // -----------------------------------------------------------------------------------------
    // courier.ts
    // -----------------------------------------------------------------------------------------
    describe('courier.ts', () => {
      itRow170('courier.ts: EnumCourierDietaryRestrictions and human map match backend both ways', () => {
        const backendMod = loadBackendType<{
          EnumCourierDietaryRestrictions: Record<string, string>
          COURIER_DIETARY_RESTRICTIONS_TO_HUMAN: Record<string, string>
        }>('courier.ts')

        const diffEnum = compareDictionaries(
          courierTypes.EnumCourierDietaryRestrictions,
          backendMod.EnumCourierDietaryRestrictions
        )
        expect(diffEnum.missingInApp).toEqual([])
        expect(diffEnum.extraInApp).toEqual([])
        expect(diffEnum.valueMismatches).toEqual([])

        const diffHuman = compareDictionaries(
          courierTypes.COURIER_DIETARY_RESTRICTIONS_TO_HUMAN,
          backendMod.COURIER_DIETARY_RESTRICTIONS_TO_HUMAN
        )
        expect(diffHuman.missingInApp).toEqual([])
        expect(diffHuman.extraInApp).toEqual([])
        expect(diffHuman.valueMismatches).toEqual([])
      })
    })

    // -----------------------------------------------------------------------------------------
    // currency.ts
    // -----------------------------------------------------------------------------------------
    describe('currency.ts', () => {
      itRow170('currency.ts: EnumCurrency and CURRENCY_TO_HUMAN match backend both ways', () => {
        const backendMod = loadBackendType<{
          EnumCurrency: Record<string, string>
          CURRENCY_TO_HUMAN: Record<string, string>
        }>('currency.ts')

        const diffEnum = compareDictionaries(currencyTypes.EnumCurrency, backendMod.EnumCurrency)
        expect(diffEnum.missingInApp).toEqual([])
        expect(diffEnum.extraInApp).toEqual([])
        expect(diffEnum.valueMismatches).toEqual([])

        const diffHuman = compareDictionaries(currencyTypes.CURRENCY_TO_HUMAN, backendMod.CURRENCY_TO_HUMAN)
        expect(diffHuman.missingInApp).toEqual([])
        expect(diffHuman.extraInApp).toEqual([])
        expect(diffHuman.valueMismatches).toEqual([])
      })
    })

    // -----------------------------------------------------------------------------------------
    // delivery-duration.ts
    // -----------------------------------------------------------------------------------------
    describe('delivery-duration.ts', () => {
      itRow170(
        'delivery-duration.ts: EnumDeliveryDurationCalculationType and human map match backend both ways',
        () => {
          const backendMod = loadBackendType<{
            EnumDeliveryDurationCalculationType: Record<string, string>
            DELIVERY_DURATION_CALCULATION_TYPE_TO_HUMAN: Record<string, string>
          }>('delivery-duration.ts')

          const diffEnum = compareDictionaries(
            deliveryDurationTypes.EnumDeliveryDurationCalculationType,
            backendMod.EnumDeliveryDurationCalculationType
          )
          expect(diffEnum.missingInApp).toEqual([])
          expect(diffEnum.extraInApp).toEqual([])
          expect(diffEnum.valueMismatches).toEqual([])

          const diffHuman = compareDictionaries(
            deliveryDurationTypes.DELIVERY_DURATION_CALCULATION_TYPE_TO_HUMAN,
            backendMod.DELIVERY_DURATION_CALCULATION_TYPE_TO_HUMAN
          )
          expect(diffHuman.missingInApp).toEqual([])
          expect(diffHuman.extraInApp).toEqual([])
          expect(diffHuman.valueMismatches).toEqual([])
        }
      )
    })

    // -----------------------------------------------------------------------------------------
    // delivery-events.ts
    // -----------------------------------------------------------------------------------------
    describe('delivery-events.ts', () => {
      // Deliberate difference:
      // Section 3b safety guard (src/shared-types/regression.test.ts:11):
      // "Section 3b safety guard: REASSIGNED must NOT be added to EnumDeliveryEventType or submit-event.
      // Reassignment must go through its dedicated POST /reassign endpoint to ensure courier compensation is created."
      itRow170('delivery-events.ts: EnumDeliveryEventType matches backend EnumDeliveryEventType both ways', () => {
        const backendEventType = prismaEnums.EnumDeliveryEventType ?? {}
        const diff = compareDictionaries(
          deliveryEventsTypes.EnumDeliveryEventType,
          backendEventType,
          {
            // Allowed deliberate difference: REASSIGNED is forbidden in adminweb's enum copy by Section 3b safety guard
            allowedMissingInApp: ['REASSIGNED'],
          }
        )
        expect(diff.missingInApp).toEqual([])
        expect(diff.extraInApp).toEqual([])
        expect(diff.valueMismatches).toEqual([])
      })

      itRow170('delivery-events.ts: EnumEventActor matches backend EnumEventActor both ways', () => {
        const backendActor = prismaEnums.EnumEventActor ?? {}
        const diff = compareDictionaries(deliveryEventsTypes.EnumEventActor, backendActor)
        expect(diff.missingInApp).toEqual([])
        expect(diff.extraInApp).toEqual([])
        expect(diff.valueMismatches).toEqual([])
        expect(deliveryEventsTypes.EnumEventActor).toEqual(backendActor)
      })

      itRow170('delivery-events.ts: EnumDeliveryEventSource matches backend EnumDeliveryEventSource both ways', () => {
        const backendSource = prismaEnums.EnumDeliveryEventSource ?? {}
        const diff = compareDictionaries(deliveryEventsTypes.EnumDeliveryEventSource, backendSource)
        expect(diff.missingInApp).toEqual([])
        expect(diff.extraInApp).toEqual([])
        expect(diff.valueMismatches).toEqual([])
        expect(deliveryEventsTypes.EnumDeliveryEventSource).toEqual(backendSource)
      })

      itRow170('delivery-events.ts: EnumDeliveryStatus matches backend EnumDeliveryStatus both ways', () => {
        const backendStatus = prismaEnums.EnumDeliveryStatus ?? {}
        const diff = compareDictionaries(deliveryEventsTypes.EnumDeliveryStatus, backendStatus)
        expect(diff.missingInApp).toEqual([])
        expect(diff.extraInApp).toEqual([])
        expect(diff.valueMismatches).toEqual([])
        expect(deliveryEventsTypes.EnumDeliveryStatus).toEqual(backendStatus)
      })

      itRow170('delivery-events.ts: ACTIVE_STATUSES and NOT_ACTIVE_STATUSES match backend both ways', () => {
        const backendMod = loadBackendType<{
          ACTIVE_STATUSES: string[]
          NOT_ACTIVE_STATUSES: string[]
        }>('delivery-events.ts')
        expect([...deliveryEventsTypes.ACTIVE_STATUSES].sort()).toEqual([...backendMod.ACTIVE_STATUSES].sort())
        expect([...deliveryEventsTypes.NOT_ACTIVE_STATUSES].sort()).toEqual(
          [...backendMod.NOT_ACTIVE_STATUSES].sort()
        )
      })

      itRow170('delivery-events.ts: EVENT_ACTOR_TO_HUMAN covers all EnumEventActor members', () => {
        for (const actor of Object.values(deliveryEventsTypes.EnumEventActor)) {
          expect(deliveryEventsTypes.EVENT_ACTOR_TO_HUMAN).toHaveProperty(actor)
          expect(typeof deliveryEventsTypes.EVENT_ACTOR_TO_HUMAN[actor]).toBe('string')
        }
      })

      itRow170('delivery-events.ts: EVENT_SOURCE_TO_HUMAN covers all EnumDeliveryEventSource members', () => {
        for (const source of Object.values(deliveryEventsTypes.EnumDeliveryEventSource)) {
          expect(deliveryEventsTypes.EVENT_SOURCE_TO_HUMAN).toHaveProperty(source)
          expect(typeof deliveryEventsTypes.EVENT_SOURCE_TO_HUMAN[source]).toBe('string')
        }
      })
    })

    // -----------------------------------------------------------------------------------------
    // delivery-issues.ts
    // -----------------------------------------------------------------------------------------
    describe('delivery-issues.ts', () => {
      itRow170('delivery-issues.ts: EnumDeliveryIssueReason matches backend EnumDeliveryIssueReason both ways', () => {
        const backendReason = prismaEnums.EnumDeliveryIssueReason ?? {}
        const diff = compareDictionaries(deliveryIssuesTypes.EnumDeliveryIssueReason, backendReason)
        expect(diff.missingInApp).toEqual([])
        expect(diff.extraInApp).toEqual([])
        expect(diff.valueMismatches).toEqual([])
        expect(deliveryIssuesTypes.EnumDeliveryIssueReason).toEqual(backendReason)
      })

      itRow170(
        'delivery-issues.ts: DELIVERY_ISSUE_REASON_TO_HUMAN matches backend delivery-issue.ts both ways',
        () => {
          const backendMod = loadBackendType<{
            DELIVERY_ISSUE_REASON_TO_HUMAN: Record<string, string>
          }>('delivery-issue.ts')
          const diff = compareDictionaries(
            deliveryIssuesTypes.DELIVERY_ISSUE_REASON_TO_HUMAN,
            backendMod.DELIVERY_ISSUE_REASON_TO_HUMAN
          )
          expect(diff.missingInApp).toEqual([])
          expect(diff.extraInApp).toEqual([])
          expect(diff.valueMismatches).toEqual([])
          expect(deliveryIssuesTypes.DELIVERY_ISSUE_REASON_TO_HUMAN).toEqual(
            backendMod.DELIVERY_ISSUE_REASON_TO_HUMAN
          )
        }
      )
    })

    // -----------------------------------------------------------------------------------------
    // delivery.ts
    // -----------------------------------------------------------------------------------------
    describe('delivery.ts', () => {
      itRow170('delivery.ts: EnumUndeliverableAction matches backend EnumUndeliverableAction both ways', () => {
        const backendUndeliverable = prismaEnums.EnumUndeliverableAction ?? {}
        const diff = compareDictionaries(deliveryTypes.EnumUndeliverableAction, backendUndeliverable)
        expect(diff.missingInApp).toEqual([])
        expect(diff.extraInApp).toEqual([])
        expect(diff.valueMismatches).toEqual([])
        expect(deliveryTypes.EnumUndeliverableAction).toEqual(backendUndeliverable)
      })

      itRow170('delivery.ts: EnumDeliverableAction matches backend EnumDeliverableAction both ways', () => {
        const backendDeliverable = prismaEnums.EnumDeliverableAction ?? {}
        const diff = compareDictionaries(deliveryTypes.EnumDeliverableAction, backendDeliverable)
        expect(diff.missingInApp).toEqual([])
        expect(diff.extraInApp).toEqual([])
        expect(diff.valueMismatches).toEqual([])
        expect(deliveryTypes.EnumDeliverableAction).toEqual(backendDeliverable)
      })

      itRow170('delivery.ts: EnumCourierStatus matches backend EnumCourierStatus both ways', () => {
        const backendCourierStatus = prismaEnums.EnumCourierStatus ?? {}
        const diff = compareDictionaries(deliveryTypes.EnumCourierStatus, backendCourierStatus)
        expect(diff.missingInApp).toEqual([])
        expect(diff.extraInApp).toEqual([])
        expect(diff.valueMismatches).toEqual([])
        expect(deliveryTypes.EnumCourierStatus).toEqual(backendCourierStatus)
      })

      itRow170('delivery.ts: EnumCountryCode matches backend EnumCountryCode both ways', () => {
        const backendCountryCode = prismaEnums.EnumCountryCode ?? {}
        const diff = compareDictionaries(deliveryTypes.EnumCountryCode, backendCountryCode)
        expect(diff.missingInApp).toEqual([])
        expect(diff.extraInApp).toEqual([])
        expect(diff.valueMismatches).toEqual([])
        expect(deliveryTypes.EnumCountryCode).toEqual(backendCountryCode)
      })

      itRow170('delivery.ts: COURIER_STATUS_TO_HUMAN matches backend COURIER_STATUS_TO_HUMAN', () => {
        const backendMod = loadBackendType<{
          COURIER_STATUS_TO_HUMAN: Record<string, string>
        }>('delivery.ts')
        const diff = compareDictionaries(
          deliveryTypes.COURIER_STATUS_TO_HUMAN,
          backendMod.COURIER_STATUS_TO_HUMAN
        )
        expect(diff.missingInApp).toEqual([])
        expect(diff.extraInApp).toEqual([])
        expect(diff.valueMismatches).toEqual([])
        expect(deliveryTypes.COURIER_STATUS_TO_HUMAN).toEqual(backendMod.COURIER_STATUS_TO_HUMAN)
      })

      itRow170('delivery.ts: delivery interfaces match backend field names and optionality', () => {
        const adminIfaces = getInterfaceDetails(path.resolve(__dirname, 'delivery.ts'))
        const backendIfaces = getInterfaceDetails(path.join(backendPaths.backendSharedTypesDir, 'delivery.ts'))
        const checkedInterfaces = [
          'GenericDeliveryInformation',
          'CourierStatusUpdateEvent',
          'DeliveryAddress',
          'OrderItemDimensions',
          'Barcode',
          'SignatureRequirement',
          'Identification',
          'DeliveryVerification',
          'Pincode',
          'MerchantAccount',
          'Device',
          'ExternalUserInfo',
        ]
        for (const name of checkedInterfaces) {
          expect(backendIfaces).toHaveProperty(name)
          const adminFields = adminIfaces[name] ?? {}
          const backendFields = backendIfaces[name] ?? {}
          expect(Object.keys(adminFields).sort()).toEqual(Object.keys(backendFields).sort())
          for (const fname of Object.keys(adminFields)) {
            expect(adminFields[fname].optional).toBe(backendFields[fname].optional)
          }
        }
      })
    })

    // -----------------------------------------------------------------------------------------
    // dispatch.ts
    // -----------------------------------------------------------------------------------------
    describe('dispatch.ts', () => {
      itRow170('dispatch.ts: alerts, constants and ALERT_TO_HUMAN match backend both ways', () => {
        const backendMod = loadBackendType<{
          UNCONFIRMED_TOO_LONG_TIME: number
          UNASSIGNED_TOO_LONG_TIME: number
          UNACCEPTED_TOO_LONG_TIME: number
          EnumOrderAlertType: Record<string, string>
          RED_ALERTS: string[]
          ALERT_TO_HUMAN: Record<string, string>
        }>('dispatch.ts')

        expect(dispatchTypes.UNCONFIRMED_TOO_LONG_TIME).toBe(backendMod.UNCONFIRMED_TOO_LONG_TIME)
        expect(dispatchTypes.UNASSIGNED_TOO_LONG_TIME).toBe(backendMod.UNASSIGNED_TOO_LONG_TIME)
        expect(dispatchTypes.UNACCEPTED_TOO_LONG_TIME).toBe(backendMod.UNACCEPTED_TOO_LONG_TIME)

        const diffAlert = compareDictionaries(
          dispatchTypes.EnumOrderAlertType,
          backendMod.EnumOrderAlertType
        )
        expect(diffAlert.missingInApp).toEqual([])
        expect(diffAlert.extraInApp).toEqual([])
        expect(diffAlert.valueMismatches).toEqual([])

        expect([...dispatchTypes.RED_ALERTS].sort()).toEqual([...backendMod.RED_ALERTS].sort())

        const diffHuman = compareDictionaries(
          dispatchTypes.ALERT_TO_HUMAN,
          backendMod.ALERT_TO_HUMAN
        )
        expect(diffHuman.missingInApp).toEqual([])
        expect(diffHuman.extraInApp).toEqual([])
        expect(diffHuman.valueMismatches).toEqual([])
      })
    })

    // -----------------------------------------------------------------------------------------
    // distance-unit.ts
    // -----------------------------------------------------------------------------------------
    describe('distance-unit.ts', () => {
      itRow170('distance-unit.ts: DISTANCE_UNIT_TO_HUMAN matches backend both ways', () => {
        const backendMod = loadBackendType<{
          DISTANCE_UNIT_TO_HUMAN: Record<string, string>
        }>('distance-unit.ts')
        const diff = compareDictionaries(
          distanceUnitTypes.DISTANCE_UNIT_TO_HUMAN,
          backendMod.DISTANCE_UNIT_TO_HUMAN
        )
        expect(diff.missingInApp).toEqual([])
        expect(diff.extraInApp).toEqual([])
        expect(diff.valueMismatches).toEqual([])
        expect(distanceUnitTypes.DISTANCE_UNIT_TO_HUMAN).toEqual(backendMod.DISTANCE_UNIT_TO_HUMAN)
      })
    })

    // -----------------------------------------------------------------------------------------
    // geo-calculation.ts
    // -----------------------------------------------------------------------------------------
    describe('geo-calculation.ts', () => {
      itRow170('geo-calculation.ts: EnumGeoCalculationType and human map match backend both ways', () => {
        const backendMod = loadBackendType<{
          EnumGeoCalculationType: Record<string, string>
          GEO_CALCULATION_TYPE_TO_HUMAN: Record<string, string>
        }>('geo-calculation.ts')

        const diffEnum = compareDictionaries(
          geoCalculationTypes.EnumGeoCalculationType,
          backendMod.EnumGeoCalculationType
        )
        expect(diffEnum.missingInApp).toEqual([])
        expect(diffEnum.extraInApp).toEqual([])
        expect(diffEnum.valueMismatches).toEqual([])

        const diffHuman = compareDictionaries(
          geoCalculationTypes.GEO_CALCULATION_TYPE_TO_HUMAN,
          backendMod.GEO_CALCULATION_TYPE_TO_HUMAN
        )
        expect(diffHuman.missingInApp).toEqual([])
        expect(diffHuman.extraInApp).toEqual([])
        expect(diffHuman.valueMismatches).toEqual([])
      })
    })

    // -----------------------------------------------------------------------------------------
    // notification.ts
    // -----------------------------------------------------------------------------------------
    describe('notification.ts', () => {
      itRow170('notification.ts: NotificationEventType matches backend NotificationEventType both ways', () => {
        const backendMod = loadBackendType<{
          NotificationEventType: Record<string, string>
        }>('notification.ts')
        const diff = compareDictionaries(
          notificationTypes.NotificationEventType,
          backendMod.NotificationEventType
        )
        expect(diff.missingInApp).toEqual([])
        expect(diff.extraInApp).toEqual([])
        expect(diff.valueMismatches).toEqual([])
        expect(notificationTypes.NotificationEventType).toEqual(backendMod.NotificationEventType)
      })
    })

    // -----------------------------------------------------------------------------------------
    // quote-calculation.ts
    // -----------------------------------------------------------------------------------------
    describe('quote-calculation.ts', () => {
      itRow170('quote-calculation.ts: EnumQuoteCalculationType matches backend both ways', () => {
        const backendMod = loadBackendType<{
          EnumQuoteCalculationType: Record<string, string>
        }>('quote-calculation.ts')
        const diffEnum = compareDictionaries(
          quoteCalculationTypes.EnumQuoteCalculationType,
          backendMod.EnumQuoteCalculationType
        )
        expect(diffEnum.missingInApp).toEqual([])
        expect(diffEnum.extraInApp).toEqual([])
        expect(diffEnum.valueMismatches).toEqual([])
        expect(quoteCalculationTypes.EnumQuoteCalculationType).toEqual(backendMod.EnumQuoteCalculationType)
      })

      itRow170(
        'quote-calculation.ts: QUOTE_CALCULATION_TYPE_TO_HUMAN matches backend QUOTE_CALCULATION_TYPE_TO_HUMAN',
        () => {
          const backendMod = loadBackendType<{
            QUOTE_CALCULATION_TYPE_TO_HUMAN: Record<string, string>
          }>('quote-calculation.ts')
          const diffHuman = compareDictionaries(
            quoteCalculationTypes.QUOTE_CALCULATION_TYPE_TO_HUMAN,
            backendMod.QUOTE_CALCULATION_TYPE_TO_HUMAN
          )
          expect(diffHuman.missingInApp).toEqual([])
          expect(diffHuman.extraInApp).toEqual([])
          expect(diffHuman.valueMismatches).toEqual([])
          expect(quoteCalculationTypes.QUOTE_CALCULATION_TYPE_TO_HUMAN).toEqual(
            backendMod.QUOTE_CALCULATION_TYPE_TO_HUMAN
          )
        }
      )
    })

    // -----------------------------------------------------------------------------------------
    // quote-to-delivery-conversion.ts
    // -----------------------------------------------------------------------------------------
    describe('quote-to-delivery-conversion.ts', () => {
      itRow170(
        'quote-to-delivery-conversion.ts: EnumQuoteToDeliveryConversionServiceType and human map match backend both ways',
        () => {
          const backendMod = loadBackendType<{
            EnumQuoteToDeliveryConversionServiceType: Record<string, string>
            QUOTE_TO_DELIVERY_CONVERSION_TYPE_TO_HUMAN: Record<string, string>
          }>('quote-to-delivery-conversion.ts')

          const diffEnum = compareDictionaries(
            quoteToDeliveryConversionTypes.EnumQuoteToDeliveryConversionServiceType,
            backendMod.EnumQuoteToDeliveryConversionServiceType
          )
          expect(diffEnum.missingInApp).toEqual([])
          expect(diffEnum.extraInApp).toEqual([])
          expect(diffEnum.valueMismatches).toEqual([])

          const diffHuman = compareDictionaries(
            quoteToDeliveryConversionTypes.QUOTE_TO_DELIVERY_CONVERSION_TYPE_TO_HUMAN,
            backendMod.QUOTE_TO_DELIVERY_CONVERSION_TYPE_TO_HUMAN
          )
          expect(diffHuman.missingInApp).toEqual([])
          expect(diffHuman.extraInApp).toEqual([])
          expect(diffHuman.valueMismatches).toEqual([])
        }
      )
    })

    // -----------------------------------------------------------------------------------------
    // removal-requests.ts
    // -----------------------------------------------------------------------------------------
    describe('removal-requests.ts', () => {
      itRow170('removal-requests.ts: EnumRemovalRequestStatus matches backend schema both ways', () => {
        const backendStatus = prismaEnums.EnumRemovalRequestStatus ?? {}
        const diff = compareDictionaries(
          removalRequestsTypes.EnumRemovalRequestStatus,
          backendStatus
        )
        expect(diff.missingInApp).toEqual([])
        expect(diff.extraInApp).toEqual([])
        expect(diff.valueMismatches).toEqual([])
        expect(removalRequestsTypes.EnumRemovalRequestStatus).toEqual(backendStatus)
      })

      itRow170(
        'removal-requests.ts: REMOVAL_REQUEST_STATUS_TO_HUMAN covers all EnumRemovalRequestStatus members',
        () => {
          for (const status of Object.values(removalRequestsTypes.EnumRemovalRequestStatus)) {
            expect(removalRequestsTypes.REMOVAL_REQUEST_STATUS_TO_HUMAN).toHaveProperty(status)
            expect(
              typeof removalRequestsTypes.REMOVAL_REQUEST_STATUS_TO_HUMAN[status]
            ).toBe('string')
          }
        }
      )
    })

    // -----------------------------------------------------------------------------------------
    // stripe.ts
    // -----------------------------------------------------------------------------------------
    describe('stripe.ts', () => {
      itRow170('stripe.ts: EnumPaymentStatus and PAYMENT_STATUS_TO_HUMAN match backend both ways', () => {
        const backendStatus = prismaEnums.EnumPaymentStatus ?? {}
        const diffEnum = compareDictionaries(stripeTypes.EnumPaymentStatus, backendStatus)
        expect(diffEnum.missingInApp).toEqual([])
        expect(diffEnum.extraInApp).toEqual([])
        expect(diffEnum.valueMismatches).toEqual([])
        expect(stripeTypes.EnumPaymentStatus).toEqual(backendStatus)

        const backendMod = loadBackendType<{
          PAYMENT_STATUS_TO_HUMAN: Record<string, string>
        }>('stripe.ts')
        const diffHuman = compareDictionaries(
          stripeTypes.PAYMENT_STATUS_TO_HUMAN,
          backendMod.PAYMENT_STATUS_TO_HUMAN
        )
        expect(diffHuman.missingInApp).toEqual([])
        expect(diffHuman.extraInApp).toEqual([])
        expect(diffHuman.valueMismatches).toEqual([])
        expect(stripeTypes.PAYMENT_STATUS_TO_HUMAN).toEqual(backendMod.PAYMENT_STATUS_TO_HUMAN)
      })
    })

    // -----------------------------------------------------------------------------------------
    // config.ts
    // -----------------------------------------------------------------------------------------
    describe('config.ts', () => {
      itRow170('config.ts: EnumDistanceUnit matches backend EnumDistanceUnit both ways', () => {
        const backendDistanceUnit = prismaEnums.EnumDistanceUnit ?? {}
        const diff = compareDictionaries(configTypes.EnumDistanceUnit, backendDistanceUnit)
        expect(diff.missingInApp).toEqual([])
        expect(diff.extraInApp).toEqual([])
        expect(diff.valueMismatches).toEqual([])
        expect(configTypes.EnumDistanceUnit).toEqual(backendDistanceUnit)
      })

      itRow170('config.ts: ConfigKey matches backend ConfigKey both ways', () => {
        const backendMod = loadBackendType<{
          ConfigKey: Record<string, string>
        }>('config.ts')
        const diff = compareDictionaries(configTypes.ConfigKey, backendMod.ConfigKey)
        expect(diff.missingInApp).toEqual([])
        expect(diff.extraInApp).toEqual([])
        expect(diff.valueMismatches).toEqual([])
        expect(configTypes.ConfigKey).toEqual(backendMod.ConfigKey)
      })
    })

    // -----------------------------------------------------------------------------------------
    // state-machine.ts
    // -----------------------------------------------------------------------------------------
    describe('state-machine.ts', () => {
      itRow170('state-machine.ts: STATUS_TO_HUMAN matches backend STATUS_TO_HUMAN', () => {
        const backendMod = loadBackendType<{
          STATUS_TO_HUMAN: Record<string, string>
        }>('stateMachine.ts')
        const diff = compareDictionaries(
          stateMachineTypes.STATUS_TO_HUMAN,
          backendMod.STATUS_TO_HUMAN
        )
        expect(diff.missingInApp).toEqual([])
        expect(diff.extraInApp).toEqual([])
        expect(diff.valueMismatches).toEqual([])
        expect(stateMachineTypes.STATUS_TO_HUMAN).toEqual(backendMod.STATUS_TO_HUMAN)
      })

      // AGENTS.md line 33-34:
      // "OFFERED, OFFER_EXPIRED and NO_COURIER_AVAILABLE are platform events: in the enum copy, never
      // in STATE_MACHINE, so the admin trigger menu cannot send them."
      itRow170(
        'state-machine.ts: STATE_MACHINE honours platform event exclusions documented in AGENTS.md',
        () => {
          // Omitted from STATE_MACHINE on purpose per AGENTS.md
          const assigningCourierTransitions = stateMachineTypes.STATE_MACHINE.ASSIGNING_COURIER.on
          expect(assigningCourierTransitions).not.toHaveProperty('OFFERED')
          expect(assigningCourierTransitions).not.toHaveProperty('OFFER_EXPIRED')
          expect(assigningCourierTransitions).not.toHaveProperty('NO_COURIER_AVAILABLE')
        }
      )
    })

    // -----------------------------------------------------------------------------------------
    // address.ts, catalog.ts, types.ts interfaces
    // -----------------------------------------------------------------------------------------
    describe('pure interface files (address.ts, catalog.ts, types.ts)', () => {
      itRow170('address.ts: Address interface matches backend Address interface', () => {
        const adminIfaces = getInterfaceDetails(path.resolve(__dirname, 'address.ts'))
        const backendIfaces = getInterfaceDetails(path.join(backendPaths.backendSharedTypesDir, 'address.ts'))
        expect(backendIfaces).toHaveProperty('Address')
        const adminFields = adminIfaces.Address ?? {}
        const backendFields = backendIfaces.Address ?? {}
        expect(Object.keys(adminFields).sort()).toEqual(Object.keys(backendFields).sort())
        for (const fname of Object.keys(adminFields)) {
          expect(adminFields[fname].optional).toBe(backendFields[fname].optional)
        }
      })

      itRow170('catalog.ts: Unnested catalog interfaces match backend interfaces', () => {
        const adminIfaces = getInterfaceDetails(path.resolve(__dirname, 'catalog.ts'))
        const backendIfaces = getInterfaceDetails(path.join(backendPaths.backendSharedTypesDir, 'catalog.ts'))
        const checked = [
          'UnnestedCatalog',
          'UnnestedCategory',
          'UnnestedItem',
          'UnnestedModifierGroup',
          'UnnestedModifier',
          'CompleteUnnestedCatalog',
        ]
        for (const name of checked) {
          expect(backendIfaces).toHaveProperty(name)
          const adminFields = adminIfaces[name] ?? {}
          const backendFields = backendIfaces[name] ?? {}
          expect(Object.keys(adminFields).sort()).toEqual(Object.keys(backendFields).sort())
          for (const fname of Object.keys(adminFields)) {
            expect(adminFields[fname].optional).toBe(backendFields[fname].optional)
          }
        }
      })

      itRow170('types.ts: JsonArray interface matches backend JsonArray interface', () => {
        const adminIfaces = getInterfaceDetails(path.resolve(__dirname, 'types.ts'))
        const backendIfaces = getInterfaceDetails(path.join(backendPaths.backendSharedTypesDir, 'types.ts'))
        expect(backendIfaces).toHaveProperty('JsonArray')
      })
    })
  })
})
