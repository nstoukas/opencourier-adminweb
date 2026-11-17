import { useEffect, useSyncExternalStore } from 'react'
import { chatApi } from '@/api/chatApi'
import { Tags } from '@/api/utils/tags'
import useAppSelector from '@/hooks/useAppSelector'
import { useAppDispatch } from '../../ui-shared-utils'
import { closeChatLiveSoon, connectChatLive, isChatLive, subscribeChatLive } from './chatLive'
import { listenForChatSoundUnlock, playChatSound } from './chatSound'

// The senders dispatch has to read (AC-7, AC-9). A SYSTEM line repeats a rider's report, which has
// its own board row, so it makes no sound (decision 111.2).
export const SOUNDING_SENDERS = ['COURIER', 'PARTNER']

// Mounted on every admin page (DefaultLayout). Keeps the live connection open while signed in, turns
// each live event into a refetch of the chat data, and plays the message sound (AC-8, AC-9). Draws nothing.
export function ChatLive() {
  const dispatch = useAppDispatch()
  const accessToken = useAppSelector((state) => state.auth.accessToken)

  useEffect(() => {
    listenForChatSoundUnlock()
  }, [])

  useEffect(() => {
    connectChatLive(accessToken ?? null, {
      onMessage: (threadId, message) => {
        dispatch(chatApi.util.invalidateTags([Tags.chatThreads, { type: Tags.chatMessages, id: threadId }]))
        if (SOUNDING_SENDERS.includes(message.senderKind)) playChatSound()
      },
      onThreadRead: () => {
        dispatch(chatApi.util.invalidateTags([Tags.chatThreads]))
      },
      onConnect: () => {
        dispatch(chatApi.util.invalidateTags([Tags.chatThreads, Tags.chatMessages]))
      },
    })
    // A new token replaces the connection. Every page draws its own DefaultLayout, so this unmounts on
    // each page change too: the close waits a moment, and the next page's ChatLive cancels it.
  }, [accessToken, dispatch])

  // Unmounted for good (signed out, or a 401: the sign in guard draws nothing): close the connection, so
  // a signed out tab stops receiving messages. An effect's returned function runs when it unmounts.
  useEffect(() => () => closeChatLiveSoon(), [])

  return null
}

// Whether the live connection is open, for a page deciding whether to poll (AC-8).
export function useChatLive(): boolean {
  // The server render has no connection: false.
  return useSyncExternalStore(subscribeChatLive, isChatLive, () => false)
}
