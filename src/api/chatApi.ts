import type {
  ChatMessageAdminDto,
  ChatSendAdminInput,
  ChatThreadAdminDto,
  ChatThreadsAdminDto,
  ChatThreadsQuery,
} from '../backend-admin-sdk'
import { Tags } from '@/api/utils/tags'
import { api as baseApi, prepareAdminSdk } from '.'
import { AppState } from '@/redux/store'
import { handleBackendError } from './utils/api'

// Dispatch's chat inbox (spec 0034, chat). The live connection (`chatLive.ts`) refreshes these through
// their tags when a message arrives; when there is no live connection the pages poll instead (AC-8).
// One `queryFn` per call, like the other hand edited endpoints: each reads the admin's token from Redux.
function token(api: { getState: () => unknown }): string {
  return (api.getState() as AppState).auth.accessToken || ''
}

export const chatApi = baseApi.injectEndpoints({
  overrideExisting: true,
  endpoints: (build) => ({
    getChatThreads: build.query<ChatThreadsAdminDto, ChatThreadsQuery>({
      queryFn: async (query, api) => {
        try {
          return { data: await prepareAdminSdk(token(api)).chat().listThreads(query) }
        } catch (error) {
          return { error: handleBackendError(error, api) }
        }
      },
      providesTags: [Tags.chatThreads],
    }),

    // The sidebar's count of unread threads (AC-2, AC-9).
    getChatUnreadCount: build.query<{ count: number }, void>({
      queryFn: async (_, api) => {
        try {
          return { data: await prepareAdminSdk(token(api)).chat().unreadCount() }
        } catch (error) {
          return { error: handleBackendError(error, api) }
        }
      },
      providesTags: [Tags.chatThreads],
    }),

    getChatThread: build.query<ChatThreadAdminDto, string>({
      queryFn: async (threadId, api) => {
        try {
          return { data: await prepareAdminSdk(token(api)).chat().getThread(threadId) }
        } catch (error) {
          return { error: handleBackendError(error, api) }
        }
      },
      providesTags: [Tags.chatThreads],
    }),

    // The newest 50 messages of one thread, oldest first. Older ones come from `before`.
    getChatMessages: build.query<ChatMessageAdminDto[], { threadId: string; before?: string }>({
      queryFn: async ({ threadId, before }, api) => {
        try {
          return { data: await prepareAdminSdk(token(api)).chat().listMessages(threadId, { before }) }
        } catch (error) {
          return { error: handleBackendError(error, api) }
        }
      },
      providesTags: (_result, _error, { threadId }) => [{ type: Tags.chatMessages, id: threadId }],
    }),

    sendChatMessage: build.mutation<ChatMessageAdminDto, { threadId: string; input: ChatSendAdminInput }>({
      queryFn: async ({ threadId, input }, api) => {
        try {
          return { data: await prepareAdminSdk(token(api)).chat().sendMessage(threadId, input) }
        } catch (error) {
          return { error: handleBackendError(error, api) }
        }
      },
      invalidatesTags: (_result, _error, { threadId }) => [Tags.chatThreads, { type: Tags.chatMessages, id: threadId }],
    }),

    // AC-7: read for every admin, up to the thread's newest message.
    markChatThreadRead: build.mutation<{ dispatchLastReadAt: string | null }, string>({
      queryFn: async (threadId, api) => {
        try {
          return { data: await prepareAdminSdk(token(api)).chat().markRead(threadId) }
        } catch (error) {
          return { error: handleBackendError(error, api) }
        }
      },
      invalidatesTags: [Tags.chatThreads],
    }),

    // AC-15: a rider's or restaurant's Message button.
    openChatThread: build.mutation<ChatThreadAdminDto, { courierId: string } | { partnerId: string }>({
      queryFn: async (party, api) => {
        try {
          return { data: await prepareAdminSdk(token(api)).chat().openThread(party) }
        } catch (error) {
          return { error: handleBackendError(error, api) }
        }
      },
      invalidatesTags: [Tags.chatThreads],
    }),
  }),
})

export const {
  useGetChatThreadsQuery,
  useGetChatUnreadCountQuery,
  useGetChatThreadQuery,
  useGetChatMessagesQuery,
  useLazyGetChatMessagesQuery,
  useSendChatMessageMutation,
  useMarkChatThreadReadMutation,
  useOpenChatThreadMutation,
} = chatApi
