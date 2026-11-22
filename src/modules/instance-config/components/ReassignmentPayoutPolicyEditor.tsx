import { Button, Input } from '@/admin-web-components'
import { buildPayoutPolicyInput, normalizePolicyKey, policiesToRows } from '@/utils/payoutPolicyForm'
import type { PayoutPolicyRow } from '@/utils/payoutPolicyForm'
import { useEffect, useRef, useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { showMessage, type ShownMessage } from '@/i18n/shownMessage'

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
  // useTranslation gives t, which looks a key up in the reader's language.
  const { t } = useTranslation()
  // Keys with their values, worded when drawn, so a language switch reaches them (shownMessage.ts).
  const [errors, setErrors] = useState<ShownMessage[]>([])
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
      <h3 className="text-lg font-semibold">{t('settings.payoutPolicies.title')}</h3>
      <p className="text-sm text-muted-foreground">{t('settings.payoutPolicies.intro')}</p>
      <p className="text-sm text-muted-foreground">
        {/* Trans fills the <c>…</c> marks in the sentence with the element given for `c`, here <code>. */}
        <Trans i18nKey="settings.payoutPolicies.pastUnchanged" components={{ c: <code /> }} />
      </p>
      <div className="space-y-3">
        {rows.map((row) => {
          // Save sends each name through normalizePolicyKey (upper cased, spaces become
          // underscores), so show that stored name whenever it differs from what was typed.
          const storedKey = normalizePolicyKey(row.key)
          const showStoredKey = storedKey !== '' && storedKey !== row.key
          return (
            <div key={row.id} className="space-y-1">
              <div className="flex items-center gap-3">
                <Input
                  value={row.key}
                  onChange={(e) => handleKeyChange(row.id, e.target.value)}
                  placeholder={t('settings.payoutPolicies.namePlaceholder')}
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
                  <span className="text-sm text-muted-foreground">{'%'}</span>
                </div>
                <label className="flex items-center gap-1 text-sm text-foreground cursor-pointer">
                  <input
                    type="radio"
                    name="payout-default-policy"
                    checked={row.id === defaultRowId}
                    onChange={() => setDefaultRowId(row.id)}
                    aria-label={t('settings.payoutPolicies.makeDefault', {
                      name: row.key || t('settings.payoutPolicies.thisPolicy'),
                    })}
                  />
                  {t('settings.payoutPolicies.default')}
                </label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleRemoveRow(row.id)}
                >
                  {t('common.remove')}
                </Button>
              </div>
              {showStoredKey && (
                <p className="text-sm text-muted-foreground">
                  {t('settings.payoutPolicies.savedAs')} <code>{storedKey}</code>
                </p>
              )}
            </div>
          )
        })}
      </div>
      <div>
        <Button type="button" variant="outline" size="sm" onClick={handleAddRow}>
          {t('settings.payoutPolicies.add')}
        </Button>
      </div>
      {errors.length > 0 && (
        <ul className="space-y-1">
          {errors.map((error) => {
            const words = showMessage(error, t)
            return (
              <li key={words} className="text-red-500 text-sm">
                {words}
              </li>
            )
          })}
        </ul>
      )}
      <div>
        <Button
          type="button"
          disabled={isSaving}
          onClick={handleSave}
        >
          {isSaving ? t('common.saving') : t('settings.payoutPolicies.save')}
        </Button>
      </div>
    </div>
  )
}
