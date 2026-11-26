// Scope row 175: adminweb's hand mirrors of backend lists are checked against the backend.
// Precedent: src/shared-types/backend-types.test.ts (row 170).
// Compares hand-copied backend lists outside src/shared-types/ with backend originals:
// 1. CancelledBy in src/modules/deliveries/utils/cancellationDisplay.ts vs backend EnumCancelledBy
// 2. CHOICES in src/modules/deliveries/components/CancelDeliveryDialog.tsx vs backend EnumCancelledBy
// 3. deliveries.cancelledBy in en and el i18n resources vs backend EnumCancelledBy
// 4. cancelledBy in src/api/deliveriesApi.ts vs backend EnumCancelledBy
// 5. EnumFoodOutcome in backend vs foodOutcomeText in cancellationDisplay.ts
// 6. PICKED_UP_STATUSES in cancellationDisplay.ts vs backend DELIVERY_PICKED_UP_STATUSES
// 7. ONGOING_STATUSES in cancellationDisplay.ts vs backend DELIVERY_ONGOING_STATUSES
// 8. ONGOING_DELIVERY_STATUSES in src/modules/deliveries/components/ReassignCourierDialog.tsx vs backend DELIVERY_ONGOING_STATUSES
// Hand mirrors are not exported from source, so they are extracted via TypeScript compiler API.
// Compares as sets where order does not matter, checking both directions (missing in app, extra in app).
// Honours OPENCOURIER_BACKEND_DIR, BACKEND_SCHEMA_PATH, BACKEND_SHARED_TYPES_DIR, and REQUIRE_BACKEND=1.
import fs from 'fs'
import path from 'path'
import os from 'os'
import ts from 'typescript'
import { foodOutcomeText } from './cancellationDisplay'
import { createI18n } from '@/i18n/createI18n'
import { deliveries as enDeliveries } from '@/i18n/resources/en/deliveries'
import { deliveries as elDeliveries } from '@/i18n/resources/el/deliveries'

// The skip rules, the backend loader, the Prisma reader and compareSets are shared by every copy check
// (row 181); the skip rules are tested once, in src/test-utils/backendCopies.test.ts.
import {
  assertBackendFilesExist,
  compareSets,
  getBackendPaths,
  loadBackendSharedFile,
  parsePrismaEnums,
  warnBackendAbsentOnce,
} from '@/test-utils/backendCopies'

