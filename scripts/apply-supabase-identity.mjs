import pg from 'pg';
import { readFile } from 'node:fs/promises';

// Local administrator tool; never import this module into the frontend.
// Defaults to a read-only inspection. Pass --apply to install the identity schema.
const connectionString = process.env.SUPABASE_DB_URL;
if (!connectionString) {
  console.error('Set SUPABASE_DB_URL in .env.local.');
  process.exit(1);
}
const client = new pg.Client({
  connectionString,
  ssl: {
    rejectUnauthorized: true,
    ca: await readFile(new URL('../secrets/supabase-ca.crt', import.meta.url), 'utf8'),
  },
  connectionTimeoutMillis: 15000,
  statement_timeout: 30000,
});
try {
  await client.connect();
  const { rows } = await client.query("select tablename from pg_tables where schemaname = 'public' order by tablename");
  console.log('Connected to PostgreSQL. Public tables:', rows.map(row => row.tablename).join(', ') || '(none)');
  if (process.argv.includes('--apply')) {
    if (rows.some(row => ['profiles', 'organizations'].includes(row.tablename))) {
      throw Object.assign(new Error('Identity tables already exist; inspect their schema before applying this migration.'), { code: 'EXISTING_SCHEMA' });
    }
    const sql = await readFile(new URL('../supabase/migrations/20260922000100_identity.sql', import.meta.url), 'utf8');
    await client.query(sql);
    const result = await client.query("select relname, relrowsecurity from pg_class where oid in ('public.profiles'::regclass, 'public.organizations'::regclass)");
    if (result.rows.length !== 2 || result.rows.some(row => !row.relrowsecurity)) {
      throw Object.assign(new Error('Identity RLS verification failed.'), { code: 'RLS_CHECK_FAILED' });
    }
    console.log('Identity migration applied; row-level security enabled on both tables.');
  }
} catch (error) {
  // Connection error messages may contain connection details. Print only a safe code.
  console.error('Database operation failed:', error.code || 'CONNECTION_OR_SQL_ERROR');
  process.exitCode = 1;
} finally {
  await client.end().catch(() => {});
}
