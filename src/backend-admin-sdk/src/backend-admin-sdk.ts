import { BaseAPI, Configuration, ConfigurationParameters } from './runtime'
import { AuthApi, ChatApi, ConfigApi, CourierApi, CourierSettingsApi, DeliveriesApi, DispatchBoardApi, DispatchStopApi, LocationsApi, PartnerApi, PartnerChargeApi, RemovalRequestApi, ReviewRequestApi, SavedCustomersApi, CourierAccountApi, ShiftOfflineEventApi, StatementApi, ShiftSlotApi, SosApi, TimeWorkedApi } from "./apis";
import { ApiError } from './errors'

export class BackendAdminSdk {
  private apis: { [name: string]: BaseAPI } = {}
  private readonly params: ConfigurationParameters
  private readonly configuration: Configuration

  constructor(params: ConfigurationParameters) {
    this.params = {
      ...params,
      middleware: [
        ...(params.middleware || []),
        {
          onError: async (ctx) => {
            if (ctx.response) {
              const body = await ctx.response.json()
              if (typeof body === 'object' && body !== null && body.error && body.result) {
                if (Array.isArray(body.result)) {
                  throw this.convertApiError(body.result[0])
                }
                throw this.convertApiError(body.result)
              }
              if (ctx.response.status === 401) {
                throw new ApiError('UNAUTHORIZED', 'Unauthorized', 401)
              }
              if (ctx.response.status === 403) {
                throw new ApiError('FORBIDDEN', 'Forbidden', 401)
              }
            }
          },
          post: async (ctx) => {
            if (ctx.response.status !== 204) {
              if (!ctx.response.headers.get('Content-Type')?.includes('application/json')) {
                return new Response(JSON.stringify({}), ctx.init)
              }
              const body = await ctx.response.json()
              if (typeof body === 'object' && body !== null) {
                if (body.error && body.result) {
                  if (Array.isArray(body.result)) {
                    throw this.convertApiError(body.result[0])
                  }
                  throw this.convertApiError(body.result)
                }
                if (ctx.response.status === 401) {
                  throw new ApiError('UNAUTHORIZED', 'Unauthorized', 401)
                }
                if (ctx.response.status === 403) {
                  throw new ApiError('FORBIDDEN', 'Forbidden', 401)
                }
                if (body.result) {
                  return new Response(JSON.stringify(body.result), ctx.init)
                }
              }
            }
          },
        },
      ],
    }
    this.configuration = new Configuration(this.params)
  }

  auth(): AuthApi {
    return this.getOrCreateApi(AuthApi)
  }

  deliveries(): DeliveriesApi {
    return this.getOrCreateApi(DeliveriesApi)
  }

  couriers(): CourierApi {
    return this.getOrCreateApi(CourierApi)
  }

  // Stopping dispatch for heat or a storm (spec 0014).
  dispatchStops(): DispatchStopApi {
    return this.getOrCreateApi(DispatchStopApi)
  }

  // The co-op's weekly shift slots (spec 0026).
  shiftSlots(): ShiftSlotApi {
    return this.getOrCreateApi(ShiftSlotApi)
  }

  // A rider's monthly statements (spec 0050).
  statements(): StatementApi {
    return this.getOrCreateApi(StatementApi)
  }

  // Rider account upkeep (spec 0051).
  courierAccount(): CourierAccountApi {
    return this.getOrCreateApi(CourierAccountApi)
  }

  // Offline during a booked shift, to follow up in person (spec 0049).
  shiftOfflineEvents(): ShiftOfflineEventApi {
    return this.getOrCreateApi(ShiftOfflineEventApi)
  }

  // Riders' SOS incidents (spec 0022).
  sos(): SosApi {
    return this.getOrCreateApi(SosApi)
  }

  dispatchBoard(): DispatchBoardApi {
    return this.getOrCreateApi(DispatchBoardApi)
  }

  // A rider's request to come off an order, and the co-op's reasons (spec 0035).
  removalRequests(): RemovalRequestApi {
    return this.getOrCreateApi(RemovalRequestApi)
  }

  // Dispatch's chat inbox (spec 0034, chat).
  chat(): ChatApi {
    return this.getOrCreateApi(ChatApi)
  }

  // What each restaurant owes, and bills made by hand (spec 0036).
  partnerCharges(): PartnerChargeApi {
    return this.getOrCreateApi(PartnerChargeApi)
  }

  // Riders' review requests and the settings record (spec 0038).
  reviewRequests(): ReviewRequestApi {
    return this.getOrCreateApi(ReviewRequestApi)
  }

  // A rider's time worked and the co-op totals (spec 0040).
  timeWorked(): TimeWorkedApi {
    return this.getOrCreateApi(TimeWorkedApi)
  }

  partners(): PartnerApi {
    return this.getOrCreateApi(PartnerApi)
  }

  // A restaurant's saved customers (spec 0005).
  savedCustomers(): SavedCustomersApi {
    return this.getOrCreateApi(SavedCustomersApi)
  }

  courierSettings(): CourierSettingsApi {
    return this.getOrCreateApi(CourierSettingsApi)
  }

  locations(): LocationsApi {
    return this.getOrCreateApi(LocationsApi)
  }

  config(): ConfigApi {
    return this.getOrCreateApi(ConfigApi)
  }

  private getOrCreateApi<T extends BaseAPI>(apiClass: { new (config: Configuration): T }): T {
    if (!this.apis[apiClass.name]) {
      this.apis[apiClass.name] = new apiClass(this.configuration)
    }
    return this.apis[apiClass.name] as T
  }

  private convertApiError(errorObject: any) {
    if (this.isApiError(errorObject)) {
      // A bill's 409 names the charges another bill already covers (spec 0036, AC-6).
      const alreadyBilled = Array.isArray(errorObject.alreadyBilled) ? errorObject.alreadyBilled : undefined
      // An assignment past a full box names both numbers for the confirm dialog (spec 0043, AC-6).
      const boxUnits =
        typeof errorObject.heldUnits === 'number' && typeof errorObject.deliveryUnits === 'number'
          ? { heldUnits: errorObject.heldUnits, deliveryUnits: errorObject.deliveryUnits }
          : undefined
      return new ApiError(errorObject.code, errorObject.message, errorObject.statusCode, alreadyBilled, boxUnits)
    }
    return new Error(errorObject)
  }

  private isApiError<T extends { code?: string; message?: string; statusCode?: number }>(error: T): boolean {
    return (
      typeof error.code === 'string' &&
      (typeof error.message === 'string' || Array.isArray(error.message)) &&
      typeof error.statusCode === 'number'
    )
  }
}
