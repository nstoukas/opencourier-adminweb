// timeWorked: English texts (spec 0054, row 47). Every key here has its Greek in ../el/timeWorked.ts.
export const timeWorked = {
  // Why a range was not used (the URL's, or the one typed in the form).
  problem: {
    format: 'The dates must be days written as YYYY-MM-DD.',
    order: 'The first day must be on or before the last day.',
    tooLong: 'A range may cover at most {{max}} days.',
    chooseBoth: 'Choose both days.',
  },
  // A "By week" row whose week reaches outside the range.
  weekPart: {
    only: 'part of the week: {{day}} only',
    range: 'part of the week: {{first}} to {{last}}',
  },
  // "48 min", "3 h 12 min".
  duration: {
    minutes: '{{minutes}} min',
    hours: '{{hours}} h {{minutes}} min',
  },
  // Who or what changed a rider's status (Records behind this shift).
  cause: {
    RIDER: 'by the rider',
    ADMIN: 'by an admin',
    CUT_OFF: 'by a password change',
    LAST_CALL_ACCEPTED: 'on accepting their last job',
    SYSTEM_START: 'when recording began',
  },
  // How a job ended when not in this rider's drop off (spec 0042), the rider app's words.
  end: {
    CANCELLED_AFTER_PICKUP: 'Cancelled after pickup',
    CANCELLED: 'Cancelled',
    REMOVED: 'Removed',
    HANDED_BACK: 'Handed back',
    REASSIGNED: 'Reassigned',
    FAILED: 'Failed',
    ENDED: 'Ended',
    IN_PROGRESS: 'In progress',
  },
  form: {
    label: 'Days to show',
    from: 'From',
    to: 'To',
    show: 'Show',
    hint: 'Days are Athens time, at most {{max}} days.',
  },
  page: {
    title: 'Time worked',
    description:
      "How the co-op's hours split between jobs, paid waiting and unpaid time, for the assembly. Totals only: no rider is named or compared.",
    groupBy: 'Group by',
    byDay: 'By day',
    byWeek: 'By week',
    showingLast: 'Showing the last {{days}} days instead.',
    loadFailed: 'Could not load the time worked.',
    noDays: 'No days in this range.',
    weekOf: 'Week of {{date}}',
    week: 'Week',
    day: 'Day',
    riders: 'Riders who worked',
    timeWorked: 'Time worked',
    jobs: 'Jobs',
    paidWaiting: 'Paid waiting',
    unpaid: 'Unpaid',
    unpaidShare: 'Unpaid share',
    money: 'Money',
    notInShift: 'Not in a recorded shift',
    perHour: 'Per hour',
    footnote:
      'Money is what riders were paid for the jobs they accepted in the period, with pay added later. "Not in a recorded shift" is pay for work outside any recorded shift, mostly from before recording began; it is in Money but left out of the per hour figure. Each time is rounded down to the minute, so Jobs, Paid waiting and Unpaid can add up to a minute or two less than Time worked.',
  },
  card: {
    intro: 'The same figures the rider sees in the app, to answer their questions and review requests.',
    recordedFrom: 'Time worked is recorded from {{day}}.',
    recordedFromToday: 'Time worked is recorded from today.',
    none: 'No time worked in these days.',
    week: 'Week {{from}} to {{to}}',
    weekSoFar: 'Week {{from}} to {{to}} (so far)',
    earlier: 'Began before these days',
    jobsThisDay: 'Jobs accepted this day',
    split: 'Jobs {{jobs}} · Paid waiting {{wait}} · Unpaid {{unpaid}}',
    // The typical pickup wait: "4 min (3 waits)".
    wait_one: '{{minutes}} min ({{count}} wait)',
    wait_other: '{{minutes}} min ({{count}} waits)',
    totals_one: '{{money}} · {{count}} drop off · {{duration}} worked',
    totals_other: '{{money}} · {{count}} drop offs · {{duration}} worked',
    rates:
      '{{perHour}} per hour worked · {{perActiveHour}} per hour on a job · {{perKm}} per paid km · typical pickup wait {{wait}}',
    noJobMoney: '{{money}} paid that is not linked to a job',
    notInShift: 'not in a recorded shift',
    startedBefore: 'Started before these days',
    shiftTimes: '{{start}} to {{end}}',
    stillOpen: 'still open',
    onBreak: '(on a break since {{time}})',
    perHour: '{{money}} per hour',
    addedLater: '{{money}} of it added later',
    breakShort: 'Break at {{time}}, under a minute',
    break: 'Break {{start}} to {{end}}',
    records: 'Records behind this shift',
    statusChanges: 'Status changes',
    statusChange: '{{time}} {{from}} to {{to}}, {{cause}}',
  },
}
