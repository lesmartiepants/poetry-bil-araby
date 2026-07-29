// Apply the v3 distillation schema migration, transactionally + idempotently.
// Runs the exact SQL from _applied_migration.sql (copied verbatim from the PR).
//   node backups/.../_apply_migration.cjs          # dry run (prints, no changes)
//   node backups/.../_apply_migration.cjs --apply  # apply in one transaction
const fs = require('fs');
const path = require('path');
require('dotenv').config({ quiet: true });
const { Pool } = require('pg');

const APPLY = process.argv.includes('--apply');
const SQL = fs.readFileSync(path.join(__dirname, '_applied_migration.sql'), 'utf8');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

(async () => {
  const client = await pool.connect();
  try {
    if (!APPLY) {
      console.log('DRY RUN — SQL to apply (idempotent):\n');
      console.log(SQL.split('\n').filter(l => l.trim() && !l.trim().startsWith('--')).join('\n'));
      console.log('\nPass --apply to run in a transaction.');
      return;
    }
    await client.query('BEGIN');
    await client.query(SQL);
    await client.query('COMMIT');
    console.log('MIGRATION APPLIED (committed).');
    // Verify
    const cols = (await client.query(`SELECT column_name FROM information_schema.columns
      WHERE table_name='category_dimensions' AND column_name IN ('min_labels','max_labels') ORDER BY 1`)).rows.map(r => r.column_name);
    console.log('new columns present:', cols.join(', '));
    const vals = (await client.query(`SELECT key, min_labels, max_labels FROM category_dimensions ORDER BY sort_order`)).rows;
    vals.forEach(v => console.log(`  ${v.key}: min=${v.min_labels} max=${v.max_labels}`));
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('ROLLED BACK:', e.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
})().catch(e => { console.error(e.message); process.exit(1); });
