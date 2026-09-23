import pg from 'pg';
import { readFile } from 'node:fs/promises';

const client = new pg.Client({
  connectionString: process.env.SUPABASE_DB_URL,
  ssl: { rejectUnauthorized: true, ca: await readFile(new URL('../secrets/supabase-ca.crt', import.meta.url), 'utf8') },
  connectionTimeoutMillis: 15000,
  statement_timeout: 30000,
});
await client.connect();
try {
  const exists = await client.query("select to_regclass('public.erp_records') is not null as exists");
  if (!exists.rows[0].exists) {
    const sql = await readFile(new URL('../supabase/migrations/20260923000100_erp_data.sql', import.meta.url), 'utf8');
    await client.query(sql);
    console.log('ERP data foundation applied.');
  } else console.log('ERP data foundation already exists; no changes applied.');
  const result = await client.query("select count(*)::int as records from public.erp_records");
  console.log(`ERP records currently stored: ${result.rows[0].records}`);
} finally { await client.end(); }
