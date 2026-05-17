-- Demo credentials: demo1234 for both users
-- Hash generated with bcryptjs, salt rounds = 10
INSERT INTO users (email, password_hash, rating, wins, losses)
VALUES
  ('player1@vs.com', '$2a$10$e38EuwVtC4X.uHBoprOMIeXexf0WT0Zz5ht/BgyhAfh8Uvk84XNkW', 1200, 0, 0),
  ('player2@vs.com', '$2a$10$e38EuwVtC4X.uHBoprOMIeXexf0WT0Zz5ht/BgyhAfh8Uvk84XNkW', 1450, 0, 0)
ON CONFLICT (email) DO NOTHING;
