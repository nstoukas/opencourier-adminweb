// The admin's English texts (spec 0054, AC-2), one file per area so each can be edited on its own.
// The first part of a key ("deliveries", "partners", ...) is its area, and the Greek review list
// (docs/translations/greek-review.md at the workspace root) groups keys the same way. i18next fills in
// {{name}} with a value; a key ending in _one or _other is a plural (i18next picks the form for `count`).
// Every key here must exist in ../el too: each Greek file is typed with `Translations`, so TypeScript
// refuses one with a key missing or added.
import { common, language } from './common'
import { enums } from './enums'
import { serverEn } from './server'
import { layout } from './layout'
import { auth } from './auth'
import { components } from './components'
import { deliveries } from './deliveries'
import { partners } from './partners'
import { addressNotes } from './addressNotes'
import { productReports } from './productReports'
import { settings } from './settings'
import { dispatchStop } from './dispatchStop'
import { couriers } from './couriers'
import { timeWorked } from './timeWorked'
import { shiftSlots } from './shiftSlots'
import { sos } from './sos'
import { charges } from './charges'
import { complaints } from './complaints'
import { reviews } from './reviews'
import { chat } from './chat'
import { dispatch } from './dispatch'
import { splitRequests } from './splitRequests'

export const en = {
  common,
  language,
  enums,
  layout,
  auth,
  components,
  deliveries,
  partners,
  addressNotes,
  productReports,
  settings,
  dispatchStop,
  couriers,
  timeWorked,
  shiftSlots,
  sos,
  charges,
  complaints,
  reviews,
  chat,
  dispatch,
  splitRequests,
  // The server's own texts (event records, refusals), copied from the backend: `server.event.*` and so on.
  ...serverEn,
}

// The shape every language must have: the same keys, each a string.
export type Translations = typeof en
