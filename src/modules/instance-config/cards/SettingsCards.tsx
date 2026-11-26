import type { ReactNode } from 'react'
import type { TFunction } from 'i18next'
import { useTranslation } from 'react-i18next'
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  Input,
  NativeSelect,
  RadioGroup,
  RadioGroupItem,
  Switch,
} from '@/admin-web-components'
import type { ChatPreset } from '@/backend-admin-sdk/src/models/InstanceConfigSettingsDto'
import { enumLabel } from '@/i18n/enumLabel'
import { useFormat } from '@/i18n/useFormat'
import Link from 'next/link'
import { describeBaseFee } from '@/utils/baseFee'
import { describeOfferExpiry } from '@/utils/offerExpiry'
import { describeQuoteRate, parseQuoteRateInput } from '@/utils/quoteRate'
import { PricingExample } from '../PricingExample'
import {
  CENTS_ERROR,
  QUICK_REPLIES_MAX_ENTRIES,
  feeAboveCeiling,
  incompletePresetRows,
  isValidURL,
  labelOf,
  sanitizeURL,
  urlErrorText,
  type SettingKey,
  type SettingsForm,
} from '../settingsDiff'

// The option lists the backend offers for each choice (today's options query).
export type SettingsOptions = {
  courierMatcherType?: string[]
  quoteCalculationType?: string[]
  geoCalculationType?: string[]
  deliveryDurationCalculationType?: string[]
  courierCompensationCalculationType?: string[]
  defaultDietaryRestrictions?: string[]
  currency?: string[]
  distanceUnit?: string[]
}

export type CardProps = {
  form: SettingsForm
  // `<K extends SettingKey>` ties the value's type to the key: set('offerExpiryEnabled', true)
  // compiles, set('offerExpiryEnabled', 'yes') does not.
  set: <K extends SettingKey>(key: K, value: SettingsForm[K]) => void
  options: SettingsOptions | undefined
  // False until the saved settings arrive: the boxes stay off, so nothing typed is overwritten.
  loaded: boolean
  // The saved settings (null until they load), so a chat preset kept exactly as saved, an old one with no
  // English, is not asked for its missing half (spec 0054). Optional: without it every row is checked.
  saved?: SettingsForm | null
}

// Words for an option's code, by setting, in the reader's language: the boxes and the save bar share it
// (spec 0054). A code with no words yet (the backend added it later) is shown as it came.
export function optionLabel(t: TFunction, key: SettingKey, option: string): string {
  switch (key) {
    case 'courierMatcherType':
      return t(`settings.matcher.${option}.title`, { defaultValue: option })
    case 'currency':
      return enumLabel(t, 'currency', option)
    case 'distanceUnit':
      return enumLabel(t, 'distanceUnit', option)
    case 'quoteCalculationType':
      return enumLabel(t, 'quoteCalculationType', option)
    case 'geoCalculationType':
      return enumLabel(t, 'geoCalculationType', option)
    case 'deliveryDurationCalculationType':
      return enumLabel(t, 'deliveryDurationType', option)
    case 'courierCompensationCalculationType':
      return enumLabel(t, 'courierCompensationType', option)
    case 'defaultDietaryRestrictions':
      return enumLabel(t, 'dietaryRestriction', option)
    // Spec 0043 (review): the bar reads "Medium → Large", not the codes.
    case 'boxDefaultSize':
      return t(`settings.boxSize.${option}`, { defaultValue: option })
    // Row 80 review: the policy in the card's own words, not "SHORTAGE_ONLY → WHENEVER_FITS".
    case 'twoOrderPolicy':
      return t(`settings.twoOrderPolicy.${option}`, { defaultValue: option })
    // Row 81: the add on moment in the card's words too.
    case 'addOnMoment':
      return t(`settings.addOnMoment.${option}`, { defaultValue: option })
    default:
      return option
  }
}

// The section ids the pills at the top jump to, in page order (spec 0010, AC-1).
// `titleKey` is the translation key of the pill's words, looked up when the page is drawn.
export const SECTIONS = [
  { id: 'pricing', titleKey: 'settings.sections.pricing' },
  { id: 'matching', titleKey: 'settings.sections.matching' },
  { id: 'box', titleKey: 'settings.sections.box' },
  { id: 'fairness', titleKey: 'settings.sections.fairness' },
  { id: 'offers', titleKey: 'settings.sections.offers' },
  { id: 'two-orders', titleKey: 'settings.sections.twoOrders' },
  { id: 'rider-pay', titleKey: 'settings.sections.riderPay' },
  { id: 'removal-reasons', titleKey: 'settings.sections.removalReasons' },
  { id: 'restaurant-delays', titleKey: 'settings.sections.restaurantDelays' },
  { id: 'shifts', titleKey: 'settings.sections.shifts' },
  { id: 'time-worked', titleKey: 'settings.sections.timeWorked' },
  { id: 'review-requests', titleKey: 'settings.sections.reviewRequests' },
  { id: 'service-area', titleKey: 'settings.sections.serviceArea' },
  { id: 'instance', titleKey: 'settings.sections.instance' },
  { id: 'public-pages', titleKey: 'settings.sections.publicPages' },
  { id: 'change-history', titleKey: 'settings.sections.changeHistory' },
] as const

// One card of the page: an h2 title the pills link to, a line under it, the fields.
export function SettingsSection({
  id,
  title,
  description,
  children,
}: {
  id: string
  title: string
  description?: ReactNode
  children: ReactNode
}) {
  return (
    // A <section> named by its title is a landmark a screen reader can jump to; scroll-mt keeps
    // the title clear of the top edge when a pill jumps here.
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-4">
      <Card>
        <CardHeader>
          <h2 id={`${id}-title`} className="text-2xl font-semibold">
            {title}
          </h2>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
    </section>
  )
}

// A select fed by one of the backend's option lists. Its id is the setting's key, which also picks the
// words of each option (optionLabel above).
function OptionSelect({
  id,
  label,
  value,
  options,
  disabled,
  onChange,
}: {
  id: SettingKey
  label: string
  value: string
  options: string[] | undefined
  disabled: boolean
  onChange: (value: string) => void
}) {
  // useTranslation gives t, which looks a key up in the reader's language.
  const { t } = useTranslation()
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <NativeSelect id={id} value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)}>
        {/* A setting with no saved value shows "Not set" instead of looking like its first option. */}
        {value === '' && (
          <option value="" disabled>
            {t('settings.field.notSet')}
          </option>
        )}
        {(options ?? []).map((option) => (
          <option key={option} value={option}>
            {optionLabel(t, id, option)}
          </option>
        ))}
      </NativeSelect>
    </Field>
  )
}

