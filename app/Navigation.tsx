"use client"

import Link from "next/link"
import Image from "next/image"
import dynamic from "next/dynamic"
import { usePathname } from "next/navigation"

const SoundToggle = dynamic(() => import("@/components/SoundToggle"), { ssr: false })
const SettingsPanel = dynamic(() => import("@/components/SettingsPanel"), { ssr: false })

export default function Navigation() {
  const pathname = usePathname()

  return (
    <nav className="bg-black/80 text-white p-4 fixed top-0 left-0 right-0 z-10 backdrop-blur-sm">
      <div className="w-full flex justify-between items-center">
        <Link href="/" className="flex items-center gap-2 font-bold" style={{ fontSize: "17.5px" }}>
          <Image src="/logo.png" alt="Bearos Poker Logo" width={36} height={36} />
          Bearos Poker
        </Link>
        <div className="flex items-center space-x-6">
          <Link
            href="/how-to-play"
            className={`hover:text-gray-300 ${pathname === "/how-to-play" ? "underline font-semibold" : ""}`}
          >
            How to Play
          </Link>
          <SoundToggle />
          <SettingsPanel />
        </div>
      </div>
    </nav>
  )
}