// Uses the TypeScript compiler API to extract hand mirrors from cancellationDisplay.ts.
// Throws naming the constant and file if not found, not an array literal or union, or holds unreadable elements.
function readCancellationDisplayMirrors(filePath: string) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`)
  }
  const code = fs.readFileSync(filePath, 'utf-8')
  const sf = ts.createSourceFile(path.basename(filePath), code, ts.ScriptTarget.Latest, true)

  const localArrays: Record<string, string[]> = {}
  let cancelledBy: string[] | null = null
  let pickedUpStatuses: string[] | null = null
  let ongoingStatuses: string[] | null = null

  const extractArray = (init: ts.Expression, constName: string): string[] => {
    if (!ts.isArrayLiteralExpression(init)) {
      throw new Error(`Constant '${constName}' in ${filePath} is not an array literal`)
    }
    const values: string[] = []
    for (const elem of init.elements) {
      if (ts.isStringLiteral(elem)) {
        values.push(elem.text)
      } else if (ts.isSpreadElement(elem)) {
        if (ts.isIdentifier(elem.expression)) {
          const refName = elem.expression.text
          const existing = localArrays[refName]
          if (existing !== undefined) {
            values.push(...existing)
          } else {
            throw new Error(
              `Cannot resolve spread '...${refName}' in '${constName}' in ${filePath}`
            )
          }
        } else {
          throw new Error(
            `Cannot read spread element in '${constName}' in ${filePath}: unexpected spread expression`
          )
        }
      } else {
        throw new Error(
          `Cannot read element in '${constName}' in ${filePath}: unexpected element kind ${elem.kind}`
        )
      }
    }
    return values
  }

  for (const stmt of sf.statements) {
    // Extracts: export type CancelledBy = 'RESTAURANT' | 'CUSTOMER' | 'COOP'
    if (ts.isTypeAliasDeclaration(stmt) && stmt.name.text === 'CancelledBy') {
      if (!ts.isUnionTypeNode(stmt.type)) {
        throw new Error(`Constant 'CancelledBy' in ${filePath} is not a union`)
      }
      const values: string[] = []
      for (const t of stmt.type.types) {
        if (ts.isLiteralTypeNode(t) && ts.isStringLiteral(t.literal)) {
          values.push(t.literal.text)
        } else {
          throw new Error(`Cannot read union member in 'CancelledBy' in ${filePath}`)
        }
      }
      cancelledBy = values
    }

    // Extracts: const PICKED_UP_STATUSES = [...] and const ONGOING_STATUSES = [...]
    if (ts.isVariableStatement(stmt)) {
      for (const decl of stmt.declarationList.declarations) {
        if (ts.isIdentifier(decl.name)) {
          const name = decl.name.text
          if (name === 'PICKED_UP_STATUSES') {
            if (!decl.initializer) {
              throw new Error(`Constant 'PICKED_UP_STATUSES' in ${filePath} is not an array literal`)
            }
            pickedUpStatuses = extractArray(decl.initializer, 'PICKED_UP_STATUSES')
            localArrays[name] = pickedUpStatuses
          } else if (name === 'ONGOING_STATUSES') {
            if (!decl.initializer) {
              throw new Error(`Constant 'ONGOING_STATUSES' in ${filePath} is not an array literal`)
            }
            ongoingStatuses = extractArray(decl.initializer, 'ONGOING_STATUSES')
            localArrays[name] = ongoingStatuses
          } else if (decl.initializer && ts.isArrayLiteralExpression(decl.initializer)) {
            try {
              localArrays[name] = extractArray(decl.initializer, name)
            } catch {
              // ignore unrelated local variables
            }
          }
        }
      }
    }
  }

  if (cancelledBy === null) {
    throw new Error(`Constant 'CancelledBy' not found in ${filePath}`)
  }
  if (pickedUpStatuses === null) {
    throw new Error(`Constant 'PICKED_UP_STATUSES' not found in ${filePath}`)
  }
  if (ongoingStatuses === null) {
    throw new Error(`Constant 'ONGOING_STATUSES' not found in ${filePath}`)
  }

  return { cancelledBy, pickedUpStatuses, ongoingStatuses }
}

// Uses the TypeScript compiler API to extract ONGOING_DELIVERY_STATUSES from ReassignCourierDialog.tsx.
// Throws naming the constant and file if not found, not an array literal, or holds unreadable elements.
function readReassignCourierDialogMirrors(filePath: string) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`)
  }
  const code = fs.readFileSync(filePath, 'utf-8')
  const sf = ts.createSourceFile(path.basename(filePath), code, ts.ScriptTarget.Latest, true)

  let ongoingDeliveryStatuses: string[] | null = null

  for (const stmt of sf.statements) {
    if (ts.isVariableStatement(stmt)) {
      for (const decl of stmt.declarationList.declarations) {
        if (ts.isIdentifier(decl.name) && decl.name.text === 'ONGOING_DELIVERY_STATUSES') {
          if (!decl.initializer || !ts.isArrayLiteralExpression(decl.initializer)) {
            throw new Error(
              `Constant 'ONGOING_DELIVERY_STATUSES' in ${filePath} is not an array literal`
            )
          }
          const values: string[] = []
          for (const elem of decl.initializer.elements) {
            if (ts.isStringLiteral(elem)) {
              values.push(elem.text)
            } else {
              throw new Error(
                `Cannot read element in 'ONGOING_DELIVERY_STATUSES' in ${filePath}: unexpected element kind ${elem.kind}`
              )
            }
          }
          ongoingDeliveryStatuses = values
        }
      }
    }
  }

  if (ongoingDeliveryStatuses === null) {
    throw new Error(`Constant 'ONGOING_DELIVERY_STATUSES' not found in ${filePath}`)
  }

  return { ongoingDeliveryStatuses }
}

