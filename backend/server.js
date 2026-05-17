import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import { createServer } from 'http';
import { execSync } from 'node:child_process';
import jwt from 'jsonwebtoken';
import { Server } from 'socket.io';
import pool from './src/config/db.js';
import { getProblemById } from './src/battle/problems.js';
import authMiddleware from './src/middleware/auth.middleware.js';
import authRouter from './src/routes/auth.routes.js';
import { executeCode, find_match, calculateELO, getLeague } from './src/socket/utils.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const PORT = Number(process.env.PORT || 4000);
const JWT_SECRET = process.env.JWT_SECRET || 'versus-dev-secret';
const allowedOrigins = new Set(
  (process.env.ALLOWED_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
);
const io = new Server(httpServer, {
  cors: {
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.has(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error('Origin not allowed'));
    },
    credentials: true,
  },
});

const MATCH_RATING_DELTA = 25;
const MATCH_COUNTDOWN_MS = 3000;
const matchmakingQueue = [];
const activeMatches = new Map();
const socketToMatch = new Map();
const userSockets = new Map();
const pendingDisconnects = new Map();
const problems = [
  { id: 'two-sum', title: 'Two Sum (Indices)', difficulty: 'easy' },
  { id: 'valid-parentheses', title: 'Valid Parentheses', difficulty: 'easy' },
  { id: 'merge-intervals', title: 'Merge Intervals', difficulty: 'medium' },
];
const LANGUAGE_CONFIG = {
  python: { language: 'python', version: '3.10.0' },
  javascript: { language: 'javascript', version: '18.15.0' },
  cpp: { language: 'c++', version: '10.2.0' },
};

const removeFromQueue = (socketId) => {
  const index = matchmakingQueue.findIndex((entry) => entry.socketId === socketId);
  if (index !== -1) {
    matchmakingQueue.splice(index, 1);
    return true;
  }
  return false;
};

const addUserSocket = (userId, socketId) => {
  const socketSet = userSockets.get(userId) || new Set();
  socketSet.add(socketId);
  userSockets.set(userId, socketSet);
};

const removeUserSocket = (userId, socketId) => {
  const socketSet = userSockets.get(userId);
  if (!socketSet) {
    return;
  }

  socketSet.delete(socketId);
  if (socketSet.size === 0) {
    userSockets.delete(userId);
  }
};

const getAnySocketForUser = (userId) => {
  const socketSet = userSockets.get(userId);
  if (!socketSet || socketSet.size === 0) {
    return null;
  }

  return socketSet.values().next().value;
};

const getDisconnectKey = (matchId, userId) => {
  return `${matchId}:${userId}`;
};

const clearPendingDisconnect = (matchId, userId) => {
  const key = getDisconnectKey(matchId, userId);
  const timer = pendingDisconnects.get(key);
  if (timer) {
    clearTimeout(timer);
    pendingDisconnects.delete(key);
  }
};

const getRandomProblem = () => {
  const randomIndex = Math.floor(Math.random() * problems.length);
  return problems[randomIndex];
};

const getDisplayName = (email) => {
  return String(email || 'player').split('@')[0];
};

const buildMatchResultPayload = ({ matchData, winnerId, loserId, winnerDelta, loserDelta, newWinnerRating, newLoserRating, timeTaken }) => {
  const winnerName = winnerId === matchData.player1_id ? getDisplayName(matchData.player1_email) : getDisplayName(matchData.player2_email);
  const loserName = loserId === matchData.player1_id ? getDisplayName(matchData.player1_email) : getDisplayName(matchData.player2_email);

  return {
    winnerId,
    winnerName,
    loserName,
    winnerRatingDelta: winnerDelta,
    loserRatingDelta: loserDelta,
    newWinnerRating,
    newLoserRating,
    timeTaken,
  };
};

