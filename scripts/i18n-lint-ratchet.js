#!/usr/bin/env node
/**
 * The hard coded text ratchet (spec 0054, AC-8): `yarn lint:i18n`.
 *
 * Runs ESLint with only `i18next/no-literal-string` (.eslintrc.i18n.js) over src and compares the count
 * with `i18n-lint-baseline.json`, the way the courier app's typecheck ratchet works:
 *   - more than the file says  -> fail (exit 1) and list them: new text must go in the language files
 *   - the same                 -> pass
 *   - fewer                    -> pass, and lower the number in the file (commit it)
 * Plain Node, no dependencies beyond ESLint itself.
 */
const { spawnSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const BASELINE = path.join(ROOT, 'i18n-lint-baseline.json')

const eslint = path.join(ROOT, 'node_modules', '.bin', 'eslint')
const result = spawnSync(
  eslint,
  ['--no-eslintrc', '-c', '.eslintrc.i18n.js', '--ext', '.tsx', '-f', 'json', 'src'],
  { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
)
let files
try {
  files = JSON.parse(result.stdout)
} catch {
  // ESLint itself failed (a broken config): never read that as "no hard coded text".
  console.error(result.stdout, result.stderr)
  process.exit(2)
}
const found = files.flatMap((file) =>
  file.messages.map((message) => `${path.relative(ROOT, file.filePath)}:${message.line}  ${message.message}`),
)
const baseline = JSON.parse(fs.readFileSync(BASELINE, 'utf8'))
if (found.length > baseline.count) {
  console.error(found.join('\n'))
  console.error(`\n${found.length} hard coded texts, baseline ${baseline.count}: put the new ones in src/i18n/resources.`)
  process.exit(1)
}
if (found.length < baseline.count) {
  fs.writeFileSync(BASELINE, `${JSON.stringify({ count: found.length, updated: new Date().toISOString().slice(0, 10) }, null, 2)}\n`)
  console.log(`${found.length} hard coded texts, down from ${baseline.count}: i18n-lint-baseline.json lowered.`)
} else {
  console.log(`${found.length} hard coded texts, the same as the baseline.`)
}
