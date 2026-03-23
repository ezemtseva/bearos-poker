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
        <div className="py-4">
          <div className="space-y-2">
            {availableOptions.includes("Trumps") && (
              <Button
                onClick={() => onOptionSelect("Trumps")}
                className="w-full justify-start text-left bg-red-100 hover:bg-red-200"
                variant="outline"
              >
                {t("trumps")}
              </Button>
            )}
            {availableOptions.includes("Poker") && (
              <Button
                onClick={() => onOptionSelect("Poker")}
                className="w-full justify-start text-left bg-yellow-100 hover:bg-yellow-200"
                variant="outline"
              >
                {t("pokerOption")}
              </Button>
            )}
            {availableOptions.includes("Simple") && (
              <Button
                onClick={() => onOptionSelect("Simple")}
                className="w-full justify-start text-left bg-blue-100 hover:bg-blue-200"
                variant="outline"
                disabled={!isValidSimple}
              >
                {t("simple")}
              </Button>
            )}
          </div>
        </div>
        <DialogFooter className="flex justify-center">
          <Button onClick={onClose} variant="secondary">
            {t("cancel")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