const finalizeMatchResult = async ({ matchId, submitterId, winnerId, loserId, matchData, reason }) => {
  const winnerRating = winnerId === matchData.player1_id ? matchData.player1_rating : matchData.player2_rating;
  const loserRating = loserId === matchData.player1_id ? matchData.player1_rating : matchData.player2_rating;

  const { newWinnerRating, newLoserRating, winnerDelta, loserDelta } = calculateELO(winnerRating, loserRating);

  await pool.query(
    `UPDATE matches
     SET status = 'finished', winner_id = $2, finished_at = NOW(),
         winner_rating_delta = $3, loser_rating_delta = $4
     WHERE id = $1`,
    [matchId, winnerId, winnerDelta, loserDelta]
  );

  await pool.query(
    `UPDATE users
     SET wins = wins + 1,
         rating = $2
     WHERE id = $1`,
    [winnerId, newWinnerRating]
  );

  await pool.query(
    `UPDATE users
     SET losses = losses + 1,
         rating = GREATEST($2, 100)
     WHERE id = $1`,
    [loserId, newLoserRating]
  );

  const startedAt = matchData.started_at ? new Date(matchData.started_at).getTime() : Date.now();
  const finishedAt = Date.now();
  const timeTaken = Math.max(0, Math.floor((finishedAt - startedAt) / 1000));

  const payload = buildMatchResultPayload({
    matchData,
    winnerId,
    loserId,
    winnerDelta,
    loserDelta,
    newWinnerRating,
    newLoserRating,
    timeTaken,
  });

  io.to(matchId).emit('match_result', payload);

  const submitterSocketId = getAnySocketForUser(submitterId);
  if (reason === 'disconnect' && submitterSocketId) {
    io.to(submitterSocketId).emit('opponent_disconnected', {
      matchId,
      message: 'Opponent disconnected. You win!',
      reason,
    });
  }

  activeMatches.delete(matchId);
  return payload;
};

const finishMatchWithWinner = async (match, winnerSocketId, loserSocketId, reason) => {
  if (!match || match.status === 'finished') {
    return;
  }

  match.status = 'finished';
  clearTimeout(match.startTimer);

  const winnerId = winnerSocketId === match.player1SocketId ? match.player1.id : match.player2.id;
  const loserId = loserSocketId === match.player1SocketId ? match.player1.id : match.player2.id;

  await finalizeMatchResult({
    matchId: match.id,
    submitterId: winnerId,
    winnerId,
    loserId,
    matchData: {
      ...match,
      player1_email: match.player1.email,
      player2_email: match.player2.email,
      player1_rating: match.player1.rating,
      player2_rating: match.player2.rating,
      started_at: match.startedAt,
    },
    reason,
  });

  clearPendingDisconnect(match.id, match.player1.id);
  clearPendingDisconnect(match.id, match.player2.id);

  socketToMatch.delete(match.player1SocketId);
  socketToMatch.delete(match.player2SocketId);
  activeMatches.delete(match.id);
};

const upsertActiveMatchCache = async (matchId) => {
  if (activeMatches.has(matchId)) {
    return activeMatches.get(matchId);
  }

  const result = await pool.query(
    `SELECT m.id,
            m.status,
            m.player1_id,
            m.player2_id,
            m.problem_id,
            m.started_at,
            p1.email AS player1_email,
            p1.rating AS player1_rating,
            p2.email AS player2_email,
            p2.rating AS player2_rating
     FROM matches m
     JOIN users p1 ON p1.id = m.player1_id
     JOIN users p2 ON p2.id = m.player2_id
     WHERE m.id = $1`,
    [matchId]
  );

  if (result.rowCount === 0) {
    return null;
  }

  const row = result.rows[0];
  const cachedMatch = {
    id: row.id,
    status: row.status,
    player1: {
      id: row.player1_id,
      email: row.player1_email,
      rating: row.player1_rating,
    },
    player2: {
      id: row.player2_id,
      email: row.player2_email,
      rating: row.player2_rating,
    },
    player1SocketId: getAnySocketForUser(row.player1_id),
    player2SocketId: getAnySocketForUser(row.player2_id),
    problem: getProblemById(row.problem_id),
    startTimer: null,
    startedAt: row.started_at,
  };

  activeMatches.set(matchId, cachedMatch);
  return cachedMatch;
};

const normalizeOutput = (value) => {
  return String(value || '').replace(/\r\n/g, '\n').trim();
};

const isTimeoutResponse = (executionResult) => {
  const stderr = String(executionResult?.run?.stderr || '').toLowerCase();
  const output = String(executionResult?.run?.output || '').toLowerCase();
  const statusDescription = String(executionResult?.run?.status?.description || '').toLowerCase();
  return (
    stderr.includes('timed out') ||
    output.includes('timed out') ||
    statusDescription.includes('time limit exceeded') ||
    executionResult?.run?.signal === 'SIGKILL'
  );
};

