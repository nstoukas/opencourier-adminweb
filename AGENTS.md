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
- A new setting in the hand edited SDK needs both its Dto (reading) and its AdminInput serializer
  (saving); without the second, a save drops it silently.
- `OFFERED`, `OFFER_EXPIRED` and `NO_COURIER_AVAILABLE` are platform events: in the enum copy, never
  in `STATE_MACHINE`, so the admin trigger menu cannot send them.
- The value 5 guard (`src/shared-types/regression.test.ts`) fails on any count or grouping of events
  or offers per courier anywhere in `src`.

_Drafted by /audit from the repo, worth a quick human pass. Edit freely: once a line stops matching this draft, later runs treat it as curated and will flag rather than overwrite it._
