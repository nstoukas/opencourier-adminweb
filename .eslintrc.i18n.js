// The hard coded text check (spec 0054, AC-8), run by `yarn lint:i18n` (scripts/i18n-lint-ratchet.js),
// not by `yarn lint`: it reports every piece of JSX text written straight into a component instead of
// coming from the language files (`t('...')`). The count may only go down (i18n-lint-baseline.json).
// What is left on purpose: each language's own short name in the switch, symbols, and the admin-web-components
// stories; an intended literal carries `// eslint-disable-next-line i18next/no-literal-string` and a reason.
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: { ecmaVersion: 'latest', sourceType: 'module', ecmaFeatures: { jsx: true } },
  plugins: ['i18next'],
  // `jsx-text-only`: only text between JSX tags, the words a person reads. Attributes (placeholder,
  // aria-label) and plain strings in code are not counted by this rule.
  rules: { 'i18next/no-literal-string': ['error', { mode: 'jsx-text-only' }] },
  ignorePatterns: ['**/*.test.tsx', '**/*.stories.tsx', 'src/backend-admin-sdk/**'],
}
