import { useState } from 'react'
import { CATEGORIES, getRandomWord } from '../data/words'
import { AVATAR_COLORS } from '../App'

export default function Lobby({ room, player, players, onStartGame, onLeave }) {
  const [selectedCat, setSelectedCat] = useState(null)
  const [loading, setLoading]         = useState(false)
  const [copied, setCopied]           = useState(false)

  const isHost   = player?.is_host
  const canStart = isHost && players.length >= 3 && selectedCat

  const copyCode = () => {
    navigator.clipboard.writeText(room.code).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleStart = async () => {
    if (!canStart || loading) return
    setLoading(true)
    const word         = getRandomWord(selectedCat)
    const shuffled     = [...players].sort(() => Math.random() - 0.5)
    const chameleonId  = shuffled[0].id
    const playerOrder  = shuffled.map(p => p.id)
    await onStartGame({ category: selectedCat, word, chameleonId, playerOrder })
    setLoading(false)
  }

  return (
    <div className="page">
      <div className="page-content">

        {/* ── Header ──────────────────────────────────────── */}
        <div className="row" style={{ paddingTop: 28, marginBottom: 24 }}>
          <div className="logo-sm">WOR<span className="accent">S</span>US</div>
          <div className="spacer" />
          <button className="btn btn-ghost btn-sm" onClick={onLeave}>Leave</button>
        </div>

        {/* ── Room code card ──────────────────────────────── */}
        <div className="card-glow tc mb12">
          <div className="label" style={{ marginBottom: 10 }}>
            Room Code — Share with friends
          </div>
          <div className="room-code">{room.code}</div>
          <button className="btn btn-secondary btn-sm mt12"
            style={{ width: 'auto', margin: '12px auto 0' }}
            onClick={copyCode}>
            {copied ? '✓  Copied!' : '⎘  Copy Code'}
          </button>
        </div>

        {/* ── Players ─────────────────────────────────────── */}
        <div className="card mb12">
          <div className="row mb12">
            <div className="section-title">Players</div>
            <div className="spacer" />
            <span className="muted">{players.length} joined</span>
          </div>

          <div className="stack-sm">
            {players.map((p, i) => (
              <div key={p.id}
                className={`player-row${p.id === player.id ? ' is-me' : ''}`}>
                <div className="avatar"
                  style={{ background: AVATAR_COLORS[i % AVATAR_COLORS.length] }}>
                  {p.name[0].toUpperCase()}
                </div>
                <div className="player-name">{p.name}</div>
                {p.is_host          && <span className="player-badge badge-host">HOST</span>}
                {p.id === player.id && !p.is_host && <span className="player-badge badge-you">YOU</span>}
              </div>
            ))}
          </div>

          {players.length < 3 && (
            <p className="muted tc mt12" style={{ fontSize: 12 }}>
              Need at least <strong style={{ color: 'var(--accent)' }}>3 players</strong> to start
            </p>
          )}
        </div>

        {/* ── Category picker (host only) ──────────────────── */}
        {isHost && (
          <div className="card mb12">
            <div className="section-title mb16">Pick a Category</div>
            <div className="categories">
              {Object.entries(CATEGORIES).map(([key, cat]) => (
                <button key={key}
                  className={`cat-btn${selectedCat === key ? ' selected' : ''}`}
                  onClick={() => setSelectedCat(key)}>
                  <span className="cat-emoji">{cat.emoji}</span>
                  <span className="cat-name">{cat.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Actions ─────────────────────────────────────── */}
        {isHost ? (
          <button className="btn btn-primary" onClick={handleStart}
            disabled={!canStart || loading}>
            {loading ? 'Starting...' : 'Start Game →'}
          </button>
        ) : (
          <div className="waiting-msg">
            <div className="spinner" />
            Waiting for the host to start the game…
          </div>
        )}

      </div>
    </div>
  )
}
