import { Button, Input } from '@/admin-web-components'
import { buildPayoutPolicyInput, policiesToRows } from '@/utils/payoutPolicyForm'
import type { PayoutPolicyRow } from '@/utils/payoutPolicyForm'
import { useEffect, useRef, useState } from 'react'

export interface ReassignmentPayoutPolicyEditorProps {
  policies: Record<string, number> | null | undefined
  defaultPolicy: string | null | undefined
  isSaving: boolean
  onSave: (policies: Record<string, number>, defaultPolicy: string) => void
}

export function ReassignmentPayoutPolicyEditor({
  policies,
  defaultPolicy,
  isSaving,
  onSave,
}: ReassignmentPayoutPolicyEditorProps) {
  const [rows, setRows] = useState<PayoutPolicyRow[]>([])
  const [defaultRowId, setDefaultRowId] = useState('')
  const [errors, setErrors] = useState<string[]>([])
  // A useRef value survives re-renders without causing one.
  const nextRowNumber = useRef(0)

  useEffect(() => {
    const formState = policiesToRows(policies, defaultPolicy)
    setRows(formState.rows)
    setDefaultRowId(formState.defaultRowId)
    setErrors([])
  }, [policies, defaultPolicy])

  const handleAddRow = () => {
    const newId = `policy-new-${nextRowNumber.current}`
    nextRowNumber.current += 1
    const newRow: PayoutPolicyRow = { id: newId, key: '', percent: '' }
    const nextRows = [...rows, newRow]
    setRows(nextRows)
    if (rows.length === 0) {
      setDefaultRowId(newId)
    }
  }

  const handleRemoveRow = (id: string) => {
    const nextRows = rows.filter((row) => row.id !== id)
    setRows(nextRows)
    if (id === defaultRowId) {
      const firstRemaining = nextRows[0]
      setDefaultRowId(firstRemaining ? firstRemaining.id : '')
    }
  }

  const handleKeyChange = (id: string, value: string) => {
    setRows(rows.map((row) => (row.id === id ? { ...row, key: value } : row)))
  }

  const handlePercentChange = (id: string, value: string) => {
    setRows(rows.map((row) => (row.id === id ? { ...row, percent: value } : row)))
  }

  const handleSave = () => {
    const built = buildPayoutPolicyInput({ rows, defaultRowId })
    if (!built.ok) {
      setErrors(built.errors)
      return
    }
    setErrors([])
    onSave(built.policies, built.defaultPolicy)
  }

  return (
    <div className="border rounded-lg p-6 space-y-4">
      <h3 className="text-lg font-semibold">Reassignment payout policies</h3>
      <p className="text-sm text-gray-600">
        How much of a dropped rider&apos;s piece-rate they keep when a Delivery is reassigned to someone else. 100% is the worker-centered default.
      </p>
      <p className="text-sm text-gray-600">
        Renaming or removing a policy does not change past reassignments — a <code>CourierCompensation</code> row and its <code>DeliveryEvent</code> keep the name that was in force when it happened.
      </p>
      <div className="space-y-3">
        {rows.map((row) => (
          <div key={row.id} className="flex items-center gap-3">
            <Input
              value={row.key}
              onChange={(e) => handleKeyChange(row.id, e.target.value)}
              placeholder="Policy name (e.g. FULL_COMPENSATION)"
              className="flex-1"
            />
            <div className="flex items-center gap-1">
              <Input
                type="number"
                min={0}
                max={100}
                value={row.percent}
                onChange={(e) => handlePercentChange(row.id, e.target.value)}
                placeholder="0"
                className="w-20"
              />
              <span className="text-sm text-gray-600">%</span>
            </div>
            <label className="flex items-center gap-1 text-sm text-gray-700 cursor-pointer">
              <input
                type="radio"
                name="payout-default-policy"
                checked={row.id === defaultRowId}
                onChange={() => setDefaultRowId(row.id)}
                aria-label={`Make ${row.key || 'this policy'} the default`}
              />
              Default
            </label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleRemoveRow(row.id)}
            >
              Remove
            </Button>
          </div>
        ))}
      </div>
      <div>
        <Button type="button" variant="outline" size="sm" onClick={handleAddRow}>
          Add policy
        </Button>
      </div>
      {errors.length > 0 && (
        <ul className="space-y-1">
          {errors.map((error) => (
            <li key={error} className="text-red-500 text-sm">
              {error}
            </li>
          ))}
        </ul>
      )}
      <div>
        <Button
          type="button"
          disabled={isSaving}
          onClick={handleSave}
        >
          {isSaving ? 'Saving…' : 'Save payout policies'}
        </Button>
      </div>
    </div>
  )
}
