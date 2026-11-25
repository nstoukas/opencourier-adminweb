# opencourier-adminweb

## Overview

The co-op admin dashboard: Next.js 13, React 18, Redux, Radix UI, Tailwind, TanStack Table,
maps. Dev server on port 3080, talking to the backend's `admin` API.

**Read the workspace rulebook first: [`../AGENTS.md`](../AGENTS.md).** This repo sits inside the co-op workspace, and that file binds it: co-op values, locked decisions, domain language, boundaries, and the skill workflow every change goes through ("How work gets done here"). Tools that stop at this repo's git root will not find it on their own. This file only adds what is specific to this component.

## Key files

| File | Owns |
|---|---|
| `src/backend-admin-sdk/` | Checked-in admin SDK with no generator, so it is edited by hand |
| `src/shared-types/` | Private copies of backend enums with `*_TO_HUMAN` label maps |
| `src/api/` | Calls into the SDK |

## Commands

Yarn 1.22, **not Corepack**: run `node node_modules/.bin/next dev -p 3080` and
`node node_modules/.bin/jest`. Full list in the workspace rulebook.

## Gotchas

- A backend enum gaining a value does not reach the UI by itself: update the copy in
  `src/shared-types/` and its label map.
- The generated SDK's nullability is unreliable, so a null check that looks redundant may be load-bearing.
- Radix does not return focus when a dialog here closes (focus falls to the page). Pass
  `onCloseAutoFocus`, prevent its default and focus the opening button yourself, as
  `PartnerCustomersCard` does.
- A new setting in the hand edited SDK needs both its Dto (reading) and its AdminInput serializer
  (saving); without the second, a save drops it silently.
- `OFFERED`, `OFFER_EXPIRED` and `NO_COURIER_AVAILABLE` are platform events: in the enum copy, never
  in `STATE_MACHINE`, so the admin trigger menu cannot send them.
- The backend replaces the instance config's `details` object whole on save: always send the saved details with your change, as `savePayload` in `src/modules/instance-config/settingsDiff.ts` does (spec 0010).
- The co-op settings page keeps the representative's edits as overrides laid over the saved settings; copying the fetched settings into the boxes on every fetch wipes pending changes (row 87 review). A new setting needs an entry in `SETTINGS` there and a bound control in `src/modules/instance-config/cards/`, or the coverage guard fails.
- A delivery event's `occurredAt` (row 20) is when a step happened; `lateStepOf` in `src/utils/deliveryEventDisplay.ts` is the one rule for showing a step as late (over 60 s) and "Not applied" (also failed, with no `newStatus`). The legs of one order share an `orderReference`: show the short id beside it wherever a delivery is named.
- The value 5 guard (`src/shared-types/regression.test.ts`) fails on any count or grouping of events
  or offers per courier anywhere in `src`.
- A rider's progress is made in the courier app and invalidates nothing here: a page that shows it (deliveries
  list, a delivery, a courier) polls every 30 s while `usePageVisible()` is true. A page read by an id from the URL
  takes RTK Query's `currentData`, so going back between two ids never shows the previous record.
- A paged list whose tab or page changes (Reviews, spec 0038) also reads `currentData`: with `data`, the last tab's rows and their buttons stay under the new tab's header until the new list lands.
- An RTK `queryFn` with no result (a 204) returns `{ data: null }`: `{ data: undefined }` makes RTK Query log an error
  (the saved customer delete still does, a follow up of spec 0013).
- RTK Query 1.9.7's hook `reset` is stale inside the handler that triggered the mutation (it holds the render before
  the request), so it does nothing there. To drop an answer from the store, keep the request object
  (`const request = trigger(arg)`) and call `request.reset()` after `unwrap()`, as the API key card and Set New Password
  do for a restaurant's key (spec 0037). A step only its own button may close passes `hideCloseButton` to `DialogContent`
  and ignores other closes in `onOpenChange`.
- Times a co-op enters for the instance (dispatch stops, spec 0014) are Athens time: format with `Intl` and
  `timeZone: 'Europe/Athens'` (`src/modules/dispatch-stop/dispatchStopDisplay.ts`), never the browser's zone. A dialog
  whose title or focus target derives from its open state changes them during Radix's closing animation: keep open and
  mode in separate state (JSDOM has no animation, so a test passes either way).
- The deliveries list's `partnerId` (spec 0017) is the only list filter kept in the URL: read straight from
  `router.query` (skip the request until `router.isReady`), written with a shallow `router.replace`, and a change goes back
  to page 1. A link that sets it must not let the list fetch once without it.

- `SosAlerts` (in `DefaultLayout`, spec 0022) polls `admin/v1/sos?status=current` every 10 s from a Web Worker tick, so a
  hidden tab still alerts. A poll's `isError` must be said in words (RTK Query keeps the last good `data`), and `/sos` never
  shows "No rider has an open SOS." while unreachable. Notifications are asked inside the click, before any await (Safari).

