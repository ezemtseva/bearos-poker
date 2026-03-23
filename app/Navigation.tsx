"use client"

import Link from "next/link"
import Image from "next/image"
import dynamic from "next/dynamic"
import { usePathname } from "next/navigation"
import { useLocale } from "@/lib/locale-context"

const SoundToggle = dynamic(() => import("@/components/SoundToggle"), { ssr: false })
const SettingsPanel = dynamic(() => import("@/components/SettingsPanel"), { ssr: false })
const UserMenu = dynamic(() => import("@/components/UserMenu"), { ssr: false })

export default function Navigation() {
  const pathname = usePathname()
  const { t } = useLocale()

  return (
    <nav className="bg-black/80 text-white p-4 fixed top-0 left-0 right-0 z-10 backdrop-blur-sm">
      <div className="w-full grid grid-cols-3 items-center">
        {/* Left */}
        <div className="flex items-center">
          <Link
            href="/how-to-play"
            className={`hover:text-gray-300 text-sm ${pathname === "/how-to-play" ? "underline font-semibold" : ""}`}
          >
            {t("howToPlay")}
          </Link>
        </div>

        {/* Center */}
        <div className="flex justify-center">
          <Link href="/" className="flex items-center gap-2 font-bold" style={{ fontSize: "17.5px" }}>
            <Image src="/logo.png" alt="Bearos Poker Logo" width={36} height={36} />
            Bearos Poker
          </Link>
        </div>

        {/* Right */}
        <div className="flex items-center justify-end space-x-3">
          <SoundToggle />
          <SettingsPanel />
          <UserMenu />
        </div>
      </div>
    </nav>
  )
}

