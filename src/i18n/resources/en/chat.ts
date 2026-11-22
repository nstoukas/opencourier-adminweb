// chat: English texts (spec 0054, row 47). Every key here has its Greek in ../el/chat.ts.
// The Messages page (spec 0034). The messages themselves are people's words and are never translated.
export const chat = {
  page: {
    title: 'Messages',
    conversationsLabel: 'Conversations',
    conversationLabel: 'Conversation',
    choose:
      "Choose a conversation to read and answer it. To start one, use Message on a courier's or a restaurant's page.",
  },
  // Who a thread is with, by the thread's kind.
  role: {
    COURIER: 'Courier',
    PARTNER: 'Restaurant',
  },
  list: {
    searchLabel: 'Search conversations',
    searchPlaceholder: 'Name or order #',
    tabs: {
      UNREAD: 'Unread',
      COURIERS: 'Couriers',
      RESTAURANTS: 'Restaurants',
      ALL: 'All',
    },
    empty: {
      UNREAD: 'Nothing waiting. Every message has been read.',
      COURIERS: 'No conversations with couriers yet.',
      RESTAURANTS: 'No conversations with restaurants yet.',
      ALL: 'No conversations yet. A courier or restaurant who writes to dispatch shows up here.',
    },
    noMatch: 'No conversation matches “{{search}}”.',
    unreachable: "Conversations can't be reached right now. They will load again on their own.",
    loading: 'Loading conversations…',
    newer: 'Newer',
    older: 'Older',
    page: 'Page {{current}} of {{total}}',
    // The preview of a thread whose last message dispatch wrote.
    you: 'You: {{body}}',
    unread: 'Unread',
  },
  conversation: {
    notShown: "This conversation can't be shown. It may not exist, or the server can't be reached.",
    backToMessages: 'Back to Messages',
    loading: 'Loading the conversation…',
    // Read out by a screen reader when a message arrives while the thread is open.
    newMessage: 'New message from {{name}}, {{time}}',
    them: 'them',
    unreachable: "Messages can't be reached right now. They will load again on their own.",
    showEarlier: 'Show earlier messages',
    empty: 'No messages yet. Write the first one below.',
    messagesWith: 'Messages with {{name}}',
    retry: 'Not sent, click to retry',
    sending: 'Sending…',
    backToAll: 'Back to all conversations',
    call: 'Call {{name}}',
    offline: "{{name}} is Offline. A message waits until they next open the app, with no alert. Call if it can't wait.",
    activeDeliveries: 'Active deliveries',
    openDelivery: 'Open Delivery',
    more: 'and {{number}} more',
    dispatch: 'Dispatch',
    // "Sent" means the server stored it, never that the rider read it.
    sent: 'Sent',
  },
  composer: {
    quickReplies: 'Quick replies',
    messageTo: 'Message to {{name}}',
    placeholder: 'Write to {{name}}',
    hint: 'Text only. Enter sends, Shift and Enter starts a new line.',
    send: 'Send',
  },
  messageButton: {
    label: 'Message',
    openFailed: 'Could not open the conversation with {{name}}',
    noLogin: 'This restaurant has no sign in, so it could never read a reply.',
  },
  badge: {
    unread: '{{number}} unread',
  },
}
