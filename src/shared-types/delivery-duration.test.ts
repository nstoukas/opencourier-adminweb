import {
  EnumDeliveryDurationCalculationType,
  DELIVERY_DURATION_CALCULATION_TYPE_TO_HUMAN,
} from './delivery-duration'
import {
  InstanceConfigSettingsOptionsDtoDeliveryDurationCalculationTypeEnum,
  InstanceConfigSettingsDtoDeliveryDurationCalculationTypeEnum,
  InstanceConfigSettingsAdminInputDeliveryDurationCalculationTypeEnum,
} from '../backend-admin-sdk/src/models'

describe('Delivery Duration Calculation Type Enums and Labels', () => {
  it('EnumDeliveryDurationCalculationType.OSRM carries the wire value "OSRM"', () => {
    // Verify OSRM enum member is defined with exact string value expected by backend API
    expect(EnumDeliveryDurationCalculationType.OSRM).toBe('OSRM')
  })

  it('DELIVERY_DURATION_CALCULATION_TYPE_TO_HUMAN.OSRM maps to exact label "OSRM routed duration (moped profile)"', () => {
    // Assert exact human label for OSRM so UI dropdown renders non-blank text
    expect(
      DELIVERY_DURATION_CALCULATION_TYPE_TO_HUMAN[
        EnumDeliveryDurationCalculationType.OSRM
      ]
    ).toBe('OSRM routed duration (moped profile)')
  })

  it('coupling guard: every option returned by backend SDK has a non-empty human label', () => {
    // Prevent blank options in UI by ensuring every API duration option has a valid label mapping
    const apiOptions = Object.values(
      InstanceConfigSettingsOptionsDtoDeliveryDurationCalculationTypeEnum
    ) as EnumDeliveryDurationCalculationType[]

    apiOptions.forEach((option) => {
      const label = DELIVERY_DURATION_CALCULATION_TYPE_TO_HUMAN[option]
      expect(label).toBeDefined()
      expect(typeof label).toBe('string')
      expect(label.length).toBeGreaterThan(0)
    })
  })

  it('preserves pre-existing human label for SIMPLE unchanged', () => {
    // Verify pre-existing SIMPLE strategy keeps its exact label
    expect(DELIVERY_DURATION_CALCULATION_TYPE_TO_HUMAN.SIMPLE).toBe(
      'Simple (Distance * 2)'
    )
  })

  it('SDK read DTO and write input enums accept OSRM', () => {
    // Ensure read DTO and write input DTO both include Osrm wire value 'OSRM' for round-tripping
    expect(
      InstanceConfigSettingsDtoDeliveryDurationCalculationTypeEnum.Osrm
    ).toBe('OSRM')
    expect(
      InstanceConfigSettingsAdminInputDeliveryDurationCalculationTypeEnum.Osrm
    ).toBe('OSRM')
  })
})
