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
