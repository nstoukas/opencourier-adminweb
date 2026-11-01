import { EnumDeliveryEventType } from './delivery-events'
import { STATE_MACHINE } from './state-machine'
import * as deliveriesApiModule from '../api/deliveriesApi'

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

  it('ensures deliveriesApi exports useSubmitDeliveryEventMutation, useAssignDeliveryToCourierMutation, and useGetDeliveryIssuesQuery alongside useReassignDeliveryMutation', () => {
    expect(typeof deliveriesApiModule.useSubmitDeliveryEventMutation).toBe('function')
    expect(typeof deliveriesApiModule.useAssignDeliveryToCourierMutation).toBe('function')
    expect(typeof deliveriesApiModule.useReassignDeliveryMutation).toBe('function')
    expect(typeof deliveriesApiModule.useGetDeliveryIssuesQuery).toBe('function')
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

    it('Value 5 guard: verifies no SDK DTO or frontend module aggregates or groups expired offers per courier', () => {
      // Value 5 / AC-12 rule: An expired offer is never held against a rider.
      // No rating, streak, acceptance rate, or missed offer count may exist per rider.
      const fs = require('fs')
      const path = require('path')

      // Recursively collect all source files (excluding tests) from a directory
      function getSourceFiles(dir: string): string[] {
        if (!fs.existsSync(dir)) return []
        const entries = fs.readdirSync(dir, { withFileTypes: true })
        const results: string[] = []
        for (const entry of entries) {
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

      // Scan SDK models, frontend modules, pages, components, utils, and API endpoints
      const scanDirs = [
        path.resolve(__dirname, '../backend-admin-sdk/src/models'),
        path.resolve(__dirname, '../modules'),
        path.resolve(__dirname, '../pages'),
        path.resolve(__dirname, '../components'),
        path.resolve(__dirname, '../utils'),
        path.resolve(__dirname, '../api'),
      ]

      const sourceFiles = scanDirs.flatMap(getSourceFiles)
      expect(sourceFiles.length).toBeGreaterThan(0)

      const bannedAggregations = [
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
      ]

      for (const file of sourceFiles) {
        const content = fs.readFileSync(file, 'utf-8')
        for (const pattern of bannedAggregations) {
          expect(content).not.toMatch(pattern)
        }
      }
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
  })
})
