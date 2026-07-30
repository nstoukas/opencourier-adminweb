// jest.setup.js requires @testing-library/jest-dom, which registers DOM matchers such as
// toBeInTheDocument() at runtime — that is why the suite passes. Its TYPE augmentation is a
// separate thing and was never reachable: tsconfig.json declares no "types" array, so nothing
// pulled the package's declarations in. Unit 5 added this repo's first RTL tests, so the gap
// only surfaced now, as ~40 "Property 'toBeInTheDocument' does not exist" errors.
// This side-effect import loads the augmentation for tsc. It is types-only; it emits nothing.
import '@testing-library/jest-dom'
