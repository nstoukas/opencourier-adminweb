// Scope row 170: adminweb's other copied backend types are checked against the backend.
// Precedent: src/i18n/translations.test.ts (row 163).
// Compares private copies of backend types under src/shared-types/ with the backend originals
// (under ../opencourier-backend/src/shared-types/ and ../opencourier-backend/prisma/schema.prisma).
// Tests both directions: missing in app, extra in app, and value mismatches.
// Honours OPENCOURIER_BACKEND_DIR and REQUIRE_BACKEND=1 (the skip rules: src/test-utils/backendCopies.ts,
// tested once in src/test-utils/backendCopies.test.ts).
import fs from 'fs'
import path from 'path'
import ts from 'typescript'

// Adminweb shared types under test
import * as cartTypes from './cart'
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

// The skip rules, the backend loader and the Prisma reader are shared by every copy check (row 181).
import {
  assertBackendFilesExist,
  findBrokenComparedElsewhere,
  getBackendPaths,
  loadBackendSharedFile,
  parsePrismaEnums,
  warnBackendAbsentOnce,
} from '@/test-utils/backendCopies'

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
        if (ts.isPropertySignature(m)) {
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
  options?: {
    allowedMissingInApp?: string[]
    allowedExtraInApp?: string[]
    allowValueDifferences?: boolean
  }
) {
  const allowedMissing = new Set(options?.allowedMissingInApp ?? [])
  const allowedExtra = new Set(options?.allowedExtraInApp ?? [])
  const allowValueDifferences = options?.allowValueDifferences ?? false

  const adminKeys = Object.keys(adminDict).sort()
  const backendKeys = Object.keys(backendDict).sort()

  const missingInApp = backendKeys.filter((k) => !adminKeys.includes(k) && !allowedMissing.has(k))
  const extraInApp = adminKeys.filter((k) => !backendKeys.includes(k) && !allowedExtra.has(k))
  const valueMismatches: { key: string; admin: unknown; backend: unknown }[] = []

  if (!allowValueDifferences) {
    for (const key of adminKeys) {
      if (key in backendDict && !allowedExtra.has(key)) {
        const adminVal = adminDict[key]
        const backendVal = backendDict[key]
        if (adminVal !== backendVal) {
          valueMismatches.push({ key, admin: adminVal, backend: backendVal })
        }
      }
    }
  }

  return { missingInApp, extraInApp, valueMismatches }
}

