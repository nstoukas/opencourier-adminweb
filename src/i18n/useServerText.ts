import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { eventMessageText, serverErrorText, type StoredEventText } from './serverText'

/**
 * The server's words in the reader's language, for a component (spec 0054, AC-4 and AC-6):
 *   errorText(err, t('partners.saveFailed'))  the refusal's translated sentence, else the fallback
 *   eventText(event)                          a record line: { text, recordedInEnglish }
 * A custom hook (its name starts with `use`): it re-renders the component when the language changes.
 */
export function useServerText() {
  const { i18n, t } = useTranslation()
  return useMemo(
    () => ({
      errorText: (error: unknown, fallback: string): string => serverErrorText(i18n, error) ?? fallback,
      eventText: (event: StoredEventText) => eventMessageText(i18n, event),
    }),
    // `t` changes when the language does, so the functions above are made again then.
    [i18n, t],
  )
}
