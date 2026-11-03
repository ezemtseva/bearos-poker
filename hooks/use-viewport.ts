"use client"

import { useState, useEffect } from "react"

export type ViewportSize = "mobile" | "tablet" | "desktop"

export function useViewport() {
  const [size, setSize] = useState<ViewportSize>("desktop")
  const [width, setWidth] = useState(1400)
  const [height, setHeight] = useState(900)

  useEffect(() => {
    function update() {
      // clientWidth = layout viewport; innerWidth grows when a mobile browser zooms out to fit wide content
      const w = Math.min(window.innerWidth, document.documentElement.clientWidth || window.innerWidth)
      setWidth(w)
      setHeight(Math.min(window.innerHeight, document.documentElement.clientHeight || window.innerHeight))
      if (w < 768) setSize("mobile")
      else if (w < 1200) setSize("tablet")
      else setSize("desktop")
    }
    update()
    window.addEventListener("resize", update)
    return () => window.removeEventListener("resize", update)
  }, [])

  return { size, width, height, isMobile: size === "mobile", isTablet: size === "tablet" }
}
