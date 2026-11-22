// charges: English texts (spec 0054, row 47). Every key here has its Greek in ../el/charges.ts.
// Spec 0036: a money figure beside a restaurant must never read as the customer's delivery fee, so
// `deliveryFeeNote` is the only key here whose words may say "fee" (adminweb AGENTS.md).
export const charges = {
  deliveryFeeNote: 'Delivery fees are paid by customers and never appear here.',
  title: 'Charges',
  loadFailed: 'Could not load the charges.',
  downloadCsv: 'Download CSV',
  previous: 'Previous',
  next: 'Next',
  noChargesIn: 'No charges in {{month}}',
  atMostCharacters: 'At most {{max}} characters.',
  // A charge's reason on the admin pages (reasonText). A new charge reason needs a key here AND in
  // `statement.reason` below (the Greek statement and the CSV).
  reason: {
    cancellation: 'Cancelled after a rider accepted',
    waitingSplit: 'Waiting while dispatch split the order',
    waitingMinutes_one: 'Rider kept waiting, {{count}} min past the agreed ready time',
    waitingMinutes_other: 'Rider kept waiting, {{count}} min past the agreed ready time',
    waiting: 'Rider kept waiting past the agreed ready time',
    removal: 'Rider taken off the order: {{label}}',
    splitLeg: "Extra rider: the order didn't fit the size it was sent as",
  },
  // A bill with no invoice number typed: "Billed 18/11/2026 14:05".
  billedAt: 'Billed {{when}}',
  columns: {
    restaurant: 'Restaurant',
    charges: 'Charges',
    charged: 'Charged',
    billed: 'Billed',
    unbilled: 'Unbilled',
    when: 'When',
    order: 'Order',
    reason: 'Reason',
    amount: 'Amount',
  },
  overview: {
    description:
      'What each restaurant was charged for late cancellations, waits and riders taken off its orders. Months are Athens time.',
    monthNav: 'Month',
    earlierUnbilled_one: '{{count}} unbilled charge in earlier months:',
    earlierUnbilled_other: '{{count}} unbilled charges in earlier months:',
  },
  partnerMonth: {
    notAMonth: 'This address does not name a month (YYYY-MM).',
    description: 'Charges in {{month}}, Athens time.',
    markAsBilled: 'Mark as billed',
    partnerNotFound: 'This restaurant was not found.',
    totals: 'Totals',
    lines: 'Lines',
    notBilled: 'Not billed',
    bills: 'Bills',
    noBills: 'No bills for {{month}} yet.',
    billSummary_one: 'Billed by {{name}} on {{when}} · {{count}} line · {{amounts}}',
    billSummary_other: 'Billed by {{name}} on {{when}} · {{count}} lines · {{amounts}}',
    undoneBy: 'Undone by {{name}} on {{when}}: {{reason}}',
    statement: 'Statement',
    statementLabel: 'Statement for {{bill}}, opens in a new tab',
    undo: 'Undo',
    undoLabel: 'Undo {{bill}}',
  },
  markBilled: {
    description: 'Tick the lines your invoice covers. Lines you untick stay unbilled and can go in a later bill.',
    allBilled: 'Every line of this month is billed.',
    reference: 'Invoice number (optional)',
    referenceHint: 'The number of the invoice you sent, so the two can be matched.',
    someoneBilled:
      'Nothing was billed: someone else just billed {{names}}. The list is up to date now; check it and confirm again.',
    someoneBilledUnknown:
      'Nothing was billed: some of these lines were just billed by someone else. The list is up to date now.',
    saveFailed: 'The bill could not be saved. Try again in a moment.',
    confirm_one: 'Confirm {{count}} line',
    confirm_other: 'Confirm {{count}} lines',
  },
  undoBill: {
    title: 'Undo {{bill}}?',
    description_one: 'Its line becomes unbilled again. The bill stays on the record as undone, with your reason.',
    description_other:
      'Its {{count}} lines become unbilled again. The bill stays on the record as undone, with your reason.',
    why: 'Why',
    hint: 'For example: wrong lines, or the invoice was cancelled.',
    failed: 'The bill could not be undone. Try again in a moment.',
    confirm: 'Undo bill',
  },
  unbilledLine: {
    loadFailed: "Could not load this month's charges.",
    none: 'No charges this month',
    noneUnbilled: 'No unbilled charges this month',
    unbilled: 'Unbilled charges this month: {{amounts}}',
  },
  // The statement page's own admin words, in the reader's language (the statement itself is below).
  statementPage: {
    print: 'Print',
    notFound: 'This bill was not found.',
    loadFailed: 'Could not load the statement.',
  },
  // Spec 0036's restaurant statement and CSV (cross check 11 of spec 0054): a Greek document, always
  // shown in Greek whatever the reader's language. These English words are a translation for the
  // reader of this file and are never shown.
  statement: {
    title: 'Statement of charges',
    columns: {
      when: 'Date and time',
      order: 'Order',
      reason: 'Reason',
      amount: 'Amount',
    },
    total: 'Total',
    notATaxDocument: 'This is not a tax document.',
    customerPaysDelivery: 'Delivery costs are paid by the customer and are not shown here.',
    undoneBanner: 'Cancelled',
    // A bill with no invoice number typed: "Bill 18/11/2026 14:05".
    billedAt: 'Bill {{when}}',
    // The CSV's columns, joined with ";" (Greek Excel's list separator) by chargesCsv.ts.
    csv: {
      restaurant: 'Restaurant',
      when: 'Date and time',
      order: 'Order',
      reason: 'Reason',
      minutesLate: 'Minutes past the agreed time',
      amount: 'Amount',
      currency: 'Currency',
      billed: 'Billed',
      bill: 'Bill',
      deliveryId: 'Delivery id',
    },
    yes: 'yes',
    no: 'no',
    reason: {
      cancellation: 'Cancellation after a rider had accepted the order',
      waitingSplit: 'Waiting while dispatch split the order',
      waitingMinutes_one: 'Rider waiting, {{count}} minute past the agreed time',
      waitingMinutes_other: 'Rider waiting, {{count}} minutes past the agreed time',
      waiting: 'Rider waiting past the agreed time',
      removal: 'Rider removed from the order: {{label}}',
      splitLeg: 'Extra rider: the order did not fit the size declared',
    },
  },
}
