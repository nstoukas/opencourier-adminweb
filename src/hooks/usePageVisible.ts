import { useEffect, useState } from 'react'

// True while this browser tab is in front, false while it sits in the background (another
// tab, a minimised window). The 30 s polling queries pass `pollingInterval: 0` when this is
// false, which RTK Query reads as "do not poll", so a tab left open all shift stops asking the
// backend for nobody. (RTK Query 2 has a `skipPollingIfUnfocused` option for this; the 1.9
// installed here does not, hence this hook.)
export function usePageVisible(): boolean {
  // `typeof document` guards the server render, where there is no page to be hidden.
  const [visible, setVisible] = useState(() =>
    typeof document === 'undefined' ? true : document.visibilityState === 'visible'
  )
  // The browser fires "visibilitychange" whenever the tab goes to the background or comes back.
  useEffect(() => {
    const onChange = () => setVisible(document.visibilityState === 'visible')
    document.addEventListener('visibilitychange', onChange)
    return () => document.removeEventListener('visibilitychange', onChange)
  }, [])
  return visible
}
