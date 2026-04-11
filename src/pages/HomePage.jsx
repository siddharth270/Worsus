import { useState } from 'react'

export default function HomePage({ onCreateRoom, onJoinRoom, error, setError }) {
  const [mode, setMode]       = useState(null)   // null | 'create' | 'join'
  const [name, setName]       = useState('')
  const [code, setCode]       = useState('')
  const [loading, setLoading] = useState(false)

  const back = () => { setMode(null); setError('') }

  const handleCreate = async () => {
    if (!name.trim() || loading) return
    setLoading(true)
    await onCreateRoom({ name })
    setLoading(false)
  }

  const handleJoin = async () => {
    if (!name.trim() || code.length !== 4 || loading) return
    setLoading(true)
    await onJoinRoom({ name, code })
    setLoading(false)
  }

  return (
    <div className="page">
      <div className="page-content">

        {/* ── Hero ──────────────────────────────────────────── */}
        <div className="tc" style={{ paddingTop: 64, paddingBottom: 40 }}>
          <div className="logo">
            WOR<span className="accent">S</span>US
          </div>
          <div className="logo-tagline">Find the chameleon among you</div>

          {/* chameleon art */}
          <div style={{
            fontSize: 72, margin: '24px 0 4px',
            filter: 'drop-shadow(0 0 18px rgba(163,255,71,0.35))',
            animation: 'blink 4s ease-in-out infinite',
          }}>🦎</div>
        </div>

        {/* ── Mode selection ────────────────────────────────── */}
        {!mode && (
          <div className="stack-lg" style={{ animation: 'fadeIn .35s ease' }}>
            <button className="home-option" onClick={() => setMode('create')}>
              <div className="home-option-icon">🏠</div>
              <div className="home-option-title">Create a Room</div>
              <div className="muted">Start a new game — share your 4-letter code with friends.</div>
            </button>

            <button className="home-option" onClick={() => setMode('join')}>
              <div className="home-option-icon">🚪</div>
              <div className="home-option-title">Join a Room</div>
              <div className="muted">Enter a room code to jump into your friends' game.</div>
            </button>

            <div className="tc" style={{ paddingTop: 12 }}>
              <p className="muted" style={{ fontSize: 12, lineHeight: 1.7 }}>
                A social deduction party game · 3–8 players
              </p>
            </div>
          </div>
        )}

        {/* ── Create form ───────────────────────────────────── */}
        {mode === 'create' && (
          <div className="card" style={{ animation: 'fadeIn .3s ease' }}>
            <button className="btn-ghost" style={{ marginBottom: 18, padding: 0, borderBottom: '1px solid var(--border)', paddingBottom: 16, width: '100%', textAlign: 'left' }}
              onClick={back}>← Back</button>

            <div className="section-title mb16">Create Room</div>
            <div className="stack">
              <div>
                <label className="label">Your Name</label>
                <input className="input" placeholder="How should we call you?" autoFocus
                  value={name} onChange={e => setName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleCreate()}
                  maxLength={20} />
              </div>
              {error && <div className="error-msg">{error}</div>}
              <button className="btn btn-primary" onClick={handleCreate} disabled={!name.trim() || loading}>
                {loading ? 'Creating...' : 'Create Room →'}
              </button>
            </div>
          </div>
        )}

        {/* ── Join form ─────────────────────────────────────── */}
        {mode === 'join' && (
          <div className="card" style={{ animation: 'fadeIn .3s ease' }}>
            <button className="btn-ghost" style={{ marginBottom: 18, padding: 0, borderBottom: '1px solid var(--border)', paddingBottom: 16, width: '100%', textAlign: 'left' }}
              onClick={back}>← Back</button>

            <div className="section-title mb16">Join Room</div>
            <div className="stack">
              <div>
                <label className="label">Your Name</label>
                <input className="input" placeholder="How should we call you?" autoFocus
                  value={name} onChange={e => setName(e.target.value)} maxLength={20} />
              </div>
              <div>
                <label className="label">Room Code</label>
                <input className="input input-code" placeholder="ABCD"
                  value={code}
                  onChange={e => setCode(e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4))}
                  onKeyDown={e => e.key === 'Enter' && handleJoin()}
                  maxLength={4} />
              </div>
              {error && <div className="error-msg">{error}</div>}
              <button className="btn btn-primary" onClick={handleJoin}
                disabled={!name.trim() || code.length !== 4 || loading}>
                {loading ? 'Joining...' : 'Join Room →'}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
