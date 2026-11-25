export function courierNotificationChannel(userId: string) {
  return `COURIER:${userId}`
}

export function adminBroadcastNotificationChannel() {
  return `ADMIN:*`
}

export function merchantGroupAdminNotificationChannel(merchantGroupId: string) {
  return `MERCHANT:${merchantGroupId}`
}

export enum NotificationEventType {
  NEW_DELIVERY_OFFER = 'NEW_DELIVERY_OFFER',
  DELIVERY_STATUS_UPDATED = 'DELIVERY_STATUS_UPDATED',
  // An offer this rider held has ended on the server (spec 0002): drop it from the screen.
  OFFER_ENDED = 'OFFER_ENDED',
  // A job this rider held was cancelled (spec 0015): the app raises its own alert and shows the card.
  JOB_CANCELLED = 'JOB_CANCELLED',
  // The restaurant moved the ready time of a job this rider holds, or marked the food ready (spec 0023).
  JOB_READY_UPDATED = 'JOB_READY_UPDATED',
  // Row 164: the restaurant changed the notes or the times of a job this rider holds.
  JOB_EDITED = 'JOB_EDITED',
  // A rider's removal request was answered (spec 0035): the app refetches and shows the outcome.
  REMOVAL_REQUEST_DECIDED = 'REMOVAL_REQUEST_DECIDED',
  // Spec 0047: dispatch confirmed or refused this rider's split request.
  SPLIT_REQUEST_DECIDED = 'SPLIT_REQUEST_DECIDED',
  // Chat (spec 0034): a new message in a thread. To a rider it carries their message; to admins
  // (room `dispatch` on the `admins` namespace) the thread id and the message.
  CHAT_MESSAGE = 'CHAT_MESSAGE',
  // Chat (spec 0034, AC-6): dispatch read the rider's thread up to this time, so their own messages show "read".
  CHAT_READ_BY_DISPATCH = 'CHAT_READ_BY_DISPATCH',
  // Chat (spec 0034, AC-7): an admin read a thread, so every admin's unread mark for it clears.
  CHAT_THREAD_READ = 'CHAT_THREAD_READ',
  // Spec 0038 (AC-9): a person answered this rider's review request. Data only, the request id alone;
  // the phone shows "Your review request has an answer" on the chat's quiet channel.
  REVIEW_ANSWERED = 'REVIEW_ANSWERED',
  // Spec 0052 (AC-4): a complaint about this rider needs their reply. Data only, the complaint id alone;
  // the phone shows "A complaint about a job needs your reply" (translated) on the chat's quiet channel.
  COMPLAINT_NEEDS_REPLY = 'COMPLAINT_NEEDS_REPLY',
}