const tryMatchPlayers = async () => {
  let matchedPair = find_match(matchmakingQueue);

  while (matchedPair) {
    const [player1, player2] = matchedPair;
    removeFromQueue(player1.socketId);
    removeFromQueue(player2.socketId);

    const problem = getRandomProblem();
    const createdMatch = await pool.query(
      `INSERT INTO matches (player1_id, player2_id, problem_id, status)
       VALUES ($1, $2, $3, 'waiting')
       RETURNING id`,
      [player1.id, player2.id, problem.id]
    );

    const matchId = createdMatch.rows[0].id;
    const match = {
      id: matchId,
      status: 'waiting',
      player1,
      player2,
      player1SocketId: player1.socketId,
      player2SocketId: player2.socketId,
      problem,
      startTimer: null,
      startedAt: null,
    };

    activeMatches.set(matchId, match);
    socketToMatch.set(player1.socketId, matchId);
    socketToMatch.set(player2.socketId, matchId);

    const player1Socket = io.sockets.sockets.get(player1.socketId);
    const player2Socket = io.sockets.sockets.get(player2.socketId);
    if (player1Socket) {
      player1Socket.join(matchId);
    }
    if (player2Socket) {
      player2Socket.join(matchId);
    }

    io.to(player1.socketId).emit('match_found', {
      matchId,
      countdown: 3,
      opponent: {
        id: player2.id,
        email: player2.email,
        name: getDisplayName(player2.email),
        rating: player2.rating,
      },
    });

    io.to(player2.socketId).emit('match_found', {
      matchId,
      countdown: 3,
      opponent: {
        id: player1.id,
        email: player1.email,
        name: getDisplayName(player1.email),
        rating: player1.rating,
      },
    });

    match.startTimer = setTimeout(async () => {
      const liveMatch = activeMatches.get(matchId);
      if (!liveMatch || liveMatch.status !== 'waiting') {
        return;
      }

      await pool.query(
        `UPDATE matches
         SET status = 'active', started_at = NOW()
         WHERE id = $1`,
        [matchId]
      );

      liveMatch.status = 'active';
      liveMatch.startedAt = new Date().toISOString();

      io.to(liveMatch.player1SocketId).emit('match_start', {
        matchId,
        problem: liveMatch.problem,
        opponent: {
          id: liveMatch.player2.id,
          email: liveMatch.player2.email,
          name: getDisplayName(liveMatch.player2.email),
          rating: liveMatch.player2.rating,
        },
      });

      io.to(liveMatch.player2SocketId).emit('match_start', {
        matchId,
        problem: liveMatch.problem,
        opponent: {
          id: liveMatch.player1.id,
          email: liveMatch.player1.email,
          name: getDisplayName(liveMatch.player1.email),
          rating: liveMatch.player1.rating,
        },
      });
    }, MATCH_COUNTDOWN_MS);

    matchedPair = find_match(matchmakingQueue);
  }
};

io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) {
      return next(new Error('Missing auth token'));
    }

    const payload = jwt.verify(token, JWT_SECRET);
    const userResult = await pool.query(
      'SELECT id, email, rating FROM users WHERE id = $1',
      [payload.sub]
    );

    if (userResult.rowCount === 0) {
      return next(new Error('User not found'));
    }

    socket.user = userResult.rows[0];
    return next();
  } catch (_error) {
    return next(new Error('Unauthorized socket connection'));
  }
});

