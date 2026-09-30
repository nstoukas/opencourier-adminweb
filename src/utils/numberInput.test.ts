import { parseNumberInput } from './numberInput'

describe('parseNumberInput utility', () => {
  // Happy path tests
  it('returns 0 when input string is "0" (0 is a valid setting value, not empty)', () => {
    // String "0" must be converted to numeric 0, never collapsed to null
    expect(parseNumberInput('0')).toBe(0)
  })

  it('returns positive number for valid numeric string "15"', () => {
    expect(parseNumberInput('15')).toBe(15)
  })

  it('returns decimal number for numeric string with decimals "12.5"', () => {
    expect(parseNumberInput('12.5')).toBe(12.5)
  })

  // Edge cases: empty and blank inputs
  it('returns null for an empty string (never 0)', () => {
    // Number("") in JS returns 0, but an empty form box must parse as null ("no value")
    expect(parseNumberInput('')).toBeNull()
  })

  it('returns null for whitespace-only strings (never 0)', () => {
    // Spaces, tabs, and newlines represent a cleared/empty input box
    expect(parseNumberInput('   ')).toBeNull()
    expect(parseNumberInput('\t\n')).toBeNull()
  })

  // Edge case: negative numbers
  it('returns negative number for valid negative string "-5"', () => {
    expect(parseNumberInput('-5')).toBe(-5)
  })
})
