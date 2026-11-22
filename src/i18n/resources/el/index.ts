// The admin's Greek texts (spec 0054, AC-2), file for file with ../en. Drafted by Claude; a Greek
// speaking member checks them before go live (docs/translations/greek-review.md).
import type { Translations } from '../en'
import { common, language } from './common'
import { enums } from './enums'
import { serverEl } from './server'
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

// `: Translations` makes TypeScript refuse this object if any area is missing or has another shape.
export const el: Translations = {
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
  ...serverEl,
}
