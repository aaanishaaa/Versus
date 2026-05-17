import pool from '../src/config/db.js';

try {
  const result = await pool.query('SELECT COUNT(*)::int AS count FROM users');
  console.log('OK', result.rows[0]);
} catch (error) {
  console.log('ERROR_NAME', error?.name);
  console.log('ERROR_CODE', error?.code);
  console.log('ERROR_MESSAGE', error?.message);
  console.log('ERROR_DETAIL', error?.detail);
} finally {
  await pool.end();
}
