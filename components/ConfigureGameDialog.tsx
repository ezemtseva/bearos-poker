"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export type GameLength = "short" | "basic" | "long"

interface ConfigureGameDialogProps {
  isOpen: boolean
  onClose: () => void
  onSave: (gameLength: GameLength) => void
  currentGameLength: GameLength
}

export default function ConfigureGameDialog({ isOpen, onClose, onSave, currentGameLength }: ConfigureGameDialogProps) {
  const [selectedLength, setSelectedLength] = useState<GameLength>(currentGameLength)

  const handleSave = () => {
    onSave(selectedLength)
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
              Game Length
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
          <div className="text-sm text-gray-500">
            {selectedLength === "short" && <p>Short game: 18 rounds (1,2,3,4,5,6,B,B,B,B,B,B,6,5,4,3,2,1)</p>}
            {selectedLength === "basic" && <p>Basic game: 22 rounds (1,2,3,4,5,6,6,6,B,B,B,B,B,B,6,6,6,5,4,3,2,1)</p>}
            {selectedLength === "long" && (
              <p>Long game: 28 rounds (1,2,3,4,5,6,6,6,6,6,6,B,B,B,B,B,B,6,6,6,6,6,6,5,4,3,2,1)</p>
            )}
          </div>
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

