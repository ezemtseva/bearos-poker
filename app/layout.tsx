import type React from "react"
import type { Metadata, Viewport } from "next"
import "./globals.css"
import { Inter } from "next/font/google"
import Navigation from "./Navigation"
import Footer from "./Footer"
import dynamic from "next/dynamic"
import SessionProviderWrapper from "@/components/SessionProviderWrapper"
import { LocaleProvider } from "@/lib/locale-context"
import { Toaster } from "@/components/ui/toaster"

const RoomSkinApplier = dynamic(() => import("@/components/RoomSkinApplier"), { ssr: false })

// Playing cards keep the original Inter font
const inter = Inter({ subsets: ["latin"], variable: "--font-card" })

export const metadata: Metadata = {
  title: "Bearos Poker",
  description: "An online card game with custom rules",
  generator: "v0.dev",
  // iPhone: "Add to Home Screen" opens the app full screen, without Safari UI
  appleWebApp: {
    capable: true,
    title: "Bearos Poker",
    statusBarStyle: "black",
  },
}

export const viewport: Viewport = {
  themeColor: "#0B0C0F",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Unbounded:wght@700;800&family=Geist:wght@400;500;600&family=Geist+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className={`${inter.variable} font-sans`}>
        <SessionProviderWrapper>
          <LocaleProvider>
            <RoomSkinApplier />
            <Navigation />
            <div className="content-wrapper">
              <div className="pt-[var(--header-h)] flex-1 flex flex-col">{children}</div>
              <Footer />
            </div>
          <Toaster />
          </LocaleProvider>
        </SessionProviderWrapper>
      </body>
    </html>
  )
}
