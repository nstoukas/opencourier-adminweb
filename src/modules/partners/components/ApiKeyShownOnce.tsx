import React, { useState } from 'react'
import { Copy } from '@phosphor-icons/react'
import { Button, DialogFooter, Input, Label } from '@/admin-web-components'
import { useTranslation } from 'react-i18next'

// A restaurant's new API key, shown once (spec 0037, AC-13). The server keeps only its hash, so this
// panel is the one chance to copy it: the dialog around it lets only Done close it.
export function ApiKeyShownOnce({ apiKey, onDone }: { apiKey: string; onDone: () => void }) {
  // useTranslation gives t, which looks a key up in the reader's language.
  const { t } = useTranslation()
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle')

  // The clipboard can be missing (plain http away from localhost) or refuse; then the key stays on
  // screen to select by hand, as on the Restaurant Added panel.
  const copy = async () => {
    try {
      // The DOM types say the clipboard always exists, but browsers leave it out on insecure pages:
      // then this line throws a TypeError, which the catch turns into the "select" line.
      await navigator.clipboard.writeText(apiKey)
      setCopyState('copied')
    } catch {
      setCopyState('failed')
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor="new-api-key">{t('partners.keyShownOnce.label')}</Label>
        {/* Read only, so it can be selected and copied but not changed by a stray key press. */}
        <Input
          id="new-api-key"
          readOnly
          // Focus moves here when the panel appears, so a screen reader reads the label and the key
          // is selected ready to copy (Fable review, minor 6).
          autoFocus
          value={apiKey}
          className="font-mono text-sm"
          onFocus={(event) => event.currentTarget.select()}
        />
      </div>
      <p className="text-sm text-muted-foreground">{t('partners.keyShownOnce.warning')}</p>
      {/* Always in the page, so a screen reader announces its text when it changes (an element that
          appears together with its text is often not read out). */}
      <p className={copyState === 'failed' ? 'text-sm text-destructive' : 'sr-only'} role="status">
        {copyState === 'failed'
          ? t('partners.keyShownOnce.copyFailed')
          : copyState === 'copied'
            ? t('partners.keyShownOnce.copiedStatus')
            : ''}
      </p>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={() => void copy()}>
          <Copy aria-hidden="true" className="mr-2 h-4 w-4" />
          {copyState === 'copied' ? t('partners.keyShownOnce.copied') : t('partners.keyShownOnce.copy')}
        </Button>
        <Button type="button" onClick={onDone}>
          {t('partners.keyShownOnce.done')}
        </Button>
      </DialogFooter>
    </div>
  )
}
