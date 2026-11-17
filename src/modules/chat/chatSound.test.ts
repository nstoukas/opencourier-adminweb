import { playSosSound } from '@/modules/sos/sosAlerts'

describe('chatSound (spec 0034, AC-9)', () => {
  let createdOscillators: any[]
  let createdGains: any[]
  let mockDestination: any
  let mockAudioContext: any

  beforeEach(() => {
    jest.clearAllMocks()
    createdOscillators = []
    createdGains = []
    mockDestination = {}

    mockAudioContext = {
      state: 'running',
      currentTime: 100,
      resume: jest.fn().mockResolvedValue(undefined),
      destination: mockDestination,
      createOscillator: jest.fn(() => {
        const osc = {
          type: '',
          frequency: { value: 0, setValueAtTime: jest.fn() },
          connect: jest.fn((dest: any) => dest),
          start: jest.fn(),
          stop: jest.fn(),
        }
        createdOscillators.push(osc)
        return osc
      }),
      createGain: jest.fn(() => {
        const gain = {
          gain: {
            setValueAtTime: jest.fn(),
            linearRampToValueAtTime: jest.fn(),
            exponentialRampToValueAtTime: jest.fn(),
          },
          connect: jest.fn(() => ({
            connect: jest.fn(),
          })),
        }
        createdGains.push(gain)
        return gain
      }),
    }

    ;(window as any).AudioContext = jest.fn(() => mockAudioContext)
  })

  afterEach(() => {
    delete (window as any).AudioContext
  })

  it('plays two soft sine notes [660, 880] once and connects to destination', () => {
    let freshChatSound: typeof import('./chatSound')
    jest.isolateModules(() => {
      freshChatSound = require('./chatSound')
    })
    freshChatSound!.playChatSound()

    // Creates exactly 2 oscillators (notes 660 and 880)
    expect(createdOscillators).toHaveLength(2)
    expect(createdOscillators[0].type).toBe('sine')
    expect(createdOscillators[0].frequency.value).toBe(660)
    expect(createdOscillators[1].type).toBe('sine')
    expect(createdOscillators[1].frequency.value).toBe(880)

    // Connects gain to destination
    expect(createdGains).toHaveLength(2)
    expect(createdGains[0].connect).toHaveBeenCalledWith(mockDestination)
    expect(createdGains[1].connect).toHaveBeenCalledWith(mockDestination)

    // Starts both oscillators
    expect(createdOscillators[0].start).toHaveBeenCalledWith(100)
    expect(createdOscillators[1].start).toHaveBeenCalledWith(100 + 0.12)
  })

  it('chatSound notes and pattern differ from SOS sound (not the same function or pattern)', () => {
    let freshChatSound: typeof import('./chatSound')
    jest.isolateModules(() => {
      freshChatSound = require('./chatSound')
    })

    // Verify that chatSound function is not playSosSound
    expect(freshChatSound!.playChatSound).not.toBe(playSosSound)

    // Chat uses sine wave with 2 ascending notes [660, 880]
    freshChatSound!.playChatSound()
    expect(createdOscillators).toHaveLength(2)
    const chatFrequencies = createdOscillators.map((osc) => osc.frequency.value)
    expect(chatFrequencies).toEqual([660, 880])
    expect(createdOscillators[0].type).toBe('sine')

    // Contrast with SOS alarm which produces square waves with 3 beeps
    createdOscillators.length = 0
    playSosSound()
    expect(createdOscillators).toHaveLength(3)
    expect(createdOscillators[0].type).toBe('square')
  })

  it('does nothing when AudioContext state is not running', () => {
    mockAudioContext.state = 'suspended'
    let freshChatSound: typeof import('./chatSound')
    jest.isolateModules(() => {
      freshChatSound = require('./chatSound')
    })

    freshChatSound!.playChatSound()
    expect(createdOscillators).toHaveLength(0)
  })

  it('listenForChatSoundUnlock registers once-only pointerdown and keydown listeners to resume AudioContext', () => {
    let freshChatSound: typeof import('./chatSound')
    jest.isolateModules(() => {
      freshChatSound = require('./chatSound')
    })

    const addEventListenerSpy = jest.spyOn(document, 'addEventListener')
    freshChatSound!.listenForChatSoundUnlock()

    expect(addEventListenerSpy).toHaveBeenCalledWith('pointerdown', expect.any(Function), { once: true })
    expect(addEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function), { once: true })
  })
})
