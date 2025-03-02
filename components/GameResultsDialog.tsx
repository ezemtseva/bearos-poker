import { Dialog, DialogContent, DialogHeader, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import type { Player } from "../types/game"

interface GameResultsDialogProps {
  isOpen: boolean
  onClose: () => void
  players: Player[]
}

export default function GameResultsDialog({ isOpen, onClose, players }: GameResultsDialogProps) {
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score)
  const winner = sortedPlayers[0]

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogDescription className="text-center text-lg font-bold">
            Congratulations to {winner.name}!
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <ul className="space-y-2">
            {sortedPlayers.map((player, index) => (
              <li
                key={player.name}
                className={`flex justify-between items-center ${index === 0 ? "font-bold text-primary" : ""}`}
              >
                <span>
                  {index + 1}. {player.name}
                </span>
                <span>{player.score} points</span>
              </li>
            ))}
          </ul>
        </div>
        <DialogFooter className="sm:justify-center">
          <Button onClick={onClose} className="w-[120px] h-[40px]">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

