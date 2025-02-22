"use client"

import Link from "next/link"

export default function Navigation() {
  return (
    <nav className="bg-black/80 text-white p-4 fixed top-0 left-0 right-0 z-10 backdrop-blur-sm">
      <div className="container mx-auto">
        <Link href="/" className="text-2xl font-bold">
          Bearos Poker
        </Link>
      </div>
    </nav>
  )
}

