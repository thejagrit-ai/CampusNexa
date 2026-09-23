import pg from 'pg';
import { readFile } from 'node:fs/promises';

const client = new pg.Client({
  connectionString: process.env.SUPABASE_DB_URL,
  ssl: { rejectUnauthorized: true, ca: await readFile(new URL('../secrets/supabase-ca.crt', import.meta.url), 'utf8') },
});
await client.connect();
const tables = await client.query("select table_name from information_schema.tables where table_schema = 'public' order by table_name");
for (const { table_name: table } of tables.rows) {
  const count = await client.query(`select count(*)::int as count from public.${pg.escapeIdentifier(table)}`);
  console.log(`${table}: ${count.rows[0].count}`);
}
await client.end();
