import React, { useState } from 'react'
import Link from 'next/link'
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
import { athensDayTime } from '@/utils/athensMonth'
import {
  COMPLAINT_TEXT_MAX,
  RIDER_COULD_NOT_REPLY,
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
              <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
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
    } catch (err: any) {
      toast({ title: err?.message || failed, variant: 'destructive' })
      return false
    }
  }

  if (!complaint) {
    return (
      <>
        <PageHeader title="Complaint" />
        <p className="text-sm text-muted-foreground" role={query.isError ? 'alert' : undefined}>
          {query.isError ? 'The complaint could not be loaded.' : 'Loading…'}
        </p>
      </>
    )
  }

  const aboutRider = complaint.about === 'RIDER'
  const awaitingReply = complaint.status === 'AWAITING_REPLY'

  return (
    <>
      <PageHeader
        title={`Complaint: ${categoryText(complaint.category)}`}
        description={statusText(complaint.status)}
      />
      <div className="mb-4">
        <Link href={EAdminRoutes.COMPLAINTS} className="text-sm underline underline-offset-2">
          All complaints
        </Link>
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="flex min-w-0 flex-col gap-6">
          <Card data-testid="complaint-text">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">The complaint</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <p className="whitespace-pre-wrap break-words">{complaint.text}</p>
              {complaint.hasPhoto ? <ComplaintPhoto complaintId={complaint.id} /> : null}
            </CardContent>
          </Card>

          {aboutRider ? (
            <Card data-testid="complaint-reply">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">The rider&apos;s reply</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {complaint.riderReply !== null ? (
                  <>
                    <p className="whitespace-pre-wrap break-words">{complaint.riderReply}</p>
                    <p className="text-xs text-muted-foreground">
                      {complaint.repliedAt ? athensDayTime(complaint.repliedAt) : null}
                      {complaint.replyEnteredBy
                        ? ` · Entered from a phone call by ${complaint.replyEnteredBy} (the rider's account was deactivated)`
                        : ' · From the rider, in the app'}
                    </p>
                  </>
                ) : (
                  <p className="text-muted-foreground">
                    Waiting for the rider&apos;s reply. The rider was told in the app; nothing can be decided before
                    the reply, and there is no deadline. You can still withdraw the complaint.
                  </p>
                )}
                {awaitingReply && complaint.aboutCourierDeactivated ? (
                  <TextForm
                    id="reply-for-rider"
                    label="Enter the reply for the rider"
                    hint="The rider's account is deactivated, so they cannot reply in the app. Write down what they said on the phone, or that they could not reply. It is marked as entered by you."
                    buttonText="Save the reply"
                    busy={replyState.isLoading}
                    onSave={(text) =>
                      run(
                        () => replyForRider({ id: complaint.id, text }).unwrap(),
                        'Reply saved.',
                        'The reply could not be saved.'
                      )
                    }
                    extra={(setText) => (
                      <Button type="button" size="sm" variant="outline" onClick={() => setText(RIDER_COULD_NOT_REPLY)}>
                        The rider could not reply
                      </Button>
                    )}
                  />
                ) : null}
              </CardContent>
            </Card>
          ) : null}

          <Card data-testid="complaint-decision">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Decision</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              {complaint.status === 'DECIDED' ? (
                <>
                  <p className="whitespace-pre-wrap break-words">{complaint.outcome}</p>
                  <p className="text-xs text-muted-foreground">
                    Decided {complaint.decidedAt ? athensDayTime(complaint.decidedAt) : ''} by{' '}
                    {complaint.decidedBy ?? 'a removed admin'}
                  </p>
                </>
              ) : null}
              {complaint.status === 'WITHDRAWN' ? (
                <>
                  <p className="font-medium">Withdrawn, with no finding against anyone.</p>
                  <p className="whitespace-pre-wrap break-words">{complaint.withdrawnReason}</p>
                  <p className="text-xs text-muted-foreground">
                    Withdrawn {complaint.withdrawnAt ? athensDayTime(complaint.withdrawnAt) : ''} by{' '}
                    {complaint.withdrawnBy ?? 'a removed admin'}
                  </p>
                </>
              ) : null}
              {isOpen(complaint) ? (
                <>
                  <TextForm
                    id="decide-outcome"
                    label="Outcome"
                    hint={
                      awaitingReply
                        ? "Waiting for the rider's reply: a decision can be recorded once they have replied."
                        : complaint.filedBy === 'RIDER'
                          ? 'Shown to the rider who filed it. Once saved it cannot be changed.'
                          : 'Shown to the rider and to whoever filed it. Once saved it cannot be changed.'
                    }
                    buttonText="Record the decision"
                    busy={decideState.isLoading}
                    disabled={awaitingReply}
                    confirm={{
                      title: 'Record this decision?',
                      body:
                        complaint.filedBy === 'RIDER'
                          ? 'The rider who filed it will see it, and it cannot be changed.'
                          : 'The rider and whoever filed it will see it, and it cannot be changed.',
                    }}
                    onSave={(outcome) =>
                      run(
                        () => decide({ id: complaint.id, outcome }).unwrap(),
                        'Decision recorded.',
                        'The decision could not be saved.'
                      )
                    }
                  />
                  {withdrawing ? (
                    <TextForm
                      id="withdraw-reason"
                      label="Why it is withdrawn"
                      hint="Closes the complaint with no finding against anyone. The reason is shown to the rider and to whoever filed it."
                      buttonText="Withdraw the complaint"
                      busy={withdrawState.isLoading}
                      confirm={{
                        title: 'Withdraw this complaint?',
                        body: 'It closes with no finding against anyone, and it cannot be reopened. The reason is shown to the rider and to whoever filed it.',
                      }}
                      onSave={(reason) =>
                        run(
                          () => withdraw({ id: complaint.id, reason }).unwrap(),
                          'Complaint withdrawn.',
                          'The complaint could not be withdrawn.'
                        )
                      }
                      extra={() => (
                        <Button type="button" size="sm" variant="ghost" onClick={() => setWithdrawing(false)}>
                          Cancel
                        </Button>
                      )}
                    />
                  ) : (
                    <Button type="button" size="sm" variant="outline" onClick={() => setWithdrawing(true)}>
                      Withdraw…
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
              <CardTitle className="text-lg">Details</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              <DetailList
                items={[
                  { label: 'Made', value: athensDayTime(complaint.createdAt) },
                  { label: 'From', value: filerText(complaint) },
                  { label: 'About', value: aboutText(complaint) },
                  { label: 'What', value: categoryText(complaint.category) },
                  { label: 'Status', value: statusText(complaint.status) },
                ]}
              />
              <div className="mt-4 flex flex-col gap-2">
                <Link
                  href={{ pathname: EAdminRoutes.DELIVERY_DETAILS, query: { deliveryId: complaint.delivery.id } }}
                  className="underline underline-offset-2"
                >
                  Delivery: {complaint.delivery.pickupName}, {athensDayTime(complaint.delivery.createdAt)}
                </Link>
                {complaint.aboutCourierId ? (
                  <Link
                    href={{ pathname: EAdminRoutes.COURIER_DETAILS, query: { courierId: complaint.aboutCourierId } }}
                    className="underline underline-offset-2"
                  >
                    Rider: {complaint.aboutCourierName ?? complaint.aboutCourierId}
                    {complaint.aboutCourierDeactivated ? ' (deactivated)' : ''}
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
