CREATE TABLE IF NOT EXISTS matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player1_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  player2_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  problem_id TEXT NOT NULL,
  winner_id UUID REFERENCES users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'active', 'finished')),
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  winner_rating_delta INTEGER DEFAULT 0,
  loser_rating_delta INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS match_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  language TEXT NOT NULL,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
