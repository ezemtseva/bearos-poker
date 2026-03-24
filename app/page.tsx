"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useLocale } from "@/lib/locale-context"

export default function Home() {
  const { t } = useLocale()
  return (
    <div className="container mx-auto px-4 min-h-[calc(100vh-64px)] flex items-center justify-center">
      <div className="max-w-2xl w-full">
        <h1 className="text-3xl font-bold mb-4 text-center">{t("welcomeTitle")}</h1>
        <div className="flex justify-center space-x-4 mt-6">
          <Link href="/create-game">
            <Button>{t("createTable")}</Button>
          </Link>
          <Link href="/join-game">
            <Button variant="outline">
              {t("joinTable")}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
