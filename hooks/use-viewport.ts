"use client"

import { useState, useEffect } from "react"

export type ViewportSize = "mobile" | "tablet" | "desktop"

export function useViewport() {
  const [size, setSize] = useState<ViewportSize>("desktop")
  const [width, setWidth] = useState(1400)

  useEffect(() => {
    function update() {
      const w = window.innerWidth
      setWidth(w)
      if (w < 768) setSize("mobile")
      else if (w < 1200) setSize("tablet")
      else setSize("desktop")
    }
    update()
    window.addEventListener("resize", update)
    return () => window.removeEventListener("resize", update)
  }, [])

  return { size, width, isMobile: size === "mobile", isTablet: size === "tablet" }
}
