import fs from 'fs'
import path from 'path'
import { EnumDeliveryEventType } from './delivery-events'
import { STATE_MACHINE } from './state-machine'
import * as deliveriesApiModule from '../api/deliveriesApi'
import { humanizeEventType } from '../utils/deliveryEventDisplay'

describe('Section H — Safety & Architectural Regression Guards', () => {
  it('ensures EnumDeliveryEventType contains NO REASSIGNED member (§3b guard)', () => {
    // Section 3b safety guard: REASSIGNED must NOT be added to EnumDeliveryEventType or submit-event.
    // Reassignment must go through its dedicated POST /reassign endpoint to ensure courier compensation is created.
    const eventTypes = Object.values(EnumDeliveryEventType) as string[]
    expect(eventTypes.includes('REASSIGNED')).toBe(false)
  })

  it('ensures STATE_MACHINE transition table contains NO REASSIGNED transition key (§3b guard)', () => {
    // Section 3b safety guard: STATE_MACHINE must not have a REASSIGNED transition.
    const allTransitions = Object.values(STATE_MACHINE).flatMap((node) =>
      Object.keys(node.on)
    )
    expect(allTransitions.includes('REASSIGNED')).toBe(false)
  })

  it('ensures deliveriesApi exports useSubmitDeliveryEventMutation, useAssignDeliveryToCourierMutation, useGetDeliveryIssuesQuery, useGetDeliveryProductReportsQuery, useGetProductReportsQuery, useCreateDeliveryProductReportMutation, and useResolveProductReportMutation alongside useReassignDeliveryMutation', () => {
    expect(typeof deliveriesApiModule.useSubmitDeliveryEventMutation).toBe('function')
    expect(typeof deliveriesApiModule.useAssignDeliveryToCourierMutation).toBe('function')
    expect(typeof deliveriesApiModule.useReassignDeliveryMutation).toBe('function')
    expect(typeof deliveriesApiModule.useGetDeliveryIssuesQuery).toBe('function')
    expect(typeof deliveriesApiModule.useGetDeliveryProductReportsQuery).toBe('function')
    expect(typeof deliveriesApiModule.useGetProductReportsQuery).toBe('function')
    expect(typeof deliveriesApiModule.useCreateDeliveryProductReportMutation).toBe('function')
    expect(typeof deliveriesApiModule.useResolveProductReportMutation).toBe('function')
  })

  describe('Offer expiry & Value 5 guards (spec 0002, AC-11, AC-12)', () => {
    it('ensures EnumDeliveryEventType contains OFFERED, OFFER_EXPIRED, and NO_COURIER_AVAILABLE', () => {
      const eventTypes = Object.values(EnumDeliveryEventType) as string[]
      expect(eventTypes).toContain('OFFERED')
      expect(eventTypes).toContain('OFFER_EXPIRED')
      expect(eventTypes).toContain('NO_COURIER_AVAILABLE')
    })

    it('ensures STATE_MACHINE transition table does NOT contain OFFERED, OFFER_EXPIRED, or NO_COURIER_AVAILABLE (decision 61.46)', () => {
      // These are platform-only events; keeping them out of STATE_MACHINE prevents admin event trigger menus from offering them
      const allTransitions = Object.values(STATE_MACHINE).flatMap((node) =>
        Object.keys(node.on)
      )
      expect(allTransitions).not.toContain('OFFERED')
      expect(allTransitions).not.toContain('OFFER_EXPIRED')
      expect(allTransitions).not.toContain('NO_COURIER_AVAILABLE')
    })

    it('ensures EnumDeliveryEventType contains COURIER_PAID_FOR_CANCELLATION, FOOD_RETURNED, and FOOD_NOT_RETURNED (spec 0015)', () => {
      const eventTypes = Object.values(EnumDeliveryEventType) as string[]
      expect(eventTypes).toContain('COURIER_PAID_FOR_CANCELLATION')
      expect(eventTypes).toContain('FOOD_RETURNED')
      expect(eventTypes).toContain('FOOD_NOT_RETURNED')
    })

    it('ensures STATE_MACHINE transition table does NOT contain COURIER_PAID_FOR_CANCELLATION, FOOD_RETURNED, or FOOD_NOT_RETURNED (decision 32.6)', () => {
      // These are platform-only events recorded directly by the backend; keeping them out of STATE_MACHINE prevents admin event trigger menus from offering them
      const allTransitions = Object.values(STATE_MACHINE).flatMap((node) =>
        Object.keys(node.on)
      )
      expect(allTransitions).not.toContain('COURIER_PAID_FOR_CANCELLATION')
      expect(allTransitions).not.toContain('FOOD_RETURNED')
      expect(allTransitions).not.toContain('FOOD_NOT_RETURNED')
    })

    it('ensures EnumDeliveryEventType contains HANDED_BACK (spec 0020, AC-8)', () => {
      const eventTypes = Object.values(EnumDeliveryEventType) as string[]
      expect(eventTypes).toContain('HANDED_BACK')
    })

    it('ensures STATE_MACHINE transition table does NOT contain HANDED_BACK (spec 0020, AC-8)', () => {
      // A hand back is the rider's own step; keeping it out of STATE_MACHINE prevents admin event menus from offering it
      const allTransitions = Object.values(STATE_MACHINE).flatMap((node) =>
        Object.keys(node.on)
      )
      expect(allTransitions).not.toContain('HANDED_BACK')
    })

    it('ensures EnumDeliveryEventType contains DROPOFF_POINT_CORRECTED (row 99, spec 0016)', () => {
      const eventTypes = Object.values(EnumDeliveryEventType) as string[]
      expect(eventTypes).toContain('DROPOFF_POINT_CORRECTED')
      expect(EnumDeliveryEventType.DROPOFF_POINT_CORRECTED).toBe('DROPOFF_POINT_CORRECTED')
    })

    it('ensures STATE_MACHINE does NOT contain DROPOFF_POINT_CORRECTED (row 99, spec 0016)', () => {
      // A pin correction is the rider's own step, recorded by the backend outside the state machine;
      // keeping it out of STATE_MACHINE keeps it out of the admin Change status menu.
      const allTransitions = Object.values(STATE_MACHINE).flatMap((node) =>
        Object.keys(node.on)
      )
      expect(allTransitions).not.toContain('DROPOFF_POINT_CORRECTED')
    })

    it('ensures EnumDeliveryEventType contains READY_DELAYED and FOOD_READY (spec 0023, AC-9)', () => {
      const eventTypes = Object.values(EnumDeliveryEventType) as string[]
      expect(eventTypes).toContain('READY_DELAYED')
      expect(eventTypes).toContain('FOOD_READY')
      expect(EnumDeliveryEventType.READY_DELAYED).toBe('READY_DELAYED')
      expect(EnumDeliveryEventType.FOOD_READY).toBe('FOOD_READY')
    })

    it('ensures STATE_MACHINE does NOT contain READY_DELAYED or FOOD_READY (spec 0023, AC-9)', () => {
      // Ready delayed and food ready are the restaurant's own steps, recorded by the backend outside the state machine;
      // keeping them out of STATE_MACHINE keeps them out of the admin Change status menu.
      const allTransitions = Object.values(STATE_MACHINE).flatMap((node) =>
        Object.keys(node.on)
      )
      expect(allTransitions).not.toContain('READY_DELAYED')
      expect(allTransitions).not.toContain('FOOD_READY')
    })

    it('ensures EnumDeliveryEventType contains PRODUCT_REPORTED and PRODUCT_REPORT_RESOLVED (spec 0032, AC-5, AC-6, AC-9)', () => {
      const eventTypes = Object.values(EnumDeliveryEventType) as string[]
      expect(eventTypes).toContain('PRODUCT_REPORTED')
      expect(eventTypes).toContain('PRODUCT_REPORT_RESOLVED')
      expect(EnumDeliveryEventType.PRODUCT_REPORTED).toBe('PRODUCT_REPORTED')
      expect(EnumDeliveryEventType.PRODUCT_REPORT_RESOLVED).toBe('PRODUCT_REPORT_RESOLVED')
    })

    it('ensures STATE_MACHINE does NOT contain PRODUCT_REPORTED or PRODUCT_REPORT_RESOLVED (spec 0032, AC-5, decision 15.1)', () => {
      // Product reported and resolved events are recorded by the backend outside the state machine (decision 15.1);
      // keeping them out of STATE_MACHINE keeps them out of the admin Change status menu.
      const allTransitions = Object.values(STATE_MACHINE).flatMap((node) =>
        Object.keys(node.on)
      )
      expect(allTransitions).not.toContain('PRODUCT_REPORTED')
      expect(allTransitions).not.toContain('PRODUCT_REPORT_RESOLVED')
    })

    it('ensures EnumDeliveryEventType contains WAIT_UNDISPATCHED and COURIER_PAID_FOR_WAIT (spec 0033, AC-3, AC-6)', () => {
      const eventTypes = Object.values(EnumDeliveryEventType) as string[]
      expect(eventTypes).toContain('WAIT_UNDISPATCHED')
      expect(eventTypes).toContain('COURIER_PAID_FOR_WAIT')
      expect(EnumDeliveryEventType.WAIT_UNDISPATCHED).toBe('WAIT_UNDISPATCHED')
      expect(EnumDeliveryEventType.COURIER_PAID_FOR_WAIT).toBe('COURIER_PAID_FOR_WAIT')
    })

    it('ensures STATE_MACHINE does NOT contain WAIT_UNDISPATCHED or COURIER_PAID_FOR_WAIT (spec 0033, AC-3, AC-6)', () => {
      // WAIT_UNDISPATCHED is recorded outside processDeliveryEvent by a rider leaving; COURIER_PAID_FOR_WAIT is a platform event;
      // keeping them out of STATE_MACHINE keeps them out of the admin Change status menu.
      const allTransitions = Object.values(STATE_MACHINE).flatMap((node) =>
        Object.keys(node.on)
      )
      expect(allTransitions).not.toContain('WAIT_UNDISPATCHED')
      expect(allTransitions).not.toContain('COURIER_PAID_FOR_WAIT')
    })

    const removalEvents = [
      EnumDeliveryEventType.REMOVAL_REQUESTED,
      EnumDeliveryEventType.REMOVAL_WITHDRAWN,
      EnumDeliveryEventType.REMOVAL_DECLINED,
      EnumDeliveryEventType.REMOVAL_APPROVED,
      EnumDeliveryEventType.COURIER_PAID_FOR_REMOVAL,
      EnumDeliveryEventType.PARTNER_CHARGED_FOR_REMOVAL,
      EnumDeliveryEventType.COURIER_PAID_FOR_RETURN_TRIP,
    ]

    it('ensures EnumDeliveryEventType contains all seven removal request events (spec 0035, AC-21)', () => {
      const eventTypes = Object.values(EnumDeliveryEventType) as string[]
      expect(eventTypes).toContain('REMOVAL_REQUESTED')
      expect(eventTypes).toContain('REMOVAL_WITHDRAWN')
      expect(eventTypes).toContain('REMOVAL_DECLINED')
      expect(eventTypes).toContain('REMOVAL_APPROVED')
      expect(eventTypes).toContain('COURIER_PAID_FOR_REMOVAL')
      expect(eventTypes).toContain('PARTNER_CHARGED_FOR_REMOVAL')
      expect(eventTypes).toContain('COURIER_PAID_FOR_RETURN_TRIP')
      expect(EnumDeliveryEventType.REMOVAL_REQUESTED).toBe('REMOVAL_REQUESTED')
      expect(EnumDeliveryEventType.REMOVAL_WITHDRAWN).toBe('REMOVAL_WITHDRAWN')
      expect(EnumDeliveryEventType.REMOVAL_DECLINED).toBe('REMOVAL_DECLINED')
      expect(EnumDeliveryEventType.REMOVAL_APPROVED).toBe('REMOVAL_APPROVED')
      expect(EnumDeliveryEventType.COURIER_PAID_FOR_REMOVAL).toBe('COURIER_PAID_FOR_REMOVAL')
      expect(EnumDeliveryEventType.PARTNER_CHARGED_FOR_REMOVAL).toBe('PARTNER_CHARGED_FOR_REMOVAL')
      expect(EnumDeliveryEventType.COURIER_PAID_FOR_RETURN_TRIP).toBe('COURIER_PAID_FOR_RETURN_TRIP')
    })

    it('ensures humanizeEventType names each of the seven removal events in words exactly (spec 0035, AC-21)', () => {
      expect(humanizeEventType(EnumDeliveryEventType.REMOVAL_REQUESTED)).toBe('Removal requested')
      expect(humanizeEventType(EnumDeliveryEventType.REMOVAL_WITHDRAWN)).toBe('Removal withdrawn')
      expect(humanizeEventType(EnumDeliveryEventType.REMOVAL_DECLINED)).toBe('Removal declined')
      expect(humanizeEventType(EnumDeliveryEventType.REMOVAL_APPROVED)).toBe('Removal approved')
      expect(humanizeEventType(EnumDeliveryEventType.COURIER_PAID_FOR_REMOVAL)).toBe('Courier paid for removal')
      expect(humanizeEventType(EnumDeliveryEventType.PARTNER_CHARGED_FOR_REMOVAL)).toBe('Partner charged for removal')
      expect(humanizeEventType(EnumDeliveryEventType.COURIER_PAID_FOR_RETURN_TRIP)).toBe('Courier paid for return trip')
    })

    it('ensures STATE_MACHINE transition table does NOT contain any of the seven removal events (spec 0035, AC-21)', () => {
      // The seven removal request events are recorded directly by the backend outside the state machine;
      // keeping them out of STATE_MACHINE prevents admin event trigger menus from offering them.
      const allTransitions = Object.values(STATE_MACHINE).flatMap((node) =>
        Object.keys(node.on)
      )
      for (const event of removalEvents) {
        expect(allTransitions).not.toContain(event)
      }
    })

    const olderBannedAggregations = [
      /missedOffer/i,
      /missed_offers?\b/i,
      /missed\s+offers\b/i,
      /expiredOffer(s?)(Count|Total|Rate|Score)/i,
      /courierOffer(s?)(Score|Rate|Rank)/i,
      /acceptanceRate/i,
      /expiredCount/i,
      // Grouping or counting of events or offers by courierId / courier (e.g. groupBy or reduce keyed by courierId)
      /(?:groupBy|reduce)\b[\s\S]{0,250}\b(?:courierId|courier)\b/i,
      /\b(?:courierId|courier)\b[\s\S]{0,250}\b(?:groupBy|reduce)\b/i,
      // Value 5 / decision 66.11: No counting, scoring, or aggregation of rider issue reports per courier
      /(?:courier|rider)Issue(s?)(Count|Total|Rate|Score)/i,
      /(?:courier|rider)Report(s?)(Count|Total|Rate|Score)/i,
      // Value 5 / spec 0020, AC-8: No counting, scoring, or aggregation of hand backs or automatic accepts per rider
      /(?:handedBack|handBack|autoAccept)(s?)(Count|Total|Rate|Score)/i,
    ]

    const narrowRemovalPatterns = [
      // Value 5 / spec 0035, AC-22: No counting, summing, ranking, scoring, or aggregation of removal requests per courier or rider
      /(?:courier|rider|perCourier)Removal(s?)(Count|Total|Rate|Score|Rank|Stats)/i,
      /removalRequest(s?)(Count|Total|Rate|Score|Rank|Stats)/i,
    ]

    const broadRemovalPatterns = [
      /(?:groupBy|reduce)\b[\s\S]{0,250}\b(?:removalRequests?|removals?|RemovalRequestAdminDto)\b/i,
      /(?:removalRequests?|removals?|RemovalRequestAdminDto)\b[\s\S]{0,250}\b(?:groupBy|reduce)\b/i,
      /\b(?:count|total|sum|rank)\b[\s\S]{0,100}\b(?:removalRequests?|removals?|RemovalRequestAdminDto)\b[\s\S]{0,100}\b(?:courier|rider)\b/i,
      /\b(?:courier|rider)\b[\s\S]{0,100}\b(?:removalRequests?|removals?|RemovalRequestAdminDto)\b[\s\S]{0,100}\b(?:count|total|sum|rank)\b/i,
      /\b(?:removalRequests?|removals?|RemovalRequestAdminDto)\b[\s\S]{0,100}\b(?:courier|rider)\b[\s\S]{0,100}\b(?:count|total|sum|rank)\b/i,
      /\b(?:removalRequests?|removals?|RemovalRequestAdminDto)\b[\s\S]{0,100}\b(?:count|total|sum|rank)\b[\s\S]{0,100}\b(?:courier|rider)\b/i,
      /(?:removalRequests?|removals?|RemovalRequestAdminDto)\b[\s\S]{0,300}?\bfilter\b[\s\S]{0,150}?\b(?:courierId|courier|rider)\b[\s\S]{0,150}?\blength\b/i,
      /\bfilter\b[\s\S]{0,150}?\b(?:courierId|courier|rider)\b[\s\S]{0,150}?\blength\b[\s\S]{0,300}?(?:removalRequests?|removals?|RemovalRequestAdminDto)\b/i,
      /(?:courierId|courier|rider)\b[\s\S]{0,150}?\bfilter\b[\s\S]{0,150}?(?:removalRequests?|removals?|RemovalRequestAdminDto)\b[\s\S]{0,150}?\blength\b/i,
      /(?:removalRequests?|removals?|RemovalRequestAdminDto)\b[\s\S]{0,250}?\bperCourier\b/i,
      /\bperCourier\b[\s\S]{0,250}?(?:removalRequests?|removals?|RemovalRequestAdminDto)\b/i,
      /(?:removalRequests?|removals?|RemovalRequestAdminDto)\b[\s\S]{0,350}?(?:courierId|courier|rider)[\s\S]{0,350}?(?:\.set\s*\(|\+\s*1|\+\+)/i,
      /(?:courierId|courier|rider)[\s\S]{0,350}?(?:removalRequests?|removals?|RemovalRequestAdminDto)\b[\s\S]{0,350}?(?:\.set\s*\(|\+\s*1|\+\+)/i,
      /(?:removalRequests?|removals?|RemovalRequestAdminDto)\b[\s\S]{0,350}?(?:\.set\s*\([^)]*(?:courierId|courier|rider))/i,
      /(?:\.set\s*\([^)]*(?:courierId|courier|rider))[\s\S]{0,350}?(?:removalRequests?|removals?|RemovalRequestAdminDto)\b/i,
      /(?:removalRequests?|removals?|RemovalRequestAdminDto)\b[\s\S]{0,350}?(?:new\s+Map|Map<string,\s*number>)/i,
      /(?:new\s+Map|Map<string,\s*number>)[\s\S]{0,350}?(?:removalRequests?|removals?|RemovalRequestAdminDto)\b/i,
    ]

    const removalRequestBannedAggregations = [
      ...narrowRemovalPatterns,
      ...broadRemovalPatterns,
    ]

    // Pure selection and pattern-checking function (decision 24.55).
    // Narrow name patterns always scan all files; broad patterns run only on files about removal requests.
    const isFileAboutRemovalRequests = (filePath: string, content: string): boolean => {
      const srcDir = path.resolve(__dirname, '..')
      const relPath = path.isAbsolute(filePath) ? path.relative(srcDir, filePath) : filePath
      return (
        /removal/i.test(relPath) ||
        /(?:from\s*|require\s*\(\s*|import\s*\(\s*)['"][^'"]*removalRequestApi['"]\)?/.test(content) ||
        /(?:from\s*|require\s*\(\s*|import\s*\(\s*)['"][^'"]*shared-types\/removal-requests['"]\)?/.test(content) ||
        /\bRemovalRequestAdminDto\b/.test(content)
      )
    }

    const checkRemovalBannedAggregations = (filePath: string, content: string): RegExp[] => {
      const firing: RegExp[] = []
      for (const pattern of narrowRemovalPatterns) {
        if (pattern.test(content)) {
          firing.push(pattern)
        }
      }
      if (isFileAboutRemovalRequests(filePath, content)) {
        for (const pattern of broadRemovalPatterns) {
          if (pattern.test(content)) {
            firing.push(pattern)
          }
        }
      }
      return firing
    }

    it('Value 5 guard: verifies no SDK DTO or frontend module aggregates or groups expired offers or removal requests per courier (AC-22)', () => {
      // Value 5 / AC-12, AC-22 rule: An expired offer or removal request is never held against a rider.
      // No rating, streak, acceptance rate, missed offer count, or removal request count/rank may exist per rider.
      // Recursively collect all source files (excluding tests) from a directory
      function getSourceFiles(dir: string): string[] {
        if (!fs.existsSync(dir)) return []
        const entries = fs.readdirSync(dir, { withFileTypes: true })
        const results: string[] = []
        for (const entry of entries) {
          if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue
          const fullPath = path.join(dir, entry.name)
          if (entry.isDirectory()) {
            results.push(...getSourceFiles(fullPath))
          } else if (
            (entry.name.endsWith('.ts') ||
              entry.name.endsWith('.tsx') ||
              entry.name.endsWith('.js') ||
              entry.name.endsWith('.jsx')) &&
            !entry.name.includes('.test.') &&
            !entry.name.includes('.spec.')
          ) {
            results.push(fullPath)
          }
        }
        return results
      }

      // Scan SDK models, frontend modules, pages, components, utils, and API endpoints for older patterns
      const olderScanDirs = [
        path.resolve(__dirname, '../backend-admin-sdk/src/models'),
        path.resolve(__dirname, '../backend-admin-sdk/src/apis'),
        path.resolve(__dirname, '../modules'),
        path.resolve(__dirname, '../pages'),
        path.resolve(__dirname, '../components'),
        path.resolve(__dirname, '../utils'),
        path.resolve(__dirname, '../api'),
      ]

      const olderFiles = olderScanDirs.flatMap(getSourceFiles)
      expect(olderFiles.length).toBeGreaterThan(0)
      for (const file of olderFiles) {
        const content = fs.readFileSync(file, 'utf-8')
        for (const pattern of olderBannedAggregations) {
          expect(content).not.toMatch(pattern)
        }
      }

      // Removal request patterns scan every source file under src (spec 0035, AC-22, decision 24.55)
      const srcDir = path.resolve(__dirname, '..')
      const allSrcFiles = getSourceFiles(srcDir)
      expect(allSrcFiles.length).toBeGreaterThan(0)
      const violations: string[] = []
      for (const file of allSrcFiles) {
        const content = fs.readFileSync(file, 'utf-8')
        const relativePath = path.relative(srcDir, file)
        const firing = checkRemovalBannedAggregations(relativePath, content)
        for (const pattern of firing) {
          violations.push(`${relativePath}: ${pattern}`)
        }
      }
      expect(violations).toEqual([])
    })

    it('Value 5 guard: proves file selection and pattern behaviour on samples (decision 24.55)', () => {
      // 1. A real per rider count of removal requests in a file about removals fails (fires)
      const realPerRiderCount = `
        export const getRemovalStats = (removalRequests: { courierId: string }[]) => {
          return removalRequests.filter((r) => r.courierId === 'c-1').length
        }
      `
      const expectedFilterPattern =
        /(?:removalRequests?|removals?|RemovalRequestAdminDto)\b[\s\S]{0,300}?\bfilter\b[\s\S]{0,150}?\b(?:courierId|courier|rider)\b[\s\S]{0,150}?\blength\b/i

      // (a) File path contains "removal" (case blind)
      expect(
        checkRemovalBannedAggregations('modules/deliveries/components/DeliveryRemovalRequests.tsx', realPerRiderCount)
      ).toEqual([expectedFilterPattern])

      // (b) File path says nothing about removals, but imports from removalRequestApi
      const withApiImport = `
        import { useGetDeliveryRemovalRequestsQuery } from '@/api/removalRequestApi'
        export const getRemovalStats = (removalRequests: { courierId: string }[]) => {
          return removalRequests.filter((r) => r.courierId === 'c-1').length
        }
      `
      expect(
        checkRemovalBannedAggregations('modules/dispatch/attention.ts', withApiImport)
      ).toEqual([expectedFilterPattern])

      // (c) File path says nothing about removals, but imports from shared-types/removal-requests
      const withSharedTypesImport = `
        import { REMOVAL_REQUEST_STATUS_TO_HUMAN } from '@/shared-types/removal-requests'
        export const getRemovalStats = (removalRequests: { courierId: string }[]) => {
          return removalRequests.filter((r) => r.courierId === 'c-1').length
        }
      `
      expect(
        checkRemovalBannedAggregations('modules/dispatch/attention.ts', withSharedTypesImport)
      ).toEqual([expectedFilterPattern])

      // (d) File path says nothing about removals, but names RemovalRequestAdminDto
      const withDtoName = `
        export const getRemovalStats = (requests: RemovalRequestAdminDto[]) => {
          return requests.filter((r) => r.courierId === 'c-1').length
        }
      `
      expect(
        checkRemovalBannedAggregations('modules/dispatch/attention.ts', withDtoName)
      ).toEqual([expectedFilterPattern])

      // 2. Each of the seven innocent samples is shown to be evidence (decision 24.55):
      // In a file not about removals nothing fires (toEqual([]), as now).
      // The same source text with a path about removals (e.g. 'modules/dispatch/RemovalThing.ts')
      // fires at least one broad pattern.
      const innocentSamples = [
        {
          name: 'innocent1 (comment naming removal requests followed by new Map)',
          code: `
            // Removal requests: show each rider's name
            const courierMap = new Map(couriers.map((c) => [c.id, c.name]))
          `,
        },
        {
          name: 'innocent2 (comment naming removal request and rider followed by page + 1)',
          code: `
            // After removal request from rider, load next page
            const nextPage = page + 1
          `,
        },
        {
          name: 'innocent3 (comment naming removal request followed by params.set)',
          code: `
            // Filter by rider after removal request
            params.set('tab', 'jobs')
          `,
        },
        {
          name: 'innocent4 (comment mentioning removal and rider followed by const total = ...)',
          code: `
            // What the removal paid the rider
            const total = payAmount + waitPay
          `,
        },
        {
          name: 'innocent5 (heading/comment with courierName followed by a plain for loop with i++)',
          code: `
            // Removal requests for courierName
            for (let i = 0; i < items.length; i++) {
              processItem(items[i])
            }
          `,
        },
        {
          name: 'innocent6 (per delivery requests.filter with rider in comment and open.length === 0)',
          code: `
            // Removal requests of this delivery
            const open = requests.filter((r) => r.open)
            // Check if rider has any open requests on this delivery
            if (open.length === 0) return null
          `,
        },
        {
          name: 'innocent7 (reasons.reduce joining removal reason labels for a tooltip)',
          code: `
            // Reasons reduce joining removal reason labels for a tooltip
            const labels = reasons.reduce((acc, r) => (acc ? acc + ', ' + r.label : r.label), '')
          `,
        },
      ]

      // Assert both halves for all seven innocent samples:
      // Half 1: in a file not about removals nothing fires (selection keeps the guard quiet)
      const unselectedViolations = innocentSamples.flatMap((sample) =>
        checkRemovalBannedAggregations('modules/dispatch/attention.ts', sample.code).map((p) => ({
          sample: sample.name,
          firedPattern: p.toString(),
        }))
      )
      expect(unselectedViolations).toEqual([])

      // Half 2: with a path about removals, at least one broad pattern fires (showing sample is real evidence)
      const unselectedOnRemovalPath = innocentSamples
        .filter((sample) => checkRemovalBannedAggregations('modules/dispatch/RemovalThing.ts', sample.code).length === 0)
        .map((sample) => sample.name)
      expect(unselectedOnRemovalPath).toEqual([])

      // Per-sample assertions with sample name in received value
      for (const sample of innocentSamples) {
        expect({
          sample: sample.name,
          unselectedFired: checkRemovalBannedAggregations('modules/dispatch/attention.ts', sample.code),
        }).toEqual({
          sample: sample.name,
          unselectedFired: [],
        })

        const selectedFired = checkRemovalBannedAggregations('modules/dispatch/RemovalThing.ts', sample.code)
        expect({
          sample: sample.name,
          firesWhenSelected: selectedFired.length > 0,
        }).toEqual({
          sample: sample.name,
          firesWhenSelected: true,
        })
      }

      // 3. Narrow name patterns fire even in a file not about removals
      const narrowName1 = 'export const removalRequestCount = 42'
      expect(
        checkRemovalBannedAggregations('modules/dispatch/attention.ts', narrowName1)
      ).toEqual([/removalRequest(s?)(Count|Total|Rate|Score|Rank|Stats)/i])

      const narrowName2 = 'export const riderRemovalRank = 1'
      expect(
        checkRemovalBannedAggregations('modules/dispatch/attention.ts', narrowName2)
      ).toEqual([/(?:courier|rider|perCourier)Removal(s?)(Count|Total|Rate|Score|Rank|Stats)/i])
    })

    it('Value 5 guard: proves that planted counts, groupings, or filters of removal requests per courier trigger the guard (AC-22)', () => {
      // Sample A (filter by courierId with length, count naming)
      const sampleA =
        'export const removalRequestCount = (rows: { courierId: string }[], id: string) => rows.filter((r) => r.courierId === id).length'
      // Sample B (ranking naming)
      const sampleB = 'export const riderRemovalRank = (n: number) => n + 1'
      // Sample C (building a Map per courier and incrementing count)
      const sampleC = `
        export const perCourierStats = (removalRequests: { courierId: string }[]) => {
          const perCourier = new Map<string, number>()
          for (const request of removalRequests) {
            perCourier.set(request.courierId, (perCourier.get(request.courierId) ?? 0) + 1)
          }
          return perCourier
        }
      `
      // Sample D (RemovalRequestAdminDto filtered by courierId with length)
      const sampleD = `
        import type { RemovalRequestAdminDto } from '@/backend-admin-sdk'
        export const courierAsksShown = (requests: RemovalRequestAdminDto[], courierId: string) =>
          requests.filter((r) => r.courierId === courierId).length
      `

      // Prove that older patterns alone do NOT match samples A, C, D (proving new patterns are necessary)
      expect(olderBannedAggregations.some((p) => p.test(sampleA))).toBe(false)
      expect(olderBannedAggregations.some((p) => p.test(sampleC))).toBe(false)
      expect(olderBannedAggregations.some((p) => p.test(sampleD))).toBe(false)

      // Prove that removal request patterns catch all four samples
      expect(removalRequestBannedAggregations.some((p) => p.test(sampleA))).toBe(true)
      expect(removalRequestBannedAggregations.some((p) => p.test(sampleB))).toBe(true)
      expect(removalRequestBannedAggregations.some((p) => p.test(sampleC))).toBe(true)
      expect(removalRequestBannedAggregations.some((p) => p.test(sampleD))).toBe(true)

      // And prove that the selection logic catches all four samples
      expect(checkRemovalBannedAggregations('src/any/file.ts', sampleA).length).toBeGreaterThan(0)
      expect(checkRemovalBannedAggregations('src/any/file.ts', sampleB).length).toBeGreaterThan(0)
      expect(checkRemovalBannedAggregations('src/modules/removal/requests.ts', sampleC).length).toBeGreaterThan(0)
      expect(checkRemovalBannedAggregations('src/any/file.ts', sampleD).length).toBeGreaterThan(0)
    })

    it('Value 5 guard: verifies DeliveryIssues renders no count of rider reports (decision 66.11)', () => {
      // Contract (6): nothing shows a count of reports (e.g. no "Rider reports (2)" or similar)
      const issuesComponentFile = path.resolve(
        __dirname,
        '../modules/deliveries/components/DeliveryIssues.tsx'
      )
      const content = fs.readFileSync(issuesComponentFile, 'utf-8')
      expect(content).not.toMatch(/Rider reports\s*\(/i)
    })

    it('Value 5 guard: ensures DispatchBoardDto contains no per-rider timing, position age, score, or count fields (spec 0034, AC-10, AC-13)', () => {
      const boardApiFile = path.resolve(
        __dirname,
        '../backend-admin-sdk/src/apis/DispatchBoardApi.ts'
      )
      const content = fs.readFileSync(boardApiFile, 'utf-8')
      const bannedPerRiderPatterns = [
        /(?:rider|courier).*(?:duration|timing|minutes|seconds|speed|delay|score|rank|rating|history|trail)/i,
        /currentLocationAt/i,
        /positionAge/i,
      ]
      for (const pattern of bannedPerRiderPatterns) {
        expect(content).not.toMatch(pattern)
      }
    })

    it('Value 5 guard: ensures readByDispatch does not appear anywhere in adminweb (spec 0034, AC-6, AC-20)', () => {
      // AC-6: The server stores no record of when a rider or restaurant read a message.
      // readByDispatch appears only on COURIER and PARTNER messages on the courier/partner APIs,
      // and must never appear in adminweb at all.
      function getAllSourceFiles(dir: string): string[] {
        if (!fs.existsSync(dir)) return []
        const entries = fs.readdirSync(dir, { withFileTypes: true })
        const results: string[] = []
        for (const entry of entries) {
          if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue
          const fullPath = path.join(dir, entry.name)
          if (entry.isDirectory()) {
            results.push(...getAllSourceFiles(fullPath))
          } else if (
            (entry.name.endsWith('.ts') ||
              entry.name.endsWith('.tsx') ||
              entry.name.endsWith('.js') ||
              entry.name.endsWith('.jsx')) &&
            !entry.name.includes('.test.') &&
            !entry.name.includes('.spec.')
          ) {
            results.push(fullPath)
          }
        }
        return results
      }

      const srcDir = path.resolve(__dirname, '..')
      const allFiles = getAllSourceFiles(srcDir)
      expect(allFiles.length).toBeGreaterThan(0)

      for (const file of allFiles) {
        const content = fs.readFileSync(file, 'utf-8')
        expect(content).not.toMatch(/\breadByDispatch\b/)
      }
    })

    it('Value 5 guard: ensures chat files contain no count, timing or ranking of one person messages and no field about rider or restaurant reading (spec 0034, AC-6, AC-20)', () => {
      // Contract & AC-20: Nothing counts, times or ranks messages per person; no screen shows answer times.
      // No field about a rider or restaurant reading may exist in the SDK DTOs, API, or chat modules.
      const chatDir = path.resolve(__dirname, '../modules/chat')
      const chatFiles = [
        path.resolve(__dirname, '../api/chatApi.ts'),
        path.resolve(__dirname, '../backend-admin-sdk/src/apis/ChatApi.ts'),
      ]

      if (fs.existsSync(chatDir)) {
        const entries = fs.readdirSync(chatDir)
        for (const entry of entries) {
          if (
            (entry.endsWith('.ts') || entry.endsWith('.tsx')) &&
            !entry.includes('.test.') &&
            !entry.includes('.spec.')
          ) {
            chatFiles.push(path.join(chatDir, entry))
          }
        }
      }

      expect(chatFiles.length).toBeGreaterThanOrEqual(10)

      const bannedChatPatterns = [
        /\breadByDispatch\b/i,
        /\b(?:readBy|lastReadAt)(?:Courier|Partner|Rider|Restaurant)\b/i,
        /\b(?:courier|partner|rider|restaurant)(?:ReadAt|LastReadAt)\b/i,
        /\b(?:courier|rider|partner|person|user)Message(?:s)?(?:Count|Total|Rate|Score|Rank|Stats)\b/i,
        /(?:responseTime|answerTime|replyTime|timeToAnswer|firstResponseTime|messageTiming)/i,
        /(?:message|messages)Ranking/i,
        /(?:rider|courier|partner).*(?:answerTime|responseTime)/i,
      ]

      for (const file of chatFiles) {
        const content = fs.readFileSync(file, 'utf-8')
        for (const pattern of bannedChatPatterns) {
          expect(content).not.toMatch(pattern)
        }
      }
    })

    it('Value 5 guard: proves chat patterns catch planted per-person counts, response times, and rider read fields', () => {
      const bannedChatPatterns = [
        /\breadByDispatch\b/i,
        /\b(?:readBy|lastReadAt)(?:Courier|Partner|Rider|Restaurant)\b/i,
        /\b(?:courier|partner|rider|restaurant)(?:ReadAt|LastReadAt)\b/i,
        /\b(?:courier|rider|partner|person|user)Message(?:s)?(?:Count|Total|Rate|Score|Rank|Stats)\b/i,
        /(?:responseTime|answerTime|replyTime|timeToAnswer|firstResponseTime|messageTiming)/i,
        /(?:message|messages)Ranking/i,
        /(?:rider|courier|partner).*(?:answerTime|responseTime)/i,
      ]

      const plantedViolations = [
        'export const courierMessageCount = 15',
        'export const riderMessageStats = { count: 10 }',
        'export const responseTime = 45',
        'export const averageAnswerTime = 120',
        'export const riderReadAt = "2026-11-17T14:00:00Z"',
        'export const readByCourier = true',
        'export const courierLastReadAt = "2026-11-17T14:00:00Z"',
        'export const messageRanking = ["c-1", "c-2"]',
        'export interface ChatMessage { readByDispatch: boolean }',
      ]

      for (const sample of plantedViolations) {
        const fires = bannedChatPatterns.some((pattern) => pattern.test(sample))
        expect(fires).toBe(true)
      }
    })
  })
})
