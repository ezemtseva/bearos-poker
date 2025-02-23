interface PlayingCardProps {
  suit: "spades" | "hearts" | "diamonds" | "clubs"
  value: number
  onClick?: () => void
  disabled?: boolean
}

const SuitSymbol = ({ suit, className = "" }: { suit: string; className?: string }) => {
  // SVG paths for each suit
  const symbols = {
    hearts: (
      <path
        d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
        fill="currentColor"
      />
    ),
    diamonds: <path d="M12 2L22 12L12 22L2 12L12 2Z" fill="currentColor" />,
    spades: (
      <path
        d="M12 2L19 12C19 15.5 16.5 17 14.5 17C13.5 17 13 16.5 12 16.5C11 16.5 10.5 17 9.5 17C7.5 17 5 15.5 5 12L12 2ZM11 17.5V21H13V17.5"
        fill="currentColor"
      />
    ),
    clubs: (
      <path
        d="M12 2C14.3 2 16 4 16 6.5C16 7.7 15.5 8.9 14.7 9.7C16.6 10.5 18 12.3 18 14.5C18 17.5 15.5 20 12 20C8.5 20 6 17.5 6 14.5C6 12.3 7.4 10.5 9.3 9.7C8.5 8.9 8 7.7 8 6.5C8 4 9.7 2 12 2Z"
        fill="currentColor"
      />
    ),
  }

  return (
    <svg viewBox="0 0 24 24" className={className} style={{ overflow: "visible" }}>
      {symbols[suit as keyof typeof symbols]}
    </svg>
  )
}

const valueToDisplay = (value: number): string => {
  switch (value) {
    case 14:
      return "A"
    case 13:
      return "K"
    case 12:
      return "Q"
    case 11:
      return "J"
    default:
      return value.toString()
  }
}

export default function PlayingCard({ suit, value, onClick, disabled = false }: PlayingCardProps) {
  const isRed = suit === "hearts" || suit === "diamonds"
  const displayValue = valueToDisplay(value)

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`relative w-24 h-36 rounded-2xl shadow-md transition-transform 
  ${disabled ? "opacity-100" : "hover:scale-105 hover:shadow-lg"} 
  border border-gray-300 overflow-hidden`}
      aria-label={`${displayValue} of ${suit}`}
    >
      {/* Card corners */}
      <div className="absolute top-2 left-2 flex flex-col items-center">
        <span className={`text-xl font-bold ${isRed ? "text-red-600" : "text-black"}`}>{displayValue}</span>
        <SuitSymbol suit={suit} className={`w-4 h-4 ${isRed ? "text-red-600" : "text-black"}`} />
      </div>

      <div className="absolute bottom-2 right-2 flex flex-col items-center rotate-180">
        <span className={`text-xl font-bold ${isRed ? "text-red-600" : "text-black"}`}>{displayValue}</span>
        <SuitSymbol suit={suit} className={`w-4 h-4 ${isRed ? "text-red-600" : "text-black"}`} />
      </div>

      {/* Center symbol */}
      <div className="absolute inset-0 flex items-center justify-center">
        <SuitSymbol suit={suit} className={`w-16 h-16 ${isRed ? "text-red-600" : "text-black"}`} />
      </div>
    </button>
  )
}

