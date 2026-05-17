import bcrypt from 'bcryptjs';
import pool from './src/config/db.js';
import { calculateELO, getLeague } from './src/socket/utils.js';
import { PROBLEMS } from './src/battle/problems.js';

const DEMO_PASSWORD = 'demo1234';

const fakeUsers = [
  { email: 'player1@vs.com', rating: 1200, wins: 5, losses: 3 },
  { email: 'player2@vs.com', rating: 1850, wins: 12, losses: 4 },
  { email: 'alice@vs.com', rating: 1450, wins: 8, losses: 6 },
  { email: 'bob@vs.com', rating: 1650, wins: 10, losses: 5 },
  { email: 'charlie@vs.com', rating: 2050, wins: 25, losses: 8 },
  { email: 'diana@vs.com', rating: 1100, wins: 3, losses: 9 },
  { email: 'evelyn@vs.com', rating: 1750, wins: 14, losses: 7 },
  { email: 'frank@vs.com', rating: 900, wins: 1, losses: 12 },
  { email: 'grace@vs.com', rating: 1600, wins: 11, losses: 6 },
  { email: 'henry@vs.com', rating: 1350, wins: 6, losses: 8 },
  { email: 'iris@vs.com', rating: 1950, wins: 20, losses: 5 },
  { email: 'jack@vs.com', rating: 1300, wins: 7, losses: 7 },
  { email: 'kate@vs.com', rating: 1500, wins: 9, losses: 5 },
  { email: 'leo@vs.com', rating: 1200, wins: 4, losses: 4 },
  { email: 'maya@vs.com', rating: 2100, wins: 30, losses: 10 },
];

const problemIds = Object.keys(PROBLEMS);

const seed = async () => {
  try {
    console.log('🌱 Starting database seed...');

    // Clear existing data
    await pool.query('DELETE FROM match_submissions');
    await pool.query('DELETE FROM matches');
    await pool.query('DELETE FROM users');

    // Insert fake users
    console.log('👥 Inserting fake users...');
    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
    const userIds = [];

    for (const user of fakeUsers) {
      const result = await pool.query(
        `INSERT INTO users (email, password_hash, rating, wins, losses)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        [user.email, passwordHash, user.rating, user.wins, user.losses]
      );
      userIds.push(result.rows[0].id);
    }

    console.log(`✅ Inserted ${userIds.length} users`);

    // Create 20 fake matches
    console.log('🎮 Creating fake matches...');
    const matchCount = 20;

    for (let i = 0; i < matchCount; i++) {
      const player1Index = Math.floor(Math.random() * userIds.length);
      let player2Index = Math.floor(Math.random() * userIds.length);
      while (player2Index === player1Index) {
        player2Index = Math.floor(Math.random() * userIds.length);
      }

      const player1Id = userIds[player1Index];
      const player2Id = userIds[player2Index];
      const problemId = problemIds[Math.floor(Math.random() * problemIds.length)];
      const winnerId = Math.random() > 0.5 ? player1Id : player2Id;

      // Get current ratings
      const player1Result = await pool.query(
        'SELECT rating FROM users WHERE id = $1',
        [player1Id]
      );
      const player2Result = await pool.query(
        'SELECT rating FROM users WHERE id = $1',
        [player2Id]
      );

      const player1Rating = player1Result.rows[0].rating;
      const player2Rating = player2Result.rows[0].rating;

      const { winnerDelta, loserDelta } = calculateELO(
        winnerId === player1Id ? player1Rating : player2Rating,
        winnerId === player1Id ? player2Rating : player1Rating
      );

      const startedAt = new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000);
      const finishedAt = new Date(startedAt.getTime() + Math.random() * 30 * 60 * 1000);

      const matchResult = await pool.query(
        `INSERT INTO matches (player1_id, player2_id, problem_id, winner_id, status, started_at, finished_at, winner_rating_delta, loser_rating_delta)
         VALUES ($1, $2, $3, $4, 'finished', $5, $6, $7, $8)
         RETURNING id`,
        [player1Id, player2Id, problemId, winnerId, startedAt, finishedAt, winnerDelta, loserDelta]
      );

      // Insert sample submission from winner
      const winnerLanguage = ['python', 'javascript', 'cpp'][Math.floor(Math.random() * 3)];
      await pool.query(
        `INSERT INTO match_submissions (match_id, user_id, code, language)
         VALUES ($1, $2, $3, $4)`,
        [
          matchResult.rows[0].id,
          winnerId,
          '# Sample solution code for ' + problemId,
          winnerLanguage,
        ]
      );
    }

    console.log(`✅ Created ${matchCount} matches`);

    // Update user stats based on matches
    console.log('📊 Updating user stats...');
    for (const userId of userIds) {
      const statsResult = await pool.query(
        `SELECT 
          COUNT(CASE WHEN winner_id = $1 THEN 1 END) as wins,
          COUNT(CASE WHEN (player1_id = $1 OR player2_id = $1) AND winner_id != $1 AND status = 'finished' THEN 1 END) as losses
         FROM matches
         WHERE (player1_id = $1 OR player2_id = $1) AND status = 'finished'`,
        [userId]
      );

      if (statsResult.rows[0]) {
        const { wins, losses } = statsResult.rows[0];
        await pool.query(
          `UPDATE users SET wins = $1, losses = $2 WHERE id = $3`,
          [wins, losses, userId]
        );
      }
    }

    console.log('✅ Updated user stats');
    console.log('🎉 Seed complete!');
    console.log('\n📝 Demo credentials:');
    console.log('  Email: player1@vs.com');
    console.log('  Email: player2@vs.com');
    console.log(`  Password: ${DEMO_PASSWORD}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  }
};

seed();
