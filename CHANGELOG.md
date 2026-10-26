# Changelog — co-op fork of `opencourier-adminweb`

This fork adapts [Princeton-HCI/opencourier-adminweb](https://github.com/Princeton-HCI/opencourier-adminweb)
for a Greek workers' cooperative delivering by moped in Volos. It pairs with the co-op
fork of `opencourier-backend`, whose `CHANGELOG.md` documents the endpoints used here.

Everything below sits on top of upstream `main` on the branch
`fix/accepted-event-courier-id` (56 commits, 26 July – 26 October 2026). Each entry names
its commit, and the commit message has the full reasoning and verification notes.

The test suite went from **no test runner** to **141 passing tests**, and lint went from
**impossible to run** to **74 problems, then 2**.

The editable pay settings (the first entry under Added) were built on the branch
`feat/editable-pay-settings` and merged into `fix/accepted-event-courier-id` on 30 September.
With them the suite is at **233 passing tests**, and lint and typecheck are unchanged.

Scope row 49 (zero is a valid value for every co-op setting) was built on the branch
`fix/zero-valid-settings` and merged in on 30 September. With it the suite is at **261 passing
tests**, and lint and typecheck are unchanged.

Scope row 51 (the delivery fee as a base fee plus a per km fee, spec 0001) was built on the branch
`feat/base-fee-per-km` and merged in on 1 October. With it the suite is at **277 passing tests**, and lint
and typecheck are unchanged.

Scope row 50 (Instance configuration reports saves honestly) was built on the branch
`fix/honest-config-saves` and merged in on 1 October. With it the suite is at **296 passing tests**, and
lint and typecheck are unchanged.

Scope row 55 (remove the dropped registry from Instance configuration) was built on the branch
`fix/drop-registry-controls` and merged in on 1 October. With it the suite is at **291 passing tests**
(18 tests of deleted code went, 13 new ones came), and lint and typecheck are unchanged.

Scope rows 5 (the merchants code removed) and 93 (the delivery status and chat pages) were merged
in on 25 October, and scope row 63 (the OpenCourier design system) was built on the branch
`feat/design-foundation` and merged in on 26 October. With them the suite has **393 tests**:
387 pass, and the 6 that fail are the settings coverage guard, which reads the backend checkout
beside this repo and fails while that backend is on `feat/offer-expiry` (three new settings this
page does not show yet). Typecheck is down to 36 errors and lint to 0.

---

## Added

### Offer expiry settings and the Offer column (scope row 61): `5b462d5`, `09a4922`, `8af6b88`, `3e4783f`, `f32e18f`
Built on `feat/offer-expiry`, on top of row 63. **Not merged yet**: it merges together with the
backend and mobile halves of row 61, which add the settings and events it shows.
- **An "Offers to riders" section on Instance configuration** (spec 0002, AC-10): Offer expiry
  (Off or On, off by default), the offer time in whole seconds (20 to 300) and the retry time
  for "no rider free". It has its own Save button that sends only those three settings; "Save
  All Changes" never sends them. A refusal shows the backend's own words, the same honest
  saves as rows 50 and 55. The switch, both boxes and the button stay disabled until the
  current values have loaded. `09a4922`, `b8c8c78`
- **An Offer column on the deliveries list** (AC-11): "Ana P., 2 min" while a rider holds the
  offer, "No rider free, 4 min" while nobody does, empty otherwise. While a delivery is
  looking for a rider, the Courier column shows a dash instead of repeating it. `3e4783f`, `d622ea6`
- **On a delivery's page**: the same line with the rider's full name, and an Offer card listing
  who, offered at and offer ends, to the second. Once an open offer is more than 33 s past its
  deadline (the server's 3 s grace plus one refresh), the card says "Overdue since", the sign
  that the expiry job did not run. The line and the assign control show only while nobody has
  accepted. `f32e18f`, `a2767c5`, `25892aa`, `0a95c06`
- **The timeline names the offered rider** on `OFFERED` and `OFFER_EXPIRED` and shows the actor
  and source in words ("System · OpenCourier"). Adminweb's enum copy gains `OFFERED`,
  `OFFER_EXPIRED`, `NO_COURIER_AVAILABLE` and the `SYSTEM` actor, but the three events stay out
  of `STATE_MACHINE`, so the admin "Trigger event" menu never offers them. `8af6b88`, `f32e18f`
- The list, a delivery and its timeline refresh every 30 s, paused while the browser tab is
  hidden (`usePageVisible`; this repo's RTK 1.9.7 has no built in option for it). `3e4783f`, `c8b5cdc`
- The hand edited SDK carries the three settings both ways, the delivery's offer fields
  (`offeredAt`, `offerExpiresAt`, `matchedCourierName`, `waitingForCourierSince`) and `courierId`
  on an event. A delivery with an undefined date no longer crashes its serialiser. `5b462d5`, `e2981b8`
- Nothing counts or scores expired offers per rider (value 5): a rider is named only for the
  offer they hold now, or on one delivery's timeline. A test guard scans the SDK models and the
  frontend source (`api`, `modules`, `pages`, `components`, `utils`) for any such count.
- Reviewed by Sonnet and by agy; seven fixes came out of it, among them "Unknown rider" shown
  whole instead of "Unknown r.". `95cd7cc` to `0a95c06`
- Tests by agy: 475 pass (393 before, when 6 of them failed). `e23b6ee`, `f44a7d7`, `d271270`

### The OpenCourier design system (scope row 63): `7347352`, `426839d`
- **The colours and corner radius come from the co-op's design system**
  (`opencourier-design-system/tokens/tokens.json`): the `:root` theme in `globals.css` and
  the Tailwind preset in `src/tailwind-config/admin.tailwind.config.ts`. Light theme only,
  still Tailwind 3.
- **Button, Badge and Alert have the OpenCourier variants.** Button gains `success` and
  `warning` and the sizes `xl`, `offer` and `icon-xl`; Badge and Alert gain `success`,
  `warning` and `info`.
- **New `StatusBadge`, `DetailList` and `Spinner`** in
  `src/admin-web-components/components/atoms/`. The deliveries list, a delivery's page, its
  status page and the couriers list show every status through `StatusBadge`, with one
  readable name per status (the names live in `STATUS_TO_HUMAN` and
  `COURIER_STATUS_TO_HUMAN` in `src/shared-types`, so the badge and the event timeline agree)
  and no raw enum text. Status badges do not change colour on hover. A restaurant's facts
  render through `DetailList`. The old outline `StatusBadge` and `CourierStatusBadge` are gone.
- **Icons come from Phosphor** (`@phosphor-icons/react` 2.1.10, the same as request-web)
  instead of `lucide-react`. Icons are hidden from screen readers by default; the spinner
  speaks, and the toast close button is named "Close".
- **Dates read day first on the 24 hour clock**, for example "30/09/2026, 23:25".
- Tests: 53 by agy for the foundation, then the review fixes' tests (`095328e`, `172af49`).
  They check the theme against `tokens.json` (skipped when the design system folder is not
  beside this repo), every status label, that no lucide import comes back, and the clock.

### Base fee and price breakdown (scope row 51): `a618c97`, `87313d5`, `0061662`
- **A "Base Fee Per Delivery" field on Instance configuration**, in whole cents, with a live
  description such as "€2.00 per delivery, paid to the rider in full on top of the distance
  part". It has its own Save button and sends only `{ quoteBaseFee }`; "Save All Changes"
  never includes it, so an empty or half typed box can't be saved by accident. `a618c97`
  - `0` saves and reads back as `0`. A negative, a fraction or an empty box shows an error
    and disables Save. It uses the same parser as the quote rate, so the two fields can't
    drift apart.
  - A missing base fee (the backend sends `null` for a bad stored value) shows an empty box
    with Save disabled, never `0`, so one click can't save a base fee nobody chose. `0061662`
- **A price breakdown on each delivery's page**: base fee, distance fee, rider pay, co-op fee
  with its %, and customer total, so members can audit a delivery's pay without the database.
  Amounts not written yet show a dash, with a note that they are set when the delivery is
  first offered to a rider. `a618c97`
- The checked in admin SDK models carry `quoteBaseFee`, and `baseFee`, `distanceFee` and
  `feePercentage` on the delivery. `a618c97`
- Tests by agy cover the field, its refusals, the exact save payload, "Save All Changes"
  leaving it out, and the breakdown. `87313d5`, `0061662`

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

- **The delivery status page builds and works again** (scope row 93). It and `/chat` imported
  `@/modules/orders`, which never existed here, so neither page built. The status page now
  uses the deliveries module and the `deliveryId` from its own route. It sends a `courierId`
  with `ACCEPTED`, as the backend requires, and both admin event menus leave `ACCEPTED` out
  while a delivery has no rider. After a change it reports the status the server answered
  with, says "Nothing changed" when the event had no transition, and shows the backend's own
  reason when it was refused. The event list and the `courierId` rule are shared with the
  delivery page's Trigger event menu in `modules/deliveries/utils/adminEvents.ts`.
  `71accd9`, `3f7cb4f`, `e65f396`; tests `840d7e9`, `f8a082b`
- **Every save on Instance configuration now reports a refusal** (scope row 50). The privacy
  policy, terms of service, rules and description editors, and the two registry saves, showed
  "saved" even when the backend refused the change, because they never called `.unwrap()`. They
  now show the error toast, the four text editors show the backend's own reason (with the old
  generic line only as a fallback), and a refused text save keeps the editor open so nothing
  typed is lost. All 10 saves on the page now unwrap. `46024bf`
- **The payout policy editor shows the name that will be stored.** Save upper cases a policy
  name and turns spaces into underscores, while the box kept showing what was typed. A row now
  shows "Will be saved as `HALF_COMP`" whenever the two differ. `46024bf`
- **Tests for both** (19 new, written by agy from the row, each checked to fail with its bug put
  back). `12e8d82`
- **"Save All Changes" is no longer blocked by an empty logo or websocket URL, and says why it
  is off** (scope row 55). It required both only because the dropped instance registry needed
  them, so on dev, where the logo is empty, the number settings could not be saved from it.
  Both fields stay editable (the courier app and the backend's public metadata read them, and
  cope with an empty value) and still block when they hold a bad URL. Save All now requires
  Name, URL, Operating Region and Default Dietary Restrictions, and when it is off a list under
  it names every reason, announced to screen readers through a `role="status"` region.
  `662cfd4`, `808a33b`
- **Tests for it** (13 new, written by agy from the row's Done when, each checked by hand to
  fail with its bug put back). `6dfe959`

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

- **The unreachable merchants admin code** (scope row 5): the merchants, merchant groups and
  merchant organizations modules, their three layouts, the timezone combobox, four admin
  components only they used, the Merchant and Catalog cache tags, and the timezone list and
  weekday map they left behind. Nothing under `src/pages` reached any of it. 42 plus 4 files,
  about 3,800 lines. Typecheck went from 110 to 48 errors, and lint from 2 warnings to 0.
  `cc89127`, `a861d84`
- **upstream's Twilio order chat** (scope row 93). There was no backend behind it, so `/chat`
  is now a plain Messages page that says it is not available yet; the chat module, its
  conversation route and `useChat` went, with the dead refund form types. `71accd9`
- **`lucide-react`** (scope row 63), three unreachable components that still imported it
  (`Actions.tsx`, `card-list-actions.tsx`, `country-combobox.tsx`), and two Tailwind configs
  nothing loaded. `7347352`
- **The instance registry's controls on Instance configuration** (scope row 55): the "Register
  Instance" button and view, the register and unregister calls, and the registry list. The
  co-op runs one instance, so the registry is dropped. The page no longer reads or sends
  `registeredRegistries`; the backend still stores it, untouched. Two modules only the
  registry used went with it: `src/api/userApi.ts` (the user count) and
  `src/utils/geoJsonUtils.ts` (`normalizeRegionForPostGIS`), with its tests. `662cfd4`
- **The "Default Minimum Courier Pay" field**, and the setting from the SDK models, shared
  types and "Save All Changes". The backend no longer has a pay floor; the base fee replaces
  it. The compensation type's description now says the rider is paid the base fee plus the
  distance fee. `a618c97`
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

- On deliveries priced before row 51, the breakdown's "Rider pay (base fee + distance fee)"
  does not add up: base 0 plus the old price, next to the old pay (which included the old
  floor). The spec accepts this for old dev data.
- 36 typecheck errors predate this fork.
- The checked-in admin SDK misreports nullability. Treat it with care.
- After any save on Instance configuration, the whole form reloads from the server, so unsaved
  edits in other fields are lost. Both the payout menu and quote rate Save buttons do this.
- "Save All Changes" logs the whole config to the browser console when it succeeds
  (`console.log(config, computedURLs)`, from upstream).
- Button `success` and `warning`, Badge `info` and every `Alert` exist and are tested, but no
  page uses them yet. The redesign rows give them their first uses.
- `Nav.tsx` and the login page still carry `dark:` classes from upstream. They do nothing,
  because nothing turns dark mode on; the redesign rows clear them.
- Money still reads "€12.00" in the US style; dates already use the Greek order.
- The Offer column and card count minutes with the browser's clock against the server's
  times; the admin API sends no server time, so a browser clock that is off moves them.
