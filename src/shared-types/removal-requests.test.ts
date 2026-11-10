import fs from 'fs'
import path from 'path'
import {
  EnumRemovalRequestStatus,
  REMOVAL_REQUEST_STATUS_TO_HUMAN,
} from './removal-requests'

describe('EnumRemovalRequestStatus and REMOVAL_REQUEST_STATUS_TO_HUMAN (spec 0035, AC-12, decision 24.57)', () => {
  it('REMOVAL_REQUEST_STATUS_TO_HUMAN.CLOSED reads exactly "Closed: the order ended or changed rider before an answer"', () => {
    expect(REMOVAL_REQUEST_STATUS_TO_HUMAN.CLOSED).toBe(
      'Closed: the order ended or changed rider before an answer'
    )
  })

  it('provides exact human labels matching admin requirements for each enum member', () => {
    expect(REMOVAL_REQUEST_STATUS_TO_HUMAN[EnumRemovalRequestStatus.OPEN]).toBe('Waiting for dispatch')
    expect(REMOVAL_REQUEST_STATUS_TO_HUMAN[EnumRemovalRequestStatus.APPROVED]).toBe('Approved')
    expect(REMOVAL_REQUEST_STATUS_TO_HUMAN[EnumRemovalRequestStatus.DECLINED]).toBe('Declined')
    expect(REMOVAL_REQUEST_STATUS_TO_HUMAN[EnumRemovalRequestStatus.WITHDRAWN]).toBe('Withdrawn by the rider')
    expect(REMOVAL_REQUEST_STATUS_TO_HUMAN[EnumRemovalRequestStatus.CLOSED]).toBe(
      'Closed: the order ended or changed rider before an answer'
    )

    // Ensure every member has a non-empty human label string
    for (const status of Object.values(EnumRemovalRequestStatus)) {
      expect(REMOVAL_REQUEST_STATUS_TO_HUMAN[status]).toBeTruthy()
      expect(typeof REMOVAL_REQUEST_STATUS_TO_HUMAN[status]).toBe('string')
    }
  })

  it('verifies the old wording ("the rider came off this order another way") is gone from all non-test source files under src', () => {
    const srcDir = path.resolve(__dirname, '..')

    function getNonTestSourceFiles(dir: string): string[] {
      if (!fs.existsSync(dir)) return []
      const entries = fs.readdirSync(dir, { withFileTypes: true })
      const files: string[] = []
      for (const entry of entries) {
        if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue
        const fullPath = path.join(dir, entry.name)
        if (entry.isDirectory()) {
          files.push(...getNonTestSourceFiles(fullPath))
        } else if (
          (entry.name.endsWith('.ts') ||
            entry.name.endsWith('.tsx') ||
            entry.name.endsWith('.js') ||
            entry.name.endsWith('.jsx')) &&
          !entry.name.includes('.test.') &&
          !entry.name.includes('.spec.')
        ) {
          files.push(fullPath)
        }
      }
      return files
    }

    const allSourceFiles = getNonTestSourceFiles(srcDir)
    expect(allSourceFiles.length).toBeGreaterThan(0)

    // Construct the search string without having the literal phrase in this source code
    const oldSentence = ['the rider came off', 'this order another way'].join(' ')
    const filesHoldingOldWording: string[] = []

    for (const file of allSourceFiles) {
      const content = fs.readFileSync(file, 'utf-8')
      if (content.includes(oldSentence)) {
        filesHoldingOldWording.push(path.relative(srcDir, file))
      }
    }

    expect(filesHoldingOldWording).toEqual([])
  })
})
