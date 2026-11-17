import { useEffect, useSyncExternalStore } from 'react'
import { chatApi } from '@/api/chatApi'
import { Tags } from '@/api/utils/tags'
import useAppSelector from '@/hooks/useAppSelector'
import { useAppDispatch } from '../../ui-shared-utils'
import { connectChatLive, isChatLive, subscribeChatLive } from './chatLive'
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
    // No cleanup on unmount: the connection outlives a page change. A new token replaces it.
  }, [accessToken, dispatch])

  return null
}

// Whether the live connection is open, for a page deciding whether to poll (AC-8).
export function useChatLive(): boolean {
  // The server render has no connection: false.
  return useSyncExternalStore(subscribeChatLive, isChatLive, () => false)
}
