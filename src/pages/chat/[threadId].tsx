import { useRouter } from 'next/router'
import { ChatPage } from '@/modules/chat/ChatPage'

// One conversation, beside the inbox on a wide screen (spec 0034, chat).
export default function ChatThreadPage() {
  const router = useRouter()
  const threadId = typeof router.query.threadId === 'string' ? router.query.threadId : null
  return <ChatPage threadId={threadId} />
}
