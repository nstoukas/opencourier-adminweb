# Changelog — co-op fork of `opencourier-adminweb`

This fork adapts [Princeton-HCI/opencourier-adminweb](https://github.com/Princeton-HCI/opencourier-adminweb)
for a Greek workers' cooperative delivering by moped in Volos. It pairs with the co-op
fork of `opencourier-backend`, whose `CHANGELOG.md` documents the endpoints used here.

Everything below sits on top of upstream `main` on the branch
`fix/accepted-event-courier-id` (18 commits, 26 July – 4 August 2026). Each entry names
its commit, and the commit message has the full reasoning and verification notes.

The test suite went from **no test runner** to **141 passing tests**, and lint went from
**impossible to run** to **74 problems, then 2**.

The editable pay settings (the first entry under Added) were built on the branch
`feat/editable-pay-settings` and merged into `fix/accepted-event-courier-id` on 30 September.
With them the suite is at **233 passing tests**, and lint and typecheck are unchanged.

Scope row 49 (zero is a valid value for every co-op setting) was built on the branch
`fix/zero-valid-settings` and merged in on 30 September. With it the suite is at **261 passing
tests**, and lint and typecheck are unchanged.

---

## Added

### Editable pay settings on Instance configuration (scope row 4): `83d0786`, `a96573e`
- **The quote rate per kilometre and the reassignment payout menu can now be changed from
  admin.** The backend already accepted them, but adminweb never showed them, so they could
  only be changed in the database. `83d0786`
  - The checked in admin SDK builds each request from a fixed list of fields, and all three
    were missing from it. A form field alone would have said "saved" and sent nothing, so
    both SDK models now carry them.
  - Quote rate: a number box with a live preview, such as "€1.50 per kilometre of travel".
    Only whole cents, zero or more, are accepted. An empty box, a negative number or a
    fraction (like `1.50` typed as euros, which would cut every quote by about 99%) shows an
    error and cannot be saved.
  - Payout menu: its own editor (add, remove and rename policies, set each percentage, pick
    the default) with its own Save button. The backend rejects the whole menu when the
    default is not one of its policies, so a typo there cannot block saving anything else.
- **The quote rate has its own Save button.** "Save All Changes" stays disabled while any
  required field is empty (on the dev instance, the logo URL), which locked a pay setting
  behind a branding field. The new button sends only the rate; "Save All Changes" still
  includes it too. `a96573e`
- **A coverage test** reads every setting from the backend's `InstanceConfigSettingsInput`
  and fails if the SDK drops one or the page never mentions it, so the next backend setting
  cannot land without an admin field. It needs the backend checked out beside adminweb, and
  fails rather than skips without it. `83d0786`

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

- **Instance configuration no longer invents zeros** (scope row 49). A setting that was
  never stored loaded as `0`, and clearing a number box made it `0` (`Number("")` is `0`).
  Once the backend started keeping zeros, "Save All Changes" would have saved those as real
  votes. An empty box now means "no value": it is sent as empty, and the backend refuses it
  with a message naming the setting. `f3c591e`
- **A refused "Save All Changes" shows the backend's reason**, for example "maxAssignmentDistance
  cannot be 0: the matcher reads 0 as "no limit" …", instead of "Failed to save instance
  configuration". `f3c591e`
- **The coverage test now catches a missing field.** It used to pass as long as a setting's
  name appeared anywhere in the page, even in a comment. It now needs an input wired to the
  setting's value, keeps a written list of the settings that deliberately have no field, and
  is skipped with a loud warning (instead of failing the whole suite) when the backend
  checkout is not beside adminweb. `f3c591e`, `0b51f35`, `34ea279`

- **"Save All Changes" no longer reports success when the save fails.** The API call returns
  its error instead of throwing, so the page showed "saved successfully" either way. It now
  shows the failure. `83d0786`
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
  `CLAUDE.md` that imports it. Since `8dcfa81` it names the skill workflow rather than
  `aiflow.sh`.

---

## Known open items

- Lint still reports 2 `no-img-element` hits in `merchant-card-images.tsx`, which is
  unreachable and a candidate for deletion.
- About 110 typecheck errors predate this fork.
- The checked-in admin SDK misreports nullability. Treat it with care.
- After any save on Instance configuration, the whole form reloads from the server, so unsaved
  edits in other fields are lost. Both the payout menu and quote rate Save buttons do this.
- "Save All Changes" logs the whole config to the browser console when it succeeds
  (`console.log(config, computedURLs)`, from upstream).
- "Save All Changes" stays disabled while the logo image URL is empty, and the page does not
  say why. On the dev instance that means the number settings cannot be saved from this page
  at all (scope row 50).
