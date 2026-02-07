import pg from 'pg';
import 'dotenv/config';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function check() {
  try {
    const res = await pool.query(`SELECT DISTINCT '[' || sub_category || ']' as wrapped FROM products`);
    console.log('--- WRAPPED SUB-CATEGORIES ---');
    console.log(JSON.stringify(res.rows, null, 2));
    const count = await pool.query(`SELECT COUNT(*) FROM products WHERE sub_category = 'Kulkas'`);
    console.log('Count for "Kulkas":', count.rows[0].count);
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

check();
