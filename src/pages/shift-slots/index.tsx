import { ReactElement } from 'react'
import { DefaultLayout } from '@/components/layouts/DefaultLayout'
import { ShiftSlotsPage } from '@/modules/shift-slots/ShiftSlotsPage'
import { NextPageWithLayout } from '@/pages/_app'

// The co-op's weekly shift slots (spec 0026, row 77).
const ShiftSlotsRoute: NextPageWithLayout = () => <ShiftSlotsPage />

// getLayout wraps the page in the sidebar layout once, so it stays mounted between pages.
ShiftSlotsRoute.getLayout = (page: ReactElement) => <DefaultLayout>{page}</DefaultLayout>

export default ShiftSlotsRoute
