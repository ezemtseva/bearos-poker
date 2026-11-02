"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useLocale } from "@/lib/locale-context"

interface PokerCardDialogProps {
  isOpen: boolean
  onClose: () => void
  onOptionSelect: (option: "Trumps" | "Poker" | "Simple") => void
  isFirstCard: boolean
  isValidSimple: boolean
  availableOptions: ("Trumps" | "Poker" | "Simple")[]
}

export default function PokerCardDialog({
  isOpen,
  onClose,
  onOptionSelect,
  isFirstCard,
  isValidSimple,
  availableOptions,
}: PokerCardDialogProps) {
  const { t } = useLocale()

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t("howToPlay7")}</DialogTitle>
        </DialogHeader>
        <div className="py-2">
          <div className="flex flex-col gap-2">
            {availableOptions.includes("Trumps") && (
              <Button
                onClick={() => onOptionSelect("Trumps")}
                className="w-full h-12 justify-start text-left text-[15px] bg-bp-accent border-bp-accent text-bp-bg hover:bg-bp-accentHover hover:border-bp-accentHover"
                variant="outline"
              >
                {t("trumps")}
              </Button>
            )}
            {availableOptions.includes("Poker") && (
              <Button
                onClick={() => onOptionSelect("Poker")}
                className="w-full h-12 justify-start text-left text-[15px] bg-bp-text2 border-bp-text2 text-bp-bg hover:bg-bp-text hover:border-bp-text"
                variant="outline"
              >
                {t("pokerOption")}
              </Button>
            )}
            {availableOptions.includes("Simple") && (
              <Button
                onClick={() => onOptionSelect("Simple")}
                className="w-full h-12 justify-start text-left text-[15px] bg-bp-surface border-bp-strong hover:border-bp-accent hover:bg-bp-surface"
                variant="outline"
                disabled={!isValidSimple}
              >
                {t("simple")}
              </Button>
            )}
          </div>
        </div>
        <DialogFooter className="flex sm:justify-center">
          <Button onClick={onClose} variant="secondary">
            {t("cancel")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
