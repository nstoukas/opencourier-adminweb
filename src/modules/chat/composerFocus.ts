// The Message button on a courier's or a restaurant's page opens their thread ready to write (AC-15):
// it leaves a note here, and the conversation's message box takes the cursor when it first draws for
// that thread. A note in memory, not in the address, so a reload or a thread opened any other way
// (the inbox, the board) leaves the cursor where it was.
let threadToFocus: string | null = null

export function focusComposerOnOpen(threadId: string): void {
  threadToFocus = threadId
}

// True once for the thread the note names, and the note is spent.
export function takeComposerFocus(threadId: string): boolean {
  if (threadToFocus !== threadId) return false
  threadToFocus = null
  return true
}
