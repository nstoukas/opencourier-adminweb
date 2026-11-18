import { focusComposerOnOpen, takeComposerFocus } from './composerFocus'

describe('composerFocus (AC-15, verify fixes 2026-11-18)', () => {
  it('returns false when no focus was requested', () => {
    expect(takeComposerFocus('thread-xyz')).toBe(false)
  })

  it('records focus request and returns true exactly once for the matching thread, then is spent', () => {
    focusComposerOnOpen('thread-123')

    // Different thread gets false and does NOT spend the note
    expect(takeComposerFocus('thread-456')).toBe(false)

    // Matching thread gets true and spends the note
    expect(takeComposerFocus('thread-123')).toBe(true)

    // Second call for the matching thread returns false (spent)
    expect(takeComposerFocus('thread-123')).toBe(false)
  })
})