// A number box holding the text typed; an emptied box stays empty, never 0 (row 56).
export function NumberField({
  id,
  label,
  value,
  description,
  error,
  disabled,
  min,
  max,
  onChange,
}: {
  id: string
  label: string
  value: string
  description?: ReactNode
  error?: string
  disabled: boolean
  min?: number
  max?: number
  onChange: (value: string) => void
}) {
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input
        id={id}
        type="number"
        min={min}
        max={max}
        step={1}
        value={value}
        disabled={disabled}
        aria-invalid={error ? true : undefined}
        onChange={(event) => onChange(event.target.value)}
      />
      {description && <FieldDescription>{description}</FieldDescription>}
      {error && <FieldError>{error}</FieldError>}
    </Field>
  )
}

// The distance unit's short word after a box's name, in the reader's language.
const unitWord = (t: TFunction, distanceUnit: string) =>
  t(distanceUnit === 'MILES' ? 'settings.field.unitMile' : 'settings.field.unitKm')

export function PricingCard({ form, set, options, loaded }: CardProps) {
  // useTranslation gives t (a key to words); useFormat's language sets how an amount reads.
  const { t } = useTranslation()
  const { language } = useFormat()
  const baseFee = parseQuoteRateInput(form.quoteBaseFee)
  const rate = parseQuoteRateInput(form.quoteRatePerDistanceUnit)
  // Spec 0041 (AC-8): said beside the fee, as well as in the save bar's list.
  const above = feeAboveCeiling(form)
  const feeError = loaded && above ? t('settings.pricing.aboveCeiling', { ceiling: above.ceiling }) : undefined
  return (
    <SettingsSection
      id="pricing"
      title={t('settings.sections.pricing')}
      description={t('settings.pricing.description')}
    >
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_minmax(16rem,22rem)]">
        <FieldGroup>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <NumberField
              id="quoteBaseFee"
              label={t('settings.field.withCents', { label: labelOf(t, 'quoteBaseFee') })}
              value={form.quoteBaseFee}
              min={0}
              disabled={!loaded}
              description={describeBaseFee(t, language, baseFee, form.currency)}
              error={loaded && baseFee === null ? CENTS_ERROR(t, labelOf(t, 'quoteBaseFee')) : undefined}
              onChange={(value) => set('quoteBaseFee', value)}
            />
            <NumberField
              id="quoteRatePerDistanceUnit"
              label={t('settings.field.withCents', { label: labelOf(t, 'quoteRatePerDistanceUnit', form) })}
              value={form.quoteRatePerDistanceUnit}
              min={0}
              disabled={!loaded}
              description={
                rate === null
                  ? t('settings.pricing.roadDistance')
                  : describeQuoteRate(t, language, rate, form.currency, form.distanceUnit)
              }
              error={loaded && rate === null ? CENTS_ERROR(t, labelOf(t, 'quoteRatePerDistanceUnit', form)) : undefined}
              onChange={(value) => set('quoteRatePerDistanceUnit', value)}
            />
            <NumberField
              id="feePercentageAmount"
              label={labelOf(t, 'feePercentageAmount')}
              value={form.feePercentageAmount}
              min={0}
              disabled={!loaded}
              description={
                // Only a ceiling the backend would accept (a whole number, 0 to 100) is named here (review).
                /^\d+$/.test(form.feePercentageCeiling.trim()) && Number(form.feePercentageCeiling.trim()) <= 100
                  ? t('settings.pricing.feeHelpWithCeiling', { ceiling: Number(form.feePercentageCeiling.trim()) })
                  : t('settings.pricing.feeHelp')
              }
              error={feeError}
              onChange={(value) => set('feePercentageAmount', value)}
            />
            {/* Spec 0041: the ceiling stops a typo (100 for 10) from raising every customer's price.
                Raising it is a second, deliberate edit when the assembly votes a higher fee. */}
            <NumberField
              id="feePercentageCeiling"
              label={labelOf(t, 'feePercentageCeiling')}
              value={form.feePercentageCeiling}
              min={0}
              max={100}
              disabled={!loaded}
              description={t('settings.pricing.ceilingHelp')}
              onChange={(value) => set('feePercentageCeiling', value)}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <OptionSelect
              id="currency"
              label={t('settings.labels.currency')}
              value={form.currency}
              options={options?.currency}
              disabled={!loaded}
              onChange={(value) => set('currency', value)}
            />
            <OptionSelect
              id="distanceUnit"
              label={t('settings.labels.distanceUnit')}
              value={form.distanceUnit}
              options={options?.distanceUnit}
              disabled={!loaded}
              onChange={(value) => set('distanceUnit', value)}
            />
            <OptionSelect
              id="quoteCalculationType"
              label={t('settings.labels.quoteCalculationType')}
              value={form.quoteCalculationType}
              options={options?.quoteCalculationType}
              disabled={!loaded}
              onChange={(value) => set('quoteCalculationType', value)}
            />
          </div>
        </FieldGroup>
        <PricingExample
          baseFeeText={form.quoteBaseFee}
          rateText={form.quoteRatePerDistanceUnit}
          feePercentText={form.feePercentageAmount}
          currency={form.currency}
          distanceUnit={form.distanceUnit}
        />
      </div>
    </SettingsSection>
  )
}

