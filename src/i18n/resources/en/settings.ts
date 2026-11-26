// settings: English texts (spec 0054, row 47). Every key here has its Greek in ../el/settings.ts.
// The co-op settings page (src/pages/instance-configuration, src/modules/instance-config) and the helpers
// it words its boxes with (src/utils/baseFee.ts, quoteRate.ts, payoutPolicyForm.ts).
export const settings = {
  page: {
    title: 'Co-op settings',
    loadingMap: 'Loading map…',
    back: '← Back',
    sectionsNav: 'Settings sections',
    saved: 'Saved',
    notSaved: 'Not saved',
    saveFailed: 'The settings could not be saved. Please try again.',
    payoutSaved: 'Reassignment payout policies saved successfully.',
    payoutSaveFailed: 'Failed to save reassignment payout policies. Please try again.',
    publicPageSaved: '{{title}} saved successfully.',
    // {{title}} arrives in lower case ("courier rules").
    publicPageSaveFailed: 'Failed to save {{title}}. Please try again.',
  },
  // The pills at the top and each card's title.
  sections: {
    pricing: 'Pricing',
    matching: 'Matching',
    box: 'Box',
    fairness: 'Fairness',
    offers: 'Offers',
    twoOrders: 'Two orders',
    riderPay: 'Rider pay',
    removalReasons: 'Removal reasons',
    restaurantDelays: 'Restaurant delays',
    shifts: 'Shifts',
    timeWorked: 'Time worked',
    reviewRequests: 'Review requests',
    serviceArea: 'Service area',
    instance: 'Instance',
    publicPages: 'Public pages',
    changeHistory: 'Change history',
  },
  // Each setting's name, shared by its box, the save bar and the change history (settingsDiff.ts SETTINGS).
  labels: {
    quoteBaseFee: 'Base fee',
    quoteRatePerDistanceUnit: 'Rate per km',
    // The same setting's name when the instance counts in miles.
    quoteRatePerMile: 'Rate per mile',
    feePercentageAmount: 'Co-op fee (%)',
    feePercentageCeiling: 'Co-op fee ceiling (%)',
    currency: 'Currency',
    distanceUnit: 'Distance unit',
    quoteCalculationType: 'Quote calculation',
    courierMatcherType: 'Who gets the offer first',
    maxAssignmentDistance: 'Furthest courier to offer',
    maxDriftDistance: 'Max drift distance',
    arrivalRadiusMetres: 'Arrival radius (metres)',
    quoteExpirationMinutes: 'Quote stays valid for',
    geoCalculationType: 'Measure distance by',
    deliveryDurationCalculationType: 'Delivery duration calculation',
    offerExpiryEnabled: 'Offer expiry',
    offerExpirySeconds: 'Seconds before an unanswered offer ends',
    noCourierRetrySeconds: 'Seconds between retries when no rider is free',
    offerTimingEnabled: 'Timed offers',
    offerLeadMinutes: 'Lead time before an offer (minutes)',
    offerTimingCandidates: 'Riders compared by road time',
    handBackSeconds: 'Seconds a rider can hand back an order for free',
    offerSkipMinutes: 'Skip time after a rider leaves an order, in minutes',
    cancellationPayoutPolicy: 'Pay when a job is cancelled',
    defaultCourierPayRate: 'Default courier pay rate',
    defaultMaxWorkingHours: 'Default max working hours',
    courierCompensationCalculationType: 'Courier compensation calculation',
    returnTripPayPercent: 'Return trip pay (%)',
    waitPayEnabled: 'Delay pay',
    waitPayFreeMinutes: 'Free minutes after the promised time',
    waitPayCentsPerMinute: 'Delay pay per minute (cents)',
    waitLimitMinutes: 'Minutes before a rider can leave',
    splitAnswerMinutes: 'Minutes before a rider can leave an order not split',
    shiftsEnabled: 'Shifts',
    shiftDropNoticeHours: 'Notice to drop a shift, in hours',
    shiftBreakMinutes: 'Longest break inside a worked shift, in minutes',
    region: 'Service area',
    name: 'Name',
    link: 'URL',
    websocketLink: 'Websocket URL',
    imageUrl: 'Logo image URL',
    defaultDietaryRestrictions: 'Default dietary restrictions',
    savedCustomerRetentionMonths: 'Saved customer retention (months)',
    restaurantHistoryDays: 'Restaurant order history (days)',
    sosLocationRetentionDays: 'SOS location kept for (days)',
    dispatchPhoneNumber: 'Dispatch phone number',
    chatQuickRepliesDispatch: 'Dispatch quick replies',
    chatQuickRepliesCourier: 'Courier quick replies',
    chatRetentionDays: 'Chat messages kept for (days)',
    addressNoteRetentionDays: 'Address notes kept without an upvote (days)',
    reviewAnswerDays: 'Days to answer a review request',
    reviewCorrectionMaxCents: 'Largest review pay correction (cents)',
    boxUnitsSmall: 'Box units a Small order takes',
    boxUnitsMedium: 'Box units a Medium order takes',
    boxUnitsLarge: 'Box units a Large order takes',
    boxDefaultSize: 'Size of an order sent with none',
    fairnessWeightRoadTime: 'Weight of road time to the restaurant',
    fairnessWeightEarnings: "Weight of the rider's pay per hour today",
    fairnessWeightWaiting: 'Weight of waiting since the last job or going Online',
    fairnessWeightShift: 'Weight of being on a booked shift',
    fairnessCandidateLimit: 'Nearest riders compared for each offer',
    fairnessMinOnlineMinutes: 'Minutes online before own pay per hour counts',
    stackingEnabled: 'Two orders offered together',
    twoOrderPolicy: 'When two orders may go together',
    twoOrderDelayLimitMinutes: 'Most minutes a pair may delay a customer',
    stackPairBlockMinutes: 'Minutes before a turned down pair can be offered together again',
    addOnOffersEnabled: 'One more order offered while on a job',
    addOnMoment: 'When one more order may be offered',
  },
  // Pieces the boxes share.
  field: {
    notSet: 'Not set',
    withCents: '{{label}} (cents)',
    withUnit: '{{label}} ({{unit}})',
    unitKm: 'km',
    unitMile: 'mile',
  },
  pricing: {
    description: 'Changes apply to new quotes only. Deliveries already quoted keep their price.',
    aboveCeiling: "Above the co-op's ceiling of {{ceiling}} %.",
    roadDistance: 'Road distance.',
    feeHelpWithCeiling: "On top of the rider's pay. At most {{ceiling}} %, the co-op's ceiling.",
    feeHelp: "On top of the rider's pay.",
    ceilingHelp: 'The highest fee % a save accepts. Whole numbers, 0 to 100.',
  },
  // The worked example beside the pricing boxes (PricingExample.tsx).
  pricingExample: {
    name: 'Worked example',
    heading: 'A {{distance}} {{unit}} delivery',
    unitKm: 'km',
    unitMi: 'mi',
    fillIn: 'Fill in the three boxes to see the example.',
    baseFee: 'Base fee',
    distance: '{{distance}} {{unit}} × {{rate}}',
    riderGets: 'Rider gets',
    coopFee: 'Co-op fee {{percent}}%',
    customerPays: 'Customer pays',
  },
  // The line under the base fee box (src/utils/baseFee.ts).
  baseFee: {
    invalid: 'Enter a whole number of cents, zero or more.',
    zero: '0: no fixed part. Riders are paid only the distance part, so short trips pay very little.',
    amount: '{{money}} per delivery, paid to the rider in full on top of the distance part.',
  },
  // The line under the rate box (src/utils/quoteRate.ts).
  quoteRate: {
    invalid: 'Enter a whole number of cents, zero or more.',
    zero: '0: the distance part of every DeliveryQuote is zero. Riders are then paid only the base fee.',
    amountPerKilometre: '{{money}} per kilometre of travel.',
    amountPerMile: '{{money}} per mile of travel.',
  },
  matching: {
    quoteValidFor: 'Quote stays valid for (minutes)',
    maxAssignmentHelp: 'Riders further than this from the pickup are not offered the delivery.',
    maxDriftHelp: "How far a delivery's pickup or drop off may be from where it was quoted.",
    arrivalHelp:
      "The rider's app marks them arrived within this distance of the restaurant or the customer, and the timeline says it was detected. 0 switches detection off (riders tap I'm here or swipe); otherwise 20 to 300. GPS in town is often only good to 10 to 30 m, so below 30 it may rarely fire.",
  },
  // The matcher options in the co-op's words (spec 0010, AC-7).
  matcher: {
    NEAREST_COURIER: { title: 'Nearest free courier', description: 'The closest rider who is free.' },
    COURIER_SENIORITY: { title: 'Most senior courier', description: 'Members who joined first are offered first.' },
    // Row 179: what the backend's StaticCourierMatcherService does, one rider id set in its code, never checked.
    STATIC: {
      title: 'Fixed test courier',
      description: 'Every delivery is offered to one test rider set in the code, free or not. Testing only.',
    },
    FAIRNESS: {
      title: 'Fairness',
      description:
        'Among the nearest free riders, road time, pay per hour today and waiting, weighed as set in the Fairness card.',
    },
  },
  box: {
    description:
      "A rider's box holds 100 units. The matcher never gives a rider more than a full box; an admin can, only after confirming. A change applies to orders made from now on.",
    unitsHint: "Whole units, 1 to 100, of the rider's 100. {{size}} may not take more than the next size up.",
    largeHelp: "Whole units, 1 to 100, of the rider's 100. Usually the whole box.",
    defaultSizeHelp:
      "An order from a restaurant's own system may come with no size. It counts as this size, and its record says the size was assumed.",
  },
  boxSize: {
    SMALL: 'Small',
    MEDIUM: 'Medium',
    LARGE: 'Large',
  },
  fairness: {
    description:
      'Used when Who gets the offer first is Fairness. Among the nearest free riders, each offer goes to the lowest score: road time to the restaurant, what the co-op paid the rider per hour today (tips never count) and how long they have waited since their last job, each weighed as set here. A change applies to the next offer.',
    roadTimeHelp: '0 to 100. Higher sends offers more to whoever is closest by road.',
    earningsHelp: '0 to 100. Higher sends offers more to whoever has earned least per hour today.',
    waitingHelp: '0 to 100. Higher sends offers more to whoever has waited longest. The three cannot all be 0.',
    candidateHelp: '1 to 50. Only these nearest free riders are compared for each offer.',
    minOnlineHelp:
      "0 to 240. Until a rider has been online this long today, their pay per hour counts as the co-op's average.",
    shiftHelp:
      '0 to 100, starts at 0. Only while Shifts is on: a rider on a booked shift right now is offered sooner. It is a fixed yes or no, so it moves a score by the same amount every time. It does not count toward the three above.',
  },
  twoOrders: {
    description: 'Whether one rider may be offered two orders at once, and within which limits.',
    stackingHelp:
      'On: a free rider may be offered two waiting orders at once, from the same restaurant, or from two restaurants when both have marked the food ready. The rider takes or declines the pair; a rider on auto accept takes it like a single order (row 128). Each order is paid in full from its own quote; never more than two orders or one box. Off: every offer is a single order, as before.',
    policyHelp:
      '"Only when no free rider is a good fit" pairs an order only with one that already found no free rider, and offers one more order to a rider on a job only when no free rider was found. "Whenever the two orders fit": with One more order offered while on a job on, a fitting order goes to a rider already on a job before a free rider, even when a free rider is waiting. Used while either switch is on.',
    pairBlockHelp:
      'Whole minutes, 0 to 60. When a rider declines or misses two orders offered together, those two are not offered together again for this long; each can still go out alone at once. 0: the same pair can go to another rider at once. The rider who declined is kept away by the skip time either way.',
    delayHelp:
      "Whole minutes, 0 to 30. Neither customer's food may arrive more than this later than on a single trip by the same rider; 0 allows only pairs that delay nobody.",
    addOnHelp:
      'On: a rider on a job may be offered one more order on the way, showing the km and minutes it adds. Declining is free and changes nothing about the job, and the phone never accepts it by itself. It pays in full from its own quote, and the limits above apply. It always ends after Seconds before an unanswered offer ends (under Offers), even with Offer expiry off, and goes back to matching. While the rider carries food it never rings insistently and gets twice that time. Under "Whenever the two orders fit" it goes before a free rider. Never while the matcher is "Fixed test courier". Off: no rider on a job is offered anything.',
    addOnMomentHelp: 'Used only while One more order offered while on a job is on.',
  },
  // When a pair may be offered, in plain words (spec 0048).
  twoOrderPolicy: {
    SHORTAGE_ONLY: 'Only when no free rider is a good fit',
    WHENEVER_FITS: 'Whenever the two orders fit',
  },
  // The moments an add on may come (spec 0048, row 81).
  addOnMoment: {
    BEFORE_PICKUP: 'Before the rider picks up the first order',
    BEFORE_DROPOFF: 'Any time before the first drop off',
    SAME_RESTAURANT: 'Only at the same restaurant, before the pickup',
  },
  offers: {
    description: 'How long an offer to a rider lasts, when it goes out, and how long a rider is skipped after leaving an order.',
    expirySecondsHelp:
      'Whole seconds, 20 to 300. Used while Offer expiry is on, and always for one more order offered while on a job (twice this while the rider carries food). An offer an admin makes by hand never ends on its own.',
    retryHelp:
      'Whole seconds, 10 to 300. A delivery nobody could take is offered again this often, and at once when a rider comes online or finishes. Applies whether Offer expiry is on or off.',
    offerSkipHelp:
      'Whole minutes, 1 to 60. A rider who declines or misses an offer, hands an order back, leaves a late restaurant, is removed or is reassigned is not offered that order again for this long, counted for each rider on their own. Other riders can still be offered it.',
    handBackHelp:
      'Whole seconds, 0 to 300; 0 switches it off. Counted from the accept, and only before the rider reaches the restaurant. The order goes back to matching and nothing is paid or charged. A change applies to the next accept.',
    timingHelp:
      'Hold an offer until the rider needs to leave, so they arrive about when the food is ready, and pick the rider by road time. Off: every offer goes out at once, as before.',
    leadHelp: "Whole minutes, 0 to 30, added before the rider's road time. Used only while Timed offers is on.",
    candidatesHelp: 'How many of the nearest riders are compared, 1 to 20. Used only while Timed offers is on.',
  },
  restaurantDelays: {
    description: 'What a rider is paid when a restaurant keeps them past its promised time, and when they can leave.',
    waitPayHelp:
      "Pays a rider per minute once the restaurant's promised time plus the free minutes below has passed and the rider is still waiting, and charges the restaurant all of it. A rider who arrives after that, to food already marked ready, is not paid and the restaurant is not charged. Off: nothing is paid or charged. The waiting clock and leaving still work.",
    freeMinutesHelp: 'Whole minutes, 0 to 60. Used only while Delay pay is on.',
    centsPerMinuteHelp: 'Whole cents, 0 to 200. The restaurant is charged the same. Used only while Delay pay is on.',
    waitLimitHelp:
      "Whole minutes, 1 to 60, counted from the restaurant's promised time, or from the rider's arrival if that was later. Applies whether Delay pay is on or off.",
    splitAnswerHelp:
      "Whole minutes, 1 to 60, from when a rider says an order does not fit one box. With no answer from dispatch by then, the rider may leave and the order is cancelled as the restaurant's. The wait is paid at the Delay pay rate.",
  },
  shifts: {
    description: 'Whether the co-op runs shifts riders book.',
    // Followed by a link to the Shift slots page and a full stop.
    onHelp: 'On. Riders will book these slots once shift booking is built. Edit them on ',
    offHelp: 'Off. No shift rule applies to anyone. You can still prepare the slots on ',
    slotsLink: 'Shift slots',
    dropNoticeHelp:
      'Whole hours, 0 to 168. A rider can drop a booked shift up to this long before it starts; 0 means up to the start.',
  },
  timeWorked: {
    description: "How riders' time worked is split into shifts, on their Earnings screen and the Time worked page.",
    breakHelp:
      'Whole minutes, 0 to 240. An Offline with no job shorter than this is a break inside the same shift, not counted as time worked; 0 means every Offline with no job ends the shift. A change applies to past shifts too.',
  },
  reviewRequests: {
    // Followed by a link to the Reviews page and a full stop.
    description: 'A rider can ask a person to look again at any decision the app took about their work. Answer them on',
    reviewsLink: 'Reviews',
    answerDaysHelp:
      "Whole days, 1 to 14. A request's due date is fixed when it is sent; a change here applies to new requests only.",
    correctionHelp: "Whole cents, 1 to 100000 (5000 is €50). A correction only ever adds to a rider's pay.",
  },
  riderPay: {
    description: 'What a rider earns beyond the quote.',
    policyOption: '{{policy}} ({{percent}}%)',
    offMenu: '{{policy}} (no longer on the menu)',
    cancellationHelp:
      "A rider whose job is cancelled after they accepted it (by the restaurant, the customer or the co-op) is paid this share of the job's pay. Choose from the payout policies above; a policy added there can be chosen here once it is saved.",
  },
  // The dropped rider pay editor inside the Rider pay card (ReassignmentPayoutPolicyEditor.tsx).
  payoutPolicies: {
    title: 'Reassignment payout policies',
    intro:
      "How much of a dropped rider's piece-rate they keep when a Delivery is reassigned to someone else. 100% is the worker-centered default.",
    // <c>…</c> marks a code name, shown in code type and kept in English.
    pastUnchanged:
      'Renaming or removing a policy does not change past reassignments — a <c>CourierCompensation</c> row and its <c>DeliveryEvent</c> keep the name that was in force when it happened.',
    namePlaceholder: 'Policy name (e.g. FULL_COMPENSATION)',
    makeDefault: 'Make {{name}} the default',
    thisPolicy: 'this policy',
    default: 'Default',
    savedAs: 'Will be saved as',
    add: 'Add policy',
    save: 'Save payout policies',
    // The checks before Save (src/utils/payoutPolicyForm.ts).
    errors: {
      none: 'Add at least one payout policy. Reassignment cannot run without one.',
      nameRequired: 'Row {{position}}: policy name is required.',
      nameCharacters: 'Row {{position}}: use only letters, numbers and underscores in a policy name.',
      percentRequired: 'Row {{position}}: percentage is required.',
      percentRange: 'Row {{position}}: percentage must be a number between 0 and 100.',
      duplicate: 'Two policies are both named {{name}}. Policy names must be unique.',
      chooseDefault: 'Choose which policy is the default.',
    },
  },
  removalReasons: {
    description: 'The reasons a rider can give when asking to come off an order, and what each one pays and bills.',
    loading: 'Loading the reasons.',
    loadFailed: 'Could not load the reasons.',
    empty: 'No reasons yet. Riders cannot ask to come off an order until one is added.',
    paid: 'Paid to the rider',
    notPaid: 'Not paid',
    charged: 'Charged to the restaurant',
    notCharged: 'Not charged',
    needsNote: 'Needs a note',
    add: 'Add reason',
    savesAtOnce: 'Changes to the list save at once, not with the bar at the bottom.',
    returnTripHelp:
      "Share of the delivery's distance fee a rider is paid for bringing the food back, on any job cancelled after pickup. Whole percent, 0 to 100; 0 switches it off. The restaurant is not charged for it.",
    // The add or edit dialog.
    editTitle: 'Edit reason',
    addTitle: 'Add reason',
    dialogDescription:
      'Riders see this list when they ask to come off an order. Requests already sent keep the reason as it read then.',
    labelEl: 'Reason in Greek',
    labelEn: 'Reason in English',
    labelHelp: 'What the rider reads, in each language. At most {{max}} characters each.',
    paidHelp: 'The rider sees whether a reason is paid before sending.',
    chargedHelp: 'Bills the restaurant the same amount the rider would get. Never a delivery fee.',
    noteHelp: 'The rider must say what happened before sending.',
    position: 'Position',
    positionHelp: "Smaller numbers come first in the rider's list.",
    newGoesLast: 'A new reason goes to the end of the list.',
    labelMissing: 'Type what the rider reads for this reason, in Greek and in English.',
    positionWhole: 'The position must be a whole number.',
    saveFailed: 'The reason could not be saved. Try again in a moment.',
    save: 'Save reason',
    // The remove dialog.
    removeTitle: 'Remove this reason?',
    removeDescription: '{{label}}. Riders stop seeing it. Requests already sent keep it.',
    removeFailed: 'The reason could not be removed. Try again in a moment.',
    remove: 'Remove reason',
  },
  serviceArea: {
    description:
      'Addresses outside this area are refused. Couriers looking for a co-op near them see you when they are inside it.',
  },
  instance: {
    description: "The co-op's name, links, dispatch line and data rules.",
    linkLocked: 'Saved. The URL cannot be changed.',
    linkUnlocked: 'Once the URL is saved it cannot be changed. Check it before saving.',
    dietaryHelp: 'Hold Ctrl (Cmd on a Mac) and click to pick more than one.',
    savedCustomerHelp:
      "How long a restaurant's saved customer nobody orders for is kept, then deleted. Customers are personal data the co-op keeps for restaurants. Whole months, 1 to 36.",
    historyHelp:
      'A restaurant sees its ended orders from this many days back, and every order still open. Admins always see every order. Whole days, 1 to 365.',
    sosHelp:
      "The positions a rider's phone shares during an SOS are deleted this many days after the SOS's last position, at 04:00. The record of each SOS and how it ended stays. Whole days, 1 to 365.",
    addressNoteHelp:
      'A note about a place (by a rider, an admin or a restaurant) that no rider other than its author upvotes for this many days is deleted, at 03:30. Each such upvote restarts the period. Riders are told the period. Whole days, 30 to 730; 182 is about 6 months.',
    phoneHelp:
      'Riders call it from the job screen. Digits, optionally starting with +; spaces and dashes are fine. Leave it empty and riders see no Call dispatch button.',
    presetsCourierHelp:
      'The presets riders tap above their message box, to write to dispatch without typing. At most 8, each in Greek and in English, up to 100 characters each. Each rider sees the language of their app.',
    presetsDispatchHelp:
      'The presets dispatch sees on Messages. A click puts the words in the box. At most 8, each in Greek and in English, up to 100 characters each.',
    chatRetentionHelp:
      'Chat messages are personal data. Each is deleted this many days after it was written, at 04:20. Whole days, 7 to 365.',
  },
  // A chat preset list, edited as pairs (spec 0054, AC-7).
  presets: {
    greek: 'Greek',
    english: 'English',
    greekOf: 'Greek, preset {{number}}',
    englishOf: 'English, preset {{number}}',
    none: 'No presets yet.',
    add: 'Add preset',
    remove: 'Remove',
    removeOf: 'Remove preset {{number}}',
    bothNeeded: 'Fill in both the Greek and the English.',
  },
  publicPages: {
    rules: {
      title: 'Courier rules',
      where: 'Shown before a courier joins.',
      placeholder: '# Courier rules\n\nWrite your content in markdown...',
    },
    description: {
      title: 'About the co-op',
      where: 'Shown in the courier app.',
      placeholder: '# About the co-op\n\nWrite your content in markdown...',
    },
    termsOfService: {
      title: 'Terms of service',
      placeholder: '# Terms of Service\n\n## Agreement\nWrite your content in markdown...',
    },
    privacyPolicy: {
      title: 'Privacy policy',
      placeholder: '# Privacy Policy\n\nWrite your content in markdown...',
    },
  },
  // The editor for one public page (PublicPageEditor.tsx).
  publicPageEditor: {
    editing: 'Editing {{title}}',
    content: 'Content (Markdown)',
    hint: 'Use markdown formatting: # Headers, **bold**, *italic*, - Lists, [links](url)',
    preview: 'Preview',
    empty: 'No content yet',
  },
  changeHistory: {
    recordedSince:
      'Recorded since {{date}} (Athens time). Riders see the changes that affect their work, without names.',
    noneYet: 'Every saved change will be listed here. Riders see the changes that affect their work, without names.',
    loadFailed: 'The change history could not be loaded. Try again in a moment.',
    empty: 'No change recorded yet.',
    when: 'When',
    setting: 'Setting',
    before: 'Before',
    after: 'After',
    savedBy: 'Saved by',
    removedAdmin: 'a removed admin',
    newer: 'Newer',
    older: 'Older',
    page: 'Page {{page}} of {{total}}',
    // A stored value as the table shows it.
    none: 'none',
    on: 'on',
    off: 'off',
  },
  // The save bar at the bottom (SaveBar.tsx) and its list of changes (settingsDiff.ts).
  bar: {
    count_one: '{{count}} unsaved change',
    count_other: '{{count}} unsaved changes',
    blockedTitle: 'Save is off until you fix:',
    blockedSr: 'Save is off until you fix: {{reasons}}',
    redrawn: 'redrawn',
    changesTo: 'changes to',
    discard: 'Discard',
    empty: '(empty)',
    none: '(none)',
    on: 'On',
    off: 'Off',
  },
  // Why Save is off (settingsDiff.ts blockers).
  blockers: {
    nameEmpty: 'Name is empty',
    urlEmpty: 'URL is empty',
    areaNotDrawn: 'Service area is not drawn',
    invalidUrl: '{{label}} is not a valid URL',
    nothingSelected: '{{label}} has nothing selected',
    cents: '{{label}}: enter a whole number of cents, zero or more',
    empty: '{{label}} is empty',
    presetsTooMany: '{{label}}: at most {{max}} presets',
    presetsTooLong: '{{label}}: each at most {{max}} characters',
    presetsIncomplete: '{{label}}: fill in both the Greek and the English of each new or changed preset',
    feeAboveCeiling: "{{label}} is {{fee}}, above the co-op's ceiling of {{ceiling}} %",
    smallAboveMedium: 'Small ({{small}} units) cannot take more room than Medium ({{medium}} units)',
    mediumAboveLarge: 'Medium ({{medium}} units) cannot take more room than Large ({{large}} units)',
    weightsAllZero: '{{roadTime}}, {{earnings}} and {{waiting}} cannot all be 0',
  },
  // The words after a save (settingsDiff.ts successMessage).
  success: {
    saved: 'Saved: {{labels}}.',
    pricing: 'Pricing applies to the next quote; deliveries already quoted keep their price.',
    offers: 'Offer settings apply to the next offer; an offer already out keeps its deadline.',
    timedOffers: 'Timed offers apply to the next offer; an offer already out is not moved.',
    delays: 'Restaurant delay settings apply to waits that end from now on; a wait already paid keeps its amount.',
    arrival: "Riders' apps use the new arrival radius within ten minutes.",
    shifts: 'Riders see nothing of shifts until shift booking is built.',
    shiftBreak: "Every rider's time worked, past shifts included, is worked out again with the new break length.",
    handBack: 'The hand back applies to the next accept; a running hand back keeps its end.',
    offerSkip: 'The new skip time applies from the next skip.',
    cancellation: 'Cancelled job pay applies to cancellations from now on.',
    returnTrip: 'Return trip pay applies to food recorded as returned from now on.',
    savedCustomers: 'The daily job uses the retention from its next run.',
    history: 'Restaurants see the new order history period at once.',
    sos: 'The daily job deletes SOS positions under the new period from its next run.',
    presets: 'The new quick replies show the next time a conversation is opened.',
    chatRetention: 'The daily job deletes chat messages under the new period from its next run.',
    addressNotes:
      'The nightly job deletes address notes under the new period from its next run, and riders see the new period in How notes work.',
    stackAndAddOn: 'Two orders together and one more order on a job',
    addOn: 'One more order on a job',
    stack: 'Two orders together',
    stackApplies: '{{what}}: applies to the next offer; offers already out and jobs already taken are unchanged.',
    boxUnits: 'New box units apply to orders made from now on; an order already made keeps its units.',
    fairness: 'The fairness settings apply from the next offer.',
    defaultSize: 'The default size applies to orders sent without a size from now on.',
    reviewDays: 'New review requests get the new answer period; requests already sent keep their date.',
    reviewMax: 'The new limit applies to the next answer with a pay correction.',
    phoneCleared: 'Riders no longer see a Call dispatch button.',
    phoneSet: 'Riders see the Call dispatch button within ten minutes.',
  },
}
