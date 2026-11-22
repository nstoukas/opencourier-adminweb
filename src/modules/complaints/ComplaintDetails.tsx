import React, { useState } from 'react'
import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  DetailList,
  Label,
  Textarea,
  useToast,
} from '@/admin-web-components'
import type { ComplaintAdminDto } from '@/backend-admin-sdk'
import {
  useDecideComplaintMutation,
  useGetComplaintQuery,
  useReplyForRiderMutation,
  useWithdrawComplaintMutation,
} from '@/api/complaintApi'
import { PageHeader } from '@/components/layouts/PageHeader'
import { EAdminRoutes } from '@/hooks/useAdminPageNavigator'
import { usePageVisible } from '@/hooks/usePageVisible'
import { useServerText } from '@/i18n/useServerText'
import { athensDayTime } from '@/utils/athensMonth'
import {
  COMPLAINT_TEXT_MAX,
  RIDER_COULD_NOT_REPLY_KEY,
  aboutText,
  categoryText,
  filerText,
  statusText,
} from './complaintDisplay'
import { ComplaintPhoto } from './ComplaintPhoto'

const isOpen = (complaint: ComplaintAdminDto) =>
  complaint.status === 'OPEN' || complaint.status === 'AWAITING_REPLY'

// A text box with its label, counter and one button, used by the three forms on this page.
function TextForm({
  id,
  label,
  hint,
  buttonText,
  busy,
  disabled,
  onSave,
  extra,
  confirm,
}: {
  id: string
  label: string
  hint: string
  buttonText: string
  busy: boolean
  disabled?: boolean
  onSave: (text: string) => Promise<boolean>
  // A second button beside Save, given the setter so it can fill the box.
  extra?: (setText: (text: string) => void) => React.ReactNode
  // Row 83 review: a final step (a decision, a withdrawal) is asked again in a dialog before it is saved,
  // as the courier app asks before the rider's one reply.
  confirm?: { title: string; body: string }
}) {
  // useTranslation gives t, which looks a key up in the reader's language.
  const { t } = useTranslation()
  const [text, setText] = useState('')
  const [asking, setAsking] = useState(false)
  const trimmed = text.trim()
  const save = async () => {
    if (await onSave(trimmed)) setText('')
    setAsking(false)
  }
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <p className="text-xs text-muted-foreground">{hint}</p>
      <Textarea
        id={id}
        value={text}
        maxLength={COMPLAINT_TEXT_MAX}
        disabled={disabled || busy}
        onChange={(event) => setText(event.target.value)}
      />
      <p className="text-right text-xs text-muted-foreground">
        {text.length}/{COMPLAINT_TEXT_MAX}
      </p>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          disabled={disabled || busy || trimmed.length === 0}
          onClick={() => (confirm ? setAsking(true) : save())}
        >
          {buttonText}
        </Button>
        {extra ? extra(setText) : null}
      </div>
      {confirm && asking ? (
        <AlertDialog open onOpenChange={(open) => !open && !busy && setAsking(false)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{confirm.title}</AlertDialogTitle>
              <AlertDialogDescription>{confirm.body}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={busy}>{t('common.cancel')}</AlertDialogCancel>
              {/* A plain Button, so the dialog stays open until the save is done. */}
              <Button onClick={save} disabled={busy}>
                {buttonText}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : null}
    </div>
  )
}

// Spec 0052 (AC-5, AC-6, AC-10; cross check 2): one complaint with everything on it, who filed it, the
// rider's reply, and the decision or the withdrawal with who and when. A complaint about a rider cannot be
// decided before the rider replied (the server answers 409 "Waiting for the rider's reply"); it can be
// withdrawn at any time. Only for a deactivated rider may an admin enter the reply taken by phone.
export function ComplaintDetails({ complaintId }: { complaintId: string }) {
  const { toast } = useToast()
  const pageVisible = usePageVisible()
  const { t } = useTranslation()
  // errorText: the server's refusal in the reader's language, else the fallback given.
  const { errorText } = useServerText()
  // `currentData`: going back between two complaints never shows the previous one (AGENTS.md). The rider
  // replies from the phone, which invalidates nothing here, so the page polls while visible.
  const query = useGetComplaintQuery(
    { id: complaintId },
    { skip: !complaintId, pollingInterval: pageVisible ? 30_000 : 0 }
  )
  const complaint = query.currentData
  const [decide, decideState] = useDecideComplaintMutation()
  const [withdraw, withdrawState] = useWithdrawComplaintMutation()
  const [replyForRider, replyState] = useReplyForRiderMutation()
  const [withdrawing, setWithdrawing] = useState(false)

  // Runs one write and says what went wrong in the server's own words (a 409 names the reason).
  const run = async (write: () => Promise<unknown>, done: string, failed: string): Promise<boolean> => {
    try {
      await write()
      toast({ title: done })
      return true
    } catch (err) {
      toast({ title: errorText(err, failed), variant: 'destructive' })
      return false
    }
  }

  if (!complaint) {
    return (
      <>
        <PageHeader title={t('complaints.details.title')} />
        <p className="text-sm text-muted-foreground" role={query.isError ? 'alert' : undefined}>
          {query.isError ? t('complaints.details.loadFailed') : t('common.loading')}
        </p>
      </>
    )
  }

  const aboutRider = complaint.about === 'RIDER'
  const awaitingReply = complaint.status === 'AWAITING_REPLY'

  return (
    <>
      <PageHeader
        title={t('complaints.details.titleWithCategory', { category: categoryText(t, complaint.category) })}
        description={statusText(t, complaint.status)}
      />
      <div className="mb-4">
        <Link href={EAdminRoutes.COMPLAINTS} className="text-sm underline underline-offset-2">
          {t('complaints.details.allComplaints')}
        </Link>
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="flex min-w-0 flex-col gap-6">
          <Card data-testid="complaint-text">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">{t('complaints.details.complaint')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <p className="whitespace-pre-wrap break-words">{complaint.text}</p>
              {complaint.hasPhoto ? <ComplaintPhoto complaintId={complaint.id} /> : null}
            </CardContent>
          </Card>

          {aboutRider ? (
            <Card data-testid="complaint-reply">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">{t('complaints.details.reply')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {complaint.riderReply !== null ? (
                  <>
                    <p className="whitespace-pre-wrap break-words">{complaint.riderReply}</p>
                    <p className="text-xs text-muted-foreground">
                      {complaint.repliedAt ? athensDayTime(complaint.repliedAt) : null}
                      {' · '}
                      {complaint.replyEnteredBy
                        ? t('complaints.details.replyEnteredBy', { name: complaint.replyEnteredBy })
                        : t('complaints.details.replyFromApp')}
                    </p>
                  </>
                ) : (
                  <p className="text-muted-foreground">{t('complaints.details.waitingForReply')}</p>
                )}
                {awaitingReply && complaint.aboutCourierDeactivated ? (
                  <TextForm
                    id="reply-for-rider"
                    label={t('complaints.details.replyForRider')}
                    hint={t('complaints.details.replyForRiderHint')}
                    buttonText={t('complaints.details.saveReply')}
                    busy={replyState.isLoading}
                    onSave={(text) =>
                      run(
                        () => replyForRider({ id: complaint.id, text }).unwrap(),
                        t('complaints.details.replySaved'),
                        t('complaints.details.replyFailed')
                      )
                    }
                    extra={(setText) => (
                      <Button type="button" size="sm" variant="outline" onClick={() => setText(t(RIDER_COULD_NOT_REPLY_KEY))}>
                        {t('complaints.details.riderCouldNotReplyButton')}
                      </Button>
                    )}
                  />
                ) : null}
              </CardContent>
            </Card>
          ) : null}

          <Card data-testid="complaint-decision">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">{t('complaints.details.decision')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              {complaint.status === 'DECIDED' ? (
                <>
                  <p className="whitespace-pre-wrap break-words">{complaint.outcome}</p>
                  <p className="text-xs text-muted-foreground">
                    {t('complaints.details.decidedBy', {
                      when: complaint.decidedAt ? athensDayTime(complaint.decidedAt) : '',
                      name: complaint.decidedBy ?? t('complaints.details.removedAdmin'),
                    })}
                  </p>
                </>
              ) : null}
              {complaint.status === 'WITHDRAWN' ? (
                <>
                  <p className="font-medium">{t('complaints.details.withdrawnNoFinding')}</p>
                  <p className="whitespace-pre-wrap break-words">{complaint.withdrawnReason}</p>
                  <p className="text-xs text-muted-foreground">
                    {t('complaints.details.withdrawnBy', {
                      when: complaint.withdrawnAt ? athensDayTime(complaint.withdrawnAt) : '',
                      name: complaint.withdrawnBy ?? t('complaints.details.removedAdmin'),
                    })}
                  </p>
                </>
              ) : null}
              {isOpen(complaint) ? (
                <>
                  <TextForm
                    id="decide-outcome"
                    label={t('complaints.details.outcome')}
                    hint={
                      awaitingReply
                        ? t('complaints.details.outcomeHintWaiting')
                        : complaint.filedBy === 'RIDER'
                          ? t('complaints.details.outcomeHintRider')
                          : t('complaints.details.outcomeHintOthers')
                    }
                    buttonText={t('complaints.details.recordDecision')}
                    busy={decideState.isLoading}
                    disabled={awaitingReply}
                    confirm={{
                      title: t('complaints.details.confirmDecisionTitle'),
                      body:
                        complaint.filedBy === 'RIDER'
                          ? t('complaints.details.confirmDecisionRider')
                          : t('complaints.details.confirmDecisionOthers'),
                    }}
                    onSave={(outcome) =>
                      run(
                        () => decide({ id: complaint.id, outcome }).unwrap(),
                        t('complaints.details.decisionRecorded'),
                        t('complaints.details.decisionFailed')
                      )
                    }
                  />
                  {withdrawing ? (
                    <TextForm
                      id="withdraw-reason"
                      label={t('complaints.details.withdrawReason')}
                      hint={t('complaints.details.withdrawHint')}
                      buttonText={t('complaints.details.withdrawConfirm')}
                      busy={withdrawState.isLoading}
                      confirm={{
                        title: t('complaints.details.confirmWithdrawTitle'),
                        body: t('complaints.details.confirmWithdrawBody'),
                      }}
                      onSave={(reason) =>
                        run(
                          () => withdraw({ id: complaint.id, reason }).unwrap(),
                          t('complaints.details.withdrawn'),
                          t('complaints.details.withdrawFailed')
                        )
                      }
                      extra={() => (
                        <Button type="button" size="sm" variant="ghost" onClick={() => setWithdrawing(false)}>
                          {t('common.cancel')}
                        </Button>
                      )}
                    />
                  ) : (
                    <Button type="button" size="sm" variant="outline" onClick={() => setWithdrawing(true)}>
                      {t('complaints.details.withdraw')}
                    </Button>
                  )}
                </>
              ) : null}
            </CardContent>
          </Card>
        </div>

        <div className="flex min-w-0 flex-col gap-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">{t('complaints.details.details')}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              <DetailList
                items={[
                  { label: t('complaints.fields.made'), value: athensDayTime(complaint.createdAt) },
                  { label: t('complaints.fields.from'), value: filerText(t, complaint) },
                  { label: t('complaints.fields.about'), value: aboutText(t, complaint) },
                  { label: t('complaints.fields.what'), value: categoryText(t, complaint.category) },
                  { label: t('complaints.fields.status'), value: statusText(t, complaint.status) },
                ]}
              />
              <div className="mt-4 flex flex-col gap-2">
                <Link
                  href={{ pathname: EAdminRoutes.DELIVERY_DETAILS, query: { deliveryId: complaint.delivery.id } }}
                  className="underline underline-offset-2"
                >
                  {t('complaints.details.deliveryLink', {
                    name: complaint.delivery.pickupName,
                    when: athensDayTime(complaint.delivery.createdAt),
                  })}
                </Link>
                {complaint.aboutCourierId ? (
                  <Link
                    href={{ pathname: EAdminRoutes.COURIER_DETAILS, query: { courierId: complaint.aboutCourierId } }}
                    className="underline underline-offset-2"
                  >
                    {t('complaints.details.riderLink', { name: complaint.aboutCourierName ?? complaint.aboutCourierId })}
                    {complaint.aboutCourierDeactivated ? t('complaints.details.deactivatedSuffix') : ''}
                  </Link>
                ) : null}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}