// The matcher options are worded in the co-op's words under settings.matcher (spec 0010, AC-7). None is
// "recommended": the assembly chooses, the app does not steer. Fixed test rider (STATIC) offers every delivery
// to one rider id set in the backend's code, a testing tool, not a way to assign by hand (row 179).
// FAIRNESS (spec 0044) is the co-op's weighted matcher; its weights are in the Fairness card.
export function MatchingCard({ form, set, options, loaded }: CardProps) {
  // useTranslation gives t, which looks a key up in the reader's language.
  const { t } = useTranslation()
  const unit = unitWord(t, form.distanceUnit)
  return (
    <SettingsSection id="matching" title={t('settings.sections.matching')}>
      <FieldGroup>
        <fieldset>
          <legend className="mb-3 text-sm font-medium">{labelOf(t, 'courierMatcherType')}</legend>
          <RadioGroup
            value={form.courierMatcherType}
            onValueChange={(value) => set('courierMatcherType', value)}
            disabled={!loaded}
            aria-label={t('settings.labels.courierMatcherType')}
            className="grid grid-cols-1 gap-3 md:grid-cols-3"
          >
            {(options?.courierMatcherType ?? []).map((option) => {
              // A matcher the backend added after these words: its code, with no line under it.
              const copy = {
                title: optionLabel(t, 'courierMatcherType', option),
                description: t(`settings.matcher.${option}.description`, { defaultValue: '' }),
              }
              return (
                <label
                  key={option}
                  htmlFor={`matcher-${option}`}
                  className="flex cursor-pointer items-start gap-3 rounded-xl border border-border p-4 has-[[data-state=checked]]:border-foreground"
                >
                  <RadioGroupItem id={`matcher-${option}`} value={option} className="mt-0.5" />
                  <span>
                    <span className="block text-sm font-medium">{copy.title}</span>
                    <span className="block text-sm text-muted-foreground">{copy.description}</span>
                  </span>
                </label>
              )
            })}
          </RadioGroup>
        </fieldset>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <NumberField
            id="maxAssignmentDistance"
            label={t('settings.field.withUnit', { label: labelOf(t, 'maxAssignmentDistance'), unit })}
            value={form.maxAssignmentDistance}
            min={0}
            disabled={!loaded}
            description={t('settings.matching.maxAssignmentHelp')}
            onChange={(value) => set('maxAssignmentDistance', value)}
          />
          <NumberField
            id="quoteExpirationMinutes"
            label={t('settings.matching.quoteValidFor')}
            value={form.quoteExpirationMinutes}
            min={0}
            disabled={!loaded}
            onChange={(value) => set('quoteExpirationMinutes', value)}
          />
          <NumberField
            id="maxDriftDistance"
            label={t('settings.field.withUnit', { label: labelOf(t, 'maxDriftDistance'), unit })}
            value={form.maxDriftDistance}
            min={0}
            disabled={!loaded}
            description={t('settings.matching.maxDriftHelp')}
            onChange={(value) => set('maxDriftDistance', value)}
          />
          {/* Spec 0021: the rider's app records an arrival within this distance of the restaurant or the
              customer. It sets no pay itself, but waiting pay (row 23) will start from the arrival. */}
          <NumberField
            id="arrivalRadiusMetres"
            label={labelOf(t, 'arrivalRadiusMetres')}
            value={form.arrivalRadiusMetres}
            min={0}
            max={300}
            disabled={!loaded}
            description={t('settings.matching.arrivalHelp')}
            onChange={(value) => set('arrivalRadiusMetres', value)}
          />
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <OptionSelect
            id="geoCalculationType"
            label={t('settings.labels.geoCalculationType')}
            value={form.geoCalculationType}
            options={options?.geoCalculationType}
            disabled={!loaded}
            onChange={(value) => set('geoCalculationType', value)}
          />
          <OptionSelect
            id="deliveryDurationCalculationType"
            label={t('settings.labels.deliveryDurationCalculationType')}
            value={form.deliveryDurationCalculationType}
            options={options?.deliveryDurationCalculationType}
            disabled={!loaded}
            onChange={(value) => set('deliveryDurationCalculationType', value)}
          />
        </div>
      </FieldGroup>
    </SettingsSection>
  )
}

// Spec 0043 (AC-2, AC-8): how much of a rider's box (always 100 units) each order size takes, and the
// size an order sent with none counts as. Placeholders until the field study (row 7) sets them.
// The sizes' words are under settings.boxSize.
const BOX_SIZES = ['SMALL', 'MEDIUM', 'LARGE']

export function BoxCard({ form, set, loaded }: CardProps) {
  // useTranslation gives t, which looks a key up in the reader's language.
  const { t } = useTranslation()
  // The same rule under each size: whole units of the rider's 100, never more than the next size up.
  const unitsHint = (size: string) => t('settings.box.unitsHint', { size: t(`settings.boxSize.${size}`) })
  return (
    <SettingsSection
      id="box"
      title={t('settings.sections.box')}
      description={t('settings.box.description')}
    >
      <FieldGroup>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <NumberField
            id="boxUnitsSmall"
            label={labelOf(t, 'boxUnitsSmall')}
            value={form.boxUnitsSmall}
            min={1}
            max={100}
            disabled={!loaded}
            description={unitsHint('SMALL')}
            onChange={(value) => set('boxUnitsSmall', value)}
          />
          <NumberField
            id="boxUnitsMedium"
            label={labelOf(t, 'boxUnitsMedium')}
            value={form.boxUnitsMedium}
            min={1}
            max={100}
            disabled={!loaded}
            description={unitsHint('MEDIUM')}
            onChange={(value) => set('boxUnitsMedium', value)}
          />
          <NumberField
            id="boxUnitsLarge"
            label={labelOf(t, 'boxUnitsLarge')}
            value={form.boxUnitsLarge}
            min={1}
            max={100}
            disabled={!loaded}
            description={t('settings.box.largeHelp')}
            onChange={(value) => set('boxUnitsLarge', value)}
          />
        </div>
        <OptionSelect
          id="boxDefaultSize"
          label={labelOf(t, 'boxDefaultSize')}
          value={form.boxDefaultSize}
          options={BOX_SIZES}
          disabled={!loaded}
          onChange={(value) => set('boxDefaultSize', value)}
        />
        <FieldDescription>{t('settings.box.defaultSizeHelp')}</FieldDescription>
      </FieldGroup>
    </SettingsSection>
  )
}

