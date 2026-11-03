// utils/sound.ts
//
// Web Audio based player. Mobile Safari only lets an HTMLAudioElement play if
// that element was started inside a user gesture, and our sounds are triggered
// by game state updates, not taps. A single AudioContext created and resumed
// inside the first tap stays unlocked for every sound after that.

type SoundName = 'playCard' | 'placeBet' | 'gameStart' | 'roundEnd' | 'gameOver'

const SOUND_PATHS: Record<SoundName, string> = {
  playCard: '/sounds/play-card.mp3',
  placeBet: '/sounds/place-bet.mp3',
  gameStart: '/sounds/game-start.mp3',
  roundEnd: '/sounds/round-end.mp3',
  gameOver: '/sounds/game-over.mp3',
}

// Events that count as a user activation on iOS (touchstart/pointerdown from touch do not)
const UNLOCK_EVENTS = ['touchend', 'pointerup', 'click', 'keydown'] as const

class SoundManager {
  private ctx: AudioContext | null = null
  private gain: GainNode | null = null
  private buffers = new Map<string, Promise<AudioBuffer | null>>()
  private files = new Map<string, Promise<ArrayBuffer | null>>()
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

    // Download now; decoding needs the context, which only exists after the first tap
    Object.values(SOUND_PATHS).forEach((path) => this.fetchFile(path))

    // Runs on every gesture until the context is running: iOS suspends/interrupts it
    // again after calls, backgrounding or locking the screen.
    const unlock = () => {
      if (!this.ctx) {
        // iOS 17+: play as media so the silent switch doesn't mute game sounds.
        // Must be set before the context starts.
        try {
          const session = (navigator as unknown as { audioSession?: { type: string } }).audioSession
          if (session) session.type = 'playback'
        } catch {}
        // Created inside the gesture: a context made before any tap may never unlock on iOS
        this.ctx = new Ctx()
        this.gain = this.ctx.createGain()
        this.gain.gain.value = this.volume
        this.gain.connect(this.ctx.destination)
        Object.values(SOUND_PATHS).forEach((path) => this.load(path))
      }
      const ctx = this.ctx
      if (ctx.state === 'running') return
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
  }

  private fetchFile(path: string): Promise<ArrayBuffer | null> {
    let file = this.files.get(path)
    if (!file) {
      file = fetch(path)
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`)
          return res.arrayBuffer()
        })
        .catch((err) => {
          console.warn(`SoundManager: Failed to load sound ${path}`, err)
          this.files.delete(path)
          return null
        })
      this.files.set(path, file)
    }
    return file
  }

  private load(path: string): Promise<AudioBuffer | null> {
    const ctx = this.ctx
    if (!ctx) return Promise.resolve(null)
    let buffer = this.buffers.get(path)
    if (!buffer) {
      buffer = this.fetchFile(path)
        // decodeAudioData detaches the ArrayBuffer, so decode a copy; the download stays reusable
        .then((data) => {
          if (!data) throw new Error('no data')
          // Callback form: older Safari's decodeAudioData doesn't return a promise
          return new Promise<AudioBuffer>((resolve, reject) => ctx.decodeAudioData(data.slice(0), resolve, reject))
        })
        .catch((err) => {
          console.warn(`SoundManager: Failed to decode sound ${path}`, err)
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
