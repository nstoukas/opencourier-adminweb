import {
  EnumDeliveryIssueReason,
  DELIVERY_ISSUE_REASON_TO_HUMAN,
} from './delivery-issues'

describe('EnumDeliveryIssueReason and DELIVERY_ISSUE_REASON_TO_HUMAN (decision 66.11)', () => {
  it('defines all required issue reasons matching the backend enum', () => {
    expect(EnumDeliveryIssueReason.WRONG_ADDRESS).toBe('WRONG_ADDRESS')
    expect(EnumDeliveryIssueReason.NO_SIGNAL).toBe('NO_SIGNAL')
    expect(EnumDeliveryIssueReason.ORDER_HANDED).toBe('ORDER_HANDED')
    expect(EnumDeliveryIssueReason.OTHER).toBe('OTHER')

    const reasons = Object.values(EnumDeliveryIssueReason)
    expect(reasons).toHaveLength(4)
    expect(reasons).toEqual(
      expect.arrayContaining(['WRONG_ADDRESS', 'NO_SIGNAL', 'ORDER_HANDED', 'OTHER'])
    )
  })

  it('provides exact human labels matching the rider app copy for every enum member', () => {
    expect(DELIVERY_ISSUE_REASON_TO_HUMAN[EnumDeliveryIssueReason.WRONG_ADDRESS]).toBe(
      'Wrong address'
    )
    expect(DELIVERY_ISSUE_REASON_TO_HUMAN[EnumDeliveryIssueReason.NO_SIGNAL]).toBe(
      'No internet, GPS or signal'
    )
    expect(DELIVERY_ISSUE_REASON_TO_HUMAN[EnumDeliveryIssueReason.ORDER_HANDED]).toBe(
      'Order handed to the customer'
    )
    expect(DELIVERY_ISSUE_REASON_TO_HUMAN[EnumDeliveryIssueReason.OTHER]).toBe('Other')

    // Every key in EnumDeliveryIssueReason must have a non-empty human label
    for (const reason of Object.values(EnumDeliveryIssueReason)) {
      expect(DELIVERY_ISSUE_REASON_TO_HUMAN[reason]).toBeTruthy()
      expect(typeof DELIVERY_ISSUE_REASON_TO_HUMAN[reason]).toBe('string')
    }
  })
})
