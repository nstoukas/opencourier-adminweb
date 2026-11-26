// Shared helpers for the copy check tests: the tests that compare adminweb's copies of backend values
// with the backend's own files (rows 163, 170, 175, 176 and 181). Each of those tests used to carry its
// own copy of these helpers; one ruling on the skip rules now applies to all of them (row 181).
//
// The files that import this module:
//   src/i18n/translations.test.ts                               (row 163, the server sentences)
//   src/shared-types/backend-types.test.ts                      (row 170, the copied type files)
//   src/modules/deliveries/utils/cancellationDisplay.mirrors.test.ts (row 175, the first hand mirrors)
//   src/modules/deliveries/utils/adminEvents.test.ts            (row 176, the admin path's events)
//   src/test-utils/handMirrors.test.ts                          (row 181, the other hand mirrors)
// The skip rules themselves are tested once, in src/test-utils/backendCopies.test.ts.
//
// This is test code only: nothing in the app imports it, so it never reaches the browser.
import fs from 'fs'
import path from 'path'
import vm from 'vm'
import ts from 'typescript'

// The backend repo beside this one, as the workspace lays them out (open-courier/opencourier-backend).
export const DEFAULT_BACKEND_DIR = path.resolve(__dirname, '../../../opencourier-backend')

export interface BackendPathsOptions {
  // Where to look when OPENCOURIER_BACKEND_DIR is not set (tests of the skip rules pass a missing folder).
  defaultDir?: string
  // The environment to read; process.env when left out.
  env?: Record<string, string | undefined>
}

// Where every backend file the copy checks read lives, and whether the checks should run at all.
// OPENCOURIER_BACKEND_DIR moves the whole backend; each BACKEND_*_PATH variable moves one file (used to
// point a check at a scratch copy). Skip rules (rows 163 and 170): skip only when the backend folder is
// absent and nothing is overridden; REQUIRE_BACKEND=1 never skips, so an absent backend fails instead.
export function getBackendPaths(options: BackendPathsOptions = {}) {
  const env = options.env ?? process.env
  const defaultDir = options.defaultDir ?? DEFAULT_BACKEND_DIR
  const backendDir = env.OPENCOURIER_BACKEND_DIR || defaultDir

  // A file's own override variable if it is set, else its usual place in the backend folder.
  const fileIn = (override: string | undefined, relativePath: string) =>
    override || path.join(backendDir, relativePath)

  const backendSchemaPath = fileIn(env.BACKEND_SCHEMA_PATH, 'prisma/schema.prisma')
  const backendSharedTypesDir = fileIn(env.BACKEND_SHARED_TYPES_DIR, 'src/shared-types')
  const backendEnPath = fileIn(env.BACKEND_EN_PATH, 'src/localization/en.ts')
  const backendElPath = fileIn(env.BACKEND_EL_PATH, 'src/localization/el.ts')
  const backendMessagesPath = fileIn(env.BACKEND_MESSAGES_PATH, 'src/shared-types/event-messages.ts')
  const backendDeliveryServicePath = path.join(
    backendDir,
    'src/domains/delivery/delivery.domain.service.ts'
  )

  // The paths that came from their own variable. A check whose every file is overridden does not need
  // the backend folder to exist (row 170's ruling).
  const overriddenPaths = [
    env.BACKEND_SCHEMA_PATH,
    env.BACKEND_SHARED_TYPES_DIR,
    env.BACKEND_EN_PATH,
    env.BACKEND_EL_PATH,
    env.BACKEND_MESSAGES_PATH,
  ].filter((value): value is string => Boolean(value))

  const hasOverride = Boolean(env.OPENCOURIER_BACKEND_DIR) || overriddenPaths.length > 0
  const dirExists = fs.existsSync(backendDir)
  const requireBackend = env.REQUIRE_BACKEND === '1'

  // Skip only when the backend folder itself is absent and no override is set.
  // When REQUIRE_BACKEND=1, never skip (it turns the absence into a failure).
  const shouldSkip = !hasOverride && !dirExists && !requireBackend

  return {
    backendDir,
    backendSchemaPath,
    backendSharedTypesDir,
    backendEnPath,
    backendElPath,
    backendMessagesPath,
    backendDeliveryServicePath,
    overriddenPaths,
    hasOverride,
    dirExists,
    requireBackend,
    shouldSkip,
  }
}

// `ReturnType<typeof getBackendPaths>` is "whatever getBackendPaths returns", so this type follows it.
export type BackendPaths = ReturnType<typeof getBackendPaths>

