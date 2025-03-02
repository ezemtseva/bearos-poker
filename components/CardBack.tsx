import { useId } from "react"

interface CardBackProps {
  className?: string
}

export default function CardBack({ className = "" }: CardBackProps) {
  const patternId = useId() // Generate a unique ID for each card's pattern

  return (
    <div className={`w-24 h-36 rounded-2xl overflow-hidden border border-white ${className}`}>
      <svg width="100%" height="100%" viewBox="0 0 96 144" preserveAspectRatio="none" className="w-full h-full">
        <defs>
          <pattern id={patternId} width="12" height="12" patternUnits="userSpaceOnUse">
            <path d="M0 6 L6 0 L12 6 L6 12 Z" fill="none" stroke="rgba(255, 255, 255, 0.3)" strokeWidth="0.5" />
          </pattern>
        </defs>
        <clipPath id="rounded-corners">
          <rect x="1" y="1" width="94" height="142" rx="7" ry="7" />
        </clipPath>
        <rect x="1" y="1" width="94" height="142" fill="black" clipPath="url(#rounded-corners)" />
        <rect x="1" y="1" width="94" height="142" fill={`url(#${patternId})`} clipPath="url(#rounded-corners)" />
      </svg>
    </div>
  )
}

