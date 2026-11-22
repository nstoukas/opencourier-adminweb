import type { TFunction } from 'i18next'
import type { CourierAdminDto } from '@/backend-admin-sdk'

// How a rider takes offers, in words (spec 0012). NONE reads "Not set". A setting added on the
// server later has no words here yet, so it shows as sent rather than as "undefined".
// `t` comes from the component (useTranslation), so the words follow the reader's language.
export function deliverySettingLabel(value: CourierAdminDto['deliverySetting'], t: TFunction): string {
  // defaultValue is what i18next returns when the language files have no key for this value.
  return t(`couriers.deliverySetting.${value}`, { defaultValue: value })
}

// "March 2026": moved to src/utils so the restaurants pages share it (spec 0024); kept here too,
// so the couriers pages and their tests read it where they always did. The couriers pages now show
// the month through useFormat().monthYear, in the reader's language.
export { memberSince } from '@/utils/memberSince'

// The rider's full name, or "Courier" when both parts are empty.
export function courierName(courier: Pick<CourierAdminDto, 'firstName' | 'lastName'>, t: TFunction): string {
  return `${courier.firstName} ${courier.lastName}`.trim() || t('couriers.fallbackName')
}
