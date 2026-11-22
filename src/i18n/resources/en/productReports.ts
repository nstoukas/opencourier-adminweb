// productReports: English texts (spec 0054, row 47). Every key here has its Greek in ../el/productReports.ts.
// Wrong or missing products (src/pages/product-reports, src/modules/product-reports).
export const productReports = {
  // What was wrong, by the report's kind code.
  kind: {
    WRONG_ITEM: 'Wrong item',
    MISSING_ITEM: 'Missing item',
  },
  // Who sent the report, by its source code.
  source: {
    COURIER: 'Rider',
    PARTNER: 'Restaurant',
    ADMIN: 'Admin',
  },
  // One report (ProductReportRow).
  row: {
    delivery: 'Delivery',
    // The code joins the sender after it, so the trailing space stays.
    from: 'From ',
    resolved: 'Resolved {{date}}',
    resolution: 'Resolution',
    resolve: 'Resolve',
    resolveFailed: 'The report could not be resolved.',
  },
  // One delivery's reports (ProductReportsCard).
  card: {
    title: 'Product reports',
    loadFailed: 'Could not load the product reports.',
    none: 'No product has been reported for this delivery.',
    item: 'Item',
    note: 'Note',
    nameOrNote: 'Name the item or add a note.',
    saveFailed: 'The report could not be saved.',
    saveReport: 'Save report',
    addReport: 'Add report',
  },
  // The Product reports page.
  page: {
    title: 'Product reports',
    description: 'Wrong or missing products reported by riders, restaurants or the co-op.',
    states: {
      open: 'Open',
      resolved: 'Resolved',
      all: 'All',
    },
    loadFailed: 'Could not load the product reports.',
    none: 'No product reports here.',
    previous: 'Previous',
    next: 'Next',
    pageOf: 'Page {{page}} of {{pages}}',
  },
}