// Fails, naming what is missing, unless the backend files a check needs are all there. `required` maps a
// label for the error message to a path; the default is what rows 170, 175 and 181 read. The folder may
// be absent only when every required path came from its own override variable.
export function assertBackendFilesExist(
  paths: BackendPaths,
  required: Record<string, string> = {
    'Prisma schema': paths.backendSchemaPath,
    'shared-types dir': paths.backendSharedTypesDir,
  }
) {
  const allOverridden = Object.values(required).every((p) => paths.overriddenPaths.includes(p))
  if (!paths.dirExists && !allOverridden) {
    throw new Error(
      paths.requireBackend
        ? `REQUIRE_BACKEND=1 is set, but backend directory was not found under ${paths.backendDir}`
        : `Backend directory was not found under ${paths.backendDir}`
    )
  }
  for (const [label, filePath] of Object.entries(required)) {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Backend ${label} missing: checked ${filePath}`)
    }
  }
}

// Says loudly, once per message and test file, that a check is skipped because the backend is absent.
const warned = new Set<string>()
export function warnBackendAbsentOnce(backendDir: string, whatIsSkipped: string) {
  const message =
    '\n=================================================================================\n' +
    `WARNING: Backend directory not found under ${backendDir}.\n` +
    `Skipping ${whatIsSkipped} because backend repo is absent.\n` +
    '=================================================================================\n'
  if (warned.has(message)) return
  warned.add(message)
  console.warn(message)
}

// Prisma enums as { EnumName: { VALUE: 'VALUE' } }, read from the schema's text.
export type PrismaEnums = Record<string, Record<string, string>>

// Parses the Prisma schema's enums. Comment lines inside an enum are skipped.
export function parsePrismaEnums(schemaPath: string): PrismaEnums {
  if (!fs.existsSync(schemaPath)) {
    throw new Error(`Prisma schema file missing: ${schemaPath}`)
  }
  const schemaContent = fs.readFileSync(schemaPath, 'utf-8')
  const enums: PrismaEnums = {}
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

// Loads a TypeScript file by transpiling it to CommonJS and running it in a bare vm context, and returns
// its exports. This runs the co-op's own files and is not a security boundary. `@prisma/types` is
// answered with `prismaEnums`, a relative import is loaded the same way, and any other import fails with
// a message naming the file (the loader is for plain data files, not for code with dependencies).
export function loadBackendSharedFile<T = Record<string, unknown>>(
  filePath: string,
  prismaEnums: PrismaEnums = {}
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
    if (err instanceof Error && err.message.includes('attempted to call require')) {
      throw err
    }
    const message = err instanceof Error ? err.message : String(err)
    throw new Error(`Failed to evaluate ${filePath}: ${message}`)
  }

  return moduleObj.exports as T
}

// Compares two lists as sets, both ways: what the backend has and the app lacks, and the reverse.
// Order does not matter, and a value written twice counts once.
export function compareSets(
  adminItems: string[],
  backendItems: string[]
): { missingInApp: string[]; extraInApp: string[] } {
  const adminSet = new Set(adminItems)
  const backendSet = new Set(backendItems)
  const missingInApp = backendItems.filter((item) => !adminSet.has(item))
  const extraInApp = adminItems.filter((item) => !backendSet.has(item))
  return { missingInApp, extraInApp }
}

// Finds entries in a COMPARED_ELSEWHERE map where the test file is missing or does not name the export.
// It checks a mention only: the name anywhere in the file (a comment too) passes, so it does not prove
// the file compares the export (row 181 review).
export function findBrokenComparedElsewhere(
  comparedElsewhere: Record<string, string>,
  srcDir: string
): [string, string][] {
  return Object.entries(comparedElsewhere).filter(([exportName, testFile]) => {
    const filePath = path.join(srcDir, testFile)
    return !fs.existsSync(filePath) || !fs.readFileSync(filePath, 'utf-8').includes(exportName)
  })
}

// ---------------------------------------------------------------------------------------------------
// Readers for hand mirrors (row 181). A hand mirror is often a private constant, so instead of importing
// it the test reads the source file with the TypeScript compiler API (`ts.createSourceFile` turns the
// text into a tree of nodes). Every reader throws, naming the file and the constant, when the constant
// is missing or holds anything it cannot read: an unreadable value must fail, never be skipped (row
// 175's review: a skipped value is the one way such a check passes wrongly).
// ---------------------------------------------------------------------------------------------------

function parseSource(filePath: string): ts.SourceFile {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`)
  }
  const code = fs.readFileSync(filePath, 'utf-8')
  // The file name's extension tells the parser whether to expect JSX (.tsx).
  return ts.createSourceFile(path.basename(filePath), code, ts.ScriptTarget.Latest, true)
}

// Strips wrappers that do not change a value: `(...)`, `... as const`, `... as Foo[]`, `... satisfies Foo`.
function unwrapExpression(node: ts.Expression): ts.Expression {
  let current = node
  while (
    ts.isParenthesizedExpression(current) ||
    ts.isAsExpression(current) ||
    ts.isSatisfiesExpression(current)
  ) {
    current = current.expression
  }
  return current
}

