import { Button, Input, Label } from '@/admin-web-components'
import { describeQuoteRate, parseQuoteRateInput } from '@/utils/quoteRate'

// Props for the QuoteRateEditor component.
export interface QuoteRateEditorProps {
  rateText: string
  rate: number
  currencyCode: string | null | undefined
  distanceUnit: string | null | undefined
  error: string
  isSaving: boolean
  onChange: (value: string) => void
  onSave: () => void
}

// Quote rate is stored as an integer number of minor currency units (cents).
export function QuoteRateEditor({
  rateText,
  rate,
  currencyCode,
  distanceUnit,
  error,
  isSaving,
  onChange,
  onSave,
}: QuoteRateEditorProps) {
  // Re-parsing here rather than trusting the `error` prop means the button's enabled state
  // and the page's validation can never drift apart — both go through parseQuoteRateInput.
  const isRateValid = parseQuoteRateInput(rateText) !== null
  const isSaveDisabled = isSaving || !isRateValid

  return (
    <div>
      <Label className="text-right">Quote Rate Per Distance Unit</Label>
      <p className="text-sm text-gray-600 mb-1">
        {describeQuoteRate(rate, currencyCode, distanceUnit)}
      </p>
      <Input
        key="quoteRatePerDistanceUnit"
        type="number"
        min={0}
        value={rateText}
        onChange={(event) => onChange(event.target.value)}
        className={`max-w-[120px] ${error ? 'border-red-500 border-2' : ''}`}
      />
      {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
      <div>
        <Button
          type="button"
          disabled={isSaveDisabled}
          onClick={onSave}
          className="mt-2"
        >
          {isSaving ? 'Saving…' : 'Save quote rate'}
        </Button>
      </div>
    </div>
  )
}
