interface PlayingCardProps {
    suit: "spades" | "hearts" | "diamonds" | "clubs"
    value: number
    onClick?: () => void
    disabled?: boolean
  }
  
  const SuitSymbol = ({ suit, className = "" }: { suit: string; className?: string }) => {
    // Enhanced SVG paths with more detailed shapes
    const symbols = {
      hearts: (
        <g>
          <defs>
            <linearGradient id="heartGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style={{ stopColor: "#ff3b30", stopOpacity: 1 }} />
              <stop offset="100%" style={{ stopColor: "#dc2626", stopOpacity: 1 }} />
            </linearGradient>
            <filter id="heartShadow">
              <feGaussianBlur in="SourceAlpha" stdDeviation="1" />
              <feOffset dx="0" dy="1" result="offsetblur" />
              <feFlood floodColor="#00000033" />
              <feComposite in2="offsetblur" operator="in" />
              <feMerge>
                <feMergeNode />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <path
            d="M11.995 7.23319C12.3779 6.78657 12.7931 6.3643 13.2497 5.97638C14.3132 5.06804 15.3356 4.47516 16.3169 4.19775C18.7595 3.49361 20.8293 4.95188 21.7137 6.45284C23.0293 8.72635 22.9554 11.4768 21.5015 13.6553C20.6156 14.9846 19.4701 16.0828 18.2582 17.1004C16.9266 18.2235 15.5566 19.2959 14.1902 20.3732C13.5112 20.9075 12.8165 21.4168 12.0989 21.9057C12.0657 21.9293 12.0303 21.9507 11.9929 21.9697C11.9554 21.9507 11.92 21.9293 11.8869 21.9057C11.1692 21.4168 10.4745 20.9075 9.79555 20.3732C8.42915 19.2959 7.05915 18.2235 5.72749 17.1004C4.51555 16.0828 3.37009 14.9846 2.48422 13.6553C1.03032 11.4768 0.956421 8.72635 2.27196 6.45284C3.15642 4.95188 5.22622 3.49361 7.66879 4.19775C8.65009 4.47516 9.67249 5.06804 10.736 5.97638C11.1926 6.3643 11.6078 6.78657 11.9907 7.23319L11.995 7.23319Z"
            fill="url(#heartGradient)"
            filter="url(#heartShadow)"
          />
        </g>
      ),
      diamonds: (
        <g>
          <defs>
            <linearGradient id="diamondGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style={{ stopColor: "#ff3b30", stopOpacity: 1 }} />
              <stop offset="100%" style={{ stopColor: "#dc2626", stopOpacity: 1 }} />
            </linearGradient>
            <filter id="diamondShadow">
              <feGaussianBlur in="SourceAlpha" stdDeviation="1" />
              <feOffset dx="0" dy="1" result="offsetblur" />
              <feFlood floodColor="#00000033" />
              <feComposite in2="offsetblur" operator="in" />
              <feMerge>
                <feMergeNode />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <path d="M12 2L22 12L12 22L2 12L12 2Z" fill="url(#diamondGradient)" filter="url(#diamondShadow)" />
        </g>
      ),
      spades: (
        <g>
          <defs>
            <linearGradient id="spadeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style={{ stopColor: "#1a1a1a", stopOpacity: 1 }} />
              <stop offset="100%" style={{ stopColor: "#000000", stopOpacity: 1 }} />
            </linearGradient>
            <filter id="spadeShadow">
              <feGaussianBlur in="SourceAlpha" stdDeviation="1" />
              <feOffset dx="0" dy="1" result="offsetblur" />
              <feFlood floodColor="#00000033" />
              <feComposite in2="offsetblur" operator="in" />
              <feMerge>
                <feMergeNode />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <path
            d="M12 2L3 13C3 16.5 5.5 18 7.5 18C8.5 18 9 17.5 10 17.5C11 17.5 11.5 18 12.5 18C14.5 18 17 16.5 17 13L12 2Z"
            fill="url(#spadeGradient)"
            filter="url(#spadeShadow)"
          />
        </g>
      ),
      clubs: (
        <g>
          <defs>
            <linearGradient id="clubGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style={{ stopColor: "#1a1a1a", stopOpacity: 1 }} />
              <stop offset="100%" style={{ stopColor: "#000000", stopOpacity: 1 }} />
            </linearGradient>
            <filter id="clubShadow">
              <feGaussianBlur in="SourceAlpha" stdDeviation="1" />
              <feOffset dx="0" dy="1" result="offsetblur" />
              <feFlood floodColor="#00000033" />
              <feComposite in2="offsetblur" operator="in" />
              <feMerge>
                <feMergeNode />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <path
            d="M12 2C14.3 2 16 4 16 6.5C16 7.7 15.5 8.9 14.7 9.7C16.6 10.5 18 12.3 18 14.5C18 17.5 15.5 20 12 20C8.5 20 6 17.5 6 14.5C6 12.3 7.4 10.5 9.3 9.7C8.5 8.9 8 7.7 8 6.5C8 4 9.7 2 12 2Z"
            fill="url(#clubGradient)"
            filter="url(#clubShadow)"
          />
        </g>
      ),
    }
  
    return (
      <svg viewBox="0 0 24 24" className={className}>
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
        className={`relative w-[80px] h-[120px] bg-gradient-to-br from-white to-gray-50
          rounded-xl shadow-[2px_2px_12px_rgba(0,0,0,0.1)] transition-all duration-200
          ${disabled ? "opacity-100" : "hover:shadow-[3px_3px_16px_rgba(0,0,0,0.15)] hover:-translate-y-1"} 
          border border-gray-100`}
        aria-label={`${displayValue} of ${suit}`}
      >
        {/* Top left value and symbol */}
        <div className="absolute top-3 left-3 flex flex-col items-start">
          <span
            className={`font-serif text-2xl font-bold leading-none mb-0.5 
              ${isRed ? "text-[#ff3b30]" : "text-black"}`}
          >
            {displayValue}
          </span>
          <SuitSymbol suit={suit} className="w-4 h-4" />
        </div>
  
        {/* Bottom right value and symbol (rotated) */}
        <div className="absolute bottom-3 right-3 flex flex-col items-end rotate-180">
          <span
            className={`font-serif text-2xl font-bold leading-none mb-0.5
              ${isRed ? "text-[#ff3b30]" : "text-black"}`}
          >
            {displayValue}
          </span>
          <SuitSymbol suit={suit} className="w-4 h-4" />
        </div>
  
        {/* Center symbol */}
        <div className="absolute inset-0 flex items-center justify-center p-6">
          <SuitSymbol suit={suit} className="w-full h-full" />
        </div>
      </button>
    )
  }
  
  