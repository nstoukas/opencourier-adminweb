import { useEffect, useState } from 'react'

// The current time, refreshed every `intervalMs`, so a "2 min" on screen keeps ageing without
// a reload. `useState(() => new Date())` takes a function so the first time is read once, on
// the first render, not again on every render.
export function useNow(intervalMs = 30_000): Date {
  const [now, setNow] = useState(() => new Date())
  // useEffect runs after React draws the page; the function it returns runs when the component
  // leaves the page, which stops the timer so it never ticks for a page nobody is looking at.
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), intervalMs)
    return () => clearInterval(timer)
  }, [intervalMs])
  return now
}
