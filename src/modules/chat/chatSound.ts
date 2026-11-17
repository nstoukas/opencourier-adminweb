// Spec 0034 (chat), AC-9: one short, quiet sound for a new message, on any admin page. Made with the
// Web Audio API like the SOS alarm (`sosAlerts.ts`), but deliberately unlike it: two soft low notes
// once, where SOS is three loud high beeps that repeat. Browsers keep a page silent until a click on
// it, so the first click anywhere unlocks this sound; before that a message arrives silently.

let audio: AudioContext | null = null
let unlockListening = false

function audioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  // Read through a looser type: the DOM types say every browser has AudioContext, and old ones do not.
  const Ctx = (window as { AudioContext?: typeof AudioContext }).AudioContext
  if (!Ctx) return null
  if (!audio) audio = new Ctx()
  return audio
}

// Unlocks the sound on the admin's next click or key press anywhere. Called once at startup.
export function listenForChatSoundUnlock(): void {
  if (unlockListening || typeof document === 'undefined') return
  unlockListening = true
  const unlock = () => {
    void audioContext()?.resume().catch(() => undefined)
  }
  document.addEventListener('pointerdown', unlock, { once: true })
  document.addEventListener('keydown', unlock, { once: true })
}

export function playChatSound(): void {
  const ctx = audioContext()
  if (!ctx || ctx.state !== 'running') return
  const notes = [660, 880]
  notes.forEach((frequency, index) => {
    const start = ctx.currentTime + index * 0.12
    const oscillator = ctx.createOscillator()
    const gain = ctx.createGain()
    oscillator.type = 'sine'
    oscillator.frequency.value = frequency
    // Quiet, with a soft start and end so it never clicks.
    gain.gain.setValueAtTime(0, start)
    gain.gain.linearRampToValueAtTime(0.08, start + 0.02)
    gain.gain.linearRampToValueAtTime(0, start + 0.1)
    oscillator.connect(gain)
    gain.connect(ctx.destination)
    oscillator.start(start)
    oscillator.stop(start + 0.11)
  })
}
