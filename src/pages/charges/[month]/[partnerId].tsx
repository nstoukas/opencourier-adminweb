import { ReactElement } from 'react'
import { DefaultLayout } from '@/components/layouts/DefaultLayout'
import { PartnerMonthPage } from '@/modules/charges/PartnerMonthPage'
import { NextPageWithLayout } from '@/pages/_app'

// One restaurant's charges and bills for a month (spec 0036).
const ChargesPartnerMonthRoute: NextPageWithLayout = () => <PartnerMonthPage />

ChargesPartnerMonthRoute.getLayout = (page: ReactElement) => <DefaultLayout>{page}</DefaultLayout>

export default ChargesPartnerMonthRoute
