// Private copy of the backend's EnumDeliveryIssueReason (prisma/schema.prisma, decision 66.11).
// A new reason there needs a line here and in the label map below.
export enum EnumDeliveryIssueReason {
  WRONG_ADDRESS = 'WRONG_ADDRESS',
  NO_SIGNAL = 'NO_SIGNAL',
  ORDER_HANDED = 'ORDER_HANDED',
  OTHER = 'OTHER',
}

// The words the admin reads for each reason: the same ones the rider tapped in the app.
export const DELIVERY_ISSUE_REASON_TO_HUMAN: Record<EnumDeliveryIssueReason, string> = {
  WRONG_ADDRESS: 'Wrong address',
  NO_SIGNAL: 'No internet, GPS or signal',
  ORDER_HANDED: 'Order handed to the customer',
  OTHER: 'Other',
}
