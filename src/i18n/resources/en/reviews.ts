// reviews: English texts (spec 0054, row 47). Every key here has its Greek in ../el/reviews.ts.
export const reviews = {
  title: 'Reviews',
  description:
    'A rider can ask a person to look again at any decision the app took about their work. Each request needs a written answer by its due date.',
  // What a request is about, by the backend's code.
  topic: {
    OFFER: 'An offer',
    PAY: 'Pay',
    OTHER: 'Something else',
  },
  // The answer's outcome, by the backend's code.
  outcome: {
    STANDS: 'The decision stands',
    CHANGED: 'Changed and put right',
  },
  // The page's tabs, by the request's status.
  tabs: {
    OPEN: 'Open',
    ANSWERED: 'Answered',
    WITHDRAWN: 'Withdrawn',
  },
  // How long an open request has left (whole days, rounded up), or overdue.
  overdue: 'Overdue',
  daysLeft_one: '{{count}} day left',
  daysLeft_other: '{{count}} days left',
  list: {
    loadFailed: 'The review requests could not be loaded. The list below may be out of date.',
    noneOpen: 'No request is waiting for an answer.',
    noneYet: 'None yet.',
    due: 'Due',
    answered: 'Answered',
    withdrawn: 'Withdrawn',
    rider: 'Rider',
    about: 'About',
    delivery: 'Delivery',
    request: 'Request',
    requestAndAnswer: 'Request and answer',
    answer: 'Answer',
    dueAt: 'Due {{when}}',
    sentAt: 'Sent {{when}}',
    general: 'General',
    payCorrection: 'Pay correction: {{amount}}',
    answeredBy: 'Answered by {{name}}',
    removedAdmin: 'a removed admin',
    previous: 'Previous',
    next: 'Next',
    page: 'Page {{current}} of {{total}}',
  },
  // The sidebar's count of open requests.
  badge: {
    notCounted: 'Open review requests could not be counted',
    open: '{{open}} open',
    openOverdue: '{{open}} open, {{overdue}} overdue',
  },
  answer: {
    button: 'Answer',
    title: 'Answer {{name}}',
    description: 'The rider reads your answer in the app. Nothing is decided until you send it.',
    outcome: 'Outcome',
    reason: 'Reason',
    reasonHint: 'Say why, in words the rider can follow. At most {{max}} characters.',
    correction: 'Pay correction in euro (optional)',
    correctionHint: "Added to {{name}}'s pay for this delivery, today. It only adds, never takes away.",
    correctionHintCap: "Added to {{name}}'s pay for this delivery, today. It only adds, never takes away, up to {{max}}.",
    correctionInvalid: 'Write an amount in euro above 0, such as 1.50.',
    capNotLoaded: "The co-op's limit has not loaded yet. Try again in a moment.",
    overCap: "At most {{max}}, the co-op's limit.",
    notNow: 'Not now',
    sending: 'Sending…',
    next: 'Next',
    send: 'Send answer',
    confirmTitle: "Add {{amount}} to this rider's pay?",
    confirmBody:
      "{{name}} is paid {{amount}} more for this delivery, on today's earnings. It is recorded on the delivery and cannot be undone.",
    sendAndAdd: 'Send and add {{amount}}',
    sent: 'Answer sent',
    sentDescription: '{{name}} can read it in the app.',
    notSent: 'Not sent',
    failed: 'The answer could not be sent. Try again in a moment.',
  },
}
