import { ReactElement } from 'react'
import { DefaultLayout } from '@/components/layouts/DefaultLayout'
import { TimeWorkedPage } from '@/modules/time-worked/TimeWorkedPage'
import { NextPageWithLayout } from '@/pages/_app'

// The co-op's time worked totals (spec 0040).
const TimeWorkedRoute: NextPageWithLayout = () => <TimeWorkedPage />

TimeWorkedRoute.getLayout = (page: ReactElement) => <DefaultLayout>{page}</DefaultLayout>

export default TimeWorkedRoute
