import { DefaultLayout } from '@/components/layouts/DefaultLayout'
import { CourierDetails } from '@/modules/couriers/CourierDetails'
import { NextPageWithLayout } from '@/pages/_app'
import { useRouter } from 'next/router'
import { ReactElement } from 'react'

// A rider's page (spec 0012), at the route EAdminRoutes.COURIER_DETAILS already named.
const ViewCourierPage: NextPageWithLayout = () => {
  const router = useRouter()
  // Empty on the first render, before Next.js has read the id from the URL.
  const courierId = (router.query.courierId as string | undefined) ?? ''
  return <CourierDetails courierId={courierId} />
}

// getLayout wraps the page in the sidebar layout once, so it stays mounted between pages.
ViewCourierPage.getLayout = (page: ReactElement) => <DefaultLayout>{page}</DefaultLayout>

export default ViewCourierPage
