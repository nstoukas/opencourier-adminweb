import {
  DeliveryAdminDto,
  DeliveryAdminPaginatedDto,
  DeliveryEventAdminDto,
  DeliveryIssueAdminDto,
  ProductReportAdminDto,
  ProductReportPageAdminDto,
  DeliverySubmitEventAdminInputEventTypeEnum,
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
    /** The riders' reports about a Delivery, oldest first (decision 66.11;
     *  opencourier-backend GET /api/admin/v1/deliveries/:deliveryId/issues). */
    getDeliveryIssues: build.query<DeliveryIssueAdminDto[], { deliveryId: string }>({
      queryFn: async ({ deliveryId }, api) => {
        try {
          const { accessToken } = (api.getState() as AppState).auth
          const sdk = prepareAdminSdk(accessToken || '')
          const data = await sdk.deliveries().getDeliveryIssues({ deliveryId })
          return { data }
        } catch (error) {
          return { error: handleBackendError(error, api) }
        }
      },
      providesTags: [Tags.deliveryIssues],
    }),
    // Spec 0034, AC-7. The board's list and the delivery page both read this tag, so the row leaves.
    markDeliveryIssueHandled: build.mutation<DeliveryIssueAdminDto, { deliveryId: string; issueId: string }>({
      queryFn: async (args, api) => {
        try {
          const { accessToken } = (api.getState() as AppState).auth
          const data = await prepareAdminSdk(accessToken || '').deliveries().markDeliveryIssueHandled(args)
          return { data }
        } catch (error) {
          return { error: handleBackendError(error, api) }
        }
      },
      invalidatesTags: [Tags.deliveryIssues],
    }),
    // Spec 0032: product reports, one delivery's and the co-op's open list.
    getDeliveryProductReports: build.query<ProductReportAdminDto[], { deliveryId: string }>({
      queryFn: async ({ deliveryId }, api) => {
        try {
          const { accessToken } = (api.getState() as AppState).auth
          const sdk = prepareAdminSdk(accessToken || '')
          const data = await sdk.deliveries().getDeliveryProductReports({ deliveryId })
          return { data }
        } catch (error) {
          return { error: handleBackendError(error, api) }
        }
      },
      providesTags: [Tags.productReports],
    }),
    getProductReports: build.query<ProductReportPageAdminDto, { state: 'open' | 'resolved' | 'all'; page: number; perPage: number }>({
      queryFn: async (params, api) => {
        try {
          const { accessToken } = (api.getState() as AppState).auth
          const sdk = prepareAdminSdk(accessToken || '')
          const data = await sdk.deliveries().getProductReports(params)
          return { data }
        } catch (error) {
          return { error: handleBackendError(error, api) }
        }
      },
      providesTags: [Tags.productReports],
    }),
    createDeliveryProductReport: build.mutation<
      ProductReportAdminDto,
      { deliveryId: string; kind: 'WRONG_ITEM' | 'MISSING_ITEM'; itemName?: string; note?: string }
    >({
      queryFn: async (params, api) => {
        try {
          const { accessToken } = (api.getState() as AppState).auth
          const sdk = prepareAdminSdk(accessToken || '')
          const data = await sdk.deliveries().createDeliveryProductReport(params)
          return { data }
        } catch (error) {
          return { error: handleBackendError(error, api) }
        }
      },
      invalidatesTags: [Tags.productReports, Tags.deliveryEvents],
    }),
    resolveProductReport: build.mutation<ProductReportAdminDto, { id: string; resolution?: string }>({
      queryFn: async (params, api) => {
        try {
          const { accessToken } = (api.getState() as AppState).auth
          const sdk = prepareAdminSdk(accessToken || '')
          const data = await sdk.deliveries().resolveProductReport(params)
          return { data }
        } catch (error) {
          return { error: handleBackendError(error, api) }
        }
      },
      invalidatesTags: [Tags.productReports, Tags.deliveryEvents],
    }),
    submitDeliveryEvent: build.mutation<
      DeliveryAdminDto,
      // cancelledBy only with CANCELED (spec 0015): who asked, which decides a restaurant charge.
      {
        deliveryId: string
        eventType: EnumDeliveryEventType
        courierId?: string
        cancelledBy?: 'RESTAURANT' | 'CUSTOMER' | 'COOP'
      }
    >({
      queryFn: async ({ deliveryId, eventType, courierId, cancelledBy }, api) => {
        try {
          const { accessToken } = (api.getState() as AppState).auth
          const sdk = prepareAdminSdk(accessToken || '')
          const data = await sdk.deliveries().submitOrderEvent({
            id: deliveryId,
            deliverySubmitEventAdminInput: {
              deliveryId,
              // `as` narrows the type by hand. adminweb's event list now also holds OFFERED,
              // OFFER_EXPIRED and NO_COURIER_AVAILABLE, which only the platform records; the
              // SDK's submit list rightly lacks them. Callers pass events from the admin menus,
              // which come from STATE_MACHINE, and that table never lists those three.
              eventType: eventType as DeliverySubmitEventAdminInputEventTypeEnum,
              ...(courierId ? { courierId } : {}),
              ...(cancelledBy ? { cancelledBy } : {}),
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
      // confirmOverCapacity: the admin confirmed putting the rider past a full box (spec 0043, AC-6).
      { deliveryId: string; courierId: string; confirmOverCapacity?: boolean }
    >({
      queryFn: async ({ deliveryId, courierId, confirmOverCapacity }, api) => {
        try {
          const { accessToken } = (api.getState() as AppState).auth
          const sdk = prepareAdminSdk(accessToken || '')
          const data = await sdk.deliveries().submitOrderEvent({
            id: deliveryId,
            deliverySubmitEventAdminInput: {
              deliveryId,
              eventType: EnumDeliveryEventType.ACCEPTED,
              courierId,
              confirmOverCapacity,
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
      {
        deliveryId: string
        courierId: string
        payoutPolicy?: string
        message?: string
        confirmOverCapacity?: boolean
      }
    >({
      queryFn: async ({ deliveryId, courierId, payoutPolicy, message, confirmOverCapacity }, api) => {
        try {
          const { accessToken } = (api.getState() as AppState).auth
          const sdk = prepareAdminSdk(accessToken || '')
          const data = await sdk.deliveries().reassignDelivery({
            id: deliveryId,
            deliveryReassignAdminInput: {
              courierId,
              payoutPolicy,
              message,
              confirmOverCapacity,
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
  useGetDeliveryIssuesQuery,
  useGetDeliveryProductReportsQuery,
  useGetProductReportsQuery,
  useCreateDeliveryProductReportMutation,
  useResolveProductReportMutation,
  useSubmitDeliveryEventMutation,
  useAssignDeliveryToCourierMutation,
  useMarkDeliveryIssueHandledMutation,
  useReassignDeliveryMutation,
} = deliveriesApi
