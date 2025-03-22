"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"

export type GameLength = "short" | "basic" | "long"

interface ConfigureGameDialogProps {
  isOpen: boolean
  onClose: () => void
  onSave: (gameLength: GameLength, hasGoldenRound: boolean) => void
  currentGameLength: GameLength
  currentHasGoldenRound?: boolean
}

export default function ConfigureGameDialog({
  isOpen,
  onClose,
  onSave,
  currentGameLength,
  currentHasGoldenRound = false,
}: ConfigureGameDialogProps) {
  const [selectedLength, setSelectedLength] = useState<GameLength>(
    currentGameLength === "short" ? "basic" : currentGameLength,
  )
  const [hasGoldenRound, setHasGoldenRound] = useState<boolean>(currentHasGoldenRound)

  const handleSave = () => {
    onSave(selectedLength, hasGoldenRound)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Configure Game</DialogTitle>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <div className="space-y-2">
            <label htmlFor="game-length" className="text-sm font-medium">
              Game Type
            </label>
            <Select value={selectedLength} onValueChange={(value: string) => setSelectedLength(value as GameLength)}>
              <SelectTrigger id="game-length">
                <SelectValue placeholder="Select game length" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="short">Short (18 rounds)</SelectItem>
                <SelectItem value="basic">Basic (22 rounds)</SelectItem>
                <SelectItem value="long">Long (28 rounds)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="golden-round"
              checked={hasGoldenRound}
              onCheckedChange={(checked) => setHasGoldenRound(checked === true)}
            />
            <label htmlFor="golden-round" className="text-sm font-medium cursor-pointer">
              Golden Round
            </label>
          </div>

          {hasGoldenRound && (
            <div className="text-sm text-amber-500">Adds a special final round where the winner gets 100 points!</div>
          )}
        </div>
        <DialogFooter className="flex justify-between">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

