// shiftSlots: English texts (spec 0054, row 47). Every key here has its Greek in ../el/shiftSlots.ts.
// Weekday names come from Intl in the reader's language (shiftSlotDisplay.ts), not from here.
export const shiftSlots = {
  // A weekday number the backend sent outside 1 to 7.
  dayNumber: 'Day {{number}}',
  riders_one: '{{count}} rider',
  riders_other: '{{count}} riders',
  times: '{{start}} to {{end}}',
  // "Friday 19:00 to 23:00, 6 riders": how a slot reads in a list or a change.
  slot: '{{day}} {{start}} to {{end}}, {{riders}}',
  page: {
    title: 'Shift slots',
    description: 'Weekly slots in Athens time, with the most riders each takes. Every change is on the record.',
    add: 'Add slot',
    shiftsOff: 'Shifts are off. Riders see none of this until you switch them on in Settings.',
    showRemoved: 'Show removed slots',
    loadFailed: 'Could not load the shift slots.',
    none: 'No shift slots yet.',
    removed: 'removed',
    history: 'History',
    editLabel: 'Edit {{day}} {{start}} to {{end}}',
    removeLabel: 'Remove {{day}} {{start}} to {{end}}',
    historyLabel: 'History of {{day}} {{start}} to {{end}}',
  },
  dialog: {
    addTitle: 'Add slot',
    editTitle: 'Edit slot',
    description: 'A weekly slot in Athens time, with the most riders it takes.',
    day: 'Day',
    start: 'Start',
    end: 'End',
    clockHint: '24 hour clock. A slot ends on the day it starts; 24:00 ends it at midnight.',
    cap: 'Rider cap',
    capHint: 'The most riders the slot takes, 1 to 50.',
    save: 'Save slot',
    startProblem: 'Type the start as HH:mm on the 24 hour clock, for example 19:00.',
    endProblem: 'Type the end as HH:mm on the 24 hour clock, for example 23:00, or 24:00 for midnight.',
    orderProblem: 'The end must be after the start, on the same day. Two slots can cover a late night.',
    capProblem: 'The rider cap must be a whole number from 1 to 50.',
    saveFailed: 'The slot could not be saved. Try again in a moment.',
  },
  history: {
    title: 'Slot history',
    loadFailed: 'Could not load the history.',
    none: 'No changes recorded.',
    CREATED: 'Added',
    UPDATED: 'Changed',
    REMOVED: 'Removed',
    by: 'by',
  },
  remove: {
    title: 'Remove this slot?',
    description:
      '{{slot}}. It leaves the list; its record stays, and you can still read it under Show removed slots.',
    failed: 'The slot could not be removed. Try again in a moment.',
  },
  // Spec 0049: Offline during a booked shift. The shift, time and cause come from the server as written.
  offline: {
    title: 'Offline during a booked shift',
    description:
      'A rider who stayed Offline past the break limit during their booked shift. Check in with them in person; nothing here changes their offers or pay, and the rider sees the same record.',
    conflict: 'Another admin followed this up first. The list is up to date now.',
    failed: 'Could not save the follow up. Try again.',
    loadFailed: 'Could not load this list.',
    none: 'Nothing to follow up.',
    line: 'Shift {{shift}} · Offline at {{time}} · {{cause}}',
    unknownTime: 'an unknown time',
    followedUp: 'Followed up',
    followedUpBy: 'Followed up by {{email}}',
    markLabel: 'Mark followed up: {{name}}, Offline at {{time}}',
    // Why the rider went Offline (the backend's EnumCourierStatusChangeCause; NONE when not recorded).
    cause: {
      RIDER: 'The rider switched to Offline',
      ADMIN: 'An admin set the rider Offline',
      CUT_OFF: "A password change ended the rider's sessions",
      LAST_CALL_ACCEPTED: 'Offline after a Last Call job',
      SYSTEM_START: 'Set Offline by the system',
      DEACTIVATED: "An admin deactivated the rider's account",
      NONE: 'Cause not recorded',
    },
  },
}
