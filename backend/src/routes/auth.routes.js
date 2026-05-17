import bcrypt from 'bcryptjs';
import express from 'express';
import jwt from 'jsonwebtoken';
import pool from '../config/db.js';
import authMiddleware from '../middleware/auth.middleware.js';

const router = express.Router();

const formatDbError = (error) => {
  if (!error) {
    return 'Unknown database error';
  }

  if (error.code === 'ECONNREFUSED') {
    return 'Database connection refused. Ensure PostgreSQL is running on the configured host/port.';
  }

  if (error.message) {
    return error.message;
  }

  return 'Database request failed';
};

const signToken = (user) => {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
    },
    process.env.JWT_SECRET || 'versus-dev-secret',
    { expiresIn: '1d' }
  );
};

router.post('/register', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  if (password.length < 8) {
    return res.status(400).json({ message: 'Password must be at least 8 characters long' });
  }

  try {
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rowCount > 0) {
      return res.status(409).json({ message: 'User already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const inserted = await pool.query(
      `INSERT INTO users (email, password_hash)
       VALUES ($1, $2)
       RETURNING id, email, rating, wins, losses, created_at`,
      [email, passwordHash]
    );

    const user = inserted.rows[0];
    const token = signToken(user);

    return res.status(201).json({ token, user });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to register user', error: formatDbError(error) });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  try {
    const result = await pool.query(
      'SELECT id, email, password_hash, rating, wins, losses, created_at FROM users WHERE email = $1',
      [email]
    );

    if (result.rowCount === 0) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const user = result.rows[0];
    const isValid = await bcrypt.compare(password, user.password_hash);

    if (!isValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = signToken(user);

    return res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        rating: user.rating,
        wins: user.wins,
        losses: user.losses,
        created_at: user.created_at,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to login', error: formatDbError(error) });
  }
});

router.get('/me', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, email, rating, wins, losses, created_at FROM users WHERE id = $1',
      [req.user.id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.json({ user: result.rows[0] });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch profile', error: formatDbError(error) });
  }
});

export default router;
