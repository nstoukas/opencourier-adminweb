import { ReactElement } from 'react'
import { DefaultLayout } from '@/components/layouts/DefaultLayout'
import { ReviewsPage } from '@/modules/reviews/ReviewsPage'
import { NextPageWithLayout } from '@/pages/_app'

// Riders' review requests, answered by a person (spec 0038).
const ReviewsRoute: NextPageWithLayout = () => <ReviewsPage />

ReviewsRoute.getLayout = (page: ReactElement) => <DefaultLayout>{page}</DefaultLayout>

export default ReviewsRoute
