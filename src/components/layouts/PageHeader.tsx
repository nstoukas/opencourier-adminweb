import Head from 'next/head'
import type { ReactNode } from 'react'

interface PageHeaderProps {
  // The page's title: the one <h1> on the page, and the browser tab's title.
  title: string
  // An optional muted line under the title.
  description?: ReactNode
  // The page's action, right aligned beside the title (a button, or a small group of them).
  action?: ReactNode
}

/**
 * The top of every admin page, from the design system's admin layout rule: an h1 (30px, bold)
 * and one right aligned action. Each page renders it first inside DefaultLayout. On a narrow
 * screen the action wraps under the title instead of pushing the page sideways.
 */
export function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    <>
      <Head>
        <title>{`${title} · OpenCourier Admin`}</title>
      </Head>
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 space-y-1">
          <h1 className="break-words text-3xl font-bold tracking-tight">{title}</h1>
          {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
        </div>
        {action ? <div className="flex flex-wrap items-center gap-2">{action}</div> : null}
      </header>
    </>
  )
}
