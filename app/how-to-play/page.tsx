"use client"

import { useLocale } from "@/lib/locale-context"

export default function HowToPlay() {
  const { t } = useLocale()
  return (
    <div className="w-full max-w-[880px] mx-auto px-4 pt-7 pb-10 md:px-8 md:pt-12 md:pb-16 text-bp-text">
      <h1 className="m-0 mb-6 md:mb-8 font-display font-extrabold text-4xl md:text-[clamp(36px,5vw,52px)] leading-[0.98] tracking-[-0.03em]">{t("howToPlayTitle")}</h1>

      <div className="flex flex-col gap-3 md:gap-4">
        <section className="bg-bp-surface border border-bp-border rounded-[20px] p-5 md:p-6 text-[15px] leading-relaxed text-bp-text2">
          <h2 className="m-0 mb-3 font-display font-bold text-lg md:text-xl text-bp-text">{t("htpOverview")}</h2>
          <p>{t("htpOverviewText")}</p>
        </section>

        <section className="bg-bp-surface border border-bp-border rounded-[20px] p-5 md:p-6 text-[15px] leading-relaxed text-bp-text2">
          <h2 className="m-0 mb-3 font-display font-bold text-lg md:text-xl text-bp-text">{t("htpSetup")}</h2>
          <ul className="list-disc pl-5 space-y-1.5 marker:text-bp-accent">
            <li>{t("htpSetup1")}</li>
            <li>{t("htpSetup2")}</li>
            <li>{t("htpSetup3")}</li>
            <li>{t("htpSetup4")}</li>
            <li>{t("htpSetup5")}</li>
          </ul>
        </section>

        <section className="bg-bp-surface border border-bp-border rounded-[20px] p-5 md:p-6 text-[15px] leading-relaxed text-bp-text2">
          <h2 className="m-0 mb-3 font-display font-bold text-lg md:text-xl text-bp-text">{t("htpRounds")}</h2>
          <p className="mb-3">{t("htpRoundsText")}</p>
          <ul className="list-disc pl-5 space-y-1.5 marker:text-bp-accent">
            <li>{t("htpRounds1")}</li>
            <li>{t("htpRounds2")}</li>
            <li>{t("htpRounds3")}</li>
          </ul>
        </section>

        <section className="bg-bp-surface border border-bp-border rounded-[20px] p-5 md:p-6 text-[15px] leading-relaxed text-bp-text2">
          <h2 className="m-0 mb-3 font-display font-bold text-lg md:text-xl text-bp-text">{t("htpGameplay")}</h2>
          <ol className="list-decimal pl-5 space-y-1.5 marker:text-bp-accent marker:font-mono">
            <li>{t("htpGameplay1")}</li>
            <li>{t("htpGameplay2")}</li>
            <li>{t("htpGameplay3")}</li>
            <li>{t("htpGameplay4")}</li>
            <li>{t("htpGameplay5")}</li>
            <li>{t("htpGameplay6")}</li>
            <li>{t("htpGameplay7")}</li>
          </ol>
        </section>

        <section className="bg-bp-surface border border-bp-border rounded-[20px] p-5 md:p-6 text-[15px] leading-relaxed text-bp-text2">
          <h2 className="m-0 mb-3 font-display font-bold text-lg md:text-xl text-bp-text">{t("htpSpecial")}</h2>
          <p className="mb-3">{t("htpSpecialText")}</p>
          <ul className="list-disc pl-5 space-y-1.5 marker:text-bp-accent">
            <li>{t("htpSpecial1")}</li>
            <li>{t("htpSpecial2")}</li>
            <li>{t("htpSpecial3")}</li>
          </ul>
        </section>

        <section className="bg-bp-surface border border-bp-border rounded-[20px] p-5 md:p-6 text-[15px] leading-relaxed text-bp-text2">
          <h2 className="m-0 mb-3 font-display font-bold text-lg md:text-xl text-bp-text">{t("htpScoring")}</h2>
          <ul className="list-disc pl-5 space-y-1.5 marker:text-bp-accent">
            <li>{t("htpScoring1")}</li>
            <li>{t("htpScoring2")}</li>
          </ul>
        </section>

        <section className="bg-bp-surface border border-bp-border rounded-[20px] p-5 md:p-6 text-[15px] leading-relaxed text-bp-text2">
          <h2 className="m-0 mb-3 font-display font-bold text-lg md:text-xl text-bp-text">{t("htpGolden")}</h2>
          <p>{t("htpGoldenText")}</p>
        </section>

        <section className="bg-bp-surface border border-bp-border rounded-[20px] p-5 md:p-6 text-[15px] leading-relaxed text-bp-text2">
          <h2 className="m-0 mb-3 font-display font-bold text-lg md:text-xl text-bp-text">{t("htpWinning")}</h2>
          <p>{t("htpWinningText")}</p>
        </section>

        <section className="bg-bp-surface border border-bp-border rounded-[20px] p-5 md:p-6 text-[15px] leading-relaxed text-bp-text2">
          <h2 className="m-0 mb-3 font-display font-bold text-lg md:text-xl text-bp-text">{t("htpTips")}</h2>
          <ul className="list-disc pl-5 space-y-1.5 marker:text-bp-accent">
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
