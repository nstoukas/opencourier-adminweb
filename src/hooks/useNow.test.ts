import { renderHook, act } from '@testing-library/react'
import { useNow } from './useNow'

describe('useNow hook (spec 0002, AC-11)', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('returns initial date on mount and updates when interval fires', () => {
    const startTime = new Date('2026-10-26T12:00:00.000Z')
    jest.setSystemTime(startTime)

    const { result } = renderHook(() => useNow(30_000))
    expect(result.current.getTime()).toBe(startTime.getTime())

    // Advance fake timers by 30 seconds
    act(() => {
      jest.advanceTimersByTime(30_000)
    })

    expect(result.current.getTime()).toBe(startTime.getTime() + 30_000)
  })

  it('cleans up interval on unmount so closed pages stop ticking', () => {
    const clearIntervalSpy = jest.spyOn(global, 'clearInterval')
    const { unmount } = renderHook(() => useNow(30_000))

    unmount()
    expect(clearIntervalSpy).toHaveBeenCalled()
    clearIntervalSpy.mockRestore()
  })
})
