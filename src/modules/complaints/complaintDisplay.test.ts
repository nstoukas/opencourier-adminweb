import {
  COMPLAINT_ABOUT_FILTERS,
  COMPLAINT_ABOUT_TO_HUMAN,
  COMPLAINT_CATEGORY_TO_HUMAN,
  COMPLAINT_FILED_BY_TO_HUMAN,
  COMPLAINT_STATUS_FILTERS,
  COMPLAINT_STATUS_TO_HUMAN,
  COMPLAINT_TEXT_MAX,
  RIDER_CATEGORIES,
  RIDER_COULD_NOT_REPLY,
  aboutText,
  categoryText,
  filerText,
  statusText,
} from './complaintDisplay'

// Spec 0052 (row 83, AC-1, AC-6; cross check 2): tests for human-readable labels and display helper functions
describe('complaintDisplay (spec 0052)', () => {
  describe('constants and dictionaries', () => {
    it('defines human labels for all complaint statuses', () => {
      expect(COMPLAINT_STATUS_TO_HUMAN.AWAITING_REPLY).toBe("Waiting for the rider's reply")
      expect(COMPLAINT_STATUS_TO_HUMAN.OPEN).toBe('Open, to decide')
      expect(COMPLAINT_STATUS_TO_HUMAN.DECIDED).toBe('Decided')
      expect(COMPLAINT_STATUS_TO_HUMAN.WITHDRAWN).toBe('Withdrawn')
    })

    it('defines human labels for all about parties', () => {
      expect(COMPLAINT_ABOUT_TO_HUMAN.RESTAURANT).toBe('A restaurant')
      expect(COMPLAINT_ABOUT_TO_HUMAN.CUSTOMER).toBe('A customer')
      expect(COMPLAINT_ABOUT_TO_HUMAN.RIDER).toBe('A rider')
    })

    it('defines human labels for filers', () => {
      expect(COMPLAINT_FILED_BY_TO_HUMAN.RIDER).toBe('Rider')
      expect(COMPLAINT_FILED_BY_TO_HUMAN.RESTAURANT).toBe('Restaurant')
      expect(COMPLAINT_FILED_BY_TO_HUMAN.ADMIN).toBe('Co-op (on behalf of a caller)')
    })

    it('defines human labels for all 11 categories (AC-1)', () => {
      expect(COMPLAINT_CATEGORY_TO_HUMAN.LONG_WAIT).toBe('Long wait')
      expect(COMPLAINT_CATEGORY_TO_HUMAN.FOOD_NOT_READY).toBe('Food not ready')
      expect(COMPLAINT_CATEGORY_TO_HUMAN.UNSAFE_PACKAGING).toBe('Unsafe packaging')
      expect(COMPLAINT_CATEGORY_TO_HUMAN.RUDE_STAFF).toBe('Rude staff')
      expect(COMPLAINT_CATEGORY_TO_HUMAN.ABUSE_OR_THREAT).toBe('Abuse or a threat')
      expect(COMPLAINT_CATEGORY_TO_HUMAN.UNSAFE_ADDRESS).toBe('Unsafe address')
      expect(COMPLAINT_CATEGORY_TO_HUMAN.NOT_ANSWERING).toBe('Not answering')
      expect(COMPLAINT_CATEGORY_TO_HUMAN.LATE).toBe('Late')
      expect(COMPLAINT_CATEGORY_TO_HUMAN.RUDE).toBe('Rude')
      expect(COMPLAINT_CATEGORY_TO_HUMAN.FOOD_DAMAGED).toBe('Food damaged')
      expect(COMPLAINT_CATEGORY_TO_HUMAN.OTHER).toBe('Something else')
    })

    it('restricts rider categories to the four valid options (AC-3)', () => {
      expect(RIDER_CATEGORIES).toEqual(['LATE', 'RUDE', 'FOOD_DAMAGED', 'OTHER'])
    })

    it('sets max text length to 1000 characters (AC-1)', () => {
      expect(COMPLAINT_TEXT_MAX).toBe(1000)
    })

    it('defines the sentence used when a deactivated rider could not be reached (cross check 2)', () => {
      expect(RIDER_COULD_NOT_REPLY).toBe('The rider could not reply.')
    })

    it('defines status filter options in admin list workflow order', () => {
      expect(COMPLAINT_STATUS_FILTERS.map((f) => f.value)).toEqual([
        'ALL',
        'OPEN',
        'AWAITING_REPLY',
        'DECIDED',
        'WITHDRAWN',
      ])
    })

    it('defines about filter options', () => {
      expect(COMPLAINT_ABOUT_FILTERS.map((f) => f.value)).toEqual(['ALL', 'RIDER', 'RESTAURANT', 'CUSTOMER'])
    })
  })

  describe('categoryText', () => {
    it('returns human-readable text for known categories', () => {
      expect(categoryText('LONG_WAIT')).toBe('Long wait')
      expect(categoryText('LATE')).toBe('Late')
      expect(categoryText('FOOD_DAMAGED')).toBe('Food damaged')
    })

    it('returns the raw code as fallback for unknown future categories', () => {
      expect(categoryText('NEW_UNKNOWN_CATEGORY')).toBe('NEW_UNKNOWN_CATEGORY')
    })
  })

  describe('statusText', () => {
    it('returns human-readable text for known statuses', () => {
      expect(statusText('AWAITING_REPLY')).toBe("Waiting for the rider's reply")
      expect(statusText('OPEN')).toBe('Open, to decide')
      expect(statusText('DECIDED')).toBe('Decided')
      expect(statusText('WITHDRAWN')).toBe('Withdrawn')
    })

    it('returns the raw code as fallback for unknown future statuses', () => {
      expect(statusText('ARCHIVED')).toBe('ARCHIVED')
    })
  })

  describe('aboutText', () => {
    const baseDelivery = {
      id: 'del-1',
      pickupName: 'Ouzeri Volos',
      createdAt: '2026-11-20T10:00:00Z',
    }

    it('returns the rider name when complaint is about a rider', () => {
      const text = aboutText({
        about: 'RIDER',
        aboutCourierName: 'Nikos Katsaros',
        delivery: baseDelivery,
      })
      expect(text).toBe('Nikos Katsaros')
    })

    it('falls back to "A rider" when complaint is about a rider without a name', () => {
      const text = aboutText({
        about: 'RIDER',
        aboutCourierName: null,
        delivery: baseDelivery,
      })
      expect(text).toBe('A rider')
    })

    it('returns restaurant name with tag when complaint is about a restaurant', () => {
      const text = aboutText({
        about: 'RESTAURANT',
        aboutCourierName: null,
        delivery: baseDelivery,
      })
      expect(text).toBe('Ouzeri Volos (restaurant)')
    })

    it('returns "The order\'s customer" when complaint is about a customer', () => {
      const text = aboutText({
        about: 'CUSTOMER',
        aboutCourierName: null,
        delivery: baseDelivery,
      })
      expect(text).toBe("The order's customer")
    })
  })

  describe('filerText', () => {
    it('formats filer kind with filer name when present', () => {
      expect(
        filerText({
          filedBy: 'RIDER',
          filerName: 'Giannis Rider',
        })
      ).toBe('Rider: Giannis Rider')

      expect(
        filerText({
          filedBy: 'RESTAURANT',
          filerName: 'Souvlaki Bar',
        })
      ).toBe('Restaurant: Souvlaki Bar')

      expect(
        filerText({
          filedBy: 'ADMIN',
          filerName: 'Maria Dispatcher',
        })
      ).toBe('Co-op (on behalf of a caller): Maria Dispatcher')
    })

    it('returns filer kind alone when filer name is null', () => {
      expect(
        filerText({
          filedBy: 'RIDER',
          filerName: null,
        })
      ).toBe('Rider')

      expect(
        filerText({
          filedBy: 'ADMIN',
          filerName: null,
        })
      ).toBe('Co-op (on behalf of a caller)')
    })

    it('falls back to the raw code for unknown future filer kinds', () => {
      expect(
        filerText({
          filedBy: 'UNKNOWN_ROLE' as any,
          filerName: 'Some Name',
        })
      ).toBe('UNKNOWN_ROLE: Some Name')
    })
  })
})
