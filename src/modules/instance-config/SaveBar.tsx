import { Button } from '@/admin-web-components'
import type { PendingChange } from './settingsDiff'

type Props = {
  changes: PendingChange[]
  blockers: string[]
  isSaving: boolean
  onDiscard: () => void
  onSave: () => void
}

// The bar at the bottom of the co-op settings page (spec 0010, AC-3, AC-4, AC-14): every change
// not saved yet as "Label old → new", what stops Save, Discard and Save changes. Hidden while
// nothing changed. It sticks to the bottom of the window so it stays in sight while you scroll.
export function SaveBar({ changes, blockers, isSaving, onDiscard, onSave }: Props) {
  const count = changes.length === 1 ? '1 unsaved change' : `${changes.length} unsaved changes`
  const showBlockers = changes.length > 0 && blockers.length > 0

  return (
    <>
      {/* role="status" makes a screen reader announce the reasons when they appear. It is always
          on the page: a live region that appears together with its text is often not announced,
          and the disabled Save cannot take focus to have its aria-describedby read. */}
      <div role="status" className="sr-only">
        {showBlockers ? `Save is off until you fix: ${blockers.join('; ')}` : ''}
      </div>
      {changes.length > 0 && (
        // The negative margins cancel the page's padding (p-4, sm:p-6) so the bar spans the content.
        <div
          data-testid="save-bar"
          className="sticky bottom-0 z-10 -mx-4 mt-6 border-t border-border bg-background px-4 py-3 shadow-sm sm:-mx-6 sm:px-6"
        >
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0 text-sm">
              <p className="font-semibold text-foreground">{count}:</p>
              <ul className="mt-1 flex flex-col gap-0.5 text-muted-foreground">
                {changes.map((change) => (
                  <li key={change.key} className="break-words">
                    <span className="text-foreground">{change.label}</span>{' '}
                    {change.key === 'region' ? (
                      'redrawn'
                    ) : (
                      <>
                        {change.from} <span aria-hidden="true">→</span>
                        <span className="sr-only">changes to</span> {change.to}
                      </>
                    )}
                  </li>
                ))}
              </ul>
              {showBlockers && (
                <div id="save-all-blockers" className="mt-2 text-destructive">
                  <p>Save is off until you fix:</p>
                  <ul className="ml-2 list-inside list-disc">
                    {blockers.map((blocker) => (
                      <li key={blocker}>{blocker}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <div className="flex shrink-0 gap-2">
              <Button type="button" variant="secondary" onClick={onDiscard} disabled={isSaving}>
                Discard
              </Button>
              <Button
                type="button"
                onClick={onSave}
                disabled={isSaving || blockers.length > 0}
                aria-describedby={showBlockers ? 'save-all-blockers' : undefined}
              >
                {isSaving ? 'Saving…' : 'Save changes'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
