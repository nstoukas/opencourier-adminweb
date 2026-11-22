import { useTranslation } from 'react-i18next'
import { useSelector } from 'react-redux'
import { useSetLanguageMutation } from '@/api/authApi'
import { selectAccessToken } from '@/modules/auth/slices/authSlice'
import { toast } from '../admin-web-components'
import { cn } from '../ui-shared-utils'
import { applyLanguage, markChosenBeforeSignIn } from './languageChoice'
import { LANGUAGES, LANGUAGE_NAMES, toLanguage, type Language } from './language'

/**
 * The language switch (spec 0054, AC-2): "ΕΛ" and "EN" side by side, the current one pressed. A click
 * switches this page at once with no reload, saves the choice in the `oc_lang` cookie (so the next page
 * load renders in it on the server) and, when signed in, on the admin's own account (`User.language`),
 * so the next sign in on any computer starts in it. The same look as request-web's switch.
 */
export function LanguageSwitch({ className }: { className?: string }) {
  // useTranslation gives the page's i18next instance; `i18n.language` is the language on show.
  const { t, i18n } = useTranslation()
  const current = toLanguage(i18n.language)
  const accessToken = useSelector(selectAccessToken)
  // An RTK Query mutation hook: the first item is the function that sends the request.
  const [saveLanguage] = useSetLanguageMutation()

  const choose = (language: Language) => {
    if (language === current) return
    applyLanguage(i18n, language)
    if (!accessToken) {
      // On the sign in card: sign in will save this choice to the account (decision 47.31).
      markChosenBeforeSignIn()
      return
    }
    // The page has already switched; a failed save only means the next sign in starts in the old one.
    saveLanguage(language)
      .unwrap()
      .catch(() => toast({ title: t('language.saveFailed'), variant: 'destructive' }))
  }

  return (
    <div role="group" aria-label={t('language.label')} className={cn('flex shrink-0 rounded-md border p-0.5', className)}>
      {LANGUAGES.map((language) => (
        <button
          key={language}
          type="button"
          lang={language}
          aria-pressed={language === current}
          // The full name for screen readers and the tooltip; the two letters on screen. Each name is in
          // its own language and never translated, so a reader finds theirs (decision 47.2).
          aria-label={LANGUAGE_NAMES[language]}
          title={LANGUAGE_NAMES[language]}
          onClick={() => choose(language)}
          className={cn(
            'h-8 min-w-9 rounded px-2 text-xs font-semibold uppercase focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            language === current ? 'bg-secondary text-secondary-foreground' : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {/* eslint-disable-next-line i18next/no-literal-string -- each language's own short name, never translated */}
          {language === 'el' ? 'ΕΛ' : 'EN'}
        </button>
      ))}
    </div>
  )
}
