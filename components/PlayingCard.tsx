import CardBack from "./CardBack"

interface PlayingCardProps {
  suit: "spades" | "hearts" | "diamonds" | "clubs"
  value: number
  onClick?: () => void
  disabled?: boolean
  className?: string
  showBack?: boolean
}

const SuitSymbol = ({ suit, className = "" }: { suit: string; className?: string }) => {
  const symbols = {
    hearts: (
      <path
        d="M12 19.5l-1.15-1.05C6.4 14.3 3.5 11.7 3.5 8.9 3.5 6.4 5.4 4.5 7.8 4.5c1.5 0 2.94.7 4.2 1.8 1.26-1.1 2.7-1.8 4.2-1.8 2.4 0 4.3 1.9 4.3 4.4 0 2.8-2.9 5.4-7.35 9.55L12 19.5z"
        fill="currentColor"
      />
    ),
    diamonds: <path d="M12 3L20 12L12 21L4 12L12 3Z" fill="currentColor" />,
    spades: (
      <path
        d="M12 5l1 0.9C16.8 9.4 19.5 11.7 19.5 14.2 19.5 16.4 17.8 18 15.8 18c-1.3 0-2.6-0.6-3.8-1.6-1.2 1-2.5 1.6-3.8 1.6-2 0-3.7-1.6-3.7-3.8 0-2.4 2.4-4.6 6.1-8.1L12 5ZM12 16.5L13.8 19.5H10.2L12 16.5Z"
        fill="currentColor"
      />
    ),
    clubs: (
      <path
        d="M12 13C9.8 13 8 11.2 8 9C8 6.8 9.8 5 12 5C14.2 5 16 6.8 16 9C16 11.2 14.2 13 12 13ZM17 19C14.8 19 13 17.2 13 15C13 12.8 14.8 11 17 11C19.2 11 21 12.8 21 15C21 17.2 19.2 19 17 19ZM12 17C10 17 8.5 15.2 8.5 13C8.5 10.8 10 9 12 9C14 9 15.5 10.8 15.5 13C15.5 15.2 14 17 12 17ZM7 19C4.8 19 3 17.2 3 15C3 12.8 4.8 11 7 11C9.2 11 11 12.8 11 15C11 17.2 9.2 19 7 19ZM12 16.5L14.5 21H9.5L12 16.5Z"
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

export default function PlayingCard({
  suit,
  value,
  onClick,
  disabled = false,
  className = "",
  showBack = false,
}: PlayingCardProps) {
  if (showBack) {
    return <CardBack className={className} />
  }

  const isRed = suit === "hearts" || suit === "diamonds"
  const displayValue = valueToDisplay(value)

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`relative w-24 h-36 rounded-2xl shadow-md transition-transform 
        ${disabled ? "opacity-100" : "hover:scale-105 hover:shadow-lg"} 
        ${suit === "diamonds" ? "bg-red-100" : "bg-white"}
        border border-gray-300 overflow-hidden ${className}`}
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