io.on('connection', (socket) => {
  addUserSocket(socket.user.id, socket.id);

  socket.on('join_queue', async () => {
    if (socketToMatch.has(socket.id)) {
      return;
    }

    const alreadyQueued = matchmakingQueue.some((entry) => entry.socketId === socket.id);
    if (!alreadyQueued) {
      matchmakingQueue.push({
        ...socket.user,
        socketId: socket.id,
        joinedAt: Date.now(),
      });
    }

    socket.emit('waiting', {
      message: 'Searching for opponent...',
      queueSize: matchmakingQueue.length,
    });

    try {
      await tryMatchPlayers();
    } catch (error) {
      socket.emit('match_error', { message: 'Failed to create match', error: error.message });
    }
  });

  socket.on('leave_queue', () => {
    const removed = removeFromQueue(socket.id);
    if (removed) {
      socket.emit('queue_left', { message: 'You left the queue' });
    }
  });

  socket.on('join_match_room', async (payload) => {
    const matchId = payload?.matchId;
    if (!matchId) {
      return;
    }

    try {
      const match = await upsertActiveMatchCache(matchId);
      if (!match) {
        socket.emit('match_error', { message: 'Match not found' });
        return;
      }

      const isParticipant =
        socket.user.id === match.player1.id || socket.user.id === match.player2.id;

      if (!isParticipant) {
        socket.emit('match_error', { message: 'You are not part of this match' });
        return;
      }

      socket.join(matchId);
      socketToMatch.set(socket.id, matchId);
      clearPendingDisconnect(matchId, socket.user.id);

      if (socket.user.id === match.player1.id) {
        match.player1SocketId = socket.id;
      }
      if (socket.user.id === match.player2.id) {
        match.player2SocketId = socket.id;
      }
    } catch (error) {
      socket.emit('match_error', { message: 'Unable to join match room', error: error.message });
    }
  });

  socket.on('disconnect', async () => {
    removeFromQueue(socket.id);
    removeUserSocket(socket.user.id, socket.id);

    const matchId = socketToMatch.get(socket.id);
    socketToMatch.delete(socket.id);
    if (!matchId) {
      return;
    }

    const match = activeMatches.get(matchId);
    if (!match || match.status === 'finished') {
      return;
    }

    const disconnectKey = getDisconnectKey(matchId, socket.user.id);
    clearPendingDisconnect(matchId, socket.user.id);

    const timer = setTimeout(async () => {
      pendingDisconnects.delete(disconnectKey);

      const isUserOnline = (userSockets.get(socket.user.id)?.size || 0) > 0;
      if (isUserOnline) {
        return;
      }

      const liveMatch = activeMatches.get(matchId);
      if (!liveMatch || liveMatch.status === 'finished') {
        return;
      }

      const winnerSocketId =
        socket.user.id === liveMatch.player1.id
          ? liveMatch.player2SocketId
          : liveMatch.player1SocketId;
      const loserSocketId =
        socket.user.id === liveMatch.player1.id
          ? liveMatch.player1SocketId
          : liveMatch.player2SocketId;

      try {
        await finishMatchWithWinner(liveMatch, winnerSocketId, loserSocketId, 'disconnect');
      } catch (error) {
        console.error('Failed to finish match after disconnect', error);
      }
    }, 7000);

    pendingDisconnects.set(disconnectKey, timer);
  });
});

app.use(cors());
app.use(express.json());

app.get('/', async (_req, res) => {
  res.json({
    message: 'Versus API is running',
    version: 'day-3',
    port: PORT,
  });
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', environment: process.env.NODE_ENV || 'development' })
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', environment: process.env.NODE_ENV || 'development' })
});

