import * as React from 'react'

import { cn } from '../../../ui-shared-utils'
import { Label } from './Label'

/**
 * shadcn's Field (new-york-v4), the design system's labelled control, trimmed to the parts the
 * admin sign in uses: FieldGroup > Field > FieldLabel + control. The same component request-web
 * added in row 92; FieldDescription, FieldSet and FieldError come when a screen first needs them.
 */

// A vertical stack of Fields, 24px apart.
function FieldGroup({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="field-group" className={cn('flex w-full flex-col gap-6', className)} {...props} />
}

// `React.ComponentProps<'div'>` means "every prop a plain <div> accepts", so a Field takes
// className, id and data attributes without listing them one by one.
function Field({ className, ...props }: React.ComponentProps<'div'>) {
  return <div role="group" data-slot="field" className={cn('flex w-full flex-col gap-2', className)} {...props} />
}

function FieldLabel({ className, ...props }: React.ComponentProps<typeof Label>) {
  return <Label data-slot="field-label" className={cn('leading-snug', className)} {...props} />
}

export { Field, FieldGroup, FieldLabel }
