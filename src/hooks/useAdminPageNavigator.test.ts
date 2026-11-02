import { EAdminRoutes, Routes } from './useAdminPageNavigator'

describe('useAdminPageNavigator & EAdminRoutes (spec 0022)', () => {
  it('declares SOS and SOS_DETAILS routes', () => {
    expect(EAdminRoutes.SOS).toBe('/sos')
    expect(EAdminRoutes.SOS_DETAILS).toBe('/sos/[sosId]')
    expect(Routes).toContain('/sos')
    expect(Routes).toContain('/sos/[sosId]')
  })
})
