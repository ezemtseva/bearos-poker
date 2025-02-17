"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"

export default function MigratePage() {
  const [migrationStatus, setMigrationStatus] = useState<string | null>(null)

  const runMigration = async () => {
    try {
      const response = await fetch("/api/db/migrate")
      const data = await response.json()
      setMigrationStatus(data.message || "Migration completed")
    } catch (error) {
      setMigrationStatus("Migration failed: " + (error instanceof Error ? error.message : String(error)))
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-4">Database Migration</h1>
      <Button onClick={runMigration}>Run Migration</Button>
      {migrationStatus && <p className="mt-4">{migrationStatus}</p>}
    </div>
  )
}

