// Sound utility for playing game sounds
class SoundManager {
    private sounds: { [key: string]: HTMLAudioElement } = {}
    private muted = false
    private volume = 0.5 // Default volume at 50%
  
    constructor() {
      // Initialize sounds when in browser environment
      if (typeof window !== "undefined") {
        this.preloadSounds()
  
        // Try to load preferences from localStorage
        const savedMuted = localStorage.getItem("bearos-poker-muted")
        const savedVolume = localStorage.getItem("bearos-poker-volume")
  
        if (savedMuted !== null) {
          this.muted = savedMuted === "true"
        }
  
        if (savedVolume !== null) {
          this.volume = Number.parseFloat(savedVolume)
        }
      }
    }
  
    private preloadSounds() {
      // Define all game sounds here
      const soundFiles = {
        dealCard: "/sounds/deal-card.mp3",
        playCard: "/sounds/play-card.mp3",
        winTrick: "/sounds/win-trick.mp3",
        placeBet: "/sounds/place-bet.mp3",
        gameStart: "/sounds/game-start.mp3",
        roundEnd: "/sounds/round-end.mp3",
        gameOver: "/sounds/game-over.mp3",
        error: "/sounds/error.mp3",
        specialCard: "/sounds/special-card.mp3",
        // Add the new sound files for 7 of spades options
        specialCardTrumps: "/sounds/special-card-trumps.mp3",
        specialCardPoker: "/sounds/special-card-poker.mp3",
        specialCardSimple: "/sounds/special-card-simple.mp3",
      }
  
      // Preload all sounds
      Object.entries(soundFiles).forEach(([name, path]) => {
        const audio = new Audio(path)
        audio.preload = "auto"
        this.sounds[name] = audio
      })
    }
  
    play(soundName: string) {
      if (this.muted || typeof window === "undefined" || this.volume === 0) return
  
      const sound = this.sounds[soundName]
      if (sound) {
        // Create a clone to allow overlapping sounds
        const soundClone = sound.cloneNode() as HTMLAudioElement
        soundClone.volume = this.volume // Use the current volume setting
        soundClone.play().catch((err) => {
          console.warn(`Failed to play sound: ${soundName}`, err)
        })
      } else {
        console.warn(`Sound not found: ${soundName}`)
      }
    }
  
    setMuted(muted: boolean) {
      this.muted = muted
      if (typeof window !== "undefined") {
        localStorage.setItem("bearos-poker-muted", muted.toString())
      }
    }
  
    isMuted() {
      return this.muted
    }
  
    setVolume(volume: number) {
      this.volume = volume
      if (typeof window !== "undefined") {
        localStorage.setItem("bearos-poker-volume", volume.toString())
      }
    }
  
    getVolume() {
      return this.volume
    }
  }
  
  // Create a singleton instance
  const soundManager = new SoundManager()
  export default soundManager
  
  