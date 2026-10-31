import type { ReactNode } from 'react'
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
import {
  COURIER_DELIVERY_COMPENSATION_TYPE_TO_HUMAN,
  COURIER_DIETARY_RESTRICTIONS_TO_HUMAN,
  CURRENCY_TO_HUMAN,
  DELIVERY_DURATION_CALCULATION_TYPE_TO_HUMAN,
  DISTANCE_UNIT_TO_HUMAN,
  GEO_CALCULATION_TYPE_TO_HUMAN,
  QUOTE_CALCULATION_TYPE_TO_HUMAN,
} from '@/shared-types'
import { describeBaseFee } from '@/utils/baseFee'
import { describeOfferExpiry } from '@/utils/offerExpiry'
import { describeQuoteRate, parseQuoteRateInput } from '@/utils/quoteRate'
import { PricingExample } from '../PricingExample'
import { CENTS_ERROR, isValidURL, sanitizeURL, type SettingKey, type SettingsForm } from '../settingsDiff'

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
}

// The section ids the pills at the top jump to, in page order (spec 0010, AC-1).
export const SECTIONS = [
  { id: 'pricing', title: 'Pricing' },
  { id: 'matching', title: 'Matching' },
  { id: 'offers', title: 'Offers' },
  { id: 'rider-pay', title: 'Rider pay' },
  { id: 'service-area', title: 'Service area' },
  { id: 'instance', title: 'Instance' },
  { id: 'public-pages', title: 'Public pages' },
] as const

// One card of the page: an h2 title the pills link to, a line under it, the fields.
function SettingsSection({
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
    // scroll-mt keeps the title clear of the top edge when a pill jumps here.
    <Card id={id} aria-labelledby={`${id}-title`} className="scroll-mt-4">
      <CardHeader>
        <h2 id={`${id}-title`} className="text-2xl font-semibold">
          {title}
        </h2>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

// A select fed by one of the backend's option lists, with its labels.
function OptionSelect({
  id,
  label,
  value,
  options,
  labels,
  disabled,
  onChange,
}: {
  id: string
  label: string
  value: string
  options: string[] | undefined
  labels: Record<string, string>
  disabled: boolean
  onChange: (value: string) => void
}) {
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <NativeSelect id={id} value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)}>
        {(options ?? []).map((option) => (
          <option key={option} value={option}>
            {labels[option] ?? option}
          </option>
        ))}
      </NativeSelect>
    </Field>
  )
}

