// Run: node --env-file=.env.local scripts/check-supabase.mjs
// Read-only: never print keys or returned user records.
import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL;
const anon = process.env.VITE_SUPABASE_ANON_KEY;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !anon || !service) {
  console.error('Missing Supabase URL, anon key, or server-side service key.');
  process.exit(1);
}
try {
  const health = await fetch(`${url}/auth/v1/health`, { headers: { apikey: anon } });
  if (!health.ok) throw new Error(`Auth health failed (${health.status}).`);
  console.log('Auth endpoint reachable.');
  const client = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
  let ready = true;
  for (const table of ['organizations', 'profiles']) {
    // GET with limit 0 validates the relation without fetching any personal data.
    const { error } = await client.from(table).select('id').limit(0);
    if (error) {
      ready = false;
      console.log(`${table}: unavailable (${error.code || 'request failed'}).`);
    } else console.log(`${table}: available.`);
  }
  console.log(ready ? 'Identity tables available; application migration still requires verification.' : 'Apply the identity SQL migration before switching authentication.');
  process.exitCode = ready ? 0 : 1;
} catch {
  console.error('Supabase connection check failed. Check project status and local credentials.');
  process.exitCode = 1;
}
