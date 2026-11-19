import { useRef, useState } from 'react'
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
  Input,
  Textarea,
  useToast,
} from '@/admin-web-components'
import type { ReviewOutcome, ReviewRequestAdminDto } from '@/backend-admin-sdk'
import { refreshReviewRequests, useAnswerReviewRequestMutation } from '@/api/reviewRequestApi'
import { backendMessage } from '@/modules/couriers/courierAccountRules'
import { useAppDispatch } from '@/ui-shared-utils'
import { formatMoney } from '@/utils/formatMoney'
import { REVIEW_ANSWER_MAX, REVIEW_OUTCOME_TO_HUMAN, parseCorrectionCents } from './reviewDisplay'

function isConflict(err: unknown): boolean {
  return (err as { statusCode?: number } | undefined)?.statusCode === 409
}

// Spec 0038 (AC-6, AC-7): a person answers a rider's review request. An outcome and a reason are
// required. On a "changed" answer about a delivery, an optional pay correction in euro, refused above
// the co-op's cap; a correction is confirmed on a second step that repeats the amount, because it
// cannot be undone. The answer is the rider's to read, so it goes nowhere else.
export function AnswerReviewButton({
  request,
  correctionMaxCents,
  currencyCode,
}: {
  request: ReviewRequestAdminDto
  // The co-op's cap, from Instance configuration; null while it loads.
  correctionMaxCents: number | null
  currencyCode: string
}) {
  const { toast } = useToast()
  const dispatch = useAppDispatch()
  const [answer, { isLoading }] = useAnswerReviewRequestMutation()
  const [open, setOpen] = useState(false)
  // 'write' is the form; 'confirm' repeats the correction before it is sent. Kept apart from `open`,
  // so the title does not change while the dialog closes (adminweb AGENTS.md gotcha).
  const [step, setStep] = useState<'write' | 'confirm'>('write')
  const [outcome, setOutcome] = useState<ReviewOutcome | null>(null)
  const [reason, setReason] = useState('')
  const [correction, setCorrection] = useState('')
  const [error, setError] = useState<string | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  const canCorrect = outcome === 'CHANGED' && request.delivery !== null
  const correctionText = canCorrect ? correction.trim() : ''
  const correctionCents = correctionText === '' ? null : parseCorrectionCents(correctionText)
  const correctionError =
    correctionText === ''
      ? null
      : correctionCents === null
        ? 'Write an amount in euro above 0, such as 1.50.'
        : correctionMaxCents !== null && correctionCents > correctionMaxCents
          ? `At most ${formatMoney(correctionMaxCents, currencyCode)}, the co-op's limit.`
          : null
  const reasonText = reason.trim()
  const ready = outcome !== null && reasonText.length > 0 && reasonText.length <= REVIEW_ANSWER_MAX && !correctionError

  const handleOpenChange = (next: boolean) => {
    if (isLoading) return
    if (next) {
      setStep('write')
      setOutcome(null)
      setReason('')
      setCorrection('')
      setError(null)
    }
    setOpen(next)
  }

  const send = async () => {
    if (!outcome) return
    setError(null)
    try {
      await answer({
        id: request.id,
        input: {
          outcome,
          answer: reasonText,
          ...(correctionCents !== null ? { correctionCents } : {}),
        },
      }).unwrap()
      setOpen(false)
      toast({ title: 'Answer sent', description: `${request.courierName} can read it in the app.` })
    } catch (err) {
      const message = backendMessage(err, 'The answer could not be sent. Try again in a moment.')
      if (isConflict(err)) {
        // Someone else answered it, or the rider withdrew it: the row is about to change under the dialog.
        setOpen(false)
        dispatch(refreshReviewRequests())
        toast({ title: 'Not sent', description: message, variant: 'destructive' })
      } else {
        setStep('write')
        setError(message)
      }
    }
  }

  const next = () => {
    if (!ready) return
    if (correctionCents !== null) setStep('confirm')
    else void send()
  }

  return (
    <>
      <Button ref={triggerRef} type="button" size="sm" onClick={() => handleOpenChange(true)}>
        Answer
      </Button>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent
          className="sm:max-w-lg"
          onCloseAutoFocus={(event) => {
            event.preventDefault()
            triggerRef.current?.focus()
          }}
        >
          {step === 'write' ? (
            <>
              <DialogHeader>
                <DialogTitle>Answer {request.courierName}</DialogTitle>
                <DialogDescription>
                  The rider reads your answer in the app. Nothing is decided until you send it.
                </DialogDescription>
              </DialogHeader>
              <blockquote className="whitespace-pre-wrap rounded-md border bg-muted p-3 text-sm">{request.note}</blockquote>
              <fieldset className="space-y-2">
                <legend className="text-sm font-medium">Outcome</legend>
                {(['STANDS', 'CHANGED'] as ReviewOutcome[]).map((value) => (
                  <label key={value} className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name={`outcome-${request.id}`}
                      value={value}
                      checked={outcome === value}
                      onChange={() => setOutcome(value)}
                    />
                    {REVIEW_OUTCOME_TO_HUMAN[value]}
                  </label>
                ))}
              </fieldset>
              <Field>
                <FieldLabel htmlFor={`review-answer-${request.id}`}>Reason</FieldLabel>
                <Textarea
                  id={`review-answer-${request.id}`}
                  rows={4}
                  value={reason}
                  maxLength={REVIEW_ANSWER_MAX}
                  onChange={(event) => setReason(event.target.value)}
                />
                <FieldDescription>Say why, in words the rider can follow. At most {REVIEW_ANSWER_MAX} characters.</FieldDescription>
              </Field>
              {canCorrect ? (
                <Field>
                  <FieldLabel htmlFor={`review-correction-${request.id}`}>Pay correction in euro (optional)</FieldLabel>
                  <Input
                    id={`review-correction-${request.id}`}
                    inputMode="decimal"
                    value={correction}
                    aria-invalid={correctionError ? true : undefined}
                    onChange={(event) => setCorrection(event.target.value)}
                  />
                  <FieldDescription>
                    Added to {request.courierName}&apos;s pay for this delivery, today. It only adds, never takes away
                    {correctionMaxCents !== null ? `, up to ${formatMoney(correctionMaxCents, currencyCode)}` : ''}.
                  </FieldDescription>
                  {correctionError ? <FieldError>{correctionError}</FieldError> : null}
                </Field>
              ) : null}
              {error ? (
                <p role="alert" className="text-sm text-destructive">
                  {error}
                </p>
              ) : null}
              <DialogFooter>
                <Button type="button" variant="outline" disabled={isLoading} onClick={() => handleOpenChange(false)}>
                  Not now
                </Button>
                <Button type="button" disabled={!ready || isLoading} onClick={next}>
                  {isLoading ? 'Sending…' : correctionCents !== null ? 'Next' : 'Send answer'}
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Add {formatMoney(correctionCents, currencyCode)} to this rider&apos;s pay?</DialogTitle>
                <DialogDescription>
                  {request.courierName} is paid {formatMoney(correctionCents, currencyCode)} more for this delivery, on
                  today&apos;s earnings. It is recorded on the delivery and cannot be undone.
                </DialogDescription>
              </DialogHeader>
              {error ? (
                <p role="alert" className="text-sm text-destructive">
                  {error}
                </p>
              ) : null}
              <DialogFooter>
                <Button type="button" variant="outline" disabled={isLoading} onClick={() => setStep('write')}>
                  Back
                </Button>
                <Button type="button" disabled={isLoading} onClick={() => void send()}>
                  {isLoading ? 'Sending…' : `Send and add ${formatMoney(correctionCents, currencyCode)}`}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
