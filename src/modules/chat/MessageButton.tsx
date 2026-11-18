import { useId } from 'react'
import { useRouter } from 'next/router'
import { ChatCircle } from '@phosphor-icons/react'
import { useOpenChatThreadMutation } from '@/api/chatApi'
import { Button, useToast } from '../../admin-web-components'
import { focusComposerOnOpen } from './composerFocus'

// The reason a restaurant with no sign in has no Message button to press (AC-15).
export const NO_LOGIN_REASON = 'This restaurant has no sign in, so it could never read a reply.'

// Spec 0034 (chat), AC-15: on a courier's or a restaurant's page, opens their thread ready to write,
// making it first if it does not exist yet.
export function MessageButton({
  party,
  name,
  disabledReason,
}: {
  party: { courierId: string } | { partnerId: string }
  name: string
  disabledReason?: string
}) {
  const router = useRouter()
  const { toast } = useToast()
  const reasonId = useId()
  const [openThread, { isLoading }] = useOpenChatThreadMutation()

  async function onClick() {
    const result = await openThread(party)
    if ('data' in result) {
      focusComposerOnOpen(result.data.id)
      void router.push(`/chat/${result.data.id}`)
    } else {
      toast({ title: `Could not open the conversation with ${name}`, variant: 'destructive' })
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        disabled={Boolean(disabledReason) || isLoading}
        onClick={() => void onClick()}
        aria-describedby={disabledReason ? reasonId : undefined}
        title={disabledReason}
      >
        <ChatCircle aria-hidden="true" className="mr-2 h-4 w-4" />
        Message
      </Button>
      {/* Said on screen beside the button, not only to a screen reader: a disabled button takes no focus
          and a touch screen shows no title, so this is the one place everyone can read why (AC-15). */}
      {disabledReason ? (
        <span id={reasonId} className="max-w-[16rem] text-sm text-muted-foreground">
          {disabledReason}
        </span>
      ) : null}
    </>
  )
}