describe('Shared types parity (row 170: adminweb copies checked against backend)', () => {
  describe('Row 170: Copied backend type values compared with backend originals', () => {
    const backendPaths = getBackendPaths()

    if (backendPaths.shouldSkip) {
      warnBackendAbsentOnce(backendPaths.backendDir, 'shared type copy consistency checks')
    }

    const itRow170 = backendPaths.shouldSkip ? it.skip : it

    itRow170('ensures backend directory and core files exist', () => {
      assertBackendFilesExist(backendPaths)
    })

    // Lazy load backend modules only when backend is present
    let prismaEnums: Record<string, Record<string, string>> = {}
    if (!backendPaths.shouldSkip && fs.existsSync(backendPaths.backendSchemaPath)) {
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
            expect(adminFields[fname]?.optional).toBe(backendFields[fname]?.optional)
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

      // AGENTS.md:
      // "Two label maps differ on purpose: STATUS_TO_HUMAN and COURIER_STATUS_TO_HUMAN hold this
      // dashboard's on screen labels ("Assigning Courier", "Last Call"), not the backend's lower case
      // values; their keys must still match."
      itRow170(
        'delivery.ts: COURIER_STATUS_TO_HUMAN keys match backend COURIER_STATUS_TO_HUMAN both ways',
        () => {
          const backendMod = loadBackendType<{
            COURIER_STATUS_TO_HUMAN: Record<string, string>
          }>('delivery.ts')
          const diff = compareDictionaries(
            deliveryTypes.COURIER_STATUS_TO_HUMAN,
            backendMod.COURIER_STATUS_TO_HUMAN,
            { allowValueDifferences: true }
          )
          expect(diff.missingInApp).toEqual([])
          expect(diff.extraInApp).toEqual([])
        }
      )

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
        // Interfaces in delivery.ts not compared because the admin SDK carries them and they differ from the backend:
        // - OrderItem: carried by admin SDK, differs from backend definition
        // - DeliveryCreationDetails: carried by admin SDK, differs from backend definition
        // - DeliveryUpdateDetails: carried by admin SDK, differs from backend definition
        const UNCHECKED_DELIVERY_INTERFACES = [
          'OrderItem',
          'DeliveryCreationDetails',
          'DeliveryUpdateDetails',
        ]
        expect(Object.keys(adminIfaces).sort()).toEqual(
          [...checkedInterfaces, ...UNCHECKED_DELIVERY_INTERFACES].sort()
        )
        for (const name of checkedInterfaces) {
          expect(backendIfaces).toHaveProperty(name)
          const adminFields = adminIfaces[name] ?? {}
          const backendFields = backendIfaces[name] ?? {}
          expect(Object.keys(adminFields).sort()).toEqual(Object.keys(backendFields).sort())
          for (const fname of Object.keys(adminFields)) {
            expect(adminFields[fname]?.optional).toBe(backendFields[fname]?.optional)
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

      itRow170(
        'notification.ts: notification channel name builders match backend output for sample id(s)',
        () => {
          const backendMod = loadBackendType<{
            courierNotificationChannel: (userId: string) => string
            adminBroadcastNotificationChannel: () => string
            merchantGroupAdminNotificationChannel: (merchantGroupId: string) => string
          }>('notification.ts')

          const sampleUserId = 'sample-courier-user-123'
          const sampleMerchantGroupId = 'sample-merchant-group-456'

          expect(notificationTypes.courierNotificationChannel(sampleUserId)).toBe(
            backendMod.courierNotificationChannel(sampleUserId)
          )
          expect(notificationTypes.adminBroadcastNotificationChannel()).toBe(
            backendMod.adminBroadcastNotificationChannel()
          )
          expect(
            notificationTypes.merchantGroupAdminNotificationChannel(sampleMerchantGroupId)
          ).toBe(backendMod.merchantGroupAdminNotificationChannel(sampleMerchantGroupId))
        }
      )
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
      // AGENTS.md:
      // "Two label maps differ on purpose: STATUS_TO_HUMAN and COURIER_STATUS_TO_HUMAN hold this
      // dashboard's on screen labels ("Assigning Courier", "Last Call"), not the backend's lower case
      // values; their keys must still match."
      itRow170(
        'state-machine.ts: STATUS_TO_HUMAN keys match backend STATUS_TO_HUMAN both ways',
        () => {
          const backendMod = loadBackendType<{
            STATUS_TO_HUMAN: Record<string, string>
          }>('stateMachine.ts')
          const diff = compareDictionaries(
            stateMachineTypes.STATUS_TO_HUMAN,
            backendMod.STATUS_TO_HUMAN,
            { allowValueDifferences: true }
          )
          expect(diff.missingInApp).toEqual([])
          expect(diff.extraInApp).toEqual([])
        }
      )

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

      itRow170(
        'state-machine.ts: STATE_MACHINE status keys and transitions match backend stateMachine.ts',
        () => {
          const backendMod = loadBackendType<{
            STATE_MACHINE: Record<
              string,
              { on: Partial<Record<string, string>> }
            >
          }>('stateMachine.ts')

          const backendSM = backendMod.STATE_MACHINE
          const adminSM = stateMachineTypes.STATE_MACHINE

          // Status keys both ways
          const backendStatuses = Object.keys(backendSM).sort()
          const adminStatuses = Object.keys(adminSM).sort()
          expect(adminStatuses).toEqual(backendStatuses)

          // Allowed differences, each a named list with its reason in a comment:
          // (a) Admin-only by design: CREATED + ACCEPTED
          // The backend handles it outside the table (offerDeliveryToCourierAsAdmin in delivery.domain.service.ts).
          const ADMIN_ONLY_TRANSITIONS: { status: string; event: string; target: string }[] = [
            {
              status: 'CREATED',
              event: 'ACCEPTED',
              target: 'ASSIGNING_COURIER',
            },
          ]

          // (b) Known defect list: row 176 removed FULFILLED from adminweb's STATE_MACHINE,
          // matching the backend table which never had it. The known defect list is now empty.
          const KNOWN_DEFECT_DEFERRED_TRANSITIONS: { status: string; event: string; target: string }[] = []

          // (c) Platform-only events the backend table has and adminweb leaves out on purpose
          // (adminweb AGENTS.md: OFFERED, OFFER_EXPIRED, NO_COURIER_AVAILABLE "never in STATE_MACHINE"),
          // plus any other platform record the backend table carries that adminweb menus must not send.
          // - CREATED on CREATED: initial delivery creation by platform, not an admin menu action
          // - OFFERED, OFFER_EXPIRED, NO_COURIER_AVAILABLE on ASSIGNING_COURIER: platform matching events (spec 0002)
          // - REASSIGNED on active statuses: Section 3b safety guard requires reassignment to go through
          //   dedicated POST /reassign endpoint to ensure courier compensation is created
          // - RETURNED_TO_WAITING: platform dispatch stop event (spec 0014)
          // - HANDED_BACK: rider free hand back event (spec 0020), recorded by courier handBack endpoint
          // - REMOVAL_APPROVED: removal request approval workflow event (spec 0035)
          // - WAIT_UNDISPATCHED: rider left after waiting event (spec 0033)
          // - ARRIVED_AT_DROPOFF_LOCATION on PICKED_UP: the backend allows it from PICKED_UP and ON_THE_WAY; adminweb's table has it from ON_THE_WAY, and the admin menu no longer offers it (row 176)
          const PLATFORM_ONLY_BACKEND_TRANSITIONS: { status: string; event: string; target: string }[] = [
            { status: 'CREATED', event: 'CREATED', target: 'ASSIGNING_COURIER' },
            { status: 'ASSIGNING_COURIER', event: 'OFFERED', target: 'ASSIGNING_COURIER' },
            { status: 'ASSIGNING_COURIER', event: 'OFFER_EXPIRED', target: 'ASSIGNING_COURIER' },
            { status: 'ASSIGNING_COURIER', event: 'NO_COURIER_AVAILABLE', target: 'ASSIGNING_COURIER' },
            { status: 'ACCEPTED', event: 'REASSIGNED', target: 'ASSIGNING_COURIER' },
            { status: 'ACCEPTED', event: 'RETURNED_TO_WAITING', target: 'ASSIGNING_COURIER' },
            { status: 'ACCEPTED', event: 'HANDED_BACK', target: 'ASSIGNING_COURIER' },
            { status: 'ACCEPTED', event: 'REMOVAL_APPROVED', target: 'ASSIGNING_COURIER' },
            { status: 'DISPATCHED', event: 'REASSIGNED', target: 'ASSIGNING_COURIER' },
            { status: 'DISPATCHED', event: 'RETURNED_TO_WAITING', target: 'ASSIGNING_COURIER' },
            { status: 'DISPATCHED', event: 'HANDED_BACK', target: 'ASSIGNING_COURIER' },
            { status: 'DISPATCHED', event: 'REMOVAL_APPROVED', target: 'ASSIGNING_COURIER' },
            { status: 'COURIER_ARRIVED_AT_PICKUP_LOCATION', event: 'WAIT_UNDISPATCHED', target: 'ASSIGNING_COURIER' },
            { status: 'COURIER_ARRIVED_AT_PICKUP_LOCATION', event: 'REMOVAL_APPROVED', target: 'ASSIGNING_COURIER' },
            { status: 'COURIER_ARRIVED_AT_PICKUP_LOCATION', event: 'REASSIGNED', target: 'ASSIGNING_COURIER' },
            { status: 'COURIER_ARRIVED_AT_PICKUP_LOCATION', event: 'RETURNED_TO_WAITING', target: 'ASSIGNING_COURIER' },
            { status: 'PICKED_UP', event: 'ARRIVED_AT_DROPOFF_LOCATION', target: 'COURIER_ARRIVED_AT_DROPOFF_LOCATION' },
            { status: 'PICKED_UP', event: 'REASSIGNED', target: 'ASSIGNING_COURIER' },
            { status: 'ON_THE_WAY', event: 'REASSIGNED', target: 'ASSIGNING_COURIER' },
            { status: 'COURIER_ARRIVED_AT_DROPOFF_LOCATION', event: 'REASSIGNED', target: 'ASSIGNING_COURIER' },
          ]

          // Verify all declared allowed transitions actually exist on their respective side
          for (const t of ADMIN_ONLY_TRANSITIONS) {
            const adminOn = adminSM[t.status as keyof typeof adminSM].on as Record<string, string>
            expect(adminOn[t.event]).toBe(t.target)
          }
          for (const t of KNOWN_DEFECT_DEFERRED_TRANSITIONS) {
            const adminOn = adminSM[t.status as keyof typeof adminSM].on as Record<string, string>
            expect(adminOn[t.event]).toBe(t.target)
          }
          // Events in the platform only list that adminweb must not offer from any status.
          // Note: ARRIVED_AT_DROPOFF_LOCATION is excluded because adminweb's table has it from ON_THE_WAY (the backend allows it from PICKED_UP and ON_THE_WAY; the admin menu no longer offers it, row 176).
          const PLATFORM_ONLY_EVENTS = Array.from(
            new Set(
              PLATFORM_ONLY_BACKEND_TRANSITIONS.map((t) => t.event).filter(
                (e) => e !== 'ARRIVED_AT_DROPOFF_LOCATION'
              )
            )
          )

          // Assert that none of the events in the platform only list appears anywhere in adminweb's STATE_MACHINE (any status's `on`), naming the status and event if one does.
          const platformEventsInAdmin: { status: string; event: string }[] = []
          for (const [status, node] of Object.entries(adminSM)) {
            for (const event of Object.keys(node.on)) {
              if (PLATFORM_ONLY_EVENTS.includes(event)) {
                platformEventsInAdmin.push({ status, event })
              }
            }
          }
          expect(platformEventsInAdmin).toEqual([])

          for (const t of PLATFORM_ONLY_BACKEND_TRANSITIONS) {
            const backendNode = backendSM[t.status]
            const backendOn = backendNode ? (backendNode.on as Record<string, string>) : {}
            expect(backendOn[t.event]).toBe(t.target)
            const adminNode = (adminSM as Record<string, { on: Record<string, string> } | undefined>)[t.status]
            const adminOn = adminNode ? adminNode.on : {}
            expect(adminOn).not.toHaveProperty(t.event)
          }

          const targetMismatches: {
            status: string
            event: string
            adminTarget: string | undefined
            backendTarget: string | undefined
          }[] = []
          const extraAdminTransitions: { status: string; event: string; target: string }[] = []
          const missingAdminTransitions: { status: string; event: string; target: string }[] = []

          for (const status of backendStatuses) {
            const adminNode = (adminSM as Record<string, { on: Record<string, string> } | undefined>)[status]
            const adminOn = adminNode ? adminNode.on : {}
            const backendNode = backendSM[status]
            const backendOn = backendNode ? (backendNode.on as Record<string, string>) : {}

            for (const [event, adminTarget] of Object.entries(adminOn)) {
              const isAdminOnly = ADMIN_ONLY_TRANSITIONS.some(
                (t) => t.status === status && t.event === event && t.target === adminTarget
              )
              const isKnownDefect = KNOWN_DEFECT_DEFERRED_TRANSITIONS.some(
                (t) => t.status === status && t.event === event && t.target === adminTarget
              )

              if (isAdminOnly || isKnownDefect) {
                if (event in backendOn) {
                  extraAdminTransitions.push({ status, event, target: adminTarget })
                }
                continue
              }

              if (!(event in backendOn)) {
                extraAdminTransitions.push({ status, event, target: adminTarget })
              } else if (backendOn[event] !== adminTarget) {
                targetMismatches.push({
                  status,
                  event,
                  adminTarget,
                  backendTarget: backendOn[event],
                })
              }
            }

            for (const [event, backendTarget] of Object.entries(backendOn)) {
              if (event in adminOn) {
                continue
              }
              const isPlatformOnly = PLATFORM_ONLY_BACKEND_TRANSITIONS.some(
                (t) => t.status === status && t.event === event && t.target === backendTarget
              )
              if (!isPlatformOnly) {
                missingAdminTransitions.push({ status, event, target: backendTarget })
              }
            }
          }

          expect(targetMismatches).toEqual([])
          expect(extraAdminTransitions).toEqual([])
          expect(missingAdminTransitions).toEqual([])
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
          expect(adminFields[fname]?.optional).toBe(backendFields[fname]?.optional)
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
            expect(adminFields[fname]?.optional).toBe(backendFields[fname]?.optional)
          }
        }
      })

      itRow170(
        'types.ts: proves JsonArray interface exists on both sides (has no members)',
        () => {
          const adminTypesPath = path.resolve(__dirname, 'types.ts')
          const backendTypesPath = path.join(backendPaths.backendSharedTypesDir, 'types.ts')
          const adminIfaces = getInterfaceDetails(adminTypesPath)
          const backendIfaces = getInterfaceDetails(backendTypesPath)
          expect(adminIfaces).toHaveProperty('JsonArray')
          expect(backendIfaces).toHaveProperty('JsonArray')
          const adminFields = adminIfaces.JsonArray ?? {}
          const backendFields = backendIfaces.JsonArray ?? {}
          expect(Object.keys(adminFields).sort()).toEqual(Object.keys(backendFields).sort())
          for (const fname of Object.keys(adminFields)) {
            expect(adminFields[fname]?.optional).toBe(backendFields[fname]?.optional)
          }
        }
      )
    })

    // -----------------------------------------------------------------------------------------
    // Guard: runtime exports inventory across all shared-types files (Minor 1)
    // -----------------------------------------------------------------------------------------
    describe('shared-types runtime exports inventory guard (Minor 1)', () => {
      // Set of runtime exports compared by tests in this file.
      // Both COMPARED_EXPORTS and NOT_COMPARED match by bare name for both folders at once
      // (a stated limit, per the ruling).
      const COMPARED_EXPORTS = new Set([
        'EnumRewardStatus',
        'CartValidationErrorCode',
        'EnumDistanceUnit',
        'ConfigKey',
        'EnumCourierCompensationCalculationType',
        'COURIER_DELIVERY_COMPENSATION_TYPE_TO_HUMAN',
        'EnumCourierMatcherType',
        'COURIER_MATCHER_TYPE_TO_HUMAN',
        'EnumCourierDietaryRestrictions',
        'COURIER_DIETARY_RESTRICTIONS_TO_HUMAN',
        'EnumCurrency',
        'CURRENCY_TO_HUMAN',
        'EnumDeliveryDurationCalculationType',
        'DELIVERY_DURATION_CALCULATION_TYPE_TO_HUMAN',
        'EnumDeliveryEventType',
        'EnumEventActor',
        'EnumDeliveryEventSource',
        'EnumDeliveryStatus',
        'ACTIVE_STATUSES',
        'NOT_ACTIVE_STATUSES',
        'EnumDeliveryIssueReason',
        'DELIVERY_ISSUE_REASON_TO_HUMAN',
        'EnumUndeliverableAction',
        'EnumDeliverableAction',
        'EnumCourierStatus',
        'EnumCountryCode',
        'COURIER_STATUS_TO_HUMAN',
        'UNCONFIRMED_TOO_LONG_TIME',
        'UNASSIGNED_TOO_LONG_TIME',
        'UNACCEPTED_TOO_LONG_TIME',
        'EnumOrderAlertType',
        'RED_ALERTS',
        'ALERT_TO_HUMAN',
        'DISTANCE_UNIT_TO_HUMAN',
        'EnumGeoCalculationType',
        'GEO_CALCULATION_TYPE_TO_HUMAN',
        'NotificationEventType',
        'courierNotificationChannel',
        'adminBroadcastNotificationChannel',
        'merchantGroupAdminNotificationChannel',
        'EnumQuoteCalculationType',
        'QUOTE_CALCULATION_TYPE_TO_HUMAN',
        'EnumQuoteToDeliveryConversionServiceType',
        'QUOTE_TO_DELIVERY_CONVERSION_TYPE_TO_HUMAN',
        'EnumRemovalRequestStatus',
        'STATUS_TO_HUMAN',
        'STATE_MACHINE',
        'EnumPaymentStatus',
        'PAYMENT_STATUS_TO_HUMAN',
      ])

      // Exports not compared directly in this test file, each with a one-line reason.
      // Both COMPARED_EXPORTS and NOT_COMPARED match by bare name for both folders at once
      // (a stated limit, per the ruling).
      const NOT_COMPARED: Record<string, string> = {
        // Functions: cart item and modifier validators in cart.ts
        validateItem: 'Cart item validator function; has no unit tests in either repo',
        validateModifierGroup: 'Cart modifier group validator function; has no unit tests in either repo',
        extendErrorMap: 'Cart error map extension function; has no unit tests in either repo',
        canAddGroupToItemModifier: 'Cart modifier hierarchy helper function; has no unit tests in either repo',
        canAddItemModifierToGroup: 'Cart group hierarchy helper function; has no unit tests in either repo',
        CartValidationError: 'Cart validation error class',
        CatalogItemNotFound: 'Catalog item not found error class',

        // Functions: distance converter in distance-unit.ts
        convertToKM: 'Distance conversion helper function converting units to kilometers',

        // Functions: price converters in price.ts
        floatPriceToPennies: 'Price conversion utility function converting float price to integer pennies',
        penniesToFloat: 'Price conversion utility function converting integer pennies to float price',

        // Functions: state machine helper in state-machine.ts
        transitionsForStatus: 'Adminweb state machine lookup helper function returning transitions for a status',

        // Adminweb-only label maps (backend has none; verified to cover all enum members)
        EVENT_ACTOR_TO_HUMAN: 'Adminweb-only label map for EnumEventActor; verified to cover all enum members',
        EVENT_SOURCE_TO_HUMAN: 'Adminweb-only label map for EnumDeliveryEventSource; verified to cover all enum members',
        REMOVAL_REQUEST_STATUS_TO_HUMAN: 'Adminweb-only label map for EnumRemovalRequestStatus; verified to cover all enum members',

        // event-messages.ts: covered word-for-word by row 163 in src/i18n/translations.test.ts
        EVENT_MESSAGE_CODES: 'Event message template codes compared word-for-word by row 163 in translations.test.ts',
        EVENT_PART_CODES: 'Event part template codes compared word-for-word by row 163 in translations.test.ts',

        // Backend-only exports with no adminweb copy in src/shared-types/
        ORDER_ITEM_KINDS: 'Backend-only order item kinds list with no adminweb copy',
        FALLBACK_REASSIGNMENT_PAYOUT_POLICIES: 'Backend-only fallback reassignment payout policies config with no adminweb copy',
        FALLBACK_REASSIGNMENT_PAYOUT_DEFAULT_POLICY: 'Backend-only fallback default policy with no adminweb copy',
        FALLBACK_CANCELLATION_PAYOUT_POLICY: 'Backend-only fallback cancellation policy with no adminweb copy',
        EnumStripeAccountStatus: 'Backend-only Stripe account status enum with no adminweb copy',
        EnumRefundReason: 'Backend-only Stripe refund reason enum with no adminweb copy',
        EnumRefundStatus: 'Backend-only Stripe refund status enum with no adminweb copy',
        POLICY_NAMES_EL: 'Backend-only Greek rider-facing policy names map with no adminweb copy',
        formatCentsEl: 'Backend-only Greek rider-facing cents formatter function with no adminweb copy',
        distanceUnitNameEl: 'Backend-only Greek rider-facing distance unit name function with no adminweb copy',
        RIDER_FACING_SETTINGS_EL: 'Backend-only Greek rider-facing settings map with no adminweb copy',
        riderFacingSettingEl: 'Backend-only Greek rider-facing setting resolver function with no adminweb copy',
        REMOVAL_REASON_KEY: 'Backend-only removal reason key constant with no adminweb copy',
        SHIFT_SLOT_KEY: 'Backend-only shift slot key constant with no adminweb copy',
        isMissing: 'Backend-only rider-facing settings predicate function with no adminweb copy',
        asNumber: 'Backend-only rider-facing settings number parser function with no adminweb copy',
        formatCents: 'Backend-only rider-facing cents formatter function with no adminweb copy',
        distanceUnitName: 'Backend-only rider-facing distance unit name function with no adminweb copy',
        policyName: 'Backend-only rider-facing policy name function with no adminweb copy',
        RIDER_FACING_SETTINGS: 'Backend-only rider-facing settings map with no adminweb copy',
        RIDER_FACING_SETTING_KEYS: 'Backend-only rider-facing setting keys list with no adminweb copy',
      }

      // Backend exports with no copy in src/shared-types but hand copies elsewhere in adminweb, compared
      // in another test file (row 181: NOT_COMPARED used to call the two matching settings uncopied).
      // Each value is that test file, relative to src; a guard below checks it exists and mentions the export
      // by name. A comment naming it is enough to pass, so the guard does not prove the file compares it.
      const COMPARED_ELSEWHERE: Record<string, string> = {
        DELIVERY_ONGOING_STATUSES: 'modules/deliveries/utils/cancellationDisplay.mirrors.test.ts',
        DELIVERY_PICKED_UP_STATUSES: 'modules/deliveries/utils/cancellationDisplay.mirrors.test.ts',
        EnumCancelledBy: 'modules/deliveries/utils/cancellationDisplay.mirrors.test.ts',
        EnumTwoOrderPolicy: 'test-utils/handMirrors.test.ts',
        EnumAddOnMoment: 'test-utils/handMirrors.test.ts',
      }

      // Whether an export is accounted for: compared here, compared elsewhere, or named with a reason.
      const isAccountedFor = (name: string) =>
        COMPARED_EXPORTS.has(name) || Boolean(COMPARED_ELSEWHERE[name]) || Boolean(NOT_COMPARED[name])

      // Expected non-test TypeScript files in shared-types folders
      const KNOWN_ADMINWEB_FILES = new Set([
        'address.ts',
        'cart.ts',
        'catalog.ts',
        'config.ts',
        'courier-compensation-calculation.ts',
        'courier-matching.ts',
        'courier.ts',
        'currency.ts',
        'delivery-duration.ts',
        'delivery-events.ts',
        'delivery-issues.ts',
        'delivery.ts',
        'dispatch.ts',
        'distance-unit.ts',
        'event-messages.ts',
        'geo-calculation.ts',
        'index.ts',
        'notification.ts',
        'price.ts',
        'quote-calculation.ts',
        'quote-to-delivery-conversion.ts',
        'removal-requests.ts',
        'state-machine.ts',
        'stripe.ts',
        'types.ts',
      ])

      const KNOWN_BACKEND_FILES = new Set([
        'address.ts',
        'cart.ts',
        'catalog.ts',
        'config.ts',
        'courier-compensation-calculation.ts',
        'courier-matching.ts',
        'courier.ts',
        'currency.ts',
        'delivery-duration.ts',
        'delivery-events.ts',
        'delivery-issue.ts',
        'delivery.ts',
        'discount.ts',
        'dispatch.ts',
        'distance-unit.ts',
        'event-messages.ts',
        'geo-calculation.ts',
        'geo.ts',
        'index.ts',
        'notification.ts',
        'price.ts',
        'quote-calculation.ts',
        'quote-to-delivery-conversion.ts',
        'rider-facing-settings.el.ts',
        'rider-facing-settings.ts',
        'stacking.ts',
        'stateMachine.ts',
        'stripe.ts',
        'types.ts',
      ])

      itRow170(
        'ensures all non-test files in both shared-types folders are accounted for',
        () => {
          const adminSharedTypesDir = path.resolve(__dirname)
          const adminFiles = fs.readdirSync(adminSharedTypesDir).filter((f) => {
            const p = path.join(adminSharedTypesDir, f)
            return !fs.statSync(p).isDirectory() && f.endsWith('.ts') && !f.endsWith('.test.ts')
          })

          const backendFiles = fs.readdirSync(backendPaths.backendSharedTypesDir).filter((f) => {
            const p = path.join(backendPaths.backendSharedTypesDir, f)
            return (
              !fs.statSync(p).isDirectory() &&
              f.endsWith('.ts') &&
              !f.endsWith('.test.ts') &&
              !f.endsWith('.spec.ts')
            )
          })

          const unexpectedAdminFiles = adminFiles.filter((f) => !KNOWN_ADMINWEB_FILES.has(f))
          expect(unexpectedAdminFiles).toEqual([])

          const unexpectedBackendFiles = backendFiles.filter((f) => !KNOWN_BACKEND_FILES.has(f))
          expect(unexpectedBackendFiles).toEqual([])
        }
      )

      itRow170(
        'ensures every runtime export in adminweb shared-types is compared, compared elsewhere or named in NOT_COMPARED',
        () => {
          const adminSharedTypesDir = path.resolve(__dirname)
          const adminFiles = fs.readdirSync(adminSharedTypesDir).filter((f) => {
            const p = path.join(adminSharedTypesDir, f)
            return !fs.statSync(p).isDirectory() && f.endsWith('.ts') && !f.endsWith('.test.ts')
          })

          const overlap = Object.keys(NOT_COMPARED).filter(
            (k) => COMPARED_EXPORTS.has(k) || Boolean(COMPARED_ELSEWHERE[k])
          )
          expect(overlap).toEqual([])
          const elsewhereOverlap = Object.keys(COMPARED_ELSEWHERE).filter((k) => COMPARED_EXPORTS.has(k))
          expect(elsewhereOverlap).toEqual([])

          const unhandledAdminExports: { file: string; exportName: string }[] = []
          for (const file of adminFiles) {
            const filePath = path.join(adminSharedTypesDir, file)
            const mod = loadBackendSharedFile<Record<string, unknown>>(filePath, prismaEnums)
            for (const exp of Object.keys(mod)) {
              if (!isAccountedFor(exp)) {
                unhandledAdminExports.push({ file, exportName: exp })
              }
            }
          }
          expect(unhandledAdminExports).toEqual([])
        }
      )

      itRow170(
        'ensures every runtime export in backend shared-types is compared, compared elsewhere or named in NOT_COMPARED',
        () => {
          const backendFiles = fs.readdirSync(backendPaths.backendSharedTypesDir).filter((f) => {
            const p = path.join(backendPaths.backendSharedTypesDir, f)
            return (
              !fs.statSync(p).isDirectory() &&
              f.endsWith('.ts') &&
              !f.endsWith('.test.ts') &&
              !f.endsWith('.spec.ts')
            )
          })

          const unhandledBackendExports: { file: string; exportName: string }[] = []
          for (const file of backendFiles) {
            const filePath = path.join(backendPaths.backendSharedTypesDir, file)
            const mod = loadBackendSharedFile<Record<string, unknown>>(filePath, prismaEnums)
            for (const exp of Object.keys(mod)) {
              if (!isAccountedFor(exp)) {
                unhandledBackendExports.push({ file, exportName: exp })
              }
            }
          }
          expect(unhandledBackendExports).toEqual([])
        }
      )

      itRow170('ensures each export compared elsewhere names a test file that exists and mentions it (a mention, not proof of a comparison)', () => {
        const srcDir = path.resolve(__dirname, '..')
        const broken = findBrokenComparedElsewhere(COMPARED_ELSEWHERE, srcDir)
        expect(broken).toEqual([])
      })
    })
  })
})
