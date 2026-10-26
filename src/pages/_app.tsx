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
import { AppProps } from 'next/app'
import Head from 'next/head'
import { IconContext } from '@phosphor-icons/react'
import { ReactElement, ReactNode } from 'react'
import { PersistGate } from 'redux-persist/integration/react'

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

type AppPropsWithExtras = AppProps & WithLayout & WithAuth

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

function App({ Component, ...rest }: AppPropsWithExtras) {
  const { store, props } = wrapper.useWrappedStore(rest)
  const getLayout = Component.getLayout ?? ((page) => page)

  return (
    // A React context Provider hands a value to every component below it without passing props.
    <IconContext.Provider value={ICON_DEFAULTS}>
      <TooltipProvider>
        <Head>
          <title>OpenCourier Admin</title>
        </Head>
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
  )
}

export default wrapper.withRedux(App)
