"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from "react"
import { translations, Locale, TranslationKey } from "./translations"

interface LocaleContextType {
  locale: Locale
  setLocale: (l: Locale) => void
  t: (key: TranslationKey) => string
}

const LocaleContext = createContext<LocaleContextType>({
  locale: "en",
  setLocale: () => {},
  t: (key) => translations.en[key],
})

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en")

  useEffect(() => {
    try {
      const saved = localStorage.getItem("locale") as Locale | null
      if (saved === "en" || saved === "ru") setLocaleState(saved)
    } catch {}
  }, [])

  function setLocale(l: Locale) {
    setLocaleState(l)
    try { localStorage.setItem("locale", l) } catch {}
  }

  function t(key: TranslationKey): string {
    return translations[locale][key] ?? translations.en[key]
  }

  return (
    <LocaleContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LocaleContext.Provider>
  )
}

export function useLocale() {
  return useContext(LocaleContext)
}
