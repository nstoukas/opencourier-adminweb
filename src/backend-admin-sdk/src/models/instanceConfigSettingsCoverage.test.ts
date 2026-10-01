// Coverage guard ensuring backend settings input properties are covered by the SDK serializer and frontend admin page.
import fs from 'fs'
import path from 'path'
import { InstanceConfigSettingsAdminInputToJSON } from './InstanceConfigSettingsAdminInput'

// Locate the backend input class definition
const backendFilePath = path.resolve(
  __dirname,
  '../../../../../opencourier-backend/src/rest-api/config/admin/queries/instance-config-settings.input.ts'
)

const backendExists = fs.existsSync(backendFilePath)

if (!backendExists) {
  // When backend repo checkout is absent, emit a loud warning and skip suite without failing CI
  console.warn(
    '\n=================================================================================\n' +
      `WARNING: Backend input file not found at ${backendFilePath}.\n` +
      'Skipping InstanceConfigSettings coverage guard suite because backend repo is absent.\n' +
      '=================================================================================\n'
  )
}

const describeSuite = backendExists ? describe : describe.skip

/**
 * Scans comment-stripped page source text for opening tags of input-like elements:
 * <Input ...>, <select ...>, <textarea ...>, <QuoteRateEditor ...>, <ReassignmentPayoutPolicyEditor ...>.
 * Correctly handles JSX attribute expressions {...} and nested quotes so tags spanning
 * multiple lines or containing arrow functions (=>) are fully captured.
 */
function extractInputTags(sourceText: string): string[] {
  const inputTagRegex = /<(Input|select|textarea|QuoteRateEditor|ReassignmentPayoutPolicyEditor)\b/g
  const tags: string[] = []
  let match: RegExpExecArray | null

  while ((match = inputTagRegex.exec(sourceText)) !== null) {
    const startPos = match.index
    let currentPos = startPos + match[0].length
    let braceDepth = 0
    let inString: string | null = null

    while (currentPos < sourceText.length) {
      const char = sourceText[currentPos]
      if (inString) {
        if (char === inString && sourceText[currentPos - 1] !== '\\') {
          inString = null
        }
      } else {
        if (char === '"' || char === "'" || char === '`') {
          inString = char
        } else if (char === '{') {
          braceDepth++
        } else if (char === '}') {
          if (braceDepth > 0) braceDepth--
        } else if (char === '>' && braceDepth === 0) {
          tags.push(sourceText.slice(startPos, currentPos + 1))
          break
        }
      }
      currentPos++
    }
  }

  return tags
}

describeSuite('InstanceConfigSettings general coverage guard', () => {
  const fileContent = backendExists ? fs.readFileSync(backendFilePath, 'utf-8') : ''
  const classMatch = fileContent.match(/export class InstanceConfigSettingsInput \{([^}]+)\}/)
  const classBody = classMatch ? classMatch[1] ?? '' : ''
  const settingKeys = (classBody.match(/^\s+(\w+)\??\s*:/gm) || []).map((line) =>
    line.trim().replace(/\??\s*:.*/, '')
  )

  /**
   * Explicit, commented list of settings that are deliberately not standalone input fields on the page.
   *
   * - 'details': A container object holding nested instance metadata (name, link, websocketLink,
   *   imageUrl, region polygon, privacy policy, TOS, etc.) rather than a single form input field.
   * - 'registeredRegistries': Left over from the dropped instance registry (scope row L). The
   *   backend still stores it, but the page no longer reads, shows or sends it.
   */
  const DELIBERATE_NON_FIELD_SETTINGS: string[] = [
    'details', // Container object for nested instance metadata (name, link, imageUrl, region, etc.)
    'registeredRegistries', // Dropped registry's list; the backend keeps it, the page ignores it
  ]

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
  const rawPageSourceText = backendExists ? fs.readFileSync(pageFilePath, 'utf-8') : ''

  // Strip block comments (/* ... */) and line comments (// ...) so prose/comment mentions don't count.
  // Use negative lookbehind (?<!:) so URL strings like "https://registry.example.com" are preserved intact.
  const commentStrippedPageSource = rawPageSourceText
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(?<!:)\/\/.*/g, '')

  // Extract all opening tags of input-like form elements across the page source
  const inputTags = extractInputTags(commentStrippedPageSource)

  // Check that each non-excluded backend setting is bound to an input value, select, editor component in an input tag
  it.each(settingKeys)('ensures page source renders input or editor for setting key: %s', (key) => {
    if (DELIBERATE_NON_FIELD_SETTINGS.includes(key)) {
      // Deliberately excluded setting keys are documented above and skipped from UI field requirement
      expect(DELIBERATE_NON_FIELD_SETTINGS).toContain(key)
      return
    }

    // Must be bound as a value or editor prop within an input-like tag:
    // value={...<key>...}, rate={...<key>...}, policies={...<key>...}, or defaultPolicy={...<key>...}.
    // React key="<key>" alone does NOT count as a rendered input binding.
    const bindingRegex = new RegExp(
      `\\b(value|rate|policies|defaultPolicy)\\s*=\\s*\\{[^}]*\\b${key}\\b`
    )

    const hasInputBinding = inputTags.some((tag) => bindingRegex.test(tag))
    expect(hasInputBinding).toBe(true)
  })
})
