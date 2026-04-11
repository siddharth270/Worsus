import { useState, useEffect, useCallback } from 'react'
import { supabase } from './supabaseClient'
import HomePage from './pages/HomePage'
import Lobby from './pages/Lobby'
import Game from './pages/Game'

export const AVATAR_COLORS = [
  '#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff',
  '#c77dff', '#ff9f1c', '#2ec4b6', '#e63946',
]

function genCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  return Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

export default function App() {
  const [view, setView]       = useState('home')  // 'home' | 'lobby' | 'game'
  const [room, setRoom]       = useState(null)
  const [player, setPlayer]   = useState(null)
  const [players, setPlayers] = useState([])
  const [hints, setHints]     = useState([])
  const [votes, setVotes]     = useState([])
  const [error, setError]     = useState('')

  /* ── Fetch helpers ──────────────────────────────────────────── */
  const fetchPlayers = useCallback(async (roomId) => {
    const { data } = await supabase
      .from('players').select('*').eq('room_id', roomId).order('joined_at')
    if (data) setPlayers(data)
  }, [])

  const fetchHints = useCallback(async (roomId) => {
    const { data } = await supabase
      .from('hints').select('*').eq('room_id', roomId).order('turn_index')
    if (data) setHints(data)
  }, [])

  const fetchVotes = useCallback(async (roomId) => {
    const { data } = await supabase
      .from('votes').select('*').eq('room_id', roomId)
    if (data) setVotes(data)
  }, [])

  /* ── Session restore on page reload ────────────────────────── */
  useEffect(() => {
    const pid = localStorage.getItem('worsus_player_id')
    const rid = localStorage.getItem('worsus_room_id')
    if (pid && rid) restoreSession(pid, rid)
  }, [])

  async function restoreSession(pid, rid) {
    const [{ data: p }, { data: r }] = await Promise.all([
      supabase.from('players').select('*').eq('id', pid).single(),
      supabase.from('rooms').select('*').eq('id', rid).single(),
    ])
    if (p && r && r.status !== 'ended') {
      setPlayer(p)
      setRoom(r)
      await fetchPlayers(rid)
      await fetchHints(rid)
      await fetchVotes(rid)
      setView(r.status === 'waiting' ? 'lobby' : 'game')
    } else {
      clearSession()
    }
  }

  /* ── Supabase Realtime ──────────────────────────────────────── */
  useEffect(() => {
    if (!room?.id) return

    const channel = supabase
      .channel(`room-${room.id}`)
      /* Room state changes */
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'rooms',
        filter: `id=eq.${room.id}`,
      }, (payload) => {
        const updated = payload.new
        setRoom(updated)
        if (updated.status === 'waiting') {
          setHints([])
          setVotes([])
          fetchPlayers(updated.id)
          setView('lobby')
        } else {
          setView('game')
        }
      })
      /* Player joins */
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'players',
        filter: `room_id=eq.${room.id}`,
      }, () => fetchPlayers(room.id))
      /* Player leaves */
      .on('postgres_changes', {
        event: 'DELETE', schema: 'public', table: 'players',
        filter: `room_id=eq.${room.id}`,
      }, () => fetchPlayers(room.id))
      /* New hint submitted */
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'hints',
        filter: `room_id=eq.${room.id}`,
      }, (payload) => {
        setHints(prev => {
          const exists = prev.some(h => h.id === payload.new.id)
          return exists ? prev : [...prev, payload.new]
        })
      })
      /* New vote submitted */
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'votes',
        filter: `room_id=eq.${room.id}`,
      }, (payload) => {
        setVotes(prev => {
          const exists = prev.some(v => v.id === payload.new.id)
          return exists ? prev : [...prev, payload.new]
        })
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [room?.id, fetchPlayers])

  /* ── Helpers ────────────────────────────────────────────────── */
  function clearSession() {
    localStorage.removeItem('worsus_player_id')
    localStorage.removeItem('worsus_room_id')
    setRoom(null); setPlayer(null); setPlayers([])
    setHints([]); setVotes([])
  }

  function saveSession(playerId, roomId) {
    localStorage.setItem('worsus_player_id', playerId)
    localStorage.setItem('worsus_room_id', roomId)
  }

  /* ── Actions: Home ──────────────────────────────────────────── */
  async function handleCreateRoom({ name }) {
    setError('')
    try {
      // Unique code
      let code, dup
      do {
        code = genCode()
        const { data } = await supabase.from('rooms').select('id').eq('code', code)
        dup = data?.length > 0
      } while (dup)

      const { data: r, error: re } = await supabase
        .from('rooms').insert({ code, status: 'waiting', game_state: {} })
        .select().single()
      if (re) throw re

      const color = AVATAR_COLORS[0]
      const { data: p, error: pe } = await supabase
        .from('players').insert({ room_id: r.id, name: name.trim(), is_host: true, avatar_color: color })
        .select().single()
      if (pe) throw pe

      saveSession(p.id, r.id)
      setRoom(r); setPlayer(p); setPlayers([p])
      setView('lobby')
    } catch (e) {
      setError('Could not create room. Please try again.')
      console.error(e)
    }
  }

  async function handleJoinRoom({ name, code }) {
    setError('')
    try {
      const { data: r, error: re } = await supabase
        .from('rooms').select('*').eq('code', code.toUpperCase()).single()
      if (re || !r) throw new Error('Room not found. Check the code and try again.')
      if (r.status !== 'waiting') throw new Error('Game already in progress — wait for next round.')

      const { data: existing } = await supabase.from('players').select('id').eq('room_id', r.id)
      const color = AVATAR_COLORS[(existing?.length || 0) % AVATAR_COLORS.length]

      const { data: p, error: pe } = await supabase
        .from('players').insert({ room_id: r.id, name: name.trim(), is_host: false, avatar_color: color })
        .select().single()
      if (pe) throw pe

      saveSession(p.id, r.id)
      setRoom(r); setPlayer(p)
      await fetchPlayers(r.id)
      setView('lobby')
    } catch (e) {
      setError(e.message || 'Could not join room.')
      console.error(e)
    }
  }

  /* ── Actions: Lobby ─────────────────────────────────────────── */
  async function handleStartGame({ category, word, chameleonId, playerOrder }) {
    await supabase.from('rooms').update({
      status: 'playing',
      game_state: {
        category, word,
        chameleon_id: chameleonId,
        player_order: playerOrder,
        current_turn: 0,
        round: 1,
        chameleon_caught: null,
        chameleon_guess: null,
        chameleon_guess_correct: null,
      },
    }).eq('id', room.id)
  }

  /* ── Actions: Game — hints ──────────────────────────────────── */
  async function handleSubmitHint({ hintText }) {
    const gs = room.game_state
    await supabase.from('hints').insert({
      room_id: room.id,
      player_id: player.id,
      player_name: player.name,
      hint: hintText,
      turn_index: gs.current_turn,
    })
    await supabase.from('rooms').update({
      game_state: { ...gs, current_turn: gs.current_turn + 1 },
    }).eq('id', room.id)
  }

  async function handleMoveToVoting() {
    await supabase.from('rooms').update({ status: 'voting' }).eq('id', room.id)
  }

  /* ── Actions: Game — voting ─────────────────────────────────── */
  async function handleSubmitVote({ votedForId, votedForName }) {
    await supabase.from('votes').insert({
      room_id: room.id,
      voter_id: player.id,
      voter_name: player.name,
      voted_for_id: votedForId,
      voted_for_name: votedForName,
    })
  }

  async function handleRevealResults() {
    const gs = room.game_state
    const chameleonId = gs.chameleon_id

    // Tally votes
    const counts = {}
    votes.forEach(v => { counts[v.voted_for_id] = (counts[v.voted_for_id] || 0) + 1 })

    let chameleonCaught = false
    if (Object.keys(counts).length > 0) {
      const maxV = Math.max(...Object.values(counts))
      const topIds = Object.keys(counts).filter(id => counts[id] === maxV)
      chameleonCaught = topIds.length === 1 && topIds[0] === chameleonId
    }

    if (chameleonCaught) {
      // Give chameleon a final guess
      await supabase.from('rooms').update({
        status: 'chameleon_guessing',
        game_state: { ...gs, chameleon_caught: true },
      }).eq('id', room.id)
    } else {
      // Chameleon escapes
      await supabase.from('rooms').update({
        status: 'results',
        game_state: { ...gs, chameleon_caught: false },
      }).eq('id', room.id)
    }
  }

  /* ── Actions: Game — chameleon guess ───────────────────────── */
  async function handleChameleonGuess({ guess }) {
    const gs = room.game_state
    const correct = guess.toLowerCase().trim() === gs.word.toLowerCase().trim()
    await supabase.from('rooms').update({
      status: 'results',
      game_state: { ...gs, chameleon_guess: guess, chameleon_guess_correct: correct },
    }).eq('id', room.id)
  }

  /* ── Actions: Play Again / Leave ────────────────────────────── */
  async function handlePlayAgain() {
    await supabase.from('hints').delete().eq('room_id', room.id)
    await supabase.from('votes').delete().eq('room_id', room.id)
    await supabase.from('rooms').update({
      status: 'waiting', game_state: {},
    }).eq('id', room.id)
    setHints([]); setVotes([])
    setView('lobby')
  }

  async function handleLeave() {
    if (player) await supabase.from('players').delete().eq('id', player.id)
    clearSession()
    setView('home')
  }

  /* ── Render ─────────────────────────────────────────────────── */
  return (
    <div className="app">
      {view === 'home' && (
        <HomePage
          onCreateRoom={handleCreateRoom}
          onJoinRoom={handleJoinRoom}
          error={error}
          setError={setError}
        />
      )}
      {view === 'lobby' && (
        <Lobby
          room={room}
          player={player}
          players={players}
          onStartGame={handleStartGame}
          onLeave={handleLeave}
        />
      )}
      {view === 'game' && (
        <Game
          room={room}
          player={player}
          players={players}
          hints={hints}
          votes={votes}
          onSubmitHint={handleSubmitHint}
          onMoveToVoting={handleMoveToVoting}
          onSubmitVote={handleSubmitVote}
          onRevealResults={handleRevealResults}
          onChameleonGuess={handleChameleonGuess}
          onPlayAgain={handlePlayAgain}
          onLeave={handleLeave}
        />
      )}
    </div>
  )
}
