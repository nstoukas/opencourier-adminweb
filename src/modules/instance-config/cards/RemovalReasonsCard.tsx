import React, { useRef, useState } from 'react'
import type { TFunction } from 'i18next'
import { useTranslation } from 'react-i18next'
import { Button, Field, FieldDescription, FieldGroup } from '@/admin-web-components'
import type { RemovalReasonAdminDto } from '@/backend-admin-sdk'
import { useGetRemovalReasonsQuery } from '@/api/removalRequestApi'
import { RemovalReasonDialog, RemoveRemovalReasonDialog, reasonName } from '../components/RemovalReasonDialogs'
import { labelOf } from '../settingsDiff'
import { NumberField, SettingsSection, type CardProps } from './SettingsCards'

// What one reason does, in words: the list a representative reads to check it matches the decision.
// It takes `t` (from useTranslation) so the words follow the reader's language.
function reasonFlags(t: TFunction, reason: RemovalReasonAdminDto): string {
  return [
    t(reason.paidToRider ? 'settings.removalReasons.paid' : 'settings.removalReasons.notPaid'),
    t(reason.chargedToRestaurant ? 'settings.removalReasons.charged' : 'settings.removalReasons.notCharged'),
    ...(reason.needsNote ? [t('settings.removalReasons.needsNote')] : []),
  ].join(' · ')
}

// Removal reasons (spec 0035, AC-2). The reasons save at once through their own routes; the return
// trip share goes through the page's save bar, like every other setting on this page.
export function RemovalReasonsCard({ form, set, loaded }: Pick<CardProps, 'form' | 'set' | 'loaded'>) {
  // useTranslation gives t (a key to words) and i18n, whose `language` picks which name of a reason shows first.
  const { t, i18n } = useTranslation()
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
      title={t('settings.sections.removalReasons')}
      description={t('settings.removalReasons.description')}
    >
      <FieldGroup>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">{t('settings.removalReasons.loading')}</p>
        ) : isError ? (
          <p role="alert" className="text-sm text-destructive">
            {t('settings.removalReasons.loadFailed')}
          </p>
        ) : !reasons || reasons.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('settings.removalReasons.empty')}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {reasons.map((reason) => {
              // The reader's language first, the other when it is missing (an old reason has no Greek yet).
              const name = reasonName(reason, i18n.language)
              return (
                <li
                  key={reason.id}
                  data-testid="removal-reason-row"
                  className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-border px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="break-words text-sm font-medium">
                      {reason.position}
                      {'. '}
                      {name}
                    </p>
                    <p className="text-sm text-muted-foreground">{reasonFlags(t, reason)}</p>
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
                      {t('common.edit')} <span className="sr-only">{name}</span>
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
                      {t('common.remove')} <span className="sr-only">{name}</span>
                    </Button>
                  </div>
                </li>
              )
            })}
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
              {t('settings.removalReasons.add')}
            </Button>
          </div>
          <FieldDescription>{t('settings.removalReasons.savesAtOnce')}</FieldDescription>
        </Field>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <NumberField
            id="returnTripPayPercent"
            label={labelOf(t, 'returnTripPayPercent')}
            value={form.returnTripPayPercent}
            min={0}
            max={100}
            disabled={!loaded}
            description={t('settings.removalReasons.returnTripHelp')}
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
