import AuthGuard from '@/modules/auth/components/auth-guard'
import { SheetsManager } from '@/modules/shared/components/SheetManager'
import { wrapper } from '@/redux/store'
import {
	ModalManager,
	Toaster,
	TooltipProvider,
} from '../admin-web-components';
import '../admin-web-components/styles/globals.css';
import dayjs from 'dayjs'
import enLocale from 'dayjs/locale/en'
import timezone from 'dayjs/plugin/timezone'
import utc from 'dayjs/plugin/utc'
import weekday from 'dayjs/plugin/weekday'
import { NextPage } from 'next'
// NextApp is Next's own App component; its getInitialProps runs each page's own getInitialProps.
import NextApp, { type AppContext, type AppProps } from 'next/app'
import Head from 'next/head'
import { IconContext } from '@phosphor-icons/react'
import { ReactElement, ReactNode, useEffect, useState } from 'react'
// I18nextProvider hands one i18next instance to every component below it (spec 0054, AC-2).
import { I18nextProvider, useTranslation } from 'react-i18next'
import { PersistGate } from 'redux-persist/integration/react'
import { createI18n } from '@/i18n/createI18n'
import { DEFAULT_LANGUAGE, languageFromCookies, type Language } from '@/i18n/language'

dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.extend(weekday)
dayjs.locale({
  ...enLocale,
  weekStart: 1,
})

export type NextPageWithLayout<P = object, IP = P> = NextPage<P, IP> & {
  getLayout?: (page: ReactElement) => ReactNode
}

export type WithLayout = {
  Component: NextPageWithLayout
}

export type WithAuth = {
  Component: {
    public?: boolean
  }
}

// The language getInitialProps read from the `oc_lang` cookie rides along with the page's props. `?` lets
// it be missing (Greek then, the default).
type AppPropsWithExtras = AppProps & WithLayout & WithAuth & { language?: Language }

// Phosphor icons are pictures beside words, so screen readers should skip them. lucide did
// this on its own; Phosphor does not, so every icon gets aria-hidden here by default. An icon
// that carries meaning alone (the Spinner) passes aria-hidden={false}, and an icon only button
// needs its own words (an sr-only span or aria-label).
// The value replaces Phosphor's defaults rather than adding to them, so they are repeated here.
const ICON_DEFAULTS = {
  color: 'currentColor',
  size: '1em',
  weight: 'regular',
  mirrored: false,
  'aria-hidden': true,
} as const

function App({ Component, language = DEFAULT_LANGUAGE, ...rest }: AppPropsWithExtras) {
  const { store, props } = wrapper.useWrappedStore(rest)
  const getLayout = Component.getLayout ?? ((page) => page)
  // One i18next instance for this page load, made once in the language the server read (spec 0054,
  // cross check 2). useState with a function runs it on the first render only.
  const [i18n] = useState(() => createI18n(language))

  // The cookie changed under us (another tab switched language) and a page change read it again: follow
  // it, so the page and the cookie never disagree.
  useEffect(() => {
    if (i18n.language === language) return
    void i18n.changeLanguage(language)
    // <html lang> too, as the switch does: screen readers and Greek upper case rules read it.
    document.documentElement.lang = language
  }, [i18n, language])

  return (
    <I18nextProvider i18n={i18n}>
    {/* A React context Provider hands a value to every component below it without passing props. */}
    <IconContext.Provider value={ICON_DEFAULTS}>
      <TooltipProvider>
        <AppTitle />
        <PersistGate persistor={store.__persistor} loading={null}>
          {Component.public ? (
            getLayout(<Component {...props.pageProps} />)
          ) : (
            // <WebSocketProvider>
              <AuthGuard>
                {/* <GlobalEventListener /> */}
                {/* No <main> here: the shell (DefaultLayout) draws the page's one <main>. */}
                {getLayout(<Component {...props.pageProps} />)}
              </AuthGuard>
            // </WebSocketProvider>
          )}
        </PersistGate>
        <Toaster />
        <SheetsManager />
        <ModalManager />
      </TooltipProvider>
    </IconContext.Provider>
    </I18nextProvider>
  )
}

// The browser tab's title, in the reader's language. Its own component because useTranslation must run
// inside the I18nextProvider above.
function AppTitle() {
  const { t } = useTranslation()
  return (
    <Head>
      <title>{t('common.appName')}</title>
    </Head>
  )
}

// getInitialProps runs on the server for the first page load (with the request's Cookie header) and in
// the browser for each later page change (with document.cookie). Reading the language here, not in a
// useEffect, is what lets the first HTML already be in the right language with no flash and no hydration
// mismatch (spec 0054, AC-2). It also turns off Next's static pages for this app, which is fine: every
// page but the sign in sits behind the sign in anyway. withRedux below copies it onto the wrapped App.
App.getInitialProps = async (context: AppContext) => {
  const appProps = await NextApp.getInitialProps(context)
  const cookies = context.ctx.req
    ? context.ctx.req.headers.cookie
    : typeof document !== 'undefined'
      ? document.cookie
      : undefined
  return { ...appProps, language: languageFromCookies(cookies) }
}

export default wrapper.withRedux(App)
