import { BillStatementPage } from '@/modules/charges/BillStatementPage'
import { NextPageWithLayout } from '@/pages/_app'

// A bill's printable statement (spec 0036, AC-9). No getLayout, so no sidebar: printing shows the
// statement alone. Still behind the sign in (AuthGuard in _app).
const ChargesStatementRoute: NextPageWithLayout = () => <BillStatementPage />

export default ChargesStatementRoute
