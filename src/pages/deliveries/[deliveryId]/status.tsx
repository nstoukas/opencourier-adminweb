import { useGetDeliveryQuery, useSubmitDeliveryEventMutation } from '@/api/deliveriesApi'
import { DefaultLayout } from '@/components/layouts/DefaultLayout'
import { useAdminPageNavigator } from '@/hooks/useAdminPageNavigator'
import { useOrderStatusForm } from '@/modules/deliveries/hooks/form/useOrderStatusForm'
import { OrderEventFormValues } from '@/modules/deliveries/types'
import { adminEventsForStatus, courierIdForAdminEvent } from '@/modules/deliveries/utils/adminEvents'
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Spinner,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  useToast,
} from '../../../admin-web-components'
import { omit } from 'lodash'
import type { NextPage } from 'next'
import { useRouter } from 'next/router'

// The admin override: move one delivery by hand by submitting a DeliveryEvent.
// The backend's state machine decides the resulting status, never this page.
const DeliveryStatusPage: NextPage = () => {
  const router = useRouter()
  const { goToDeliveryDetails } = useAdminPageNavigator()
  // The file is named [deliveryId], so that is the query key Next.js fills in.
  const deliveryId = typeof router.query.deliveryId === 'string' ? router.query.deliveryId : ''
  const { data } = useGetDeliveryQuery({ id: deliveryId })
  const [submitDeliveryEvent, { isLoading }] = useSubmitDeliveryEventMutation()
  const { toast } = useToast()

  const form = useOrderStatusForm()

  const handleFormSubmit = async (values: OrderEventFormValues) => {
    const eventType = values.eventType
    // The form's schema already refuses an empty choice; this check tells TypeScript so.
    if (!data || !eventType) return
    if (!confirm(`Submitting event from status "${data.status}": "${eventType}"?`)) return

    try {
      const updated = await submitDeliveryEvent({
        deliveryId: data.id,
        eventType,
        courierId: courierIdForAdminEvent(eventType, data),
      }).unwrap()
      // Report the status the server came back with, not the one we hoped for: the backend
      // ignores an event it has no transition for, and still answers with success.
      if (updated.status === data.status) {
        toast({
          title: 'Nothing changed',
          description: `The server did not apply "${eventType}". Status is still ${updated.status}.`,
        })
      } else {
        toast({ title: 'Event submitted', description: `Status is now ${updated.status}.` })
      }
      form.reset()
    } catch (error: any) {
      toast({
        title: 'Submit failed',
        // Show the backend's own reason (for example "courierId is required") when there is one.
        description: error?.message || 'Failed to change delivery status',
        variant: 'destructive',
      })
    }
  }

  const possibleEvents = data ? adminEventsForStatus(data.status, data) : []

  return (
    <DefaultLayout>
      {data ? (
        <>
          <Button variant="link" className="p-0" onClick={() => goToDeliveryDetails(data.id)}>
            Back to delivery
          </Button>
          <div className="flex flex-row">
            <h2 className="text-2xl font-bold tracking-tight grow">Delivery {data.id}</h2>
          </div>
          <Card className="my-4">
            <CardHeader>
              <CardTitle>Delivery Details</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-6">
              <Label className="flex flex-col space-y-1">
                <span>Status</span>
                <span className="font-normal leading-snug text-muted-foreground">{data.status}</span>
              </Label>
              <Label className="flex flex-col space-y-1">
                <span>Courier ID</span>
                <span className="font-normal leading-snug text-muted-foreground break-all">
                  {data.courierId || '—'}
                </span>
              </Label>
              <Label className="flex flex-col space-y-1">
                <span>Customer</span>
                <span className="font-normal leading-snug text-muted-foreground">{data.customerName}</span>
              </Label>
            </CardContent>
          </Card>
          <Card className="my-4">
            <CardHeader>
              <CardTitle>Change Status</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-6">
              {possibleEvents.length ? (
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(handleFormSubmit)} className="flex flex-col h-full space-y-4">
                    <FormField
                      control={form.control}
                      name="eventType"
                      render={({ field }) => (
                        <FormItem className="grid gap-1">
                          <FormLabel>Transition status by submitting a delivery event</FormLabel>
                          <Select {...omit(field, ['onChange', 'onBlur', 'ref'])} onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select delivery event" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {possibleEvents.map((eventType) => (
                                <SelectItem value={eventType} key={eventType}>
                                  {eventType}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div>
                      <Button variant="destructive" disabled={isLoading}>
                        {isLoading && <Spinner className="mr-2" />}
                        Submit event
                      </Button>
                    </div>
                  </form>
                </Form>
              ) : (
                <span className="text-muted-foreground">No status change is possible from {data.status}.</span>
              )}
            </CardContent>
          </Card>
        </>
      ) : null}
    </DefaultLayout>
  )
}

export default DeliveryStatusPage
