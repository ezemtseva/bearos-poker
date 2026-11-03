"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useLocale } from "@/lib/locale-context"

export type GameLength = "short" | "basic" | "long"

const LENGTH_ROUNDS: Record<GameLength, number> = { short: 18, basic: 22, long: 28 }

interface GameConfigFieldsProps {
  gameLength: GameLength
  hasGoldenRound: boolean
  hasNoTrumps: boolean
  onGameLengthChange: (gameLength: GameLength) => void
  onGoldenRoundChange: (value: boolean) => void
  onNoTrumpsChange: (value: boolean) => void
}

function ConfigSwitch({ on }: { on: boolean }) {
  return (
    <span className={`relative w-12 h-7 rounded-full flex-shrink-0 transition-colors ${on ? "bg-bp-accent" : "bg-bp-strong"}`}>
      <span className={`absolute top-[3px] w-[22px] h-[22px] rounded-full transition-all ${on ? "left-[23px] bg-bp-bg" : "left-[3px] bg-bp-muted"}`} />
    </span>
  )
}

// Game length tiles + Golden round / No trumps switches (lobby card and dialog)
export function GameConfigFields({
  gameLength,
  hasGoldenRound,
  hasNoTrumps,
  onGameLengthChange,
  onGoldenRoundChange,
  onNoTrumpsChange,
}: GameConfigFieldsProps) {
  const { t } = useLocale()
  const options = [
    { label: t("goldenRound"), desc: t("goldenRoundDesc"), on: hasGoldenRound, toggle: () => onGoldenRoundChange(!hasGoldenRound) },
    { label: t("noTrumps"), desc: t("noTrumpsDesc"), on: hasNoTrumps, toggle: () => onNoTrumpsChange(!hasNoTrumps) },
  ]

  return (
    <>
      <fieldset className="border-0 m-0 p-0 flex flex-col gap-2.5 min-w-0">
        <legend className="bp-label pb-2.5">{t("gameLengthLabel")}</legend>
        <div className="grid grid-cols-3 gap-2">
          {(["short", "basic", "long"] as GameLength[]).map((len) => {
            const on = gameLength === len
            return (
              <button
                key={len}
                type="button"
                aria-pressed={on}
                onClick={() => onGameLengthChange(len)}
                className={`flex flex-col items-start gap-2 p-3 md:p-4 rounded-2xl text-left border transition-colors min-w-0 ${
                  on ? "bg-bp-accent border-bp-accent text-bp-bg" : "bg-bp-surface2 border-bp-strong text-bp-text hover:border-bp-muted"
                }`}
              >
                <span className="font-semibold text-sm md:text-[15px] truncate max-w-full">{t(len)}</span>
                <span className="font-display font-extrabold text-2xl md:text-[28px] leading-none">{LENGTH_ROUNDS[len]}</span>
                <span className="font-mono text-[10px] md:text-[11px] tracking-[0.08em] uppercase opacity-70">{t("rounds")}</span>
              </button>
            )
          })}
        </div>
      </fieldset>

      <fieldset className="border-0 m-0 p-0 flex flex-col gap-2 min-w-0">
        <legend className="bp-label pb-2.5">{t("specialRounds")}</legend>
        {options.map((o) => (
          <button
            key={o.label}
            type="button"
            role="switch"
            aria-checked={o.on}
            onClick={o.toggle}
            className="flex items-center gap-4 px-4 py-3.5 md:px-[18px] md:py-4 rounded-2xl border border-bp-border bg-bp-surface2 text-bp-text text-left"
          >
            <span className="flex-1 flex flex-col gap-1 min-w-0">
              <span className="font-semibold text-[15px] md:text-base">{o.label}</span>
              <span className="text-[13px] md:text-sm text-bp-muted">{o.desc}</span>
            </span>
            <ConfigSwitch on={o.on} />
          </button>
        ))}
      </fieldset>
    </>
  )
}

interface ConfigureGameDialogProps {
  isOpen: boolean
  onClose: () => void
  onSave: (gameLength: GameLength, hasGoldenRound: boolean, hasNoTrumps: boolean) => void
  currentGameLength: GameLength
  currentHasGoldenRound?: boolean
  currentHasNoTrumps?: boolean
}

export default function ConfigureGameDialog({
  isOpen,
  onClose,
  onSave,
  currentGameLength,
  currentHasGoldenRound = false,
  currentHasNoTrumps = false,
}: ConfigureGameDialogProps) {
  const { t } = useLocale()
  const [selectedLength, setSelectedLength] = useState<GameLength>(
    currentGameLength === "short" ? "basic" : currentGameLength,
  )
  const [hasGoldenRound, setHasGoldenRound] = useState<boolean>(currentHasGoldenRound)
  const [hasNoTrumps, setHasNoTrumps] = useState<boolean>(currentHasNoTrumps)

  const handleSave = () => {
    onSave(selectedLength, hasGoldenRound, hasNoTrumps)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[480px] gap-5">
        <DialogHeader>
          <DialogTitle>{t("configureGame")}</DialogTitle>
        </DialogHeader>
        <GameConfigFields
          gameLength={selectedLength}
          hasGoldenRound={hasGoldenRound}
          hasNoTrumps={hasNoTrumps}
          onGameLengthChange={setSelectedLength}
          onGoldenRoundChange={setHasGoldenRound}
          onNoTrumpsChange={setHasNoTrumps}
        />
        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button onClick={handleSave}>{t("save")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