// Uses the TypeScript compiler API to extract CHOICES from CancelDeliveryDialog.tsx.
// Throws naming the constant and file if not found, not an array literal, or holds unreadable elements.
function readCancelDeliveryDialogChoices(filePath: string) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`)
  }
  const code = fs.readFileSync(filePath, 'utf-8')
  const sf = ts.createSourceFile(path.basename(filePath), code, ts.ScriptTarget.Latest, true)

  let choices: string[] | null = null

  for (const stmt of sf.statements) {
    if (ts.isVariableStatement(stmt)) {
      for (const decl of stmt.declarationList.declarations) {
        if (ts.isIdentifier(decl.name) && decl.name.text === 'CHOICES') {
          if (!decl.initializer || !ts.isArrayLiteralExpression(decl.initializer)) {
            throw new Error(`Constant 'CHOICES' in ${filePath} is not an array literal`)
          }
          const values: string[] = []
          for (const elem of decl.initializer.elements) {
            if (ts.isStringLiteral(elem)) {
              values.push(elem.text)
            } else {
              throw new Error(
                `Cannot read element in 'CHOICES' in ${filePath}: unexpected element kind ${elem.kind}`
              )
            }
          }
          choices = values
        }
      }
    }
  }

  if (choices === null) {
    throw new Error(`Constant 'CHOICES' not found in ${filePath}`)
  }

  return { choices }
}

// Uses the TypeScript compiler API to extract cancelledBy union members from submitDeliveryEvent in deliveriesApi.ts.
// Throws naming the constant and file if not found, not a union, or holds unreadable members.
function readDeliveriesApiCancelledBy(filePath: string) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`)
  }
  const code = fs.readFileSync(filePath, 'utf-8')
  const sf = ts.createSourceFile(path.basename(filePath), code, ts.ScriptTarget.Latest, true)

  let cancelledByValues: string[] | null = null

  const stack: ts.Node[] = [sf]
  while (stack.length > 0) {
    const node = stack.pop()
    if (!node) continue

    if (
      ts.isPropertySignature(node) &&
      ts.isIdentifier(node.name) &&
      node.name.text === 'cancelledBy'
    ) {
      if (!node.type || !ts.isUnionTypeNode(node.type)) {
        throw new Error(`Constant 'cancelledBy' in ${filePath} is not a union`)
      }
      const values: string[] = []
      for (const t of node.type.types) {
        if (ts.isLiteralTypeNode(t) && ts.isStringLiteral(t.literal)) {
          values.push(t.literal.text)
        } else {
          throw new Error(`Cannot read union member in 'cancelledBy' in ${filePath}`)
        }
      }
      cancelledByValues = values
      break
    }
    ts.forEachChild(node, (child) => {
      stack.push(child)
    })
  }

  if (cancelledByValues === null) {
    throw new Error(`Constant 'cancelledBy' not found in ${filePath}`)
  }

  return { cancelledBy: cancelledByValues }
}

