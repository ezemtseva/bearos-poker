import type React from "react"
import "./globals.css"
import { Inter } from "next/font/google"
import Navigation from "./Navigation"
import dynamic from "next/dynamic"
import SessionProviderWrapper from "@/components/SessionProviderWrapper"
import { LocaleProvider } from "@/lib/locale-context"
import { Toaster } from "@/components/ui/toaster"

const RoomSkinApplier = dynamic(() => import("@/components/RoomSkinApplier"), { ssr: false })

const inter = Inter({ subsets: ["latin"] })

export const metadata = {
  title: "Bearos Poker",
  description: "An online card game with custom rules",
  generator: "v0.dev",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <SessionProviderWrapper>
          <LocaleProvider>
            <RoomSkinApplier />
            <Navigation />
            <div className="content-wrapper">
              <div className="pt-14 md:pt-16">{children}</div>
            </div>
          <Toaster />
          </LocaleProvider>
        </SessionProviderWrapper>
      </body>
    </html>
  )
}

