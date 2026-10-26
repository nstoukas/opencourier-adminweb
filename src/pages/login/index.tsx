import { EAdminRoutes } from '@/hooks/useAdminPageNavigator'
import { SignInScreen } from '@/modules/auth/components/SignInScreen'
import { selectAccessToken } from '@/modules/auth/slices/authSlice'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'

function LoginPage() {
  const accessToken = useSelector(selectAccessToken)
  const router = useRouter()
  // Whether the admin was already signed in when this page opened. Read once, on the first
  // render (a function passed to useState runs only then), so signing in here does not count:
  // that path sends you home on its own, and a second redirect would race it.
  const [signedInOnArrival] = useState(() => Boolean(accessToken))

  useEffect(() => {
    // `replace`, not `push`: the browser's Back button then skips /login instead of returning to it.
    if (signedInOnArrival) void router.replace(EAdminRoutes.HOME)
    // The empty list makes this run once, on arrival; signedInOnArrival never changes after that.
  }, [])

  // Already signed in: draw nothing for the moment before Overview loads, never the sign in card.
  if (signedInOnArrival) return null
  return <SignInScreen />
}
// `public` tells _app.tsx to show this page without the sign in guard and without the shell.
LoginPage.public = true

export default LoginPage