// Uses the TypeScript compiler API to extract keys of deliveries.cancelledBy from an i18n file.
// Throws naming the constant and file if not found, not an object literal, or holds unreadable properties.
function readI18nCancelledByKeys(filePath: string): string[] {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`)
  }
  const code = fs.readFileSync(filePath, 'utf-8')
  const sf = ts.createSourceFile(path.basename(filePath), code, ts.ScriptTarget.Latest, true)

  let keys: string[] | null = null

  const stack: ts.Node[] = [sf]
  while (stack.length > 0) {
    const node = stack.pop()
    if (!node) continue

    if (
      ts.isPropertyAssignment(node) &&
      ts.isIdentifier(node.name) &&
      node.name.text === 'cancelledBy'
    ) {
      if (!ts.isObjectLiteralExpression(node.initializer)) {
        throw new Error(`Constant 'cancelledBy' in ${filePath} is not an object literal`)
      }
      const collected: string[] = []
      for (const prop of node.initializer.properties) {
        if (ts.isPropertyAssignment(prop) && ts.isIdentifier(prop.name)) {
          collected.push(prop.name.text)
        } else {
          throw new Error(`Cannot read property in 'cancelledBy' in ${filePath}`)
        }
      }
      keys = collected
      break
    }
    ts.forEachChild(node, (child) => {
      stack.push(child)
    })
  }

  if (keys === null) {
    throw new Error(`Constant 'cancelledBy' not found in ${filePath}`)
  }

  return keys
}

// Uses the TypeScript compiler API to extract literals compared against foodOutcome in foodOutcomeText.
function readFoodOutcomeLiterals(filePath: string): string[] {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`)
  }
  const code = fs.readFileSync(filePath, 'utf-8')
  const sf = ts.createSourceFile(path.basename(filePath), code, ts.ScriptTarget.Latest, true)

  const literals: string[] = []
  let foundFunction = false

  const stack: ts.Node[] = [sf]
  while (stack.length > 0) {
    const node = stack.pop()
    if (!node) continue

    if (ts.isFunctionDeclaration(node) && node.name && node.name.text === 'foodOutcomeText') {
      foundFunction = true
      const fnStack: ts.Node[] = [node]
      while (fnStack.length > 0) {
        const fnNode = fnStack.pop()
        if (!fnNode) continue

        if (
          ts.isBinaryExpression(fnNode) &&
          (fnNode.operatorToken.kind === ts.SyntaxKind.EqualsEqualsEqualsToken ||
            fnNode.operatorToken.kind === ts.SyntaxKind.EqualsEqualsToken)
        ) {
          if (
            ts.isIdentifier(fnNode.left) &&
            fnNode.left.text === 'foodOutcome' &&
            ts.isStringLiteral(fnNode.right)
          ) {
            literals.push(fnNode.right.text)
          } else if (
            ts.isIdentifier(fnNode.right) &&
            fnNode.right.text === 'foodOutcome' &&
            ts.isStringLiteral(fnNode.left)
          ) {
            literals.push(fnNode.left.text)
          }
        }
        ts.forEachChild(fnNode, (child) => {
          fnStack.push(child)
        })
      }
    }
    ts.forEachChild(node, (child) => {
      stack.push(child)
    })
  }

  if (!foundFunction) {
    throw new Error(`Constant 'foodOutcomeText' not found in ${filePath}`)
  }
  if (literals.length === 0) {
    throw new Error(`No foodOutcome comparisons found in 'foodOutcomeText' in ${filePath}`)
  }

  return literals
}

