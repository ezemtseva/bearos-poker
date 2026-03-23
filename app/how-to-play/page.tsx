"use client"

import { useLocale } from "@/lib/locale-context"

export default function HowToPlay() {
  const { t } = useLocale()
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6 text-center">{t("howToPlayTitle")}</h1>

      <div className="space-y-8 text-white">
        <section>
          <h2 className="text-2xl font-bold mb-3">{t("htpOverview")}</h2>
          <p>{t("htpOverviewText")}</p>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-3">{t("htpSetup")}</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>{t("htpSetup1")}</li>
            <li>{t("htpSetup2")}</li>
            <li>{t("htpSetup3")}</li>
            <li>{t("htpSetup4")}</li>
            <li>{t("htpSetup5")}</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-3">{t("htpRounds")}</h2>
          <p className="mb-3">{t("htpRoundsText")}</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>{t("htpRounds1")}</li>
            <li>{t("htpRounds2")}</li>
            <li>{t("htpRounds3")}</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-3">{t("htpGameplay")}</h2>
          <ol className="list-decimal pl-6 space-y-2">
            <li>{t("htpGameplay1")}</li>
            <li>{t("htpGameplay2")}</li>
            <li>{t("htpGameplay3")}</li>
            <li>{t("htpGameplay4")}</li>
            <li>{t("htpGameplay5")}</li>
            <li>{t("htpGameplay6")}</li>
            <li>{t("htpGameplay7")}</li>
          </ol>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-3">{t("htpSpecial")}</h2>
          <p className="mb-3">{t("htpSpecialText")}</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>{t("htpSpecial1")}</li>
            <li>{t("htpSpecial2")}</li>
            <li>{t("htpSpecial3")}</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-3">{t("htpScoring")}</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>{t("htpScoring1")}</li>
            <li>{t("htpScoring2")}</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-3">{t("htpGolden")}</h2>
          <p>{t("htpGoldenText")}</p>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-3">{t("htpWinning")}</h2>
          <p>{t("htpWinningText")}</p>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-3">{t("htpTips")}</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>{t("htpTip1")}</li>
            <li>{t("htpTip2")}</li>
            <li>{t("htpTip3")}</li>
            <li>{t("htpTip4")}</li>
            <li>{t("htpTip5")}</li>
          </ul>
        </section>
      </div>
    </div>
  )
}
