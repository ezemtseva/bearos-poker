"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import dynamic from "next/dynamic"
import { useLocale } from "@/lib/locale-context"

const SoundToggle = dynamic(() => import("@/components/SoundToggle"), { ssr: false })
const SettingsPanel = dynamic(() => import("@/components/SettingsPanel"), { ssr: false })
const UserMenu = dynamic(() => import("@/components/UserMenu"), { ssr: false })

export function LogoMark({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2C9 6 4 9 4 13.5A4 4 0 0 0 11 16l-1.5 5h5L13 16a4 4 0 0 0 7-2.5C20 9 15 6 12 2z" fill="#0B0C0F" />
    </svg>
  )
}

export default function Navigation() {
  const { t } = useLocale()
  // On the game screen the header center holds the game info chips
  const isGame = usePathname()?.startsWith("/game/")

  return (
    <nav className="fixed top-0 left-0 right-0 z-10 h-[var(--header-h)] bg-bp-bg/85 backdrop-blur-md border-b border-bp-border text-bp-text">
      <div className="relative h-full max-w-[1440px] mx-auto px-4 md:px-8 flex items-center justify-between gap-4">
        {/* Left: logo */}
        <Link href="/" aria-label={t("appName")} className="flex items-center gap-3 text-bp-text">
          <span className="w-10 h-10 rounded-xl bg-bp-accent flex items-center justify-center flex-shrink-0">
            <LogoMark />
          </span>
          <span className={`hidden ${isGame ? "xl:inline" : "md:inline"} font-display font-bold text-[17px] tracking-[-0.01em]`}>{t("appName")}</span>
        </Link>

        {/* Right */}
        <div className="flex items-center gap-1.5 md:gap-2">
          <SoundToggle />
          <SettingsPanel />
          <UserMenu />
        </div>
      </div>
    </nav>
  )
}
