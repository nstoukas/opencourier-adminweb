import { DefaultLayout } from '@/components/layouts/DefaultLayout'
import { SosIncidentDetails } from '@/modules/sos/SosIncidentDetails'
import { NextPageWithLayout } from '@/pages/_app'
import { useRouter } from 'next/router'
import { ReactElement } from 'react'

// One rider's SOS (spec 0022), at EAdminRoutes.SOS_DETAILS.
const SosIncidentPage: NextPageWithLayout = () => {
  const router = useRouter()
  // Empty on the first render, before Next.js has read the id from the URL.
  const sosId = (router.query.sosId as string | undefined) ?? ''
  return <SosIncidentDetails incidentId={sosId} />
}

// getLayout wraps the page in the sidebar layout once, so it stays mounted between pages.
SosIncidentPage.getLayout = (page: ReactElement) => <DefaultLayout>{page}</DefaultLayout>

export default SosIncidentPage