describe('Hand mirrors parity (row 175: adminweb mirrors checked against backend)', () => {
  describe('AST extraction helpers (Minor 1 error guards)', () => {
    it('throws when AST extractor is given a nonexistent file', () => {
      expect(() => readCancellationDisplayMirrors('/nonexistent/path.ts')).toThrow(
        'File not found: /nonexistent/path.ts'
      )
      expect(() => readReassignCourierDialogMirrors('/nonexistent/path.tsx')).toThrow(
        'File not found: /nonexistent/path.tsx'
      )
      expect(() => readCancelDeliveryDialogChoices('/nonexistent/path.tsx')).toThrow(
        'File not found: /nonexistent/path.tsx'
      )
      expect(() => readDeliveriesApiCancelledBy('/nonexistent/path.ts')).toThrow(
        'File not found: /nonexistent/path.ts'
      )
      expect(() => readI18nCancelledByKeys('/nonexistent/path.ts')).toThrow(
        'File not found: /nonexistent/path.ts'
      )
      expect(() => readFoodOutcomeLiterals('/nonexistent/path.ts')).toThrow(
        'File not found: /nonexistent/path.ts'
      )
    })

    it('throws naming the constant and file when constant is not found', () => {
      const tempFile = path.join(os.tmpdir(), `test-empty-${Date.now()}.ts`)
      fs.writeFileSync(tempFile, 'const UNRELATED_VAR = 1;')
      try {
        expect(() => readCancellationDisplayMirrors(tempFile)).toThrow(
          `Constant 'CancelledBy' not found in ${tempFile}`
        )
        expect(() => readReassignCourierDialogMirrors(tempFile)).toThrow(
          `Constant 'ONGOING_DELIVERY_STATUSES' not found in ${tempFile}`
        )
        expect(() => readCancelDeliveryDialogChoices(tempFile)).toThrow(
          `Constant 'CHOICES' not found in ${tempFile}`
        )
        expect(() => readDeliveriesApiCancelledBy(tempFile)).toThrow(
          `Constant 'cancelledBy' not found in ${tempFile}`
        )
        expect(() => readI18nCancelledByKeys(tempFile)).toThrow(
          `Constant 'cancelledBy' not found in ${tempFile}`
        )
        expect(() => readFoodOutcomeLiterals(tempFile)).toThrow(
          `Constant 'foodOutcomeText' not found in ${tempFile}`
        )
      } finally {
        fs.unlinkSync(tempFile)
      }
    })

    it('throws naming the constant and file when constant is not an array literal or union as expected', () => {
      const tempFile = path.join(os.tmpdir(), `test-not-array-${Date.now()}.ts`)
      fs.writeFileSync(
        tempFile,
        'export type CancelledBy = string;\n' +
          'const PICKED_UP_STATUSES = "not-an-array";\n' +
          'const ONGOING_STATUSES = 123;\n' +
          'const ONGOING_DELIVERY_STATUSES = 456;\n' +
          'const CHOICES = true;\n' +
          'type Api = { cancelledBy?: string };\n' +
          'export const deliveries = { cancelledBy: "not-an-object" };\n'
      )
      try {
        expect(() => readCancellationDisplayMirrors(tempFile)).toThrow(
          `Constant 'CancelledBy' in ${tempFile} is not a union`
        )
        expect(() => readReassignCourierDialogMirrors(tempFile)).toThrow(
          `Constant 'ONGOING_DELIVERY_STATUSES' in ${tempFile} is not an array literal`
        )
        expect(() => readCancelDeliveryDialogChoices(tempFile)).toThrow(
          `Constant 'CHOICES' in ${tempFile} is not an array literal`
        )
        expect(() => readDeliveriesApiCancelledBy(tempFile)).toThrow(
          `Constant 'cancelledBy' in ${tempFile} is not a union`
        )
        expect(() => readI18nCancelledByKeys(tempFile)).toThrow(
          `Constant 'cancelledBy' in ${tempFile} is not an object literal`
        )
      } finally {
        fs.unlinkSync(tempFile)
      }
    })

    it('throws naming the constant and file when an element cannot be read or spread cannot be resolved', () => {
      const tempFile1 = path.join(os.tmpdir(), `test-unreadable-1-${Date.now()}.ts`)
      fs.writeFileSync(
        tempFile1,
        'export type CancelledBy = "A" | 123;\n' +
          'const PICKED_UP_STATUSES = ["A"];\n' +
          'const ONGOING_STATUSES = ["B"];\n'
      )
      const tempFile2 = path.join(os.tmpdir(), `test-unreadable-2-${Date.now()}.ts`)
      fs.writeFileSync(
        tempFile2,
        'export type CancelledBy = "A" | "B";\n' +
          'const PICKED_UP_STATUSES = ["A", UNRESOLVED_IDENTIFIER];\n' +
          'const ONGOING_STATUSES = ["B"];\n'
      )
      const tempFile3 = path.join(os.tmpdir(), `test-unreadable-3-${Date.now()}.ts`)
      fs.writeFileSync(
        tempFile3,
        'export type CancelledBy = "A" | "B";\n' +
          'const PICKED_UP_STATUSES = ["A"];\n' +
          'const ONGOING_STATUSES = [...NONEXISTENT_SPREAD];\n'
      )
      const tempFile4 = path.join(os.tmpdir(), `test-unreadable-4-${Date.now()}.ts`)
      fs.writeFileSync(
        tempFile4,
        'const ONGOING_DELIVERY_STATUSES = ["A", 42];\n' +
          'const CHOICES = ["A", false];\n'
      )
      try {
        expect(() => readCancellationDisplayMirrors(tempFile1)).toThrow(
          `Cannot read union member in 'CancelledBy' in ${tempFile1}`
        )
        expect(() => readCancellationDisplayMirrors(tempFile2)).toThrow(
          `Cannot read element in 'PICKED_UP_STATUSES' in ${tempFile2}`
        )
        expect(() => readCancellationDisplayMirrors(tempFile3)).toThrow(
          `Cannot resolve spread '...NONEXISTENT_SPREAD' in 'ONGOING_STATUSES' in ${tempFile3}`
        )
        expect(() => readReassignCourierDialogMirrors(tempFile4)).toThrow(
          `Cannot read element in 'ONGOING_DELIVERY_STATUSES' in ${tempFile4}`
        )
        expect(() => readCancelDeliveryDialogChoices(tempFile4)).toThrow(
          `Cannot read element in 'CHOICES' in ${tempFile4}`
        )
      } finally {
        fs.unlinkSync(tempFile1)
        fs.unlinkSync(tempFile2)
        fs.unlinkSync(tempFile3)
        fs.unlinkSync(tempFile4)
      }
    })
  })

  describe('Row 175: Hand mirrors compared with backend originals', () => {
    const backendPaths = getBackendPaths()

    if (backendPaths.shouldSkip) {
      warnBackendAbsentOnce(backendPaths.backendDir, 'hand mirror parity checks')
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
    const cancelDeliveryDialogPath = path.resolve(
      __dirname,
      '../components/CancelDeliveryDialog.tsx'
    )
    const deliveriesApiPath = path.resolve(__dirname, '../../../api/deliveriesApi.ts')
    const enDeliveriesPath = path.resolve(__dirname, '../../../i18n/resources/en/deliveries.ts')
    const elDeliveriesPath = path.resolve(__dirname, '../../../i18n/resources/el/deliveries.ts')

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
      'CancelDeliveryDialog.tsx: CHOICES matches backend EnumCancelledBy both ways (as sets, order does not matter)',
      () => {
        const backendCancelledByDict = prismaEnums.EnumCancelledBy ?? {}
        const backendValues = Object.keys(backendCancelledByDict)
        expect(backendValues.length).toBeGreaterThan(0)

        const { choices } = readCancelDeliveryDialogChoices(cancelDeliveryDialogPath)
        expect(choices.length).toBeGreaterThan(0)

        const diff = compareSets(choices, backendValues)
        expect(diff.missingInApp).toEqual([])
        expect(diff.extraInApp).toEqual([])
        expect(new Set(choices)).toEqual(new Set(backendValues))
      }
    )

    itRow175(
      'deliveriesApi.ts: cancelledBy union matches backend EnumCancelledBy both ways (as sets, order does not matter)',
      () => {
        const backendCancelledByDict = prismaEnums.EnumCancelledBy ?? {}
        const backendValues = Object.keys(backendCancelledByDict)
        expect(backendValues.length).toBeGreaterThan(0)

        const { cancelledBy } = readDeliveriesApiCancelledBy(deliveriesApiPath)
        expect(cancelledBy.length).toBeGreaterThan(0)

        const diff = compareSets(cancelledBy, backendValues)
        expect(diff.missingInApp).toEqual([])
        expect(diff.extraInApp).toEqual([])
        expect(new Set(cancelledBy)).toEqual(new Set(backendValues))
      }
    )

    itRow175(
      'en/deliveries.ts: deliveries.cancelledBy keys match backend EnumCancelledBy both ways (as sets, order does not matter)',
      () => {
        const backendCancelledByDict = prismaEnums.EnumCancelledBy ?? {}
        const backendValues = Object.keys(backendCancelledByDict)
        expect(backendValues.length).toBeGreaterThan(0)

        const enKeysFromAst = readI18nCancelledByKeys(enDeliveriesPath)
        const enKeysRuntime = Object.keys(enDeliveries.cancelledBy)
        expect(new Set(enKeysFromAst)).toEqual(new Set(enKeysRuntime))
        expect(enKeysFromAst.length).toBeGreaterThan(0)

        const diff = compareSets(enKeysFromAst, backendValues)
        expect(diff.missingInApp).toEqual([])
        expect(diff.extraInApp).toEqual([])
        expect(new Set(enKeysFromAst)).toEqual(new Set(backendValues))
      }
    )

    itRow175(
      'el/deliveries.ts: deliveries.cancelledBy keys match backend EnumCancelledBy both ways (as sets, order does not matter)',
      () => {
        const backendCancelledByDict = prismaEnums.EnumCancelledBy ?? {}
        const backendValues = Object.keys(backendCancelledByDict)
        expect(backendValues.length).toBeGreaterThan(0)

        const elKeysFromAst = readI18nCancelledByKeys(elDeliveriesPath)
        const elKeysRuntime = Object.keys(elDeliveries.cancelledBy)
        expect(new Set(elKeysFromAst)).toEqual(new Set(elKeysRuntime))
        expect(elKeysFromAst.length).toBeGreaterThan(0)

        const diff = compareSets(elKeysFromAst, backendValues)
        expect(diff.missingInApp).toEqual([])
        expect(diff.extraInApp).toEqual([])
        expect(new Set(elKeysFromAst)).toEqual(new Set(backendValues))
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

    itRow175(
      'cancellationDisplay.ts: foodOutcomeText covers all backend EnumFoodOutcome values in English and Greek, and does not handle values the backend lacks',
      () => {
        const backendFoodOutcomeDict = prismaEnums.EnumFoodOutcome ?? {}
        const backendValues = Object.keys(backendFoodOutcomeDict)
        expect(backendValues.length).toBeGreaterThan(0)

        const codeLiterals = readFoodOutcomeLiterals(cancellationDisplayPath)
        expect(codeLiterals.length).toBeGreaterThan(0)

        // If foodOutcomeText's literals name a value the backend lacks, fail naming it
        const extraLiterals = codeLiterals.filter((lit) => !backendValues.includes(lit))
        if (extraLiterals.length > 0) {
          throw new Error(
            `foodOutcomeText in ${cancellationDisplayPath} names food outcome values the backend lacks: ${extraLiterals.join(', ')}`
          )
        }
        expect(extraLiterals).toEqual([])

        const setDiff = compareSets(codeLiterals, backendValues)
        expect(setDiff.missingInApp).toEqual([])
        expect(setDiff.extraInApp).toEqual([])

        const tEn = createI18n('en').t
        const tEl = createI18n('el').t

        const noFoodEn = tEn('deliveries.cancellation.food.noFood')
        const notRecordedEn = tEn('deliveries.cancellation.food.notRecorded')
        const noFoodEl = tEl('deliveries.cancellation.food.noFood')
        const notRecordedEl = tEl('deliveries.cancellation.food.notRecorded')

        // For every value of backend EnumFoodOutcome, foodOutcomeText returns a real label in English and Greek, not the raw value
        for (const val of backendValues) {
          const textEn = foodOutcomeText('PICKED_UP', val, tEn)
          expect(textEn).not.toBe(val)
          expect(textEn).not.toBe(notRecordedEn)
          expect(textEn).not.toBe(noFoodEn)
          expect(typeof textEn).toBe('string')
          expect(textEn.trim().length).toBeGreaterThan(0)

          const textEl = foodOutcomeText('PICKED_UP', val, tEl)
          expect(textEl).not.toBe(val)
          expect(textEl).not.toBe(notRecordedEl)
          expect(textEl).not.toBe(noFoodEl)
          expect(typeof textEl).toBe('string')
          expect(textEl.trim().length).toBeGreaterThan(0)
        }

        // A value the backend lacks is not handled specially
        const unknownVal = 'UNKNOWN_FOOD_OUTCOME_VAL'
        expect(foodOutcomeText('PICKED_UP', unknownVal, tEn)).toBe(notRecordedEn)
        expect(foodOutcomeText('PICKED_UP', unknownVal, tEl)).toBe(notRecordedEl)
      }
    )
  })
})
