-- ================================================================
-- WORSUS — Supabase Schema
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ================================================================

-- Rooms table
CREATE TABLE IF NOT EXISTS rooms (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  code       TEXT        UNIQUE NOT NULL,
  status     TEXT        NOT NULL DEFAULT 'waiting',
  --  waiting | playing | voting | chameleon_guessing | results | ended
  game_state JSONB       NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Players table
CREATE TABLE IF NOT EXISTS players (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id      UUID        NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  name         TEXT        NOT NULL,
  is_host      BOOLEAN     NOT NULL DEFAULT FALSE,
  avatar_color TEXT        NOT NULL DEFAULT '#7c3aed',
  joined_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Hints table
CREATE TABLE IF NOT EXISTS hints (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id     UUID        NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  player_id   UUID        NOT NULL REFERENCES players(id),
  player_name TEXT        NOT NULL,
  hint        TEXT        NOT NULL,
  turn_index  INTEGER     NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Votes table
CREATE TABLE IF NOT EXISTS votes (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id        UUID        NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  voter_id       UUID        NOT NULL REFERENCES players(id),
  voted_for_id   UUID        NOT NULL REFERENCES players(id),
  voter_name     TEXT        NOT NULL,
  voted_for_name TEXT        NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(room_id, voter_id)   -- one vote per player per round
);

-- ================================================================
-- Enable Realtime
-- Also do this in: Dashboard → Database → Replication → enable
-- tables: rooms, players, hints, votes
-- ================================================================
ALTER PUBLICATION supabase_realtime ADD TABLE rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE players;
ALTER PUBLICATION supabase_realtime ADD TABLE hints;
ALTER PUBLICATION supabase_realtime ADD TABLE votes;

-- ================================================================
-- Disable RLS (this is a party game — no sensitive data)
-- For production: enable RLS and write appropriate policies
-- ================================================================
ALTER TABLE rooms   DISABLE ROW LEVEL SECURITY;
ALTER TABLE players DISABLE ROW LEVEL SECURITY;
ALTER TABLE hints   DISABLE ROW LEVEL SECURITY;
ALTER TABLE votes   DISABLE ROW LEVEL SECURITY;
