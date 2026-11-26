import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
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
import { useFormat } from '@/i18n/useFormat'
import { useServerText } from '@/i18n/useServerText'
import { useAppDispatch } from '@/ui-shared-utils'
import { REVIEW_ANSWER_MAX, outcomeText, parseCorrectionCents } from './reviewDisplay'

// The answer's outcomes, in the order the dialog offers them: a copy of the backend's EnumReviewOutcome,
// named so src/test-utils/handMirrors.test.ts can compare it with the backend (row 181).
const REVIEW_OUTCOMES: ReviewOutcome[] = ['STANDS', 'CHANGED']

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
  // useTranslation gives t, which looks a key up in the reader's language.
  const { t } = useTranslation()
  // useFormat gives money in the reader's language.
  const f = useFormat()
  // errorText: the server's refusal in the reader's language, else the fallback given.
  const { errorText } = useServerText()
  const [answer, { isLoading }] = useAnswerReviewRequestMutation()
  const [open, setOpen] = useState(false)
  // 'write' is the form; 'confirm' repeats the correction before it is sent. Kept apart from `open`,
  // so the title does not change while the dialog closes (adminweb AGENTS.md gotcha).
  const [step, setStep] = useState<'write' | 'confirm'>('write')
  const [outcome, setOutcome] = useState<ReviewOutcome | null>(null)
  const [reason, setReason] = useState('')
  const [correction, setCorrection] = useState('')
  // The failed request's error itself, not words, so the message is written in the language shown now.
  const [error, setError] = useState<unknown>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  // True once the answer went (or someone else's did): the row and this button are about to leave the
  // list, so focus goes to the page's main area instead of a button that no longer exists.
  const rowLeavingRef = useRef(false)

  const canCorrect = outcome === 'CHANGED' && request.delivery !== null
  const correctionText = canCorrect ? correction.trim() : ''
  const correctionCents = correctionText === '' ? null : parseCorrectionCents(correctionText)
  const correctionError =
    correctionText === ''
      ? null
      : correctionCents === null
        ? t('reviews.answer.correctionInvalid')
        : correctionMaxCents === null
          ? // Without the cap the browser cannot check the amount, so nothing goes to the confirm step.
            t('reviews.answer.capNotLoaded')
          : correctionCents > correctionMaxCents
            ? t('reviews.answer.overCap', { max: f.money(correctionMaxCents, currencyCode) })
            : null
  const reasonText = reason.trim()
  const ready = outcome !== null && reasonText.length > 0 && reasonText.length <= REVIEW_ANSWER_MAX && !correctionError

  const handleOpenChange = (next: boolean) => {
    if (isLoading) return
    if (next) {
      rowLeavingRef.current = false
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
      rowLeavingRef.current = true
      setOpen(false)
      toast({
        title: t('reviews.answer.sent'),
        description: t('reviews.answer.sentDescription', { name: request.courierName }),
      })
    } catch (err) {
      if (isConflict(err)) {
        // Someone else answered it, or the rider withdrew it: the row is about to change under the dialog.
        rowLeavingRef.current = true
        setOpen(false)
        dispatch(refreshReviewRequests())
        toast({
          title: t('reviews.answer.notSent'),
          description: errorText(err, t('reviews.answer.failed')),
          variant: 'destructive',
        })
      } else {
        setStep('write')
        // `?? {}`: a throw of nothing still shows the fallback.
        setError(err ?? {})
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
        {t('reviews.answer.button')}
      </Button>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent
          className="sm:max-w-lg"
          onCloseAutoFocus={(event) => {
            event.preventDefault()
            if (rowLeavingRef.current) document.getElementById('main')?.focus()
            else triggerRef.current?.focus()
          }}
        >
          {step === 'write' ? (
            <>
              <DialogHeader>
                <DialogTitle>{t('reviews.answer.title', { name: request.courierName })}</DialogTitle>
                <DialogDescription>{t('reviews.answer.description')}</DialogDescription>
              </DialogHeader>
              <blockquote className="whitespace-pre-wrap rounded-md border bg-muted p-3 text-sm">{request.note}</blockquote>
              <fieldset className="space-y-2">
                <legend className="text-sm font-medium">{t('reviews.answer.outcome')}</legend>
                {REVIEW_OUTCOMES.map((value) => (
                  <label key={value} className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name={`outcome-${request.id}`}
                      value={value}
                      checked={outcome === value}
                      onChange={() => setOutcome(value)}
                    />
                    {outcomeText(t, value)}
                  </label>
                ))}
              </fieldset>
              <Field>
                <FieldLabel htmlFor={`review-answer-${request.id}`}>{t('reviews.answer.reason')}</FieldLabel>
                <Textarea
                  id={`review-answer-${request.id}`}
                  rows={4}
                  value={reason}
                  maxLength={REVIEW_ANSWER_MAX}
                  onChange={(event) => setReason(event.target.value)}
                />
                <FieldDescription>{t('reviews.answer.reasonHint', { max: REVIEW_ANSWER_MAX })}</FieldDescription>
              </Field>
              {canCorrect ? (
                <Field>
                  <FieldLabel htmlFor={`review-correction-${request.id}`}>{t('reviews.answer.correction')}</FieldLabel>
                  <Input
                    id={`review-correction-${request.id}`}
                    inputMode="decimal"
                    value={correction}
                    aria-invalid={correctionError ? true : undefined}
                    aria-describedby={
                      correctionError
                        ? `review-correction-help-${request.id} review-correction-error-${request.id}`
                        : `review-correction-help-${request.id}`
                    }
                    onChange={(event) => setCorrection(event.target.value)}
                  />
                  <FieldDescription id={`review-correction-help-${request.id}`}>
                    {correctionMaxCents !== null
                      ? t('reviews.answer.correctionHintCap', {
                          name: request.courierName,
                          max: f.money(correctionMaxCents, currencyCode),
                        })
                      : t('reviews.answer.correctionHint', { name: request.courierName })}
                  </FieldDescription>
                  {correctionError ? (
                    <FieldError id={`review-correction-error-${request.id}`} role="alert">
                      {correctionError}
                    </FieldError>
                  ) : null}
                </Field>
              ) : null}
              {error ? (
                <p role="alert" className="text-sm text-destructive">
                  {errorText(error, t('reviews.answer.failed'))}
                </p>
              ) : null}
              <DialogFooter>
                <Button type="button" variant="outline" disabled={isLoading} onClick={() => handleOpenChange(false)}>
                  {t('reviews.answer.notNow')}
                </Button>
                <Button type="button" disabled={!ready || isLoading} onClick={next}>
                  {isLoading
                    ? t('reviews.answer.sending')
                    : correctionCents !== null
                      ? t('reviews.answer.next')
                      : t('reviews.answer.send')}
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              {/* role="alert": the step changes inside an open dialog, so a screen reader is told what it now asks. */}
              <DialogHeader role="alert">
                <DialogTitle>
                  {t('reviews.answer.confirmTitle', { amount: f.money(correctionCents, currencyCode) })}
                </DialogTitle>
                <DialogDescription>
                  {t('reviews.answer.confirmBody', {
                    name: request.courierName,
                    amount: f.money(correctionCents, currencyCode),
                  })}
                </DialogDescription>
              </DialogHeader>
              {error ? (
                <p role="alert" className="text-sm text-destructive">
                  {errorText(error, t('reviews.answer.failed'))}
                </p>
              ) : null}
              <DialogFooter>
                {/* Focus lands on Back, never on the button that pays, when this step opens. */}
                <Button type="button" variant="outline" autoFocus disabled={isLoading} onClick={() => setStep('write')}>
                  {t('common.back')}
                </Button>
                <Button type="button" disabled={isLoading} onClick={() => void send()}>
                  {isLoading
                    ? t('reviews.answer.sending')
                    : t('reviews.answer.sendAndAdd', { amount: f.money(correctionCents, currencyCode) })}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
