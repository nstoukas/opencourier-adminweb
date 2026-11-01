import * as React from 'react'

import { cn } from '../../../ui-shared-utils'

// shadcn's Breadcrumb, trimmed: where this page sits ("Deliveries › Delivery 4822"). Plain markup,
// no Radix. Each earlier step is a link; the last is the current page (aria-current="page").
export type BreadcrumbStep = { label: string; href?: string; onClick?: () => void }

export function Breadcrumb({ steps, className }: { steps: BreadcrumbStep[]; className?: string }) {
  return (
    <nav aria-label="Breadcrumb" className={cn('mb-2 text-sm text-muted-foreground', className)}>
      <ol className="flex flex-wrap items-center gap-1.5">
        {steps.map((step, index) => {
          const last = index === steps.length - 1
          return (
            <li key={`${step.label}-${index}`} className="flex items-center gap-1.5">
              {last ? (
                <span aria-current="page" className="text-foreground">
                  {step.label}
                </span>
              ) : (
                <a
                  href={step.href}
                  onClick={(event) => {
                    if (step.onClick) {
                      event.preventDefault()
                      step.onClick()
                    }
                  }}
                  className="hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {step.label}
                </a>
              )}
              {!last && <span aria-hidden="true">›</span>}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
