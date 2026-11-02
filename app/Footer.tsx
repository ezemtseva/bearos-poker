"use client"

import { usePathname } from "next/navigation"
import { useLocale } from "@/lib/locale-context"

export default function Footer() {
  const { t } = useLocale()
  const pathname = usePathname()
  const isGame = pathname?.startsWith("/game/")
  const isHome = pathname === "/"

  return (
    <footer
      className={`${isGame ? "hidden md:block" : ""} ${isHome ? "" : "border-t border-bp-border"}`}
    >
      <div className="max-w-[1280px] mx-auto px-4 py-5 md:px-8 md:py-7 flex justify-between gap-3 flex-wrap font-mono text-[11px] md:text-xs tracking-[0.08em] uppercase text-bp-dim">
        <span>{t("appName")}</span>
        <a href="https://sundaybrosclub.com" target="_blank" rel="noopener noreferrer" className="text-bp-muted hover:text-bp-accent transition-colors">
          <span className="hidden md:inline">{t("footerPartOfClub")}</span>
          <span className="md:hidden">{t("footerClub")}</span>
        </a>
      </div>
    </footer>
  )
}
