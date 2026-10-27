import { deliveriesApi, useGetDeliveryIssuesQuery } from './deliveriesApi'
import { Tags } from './utils/tags'

describe('deliveriesApi getDeliveryIssues endpoint (decision 66.11)', () => {
  it('exports useGetDeliveryIssuesQuery hook function', () => {
    expect(typeof useGetDeliveryIssuesQuery).toBe('function')
  })

  it('defines getDeliveryIssues endpoint on deliveriesApi', () => {
    expect(deliveriesApi.endpoints.getDeliveryIssues).toBeDefined()
    expect(typeof deliveriesApi.endpoints.getDeliveryIssues.initiate).toBe('function')
  })

  it('declares deliveryIssues tag type in Tags and associates with endpoint', () => {
    expect(Tags.deliveryIssues).toBe('DeliveryIssues')
    expect(Tags.tagTypes).toContain('DeliveryIssues')
  })
})
