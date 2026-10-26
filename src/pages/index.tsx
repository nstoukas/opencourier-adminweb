import { DefaultLayout } from '@/components/layouts/DefaultLayout'
import { PageHeader } from '@/components/layouts/PageHeader'
import { ReactElement } from 'react'
import { NextPageWithLayout } from './_app'

const HomePage: NextPageWithLayout = () => {
  // Row 90 turns this page into the redesign's Dispatch board.
  return <PageHeader title="Overview" description="Welcome back. What would you like to do today?" />
}

HomePage.getLayout = (page: ReactElement) => <DefaultLayout>{page}</DefaultLayout>

export default HomePage
