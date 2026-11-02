// Bearos Poker logo — same artwork as /bearos-poker-logo.svg (lime tile, spade, lime 7)
export default function Logo({ size = 40, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 240 240" className={`flex-shrink-0 ${className}`} role="img" aria-label="Bearos Poker">
      <rect width="240" height="240" rx="72" fill="#D7FF3F" />
      <g transform="translate(30 30) scale(7.5)">
        <path d="M12 2C9 6 4 9 4 13.5A4 4 0 0 0 11 16l-1.5 5h5L13 16a4 4 0 0 0 7-2.5C20 9 15 6 12 2z" fill="#0B0C0F" />
        <path d="M5.9 6.3H18.1L5.9 23.3" fill="none" stroke="#D7FF3F" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </svg>
  )
}
