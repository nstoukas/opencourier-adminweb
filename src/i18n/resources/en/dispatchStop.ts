// dispatchStop: English texts (spec 0054, row 47). Every key here has its Greek in ../el/dispatchStop.ts.
// The dispatch stop panel and dialog (src/modules/dispatch-stop). The server's own refusals ("Another
// dispatch stop already covers part of that time.") are shown as they come (decision 47.28).
export const dispatchStop = {
  // Why a stop was called.
  reason: {
    HEAT: 'Heat',
    STORM: 'Storm',
    OTHER: 'Other',
  },
  // What happened to a stop, in the history (dispatchStopDisplay.ts stopOutcome).
  outcome: {
    cancelled: 'Cancelled {{time}}',
    cancelledBy: 'Cancelled {{time}} by {{user}}',
    restarted: 'Restarted {{time}}',
    restartedBy: 'Restarted {{time}} by {{user}}',
    endedAsPlanned: 'Ended as planned',
    on: 'On',
    scheduled: 'Scheduled',
  },
  panel: {
    loading: 'Loading dispatch…',
    loadFailed: 'Could not load whether dispatch is stopped.',
    stoppedUntil: 'Dispatch is stopped until {{time}} ({{reason}}).',
    stoppedUntilRestart: 'Dispatch is stopped until you restart it ({{reason}}).',
    on: 'Dispatch is on.',
    scheduled: 'Scheduled: {{start}} ({{reason}}).',
    scheduledTo: 'Scheduled: {{start}} to {{end}} ({{reason}}).',
    // Cancels a scheduled stop (not a dialog's back out).
    cancel: 'Cancel',
    cancelStop: 'Cancel the stop on {{time}}',
    restartNow: 'Restart now',
    stopNow: 'Stop now',
    schedule: 'Schedule a stop',
    history: 'History',
    restarted: 'Dispatch is on again.',
    cancelled: 'The scheduled stop is cancelled.',
    actionFailed: 'That did not work. Please try again.',
    // The history dialog.
    historyTitle: 'Dispatch stops',
    noStops: 'No stops yet.',
    columnReason: 'Reason',
    columnFrom: 'From',
    columnTo: 'To (planned)',
    columnBy: 'By',
    columnOutcome: 'Outcome',
    untilRestarted: 'Until restarted',
  },
  dialog: {
    titleNow: 'Stop dispatch now',
    titleSchedule: 'Schedule a stop',
    description:
      'No rider gets an offer and no restaurant can order delivery while it is on. Deliveries already picked up are finished. Times are Athens time.',
    previewFailed: 'Could not count the open offers and deliveries; stopping still works.',
    // Two counts in one sentence, each with its own plural: the sentence is built from the two pieces below.
    preview:
      "This ends {{offers}} and sends {{deliveries}} not yet picked up back to waiting. Riders who lose a delivery are paid by the co-op's reassignment setting.",
    offers_one: '{{count}} open offer',
    offers_other: '{{count}} open offers',
    deliveries_one: '{{count}} delivery',
    deliveries_other: '{{count}} deliveries',
    counting: 'Counting open offers and deliveries not yet picked up…',
    reason: 'Reason',
    startsOn: 'Starts on',
    at: 'At',
    hasEnd: 'Set an end time (otherwise until you restart)',
    endsOn: 'Ends on',
    saveFailed: 'The stop could not be saved. Please try again.',
    stopped: 'Dispatch is stopped.',
    scheduled: 'The stop is scheduled.',
    submitNow: 'Stop dispatch',
    submitSchedule: 'Schedule stop',
  },
}
