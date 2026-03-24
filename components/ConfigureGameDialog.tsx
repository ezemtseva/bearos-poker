"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { useLocale } from "@/lib/locale-context"

export type GameLength = "short" | "basic" | "long"

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
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t("configureGame")}</DialogTitle>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <div className="flex items-center gap-3">
            <label htmlFor="game-length" className="text-sm font-medium whitespace-nowrap">
              {t("gameType")}
            </label>
            <Select value={selectedLength} onValueChange={(value: string) => setSelectedLength(value as GameLength)}>
              <SelectTrigger id="game-length">
                <SelectValue placeholder={t("selectGameLength")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="short">{t("shortRounds")}</SelectItem>
                <SelectItem value="basic">{t("basicRounds")}</SelectItem>
                <SelectItem value="long">{t("longRounds")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="no-trumps"
                checked={hasNoTrumps}
                onCheckedChange={(checked) => setHasNoTrumps(checked === true)}
              />
              <label htmlFor="no-trumps" className="text-sm font-medium cursor-pointer">
                {t("noTrumps")}
              </label>
            </div>
            <div className="text-xs text-gray-400 mt-1 ml-6">{t("noTrumpsDesc")}</div>
          </div>

          <div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="golden-round"
                checked={hasGoldenRound}
                onCheckedChange={(checked) => setHasGoldenRound(checked === true)}
              />
              <label htmlFor="golden-round" className="text-sm font-medium cursor-pointer">
                {t("goldenRound")}
              </label>
            </div>
            <div className="text-xs text-gray-400 mt-1 ml-6">{t("goldenRoundDesc")}</div>
          </div>
        </div>
        <DialogFooter className="flex justify-between">
          <Button variant="outline" onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button onClick={handleSave}>{t("save")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
