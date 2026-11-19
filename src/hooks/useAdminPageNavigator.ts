import { useRouter } from 'next/router'

export enum EAdminRoutes {
  HOME = '/',
  INSTANCE_CONFIGURATION = '/instance-configuration',
  LOGIN = '/login',
  PARTNERS = '/partners',
  PRODUCT_REPORTS = '/product-reports',
  PARTNER_DETAILS = '/partners/[partnerId]',
  DELIVERIES = '/deliveries',
  DELIVERY_DETAILS = '/deliveries/[deliveryId]',
  COURIERS = '/couriers',
  COURIER_DETAILS = '/couriers/[courierId]',
  // Riders' SOS incidents (spec 0022).
  SOS = '/sos',
  // The co-op's weekly shift slots (spec 0026).
  SHIFT_SLOTS = '/shift-slots',
  SOS_DETAILS = '/sos/[sosId]',
  // Dispatch's chat inbox (spec 0034, chat).
  CHAT = '/chat',
  // One page file answers /chat and /chat/<id> (an optional catch all), so the inbox survives opening a thread.
  CHAT_THREAD = '/chat/[[...threadId]]',
  // What each restaurant owes, per month (spec 0036). `?month=YYYY-MM` picks the month.
  CHARGES = '/charges',
  // One restaurant's charges and bills for a month.
  CHARGES_PARTNER_MONTH = '/charges/[month]/[partnerId]',
  // A bill's printable statement, in Greek, without the sidebar.
  CHARGES_STATEMENT = '/charges/statement/[billId]',
  // Riders' review requests, answered by a person (spec 0038).
  REVIEWS = '/reviews',
  // The co-op's time worked totals (spec 0040).
  TIME_WORKED = '/time-worked',
}

export const Routes = Object.values(EAdminRoutes)

type NavigationArgs = {
  query?: Record<string, string>
  search?: string | null | undefined
}

/** Handle admins web apps navigation. */
export const useAdminPageNavigator = () => {
  const router = useRouter()
  return {
    goHome: (args?: NavigationArgs) => router.push({ pathname: EAdminRoutes.HOME, ...args }),
    goToLogin: (args?: NavigationArgs) => router.push({ pathname: EAdminRoutes.LOGIN, ...args }),
    goToPartners: (args?: NavigationArgs) => router.push({ pathname: EAdminRoutes.PARTNERS, ...args }),
    goToPartnerDetails: (partnerId: string, args?: NavigationArgs) => {
      const { query = {}, ...otherArgs } = args ?? {}
      return router.push({
        pathname: EAdminRoutes.PARTNER_DETAILS,
        query: { partnerId, ...query },
        ...otherArgs,
      })
    },
    goToCouriers: (args?: NavigationArgs) => router.push({ pathname: EAdminRoutes.COURIERS, ...args }),
    goToCourierDetails: (courierId: string, args?: NavigationArgs) => {
      const { query = {}, ...otherArgs } = args ?? {}
      return router.push({
        pathname: EAdminRoutes.COURIER_DETAILS,
        query: { courierId, ...query },
        ...otherArgs,
      })
    },
    goToDeliveries: (args?: NavigationArgs) => router.push({ pathname: EAdminRoutes.DELIVERIES, ...args }),
    goToDeliveryDetails: (deliveryId: string, args?: NavigationArgs) => {
      const { query = {}, ...otherArgs } = args ?? {}
      return router.push({
        pathname: EAdminRoutes.DELIVERY_DETAILS,
        query: { deliveryId, ...query },
        ...otherArgs,
      })
    },
  }
}
