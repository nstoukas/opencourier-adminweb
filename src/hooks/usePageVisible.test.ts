import { renderHook, act } from '@testing-library/react'
import { usePageVisible } from './usePageVisible'

describe('usePageVisible hook (spec 0002, review fix F6, decision 61.52)', () => {
  let visibilityStateGetter: jest.SpyInstance<DocumentVisibilityState, []> | undefined

  afterEach(() => {
    visibilityStateGetter?.mockRestore()
    visibilityStateGetter = undefined
  })

  it('returns true initially when document.visibilityState is "visible"', () => {
    visibilityStateGetter = jest.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible')
    const { result } = renderHook(() => usePageVisible())
    expect(result.current).toBe(true)
  })

  it('returns false initially when document.visibilityState is "hidden"', () => {
    visibilityStateGetter = jest.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden')
    const { result } = renderHook(() => usePageVisible())
    expect(result.current).toBe(false)
  })

  it('updates state when visibilitychange event is dispatched with document.visibilityState mocked (F6)', () => {
    let mockState: DocumentVisibilityState = 'visible'
    visibilityStateGetter = jest.spyOn(document, 'visibilityState', 'get').mockImplementation(() => mockState)

    const { result } = renderHook(() => usePageVisible())
    expect(result.current).toBe(true)

    // Tab transitions to background
    act(() => {
      mockState = 'hidden'
      document.dispatchEvent(new Event('visibilitychange'))
    })
    expect(result.current).toBe(false)

    // Tab transitions back to foreground
    act(() => {
      mockState = 'visible'
      document.dispatchEvent(new Event('visibilitychange'))
    })
    expect(result.current).toBe(true)
  })

  it('removes visibilitychange event listener on unmount', () => {
    const removeEventListenerSpy = jest.spyOn(document, 'removeEventListener')
    const { unmount } = renderHook(() => usePageVisible())

    unmount()
    expect(removeEventListenerSpy).toHaveBeenCalledWith('visibilitychange', expect.any(Function))
    removeEventListenerSpy.mockRestore()
  })
})
