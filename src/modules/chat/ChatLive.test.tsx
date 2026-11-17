import React from 'react'
import { render } from '@testing-library/react'
import { Provider } from 'react-redux'
import { makeStore } from '@/redux/store'
import { setAccessToken } from '@/modules/auth/slices/authSlice'
import { Tags } from '@/api/utils/tags'
import { chatApi } from '@/api/chatApi'
import { ChatLive, SOUNDING_SENDERS } from './ChatLive'

const mockConnectChatLive = jest.fn()
const mockIsChatLive = jest.fn(() => false)
const mockSubscribeChatLive = jest.fn((_listener?: any) => () => {})

jest.mock('./chatLive', () => ({
  connectChatLive: (token: any, handlers: any) => mockConnectChatLive(token, handlers),
  isChatLive: () => mockIsChatLive(),
  subscribeChatLive: (listener: any) => mockSubscribeChatLive(listener),
}))

const mockPlayChatSound = jest.fn()
const mockListenForChatSoundUnlock = jest.fn()

jest.mock('./chatSound', () => ({
  playChatSound: () => mockPlayChatSound(),
  listenForChatSoundUnlock: () => mockListenForChatSoundUnlock(),
}))

describe('ChatLive (spec 0034, AC-8, AC-9, decision 111.2)', () => {
  let store: ReturnType<typeof makeStore>

  beforeEach(() => {
    jest.clearAllMocks()
    store = makeStore()
  })

  it('calls listenForChatSoundUnlock and connects live with current access token', () => {
    store.dispatch(setAccessToken('test-jwt-token'))

    render(
      <Provider store={store}>
        <ChatLive />
      </Provider>
    )

    expect(mockListenForChatSoundUnlock).toHaveBeenCalled()
    expect(mockConnectChatLive).toHaveBeenCalledWith(
      'test-jwt-token',
      expect.objectContaining({
        onMessage: expect.any(Function),
        onThreadRead: expect.any(Function),
        onConnect: expect.any(Function),
      })
    )
  })

  it('SOUNDING_SENDERS includes COURIER and PARTNER, excludes DISPATCH and SYSTEM (decision 111.2)', () => {
    expect(SOUNDING_SENDERS).toContain('COURIER')
    expect(SOUNDING_SENDERS).toContain('PARTNER')
    expect(SOUNDING_SENDERS).not.toContain('DISPATCH')
    expect(SOUNDING_SENDERS).not.toContain('SYSTEM')
  })

  it('onMessage: invalidates chatThreads and thread chatMessages tags, and plays sound for COURIER and PARTNER only', () => {
    const dispatchSpy = jest.spyOn(store, 'dispatch')

    render(
      <Provider store={store}>
        <ChatLive />
      </Provider>
    )

    const handlers = mockConnectChatLive.mock.calls[0][1]

    // 1. Message from COURIER -> invalidates tags and plays sound
    handlers.onMessage('thread-1', {
      id: 'm1',
      threadId: 'thread-1',
      senderKind: 'COURIER',
      senderName: 'Rider',
      body: 'Hi',
      deliveryId: null,
      orderReference: null,
      createdAt: '2026-11-17T14:00:00.000Z',
    })

    expect(dispatchSpy).toHaveBeenCalledWith(
      chatApi.util.invalidateTags([Tags.chatThreads, { type: Tags.chatMessages, id: 'thread-1' }])
    )
    expect(mockPlayChatSound).toHaveBeenCalledTimes(1)

    // 2. Message from PARTNER -> plays sound
    handlers.onMessage('thread-2', {
      id: 'm2',
      threadId: 'thread-2',
      senderKind: 'PARTNER',
      senderName: 'Pizza',
      body: 'Ready',
      deliveryId: null,
      orderReference: null,
      createdAt: '2026-11-17T14:01:00.000Z',
    })
    expect(mockPlayChatSound).toHaveBeenCalledTimes(2)

    // 3. Message from DISPATCH -> no sound (decision 111.2)
    handlers.onMessage('thread-1', {
      id: 'm3',
      threadId: 'thread-1',
      senderKind: 'DISPATCH',
      senderName: 'Admin',
      body: 'Roger',
      deliveryId: null,
      orderReference: null,
      createdAt: '2026-11-17T14:02:00.000Z',
    })
    expect(mockPlayChatSound).toHaveBeenCalledTimes(2) // unchanged

    // 4. Message from SYSTEM -> no sound (decision 111.2)
    handlers.onMessage('thread-1', {
      id: 'm4',
      threadId: 'thread-1',
      senderKind: 'SYSTEM',
      senderName: null,
      body: 'Reported: Flat tire',
      deliveryId: null,
      orderReference: null,
      createdAt: '2026-11-17T14:03:00.000Z',
    })
    expect(mockPlayChatSound).toHaveBeenCalledTimes(2) // unchanged
  })

  it('onThreadRead: invalidates chatThreads tag', () => {
    const dispatchSpy = jest.spyOn(store, 'dispatch')

    render(
      <Provider store={store}>
        <ChatLive />
      </Provider>
    )

    const handlers = mockConnectChatLive.mock.calls[0][1]
    handlers.onThreadRead('thread-read-1')

    expect(dispatchSpy).toHaveBeenCalledWith(
      chatApi.util.invalidateTags([Tags.chatThreads])
    )
  })

  it('onConnect: invalidates both chatThreads and chatMessages tags', () => {
    const dispatchSpy = jest.spyOn(store, 'dispatch')

    render(
      <Provider store={store}>
        <ChatLive />
      </Provider>
    )

    const handlers = mockConnectChatLive.mock.calls[0][1]
    handlers.onConnect()

    expect(dispatchSpy).toHaveBeenCalledWith(
      chatApi.util.invalidateTags([Tags.chatThreads, Tags.chatMessages])
    )
  })
})
