"use client"

import { useSession, signOut } from "next-auth/react"
import { useState, useRef, useEffect } from "react"
import Link from "next/link"
import { LogIn, LogOut, User, ChevronDown, BookOpen } from "lucide-react"
import { useLocale } from "@/lib/locale-context"
import { iconButtonClass } from "./SoundToggle"

export default function UserMenu() {
  const { t } = useLocale()
  const { data: session, status } = useSession()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  if (status === "loading") {
    return <div className="w-11 h-11 rounded-full border border-bp-strong animate-pulse" />
  }

  if (!session) {
    return (
      <Link href="/login" className={iconButtonClass(false)} title={t("signIn")} aria-label={t("signIn")}>
        <LogIn size={18} />
      </Link>
    )
  }

  const user = session.user
  const initials = user.name ? user.name.slice(0, 2).toUpperCase() : "?"
  const itemClass = "flex items-center gap-2.5 w-full px-4 py-3 text-sm text-bp-text2 hover:text-bp-text hover:bg-white/[0.04] transition-colors"

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
        aria-label={user.name ?? "Profile"}
        className={`flex items-center gap-1.5 rounded-full h-11 pl-1 pr-1 md:pr-2.5 border transition-colors ${open ? "border-bp-accent" : "border-bp-strong hover:border-bp-muted"}`}
        title={user.name ?? "Profile"}
      >
        {/* Avatar */}
        <div className="w-[34px] h-[34px] rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center bg-bp-surface3 border border-bp-strong text-bp-text font-display font-extrabold text-[11px] md:text-xs">
          {user.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.image} alt={user.name ?? ""} className="w-full h-full object-cover" />
          ) : (
            initials
          )}
        </div>
        <ChevronDown size={14} className={`hidden md:block text-bp-muted transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div role="menu" className="absolute right-0 top-[54px] w-60 bg-bp-surface2 border border-bp-strong rounded-2xl shadow-[0_24px_60px_rgba(0,0,0,0.6)] z-50 overflow-hidden">
          <div className="px-4 py-3.5 border-b border-bp-border flex flex-col gap-0.5">
            <p className="text-[15px] font-semibold text-bp-text truncate">{user.name}</p>
            <p className="text-[13px] text-bp-muted truncate">{user.email}</p>
          </div>
          <Link role="menuitem" href="/profile" onClick={() => setOpen(false)} className={itemClass}>
            <User size={16} />
            {t("myProfile")}
          </Link>
          <Link role="menuitem" href="/how-to-play" onClick={() => setOpen(false)} className={itemClass}>
            <BookOpen size={16} />
            {t("howToPlay")}
          </Link>
          <button
            role="menuitem"
            onClick={() => signOut({ callbackUrl: "/" })}
            className="flex items-center gap-2.5 w-full px-4 py-3 text-sm text-bp-warning hover:bg-white/[0.04] border-t border-bp-border transition-colors"
          >
            <LogOut size={16} />
            {t("signOut")}
          </button>
        </div>
      )}
    </div>
  )
}
