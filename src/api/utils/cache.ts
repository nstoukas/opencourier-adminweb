import { AnyAction, ThunkDispatch } from '@reduxjs/toolkit'
import { DeliveryAdminDto } from '../../backend-admin-sdk'

// Both parameters keep the exported signature intact while the cache-update body below
// stays commented out; the leading underscore is how this repo's lint config marks a
// parameter as deliberately unused. Uncommenting the body means dropping both underscores.
export const handleDeliveryStatusUpdateEvent = (
  _data: DeliveryAdminDto,
  _dispatch: ThunkDispatch<any, any, AnyAction>,
) => {
  // if (ACTIVE_STATUSES.includes(data.status)) {
  //   return dispatch(
  //     deliveriesApi.util.updateQueryData('getDelivery', { view: 'ACTIVE' }, (draft) => {
  //       const existingDeliveryIndex = draft.data.findIndex((delivery) => delivery.id === data.id)
  //       if (existingDeliveryIndex === -1) {
  //         draft.data.push(updatedDelivery)
  //       } else {
  //         draft.data[existingDeliveryIndex] = updatedDelivery
  //       }
  //       return draft
  //     })
  //   )
  // }

  // if (NOT_ACTIVE_STATUSES.includes(data.status)) {
  //   return dispatch(
  //     deliveriesApi.util.updateQueryData('getDelivery', { view: 'RECENT' }, (draft) => {
  //       const existingDeliveryIndex = draft.data.findIndex((delivery) => delivery.id === data.id)
  //       if (existingDeliveryIndex !== -1) {
  //         draft.data[existingDeliveryIndex] = updatedDelivery
  //       }
  //       return draft
  //     })
  //   )
  // }
}
