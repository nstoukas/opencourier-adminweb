import { DefaultLayout } from '@/components/layouts/DefaultLayout'
import { ComplaintDetails } from '@/modules/complaints/ComplaintDetails'
import { NextPageWithLayout } from '@/pages/_app'
import { useRouter } from 'next/router'
import { ReactElement } from 'react'

// One complaint (spec 0052), at EAdminRoutes.COMPLAINT_DETAILS.
const ComplaintPage: NextPageWithLayout = () => {
  const router = useRouter()
  // Empty on the first render, before Next.js has read the id from the URL.
  const complaintId = (router.query.complaintId as string | undefined) ?? ''
  return <ComplaintDetails complaintId={complaintId} />
}

ComplaintPage.getLayout = (page: ReactElement) => <DefaultLayout>{page}</DefaultLayout>

export default ComplaintPage
