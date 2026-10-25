const tagTypes = {
  addresses: 'Addresses',
  me: 'Me',
  deliveries: 'Deliveries',
  couriers: 'Couriers',
  customer: 'Customer',
  payment: 'Payment',
  config: 'Config',
  partners: 'Partners',
  deliveryEvents: 'DeliveryEvents',
}

export const Tags = {
  tagTypes: Object.keys(tagTypes)
    .map((key) => (tagTypes as Record<string, string>)[key])
    .filter((key): key is string => typeof key !== 'undefined'),

  addresses: tagTypes['addresses'],
  me: tagTypes['me'],
  deliveries: tagTypes['deliveries'],
  couriers: tagTypes['couriers'],
  customer: tagTypes['customer'],
  payment: tagTypes['payment'],
  config: tagTypes['config'],
  partners: tagTypes['partners'],
  deliveryEvents: tagTypes['deliveryEvents'],
}
