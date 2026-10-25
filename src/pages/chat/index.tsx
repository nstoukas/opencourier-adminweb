import { DefaultLayout } from '@/components/layouts/DefaultLayout'
import { Card, CardContent, CardHeader, CardTitle } from '../../admin-web-components'

// Messages are not built yet. The old page here was upstream's Twilio order chat, and the
// backend has no chat endpoints behind it, so it never built. What Messages should hold is
// decided by scope row 90 (dispatch board and messages).
export default function ChatPage() {
  return (
    <DefaultLayout>
      <Card className="my-4">
        <CardHeader>
          <CardTitle>Messages</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Messages are not available yet.</p>
        </CardContent>
      </Card>
    </DefaultLayout>
  )
}
