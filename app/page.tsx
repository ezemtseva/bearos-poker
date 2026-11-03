"use client"

import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { useLocale } from "@/lib/locale-context"

export default function Home() {
  const { t } = useLocale()
  const steps = [
    { n: "01", title: t("step1Title"), desc: t("step1Desc") },
    { n: "02", title: t("step2Title"), desc: t("step2Desc") },
    { n: "03", title: t("step3Title"), desc: t("step3Desc") },
  ]

  return (
    <div className="flex-1 flex flex-col">
      {/* Mobile: equal rows above and below keep the buttons in the vertical center of the screen */}
      <section className="flex-1 md:flex-none w-full max-w-[1280px] mx-auto px-4 pt-10 pb-8 md:px-8 md:pt-9 md:pb-14 grid grid-rows-[1fr_auto_1fr] md:flex md:flex-col gap-7">
        <h1 className="m-0 self-start font-display font-extrabold text-[clamp(44px,14vw,60px)] md:text-[clamp(56px,9vw,136px)] leading-[0.92] tracking-[-0.03em]">
          {t("heroLine1")}
          <br />
          <span className="text-bp-accent">{t("heroLine2")}</span>
        </h1>

        <div className="flex flex-col md:grid md:grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-2.5 md:gap-3 md:max-w-[620px]">
          <Link
            href="/create-game"
            className="flex flex-col justify-between gap-7 md:gap-10 p-5 md:p-6 rounded-[20px] bg-bp-accent text-bp-bg md:min-h-[150px] hover:bg-bp-accentHover transition-colors"
          >
            <span className="flex justify-between items-center">
              <span className="font-mono text-[11px] md:text-xs tracking-[0.12em] uppercase">{t("homeNewGame")}</span>
              <ArrowRight size={22} />
            </span>
            <span className="font-display font-bold text-2xl md:text-[26px] tracking-[-0.01em]">{t("homeCreateTable")}</span>
          </Link>
          <Link
            href="/join-game"
            className="flex flex-col justify-between gap-7 md:gap-10 p-5 md:p-6 rounded-[20px] bg-bp-surface border border-bp-strong text-bp-text md:min-h-[150px] hover:border-bp-muted transition-colors"
          >
            <span className="flex justify-between items-center">
              <span className="font-mono text-[11px] md:text-xs tracking-[0.12em] uppercase text-bp-muted">{t("homeHaveTableId")}</span>
              <ArrowRight size={22} className="text-bp-accent" />
            </span>
            <span className="font-display font-bold text-2xl md:text-[26px] tracking-[-0.01em]">{t("homeJoinTable")}</span>
          </Link>
        </div>
      </section>

      {/* How it works — desktop only */}
      <section aria-labelledby="how" className="hidden md:block bg-bp-band border-y border-bp-border">
        <div className="max-w-[1280px] mx-auto px-8 py-14 flex flex-col gap-7">
          <h2 id="how" className="m-0 font-display font-bold text-[28px] tracking-[-0.01em]">{t("howItWorks")}</h2>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-4">
            {steps.map((s) => (
              <div key={s.n} className="bg-bp-surface border border-bp-border rounded-[20px] p-6 flex flex-col gap-3">
                <span className="font-mono text-[13px] text-bp-accent">{s.n}</span>
                <span className="font-display font-bold text-xl">{s.title}</span>
                <span className="text-[15px] leading-normal text-bp-muted">{s.desc}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
