import pg from 'pg';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';

const client = new pg.Client({
  connectionString: process.env.SUPABASE_DB_URL,
  ssl: { rejectUnauthorized: true, ca: await readFile(new URL('../secrets/supabase-ca.crt', import.meta.url), 'utf8') },
  connectionTimeoutMillis: 15000,
  statement_timeout: 15000,
});
if (!process.env.SUPABASE_DB_URL) throw new Error('Missing SUPABASE_DB_URL');
const first = randomUUID();
const second = randomUUID();
try {
  await client.connect();
  await client.query('begin');
  // Everything in this test is rolled back, including trigger-created profiles.
  await client.query(`insert into auth.users (id, raw_user_meta_data)
    values ($1, '{"full_name":"Migration test","role":"super_admin"}'::jsonb),
           ($2, '{}'::jsonb)`, [first, second]);
  const created = await client.query('select role from public.profiles where id = $1', [first]);
  assert.equal(created.rows[0].role, 'student', 'Signup must ignore privileged role metadata');
  await client.query("select set_config('request.jwt.claim.sub', $1, true)", [first]);
  await client.query('set local role authenticated');
  const visible = await client.query('select id from public.profiles');
  assert.deepEqual(visible.rows.map(row => row.id), [first], 'Student can read only own profile');
  const edited = await client.query("update public.profiles set full_name = 'Updated' where id = $1 returning full_name", [first]);
  assert.equal(edited.rows[0].full_name, 'Updated');
  await client.query('savepoint denied_write');
  let denied = false;
  try {
    await client.query("update public.profiles set role = 'super_admin' where id = $1", [first]);
  } catch (error) {
    denied = error.code === '42501';
    await client.query('rollback to savepoint denied_write');
  }
  assert.equal(denied, true, 'User role escalation must be denied');
  await client.query('reset role');
  const orgA = randomUUID();
  const orgB = randomUUID();
  await client.query("insert into public.organizations(id, name) values ($1, 'Test A'), ($2, 'Test B')", [orgA, orgB]);
  await client.query("update public.profiles set organization_id = $1, role = 'placement_officer' where id = $2", [orgA, first]);
  await client.query('update public.profiles set organization_id = $1 where id = $2', [orgA, second]);
  await client.query('set local role authenticated');
  assert.equal((await client.query('select id from public.profiles')).rows.length, 2);
  const deniedEdit = await client.query("update public.profiles set full_name = 'Forbidden' where id = $1 returning id", [second]);
  assert.equal(deniedEdit.rows.length, 0, 'Placement officers cannot edit another user');
  await client.query('reset role');
  await client.query('update public.profiles set organization_id = $1 where id = $2', [orgB, second]);
  await client.query('set local role authenticated');
  assert.equal((await client.query('select id from public.profiles')).rows.length, 1, 'Cross-organization profile reads must be blocked');
  await client.query('reset role');
  await client.query('set local role anon');
  await client.query('savepoint denied_read');
  let anonymousDenied = false;
  try { await client.query('select id from public.profiles'); }
  catch (error) {
    anonymousDenied = error.code === '42501';
    await client.query('rollback to savepoint denied_read');
  }
  assert.equal(anonymousDenied, true, 'Anonymous profile access must be denied');
  console.log('PASS: signup defaults, own-profile read/edit, role escalation denial, placement read-only access, organization isolation, anonymous denial.');
} catch (error) {
  console.error('Identity test failed:', error.code || error.message);
  process.exitCode = 1;
} finally {
  await client.query('rollback').catch(() => {});
  await client.end();
}
