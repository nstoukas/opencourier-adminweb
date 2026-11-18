import { ReactElement } from 'react'
import { DefaultLayout } from '@/components/layouts/DefaultLayout'
import { ChargesOverviewPage } from '@/modules/charges/ChargesOverviewPage'
import { NextPageWithLayout } from '@/pages/_app'

// What each restaurant owes, per Athens month (spec 0036).
const ChargesRoute: NextPageWithLayout = () => <ChargesOverviewPage />

ChargesRoute.getLayout = (page: ReactElement) => <DefaultLayout>{page}</DefaultLayout>

export default ChargesRoute
