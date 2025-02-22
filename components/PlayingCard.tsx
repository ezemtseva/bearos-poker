interface PlayingCardProps {
    suit: "spades" | "hearts" | "diamonds" | "clubs"
    value: number
    onClick?: () => void
    disabled?: boolean
  }
  
  const SuitSymbol = ({ suit, className = "" }: { suit: string; className?: string }) => {
    // Simplified, clean SVG paths matching the design
    const symbols = {
      hearts: (
        <path
          d="M12 4.248c-3.148-5.402-12-3.825-12 2.944 0 4.661 5.571 9.427 12 15.808 6.43-6.381 12-11.147 12-15.808 0-6.792-8.875-8.306-12-2.944z"
          fill="currentColor"
        />
      ),
      diamonds: <path d="M12 2L2 12L12 22L22 12L12 2Z" fill="currentColor" />,
      spades: (
        <path
          d="M12 2L3 13C3 16.5 5.5 18 7.5 18C8.5 18 9 17.5 10 17.5C11 17.5 11.5 18 12.5 18C14.5 18 17 16.5 17 13L12 2Z"
          fill="currentColor"
        />
      ),
      clubs: (
        <path
          d="M12 2C9.7 2 8 3.7 8 6.5C8 7.7 8.5 8.9 9.3 9.7C7.4 10.5 6 12.3 6 14.5C6 17.5 8.5 20 12 20C15.5 20 18 17.5 18 14.5C18 12.3 16.6 10.5 14.7 9.7C15.5 8.9 16 7.7 16 6.5C16 3.7 14.3 2 12 2Z"
          fill="currentColor"
        />
      ),
    }
  
    return (
      <svg viewBox="0 0 24 24" className={className}>
        <defs>
          <linearGradient id={`${suit}Gradient`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style={{ stopColor: "currentColor", stopOpacity: 1 }} />
            <stop offset="100%" style={{ stopColor: "currentColor", stopOpacity: 0.7 }} />
          </linearGradient>
        </defs>
        <g style={{ fill: `url(#${suit}Gradient)` }}>{symbols[suit as keyof typeof symbols]}</g>
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
        className={`relative w-[80px] h-[120px] bg-gradient-to-br from-white to-gray-50
          rounded-xl shadow-[2px_2px_8px_rgba(0,0,0,0.1)] transition-all duration-200
          ${disabled ? "opacity-100" : "hover:shadow-[3px_3px_12px_rgba(0,0,0,0.15)] hover:-translate-y-1"} 
          border border-gray-100`}
        aria-label={`${displayValue} of ${suit}`}
      >
        {/* Top left value and symbol */}
        <div className="absolute top-3 left-3 flex flex-col items-start">
          <span
            className={`text-2xl font-bold leading-none mb-0.5 
              ${isRed ? "text-red-500" : "text-black"}`}
          >
            {displayValue}
          </span>
          <SuitSymbol suit={suit} className={`w-4 h-4 ${isRed ? "text-red-500" : "text-black"}`} />
        </div>
  
        {/* Bottom right value and symbol (rotated) */}
        <div className="absolute bottom-3 right-3 flex flex-col items-end rotate-180">
          <span
            className={`text-2xl font-bold leading-none mb-0.5
              ${isRed ? "text-red-500" : "text-black"}`}
          >
            {displayValue}
          </span>
          <SuitSymbol suit={suit} className={`w-4 h-4 ${isRed ? "text-red-500" : "text-black"}`} />
        </div>
  
        {/* Center symbol */}
        <div className="absolute inset-0 flex items-center justify-center p-4">
          <SuitSymbol suit={suit} className={`w-full h-full ${isRed ? "text-red-500" : "text-black"}`} />
        </div>
      </button>
    )
  }
  
  