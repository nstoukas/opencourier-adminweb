// `extends: ['opencourier']` used to point at a shared config from the upstream
// Turborepo these repos were extracted from. That package exists nowhere, so lint
// could never run here. This inlines the same shape opencourier-backend uses, plus
// the Next plugin this repo already depended on.
module.exports = {
  root: true,
  extends: ['prettier', 'plugin:@typescript-eslint/recommended', 'plugin:@next/next/recommended'],
  plugins: ['@typescript-eslint', 'unused-imports'],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: true,
    ecmaVersion: 'latest',
    sourceType: 'module',
    tsconfigRootDir: __dirname,
  },
  ignorePatterns: [
    '.eslintrc.js',
    '*.config.js',
    '*.config.ts',
    '**/*.spec.ts',
    // Checked-in generated code — CLAUDE.md says don't hand-edit it, so don't lint it either.
    'src/backend-admin-sdk/**',
  ],
  rules: {
    // Kept verbatim from the config this replaces.
    '@typescript-eslint/no-empty-interface': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-var-requires': 'off',
    // The rest mirror opencourier-backend/.eslintrc.js.
    '@typescript-eslint/no-shadow': 'error',
    '@typescript-eslint/no-unnecessary-condition': 'error',
    '@typescript-eslint/require-await': 'error',
    '@typescript-eslint/no-floating-promises': 'error',
    '@typescript-eslint/no-unused-vars': 'off',
    '@typescript-eslint/no-empty-function': 'off',
    'unused-imports/no-unused-imports': 'error',
    'unused-imports/no-unused-vars': [
      'warn',
      {
        vars: 'all',
        varsIgnorePattern: '^_',
        args: 'after-used',
        argsIgnorePattern: '^_',
      },
    ],
  },
}
