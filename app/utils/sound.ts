// utils/sound.ts
//
// Web Audio based player. Mobile Safari only lets an HTMLAudioElement play if
// that element was started inside a user gesture, and our sounds are triggered
// by game state updates, not taps. A single AudioContext resumed on the first
// tap stays unlocked for every sound after that.

type SoundName = 'playCard' | 'placeBet' | 'gameStart' | 'roundEnd' | 'gameOver'

const SOUND_PATHS: Record<SoundName, string> = {
  playCard: '/sounds/play-card.mp3',
  placeBet: '/sounds/place-bet.mp3',
  gameStart: '/sounds/game-start.mp3',
  roundEnd: '/sounds/round-end.mp3',
  gameOver: '/sounds/game-over.mp3',
}

const UNLOCK_EVENTS = ['pointerdown', 'touchend', 'click', 'keydown'] as const

class SoundManager {
  private ctx: AudioContext | null = null
  private gain: GainNode | null = null
  private buffers = new Map<string, Promise<AudioBuffer | null>>()
  private playing = new Map<string, Set<AudioBufferSourceNode>>()

  private muted = false
  private volume = 0.5

  constructor() {
    if (typeof window !== 'undefined') {
      this.loadSettings()
      this.setupContext()
    }
  }

  private loadSettings() {
    try {
      const savedMuted = localStorage.getItem('bearos-poker-muted')
      const savedVolume = localStorage.getItem('bearos-poker-volume')
      if (savedMuted !== null) this.muted = savedMuted === 'true'
      if (savedVolume !== null) this.volume = parseFloat(savedVolume)
    } catch (e) {
      console.warn('SoundManager: Unable to access localStorage', e)
    }
  }

  private setupContext() {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctx) return

    // iOS 17+: play as media so the silent switch doesn't mute game sounds
    try {
      const session = (navigator as unknown as { audioSession?: { type: string } }).audioSession
      if (session) session.type = 'playback'
    } catch {}

    this.ctx = new Ctx()
    this.gain = this.ctx.createGain()
    this.gain.gain.value = this.volume
    this.gain.connect(this.ctx.destination)

    // Resume on every gesture until running: iOS suspends/interrupts the
    // context again after calls, backgrounding or locking the screen.
    const unlock = () => {
      const ctx = this.ctx
      if (!ctx || ctx.state === 'running') return
      ctx.resume().catch(() => {})
      // Silent one-sample buffer: older iOS needs a source started in the gesture
      try {
        const src = ctx.createBufferSource()
        src.buffer = ctx.createBuffer(1, 1, 22050)
        src.connect(ctx.destination)
        src.start(0)
      } catch {}
    }
    UNLOCK_EVENTS.forEach((e) => document.addEventListener(e, unlock, { capture: true, passive: true }))

    Object.values(SOUND_PATHS).forEach((path) => this.load(path))
  }

  private load(path: string): Promise<AudioBuffer | null> {
    let buffer = this.buffers.get(path)
    if (!buffer) {
      buffer = fetch(path)
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`)
          return res.arrayBuffer()
        })
        // Callback form: older Safari's decodeAudioData doesn't return a promise
        .then((data) => new Promise<AudioBuffer>((resolve, reject) => this.ctx!.decodeAudioData(data, resolve, reject)))
        .catch((err) => {
          console.warn(`SoundManager: Failed to load sound ${path}`, err)
          this.buffers.delete(path)
          return null
        })
      this.buffers.set(path, buffer)
    }
    return buffer
  }

  private start(key: string, path: string) {
    if (this.muted || this.volume === 0 || !this.ctx || !this.gain) return
    const ctx = this.ctx
    const gain = this.gain
    if (ctx.state === 'suspended') ctx.resume().catch(() => {})

    this.load(path).then((buffer) => {
      if (!buffer || this.muted) return
      const src = ctx.createBufferSource()
      src.buffer = buffer
      src.connect(gain)
      let set = this.playing.get(key)
      if (!set) this.playing.set(key, (set = new Set()))
      set.add(src)
      src.onended = () => set!.delete(src)
      src.start(0)
    })
  }

  play(soundName: SoundName) {
    this.start(soundName, SOUND_PATHS[soundName])
  }

  playFile(path: string) {
    this.start(path, path)
  }

  stop(soundNameOrPath: SoundName | string) {
    const set = this.playing.get(soundNameOrPath)
    if (!set) return
    set.forEach((src) => {
      try {
        src.stop()
      } catch {}
    })
    set.clear()
  }

  setMuted(muted: boolean) {
    this.muted = muted
    try {
      localStorage.setItem('bearos-poker-muted', muted.toString())
    } catch {}
    if (muted) this.playing.forEach((_, key) => this.stop(key))
  }

  isMuted() {
    return this.muted
  }

  setVolume(volume: number) {
    this.volume = volume
    try {
      localStorage.setItem('bearos-poker-volume', volume.toString())
    } catch {}
    if (this.gain) this.gain.gain.value = volume
  }

  getVolume() {
    return this.volume
  }
}

const soundManager = new SoundManager()
export default soundManager
