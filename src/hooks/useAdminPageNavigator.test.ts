import { EAdminRoutes, Routes } from './useAdminPageNavigator'

describe('useAdminPageNavigator & EAdminRoutes (spec 0022)', () => {
  it('declares SOS and SOS_DETAILS routes', () => {
    expect(EAdminRoutes.SOS).toBe('/sos')
    expect(EAdminRoutes.SOS_DETAILS).toBe('/sos/[sosId]')
    expect(Routes).toContain('/sos')
    expect(Routes).toContain('/sos/[sosId]')
  })

  it('declares PRODUCT_REPORTS route (spec 0032, AC-6)', () => {
    expect(EAdminRoutes.PRODUCT_REPORTS).toBe('/product-reports')
    expect(Routes).toContain('/product-reports')
  })

  it('declares ADDRESS_NOTES route (spec 0053, AC-7)', () => {
    expect(EAdminRoutes.ADDRESS_NOTES).toBe('/address-notes')
    expect(Routes).toContain('/address-notes')
  })
})
