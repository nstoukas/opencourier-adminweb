import { ChatCircle } from '@phosphor-icons/react'
import { DefaultLayout } from '@/components/layouts/DefaultLayout'
import { PageHeader } from '@/components/layouts/PageHeader'
import { cn } from '../../ui-shared-utils'
import { Conversation } from './Conversation'
import { ThreadList } from './ThreadList'

// Spec 0034 (chat), AC-2: Messages. On a wide screen the inbox and the open conversation sit side by
// side; below 1024 px one shows at a time (the inbox at /chat, a conversation at /chat/[threadId]),
// so nothing scrolls sideways at 768.
export function ChatPage({ threadId }: { threadId: string | null }) {
  return (
    <DefaultLayout className="p-0 sm:p-0">
      <div className="flex min-h-[calc(100dvh-3.5rem)] lg:h-dvh lg:min-h-0">
        <section
          aria-label="Conversations"
          className={cn('flex w-full flex-col border-r lg:w-96 lg:shrink-0', threadId ? 'hidden lg:flex' : 'flex')}
        >
          <div className="px-4 pt-4 sm:px-6 sm:pt-6">
            <PageHeader title="Messages" />
          </div>
          <div className="min-h-0 flex-1">
            <ThreadList activeThreadId={threadId} />
          </div>
        </section>
        <section
          aria-label="Conversation"
          className={cn('min-w-0 flex-1 flex-col', threadId ? 'flex' : 'hidden lg:flex')}
        >
          {threadId ? (
            <Conversation key={threadId} threadId={threadId} />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center text-muted-foreground">
              <ChatCircle aria-hidden="true" className="h-10 w-10" />
              <p className="max-w-sm text-sm">
                Choose a conversation to read and answer it. To start one, use Message on a courier&apos;s or a
                restaurant&apos;s page.
              </p>
            </div>
          )}
        </section>
      </div>
    </DefaultLayout>
  )
}
