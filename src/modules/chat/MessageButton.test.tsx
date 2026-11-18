import React from 'react'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { MessageButton, NO_LOGIN_REASON } from './MessageButton'
import { Conversation } from './Conversation'

const mockPush = jest.fn()
jest.mock('next/router', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}))

const mockToast = jest.fn()
jest.mock('../../admin-web-components', () => {
  const actual = jest.requireActual('../../admin-web-components')
  return {
    ...actual,
    useToast: () => ({ toast: mockToast }),
  }
})

const mockOpenThread = jest.fn()
let mockIsLoading = false
const mockUseGetChatThreadQuery = jest.fn()
const mockUseGetChatMessagesQuery = jest.fn()
const mockUseLazyGetChatMessagesQuery = jest.fn()
const mockUseMarkChatThreadReadMutation = jest.fn()
const mockUseSendChatMessageMutation = jest.fn()

jest.mock('../../api/chatApi', () => ({
  useOpenChatThreadMutation: () => [mockOpenThread, { isLoading: mockIsLoading }],
  useGetChatThreadQuery: (id: string, opts: any) => mockUseGetChatThreadQuery(id, opts),
  useGetChatMessagesQuery: (args: any, opts: any) => mockUseGetChatMessagesQuery(args, opts),
  useLazyGetChatMessagesQuery: () => [mockUseLazyGetChatMessagesQuery, { isFetching: false }],
  useMarkChatThreadReadMutation: () => [mockUseMarkChatThreadReadMutation],
  useSendChatMessageMutation: () => [mockUseSendChatMessageMutation],
}))

jest.mock('../../hooks/usePageVisible', () => ({
  usePageVisible: () => true,
}))

jest.mock('./ChatLive', () => ({
  useChatLive: () => true,
}))

describe('MessageButton (spec 0034, AC-15)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockIsLoading = false

    mockUseGetChatThreadQuery.mockReturnValue({
      currentData: {
        id: 'thread-c1-xyz',
        kind: 'COURIER',
        name: 'Kostas Karas',
        phoneNumber: '+306912345678',
        courierStatus: 'ONLINE',
        activeDeliveries: [],
        moreActiveDeliveries: 0,
        quickReplies: [],
        dispatchLastReadAt: null,
      },
      isError: false,
      isLoading: false,
    })
    mockUseGetChatMessagesQuery.mockReturnValue({
      currentData: [],
      isError: false,
      isLoading: false,
      isSuccess: true,
    })
    mockUseMarkChatThreadReadMutation.mockReturnValue([jest.fn().mockResolvedValue({})])
    mockUseSendChatMessageMutation.mockReturnValue([jest.fn()])
  })

  it('on a courier page: calls openChatThread({ courierId }) and navigates to /chat/<id>', async () => {
    mockOpenThread.mockResolvedValueOnce({
      data: { id: 'thread-c1-xyz' },
    })

    render(<MessageButton party={{ courierId: 'courier-101' }} name="Kostas Karas" />)

    const button = screen.getByRole('button', { name: /Message/i })
    expect(button).toBeEnabled()

    // eslint-disable-next-line @typescript-eslint/require-await -- the async act flushes the pending promises
    await act(async () => {
      fireEvent.click(button)
    })

    expect(mockOpenThread).toHaveBeenCalledWith({ courierId: 'courier-101' })
    expect(mockPush).toHaveBeenCalledWith('/chat/thread-c1-xyz')
  })

  it('on openThread failure: shows destructive toast and does not navigate', async () => {
    mockOpenThread.mockResolvedValueOnce({
      error: { status: 500 },
    })

    render(<MessageButton party={{ courierId: 'courier-101' }} name="Kostas Karas" />)

    const button = screen.getByRole('button', { name: /Message/i })
    // eslint-disable-next-line @typescript-eslint/require-await -- the async act flushes the pending promises
    await act(async () => {
      fireEvent.click(button)
    })

    expect(mockOpenThread).toHaveBeenCalledWith({ courierId: 'courier-101' })
    expect(mockPush).not.toHaveBeenCalled()
    expect(mockToast).toHaveBeenCalledWith({
      title: 'Could not open the conversation with Kostas Karas',
      variant: 'destructive',
    })
  })

  it('on a restaurant with userId null: button is disabled and its reason is announced (NO_LOGIN_REASON)', () => {
    render(
      <MessageButton
        party={{ partnerId: 'partner-99' }}
        name="Taverna Ouzeri"
        disabledReason={NO_LOGIN_REASON}
      />
    )

    const button = screen.getByRole('button', { name: /Message/i })
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('title', NO_LOGIN_REASON)

    const describedById = button.getAttribute('aria-describedby')
    expect(describedById).toBeTruthy()

    const reasonEl = describedById ? document.getElementById(describedById) : null
    expect(reasonEl).not.toBeNull()
    if (!reasonEl) throw new Error('Expected reasonEl')
    expect(reasonEl).toHaveTextContent(NO_LOGIN_REASON)
    expect(reasonEl).not.toHaveClass('sr-only')
    expect(reasonEl).toHaveClass('text-sm', 'text-muted-foreground')

    fireEvent.click(button)
    expect(mockOpenThread).not.toHaveBeenCalled()
  })

  it('button is disabled while mutation isLoading is true', () => {
    mockIsLoading = true
    render(<MessageButton party={{ courierId: 'courier-101' }} name="Kostas" />)

    const button = screen.getByRole('button', { name: /Message/i })
    expect(button).toBeDisabled()
  })

  it('puts the cursor in the message box (document.activeElement is textarea #chat-message) after opening the thread (AC-15, verify fixes)', async () => {
    mockOpenThread.mockResolvedValueOnce({
      data: { id: 'thread-c1-xyz' },
    })

    render(
      <div>
        <MessageButton party={{ courierId: 'courier-101' }} name="Kostas Karas" />
      </div>
    )

    const button = screen.getByRole('button', { name: /Message/i })
    // eslint-disable-next-line @typescript-eslint/require-await -- async act flushes promises
    await act(async () => {
      fireEvent.click(button)
    })

    expect(mockPush).toHaveBeenCalledWith('/chat/thread-c1-xyz')

    // Open the thread conversation
    render(<Conversation threadId="thread-c1-xyz" />)

    const textarea = screen.getByLabelText(/Message to Kostas Karas/i)
    expect(textarea).toHaveAttribute('id', 'chat-message')
    expect(document.activeElement).toBe(textarea)
  })
})
