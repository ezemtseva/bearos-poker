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
      copy: "/sounds/copy.mp3",
    }

    // Preload all sounds
    Object.entries(soundFiles).forEach(([name, path]) => {
      console.log(`SoundManager: Preloading sound ${name} from ${path}`)
      const audio = new Audio(path)
      audio.preload = "auto"

      // Add event listener to check if the sound loaded successfully
      audio.addEventListener("canplaythrough", () => {
        console.log(`SoundManager: Sound ${name} loaded successfully`)
      })

      audio.addEventListener("error", (e) => {
        console.error(`SoundManager: Error loading sound ${name}:`, e)
      })

      this.sounds[name] = audio
    })
  }

  play(soundName: string) {
    if (this.muted || typeof window === "undefined" || this.volume === 0) {
      console.log(`Sound ${soundName} not played because audio is muted or volume is 0`)
      return
    }

    const sound = this.sounds[soundName]
    if (sound) {
      // Create a clone to allow overlapping sounds
      const soundClone = sound.cloneNode() as HTMLAudioElement
      soundClone.volume = this.volume // Use the current volume setting

      // Add special logging for game-over sound
      if (soundName === "gameOver") {
        console.log("Attempting to play game-over sound with volume:", this.volume)
      }

      // Force load the sound before playing it
      soundClone.load()

      // Use a timeout to ensure the browser has time to load the sound
      setTimeout(() => {
        soundClone.play().catch((err) => {
          console.warn(`Failed to play sound: ${soundName}`, err)

          // Special handling for game-over sound
          if (soundName === "gameOver") {
            console.log("Retrying game-over sound with user interaction simulation")

            // Try again with user interaction simulation
            document.addEventListener(
              "click",
              function playOnClick() {
                soundClone.play().catch((e) => console.warn(`Retry failed: ${e}`))
                document.removeEventListener("click", playOnClick)
              },
              { once: true },
            )
          }
        })
      }, 100)
    } else {
      console.warn(`Sound not found: ${soundName}`)

      // Try to create the sound on-demand if it wasn't preloaded
      if (soundName === "gameOver") {
        console.log("Creating game-over sound on demand")
        const newSound = new Audio("/sounds/game-over.mp3")
        newSound.volume = this.volume
        this.sounds[soundName] = newSound

        setTimeout(() => {
          newSound.play().catch((err) => {
            console.warn(`Failed to play dynamically created sound: ${soundName}`, err)

            // Try again with user interaction
            document.addEventListener(
              "click",
              function playOnClick() {
                newSound.play().catch((e) => console.warn(`Retry failed: ${e}`))
                document.removeEventListener("click", playOnClick)
              },
              { once: true },
            )
          })
        }, 100)
      }
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
