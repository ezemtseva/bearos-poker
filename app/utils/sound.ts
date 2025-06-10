// utils/sound.ts

type SoundName = 'playCard' | 'placeBet' | 'gameStart' | 'roundEnd' | 'gameOver'

class SoundManager {
  private sounds: Record<SoundName, HTMLAudioElement[]> = {
    playCard: [],
    placeBet: [],
    gameStart: [],
    roundEnd: [],
    gameOver: [],
  }

  private muted = false
  private volume = 0.5
  private poolSize = 3

  constructor() {
    if (typeof window !== 'undefined') {
      this.loadSettings()
      this.setupUserInteractionUnlock()
      this.preloadEssentialSounds()
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

  private setupUserInteractionUnlock() {
    document.addEventListener(
      'click',
      () => {
        Object.values(this.sounds).flat().forEach((audio) => {
          try {
            audio.load()
          } catch {}
        })
      },
      { once: true },
    )
  }

  private preloadEssentialSounds() {
    const soundPaths: Record<SoundName, string> = {
      playCard: '/sounds/play-card.mp3',
      placeBet: '/sounds/place-bet.mp3',
      gameStart: '/sounds/game-start.mp3',
      roundEnd: '/sounds/round-end.mp3',
      gameOver: '/sounds/game-over.mp3',
    }

    Object.entries(soundPaths).forEach(([name, path]) => {
      const audioPool: HTMLAudioElement[] = []
      for (let i = 0; i < this.poolSize; i++) {
        const audio = new Audio(path)
        audio.preload = 'auto'
        audio.volume = this.volume
        audio.addEventListener('error', (e) => {
          console.warn(`SoundManager: Failed to load sound ${name}`, e)
        })
        audioPool.push(audio)
      }
      this.sounds[name as SoundName] = audioPool
    })
  }

  play(soundName: SoundName) {
    if (this.muted || typeof window === 'undefined' || this.volume === 0) return

    const pool = this.sounds[soundName]
    if (!pool) return

    const available = pool.find((audio) => audio.paused)
    if (available) {
      available.currentTime = 0
      available.volume = this.volume
      available.play().catch((err) => {
        console.warn(`SoundManager: Failed to play sound ${soundName}`, err)
      })
    }
  }

  setMuted(muted: boolean) {
    this.muted = muted
    try {
      localStorage.setItem('bearos-poker-muted', muted.toString())
    } catch {}
  }

  isMuted() {
    return this.muted
  }

  setVolume(volume: number) {
    this.volume = volume
    try {
      localStorage.setItem('bearos-poker-volume', volume.toString())
    } catch {}
    Object.values(this.sounds).flat().forEach((a) => (a.volume = volume))
  }

  getVolume() {
    return this.volume
  }
}

const soundManager = new SoundManager()
export default soundManager
