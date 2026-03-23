"use client"

import { useSession, signOut } from "next-auth/react"
import { useState, useRef, useEffect } from "react"
import Link from "next/link"
import { LogIn, LogOut, User, ChevronDown } from "lucide-react"

export default function UserMenu() {
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
    return <div className="w-10 h-10 rounded-full bg-gray-800/50 animate-pulse" />
  }

  if (!session) {
    return (
      <Link
        href="/login"
        className="rounded-full w-10 h-10 flex items-center justify-center bg-gray-800/50 hover:bg-gray-700/70 text-gray-300 hover:text-white transition-colors"
        title="Sign in"
      >
        <LogIn size={18} />
      </Link>
    )
  }

  const user = session.user
  const initials = user.name ? user.name.slice(0, 2).toUpperCase() : "?"

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 rounded-full bg-gray-800/50 hover:bg-gray-700/70 transition-colors pr-2 pl-0.5 h-10"
        title={user.name ?? "Profile"}
      >
        {/* Avatar */}
        <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center bg-blue-700 text-white text-xs font-bold">
          {user.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.image} alt={user.name ?? ""} className="w-full h-full object-cover" />
          ) : (
            initials
          )}
        </div>
        <ChevronDown size={14} className={`text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-12 w-52 bg-gray-800 border border-white/10 rounded-xl shadow-2xl z-50 py-1 overflow-hidden">
          <div className="px-4 py-2.5 border-b border-white/10">
            <p className="text-sm font-semibold text-white truncate">{user.name}</p>
            <p className="text-xs text-gray-400 truncate">{user.email}</p>
          </div>
          <Link
            href="/profile"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
          >
            <User size={15} />
            My Profile
          </Link>
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-white/5 transition-colors"
          >
            <LogOut size={15} />
            Sign out
          </button>
        </div>
      )}
    </div>
  )
}
