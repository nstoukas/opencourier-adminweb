import { ReactElement } from 'react'
import { DefaultLayout } from '@/components/layouts/DefaultLayout'
import { SplitRequestsPage } from '@/modules/split-requests/SplitRequestsPage'
import { NextPageWithLayout } from '@/pages/_app'

// Riders' split requests, answered by a person (spec 0047).
const SplitRequestsRoute: NextPageWithLayout = () => <SplitRequestsPage />

SplitRequestsRoute.getLayout = (page: ReactElement) => <DefaultLayout>{page}</DefaultLayout>

export default SplitRequestsRoute
