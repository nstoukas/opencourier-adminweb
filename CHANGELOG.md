# Changelog — co-op fork of `opencourier-adminweb`

This fork adapts [Princeton-HCI/opencourier-adminweb](https://github.com/Princeton-HCI/opencourier-adminweb)
for a Greek workers' cooperative delivering by moped in Volos. It pairs with the co-op
fork of `opencourier-backend`, whose `CHANGELOG.md` documents the endpoints used here.

Everything below sits on top of upstream `main` on the branch
`fix/accepted-event-courier-id` (18 commits, 26 July – 4 August 2026). Each entry names
its commit, and the commit message has the full reasoning and verification notes.

The test suite went from **no test runner** to **141 passing tests**, and lint went from
**impossible to run** to **74 problems, then 2**.

---

## Added

### Restaurants screen and courier reassignment (Unit 5) — `43ff011`
- **Restaurants page**: list, create and edit restaurants, set the one fixed pickup
  address, and rotate the login. A new password is shown once, behind an explicit
  acknowledge step, because the API never returns it again.
- **Reassign-courier dialog**: a Radix dialog rather than `window.confirm`, so it can show
  an amount and be tested with browser automation.
  - The payout menu and its default are read from the member-voted `Config` when the
    dialog opens. There is no free-text amount.
  - Before submitting, the dialog shows the exact amount the dropped rider will receive,
    in the delivery's currency, computed the same way the server computes it.
  - `REASSIGNED` is deliberately **not** in the generic "Trigger event" menu. That path
    would move the delivery without writing a compensation row.

### Delivery event timeline (Unit 6) — `d39a803`
- The delivery page now shows the delivery's real recorded `DeliveryEvent` history from the
  backend. It replaces a per-browser receipt card that disappeared on reload.
- Failed transitions are shown, tinted and badged, not hidden.
- Failed rows show no status arrow. The backend used to store those statuses reversed (since
  fixed in backend `2595d68`).
- A footnote explains that events the state machine rejects outright are never recorded.
- Submitting a reassignment refreshes the timeline.

### OSRM labels — `24d7825`
- The OSRM distance and duration options on Instance configuration now have labels (they
  were blank). Added to the local enums and the checked-in admin SDK.
- A coupling test fails if any option the API can return has no label.
- This only adds labels. The live instance is not switched to OSRM.

### Testing and linting
- Added Jest and React Testing Library via `next/jest` (run with
  `node node_modules/.bin/jest`). `9e43976`
- **`yarn lint` works for the first time.** It extended a non-existent
  `eslint-config-opencourier` left over from the upstream monorepo. The config is now inline
  and matches the backend's. `7eeed9d`

---

## Fixed

- **Accepting a delivery from the admin UI now sends `courierId`**, so the delivery
  advances instead of being re-offered. This is the client half of backend `2f47613`.
  `82513f1`
- **Money shows in the delivery's own currency.** Every amount used to get a hard-coded `$`,
  so a Greek EUR delivery showed as `$112.04`. There is now one shared `formatMoney`
  helper; when the currency code is missing it shows no symbol rather than guessing.
  `12e07e0`
- **Unset delivery dates no longer show "January 1, 1970".** The generated SDK turns `null`
  into the Unix epoch; the new `formatOptionalDate` treats that as "not set". `cc1132a`
- **Pickup-address form bugs** (`4ed65b0`):
  - The Country dropdown showed "GR" but held `''`, so saving failed with "Country code is
    required".
  - Creating a restaurant with no address failed with four errors about fields the admin
    never touched.
- **Operating region was typed as always-`null`**, which made TypeScript and lint treat
  three load-bearing guards as dead code. One of them stops a save from wiping the region.
  Also: `normalizeRegionForPostGIS` now handles the bare `Feature[]` the map produces,
  instead of passing it to the registry unchanged. `aa176d2`
- **Redux dev checks no longer flood the console.** The RTK Query cache (which holds `Date`
  objects from the SDK) is excluded from serializability checks. It is never persisted.
  `f07380a`
- **The two console errors every page logged are gone** (`3753933`):
  - Resizable panel sizes were given in pixels where the library expects percentages.
  - Pagination rendered an `<li>` inside another `<li>`.

## Changed — code quality

- Lint: 74 → 47. Removed unused imports and variables, shadowed names, and stray `async`
  keywords. `6f27c95`
- Lint: 43 → 2. Went through all 36 `no-unnecessary-condition` hits one by one. Where a
  guard was real, the type was fixed instead. Where it was dead, it was removed. Jest
  polyfills moved to `jest.setup.js`. `4d259ee`
- Typecheck errors: 126 → 110. None of these changes added new errors.

## Removed

- `package-lock.json` (this repo uses Yarn 1). `82513f1`
- Dead Stripe transfer and refund UIs. They were unreachable, didn't compile, and
  hard-coded `$`. `7153ca0`
- `parsePrice`, an unused helper that hard-coded `$`. `bd8e816`
- Cart modifier helpers, the last hard-coded `$` in any of the five repos. `2084005`
- A vestigial `src/ui-shared-utils/.eslintrc.js`. `7eeed9d`

## Housekeeping

- Ignored pipeline artifacts (`.aiflow/`, `plan.md`) and `.eslintcache`. `eb59e33`,
  `7eeed9d`
- `.run-dev.sh`, a local helper that pins Node 20. It contains an absolute home path, so it
  is only useful on the author's machine. `82513f1`
- `AGENTS.md`, context for AI coding tools that points at the co-op workspace rulebook, and a
  `CLAUDE.md` that imports it.

---

## Known open items

- Lint still reports 2 `no-img-element` hits in `merchant-card-images.tsx`, which is
  unreachable and a candidate for deletion.
- About 110 typecheck errors predate this fork.
- The checked-in admin SDK misreports nullability. Treat it with care.
