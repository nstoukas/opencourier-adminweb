import { ReactElement } from 'react'
import { DefaultLayout } from '@/components/layouts/DefaultLayout'
import { ComplaintsPage } from '@/modules/complaints/ComplaintsPage'
import { NextPageWithLayout } from '@/pages/_app'

// Complaints both ways, each decided by a person (spec 0052).
const ComplaintsRoute: NextPageWithLayout = () => <ComplaintsPage />

ComplaintsRoute.getLayout = (page: ReactElement) => <DefaultLayout>{page}</DefaultLayout>

export default ComplaintsRoute
