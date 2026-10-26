import { useLoginMutation } from '@/api/authApi'
import { useAdminPageNavigator } from '@/hooks/useAdminPageNavigator'
import { setAccessToken } from '@/modules/auth/slices/authSlice'
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  Field,
  FieldGroup,
  FieldLabel,
  Input,
  Spinner,
} from '../../../admin-web-components'
import { useAppDispatch } from '../../../ui-shared-utils'
import { XCircle } from '@phosphor-icons/react'
import Head from 'next/head'
import { useState, type FormEvent } from 'react'

/**
 * Turns a failed sign in into plain words. Never an HTTP code and never the server's own text,
 * which is written for developers. The same words as the restaurant portal's sign in (row 92).
 */
export function signInErrorMessage(error: unknown): string {
  // `unknown` means "could be anything": JavaScript can throw any value, so we check that it is
  // an object before reading from it. The admin SDK puts the HTTP status in `statusCode`
  // (ApiError); a reply it could not read keeps it in `response.status`.
  const failure =
    typeof error === 'object' && error !== null
      ? (error as { statusCode?: unknown; response?: { status?: unknown } })
      : undefined
  const status = failure?.statusCode ?? failure?.response?.status
  if (status === 400 || status === 401 || status === 403 || status === 404) {
    return "That email and password don't match. Check for typos and try again."
  }
  if (status === 429) {
    return 'Too many tries in a row. Wait a minute, then try again.'
  }
  // A 5xx, or no status at all (the network failed before the server answered).
  return "The co-op's server didn't answer. Check your internet connection and try again in a minute."
}

/**
 * The admin sign in, after the redesign's "Sign in" board: a card on the muted ground with the
 * OpenCourier mark, "Co-op Admin", Email and Password, and a full width Sign In button. The red
 * Alert appears only after a failed attempt.
 */
export function SignInScreen() {
  const [login, { isLoading }] = useLoginMutation()
  const dispatch = useAppDispatch()
  const { goHome } = useAdminPageNavigator()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  // `FormEvent` is the type of the event a <form> passes to onSubmit.
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    // Stop the browser's own form post (a full page reload); we send the request ourselves.
    event.preventDefault()
    if (!email.trim() || !password) {
      setError('Enter your email and password, then press Sign In.')
      return
    }

    setError('')
    try {
      // `unwrap()` turns a failed request into a thrown error, so the catch below sees it.
      const userInfo = await login({ email: email.trim(), password }).unwrap()
      if (!userInfo.session?.accessToken) {
        setError(signInErrorMessage(undefined))
        return
      }
      // The old form also stored a `chatToken` here, a field the login reply does not have
      // (it was always undefined, and a type error). Messages are row 90's to design.
      dispatch(setAccessToken(userInfo.session.accessToken))
      await goHome()
    } catch (err) {
      setError(signInErrorMessage(err))
    }
  }

  return (
    <>
      <Head>
        <title>Sign In · OpenCourier Admin</title>
      </Head>
      <main className="flex min-h-svh items-center justify-center bg-muted px-4 py-10">
        <Card className="w-full max-w-[400px] rounded-xl">
          <CardHeader className="space-y-2">
            {/* The design system's mark: black ink, for white or muted grounds, 48px tall or more. */}
            {/* A plain <img>: next/image on Next 13.5 hands React 18.2 a `fetchPriority` prop it warns about. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/opencourier-sign.png" alt="OpenCourier" width={42} height={48} className="h-12 w-auto self-start" />
            <h1 className="pt-2 text-2xl font-semibold tracking-tight">Co-op Admin</h1>
            <CardDescription>Sign in with the email and password the co-op gave you.</CardDescription>
          </CardHeader>
          <CardContent>
            {/* noValidate: we show our own message in the Alert instead of the browser's bubble,
                which follows the computer's language and looks different in every browser. */}
            <form onSubmit={handleSubmit} noValidate className="space-y-6">
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="admin-email">Email</FieldLabel>
                  <Input
                    id="admin-email"
                    type="email"
                    autoComplete="username"
                    autoCapitalize="none"
                    spellCheck={false}
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="h-9"
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="admin-password">Password</FieldLabel>
                  <Input
                    id="admin-password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="h-9"
                  />
                </Field>
              </FieldGroup>

              {error ? (
                <Alert variant="destructive">
                  <XCircle className="size-4" />
                  <AlertTitle>Could not sign in</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              ) : null}

              <Button type="submit" className="h-9 w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    {/* The button's own words say "Signing in…", so the spinner stays silent here. */}
                    <Spinner className="mr-2" aria-hidden />
                    Signing in…
                  </>
                ) : (
                  'Sign In'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </>
  )
}
