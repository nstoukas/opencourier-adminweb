import { useId } from 'react'
import { useRouter } from 'next/router'
import { ChatCircle } from '@phosphor-icons/react'
// useTranslation gives t, which looks a key up in the reader's language.
import { useTranslation } from 'react-i18next'
import { useOpenChatThreadMutation } from '@/api/chatApi'
import { Button, useToast } from '../../admin-web-components'
import { focusComposerOnOpen } from './composerFocus'

// The reason a restaurant with no sign in has no Message button to press (AC-15). A translation key
// (spec 0054): the button looks it up in the reader's language when it draws, so pass it as it is.
export const NO_LOGIN_REASON = 'chat.messageButton.noLogin'

// Spec 0034 (chat), AC-15: on a courier's or a restaurant's page, opens their thread ready to write,
// making it first if it does not exist yet.
export function MessageButton({
  party,
  name,
  disabledReason,
}: {
  party: { courierId: string } | { partnerId: string }
  name: string
  // A translation key, such as NO_LOGIN_REASON.
  disabledReason?: string
}) {
  const { t } = useTranslation()
  const router = useRouter()
  const reason = disabledReason ? t(disabledReason) : undefined
  const { toast } = useToast()
  const reasonId = useId()
  const [openThread, { isLoading }] = useOpenChatThreadMutation()

  async function onClick() {
    const result = await openThread(party)
    if ('data' in result) {
      focusComposerOnOpen(result.data.id)
      void router.push(`/chat/${result.data.id}`)
    } else {
      toast({ title: t('chat.messageButton.openFailed', { name }), variant: 'destructive' })
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        disabled={Boolean(reason) || isLoading}
        onClick={() => void onClick()}
        aria-describedby={reason ? reasonId : undefined}
        title={reason}
      >
        <ChatCircle aria-hidden="true" className="mr-2 h-4 w-4" />
        {t('chat.messageButton.label')}
      </Button>
      {/* Said on screen beside the button, not only to a screen reader: a disabled button takes no focus
          and a touch screen shows no title, so this is the one place everyone can read why (AC-15). */}
      {reason ? (
        <span id={reasonId} className="max-w-[16rem] text-sm text-muted-foreground">
          {reason}
        </span>
      ) : null}
    </>
  )
}