- The Dispatch board (`src/modules/dispatch/`, spec 0034) draws row kinds in one `switch` in `AttentionList`, and a kind it does not know gets a plain Open, so a new backend kind never breaks an older tab. Its "updated N s ago" reads RTK Query's `fulfilledTimeStamp`, because a new `data` object can be the cache returning.

- The value 5 guard's broad patterns for removal requests run only on files about them (a path containing "removal", or a source importing `removalRequestApi` or `shared-types/removal-requests`, or naming `RemovalRequestAdminDto`), so ordinary code like `i++` or `new Map` can fail there. A failure names the file and pattern.

- Chat (`src/modules/chat/`, spec 0034) is one optional catch all page, `src/pages/chat/[[...threadId]].tsx`, so opening a thread keeps the inbox's tab and search. The live socket (`chatLive.ts`) outlives a page change, because its close waits one tick for the next page's `ChatLive`; sign out and a 401 must call `disconnectChatLive` straight away. A page that fills the screen uses `DefaultLayout`'s `fillViewport` (every width) and scrolls inside its own box.

- Charges (`src/modules/charges/`, spec 0036): a month is the Athens calendar month (`src/utils/athensMonth.ts`, `Intl`, never dayjs's timezone plugin, which only `_app.tsx` loads), read from `router.query` and skipped until `router.isReady`, never before `FIRST_MONTH` (1970-01). Totals in more than one currency are shown side by side (`chargeTotals.ts`), never summed. No figure there may read as the customer's delivery fee: only `DELIVERY_FEE_NOTE` may say "fee" (a text scan test fails otherwise). The Greek statement page is `lang="el"` with its one admin control marked `lang="en"`. A 409 on Mark as billed carries `alreadyBilled` ids, which the hand edited SDK keeps (`src/backend-admin-sdk/src/errors.ts`).

- An assignment past a full box (spec 0043) answers 409 `BOX_OVER_CAPACITY` with `heldUnits` and `deliveryUnits` (kept on `ApiError`).
  `BoxOverCapacityWarning` ties the warning to the rider it was about, the rider select is locked while a request runs, and the
  confirm needs the tick box (`overCapacityConfirmed`); a new admin path that assigns a rider uses the same three pieces.

- Offer reasons (spec 0044): `OfferReasonsCard` words each strategy's `values` (FAIRNESS, NEAREST_COURIER, COURIER_SENIORITY,
  STATIC, ADMIN); a new strategy or key needs a line in `reasonLines`, or the card shows only its heading. The candidates
  table is admin only and per offer: never a count or a list of a rider across offers (the value 5 guard).

- Offline during a booked shift (spec 0049): `ShiftOfflineEventsCard` on the Shift slots page lists the server's order and
  nothing else: no count, badge, grouping, search or sort by rider. The value 5 guard does not cover it; the card's own
  test does, so keep that test when changing the card.

- Rider accounts (spec 0051): `CourierAccountCard` deactivates, reactivates, edits and shows the account history; a list or
  picker that offers riders for work leaves out those with `deactivatedAt` (the backend refuses them anyway).

- Monthly statements (spec 0050): `CourierStatementsCard` downloads the rider's PDF or CSV as a blob through the hand edited
  `StatementApi` (`src/api/statementApi.ts`); every download is recorded and shown to the rider, so fetch the file only on the admin's click.

- Multi leg orders (spec 0046): `legText` (`src/utils/legs.ts`) words "Leg 1 of 2"; `OrderLegsCard` shows the order's legs and
  the ones never created from the get by id answer only (`orderLegs`, `missingLegNumbers`, hand edited SDK).
- Split requests (spec 0047, `src/modules/split-requests/`): the sidebar count polls every 15 s even in a background tab (its
  sound is for an admin on another tab), and plays only when the count rises. A charge's wording is `reasonText` and `greekReason`
  (`src/modules/charges/`), used by the pages, the Greek statement and the CSV: `SPLIT_LEG` and a WAITING line with `splitWait`
  have their own sentences, and a new charge reason needs a case in both.
- `src/i18n/resources/*/server.ts` and `src/shared-types/event-messages.ts` are word for word copies of the backend's templates;
  `src/i18n/translations.test.ts` compares every server code and both event code lists with the backend's files beside this
  repo, both ways and word for word (row 163). It skips with a warning when the backend folder is absent (`REQUIRE_BACKEND=1`
  makes that a failure), and it compares with whatever that folder has checked out, uncommitted edits included, so a green run
  is evidence only against that tree. A new event type also
  needs the enum copy in `src/shared-types/delivery-events.ts` and its `eventType` label in both `deliveries.ts` (row 146).

_Drafted by /audit from the repo, worth a quick human pass. Edit freely: once a line stops matching this draft, later runs treat it as curated and will flag rather than overwrite it._
