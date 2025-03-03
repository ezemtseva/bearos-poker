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
          <DialogTitle>How would you like to play?</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <div className="space-y-2">
            <Button
              onClick={() => onOptionSelect("Trumps")}
              className="w-full justify-start text-left bg-red-100 hover:bg-red-200"
              variant="outline"
            >
              Trumps
            </Button>
            <Button
              onClick={() => onOptionSelect("Poker")}
              className="w-full justify-start text-left bg-yellow-100 hover:bg-yellow-200"
              variant="outline"
            >
              Poker
            </Button>
            <Button
              onClick={() => onOptionSelect("Simple")}
              className="w-full justify-start text-left bg-blue-100 hover:bg-blue-200"
              variant="outline"
              disabled={!isValidSimple}
            >
              Simple
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