app.get('/match/:matchId', authMiddleware, async (req, res) => {
  const { matchId } = req.params;

  try {
    const result = await pool.query(
      `SELECT m.id,
              m.player1_id,
              m.player2_id,
              m.problem_id,
              m.winner_id,
              m.status,
              m.started_at,
              m.finished_at,
              p1.email AS player1_email,
              p1.rating AS player1_rating,
              p2.email AS player2_email,
              p2.rating AS player2_rating
       FROM matches m
       JOIN users p1 ON p1.id = m.player1_id
       JOIN users p2 ON p2.id = m.player2_id
       WHERE m.id = $1`,
      [matchId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Match not found' });
    }

    const match = result.rows[0];
    if (req.user.id !== match.player1_id && req.user.id !== match.player2_id) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const problem = getProblemById(match.problem_id);
    if (!problem) {
      return res.status(500).json({ message: 'Problem metadata missing' });
    }

    return res.json({
      match: {
        id: match.id,
        status: match.status,
        started_at: match.started_at,
        finished_at: match.finished_at,
        winner_id: match.winner_id,
        players: [
          {
            id: match.player1_id,
            email: match.player1_email,
            name: getDisplayName(match.player1_email),
            rating: match.player1_rating,
          },
          {
            id: match.player2_id,
            email: match.player2_email,
            name: getDisplayName(match.player2_email),
            rating: match.player2_rating,
          },
        ],
        problem: {
          id: problem.id,
          title: problem.title,
          difficulty: problem.difficulty,
          description: problem.description,
          samples: problem.samples,
        },
      },
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to load match', error: error.message });
  }
});

app.post('/submit', authMiddleware, async (req, res) => {
  const { matchId, code, language } = req.body;

  if (!matchId || !code || !language) {
    return res.status(400).json({ message: 'matchId, code and language are required' });
  }

  const languageConfig = LANGUAGE_CONFIG[language];
  if (!languageConfig) {
    return res.status(400).json({ message: 'Unsupported language' });
  }

  try {
    const matchResult = await pool.query(
      `SELECT m.id,
              m.player1_id,
              m.player2_id,
              m.problem_id,
              m.status,
              m.started_at,
              p1.email AS player1_email,
              p2.email AS player2_email
       FROM matches m
       JOIN users p1 ON p1.id = m.player1_id
       JOIN users p2 ON p2.id = m.player2_id
       WHERE m.id = $1`,
      [matchId]
    );

    if (matchResult.rowCount === 0) {
      return res.status(404).json({ message: 'Match not found' });
    }

    const match = matchResult.rows[0];
    if (req.user.id !== match.player1_id && req.user.id !== match.player2_id) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    if (match.status === 'finished') {
      return res.status(409).json({ message: 'Opponent already won' });
    }

    const problem = getProblemById(match.problem_id);
    if (!problem) {
      return res.status(500).json({ message: 'Problem metadata missing' });
    }

    const submitterId = req.user.id;
    const opponentId = submitterId === match.player1_id ? match.player2_id : match.player1_id;
    const submitterName = getDisplayName(req.user.email);
    const opponentName =
      submitterId === match.player1_id
        ? getDisplayName(match.player2_email)
        : getDisplayName(match.player1_email);

    const liveMatch = await upsertActiveMatchCache(matchId);
    if (liveMatch) {
      const submitterSocketId = getAnySocketForUser(submitterId);
      const opponentSocketId = getAnySocketForUser(opponentId);
      if (submitterId === liveMatch.player1.id) {
        liveMatch.player1SocketId = submitterSocketId;
        liveMatch.player2SocketId = opponentSocketId;
      } else {
        liveMatch.player2SocketId = submitterSocketId;
        liveMatch.player1SocketId = opponentSocketId;
      }
    }

    const opponentSocketId = getAnySocketForUser(opponentId);
    if (opponentSocketId) {
      io.to(opponentSocketId).emit('opponent_submitted', {
        matchId,
        message: 'Opponent is testing...',
      });
    }

    const submitterSocketId = getAnySocketForUser(submitterId);

    for (let index = 0; index < problem.testCases.length; index += 1) {
      const testCase = problem.testCases[index];
      let executionResult;

      // Emit progress update to both players
      const progressPayload = { current: index + 1, total: problem.testCases.length };
      if (submitterSocketId) {
        io.to(submitterSocketId).emit('submission_progress', progressPayload);
      }
      if (opponentSocketId) {
        io.to(opponentSocketId).emit('submission_progress', progressPayload);
      }

      try {
        executionResult = await executeCode(
          languageConfig.language,
          languageConfig.version,
          code,
          testCase.stdin
        );
      } catch (_error) {
        return res.status(503).json({ message: 'Code execution unavailable, try again' });
      }

      if (!executionResult) {
        return res.status(503).json({ message: 'Code execution unavailable, try again' });
      }

      const executionStatus = String(executionResult?.run?.status?.description || '').toLowerCase();
      if (executionStatus.includes('compile error')) {
        const payload = {
          verdict: 'CE',
          message: 'Compilation failed',
          details: normalizeOutput(executionResult?.run?.stderr || executionResult?.run?.output),
        };

        const submitterSocketId = getAnySocketForUser(submitterId);
        if (submitterSocketId) {
          io.to(submitterSocketId).emit('submission_result', payload);
        }

        return res.json(payload);
      }

      if (executionStatus.includes('runtime error')) {
        const payload = {
          verdict: 'RE',
          message: 'Runtime error',
          details: normalizeOutput(executionResult?.run?.stderr || executionResult?.run?.output),
        };

        const submitterSocketId = getAnySocketForUser(submitterId);
        if (submitterSocketId) {
          io.to(submitterSocketId).emit('submission_result', payload);
        }

        return res.json(payload);
      }

      if (isTimeoutResponse(executionResult)) {
        const payload = {
          verdict: 'TLE',
          failedCase: index + 1,
          output: normalizeOutput(executionResult?.run?.stdout),
          expected: normalizeOutput(testCase.expected),
        };

        const submitterSocketId = getAnySocketForUser(submitterId);
        if (submitterSocketId) {
          io.to(submitterSocketId).emit('submission_result', payload);
        }

        return res.json(payload);
      }

      const actualOutput = normalizeOutput(executionResult?.run?.stdout);
      const expectedOutput = normalizeOutput(testCase.expected);
      if (actualOutput !== expectedOutput) {
        const payload = {
          verdict: 'WA',
          failedCase: index + 1,
          output: actualOutput,
          expected: expectedOutput,
        };

        const submitterSocketId = getAnySocketForUser(submitterId);
        if (submitterSocketId) {
          io.to(submitterSocketId).emit('submission_result', payload);
        }

        return res.json(payload);
      }
    }

    const claimWin = await pool.query(
      `SELECT m.id, m.started_at, m.finished_at,
              p1.id AS player1_id, p1.rating AS player1_rating,
              p2.id AS player2_id, p2.rating AS player2_rating
       FROM matches m
       JOIN users p1 ON p1.id = m.player1_id
       JOIN users p2 ON p2.id = m.player2_id
       WHERE m.id = $1 AND m.status <> 'finished'`,
      [matchId]
    );

    if (claimWin.rowCount === 0) {
      return res.status(409).json({ message: 'Opponent already won' });
    }

    const matchData = claimWin.rows[0];
    const winnerId = submitterId;
    const loserId = opponentId;

    const winnerRating = submitterId === matchData.player1_id ? matchData.player1_rating : matchData.player2_rating;
    const loserRating = submitterId === matchData.player1_id ? matchData.player2_rating : matchData.player1_rating;

    const { newWinnerRating, newLoserRating, winnerDelta, loserDelta } = calculateELO(
      winnerRating,
      loserRating
    );

    await pool.query(
      `UPDATE matches
       SET status = 'finished', winner_id = $2, finished_at = NOW(),
           winner_rating_delta = $3, loser_rating_delta = $4
       WHERE id = $1`,
      [matchId, winnerId, winnerDelta, loserDelta]
    );

    await pool.query(
      `UPDATE users
       SET wins = wins + 1,
           rating = $2
       WHERE id = $1`,
      [winnerId, newWinnerRating]
    );

    await pool.query(
      `UPDATE users
       SET losses = losses + 1,
           rating = GREATEST($2, 100)
       WHERE id = $1`,
      [loserId, newLoserRating]
    );

    await pool.query(
      `INSERT INTO match_submissions (match_id, user_id, code, language)
       VALUES ($1, $2, $3, $4)`,
      [matchId, submitterId, code, language]
    );

    const finishRow = matchData;
    const startedAt = finishRow.started_at ? new Date(finishRow.started_at).getTime() : Date.now();
    const finishedAt = finishRow.finished_at ? new Date(finishRow.finished_at).getTime() : Date.now();
    const timeTaken = Math.max(0, Math.floor((finishedAt - startedAt) / 1000));

    const matchResultPayload = {
      winnerId: winnerId,
      winnerName: submitterName,
      loserName: opponentName,
      winnerRatingDelta: winnerDelta,
      loserRatingDelta: loserDelta,
      newWinnerRating,
      newLoserRating,
      timeTaken,
    };

    io.to(matchId).emit('match_result', matchResultPayload);
    activeMatches.delete(matchId);

    return res.json({ verdict: 'AC', ...matchResultPayload });
  } catch (error) {
    return res.status(500).json({ message: 'Submission failed', error: error.message });
  }
});

app.get('/execution/health', async (_req, res) => {
  // Check Judge0/Piston reachability
  let judge0Up = false;
  try {
    const controller = new AbortController();
    const r = await fetch(JUDGE0_API_URL.replace(/\/api\/.+$/, ''), { method: 'GET', signal: controller.signal, timeout: 3000 });
    judge0Up = r && r.ok;
  } catch (_e) {
    judge0Up = false;
  }

  // Check local runtimes
  const runtimes = { node: false, python: false, gpp: false };
  try {
    const nv = execSync('node --version', { stdio: 'pipe' }).toString().trim();
    runtimes.node = !!nv;
  } catch (_e) {
    runtimes.node = false;
  }

  try {
    const pv = execSync('python --version', { stdio: 'pipe' }).toString().trim();
    runtimes.python = !!pv;
  } catch (_e) {
    runtimes.python = false;
  }

  try {
    const gv = execSync('g++ --version', { stdio: 'pipe' }).toString().trim();
    runtimes.gpp = !!gv;
  } catch (_e) {
    runtimes.gpp = false;
  }

  return res.json({ judge0: judge0Up, local: runtimes });
});

app.post('/match/:matchId/give-up', authMiddleware, async (req, res) => {
  const { matchId } = req.params;

  try {
    const result = await pool.query(
      `SELECT m.id,
              m.player1_id,
              m.player2_id,
              m.problem_id,
              m.status,
              m.started_at,
              p1.email AS player1_email,
              p1.rating AS player1_rating,
              p2.email AS player2_email,
              p2.rating AS player2_rating
       FROM matches m
       JOIN users p1 ON p1.id = m.player1_id
       JOIN users p2 ON p2.id = m.player2_id
       WHERE m.id = $1`,
      [matchId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Match not found' });
    }

    const match = result.rows[0];
    if (req.user.id !== match.player1_id && req.user.id !== match.player2_id) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    if (match.status === 'finished') {
      return res.status(409).json({ message: 'Match already finished' });
    }

    const submitterId = req.user.id;
    const winnerId = submitterId === match.player1_id ? match.player2_id : match.player1_id;
    const loserId = submitterId;

    const winnerRating = winnerId === match.player1_id ? match.player1_rating : match.player2_rating;
    const loserRating = loserId === match.player1_id ? match.player1_rating : match.player2_rating;
    const { newWinnerRating, newLoserRating, winnerDelta, loserDelta } = calculateELO(
      winnerRating,
      loserRating
    );

    await pool.query(
      `UPDATE matches
       SET status = 'finished', winner_id = $2, finished_at = NOW(),
           winner_rating_delta = $3, loser_rating_delta = $4
       WHERE id = $1`,
      [matchId, winnerId, winnerDelta, loserDelta]
    );

    await pool.query(
      `UPDATE users
       SET wins = wins + 1,
           rating = $2
       WHERE id = $1`,
      [winnerId, newWinnerRating]
    );

    await pool.query(
      `UPDATE users
       SET losses = losses + 1,
           rating = GREATEST($2, 100)
       WHERE id = $1`,
      [loserId, newLoserRating]
    );

    const startedAt = match.started_at ? new Date(match.started_at).getTime() : Date.now();
    const timeTaken = Math.max(0, Math.floor((Date.now() - startedAt) / 1000));

    const payload = {
      winnerId,
      winnerName: winnerId === match.player1_id ? getDisplayName(match.player1_email) : getDisplayName(match.player2_email),
      loserName: getDisplayName(req.user.email),
      winnerRatingDelta: winnerDelta,
      loserRatingDelta: loserDelta,
      newWinnerRating,
      newLoserRating,
      timeTaken,
      reason: 'give_up',
    };

    io.to(matchId).emit('match_result', payload);
    activeMatches.delete(matchId);

    return res.json(payload);
  } catch (error) {
    return res.status(500).json({ message: 'Unable to give up match', error: error.message });
  }
});

app.get('/leaderboard', async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, email, rating, wins, losses, created_at,
              ROUND(wins * 100.0 / NULLIF(wins + losses, 0), 2) AS win_rate
       FROM users
       ORDER BY rating DESC
       LIMIT 20`
    );

    const leaderboard = result.rows.map((user, index) => ({
      rank: index + 1,
      id: user.id,
      name: user.email.split('@')[0],
      rating: user.rating,
      wins: user.wins,
      losses: user.losses,
      winRate: user.win_rate || 0,
      league: getLeague(user.rating),
    }));

    return res.json({ leaderboard });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to load leaderboard', error: error.message });
  }
});

app.get('/profile/:userId', async (req, res) => {
  const { userId } = req.params;

  try {
    const userResult = await pool.query(
      `SELECT id, email, rating, wins, losses, created_at
       FROM users
       WHERE id = $1`,
      [userId]
    );

    if (userResult.rowCount === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = userResult.rows[0];
    const matchesResult = await pool.query(
      `SELECT m.id, m.winner_id, m.status, m.started_at, m.finished_at,
              m.winner_rating_delta, m.loser_rating_delta, m.problem_id,
              CASE 
                WHEN m.player1_id = $1 THEN p2.email
                ELSE p1.email
              END AS opponent_email,
              CASE 
                WHEN m.player1_id = $1 THEN p2.rating
                ELSE p1.rating
              END AS opponent_rating
       FROM matches m
       JOIN users p1 ON p1.id = m.player1_id
       JOIN users p2 ON p2.id = m.player2_id
       WHERE (m.player1_id = $1 OR m.player2_id = $1) AND m.status = 'finished'
       ORDER BY m.finished_at DESC
       LIMIT 10`,
      [userId]
    );

    const matches = matchesResult.rows.map((match) => ({
      id: match.id,
      opponentName: match.opponent_email.split('@')[0],
      opponentRating: match.opponent_rating,
      problemId: match.problem_id,
      result: match.winner_id === userId ? 'WIN' : 'LOSS',
      ratingDelta: match.winner_id === userId ? match.winner_rating_delta : match.loser_rating_delta,
      finishedAt: match.finished_at,
    }));

    const totalMatches = user.wins + user.losses;
    const winRate = totalMatches > 0 ? Math.round((user.wins / totalMatches) * 100) : 0;

    return res.json({
      profile: {
        id: user.id,
        name: user.email.split('@')[0],
        email: user.email,
        rating: user.rating,
        wins: user.wins,
        losses: user.losses,
        winRate,
        league: getLeague(user.rating),
        totalMatches,
        joinedAt: user.created_at,
      },
      matchHistory: matches,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to load profile', error: error.message });
  }
});

app.get('/match/:matchId/result', authMiddleware, async (req, res) => {
  const { matchId } = req.params;

  try {
    const result = await pool.query(
      `SELECT m.id,
              m.player1_id,
              m.player2_id,
              m.problem_id,
              m.winner_id,
              m.status,
              m.started_at,
              m.finished_at,
              m.winner_rating_delta,
              m.loser_rating_delta,
              p1.email AS player1_email,
              p1.rating AS player1_rating,
              p2.email AS player2_email,
              p2.rating AS player2_rating
       FROM matches m
       JOIN users p1 ON p1.id = m.player1_id
       JOIN users p2 ON p2.id = m.player2_id
       WHERE m.id = $1`,
      [matchId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Match not found' });
    }

    const match = result.rows[0];
    if (req.user.id !== match.player1_id && req.user.id !== match.player2_id) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const problem = getProblemById(match.problem_id);
    const isWinner = req.user.id === match.winner_id;
    const winnerId = match.winner_id;
    const loserId = winnerId === match.player1_id ? match.player2_id : match.player1_id;
    const winnerEmail = winnerId === match.player1_id ? match.player1_email : match.player2_email;
    const loserEmail = winnerId === match.player1_id ? match.player2_email : match.player1_email;
    const winnerRating = winnerId === match.player1_id ? match.player1_rating : match.player2_rating;
    const loserRating = winnerId === match.player1_id ? match.player2_rating : match.player1_rating;

    const startedAt = match.started_at ? new Date(match.started_at).getTime() : Date.now();
    const finishedAt = match.finished_at ? new Date(match.finished_at).getTime() : Date.now();
    const timeTaken = Math.max(0, Math.floor((finishedAt - startedAt) / 1000));

    const submissionsResult = await pool.query(
      `SELECT user_id, code, language
       FROM match_submissions
       WHERE match_id = $1
       ORDER BY submitted_at DESC`,
      [matchId]
    );

    const submissions = {};
    submissionsResult.rows.forEach((sub) => {
      if (!submissions[sub.user_id]) {
        submissions[sub.user_id] = { code: sub.code, language: sub.language };
      }
    });

    return res.json({
      match: {
        id: match.id,
        status: match.status,
        winnerId,
        loserId,
        winner: {
          name: winnerEmail.split('@')[0],
          rating: winnerRating,
          ratingDelta: match.winner_rating_delta,
          code: submissions[winnerId]?.code || '',
          language: submissions[winnerId]?.language || 'python',
        },
        loser: {
          name: loserEmail.split('@')[0],
          rating: loserRating,
          ratingDelta: match.loser_rating_delta,
          code: submissions[loserId]?.code || '',
          language: submissions[loserId]?.language || 'python',
        },
        problem: {
          id: problem?.id,
          title: problem?.title,
          difficulty: problem?.difficulty,
        },
        timeTaken,
        finishedAt: match.finished_at,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to load match result', error: error.message });
  }
});

app.use('/auth', authRouter);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ message: 'Internal server error' });
});

httpServer.listen(PORT, () => {
  console.log(`Backend listening on http://localhost:${PORT}`);
});
