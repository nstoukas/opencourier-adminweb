import {
  EnumGeoCalculationType,
  GEO_CALCULATION_TYPE_TO_HUMAN,
} from './geo-calculation'
import {
  InstanceConfigSettingsOptionsDtoGeoCalculationTypeEnum,
  InstanceConfigSettingsDtoGeoCalculationTypeEnum,
  InstanceConfigSettingsAdminInputGeoCalculationTypeEnum,
} from '../backend-admin-sdk/src/models'

describe('Geo Calculation Type Enums and Labels', () => {
  it('EnumGeoCalculationType.OSRM carries the wire value "OSRM"', () => {
    // Verify OSRM enum member is defined with exact string value expected by backend API
    expect(EnumGeoCalculationType.OSRM).toBe('OSRM')
  })

  it('GEO_CALCULATION_TYPE_TO_HUMAN.OSRM maps to exact label "OSRM road routing (moped profile)"', () => {
    // Assert exact human label for OSRM so UI dropdown renders non-blank text
    expect(GEO_CALCULATION_TYPE_TO_HUMAN[EnumGeoCalculationType.OSRM]).toBe(
      'OSRM road routing (moped profile)'
    )
  })

  it('coupling guard: every option returned by backend SDK has a non-empty human label', () => {
    // Prevent blank options in UI by ensuring every API option has a valid label mapping
    const apiOptions = Object.values(
      InstanceConfigSettingsOptionsDtoGeoCalculationTypeEnum
    ) as EnumGeoCalculationType[]

    apiOptions.forEach((option) => {
      const label = GEO_CALCULATION_TYPE_TO_HUMAN[option]
      expect(label).toBeDefined()
      expect(typeof label).toBe('string')
      expect(label.length).toBeGreaterThan(0)
    })
  })

  it('preserves pre-existing human labels unchanged', () => {
    // Verify pre-existing strategies keep their exact labels
    expect(GEO_CALCULATION_TYPE_TO_HUMAN.HAVERSINE).toBe(
      'Haversine distance (Areal distance)'
    )
    expect(GEO_CALCULATION_TYPE_TO_HUMAN.GOOGLE_MATRIX_API).toBe(
      'Google Matrix API'
    )
    expect(GEO_CALCULATION_TYPE_TO_HUMAN.RANDOM).toBe(
      'Random distance (For development)'
    )
  })

  it('SDK read DTO and write input enums accept OSRM', () => {
    // Ensure read DTO and write input DTO both include Osrm wire value 'OSRM' for round-tripping
    expect(InstanceConfigSettingsDtoGeoCalculationTypeEnum.Osrm).toBe('OSRM')
    expect(InstanceConfigSettingsAdminInputGeoCalculationTypeEnum.Osrm).toBe(
      'OSRM'
    )
  })
})
