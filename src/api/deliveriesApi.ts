import {
  DeliveryAdminDto,
  DeliveryAdminPaginatedDto,
  DeliveryEventAdminDto,
} from '../backend-admin-sdk'
import { Tags } from '@/api/utils/tags'
import { api as baseApi, prepareAdminSdk } from '.'
import { AppState } from '@/redux/store'
import { EnumDeliveryEventType } from '../shared-types'
import { handleBackendError } from './utils/api'

export const deliveriesApi = baseApi.injectEndpoints({
  overrideExisting: true,
  endpoints: (build) => ({
    getDeliveries: build.query<DeliveryAdminPaginatedDto, any>({
      queryFn: async (params, api) => {
        try {
          const { accessToken } = (api.getState() as AppState).auth
          const sdk = prepareAdminSdk(accessToken || '')
          const data = await sdk.deliveries().getDeliveries(params)
          return { data }
        } catch (error) {
          return {
            error: handleBackendError(error, api),
          }
        }
      },
      providesTags: [Tags.deliveries],
    }),
    getDelivery: build.query<DeliveryAdminDto, { id: string }>({
      queryFn: async ({ id }, api) => {
        try {
          if (!id) return { error: null }
          const { accessToken } = (api.getState() as AppState).auth
          const sdk = prepareAdminSdk(accessToken || '')
          const data = await sdk.deliveries().getDelivery({ deliveryId: id })
          return { data }
        } catch (error) {
          return {
            error: handleBackendError(error, api),
          }
        }
      },
      providesTags: [Tags.deliveries],
    }),
    /** A Delivery's DeliveryEvent history, oldest first
     *  (opencourier-backend GET /api/admin/v1/deliveries/:deliveryId/events). */
    getDeliveryEvents: build.query<DeliveryEventAdminDto[], { deliveryId: string }>({
      queryFn: async ({ deliveryId }, api) => {
        try {
          const { accessToken } = (api.getState() as AppState).auth
          const sdk = prepareAdminSdk(accessToken || '')
          const data = await sdk.deliveries().getDeliveryEvents({ deliveryId })
          return { data }
        } catch (error) {
          return { error: handleBackendError(error, api) }
        }
      },
      providesTags: [Tags.deliveryEvents],
    }),
    submitDeliveryEvent: build.mutation<
      DeliveryAdminDto,
      { deliveryId: string; eventType: EnumDeliveryEventType; courierId?: string }
    >({
      queryFn: async ({ deliveryId, eventType, courierId }, api) => {
        try {
          const { accessToken } = (api.getState() as AppState).auth
          const sdk = prepareAdminSdk(accessToken || '')
          const data = await sdk.deliveries().submitOrderEvent({
            id: deliveryId,
            deliverySubmitEventAdminInput: {
              deliveryId,
              eventType,
              ...(courierId ? { courierId } : {}),
            },
          })
          return { data }
        } catch (error) {
          return {
            error: handleBackendError(error, api),
          }
        }
      },
      invalidatesTags: [Tags.deliveries, Tags.deliveryEvents],
    }),
    /** Manual assign: admin ACCEPTED with courierId (opencourier-backend POST /api/admin/v1/deliveries/:id/submit-event). */
    assignDeliveryToCourier: build.mutation<
      DeliveryAdminDto,
      { deliveryId: string; courierId: string }
    >({
      queryFn: async ({ deliveryId, courierId }, api) => {
        try {
          const { accessToken } = (api.getState() as AppState).auth
          const sdk = prepareAdminSdk(accessToken || '')
          const data = await sdk.deliveries().submitOrderEvent({
            id: deliveryId,
            deliverySubmitEventAdminInput: {
              deliveryId,
              eventType: EnumDeliveryEventType.ACCEPTED,
              courierId,
            },
          })
          return { data }
        } catch (error) {
          return {
            error: handleBackendError(error, api),
          }
        }
      },
      invalidatesTags: [Tags.deliveries, Tags.deliveryEvents],
    }),
    /** Admin rider reassignment (opencourier-backend POST /api/admin/v1/deliveries/:id/reassign).
     *  Writes a CourierCompensation row for the dropped rider and emits a REASSIGNED DeliveryEvent.
     *  NOT the same as submit-event: submit-event would move the status and pay nobody. */
    reassignDelivery: build.mutation<
      DeliveryAdminDto,
      { deliveryId: string; courierId: string; payoutPolicy?: string; message?: string }
    >({
      queryFn: async ({ deliveryId, courierId, payoutPolicy, message }, api) => {
        try {
          const { accessToken } = (api.getState() as AppState).auth
          const sdk = prepareAdminSdk(accessToken || '')
          const data = await sdk.deliveries().reassignDelivery({
            id: deliveryId,
            deliveryReassignAdminInput: {
              courierId,
              payoutPolicy,
              message,
            },
          })
          return { data }
        } catch (error) {
          return {
            error: handleBackendError(error, api),
          }
        }
      },
      invalidatesTags: [Tags.deliveries, Tags.deliveryEvents],
    }),
  }),
})

export const {
  useGetDeliveriesQuery,
  useGetDeliveryQuery,
  useGetDeliveryEventsQuery,
  useSubmitDeliveryEventMutation,
  useAssignDeliveryToCourierMutation,
  useReassignDeliveryMutation,
} = deliveriesApi
