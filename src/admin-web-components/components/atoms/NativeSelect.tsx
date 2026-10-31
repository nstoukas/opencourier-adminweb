import * as React from 'react'

import { cn } from '../../../ui-shared-utils'

/**
 * shadcn's NativeSelect: the browser's own <select>, styled like the design system's Input
 * (36px tall, the input border, the ring on focus). The redesign uses it for short option
 * lists, where a native list is quicker to use by keyboard and on phones than a custom menu.
 */
// `React.ComponentProps<'select'>` = every prop a plain <select> takes (value, onChange, id, …).
function NativeSelect({ className, ...props }: React.ComponentProps<'select'>) {
  return (
    <select
      data-slot="native-select"
      className={cn(
        'h-9 w-full min-w-0 rounded-md border border-input bg-background px-3 text-sm shadow-sm',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...props}
    />
  )
}

export { NativeSelect }
