import { useState } from 'react'
import { CATEGORIES } from '../data/words'
import { AVATAR_COLORS } from '../App'

/* ─── Shared helpers ──────────────────────────────────────────── */
function avatarColor(players, pid) {
  const idx = players.findIndex(p => p.id === pid)
  return AVATAR_COLORS[Math.max(idx, 0) % AVATAR_COLORS.length]
}

function Av({ players, pid, size = 'md' }) {
  const p = players.find(x => x.id === pid)
  if (!p) return null
  const cls = size === 'sm' ? 'avatar avatar-sm' : size === 'lg' ? 'avatar avatar-lg' : 'avatar'
  return (
    <div className={cls} style={{ background: avatarColor(players, pid) }}>
      {p.name[0].toUpperCase()}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   PHASE 1 — PLAYING (hint giving)
═══════════════════════════════════════════════════════════════ */
function PlayingPhase({ room, player, players, hints, onSubmitHint, onMoveToVoting }) {
  const gs           = room.game_state
  const isCham       = player.id === gs.chameleon_id
  const isHost       = player.is_host
  const cat          = CATEGORIES[gs.category]
  const totalPlayers = gs.player_order?.length || 0
  const allDone      = gs.current_turn >= totalPlayers
  const curPid       = gs.player_order?.[gs.current_turn]
  const isMyTurn     = curPid === player.id
  const curName      = players.find(p => p.id === curPid)?.name || ''

  const [hint, setHint]           = useState('')
  const [submitting, setSubmitting] = useState(false)

  const submitHint = async () => {
    if (!hint.trim() || submitting) return
    if (hint.trim().toLowerCase() === gs.word.toLowerCase()) {
      alert("You can't say the exact word!")
      return
    }
    setSubmitting(true)
    await onSubmitHint({ hintText: hint.trim() })
    setHint('')
    setSubmitting(false)
  }

  return (
    <div className="stack-lg">

      {/* Chameleon alert */}
      {isCham && (
        <div className="cham-banner" style={{ animation: 'fadeIn .4s ease' }}>
          <span style={{ fontSize: 22 }}>🦎</span>
          <span className="cham-banner-text">You are the Chameleon</span>
          <span style={{ fontSize: 22 }}>🦎</span>
        </div>
      )}

      {/* Word card */}
      <div className={isCham ? 'card-danger word-card' : 'card-glow word-card'}>
        <div className="word-category">{cat?.emoji} &nbsp; {cat?.label}</div>
        <div className={`word-display${isCham ? ' cham' : ''}`}>
          {isCham ? '? ? ?' : gs.word}
        </div>
        {isCham && (
          <p className="muted mt8" style={{ fontSize: 13 }}>
            Blend in — give a hint that sounds like you know the word
          </p>
        )}
      </div>

      {/* Turn indicator */}
      {allDone ? (
        <div className="turn-bar" style={{ borderColor: 'rgba(163,255,71,.45)' }}>
          <span style={{ fontSize: 18 }}>✓</span>
          <div className="turn-text">All hints are in!</div>
        </div>
      ) : (
        <div className="turn-bar">
          <div className="turn-dot" />
          <div className="turn-text">
            {isMyTurn
              ? 'Your turn — give a hint'
              : <><em>{curName}</em> is giving a hint</>}
          </div>
        </div>
      )}

      {/* Player queue */}
      <div className="card">
        <div className="section-title mb12">Turn Order</div>
        <div className="stack-sm">
          {gs.player_order?.map((pid, i) => {
            const p      = players.find(x => x.id === pid)
            const done   = i < gs.current_turn
            const active = i === gs.current_turn && !allDone
            if (!p) return null
            return (
              <div key={pid}
                className={`player-row${pid === player.id ? ' is-me' : ''}${active ? ' is-active' : ''}`}
                style={{ opacity: done ? .45 : 1 }}>
                <Av players={players} pid={pid} size="sm" />
                <div className="player-name">{p.name}</div>
                {active && <span style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 700 }}>● NOW</span>}
                {done   && <span style={{ fontSize: 16 }}>✓</span>}
              </div>
            )
          })}
        </div>
      </div>

      {/* Hints given */}
      {hints.length > 0 && (
        <div className="card">
          <div className="section-title mb12">Hints So Far</div>
          {hints.map(h => (
            <div key={h.id} className="hint-item">
              <Av players={players} pid={h.player_id} size="sm" />
              <div>
                <div className="hint-text">"{h.hint}"</div>
                <div className="hint-player">
                  {h.player_name}{h.player_id === player.id ? ' (you)' : ''}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* My hint input */}
      {isMyTurn && !allDone && (
        <div className="card">
          <label className="label">Your hint — one word or short phrase</label>
          <div className="row mt8">
            <input className="input" style={{ flex: 1 }}
              placeholder={isCham ? 'Act like you know…' : 'Related to the word…'}
              value={hint}
              onChange={e => setHint(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && submitHint()}
              maxLength={60} autoFocus />
            <button className="btn btn-primary btn-sm" style={{ flexShrink: 0, width: 'auto' }}
              onClick={submitHint} disabled={!hint.trim() || submitting}>
              {submitting ? '…' : 'Send'}
            </button>
          </div>
        </div>
      )}

      {/* Host controls */}
      {isHost && allDone && (
        <button className="btn btn-primary" onClick={onMoveToVoting}>
          Move to Voting →
        </button>
      )}
      {isHost && !allDone && hints.length > 0 && (
        <button className="btn btn-secondary"
          style={{ opacity: .55, fontSize: 13 }}
          onClick={onMoveToVoting}>
          Skip remaining hints & go to voting
        </button>
      )}

    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   PHASE 2 — VOTING
═══════════════════════════════════════════════════════════════ */
function VotingPhase({ room, player, players, hints, votes, onSubmitVote, onRevealResults }) {
  const isHost    = player.is_host
  const myVote    = votes.find(v => v.voter_id === player.id)
  const allVoted  = votes.length >= players.length

  const [selected, setSelected]   = useState(myVote?.voted_for_id || null)
  const [submitting, setSubmitting] = useState(false)

  const voteCount = pid => votes.filter(v => v.voted_for_id === pid).length

  const castVote = async (pid, name) => {
    if (myVote || submitting) return
    setSelected(pid)
    setSubmitting(true)
    await onSubmitVote({ votedForId: pid, votedForName: name })
    setSubmitting(false)
  }

  return (
    <div className="stack-lg">

      {/* Header */}
      <div className="card-gold tc" style={{ padding: '28px 24px' }}>
        <div style={{ fontSize: 44, marginBottom: 10 }}>🕵️</div>
        <div className="section-title">Who's the Chameleon?</div>
        <p className="muted mt8">
          {votes.length} / {players.length} players have voted
        </p>
      </div>

      {/* Hints recap */}
      <div className="card">
        <div className="section-title mb12">All Hints</div>
        {hints.length === 0
          ? <p className="muted" style={{ fontSize: 13 }}>No hints were given.</p>
          : hints.map(h => (
            <div key={h.id} className="hint-item">
              <Av players={players} pid={h.player_id} size="sm" />
              <div>
                <div className="hint-text">"{h.hint}"</div>
                <div className="hint-player">{h.player_name}</div>
              </div>
            </div>
          ))}
      </div>

      {/* Vote buttons (pre-vote) */}
      {!myVote && (
        <div className="card">
          <div className="section-title mb12">Cast Your Vote</div>
          <p className="muted mb12" style={{ fontSize: 13 }}>
            You cannot vote for yourself.
          </p>
          <div className="stack-sm">
            {players.filter(p => p.id !== player.id).map(p => (
              <button key={p.id}
                className={`vote-btn${selected === p.id ? ' voted' : ''}`}
                onClick={() => castVote(p.id, p.name)}
                disabled={!!myVote || submitting}>
                <div className="avatar avatar-sm" style={{ background: avatarColor(players, p.id) }}>
                  {p.name[0].toUpperCase()}
                </div>
                {p.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Live tally (post-vote) */}
      {myVote && (
        <div className="card">
          <div className="section-title mb16">Live Tally</div>
          <div className="stack">
            {[...players].sort((a, b) => voteCount(b.id) - voteCount(a.id)).map(p => (
              <div key={p.id}>
                <div className="row mb8">
                  <Av players={players} pid={p.id} size="sm" />
                  <span style={{ fontSize: 14, fontWeight: 600, flex: 1 }}>
                    {p.name}
                  </span>
                  <span className="vote-count">{voteCount(p.id)}</span>
                </div>
                <div className="row mb4">
                  <div className="vote-bar-bg">
                    <div className="vote-bar-fill"
                      style={{ width: votes.length > 0 ? `${(voteCount(p.id) / votes.length) * 100}%` : '0%' }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {myVote && (
        <div className="waiting-msg">
          <div className="spinner" />
          You voted for <strong style={{ color: 'var(--text-bright)', marginLeft: 4 }}>{myVote.voted_for_name}</strong>
        </div>
      )}

      {isHost && (
        <button className="btn btn-primary" onClick={onRevealResults}>
          {allVoted ? 'Reveal Results →' : 'End Voting & Reveal →'}
        </button>
      )}

    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   PHASE 3 — CHAMELEON GUESSING (final chance)
═══════════════════════════════════════════════════════════════ */
function ChameleonGuessingPhase({ room, player, players, onChameleonGuess }) {
  const gs      = room.game_state
  const isCham  = player.id === gs.chameleon_id
  const chamP   = players.find(p => p.id === gs.chameleon_id)
  const cat     = CATEGORIES[gs.category]

  const [guess, setGuess]         = useState('')
  const [submitting, setSubmitting] = useState(false)

  const submit = async () => {
    if (!guess.trim() || submitting) return
    setSubmitting(true)
    await onChameleonGuess({ guess: guess.trim() })
    setSubmitting(false)
  }

  return (
    <div className="stack-lg">

      <div className="card-danger reveal-card">
        <span className="reveal-emoji">🦎</span>
        <div className="reveal-title" style={{ color: 'var(--danger)' }}>Chameleon Caught!</div>
        <div className="reveal-subtitle">
          <strong>{chamP?.name}</strong> was identified as the Chameleon.
        </div>
        <p className="muted mt8" style={{ fontSize: 13 }}>
          One last chance — can they guess the secret word?
        </p>
      </div>

      {isCham ? (
        <div className="card">
          <div className="section-title mb8">Guess the Secret Word</div>
          <div className="muted mb16" style={{ fontSize: 14 }}>
            Category: {cat?.emoji} {cat?.label}
          </div>
          <div className="row">
            <input className="input" style={{ flex: 1 }}
              placeholder="What do you think the word was?"
              value={guess} onChange={e => setGuess(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && submit()}
              autoFocus maxLength={60} />
            <button className="btn btn-danger btn-sm"
              style={{ flexShrink: 0, width: 'auto' }}
              onClick={submit} disabled={!guess.trim() || submitting}>
              {submitting ? '…' : 'Guess!'}
            </button>
          </div>
        </div>
      ) : (
        <div className="waiting-msg">
          <div className="spinner" />
          <span><strong>{chamP?.name}</strong> is making their final guess…</span>
        </div>
      )}

    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   PHASE 4 — RESULTS
═══════════════════════════════════════════════════════════════ */
function ResultsPhase({ room, player, players, votes, onPlayAgain, onLeave }) {
  const gs     = room.game_state
  const isHost = player.is_host
  const chamP  = players.find(p => p.id === gs.chameleon_id)
  const cat    = CATEGORIES[gs.category]

  // Determine outcome
  const caught   = gs.chameleon_caught
  const correct  = gs.chameleon_guess_correct
  let winEmoji, winTitle, winCard
  if (!caught) {
    winEmoji = '🦎'; winTitle = 'Chameleon Wins!'; winCard = 'card-danger'
  } else if (correct) {
    winEmoji = '🎉'; winTitle = 'Chameleon Saves Themselves!'; winCard = 'card-danger'
  } else {
    winEmoji = '🏆'; winTitle = 'Players Win!'; winCard = 'card-glow'
  }

  const voteCount = pid => votes.filter(v => v.voted_for_id === pid).length
  const maxVotes  = Math.max(...players.map(p => voteCount(p.id)), 1)

  return (
    <div className="stack-lg">

      {/* Winner banner */}
      <div className={`${winCard} reveal-card`}>
        <span className="reveal-emoji">{winEmoji}</span>
        <div className="reveal-title">{winTitle}</div>
        {gs.chameleon_guess && (
          <div className="mt12" style={{ fontSize: 15 }}>
            <span className="muted">Chameleon guessed: </span>
            <strong style={{ color: correct ? 'var(--accent)' : 'var(--danger)' }}>
              "{gs.chameleon_guess}"
            </strong>
            <span style={{ marginLeft: 4 }}>{correct ? '✓' : '✗'}</span>
          </div>
        )}
      </div>

      {/* The chameleon was... */}
      <div className="card tc">
        <div className="label mb16">The Chameleon Was…</div>
        <div className="row" style={{ justifyContent: 'center', gap: 16 }}>
          <Av players={players} pid={gs.chameleon_id} size="lg" />
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--danger)' }}>
              {chamP?.name}
            </div>
            <div className="muted mt4">The Chameleon 🦎</div>
          </div>
        </div>
        <hr className="divider" />
        <div className="label mb8">The Secret Word Was</div>
        <div className="word-display">{gs.word}</div>
        <div className="muted mt4" style={{ fontSize: 13 }}>
          {cat?.emoji} {cat?.label}
        </div>
      </div>

      {/* Vote breakdown */}
      <div className="card">
        <div className="section-title mb16">Vote Breakdown</div>
        <div className="stack">
          {[...players]
            .sort((a, b) => voteCount(b.id) - voteCount(a.id))
            .map(p => (
              <div key={p.id}>
                <div className="row mb8">
                  <Av players={players} pid={p.id} size="sm" />
                  <span style={{
                    fontSize: 14, fontWeight: 600, flex: 1,
                    color: p.id === gs.chameleon_id ? 'var(--danger)' : 'var(--text-bright)',
                  }}>
                    {p.name} {p.id === gs.chameleon_id ? '🦎' : ''}
                  </span>
                  <span className="vote-count">
                    {voteCount(p.id)} vote{voteCount(p.id) !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="row mb8" style={{ gap: 8 }}>
                  <div className="vote-bar-bg">
                    <div
                      className={`vote-bar-fill${p.id === gs.chameleon_id ? ' danger' : ''}`}
                      style={{ width: `${(voteCount(p.id) / maxVotes) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Actions */}
      <div className="stack-sm">
        {isHost ? (
          <button className="btn btn-primary" onClick={onPlayAgain}>
            Play Again
          </button>
        ) : (
          <div className="waiting-msg">
            <div className="spinner" />
            Waiting for the host to start a new round…
          </div>
        )}
        <button className="btn btn-secondary" onClick={onLeave}>
          Leave Room
        </button>
      </div>

    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   ROOT GAME COMPONENT
═══════════════════════════════════════════════════════════════ */
export default function Game({
  room, player, players, hints, votes,
  onSubmitHint, onMoveToVoting,
  onSubmitVote, onRevealResults,
  onChameleonGuess, onPlayAgain, onLeave,
}) {
  const status = room.status

  const phaseLabel = {
    playing:           'Giving Hints',
    voting:            'Voting',
    chameleon_guessing:'Final Guess',
    results:           'Results',
  }[status] || status

  const phaseClass = {
    playing:           'phase-playing',
    voting:            'phase-voting',
    chameleon_guessing:'phase-guessing',
    results:           'phase-results',
  }[status] || ''

  return (
    <div className="page">
      <div className="page-content">

        {/* ── Header ──────────────────────────────────────── */}
        <div className="row" style={{ paddingTop: 28, marginBottom: 20 }}>
          <div className="logo-sm">WOR<span className="accent">S</span>US</div>
          <div className="spacer" />
          <span className={`phase-pill ${phaseClass}`}>{phaseLabel}</span>
        </div>

        {status === 'playing' && (
          <PlayingPhase
            room={room} player={player} players={players} hints={hints}
            onSubmitHint={onSubmitHint} onMoveToVoting={onMoveToVoting}
          />
        )}
        {status === 'voting' && (
          <VotingPhase
            room={room} player={player} players={players}
            hints={hints} votes={votes}
            onSubmitVote={onSubmitVote} onRevealResults={onRevealResults}
          />
        )}
        {status === 'chameleon_guessing' && (
          <ChameleonGuessingPhase
            room={room} player={player} players={players}
            onChameleonGuess={onChameleonGuess}
          />
        )}
        {status === 'results' && (
          <ResultsPhase
            room={room} player={player} players={players} votes={votes}
            onPlayAgain={onPlayAgain} onLeave={onLeave}
          />
        )}

        <div style={{ height: 48 }} />
      </div>
    </div>
  )
}
