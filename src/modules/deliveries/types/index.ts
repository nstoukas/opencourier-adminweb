import { EnumDeliveryEventType } from '../../../shared-types'

export interface OrderEventFormValues {
  /** Empty until the user selects an event from STATE_MACHINE for the current status. */
  eventType: EnumDeliveryEventType | ''
}
