// Test that all backend settings input properties are covered by the SDK serializer and frontend page.
import fs from 'fs'
import path from 'path'
import { InstanceConfigSettingsAdminInputToJSON } from './InstanceConfigSettingsAdminInput'

describe('InstanceConfigSettings general coverage guard', () => {
  // Use Node path and fs utilities to locate and read the backend input class definition
  const backendFilePath = path.resolve(
    __dirname,
    '../../../../../opencourier-backend/src/rest-api/config/admin/queries/instance-config-settings.input.ts'
  )

  if (!fs.existsSync(backendFilePath)) {
    throw new Error(
      `Backend input file not found at ${backendFilePath}. This test expects the backend repository to be checked out beside adminweb.`
    )
  }

  const fileContent = fs.readFileSync(backendFilePath, 'utf-8')
  const classMatch = fileContent.match(/export class InstanceConfigSettingsInput \{([^}]+)\}/)
  const classBody = classMatch ? classMatch[1] ?? '' : ''
  const settingKeys = (classBody.match(/^\s+(\w+)\??\s*:/gm) || []).map((line) =>
    line.trim().replace(/\??\s*:.*/, '')
  )

  it('found at least 15 setting keys in backend input class', () => {
    expect(settingKeys.length).toBeGreaterThanOrEqual(15)
  })

  // Test each setting key from the backend input class to ensure it survives SDK serialization
  it.each(settingKeys)('ensures SDK input serializer handles %s', (key) => {
    const sentinelValue = 'sentinel-value'
    const serialized = InstanceConfigSettingsAdminInputToJSON({ [key]: sentinelValue } as any)
    expect(serialized[key]).toEqual(sentinelValue)
  })

  // Read the adminweb instance configuration page source text from disk
  const pageFilePath = path.resolve(__dirname, '../../../pages/instance-configuration/index.tsx')
  const pageSourceText = fs.readFileSync(pageFilePath, 'utf-8')

  // Check that the instance configuration page source code mentions each setting key
  it.each(settingKeys)('ensures page source mentions %s', (key) => {
    // Note: this is a weak check proving the page mentions the key as a whole word, not that an input is rendered.
    const regex = new RegExp(`\\b${key}\\b`)
    expect(pageSourceText).toMatch(regex)
  })
})