// A number box holding the text typed; an emptied box stays empty, never 0 (row 56).
function NumberField({
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

const unitWord = (distanceUnit: string) => (distanceUnit === 'MILES' ? 'mile' : 'km')

export function PricingCard({ form, set, options, loaded }: CardProps) {
  const baseFee = parseQuoteRateInput(form.quoteBaseFee)
  const rate = parseQuoteRateInput(form.quoteRatePerDistanceUnit)
  return (
    <SettingsSection
      id="pricing"
      title="Pricing"
      description="Changes apply to new quotes only. Deliveries already quoted keep their price."
    >
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_minmax(16rem,22rem)]">
        <FieldGroup>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <NumberField
              id="quoteBaseFee"
              label="Base fee (cents)"
              value={form.quoteBaseFee}
              min={0}
              disabled={!loaded}
              description={describeBaseFee(baseFee, form.currency)}
              error={loaded && baseFee === null ? CENTS_ERROR('Base fee') : undefined}
              onChange={(value) => set('quoteBaseFee', value)}
            />
            <NumberField
              id="quoteRatePerDistanceUnit"
              label={`Per ${unitWord(form.distanceUnit)} (cents)`}
              value={form.quoteRatePerDistanceUnit}
              min={0}
              disabled={!loaded}
              description={rate === null ? 'Road distance.' : describeQuoteRate(rate, form.currency, form.distanceUnit)}
              error={loaded && rate === null ? CENTS_ERROR('Per distance rate') : undefined}
              onChange={(value) => set('quoteRatePerDistanceUnit', value)}
            />
            <NumberField
              id="feePercentageAmount"
              label="Co-op fee (%)"
              value={form.feePercentageAmount}
              min={0}
              disabled={!loaded}
              description="On top of the rider's pay."
              onChange={(value) => set('feePercentageAmount', value)}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <OptionSelect
              id="currency"
              label="Currency"
              value={form.currency}
              options={options?.currency}
              labels={CURRENCY_TO_HUMAN}
              disabled={!loaded}
              onChange={(value) => set('currency', value)}
            />
            <OptionSelect
              id="distanceUnit"
              label="Distance unit"
              value={form.distanceUnit}
              options={options?.distanceUnit}
              labels={DISTANCE_UNIT_TO_HUMAN}
              disabled={!loaded}
              onChange={(value) => set('distanceUnit', value)}
            />
            <OptionSelect
              id="quoteCalculationType"
              label="Quote calculation"
              value={form.quoteCalculationType}
              options={options?.quoteCalculationType}
              labels={QUOTE_CALCULATION_TYPE_TO_HUMAN}
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

// The matcher options in the co-op's words (spec 0010, AC-7). None is "recommended": the
// assembly chooses, the app does not steer. Fixed courier is the admin's override, a real mode.
export const MATCHER_COPY: Record<string, { title: string; description: string }> = {
  NEAREST_COURIER: { title: 'Nearest free courier', description: 'The closest rider who is free.' },
  COURIER_SENIORITY: { title: 'Most senior courier', description: 'Members who joined first are offered first.' },
  STATIC: { title: 'Fixed courier', description: 'The admin assigns each delivery by hand (the override).' },
}

export function MatchingCard({ form, set, options, loaded }: CardProps) {
  const unit = unitWord(form.distanceUnit)
  return (
    <SettingsSection id="matching" title="Matching">
      <FieldGroup>
        <fieldset>
          <legend className="mb-3 text-sm font-medium">Who gets the offer first</legend>
          <RadioGroup
            value={form.courierMatcherType}
            onValueChange={(value) => set('courierMatcherType', value)}
            disabled={!loaded}
            aria-label="Who gets the offer first"
            className="grid grid-cols-1 gap-3 md:grid-cols-3"
          >
            {(options?.courierMatcherType ?? []).map((option) => {
              const copy = MATCHER_COPY[option] ?? { title: option, description: '' }
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
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <NumberField
            id="maxAssignmentDistance"
            label={`Furthest courier to offer (${unit})`}
            value={form.maxAssignmentDistance}
            min={0}
            disabled={!loaded}
            description="Riders further than this from the pickup are not offered the delivery."
            onChange={(value) => set('maxAssignmentDistance', value)}
          />
          <NumberField
            id="quoteExpirationMinutes"
            label="Quote stays valid for (minutes)"
            value={form.quoteExpirationMinutes}
            min={0}
            disabled={!loaded}
            onChange={(value) => set('quoteExpirationMinutes', value)}
          />
          <NumberField
            id="maxDriftDistance"
            label="Max drift distance (metres)"
            value={form.maxDriftDistance}
            min={0}
            disabled={!loaded}
            description="How far the delivery's pickup may be from the quote's."
            onChange={(value) => set('maxDriftDistance', value)}
          />
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <OptionSelect
            id="geoCalculationType"
            label="Measure distance by"
            value={form.geoCalculationType}
            options={options?.geoCalculationType}
            labels={GEO_CALCULATION_TYPE_TO_HUMAN}
            disabled={!loaded}
            onChange={(value) => set('geoCalculationType', value)}
          />
          <OptionSelect
            id="deliveryDurationCalculationType"
            label="Delivery duration calculation"
            value={form.deliveryDurationCalculationType}
            options={options?.deliveryDurationCalculationType}
            labels={DELIVERY_DURATION_CALCULATION_TYPE_TO_HUMAN}
            disabled={!loaded}
            onChange={(value) => set('deliveryDurationCalculationType', value)}
          />
        </div>
      </FieldGroup>
    </SettingsSection>
  )
}

export function OffersCard({ form, set, loaded }: CardProps) {
  const notLoaded = form.offerExpiryEnabled === null
  return (
    <SettingsSection id="offers" title="Offers" description="How long an offer to a rider lasts (row 61).">
      <FieldGroup>
        <Field>
          <div className="flex items-center gap-3">
            <Switch
              id="offerExpiryEnabled"
              checked={form.offerExpiryEnabled === true}
              disabled={!loaded || notLoaded}
              onCheckedChange={(checked: boolean) => set('offerExpiryEnabled', checked)}
            />
            <FieldLabel htmlFor="offerExpiryEnabled">Offer expiry</FieldLabel>
            {notLoaded && <span className="text-sm text-muted-foreground">Not loaded yet</span>}
          </div>
          <FieldDescription>{describeOfferExpiry(form.offerExpiryEnabled, form.offerExpirySeconds)}</FieldDescription>
        </Field>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <NumberField
            id="offerExpirySeconds"
            label="Seconds before an unanswered offer ends"
            value={form.offerExpirySeconds}
            min={20}
            max={300}
            disabled={!loaded || notLoaded}
            description="Whole seconds, 20 to 300. Used only while Offer expiry is on. An offer an admin makes by hand never ends on its own."
            onChange={(value) => set('offerExpirySeconds', value)}
          />
          <NumberField
            id="noCourierRetrySeconds"
            label="Seconds between retries when no rider is free"
            value={form.noCourierRetrySeconds}
            min={10}
            max={300}
            disabled={!loaded || notLoaded}
            description="Whole seconds, 10 to 300. A delivery nobody could take is offered again this often, and at once when a rider comes online or finishes. Applies whether Offer expiry is on or off."
            onChange={(value) => set('noCourierRetrySeconds', value)}
          />
        </div>
      </FieldGroup>
    </SettingsSection>
  )
}

// `policyEditor` is today's dropped rider pay editor, with its own Save (spec 0010, AC-8).
export function RiderPayCard({ form, set, options, loaded, policyEditor }: CardProps & { policyEditor: ReactNode }) {
  return (
    <SettingsSection id="rider-pay" title="Rider pay" description="What a rider earns beyond the quote.">
      <FieldGroup>
        {policyEditor}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <NumberField
            id="defaultCourierPayRate"
            label="Default courier pay rate"
            value={form.defaultCourierPayRate}
            min={0}
            disabled={!loaded}
            onChange={(value) => set('defaultCourierPayRate', value)}
          />
          <NumberField
            id="defaultMaxWorkingHours"
            label="Default max working hours"
            value={form.defaultMaxWorkingHours}
            min={0}
            disabled={!loaded}
            onChange={(value) => set('defaultMaxWorkingHours', value)}
          />
          <OptionSelect
            id="courierCompensationCalculationType"
            label="Courier compensation calculation"
            value={form.courierCompensationCalculationType}
            options={options?.courierCompensationCalculationType}
            labels={COURIER_DELIVERY_COMPENSATION_TYPE_TO_HUMAN}
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
  return (
    <SettingsSection
      id="service-area"
      title="Service area"
      description="Addresses outside this area are refused. Couriers looking for a co-op near them see you when they are inside it."
    >
      <div className="max-w-4xl">{map}</div>
    </SettingsSection>
  )
}

export function InstanceCard({ form, set, options, loaded, linkLocked }: CardProps & { linkLocked: boolean }) {
  const urlError = (value: string) =>
    value && !isValidURL(sanitizeURL(value)) ? 'Invalid URL format' : undefined
  return (
    <SettingsSection id="instance" title="Instance" description="The co-op's name, links and data rules.">
      <FieldGroup>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="instanceName">Name</FieldLabel>
            <Input
              id="instanceName"
              value={form.name}
              disabled={!loaded}
              onChange={(event) => set('name', event.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="link">URL</FieldLabel>
            <Input
              id="link"
              value={form.link}
              disabled={!loaded || linkLocked}
              aria-invalid={urlError(form.link) ? true : undefined}
              onChange={(event) => set('link', event.target.value)}
            />
            <FieldDescription>
              {linkLocked
                ? 'Saved. The URL cannot be changed.'
                : 'Once the URL is saved it cannot be changed. Check it before saving.'}
            </FieldDescription>
            {urlError(form.link) && <FieldError>{urlError(form.link)}</FieldError>}
          </Field>
          <Field>
            <FieldLabel htmlFor="websocketLink">Websocket URL</FieldLabel>
            <Input
              id="websocketLink"
              value={form.websocketLink}
              disabled={!loaded}
              aria-invalid={urlError(form.websocketLink) ? true : undefined}
              onChange={(event) => set('websocketLink', event.target.value)}
            />
            {urlError(form.websocketLink) && <FieldError>{urlError(form.websocketLink)}</FieldError>}
          </Field>
          <Field>
            <FieldLabel htmlFor="imageUrl">Logo image URL</FieldLabel>
            <Input
              id="imageUrl"
              value={form.imageUrl}
              disabled={!loaded}
              aria-invalid={urlError(form.imageUrl) ? true : undefined}
              onChange={(event) => set('imageUrl', event.target.value)}
            />
            {urlError(form.imageUrl) && <FieldError>{urlError(form.imageUrl)}</FieldError>}
          </Field>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="defaultDietaryRestrictions">Default dietary restrictions</FieldLabel>
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
                  {(COURIER_DIETARY_RESTRICTIONS_TO_HUMAN as Record<string, string>)[option] ?? option}
                </option>
              ))}
            </NativeSelect>
            <FieldDescription>Select one or more.</FieldDescription>
          </Field>
          <NumberField
            id="savedCustomerRetentionMonths"
            label="Delete a saved customer after this many months unused"
            value={form.savedCustomerRetentionMonths}
            min={1}
            max={36}
            disabled={!loaded}
            description="Restaurants' customers are personal data the co-op keeps for them. This is how long one nobody orders for is kept. Whole months, 1 to 36."
            onChange={(value) => set('savedCustomerRetentionMonths', value)}
          />
        </div>
      </FieldGroup>
    </SettingsSection>
  )
}

export type PublicPage = 'rules' | 'description' | 'terms-of-service' | 'privacy-policy'

export const PUBLIC_PAGES: { view: PublicPage; title: string; where?: string }[] = [
  { view: 'rules', title: 'Courier rules', where: 'Shown before a courier joins.' },
  { view: 'description', title: 'About the co-op', where: 'Shown in the courier app.' },
  { view: 'terms-of-service', title: 'Terms of service' },
  { view: 'privacy-policy', title: 'Privacy policy' },
]

export function PublicPagesCard({ onEdit }: { onEdit: (view: PublicPage) => void }) {
  return (
    <SettingsSection id="public-pages" title="Public pages">
      <ul className="flex flex-col gap-2">
        {PUBLIC_PAGES.map((page) => (
          <li
            key={page.view}
            className="flex items-center justify-between gap-4 rounded-lg border border-border px-4 py-3"
          >
            <div>
              <p className="text-sm font-medium">{page.title}</p>
              {page.where && <p className="text-sm text-muted-foreground">{page.where}</p>}
            </div>
            <Button type="button" variant="outline" size="sm" onClick={() => onEdit(page.view)}>
              Edit <span className="sr-only">{page.title}</span>
            </Button>
          </li>
        ))}
      </ul>
    </SettingsSection>
  )
}
