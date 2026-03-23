"use client"

import { useSession } from "next-auth/react"
import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Camera, Save, Trophy, Calendar } from "lucide-react"

interface PlayerData {
  name: string
  score: number
  place: number
}

interface GameRecord {
  id: string
  table_id: string
  player_name: string
  total_rounds: number
  final_score: number
  players_count: number
  game_length: string
  is_winner: boolean
  poker_hands: number
  players_data: PlayerData[]
  place: number
  played_at: string
}

interface ProfileData {
  profile: { nickname: string; avatar_url: string | null } | null
  settings: {
    table_skin: string; room_skin: string
    card_back_skin: string; seat_skin: string; bet_blink_enabled: boolean
  } | null
  history: GameRecord[]
}

export default function ProfilePage() {
  const { data: session, status, update } = useSession()
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)

  const [data, setData] = useState<ProfileData | null>(null)
  const [nickname, setNickname] = useState("")
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login?callbackUrl=/profile")
  }, [status, router])

  useEffect(() => {
    if (status !== "authenticated") return
    fetch("/api/profile")
      .then(r => r.json())
      .then((d: ProfileData) => {
        setData(d)
        setNickname(d.profile?.nickname ?? session?.user?.name ?? "")
        setAvatarUrl(d.profile?.avatar_url ?? session?.user?.image ?? null)
      })
  }, [status, session])

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const form = new FormData()
      form.append("avatar", file)
      const res = await fetch("/api/profile/avatar", { method: "POST", body: form })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Upload failed")
      setAvatarUrl(json.url)
      await update()
    } catch (err) {
      alert((err as Error).message || "Upload failed")
    }
    setUploading(false)
  }

  async function handleSave() {
    setSaving(true)
    await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nickname }),
    })
    await update()
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  if (status === "loading" || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white">
        <div className="animate-pulse text-gray-400">Loading profile...</div>
      </div>
    )
  }

  const initials = nickname ? nickname.slice(0, 2).toUpperCase() : "?"
  return (
    <div className="min-h-screen text-white px-4 py-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-8">My Profile</h1>

      {/* Avatar + name */}
      <div className="bg-[#111827] border border-white/10 rounded-2xl p-6 mb-4">
        <div className="flex items-center gap-6">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <div className="w-20 h-20 rounded-full overflow-hidden bg-blue-700 flex items-center justify-center text-2xl font-bold">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt={nickname} className="w-full h-full object-cover" />
              ) : initials}
            </div>
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="absolute bottom-0 right-0 w-7 h-7 bg-blue-600 hover:bg-blue-500 rounded-full flex items-center justify-center shadow-lg transition-colors"
            >
              {uploading ? <div className="w-3 h-3 border-2 border-white/50 border-t-white rounded-full animate-spin" /> : <Camera size={13} />}
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
          </div>

          {/* Nickname */}
          <div className="flex-1">
            <label className="text-xs text-gray-400 mb-1 block">Nickname</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={nickname}
                onChange={e => setNickname(e.target.value)}
                maxLength={30}
                className="flex-1 bg-gray-800 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
              />
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
              >
                <Save size={14} />
                {saved ? "Saved!" : saving ? "..." : "Save"}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">{session?.user?.email}</p>
          </div>
        </div>
      </div>

      {/* Stats — 6 widgets */}
      {(() => {
        const games = data.history.length
        const wins = data.history.filter(g => g.is_winner).length
        const winRate = games > 0 ? Math.round((wins / games) * 100) : 0
        const totalPoints = data.history.reduce((s, g) => s + g.final_score, 0)
        const pointsRecord = games > 0 ? Math.max(...data.history.map(g => g.final_score)) : 0
        const pokerHands = data.history.reduce((s, g) => s + (g.poker_hands ?? 0), 0)

        const stats = [
          { label: "Games", value: games, color: "text-blue-400" },
          { label: "Wins", value: wins, color: "text-green-400" },
          { label: "Win Rate", value: `${winRate}%`, color: "text-yellow-400" },
          { label: "Points", value: totalPoints, color: "text-purple-400" },
          { label: "Points Record", value: pointsRecord, color: "text-orange-400" },
          { label: "Poker Hand", value: pokerHands, color: "text-pink-400" },
        ]
        return (
          <div className="grid grid-cols-3 gap-3 mb-4">
            {stats.map(stat => (
              <div key={stat.label} className="bg-[#111827] border border-white/10 rounded-xl p-4 text-center">
                <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
                <div className="text-xs text-gray-400 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        )
      })()}

      {/* Game history */}
      <div className="bg-[#111827] border border-white/10 rounded-2xl overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-white/10">
          <Trophy size={16} className="text-yellow-400" />
          <span className="font-semibold text-sm">Game History</span>
        </div>

        {data.history.length === 0 ? (
          <div className="px-5 py-8 text-center text-gray-500 text-sm italic">No games played yet</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-500 border-b border-white/5">
                  <th className="text-left px-4 py-2 font-medium">Table ID</th>
                  <th className="text-center px-3 py-2 font-medium">Players</th>
                  <th className="text-center px-3 py-2 font-medium">Place</th>
                  <th className="text-center px-3 py-2 font-medium">Points</th>
                  <th className="text-center px-3 py-2 font-medium">7♠</th>
                  <th className="text-center px-3 py-2 font-medium">Type</th>
                  <th className="text-right px-4 py-2 font-medium">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {data.history.map(game => {
                  const placeLabel = game.place === 1 ? "🥇" : game.place === 2 ? "🥈" : game.place === 3 ? "🥉" : `#${game.place}`
                  const hasLeaderboard = game.players_data?.length > 0

                  return (
                    <tr key={game.id} className="hover:bg-white/3 transition-colors">
                      {/* Table ID */}
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs text-gray-400">{game.table_id}</span>
                      </td>

                      {/* Players — hover tooltip */}
                      <td className="px-3 py-3 text-center">
                        {hasLeaderboard ? (
                          <div className="relative group inline-block cursor-default">
                            <span className="text-gray-300">{game.players_count}</span>
                            {/* Tooltip */}
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10 min-w-[160px]">
                              <div className="bg-gray-900 border border-white/10 rounded-lg p-2 shadow-xl text-left">
                                {game.players_data.map((p, i) => (
                                  <div key={i} className="flex justify-between gap-3 py-0.5">
                                    <span className={`text-xs truncate ${p.name === game.player_name ? "text-blue-400 font-semibold" : "text-gray-300"}`}>{p.name}</span>
                                    <span className={`text-xs font-mono flex-shrink-0 ${p.score > 0 ? "text-green-400" : p.score < 0 ? "text-red-400" : "text-gray-500"}`}>
                                      {p.score > 0 ? `+${p.score}` : p.score}
                                    </span>
                                  </div>
                                ))}
                              </div>
                              <div className="w-2 h-2 bg-gray-900 border-r border-b border-white/10 rotate-45 mx-auto -mt-1" />
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-300">{game.players_count}</span>
                        )}
                      </td>

                      {/* Place */}
                      <td className="px-3 py-3 text-center text-base">{game.place > 0 ? placeLabel : "—"}</td>

                      {/* Points */}
                      <td className="px-3 py-3 text-center">
                        <span className={`font-bold ${game.final_score > 0 ? "text-green-400" : game.final_score < 0 ? "text-red-400" : "text-gray-400"}`}>
                          {game.final_score > 0 ? `+${game.final_score}` : game.final_score}
                        </span>
                      </td>

                      {/* Poker hand */}
                      <td className="px-3 py-3 text-center text-gray-400">
                        {game.poker_hands > 0 ? <span className="text-pink-400 font-semibold">{game.poker_hands}</span> : "—"}
                      </td>

                      {/* Game type */}
                      <td className="px-3 py-3 text-center">
                        <span className="text-xs text-gray-400 capitalize">{game.game_length}</span>
                      </td>

                      {/* Date */}
                      <td className="px-4 py-3 text-right">
                        <span className="flex items-center justify-end gap-1 text-xs text-gray-500">
                          <Calendar size={10} />
                          {new Date(game.played_at).toLocaleDateString()}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
