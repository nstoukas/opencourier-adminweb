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
- An RTK `queryFn` with no result (a 204) returns `{ data: null }`: `{ data: undefined }` makes RTK Query log an error
  (`rotatePartnerPassword` and the saved customer delete still do, a follow up of spec 0013).
- Times a co-op enters for the instance (dispatch stops, spec 0014) are Athens time: format with `Intl` and
  `timeZone: 'Europe/Athens'` (`src/modules/dispatch-stop/dispatchStopDisplay.ts`), never the browser's zone. A dialog
  whose title or focus target derives from its open state changes them during Radix's closing animation: keep open and
  mode in separate state (JSDOM has no animation, so a test passes either way).
- The deliveries list's `partnerId` (spec 0017) is the only list filter kept in the URL: read straight from
  `router.query` (skip the request until `router.isReady`), written with a shallow `router.replace`, and a change goes back
  to page 1. A link that sets it must not let the list fetch once without it.

_Drafted by /audit from the repo, worth a quick human pass. Edit freely: once a line stops matching this draft, later runs treat it as curated and will flag rather than overwrite it._
