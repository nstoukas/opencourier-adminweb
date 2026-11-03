import React from 'react'
import type { NextPage } from 'next'
import { useRouter } from 'next/router'
import { DefaultLayout } from '@/components/layouts/DefaultLayout'
import { RestaurantDetails } from '@/modules/partners/RestaurantDetails'

// A restaurant's page (spec 0024). The route keeps its old name, /partners/[partnerId].
const PartnerDetailsPage: NextPage = () => {
  const router = useRouter()
  // Empty on the first render, before Next.js has read the id from the URL.
  const partnerId = typeof router.query.partnerId === 'string' ? router.query.partnerId : ''

  return (
    <DefaultLayout>
      <RestaurantDetails partnerId={partnerId} />
    </DefaultLayout>
  )
}

export default PartnerDetailsPage
