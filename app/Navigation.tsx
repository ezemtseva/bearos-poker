"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

export default function Navigation() {
  const pathname = usePathname()

  return (
    <nav className="bg-black/80 text-white p-4 fixed top-0 left-0 right-0 z-10 backdrop-blur-sm">
      <div className="container mx-auto flex justify-between items-center">
        <Link href="/" className="text-2xl font-bold">
          Bearos Poker
        </Link>
        <div className="space-x-6">
          <Link
            href="/how-to-play"
            className={`hover:text-gray-300 ${pathname === "/how-to-play" ? "underline font-semibold" : ""}`}
          >
            How to Play
          </Link>
        </div>
      </div>
    </nav>
  )
}

