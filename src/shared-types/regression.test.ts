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

    const removalRequestBannedAggregations = [
      // Value 5 / spec 0035, AC-22: No counting, summing, ranking, scoring, or aggregation of removal requests per courier or rider
      /(?:courier|rider|perCourier)Removal(s?)(Count|Total|Rate|Score|Rank|Stats)/i,
      /removalRequest(s?)(Count|Total|Rate|Score|Rank|Stats)/i,
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

    it('Value 5 guard: verifies no SDK DTO or frontend module aggregates or groups expired offers or removal requests per courier (AC-22)', () => {
      // Value 5 / AC-12, AC-22 rule: An expired offer or removal request is never held against a rider.
      // No rating, streak, acceptance rate, missed offer count, or removal request count/rank may exist per rider.
      const fs = require('fs')
      const path = require('path')

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

      // Removal request patterns scan every source file under src (spec 0035, AC-22)
      const allSrcFiles = getSourceFiles(path.resolve(__dirname, '..'))
      expect(allSrcFiles.length).toBeGreaterThan(0)
      for (const file of allSrcFiles) {
        const content = fs.readFileSync(file, 'utf-8')
        for (const pattern of removalRequestBannedAggregations) {
          expect(content).not.toMatch(pattern)
        }
      }
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
    })

    it('Value 5 guard: verifies DeliveryIssues renders no count of rider reports (decision 66.11)', () => {
      // Contract (6): nothing shows a count of reports (e.g. no "Rider reports (2)" or similar)
      const fs = require('fs')
      const path = require('path')
      const issuesComponentFile = path.resolve(
        __dirname,
        '../modules/deliveries/components/DeliveryIssues.tsx'
      )
      const content = fs.readFileSync(issuesComponentFile, 'utf-8')
      expect(content).not.toMatch(/Rider reports\s*\(/i)
    })

    it('Value 5 guard: ensures DispatchBoardDto contains no per-rider timing, position age, score, or count fields (spec 0034, AC-10, AC-13)', () => {
      const fs = require('fs')
      const path = require('path')
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
  })
})
