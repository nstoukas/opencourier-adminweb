import React, { useRef, useState } from 'react'
import { Button, Field, FieldDescription, FieldGroup } from '@/admin-web-components'
import type { RemovalReasonAdminDto } from '@/backend-admin-sdk'
import { useGetRemovalReasonsQuery } from '@/api/removalRequestApi'
import { RemovalReasonDialog, RemoveRemovalReasonDialog } from '../components/RemovalReasonDialogs'
import { labelOf } from '../settingsDiff'
import { NumberField, SettingsSection, type CardProps } from './SettingsCards'

// What one reason does, in words: the list a representative reads to check it matches the decision.
function reasonFlags(reason: RemovalReasonAdminDto): string {
  return [
    reason.paidToRider ? 'Paid to the rider' : 'Not paid',
    reason.chargedToRestaurant ? 'Charged to the restaurant' : 'Not charged',
    ...(reason.needsNote ? ['Needs a note'] : []),
  ].join(' · ')
}

// Removal reasons (spec 0035, AC-2). The reasons save at once through their own routes; the return
// trip share goes through the page's save bar, like every other setting on this page.
export function RemovalReasonsCard({ form, set, loaded }: Pick<CardProps, 'form' | 'set' | 'loaded'>) {
  const { data: reasons, isLoading, isError } = useGetRemovalReasonsQuery()
  // The add or edit dialog's open state, apart from the reason it holds (adminweb AGENTS.md).
  const [editorOpen, setEditorOpen] = useState(false)
  const [editing, setEditing] = useState<RemovalReasonAdminDto | null>(null)
  const [removing, setRemoving] = useState<RemovalReasonAdminDto | null>(null)
  // The button that opened a dialog, which gets focus back when it closes. Add is the fallback
  // when that button has left the page (the reason it belonged to was removed).
  const addRef = useRef<HTMLButtonElement>(null)
  const openerRef = useRef<HTMLElement | null>(null)

  const returnFocus = (event: Event) => {
    const target = openerRef.current?.isConnected ? openerRef.current : addRef.current
    if (target) {
      event.preventDefault()
      target.focus()
    }
  }

  return (
    <SettingsSection
      id="removal-reasons"
      title="Removal reasons"
      description="The reasons a rider can give when asking to come off an order, and what each one pays and bills."
    >
      <FieldGroup>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading the reasons.</p>
        ) : isError ? (
          <p role="alert" className="text-sm text-destructive">
            Could not load the reasons.
          </p>
        ) : !reasons || reasons.length === 0 ? (
          <p className="text-sm text-muted-foreground">No reasons yet. Riders cannot ask to come off an order until one is added.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {reasons.map((reason) => (
              <li
                key={reason.id}
                data-testid="removal-reason-row"
                className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-border px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="break-words text-sm font-medium">
                    {reason.position}. {reason.label}
                  </p>
                  <p className="text-sm text-muted-foreground">{reasonFlags(reason)}</p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={(event) => {
                      openerRef.current = event.currentTarget
                      setEditing(reason)
                      setEditorOpen(true)
                    }}
                  >
                    Edit <span className="sr-only">{reason.label}</span>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={(event) => {
                      openerRef.current = event.currentTarget
                      setRemoving(reason)
                    }}
                  >
                    Remove <span className="sr-only">{reason.label}</span>
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
        <Field>
          <div>
            <Button
              ref={addRef}
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                openerRef.current = addRef.current
                setEditing(null)
                setEditorOpen(true)
              }}
            >
              Add reason
            </Button>
          </div>
          <FieldDescription>Changes to the list save at once, not with the bar at the bottom.</FieldDescription>
        </Field>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <NumberField
            id="returnTripPayPercent"
            label={labelOf('returnTripPayPercent')}
            value={form.returnTripPayPercent}
            min={0}
            max={100}
            disabled={!loaded}
            description="Share of the delivery's distance fee a rider is paid for bringing the food back, on any job cancelled after pickup. Whole percent, 0 to 100; 0 switches it off. The restaurant is not charged for it."
            onChange={(value) => set('returnTripPayPercent', value)}
          />
        </div>
      </FieldGroup>
      <RemovalReasonDialog
        open={editorOpen}
        reason={editing}
        onOpenChange={setEditorOpen}
        onCloseAutoFocus={returnFocus}
      />
      {removing ? (
        <RemoveRemovalReasonDialog
          reason={removing}
          onClose={() => setRemoving(null)}
          onRemoved={() => {
            // The removed row's button is still on the page until the refetch, then it goes, so focus moves to Add now.
            openerRef.current = addRef.current
            setRemoving(null)
          }}
          onCloseAutoFocus={returnFocus}
        />
      ) : null}
    </SettingsSection>
  )
}
