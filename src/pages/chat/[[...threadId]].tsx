import { useRouter } from 'next/router'
import { ChatPage } from '@/modules/chat/ChatPage'

// Dispatch's chat inbox, and one conversation beside it (spec 0034, chat).
// `[[...threadId]]` is Next.js's optional catch all route: this one file answers both `/chat` (no
// threadId) and `/chat/<id>`. Because both addresses are the same page, opening a thread does not
// remount the inbox, so its tab, search and page stay as the admin left them.
export default function ChatRoutePage() {
  const router = useRouter()
  // A catch all hands its segments over as an array: missing for /chat, ['<id>'] for /chat/<id>.
  const segments = router.query.threadId
  const threadId = Array.isArray(segments) && segments.length === 1 ? segments[0] ?? null : null
  return <ChatPage threadId={threadId} />
}
