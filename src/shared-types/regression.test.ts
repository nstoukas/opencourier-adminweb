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

  it('ensures deliveriesApi exports useSubmitDeliveryEventMutation and useAssignDeliveryToCourierMutation alongside useReassignDeliveryMutation', () => {
    expect(typeof deliveriesApiModule.useSubmitDeliveryEventMutation).toBe('function')
    expect(typeof deliveriesApiModule.useAssignDeliveryToCourierMutation).toBe('function')
    expect(typeof deliveriesApiModule.useReassignDeliveryMutation).toBe('function')
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

      // Scan SDK models, frontend modules, pages, components, and utils
      const scanDirs = [
        path.resolve(__dirname, '../backend-admin-sdk/src/models'),
        path.resolve(__dirname, '../modules'),
        path.resolve(__dirname, '../pages'),
        path.resolve(__dirname, '../components'),
        path.resolve(__dirname, '../utils'),
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
      ]

      for (const file of sourceFiles) {
        const content = fs.readFileSync(file, 'utf-8')
        for (const pattern of bannedAggregations) {
          expect(content).not.toMatch(pattern)
        }
      }
    })
  })
})
