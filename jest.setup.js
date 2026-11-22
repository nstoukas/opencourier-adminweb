// Adds DOM matchers such as toBeInTheDocument() to expect().
require('@testing-library/jest-dom')

// JSDOM implements neither of these, and Radix UI primitives call both — a Select or a
// Dialog throws without them. They used to be copied into each suite that renders Radix,
// but TypeScript types both as always present on window (they are, in a real browser), so
// eslint read every `window.X || fallback` there as a dead branch. Installing them here
// keeps the polyfill in one place and out of the type checker's way.
if (!window.ResizeObserver) {
  window.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
}

if (!window.HTMLElement.prototype.scrollIntoView) {
  window.HTMLElement.prototype.scrollIntoView = function () {}
}

// The Greek interface (row 47, spec 0054): components read their words through react-i18next. In the
// app, _app hands each page its own instance; under Jest no _app renders, so one shared instance in
// English is registered here (initReactI18next makes it the one useTranslation finds without a
// provider). English, because the existing tests assert the English words (spec 0054, cross check 12:
// tests that assert English text pin the language to `en`). A test about Greek makes its own instance
// with createI18n('el') and wraps the component in an I18nextProvider. The same as request-web's.
const { initReactI18next } = require('react-i18next')
const { createI18n } = require('./src/i18n/createI18n')
const testI18n = createI18n('en')
initReactI18next.init(testI18n)
