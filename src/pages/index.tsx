import { DefaultLayout } from '@/components/layouts/DefaultLayout'
import { DispatchPage } from '@/modules/dispatch/DispatchPage'
import { ReactElement } from 'react'
import { NextPageWithLayout } from './_app'

// The admin's home page is the Dispatch board (spec 0034).
const HomePage: NextPageWithLayout = () => <DispatchPage />

HomePage.getLayout = (page: ReactElement) => <DefaultLayout>{page}</DefaultLayout>

export default HomePage
