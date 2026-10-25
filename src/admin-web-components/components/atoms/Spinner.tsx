import * as React from 'react'
import { CircleNotch } from '@phosphor-icons/react'

import { cn } from '../../../ui-shared-utils'

// `React.ComponentProps<typeof CircleNotch>` means "whatever props the Phosphor icon takes",
// so callers can still pass className, size or weight.
type SpinnerProps = React.ComponentProps<typeof CircleNotch> & { label?: string }

/**
 * The loading mark: Phosphor's CircleNotch, spinning. Put it inside the disabled button that
 * started the work and keep the button's label. Lists and cards load with Skeleton instead.
 */
function Spinner({ className, label = 'Loading', ...props }: SpinnerProps) {
  // Icons are hidden from screen readers by default (IconContext in _app.tsx). The spinner is
  // the one icon that says something ("Loading"), so it opts back in with aria-hidden={false}.
  return (
    <CircleNotch
      role="status"
      aria-label={label}
      aria-hidden={false}
      className={cn('h-4 w-4 animate-spin', className)}
      {...props}
    />
  )
}

export { Spinner }