// The strings of one union type node: 'A' | 'B'. A single literal ('A') counts as a one value union.
function unionStrings(node: ts.TypeNode, what: string, filePath: string): string[] {
  const members = ts.isUnionTypeNode(node) ? Array.from(node.types) : [node]
  return members.map((member) => {
    if (ts.isLiteralTypeNode(member) && ts.isStringLiteral(member.literal)) {
      return member.literal.text
    }
    throw new Error(`Cannot read union member in '${what}' in ${filePath}: ${member.getText()}`)
  })
}

// The values of a top level `const NAME = [...]` in a file. Each element may be a string ('SMALL'), an
// object whose `value` is a string ({ value: 'OPEN', labelKey: ... }, as the filter lists are), or a
// spread of another such list declared earlier in the same file.
export function readStringList(filePath: string, constName: string): string[] {
  const sf = parseSource(filePath)
  const listsSoFar: Record<string, string[]> = {}

  const readArray = (init: ts.Expression, name: string): string[] => {
    const array = unwrapExpression(init)
    if (!ts.isArrayLiteralExpression(array)) {
      throw new Error(`Constant '${name}' in ${filePath} is not an array literal`)
    }
    const values: string[] = []
    for (const element of array.elements) {
      const elem = ts.isSpreadElement(element) ? element : unwrapExpression(element)
      if (ts.isStringLiteral(elem) || ts.isNoSubstitutionTemplateLiteral(elem)) {
        values.push(elem.text)
      } else if (ts.isObjectLiteralExpression(elem)) {
        const valueProp = elem.properties.find(
          (p): p is ts.PropertyAssignment =>
            ts.isPropertyAssignment(p) && ts.isIdentifier(p.name) && p.name.text === 'value'
        )
        const valueInit = valueProp ? unwrapExpression(valueProp.initializer) : undefined
        if (!valueInit || !ts.isStringLiteral(valueInit)) {
          throw new Error(
            `Cannot read element in '${name}' in ${filePath}: an object without a string 'value'`
          )
        }
        values.push(valueInit.text)
      } else if (ts.isSpreadElement(elem) && ts.isIdentifier(elem.expression)) {
        const spread = listsSoFar[elem.expression.text]
        if (!spread) {
          throw new Error(`Cannot resolve spread '...${elem.expression.text}' in '${name}' in ${filePath}`)
        }
        values.push(...spread)
      } else {
        throw new Error(`Cannot read element in '${name}' in ${filePath}: ${elem.getText()}`)
      }
    }
    return values
  }

  let found: string[] | null = null
  for (const stmt of sf.statements) {
    if (!ts.isVariableStatement(stmt)) continue
    for (const decl of stmt.declarationList.declarations) {
      if (!ts.isIdentifier(decl.name) || !decl.initializer) continue
      if (decl.name.text === constName) {
        found = readArray(decl.initializer, constName)
      } else if (ts.isArrayLiteralExpression(unwrapExpression(decl.initializer))) {
        // Another list in the same file, kept in case the wanted one spreads it. An unreadable one is
        // left out here; it only matters if spread, and then the spread fails by name.
        try {
          listsSoFar[decl.name.text] = readArray(decl.initializer, decl.name.text)
        } catch {
          // not a list of strings: ignored unless the wanted constant spreads it
        }
      }
    }
  }
  if (found === null) {
    throw new Error(`Constant '${constName}' not found in ${filePath}`)
  }
  return found
}

// The strings of a top level `type NAME = 'A' | 'B'` in a file (the hand edited SDK declares its enums so).
export function readStringUnion(filePath: string, typeName: string): string[] {
  const sf = parseSource(filePath)
  for (const stmt of sf.statements) {
    if (ts.isTypeAliasDeclaration(stmt) && stmt.name.text === typeName) {
      return unionStrings(stmt.type, typeName, filePath)
    }
  }
  throw new Error(`Type '${typeName}' not found in ${filePath}`)
}

// Every `propName: 'A' | 'B'` property type anywhere in a file, one list per place it is written, for a
// union written inline in a parameter or model type (`kind: 'WRONG_ITEM' | 'MISSING_ITEM'`).
export function readPropertyUnions(filePath: string, propName: string): string[][] {
  const sf = parseSource(filePath)
  const found: string[][] = []
  const visit = (node: ts.Node) => {
    if (
      ts.isPropertySignature(node) &&
      ts.isIdentifier(node.name) &&
      node.name.text === propName &&
      node.type
    ) {
      found.push(unionStrings(node.type, propName, filePath))
    }
    ts.forEachChild(node, visit)
  }
  visit(sf)
  if (found.length === 0) {
    throw new Error(`Property '${propName}' not found in ${filePath}`)
  }
  return found
}
