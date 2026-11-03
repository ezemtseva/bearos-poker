"use client"

import { useSession } from "next-auth/react"
import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Camera } from "lucide-react"
import { useLocale } from "@/lib/locale-context"

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
  const { t } = useLocale()

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
      <div className="flex-1 flex items-center justify-center text-bp-text">
        <div className="animate-pulse text-bp-muted">{t("loadingProfile")}</div>
      </div>
    )
  }

  const initials = nickname ? nickname.slice(0, 2).toUpperCase() : "?"

  const games = data.history.length
  const wins = data.history.filter(g => g.is_winner).length
  const winRate = games > 0 ? Math.round((wins / games) * 100) : 0
  const totalPoints = data.history.reduce((s, g) => s + g.final_score, 0)
  const pointsRecord = games > 0 ? Math.max(...data.history.map(g => g.final_score)) : 0
  const pokerHands = data.history.reduce((s, g) => s + (g.poker_hands ?? 0), 0)

  const stats = [
    { label: t("games"), value: games },
    { label: t("wins"), value: wins, accent: true },
    { label: t("winRate"), value: `${winRate}%` },
    { label: t("points"), value: totalPoints },
    { label: t("pointsRecord"), value: pointsRecord },
    { label: t("poker"), value: pokerHands },
  ]

  const placeLabel = (place: number) =>
    place === 1 ? t("place1") : place === 2 ? t("place2") : place === 3 ? t("place3") : `#${place}`
  const placeColors = (place: number) =>
    place === 1 ? "bg-bp-accent text-bp-bg" : place === 2 ? "bg-bp-text2 text-bp-bg" : "bg-bp-surface3 text-bp-text2"
  const placePillClass = (place: number) => `font-mono text-xs px-2.5 py-1 rounded-full ${placeColors(place)}`
  const formatPoints = (n: number) => (n > 0 ? `+${n}` : `${n}`)
  const formatDate = (d: string) => new Date(d).toLocaleDateString()

  return (
    <div className="w-full max-w-[1040px] mx-auto px-4 pt-7 pb-8 md:px-8 md:pt-12 md:pb-16 flex flex-col gap-4 md:gap-6 text-bp-text">
      <h1 className="m-0 font-display font-extrabold text-4xl md:text-[clamp(36px,5vw,52px)] leading-[0.98] tracking-[-0.03em]">
        {t("profileTitle1")} <span className="text-bp-accent">{t("profileTitle2")}</span>
      </h1>

      {/* Avatar + name */}
      <section aria-label={t("myProfileHeading")} className="bg-bp-surface border border-bp-border rounded-[20px] md:rounded-3xl px-4 py-[18px] md:p-6 flex flex-col md:flex-row md:flex-wrap md:items-center gap-4 md:gap-6">
        <div className="flex items-center gap-4">
          {/* Avatar */}
          <div className="relative flex-shrink-0 w-[72px] h-[72px] md:w-24 md:h-24">
            <div className="w-full h-full rounded-full overflow-hidden bg-bp-surface3 border border-bp-strong flex items-center justify-center font-display font-extrabold text-2xl md:text-[32px]">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt={nickname} className="w-full h-full object-cover" />
              ) : initials}
            </div>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              aria-label={t("changePhoto")}
              className="absolute -right-1.5 -bottom-1.5 md:-right-0.5 md:-bottom-0.5 w-[34px] h-[34px] md:w-9 md:h-9 box-content border-[3px] border-bp-surface bg-bp-accent text-bp-bg rounded-full flex items-center justify-center hover:bg-bp-accentHover transition-colors"
            >
              {uploading ? <div className="w-3.5 h-3.5 border-2 border-bp-bg/40 border-t-bp-bg rounded-full animate-spin" /> : <Camera size={16} />}
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
          </div>
          <div className="md:hidden flex flex-col gap-0.5 min-w-0">
            <span className="font-display font-bold text-xl truncate">{nickname}</span>
            <span className="text-[13px] text-bp-muted truncate">{session?.user?.email}</span>
          </div>
        </div>

        {/* Nickname */}
        <div className="md:flex-[1_1_320px] min-w-0 flex flex-col gap-2 md:gap-2.5">
          <label htmlFor="nick" className="bp-label">{t("nickname")}</label>
          <div className="flex gap-2">
            <input
              id="nick"
              type="text"
              value={nickname}
              onChange={e => setNickname(e.target.value)}
              maxLength={30}
              className="flex-1 min-w-0 h-[50px] md:h-[52px] px-3.5 md:px-4 rounded-xl border border-bp-strong bg-bp-surface2 text-bp-text text-base md:text-[17px] focus:outline-none focus:border-bp-accent"
            />
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="h-[50px] md:h-[52px] px-5 md:px-[22px] rounded-full bg-bp-accent text-bp-bg text-[15px] font-semibold hover:bg-bp-accentHover disabled:opacity-50 transition-colors flex-shrink-0"
            >
              {saved ? t("saved") : saving ? t("saving") : t("save")}
            </button>
          </div>
          <p className="hidden md:block text-[13px] text-bp-muted m-0">{session?.user?.email}</p>
        </div>
      </section>

      {/* Stats — 6 widgets */}
      <section aria-label="Stats" className="grid grid-cols-3 gap-2 md:gap-3">
        {stats.map(stat => (
          <div key={stat.label} className="bg-bp-surface border border-bp-border rounded-2xl md:rounded-[20px] p-3 md:p-5 flex flex-col gap-2 md:gap-2.5 min-w-0">
            <span className="font-mono text-[9px] md:text-[11px] tracking-[0.08em] md:tracking-[0.1em] uppercase text-bp-muted truncate">{stat.label}</span>
            <span className={`font-display font-extrabold text-[22px] md:text-[34px] leading-none ${stat.accent ? "text-bp-accent" : "text-bp-text"}`}>{stat.value}</span>
          </div>
        ))}
      </section>

      {/* Game history */}
      <section aria-labelledby="hist" className="bg-bp-surface border border-bp-border rounded-[20px] md:rounded-3xl overflow-hidden">
        <div className="px-4 py-3.5 md:px-6 md:py-[18px] border-b border-bp-border">
          <h2 id="hist" className="m-0 font-display font-bold text-[17px] md:text-xl">{t("gameHistory")}</h2>
        </div>

        {data.history.length === 0 ? (
          <div className="px-5 py-8 text-center text-bp-dim text-sm">{t("noGamesYet")}</div>
        ) : (
          <>
            {/* Mobile: list rows */}
            <div className="md:hidden">
              {data.history.map((game, i) => (
                <div key={game.id} className={`px-4 py-3 flex items-center gap-3 ${i > 0 ? "border-t border-bp-divider" : ""}`}>
                  <span className={`w-11 text-center font-mono text-xs py-[5px] rounded-full flex-shrink-0 ${placeColors(game.place)}`}>
                    {game.place > 0 ? placeLabel(game.place) : "—"}
                  </span>
                  <span className="flex-1 flex flex-col gap-[3px] min-w-0">
                    <span className="font-mono text-sm tracking-[0.1em] text-bp-accent">{game.table_id}</span>
                    <span className="font-mono text-[11px] text-bp-muted truncate">
                      {formatDate(game.played_at)}
                      {game.poker_hands > 0 ? ` · ${t("poker")}: ${game.poker_hands}` : ""}
                    </span>
                  </span>
                  <span className={`font-display font-bold text-base ${game.final_score < 0 ? "text-bp-warning" : "text-bp-text"}`}>
                    {formatPoints(game.final_score)}
                  </span>
                </div>
              ))}
            </div>

            {/* Desktop: table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full min-w-[900px] table-fixed border-collapse text-sm tabular-nums">
                <thead>
                  <tr className="font-mono text-[11px] tracking-[0.08em] uppercase text-bp-dim">
                    <th scope="col" className="text-left font-medium px-6 py-3">{t("tableId")}</th>
                    <th scope="col" className="text-center font-medium px-3 py-3">{t("players")}</th>
                    <th scope="col" className="text-center font-medium px-3 py-3">{t("place")}</th>
                    <th scope="col" className="text-center font-medium px-3 py-3">{t("points")}</th>
                    <th scope="col" className="text-center font-medium px-3 py-3">{t("poker")}</th>
                    <th scope="col" className="text-center font-medium px-3 py-3">{t("type")}</th>
                    <th scope="col" className="text-right font-medium px-6 py-3">{t("date")}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.history.map(game => {
                    const hasLeaderboard = game.players_data?.length > 0
                    const dotCount = hasLeaderboard ? game.players_data.length : game.players_count
                    return (
                      <tr key={game.id} className="border-t border-bp-divider hover:bg-white/[0.02] transition-colors">
                        {/* Table ID */}
                        <td className="px-6 py-3.5 font-mono tracking-[0.1em] text-bp-accent">{game.table_id}</td>

                        {/* Players — neutral dots, names on hover */}
                        <td className="px-3 py-3.5 text-center">
                          <div className="relative group inline-flex items-center gap-2 cursor-default">
                            <span className="inline-flex">
                              {Array.from({ length: Math.min(dotCount, 6) }).map((_, i) => (
                                <span
                                  key={i}
                                  className={`w-[18px] h-[18px] rounded-full border-2 border-bp-surface bg-bp-strong ${i ? "-ml-1.5" : ""}`}
                                />
                              ))}
                            </span>
                            <span className="text-bp-text2">{game.players_count}</span>
                            {hasLeaderboard && (
                              <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block z-10 min-w-[180px]">
                                <div className="bg-bp-surface2 border border-bp-strong rounded-xl p-2.5 shadow-[0_24px_60px_rgba(0,0,0,0.6)] text-left">
                                  {game.players_data.map((p, i) => (
                                    <div key={i} className="flex justify-between gap-3 py-0.5">
                                      <span className={`text-xs truncate ${p.name === game.player_name ? "text-bp-accent font-semibold" : "text-bp-text2"}`}>{p.name}</span>
                                      <span className={`text-xs font-mono flex-shrink-0 ${p.score < 0 ? "text-bp-warning" : "text-bp-muted"}`}>
                                        {formatPoints(p.score)}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Place */}
                        <td className="px-3 py-3.5 text-center">
                          {game.place > 0 ? <span className={placePillClass(game.place)}>{placeLabel(game.place)}</span> : <span className="text-bp-dim">—</span>}
                        </td>

                        {/* Points */}
                        <td className={`px-3 py-3.5 text-center font-display font-bold text-[15px] ${game.final_score < 0 ? "text-bp-warning" : "text-bp-text"}`}>
                          {formatPoints(game.final_score)}
                        </td>

                        {/* Poker hand */}
                        <td className={`px-3 py-3.5 text-center font-mono ${game.poker_hands > 0 ? "text-bp-text" : "text-bp-dim"}`}>
                          {game.poker_hands > 0 ? game.poker_hands : "—"}
                        </td>

                        {/* Game type */}
                        <td className="px-3 py-3.5 text-center">
                          <span className="font-mono text-[11px] tracking-[0.08em] uppercase px-2.5 py-1 rounded-full bg-bp-surface3 text-bp-text2">{game.game_length}</span>
                        </td>

                        {/* Date */}
                        <td className="px-6 py-3.5 text-right font-mono text-bp-muted whitespace-nowrap">{formatDate(game.played_at)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </div>
  )
}
