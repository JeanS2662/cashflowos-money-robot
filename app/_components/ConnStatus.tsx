import { supabase, supabaseConfigured, supabaseKeyRole } from '@/lib/supabase'

// Loud, friendly banner that tells a beginner WHICH layer is wrong — so a key
// problem never looks like an empty database. Server component (safe: no secrets
// reach the browser). Renders nothing once everything is wired correctly.
export default async function ConnStatus() {
  // 1) No Supabase at all yet (placeholder env) — the O & E steps.
  if (!supabaseConfigured) {
    return (
      <div className="banner">
        ⚠️ Supabase not connected — add <code>SUPABASE_URL</code> and{' '}
        <code>SUPABASE_SERVICE_ROLE_KEY</code> to your <code>.env</code> (the O &amp; E steps), then refresh.
        <br />On <b>Vercel</b>: add them in <b>Settings → Environment Variables</b>, then <b>Redeploy</b> — env changes don&apos;t apply to a deploy that already ran.
      </div>
    )
  }
  // 2) Wrong key (anon/publishable) — caught BEFORE we query, because anon can't
  //    read past RLS and would otherwise look like an empty database with no error.
  if (supabaseKeyRole() === 'anon') {
    return (
      <div className="banner">
        ⚠️ That looks like the <b>anon / publishable</b> key — the dashboard needs the{' '}
        <code>service_role</code> (secret) key. In Supabase: <b>Settings → API Keys → service_role → Reveal</b>,
        copy it into <code>SUPABASE_SERVICE_ROLE_KEY</code>, then redeploy.
      </div>
    )
  }
  // 3) Connected, but the query itself fails (usually schema not run yet).
  const { error } = await supabase.from('records').select('id').limit(1)
  if (error) {
    return (
      <div className="banner">
        ⚠️ Supabase rejected the request: <b>{error.message}</b>. Make sure you used the{' '}
        <code>service_role</code> key (not <code>publishable</code>/<code>anon</code>) and that you ran{' '}
        <code>supabase/schema.sql</code> in the SQL editor.
      </div>
    )
  }
  // 4) Everything reads fine, but the private `vault` Storage bucket is missing —
  //    the Photo/Vault agent needs it. Calm amber warning (the app still works).
  if (await vaultBucketMissing()) {
    return (
      <div className="banner warn">
        📸 The <code>vault</code> storage bucket isn&apos;t there yet — the Vault tab &amp; photo-filing need it.
        Create it in Supabase: <b>Storage → New bucket → name it <code>vault</code> → keep it Private</b>.
        (Running <code>supabase/schema.sql</code> tries to create it automatically; some projects need this one 2-click step.)
      </div>
    )
  }
  return null
}

// Best-effort check that the private `vault` bucket exists. Never throws — on any
// hiccup we stay quiet rather than nag with a false alarm.
async function vaultBucketMissing(): Promise<boolean> {
  try {
    const { data, error } = await supabase.storage.getBucket('vault')
    if (error) {
      // "not found" ⇒ genuinely missing; any other error ⇒ don't nag.
      return /not\s*found|does not exist|no such/i.test(error.message)
    }
    return !data
  } catch {
    return false
  }
}