// Spec 0044 (AC-5): the fairness matcher's weights and its two limits. Only the weights' ratio matters;
// they are the co-op's, and a change applies to the next offer.
export function FairnessCard({ form, set, loaded }: CardProps) {
  // useTranslation gives t, which looks a key up in the reader's language.
  const { t } = useTranslation()
  return (
    <SettingsSection
      id="fairness"
      title={t('settings.sections.fairness')}
      description={t('settings.fairness.description')}
    >
      <FieldGroup>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <NumberField
            id="fairnessWeightRoadTime"
            label={labelOf(t, 'fairnessWeightRoadTime')}
            value={form.fairnessWeightRoadTime}
            min={0}
            max={100}
            disabled={!loaded}
            description={t('settings.fairness.roadTimeHelp')}
            onChange={(value) => set('fairnessWeightRoadTime', value)}
          />
          <NumberField
            id="fairnessWeightEarnings"
            label={labelOf(t, 'fairnessWeightEarnings')}
            value={form.fairnessWeightEarnings}
            min={0}
            max={100}
            disabled={!loaded}
            description={t('settings.fairness.earningsHelp')}
            onChange={(value) => set('fairnessWeightEarnings', value)}
          />
          <NumberField
            id="fairnessWeightWaiting"
            label={labelOf(t, 'fairnessWeightWaiting')}
            value={form.fairnessWeightWaiting}
            min={0}
            max={100}
            disabled={!loaded}
            description={t('settings.fairness.waitingHelp')}
            onChange={(value) => set('fairnessWeightWaiting', value)}
          />
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <NumberField
            id="fairnessCandidateLimit"
            label={labelOf(t, 'fairnessCandidateLimit')}
            value={form.fairnessCandidateLimit}
            min={1}
            max={50}
            disabled={!loaded}
            description={t('settings.fairness.candidateHelp')}
            onChange={(value) => set('fairnessCandidateLimit', value)}
          />
          <NumberField
            id="fairnessMinOnlineMinutes"
            label={labelOf(t, 'fairnessMinOnlineMinutes')}
            value={form.fairnessMinOnlineMinutes}
            min={0}
            max={240}
            disabled={!loaded}
            description={t('settings.fairness.minOnlineHelp')}
            onChange={(value) => set('fairnessMinOnlineMinutes', value)}
          />
        </div>
        {/* Spec 0049 (AC-1): the fourth weight, which applies only while Shifts is on. */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <NumberField
            id="fairnessWeightShift"
            label={labelOf(t, 'fairnessWeightShift')}
            value={form.fairnessWeightShift}
            min={0}
            max={100}
            disabled={!loaded}
            description={t('settings.fairness.shiftHelp')}
            onChange={(value) => set('fairnessWeightShift', value)}
          />
        </div>
      </FieldGroup>
    </SettingsSection>
  )
}

// Spec 0048 (AC-1): the two choices for when a pair may be offered (their plain words are under
// settings.twoOrderPolicy).
export const TWO_ORDER_POLICIES = ['SHORTAGE_ONLY', 'WHENEVER_FITS']

// Spec 0048 (row 81, AC-1): the three moments an add on may come, all the co-op's to choose (words under
// settings.addOnMoment).
export const ADD_ON_MOMENTS = ['BEFORE_PICKUP', 'BEFORE_DROPOFF', 'SAME_RESTAURANT']

// Spec 0048 (row 80, AC-1): two waiting orders offered together to one rider. Off until the assembly
// decides (binding value 2); the backend keeps every safety rule whatever is set here.
export function TwoOrdersCard({ form, set, loaded }: CardProps) {
  // useTranslation gives t, which looks a key up in the reader's language.
  const { t } = useTranslation()
  const notLoaded = form.stackingEnabled === null
  return (
    <SettingsSection
      id="two-orders"
      title={t('settings.sections.twoOrders')}
      description={t('settings.twoOrders.description')}
    >
      <FieldGroup>
        <Field>
          <div className="flex items-center gap-3">
            <Switch
              id="stackingEnabled"
              checked={form.stackingEnabled === true}
              disabled={!loaded || notLoaded}
              onCheckedChange={(checked: boolean) => set('stackingEnabled', checked)}
            />
            <FieldLabel htmlFor="stackingEnabled">{labelOf(t, 'stackingEnabled')}</FieldLabel>
            {notLoaded && <span className="text-sm text-muted-foreground">{t('common.notLoadedYet')}</span>}
          </div>
          <FieldDescription>{t('settings.twoOrders.stackingHelp')}</FieldDescription>
        </Field>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="twoOrderPolicy">{labelOf(t, 'twoOrderPolicy')}</FieldLabel>
            <NativeSelect
              id="twoOrderPolicy"
              value={form.twoOrderPolicy}
              disabled={!loaded || notLoaded}
              onChange={(event) => set('twoOrderPolicy', event.target.value)}
            >
              {form.twoOrderPolicy === '' && (
                <option value="" disabled>
                  {t('settings.field.notSet')}
                </option>
              )}
              {TWO_ORDER_POLICIES.map((value) => (
                <option key={value} value={value}>
                  {optionLabel(t, 'twoOrderPolicy', value)}
                </option>
              ))}
            </NativeSelect>
            {/* Review fix (row 81, values 1 and 2): the one consequence of this choice that takes work from members
                who are waiting is said plainly, so a representative carries the assembly's vote knowingly. */}
            <FieldDescription>{t('settings.twoOrders.policyHelp')}</FieldDescription>
          </Field>
          <NumberField
            id="twoOrderDelayLimitMinutes"
            label={labelOf(t, 'twoOrderDelayLimitMinutes')}
            value={form.twoOrderDelayLimitMinutes}
            min={0}
            max={30}
            disabled={!loaded || notLoaded}
            description={t('settings.twoOrders.delayHelp')}
            onChange={(value) => set('twoOrderDelayLimitMinutes', value)}
          />
          {/* Row 147: how long a declined or missed pair stays apart; 0 means no block. */}
          <NumberField
            id="stackPairBlockMinutes"
            label={labelOf(t, 'stackPairBlockMinutes')}
            value={form.stackPairBlockMinutes}
            min={0}
            max={60}
            disabled={!loaded || notLoaded}
            description={t('settings.twoOrders.pairBlockHelp')}
            onChange={(value) => set('stackPairBlockMinutes', value)}
          />
        </div>
        <Field>
          <div className="flex items-center gap-3">
            <Switch
              id="addOnOffersEnabled"
              checked={form.addOnOffersEnabled === true}
              disabled={!loaded || form.addOnOffersEnabled === null}
              onCheckedChange={(checked: boolean) => set('addOnOffersEnabled', checked)}
            />
            <FieldLabel htmlFor="addOnOffersEnabled">{labelOf(t, 'addOnOffersEnabled')}</FieldLabel>
            {form.addOnOffersEnabled === null && (
              <span className="text-sm text-muted-foreground">{t('common.notLoadedYet')}</span>
            )}
          </div>
          <FieldDescription>{t('settings.twoOrders.addOnHelp')}</FieldDescription>
        </Field>
        <Field>
          <FieldLabel htmlFor="addOnMoment">{labelOf(t, 'addOnMoment')}</FieldLabel>
          <NativeSelect
            id="addOnMoment"
            value={form.addOnMoment}
            disabled={!loaded || form.addOnOffersEnabled === null}
            onChange={(event) => set('addOnMoment', event.target.value)}
          >
            {form.addOnMoment === '' && (
              <option value="" disabled>
                {t('settings.field.notSet')}
              </option>
            )}
            {ADD_ON_MOMENTS.map((value) => (
              <option key={value} value={value}>
                {optionLabel(t, 'addOnMoment', value)}
              </option>
            ))}
          </NativeSelect>
          <FieldDescription>{t('settings.twoOrders.addOnMomentHelp')}</FieldDescription>
        </Field>
      </FieldGroup>
    </SettingsSection>
  )
}

export function OffersCard({ form, set, loaded }: CardProps) {
  // useTranslation gives t, which looks a key up in the reader's language.
  const { t } = useTranslation()
  const notLoaded = form.offerExpiryEnabled === null
  return (
    <SettingsSection id="offers" title={t('settings.sections.offers')} description={t('settings.offers.description')}>
      <FieldGroup>
        <Field>
          <div className="flex items-center gap-3">
            <Switch
              id="offerExpiryEnabled"
              checked={form.offerExpiryEnabled === true}
              disabled={!loaded || notLoaded}
              onCheckedChange={(checked: boolean) => set('offerExpiryEnabled', checked)}
            />
            <FieldLabel htmlFor="offerExpiryEnabled">{labelOf(t, 'offerExpiryEnabled')}</FieldLabel>
            {notLoaded && <span className="text-sm text-muted-foreground">{t('common.notLoadedYet')}</span>}
          </div>
          <FieldDescription>{describeOfferExpiry(form.offerExpiryEnabled, form.offerExpirySeconds, t)}</FieldDescription>
        </Field>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <NumberField
            id="offerExpirySeconds"
            label={t('settings.labels.offerExpirySeconds')}
            value={form.offerExpirySeconds}
            min={20}
            max={300}
            disabled={!loaded || notLoaded}
            description={t('settings.offers.expirySecondsHelp')}
            onChange={(value) => set('offerExpirySeconds', value)}
          />
          <NumberField
            id="noCourierRetrySeconds"
            label={t('settings.labels.noCourierRetrySeconds')}
            value={form.noCourierRetrySeconds}
            min={10}
            max={300}
            disabled={!loaded || notLoaded}
            description={t('settings.offers.retryHelp')}
            onChange={(value) => set('noCourierRetrySeconds', value)}
          />
          {/* Spec 0020: the free hand back. It does not depend on Offer expiry, so only loading turns it off. */}
          <NumberField
            id="handBackSeconds"
            label={labelOf(t, 'handBackSeconds')}
            value={form.handBackSeconds}
            min={0}
            max={300}
            disabled={!loaded}
            description={t('settings.offers.handBackHelp')}
            onChange={(value) => set('handBackSeconds', value)}
          />
          {/* Row 144: how long a rider who declined or missed an offer is skipped. Used with expiry on or off. */}
          <NumberField
            id="offerSkipMinutes"
            label={labelOf(t, 'offerSkipMinutes')}
            value={form.offerSkipMinutes}
            min={1}
            max={60}
            disabled={!loaded}
            description={t('settings.offers.offerSkipHelp')}
            onChange={(value) => set('offerSkipMinutes', value)}
          />
        </div>

        {/* Spec 0031: off until the assembly decides. The matching algorithm is the pay structure. */}
        <Field>
          <div className="flex items-center gap-3">
            <Switch
              id="offerTimingEnabled"
              checked={form.offerTimingEnabled === true}
              disabled={!loaded || form.offerTimingEnabled === null}
              onCheckedChange={(checked: boolean) => set('offerTimingEnabled', checked)}
            />
            <FieldLabel htmlFor="offerTimingEnabled">{labelOf(t, 'offerTimingEnabled')}</FieldLabel>
            {form.offerTimingEnabled === null && (
              <span className="text-sm text-muted-foreground">{t('common.notLoadedYet')}</span>
            )}
          </div>
          <FieldDescription>{t('settings.offers.timingHelp')}</FieldDescription>
        </Field>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <NumberField
            id="offerLeadMinutes"
            label={labelOf(t, 'offerLeadMinutes')}
            value={form.offerLeadMinutes}
            min={0}
            max={30}
            disabled={!loaded || form.offerTimingEnabled === null}
            description={t('settings.offers.leadHelp')}
            onChange={(value) => set('offerLeadMinutes', value)}
          />
          <NumberField
            id="offerTimingCandidates"
            label={labelOf(t, 'offerTimingCandidates')}
            value={form.offerTimingCandidates}
            min={1}
            max={20}
            disabled={!loaded || form.offerTimingEnabled === null}
            description={t('settings.offers.candidatesHelp')}
            onChange={(value) => set('offerTimingCandidates', value)}
          />
        </div>
      </FieldGroup>
    </SettingsSection>
  )
}

// Restaurant delays (spec 0033): what happens when a restaurant keeps a rider past its promised time.
// Its own section, as the operator asked (decision 23.7): it is pay, but set on the restaurant's account.
export function RestaurantDelaysCard({ form, set, loaded }: CardProps) {
  // useTranslation gives t, which looks a key up in the reader's language.
  const { t } = useTranslation()
  const notLoaded = form.waitPayEnabled === null
  return (
    <SettingsSection
      id="restaurant-delays"
      title={t('settings.sections.restaurantDelays')}
      description={t('settings.restaurantDelays.description')}
    >
      <FieldGroup>
        <Field>
          <div className="flex items-center gap-3">
            <Switch
              id="waitPayEnabled"
              checked={form.waitPayEnabled === true}
              disabled={!loaded || notLoaded}
              onCheckedChange={(checked: boolean) => set('waitPayEnabled', checked)}
            />
            <FieldLabel htmlFor="waitPayEnabled">{labelOf(t, 'waitPayEnabled')}</FieldLabel>
            {notLoaded && <span className="text-sm text-muted-foreground">{t('common.notLoadedYet')}</span>}
          </div>
          <FieldDescription>{t('settings.restaurantDelays.waitPayHelp')}</FieldDescription>
        </Field>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <NumberField
            id="waitPayFreeMinutes"
            label={labelOf(t, 'waitPayFreeMinutes')}
            value={form.waitPayFreeMinutes}
            min={0}
            max={60}
            disabled={!loaded || notLoaded}
            description={t('settings.restaurantDelays.freeMinutesHelp')}
            onChange={(value) => set('waitPayFreeMinutes', value)}
          />
          <NumberField
            id="waitPayCentsPerMinute"
            label={labelOf(t, 'waitPayCentsPerMinute')}
            value={form.waitPayCentsPerMinute}
            min={0}
            max={200}
            disabled={!loaded || notLoaded}
            description={t('settings.restaurantDelays.centsPerMinuteHelp')}
            onChange={(value) => set('waitPayCentsPerMinute', value)}
          />
          <NumberField
            id="waitLimitMinutes"
            label={labelOf(t, 'waitLimitMinutes')}
            value={form.waitLimitMinutes}
            min={1}
            max={60}
            disabled={!loaded || notLoaded}
            description={t('settings.restaurantDelays.waitLimitHelp')}
            onChange={(value) => set('waitLimitMinutes', value)}
          />
          {/* Spec 0047 (AC-2): a rider who flagged an order that does not fit one box. */}
          <NumberField
            id="splitAnswerMinutes"
            label={labelOf(t, 'splitAnswerMinutes')}
            value={form.splitAnswerMinutes}
            min={1}
            max={60}
            disabled={!loaded || notLoaded}
            description={t('settings.restaurantDelays.splitAnswerHelp')}
            onChange={(value) => set('splitAnswerMinutes', value)}
          />
        </div>
      </FieldGroup>
    </SettingsSection>
  )
}

// Shifts (spec 0026, row 77): the co-op switch and the drop notice. The slots themselves are edited on
// the Shift slots page. Nothing reaches riders until shift booking (row 78) is built.
export function ShiftsCard({ form, set, loaded }: CardProps) {
  // useTranslation gives t, which looks a key up in the reader's language.
  const { t } = useTranslation()
  const notLoaded = form.shiftsEnabled === null
  return (
    <SettingsSection id="shifts" title={t('settings.sections.shifts')} description={t('settings.shifts.description')}>
      <FieldGroup>
        <Field>
          <div className="flex items-center gap-3">
            <Switch
              id="shiftsEnabled"
              checked={form.shiftsEnabled === true}
              disabled={!loaded || notLoaded}
              onCheckedChange={(checked: boolean) => set('shiftsEnabled', checked)}
            />
            <FieldLabel htmlFor="shiftsEnabled">{labelOf(t, 'shiftsEnabled')}</FieldLabel>
            {notLoaded && <span className="text-sm text-muted-foreground">{t('common.notLoadedYet')}</span>}
          </div>
          <FieldDescription>
            {form.shiftsEnabled === true ? t('settings.shifts.onHelp') : t('settings.shifts.offHelp')}
            <Link href="/shift-slots" className="underline underline-offset-2">
              {t('settings.shifts.slotsLink')}
            </Link>
            {'.'}
          </FieldDescription>
        </Field>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <NumberField
            id="shiftDropNoticeHours"
            label={labelOf(t, 'shiftDropNoticeHours')}
            value={form.shiftDropNoticeHours}
            min={0}
            max={168}
            disabled={!loaded}
            description={t('settings.shifts.dropNoticeHelp')}
            onChange={(value) => set('shiftDropNoticeHours', value)}
          />
        </div>
      </FieldGroup>
    </SettingsSection>
  )
}

// Spec 0040 (AC-17): how a rider's worked shifts are cut. An Offline with no job shorter than this is a
// break inside the shift; this long or longer ends it. A change recomputes past shifts too (AC-9).
export function TimeWorkedCard({ form, set, loaded }: CardProps) {
  // useTranslation gives t, which looks a key up in the reader's language.
  const { t } = useTranslation()
  return (
    <SettingsSection
      id="time-worked"
      title={t('settings.sections.timeWorked')}
      description={t('settings.timeWorked.description')}
    >
      <FieldGroup>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <NumberField
            id="shiftBreakMinutes"
            label={labelOf(t, 'shiftBreakMinutes')}
            value={form.shiftBreakMinutes}
            min={0}
            max={240}
            disabled={!loaded}
            description={t('settings.timeWorked.breakHelp')}
            onChange={(value) => set('shiftBreakMinutes', value)}
          />
        </div>
      </FieldGroup>
    </SettingsSection>
  )
}

// Spec 0038 (AC-3, AC-7): how long a person has to answer a rider's review request, and the most a
// "changed" answer may add to a rider's pay. Nothing ever answers a request on its own.
export function ReviewRequestsCard({ form, set, loaded }: CardProps) {
  // useTranslation gives t, which looks a key up in the reader's language.
  const { t } = useTranslation()
  return (
    <SettingsSection
      id="review-requests"
      title={t('settings.sections.reviewRequests')}
      description={
        <>
          {t('settings.reviewRequests.description')}{' '}
          <Link href="/reviews" className="underline underline-offset-2">
            {t('settings.reviewRequests.reviewsLink')}
          </Link>
          {'.'}
        </>
      }
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <NumberField
          id="reviewAnswerDays"
          label={labelOf(t, 'reviewAnswerDays')}
          value={form.reviewAnswerDays}
          min={1}
          max={14}
          disabled={!loaded}
          description={t('settings.reviewRequests.answerDaysHelp')}
          onChange={(value) => set('reviewAnswerDays', value)}
        />
        <NumberField
          id="reviewCorrectionMaxCents"
          label={labelOf(t, 'reviewCorrectionMaxCents')}
          value={form.reviewCorrectionMaxCents}
          min={1}
          max={100000}
          disabled={!loaded}
          description={t('settings.reviewRequests.correctionHelp')}
          onChange={(value) => set('reviewCorrectionMaxCents', value)}
        />
      </div>
    </SettingsSection>
  )
}

// `policyEditor` is today's dropped rider pay editor, with its own Save (spec 0010, AC-8).
// `payoutPolicies` is that editor's saved menu ({ policy: percent }), which the cancelled job pay
// chooses from (spec 0015), so the percentages the co-op sets stay in one place.
export function RiderPayCard({
  form,
  set,
  options,
  loaded,
  policyEditor,
  payoutPolicies,
}: CardProps & { policyEditor: ReactNode; payoutPolicies: Record<string, number> | undefined }) {
  // useTranslation gives t, which looks a key up in the reader's language.
  const { t } = useTranslation()
  const menu = payoutPolicies ?? {}
  const current = form.cancellationPayoutPolicy
  return (
    <SettingsSection id="rider-pay" title={t('settings.sections.riderPay')} description={t('settings.riderPay.description')}>
      <FieldGroup>
        {policyEditor}
        <Field>
          <FieldLabel htmlFor="cancellationPayoutPolicy">{labelOf(t, 'cancellationPayoutPolicy')}</FieldLabel>
          <NativeSelect
            id="cancellationPayoutPolicy"
            className="max-w-sm"
            value={form.cancellationPayoutPolicy}
            disabled={!loaded}
            onChange={(event) => set('cancellationPayoutPolicy', event.target.value)}
          >
            {current === '' && (
              <option value="" disabled>
                {t('settings.field.notSet')}
              </option>
            )}
            {Object.entries(menu).map(([policy, percent]) => (
              <option key={policy} value={policy}>
                {t('settings.riderPay.policyOption', { policy, percent })}
              </option>
            ))}
            {/* The rule in force may have left the menu (riders are then paid in full, with a warning
                in the log): show it as itself, so the box never shows one policy while holding
                another (row 32 review). */}
            {current !== '' && !Object.prototype.hasOwnProperty.call(menu, current) && (
              <option value={current} disabled>
                {t('settings.riderPay.offMenu', { policy: current })}
              </option>
            )}
          </NativeSelect>
          <FieldDescription>{t('settings.riderPay.cancellationHelp')}</FieldDescription>
        </Field>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <NumberField
            id="defaultCourierPayRate"
            label={t('settings.labels.defaultCourierPayRate')}
            value={form.defaultCourierPayRate}
            min={0}
            disabled={!loaded}
            onChange={(value) => set('defaultCourierPayRate', value)}
          />
          <NumberField
            id="defaultMaxWorkingHours"
            label={t('settings.labels.defaultMaxWorkingHours')}
            value={form.defaultMaxWorkingHours}
            min={0}
            disabled={!loaded}
            onChange={(value) => set('defaultMaxWorkingHours', value)}
          />
          <OptionSelect
            id="courierCompensationCalculationType"
            label={t('settings.labels.courierCompensationCalculationType')}
            value={form.courierCompensationCalculationType}
            options={options?.courierCompensationCalculationType}
            disabled={!loaded}
            onChange={(value) => set('courierCompensationCalculationType', value)}
          />
        </div>
      </FieldGroup>
    </SettingsSection>
  )
}

// `map` is the drawing tool, made by the page (it loads only in the browser).
export function ServiceAreaCard({ map }: { map: ReactNode }) {
  // useTranslation gives t, which looks a key up in the reader's language.
  const { t } = useTranslation()
  return (
    <SettingsSection
      id="service-area"
      title={t('settings.sections.serviceArea')}
      description={t('settings.serviceArea.description')}
    >
      <div className="max-w-4xl">{map}</div>
    </SettingsSection>
  )
}

export function InstanceCard({
  form,
  set,
  options,
  loaded,
  saved,
  linkLocked,
}: CardProps & { linkLocked: boolean }) {
  // useTranslation gives t, which looks a key up in the reader's language.
  const { t } = useTranslation()
  const urlError = (key: SettingKey, value: string) =>
    value && !isValidURL(sanitizeURL(value)) ? urlErrorText(t, labelOf(t, key)) : undefined
  return (
    <SettingsSection id="instance" title={t('settings.sections.instance')} description={t('settings.instance.description')}>
      <FieldGroup>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="instanceName">{labelOf(t, 'name')}</FieldLabel>
            <Input
              id="instanceName"
              value={form.name}
              disabled={!loaded}
              onChange={(event) => set('name', event.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="link">{labelOf(t, 'link')}</FieldLabel>
            <Input
              id="link"
              value={form.link}
              disabled={!loaded || linkLocked}
              aria-invalid={urlError('link', form.link) ? true : undefined}
              onChange={(event) => set('link', event.target.value)}
            />
            <FieldDescription>
              {linkLocked ? t('settings.instance.linkLocked') : t('settings.instance.linkUnlocked')}
            </FieldDescription>
            {urlError('link', form.link) && <FieldError>{urlError('link', form.link)}</FieldError>}
          </Field>
          <Field>
            <FieldLabel htmlFor="websocketLink">{labelOf(t, 'websocketLink')}</FieldLabel>
            <Input
              id="websocketLink"
              value={form.websocketLink}
              disabled={!loaded}
              aria-invalid={urlError('websocketLink', form.websocketLink) ? true : undefined}
              onChange={(event) => set('websocketLink', event.target.value)}
            />
            {urlError('websocketLink', form.websocketLink) && <FieldError>{urlError('websocketLink', form.websocketLink)}</FieldError>}
          </Field>
          <Field>
            <FieldLabel htmlFor="imageUrl">{labelOf(t, 'imageUrl')}</FieldLabel>
            <Input
              id="imageUrl"
              value={form.imageUrl}
              disabled={!loaded}
              aria-invalid={urlError('imageUrl', form.imageUrl) ? true : undefined}
              onChange={(event) => set('imageUrl', event.target.value)}
            />
            {urlError('imageUrl', form.imageUrl) && <FieldError>{urlError('imageUrl', form.imageUrl)}</FieldError>}
          </Field>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="defaultDietaryRestrictions">{labelOf(t, 'defaultDietaryRestrictions')}</FieldLabel>
            <NativeSelect
              id="defaultDietaryRestrictions"
              multiple
              className="h-auto py-2"
              value={form.defaultDietaryRestrictions}
              disabled={!loaded}
              onChange={(event) =>
                set(
                  'defaultDietaryRestrictions',
                  Array.from(event.target.selectedOptions, (option) => option.value),
                )
              }
            >
              {(options?.defaultDietaryRestrictions ?? []).map((option) => (
                <option key={option} value={option}>
                  {optionLabel(t, 'defaultDietaryRestrictions', option)}
                </option>
              ))}
            </NativeSelect>
            <FieldDescription>{t('settings.instance.dietaryHelp')}</FieldDescription>
          </Field>
          <NumberField
            id="savedCustomerRetentionMonths"
            label={labelOf(t, 'savedCustomerRetentionMonths')}
            value={form.savedCustomerRetentionMonths}
            min={1}
            max={36}
            disabled={!loaded}
            description={t('settings.instance.savedCustomerHelp')}
            onChange={(value) => set('savedCustomerRetentionMonths', value)}
          />
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* Spec 0017: how far back a restaurant sees its own orders on My Orders. */}
          <NumberField
            id="restaurantHistoryDays"
            label={labelOf(t, 'restaurantHistoryDays')}
            value={form.restaurantHistoryDays}
            min={1}
            max={365}
            disabled={!loaded}
            description={t('settings.instance.historyHelp')}
            onChange={(value) => set('restaurantHistoryDays', value)}
          />
          {/* Spec 0022: the positions a rider's phone shares during an SOS are personal data, kept only
              this long after the incident's last position, then deleted by a daily job (value 5). */}
          <NumberField
            id="sosLocationRetentionDays"
            label={labelOf(t, 'sosLocationRetentionDays')}
            value={form.sosLocationRetentionDays}
            min={1}
            max={365}
            disabled={!loaded}
            description={t('settings.instance.sosHelp')}
            onChange={(value) => set('sosLocationRetentionDays', value)}
          />
          {/* Spec 0053 (AC-6): the period row 46's lawyer confirms. Riders see it on How notes work. */}
          <NumberField
            id="addressNoteRetentionDays"
            label={labelOf(t, 'addressNoteRetentionDays')}
            value={form.addressNoteRetentionDays}
            min={30}
            max={730}
            disabled={!loaded}
            description={t('settings.instance.addressNoteHelp')}
            onChange={(value) => set('addressNoteRetentionDays', value)}
          />
          {/* Row 72: the number riders call in one tap from the job screen. */}
          <Field>
            <FieldLabel htmlFor="dispatchPhoneNumber">{labelOf(t, 'dispatchPhoneNumber')}</FieldLabel>
            <Input
              id="dispatchPhoneNumber"
              type="tel"
              autoComplete="off"
              placeholder="+30 24210 12345"
              value={form.dispatchPhoneNumber}
              disabled={!loaded}
              onChange={(event) => set('dispatchPhoneNumber', event.target.value)}
            />
            <FieldDescription>{t('settings.instance.phoneHelp')}</FieldDescription>
          </Field>
        </div>
        {/* Chat (spec 0034, AC-13 and AC-18): the one tap presets above each message box, and how long
            messages are kept. Since spec 0054 (AC-7) each preset is a Greek and English pair. */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <PresetsField
            id="chatQuickRepliesCourier"
            label={labelOf(t, 'chatQuickRepliesCourier')}
            value={form.chatQuickRepliesCourier}
            saved={saved?.chatQuickRepliesCourier}
            disabled={!loaded}
            description={t('settings.instance.presetsCourierHelp')}
            onChange={(value) => set('chatQuickRepliesCourier', value)}
          />
          <PresetsField
            id="chatQuickRepliesDispatch"
            label={labelOf(t, 'chatQuickRepliesDispatch')}
            value={form.chatQuickRepliesDispatch}
            saved={saved?.chatQuickRepliesDispatch}
            disabled={!loaded}
            description={t('settings.instance.presetsDispatchHelp')}
            onChange={(value) => set('chatQuickRepliesDispatch', value)}
          />
          <NumberField
            id="chatRetentionDays"
            label={labelOf(t, 'chatRetentionDays')}
            value={form.chatRetentionDays}
            min={7}
            max={365}
            disabled={!loaded}
            description={t('settings.instance.chatRetentionHelp')}
            onChange={(value) => set('chatRetentionDays', value)}
          />
        </div>
      </FieldGroup>
    </SettingsSection>
  )
}

export type PublicPage = 'rules' | 'description' | 'terms-of-service' | 'privacy-policy'

// The four public pages: where each text lives in `details`, and the keys of its name, where it shows
// and its editor's placeholder (translated when drawn). One table for the card and the page (row 87 review).
export const PUBLIC_PAGES: {
  view: PublicPage
  key: string
  titleKey: string
  whereKey?: string
  placeholderKey: string
}[] = [
  {
    view: 'rules',
    key: 'rulesContent',
    titleKey: 'settings.publicPages.rules.title',
    whereKey: 'settings.publicPages.rules.where',
    placeholderKey: 'settings.publicPages.rules.placeholder',
  },
  {
    view: 'description',
    key: 'descriptionContent',
    titleKey: 'settings.publicPages.description.title',
    whereKey: 'settings.publicPages.description.where',
    placeholderKey: 'settings.publicPages.description.placeholder',
  },
  {
    view: 'terms-of-service',
    key: 'termsOfServiceContent',
    titleKey: 'settings.publicPages.termsOfService.title',
    placeholderKey: 'settings.publicPages.termsOfService.placeholder',
  },
  {
    view: 'privacy-policy',
    key: 'privacyPolicyContent',
    titleKey: 'settings.publicPages.privacyPolicy.title',
    placeholderKey: 'settings.publicPages.privacyPolicy.placeholder',
  },
]

export function PublicPagesCard({ onEdit }: { onEdit: (view: PublicPage) => void }) {
  // useTranslation gives t, which looks a key up in the reader's language.
  const { t } = useTranslation()
  return (
    <SettingsSection id="public-pages" title={t('settings.sections.publicPages')}>
      <ul className="flex flex-col gap-2">
        {PUBLIC_PAGES.map((page) => (
          <li
            key={page.view}
            className="flex items-center justify-between gap-4 rounded-lg border border-border px-4 py-3"
          >
            <div>
              <p className="text-sm font-medium">{t(page.titleKey)}</p>
              {page.whereKey && <p className="text-sm text-muted-foreground">{t(page.whereKey)}</p>}
            </div>
            <Button type="button" variant="outline" size="sm" onClick={() => onEdit(page.view)}>
              {t('common.edit')} <span className="sr-only">{t(page.titleKey)}</span>
            </Button>
          </li>
        ))}
      </ul>
    </SettingsSection>
  )
}

// A chat preset list (spec 0034, AC-13), each preset a pair since spec 0054 (AC-7): its Greek and its
// English side by side, with Add and Remove. The settings coverage guard finds this control by its own
// name, <PresetsField>, and its `value` binding. A new or edited row needs both halves; an old row kept
// exactly as `saved` holds it (Greek only, from before pairs) may stay until someone edits it.
function PresetsField({
  id,
  label,
  value,
  saved,
  disabled,
  description,
  onChange,
}: {
  id: string
  label: string
  value: ChatPreset[]
  saved: ChatPreset[] | null | undefined
  disabled: boolean
  description: string
  onChange: (value: ChatPreset[]) => void
}) {
  // useTranslation gives t, which looks a key up in the reader's language.
  const { t } = useTranslation()
  const incomplete = new Set(incompletePresetRows(value, saved))
  // Each change makes a new list (React state is never changed in place), with one half of one row replaced.
  const setHalf = (index: number, half: 'el' | 'en', text: string) =>
    onChange(value.map((row, at) => (at === index ? { ...row, [half]: text } : row)))
  const remove = (index: number) => onChange(value.filter((_row, at) => at !== index))
  const add = () => onChange([...value, { el: '', en: '' }])

  return (
    <Field>
      {/* A group named by its label: the boxes inside are named one by one. */}
      <div role="group" aria-labelledby={`${id}-label`} className="flex flex-col gap-2">
        <span id={`${id}-label`} className="text-sm font-medium leading-none">
          {label}
        </span>
        {value.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('settings.presets.none')}</p>
        ) : (
          <>
            <div aria-hidden="true" className="hidden grid-cols-[1fr_1fr_auto] gap-2 text-xs text-muted-foreground sm:grid">
              <span>{t('settings.presets.greek')}</span>
              <span>{t('settings.presets.english')}</span>
              <span className="w-[4.5rem]" />
            </div>
            <ul className="flex flex-col gap-2">
              {value.map((row, index) => {
                const number = index + 1
                const errorId = `${id}-${index}-error`
                const missing = incomplete.has(index)
                return (
                  // The index is the row's key: rows have no id, and a removal redraws the rows after it.
                  <li key={index} className="flex flex-col gap-1">
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_auto]">
                      <Input
                        id={`${id}-${index}-el`}
                        lang="el"
                        value={row.el}
                        disabled={disabled}
                        aria-label={t('settings.presets.greekOf', { number })}
                        aria-invalid={missing && row.el.trim() === '' ? true : undefined}
                        aria-describedby={missing ? errorId : undefined}
                        onChange={(event) => setHalf(index, 'el', event.target.value)}
                      />
                      <Input
                        id={`${id}-${index}-en`}
                        lang="en"
                        value={row.en}
                        disabled={disabled}
                        aria-label={t('settings.presets.englishOf', { number })}
                        aria-invalid={missing && row.en.trim() === '' ? true : undefined}
                        aria-describedby={missing ? errorId : undefined}
                        onChange={(event) => setHalf(index, 'en', event.target.value)}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={disabled}
                        aria-label={t('settings.presets.removeOf', { number })}
                        onClick={() => remove(index)}
                      >
                        {t('settings.presets.remove')}
                      </Button>
                    </div>
                    {missing && <FieldError id={errorId}>{t('settings.presets.bothNeeded')}</FieldError>}
                  </li>
                )
              })}
            </ul>
          </>
        )}
        <div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={disabled || value.length >= QUICK_REPLIES_MAX_ENTRIES}
            onClick={add}
          >
            {t('settings.presets.add')}
          </Button>
        </div>
      </div>
      <FieldDescription>{description}</FieldDescription>
    </Field>
  )
}
