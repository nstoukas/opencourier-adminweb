import { SignInScreen } from '@/modules/auth/components/SignInScreen'

function LoginPage() {
  return <SignInScreen />
}
// `public` tells _app.tsx to show this page without the sign in guard and without the shell.
LoginPage.public = true

export default LoginPage
