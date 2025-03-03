import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

interface PokerCardDialogProps {
  isOpen: boolean
  onClose: () => void
  onOptionSelect: (option: "Trumps" | "Poker" | "Simple") => void
  isFirstCard: boolean
  isValidSimple: boolean
}

export default function PokerCardDialog({
  isOpen,
  onClose,
  onOptionSelect,
  isFirstCard,
  isValidSimple,
}: PokerCardDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Play 7 of Spades</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <p className="text-sm text-gray-500 mb-4">Choose how to play the 7 of Spades:</p>
          <div className="space-y-2">
            {isFirstCard && (
              <Button
                onClick={() => onOptionSelect("Trumps")}
                className="w-full justify-start text-left"
                variant="outline"
              >
                Trumps: Unbeatable, others play highest card
              </Button>
            )}
            <Button
              onClick={() => onOptionSelect("Poker")}
              className="w-full justify-start text-left"
              variant="outline"
            >
              Poker: Unbeatable, others play any card
            </Button>
            <Button
              onClick={() => onOptionSelect("Simple")}
              className="w-full justify-start text-left"
              variant="outline"
              disabled={!isValidSimple}
            >
              Simple: Play as regular 7 of Spades
            </Button>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={onClose} variant="secondary">
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

