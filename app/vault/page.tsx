import { supabase, supabaseConfigured } from '@/lib/supabase'
import Empty from '@/app/_components/Empty'

// 🔒 Don't edit — this keeps your robot safe.
// The Vault reads private files and hands the browser SHORT-LIVED signed URLs,
// generated on the SERVER. The bucket is private, so a link works for ~1 hour
// and then dies — no file is ever public. Never expose storage_path directly.

export const dynamic = 'force-dynamic'

// How long each signed link stays valid (seconds). 1 hour = long enough to view,
// short enough that a copied link stops working soon after.
const SIGNED_URL_TTL = 3600

type VaultRow = {
  id: number
  sha256: string
  storage_path: string | null
  mime: string | null
  size_bytes: number | null
  record_id: number | null
  created_at: string
}

// One card's display data: the row + a fresh signed URL (or null if we couldn't make one).
type VaultCard = VaultRow & { url: string | null; isImage: boolean }

// Turn raw bytes into a friendly "1.2 MB" / "340 KB" string.
function prettySize(n: number | null): string {
  if (!n || n <= 0) return '—'
  if (n < 1024) return n + ' B'
  if (n < 1024 * 1024) return Math.round(n / 1024) + ' KB'
  return (n / (1024 * 1024)).toFixed(1) + ' MB'
}

// Read the filed files and mint a short-lived signed URL for each. Every step is
// guarded: an unconfigured Supabase, a read error, or a bad signed-URL call all
// degrade to a calm state — never a hang, never a 500.
async function getVaultCards(): Promise<{ cards: VaultCard[]; error: string | null }> {
  if (!supabaseConfigured) return { cards: [], error: null }

  const { data, error } = await supabase
    .from('vault_files')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[CFO] could not read vault_files:', error.message)
    return { cards: [], error: error.message }
  }

  const rows = (data ?? []) as VaultRow[]

  // Mint every signed URL in parallel (createSignedUrl is server-side only).
  const cards = await Promise.all(
    rows.map(async (r): Promise<VaultCard> => {
      const isImage = (r.mime ?? '').startsWith('image/')
      if (!r.storage_path) return { ...r, url: null, isImage }
      try {
        const { data: signed, error: signErr } = await supabase.storage
          .from('vault')
          .createSignedUrl(r.storage_path, SIGNED_URL_TTL)
        if (signErr) {
          console.error('[CFO] could not sign vault file:', signErr.message)
          return { ...r, url: null, isImage }
        }
        return { ...r, url: signed?.signedUrl ?? null, isImage }
      } catch (e) {
        console.error('[CFO] vault signing threw:', e)
        return { ...r, url: null, isImage }
      }
    }),
  )

  return { cards, error: null }
}

export default async function Vault() {
  const { cards, error } = await getVaultCards()

  return (
    <>
      <h1 className="ph">Vault 📸</h1>
      <p className="cap">Every receipt &amp; document your robot filed — shown via short-lived signed links.</p>

      {/* A read error (usually schema not run yet) — calm, plain English. */}
      {error ? (
        <div className="banner">
          ⚠️ Couldn&apos;t read your files: <b>{error}</b>. Make sure you ran{' '}
          <code>supabase/schema.sql</code> and used the <code>service_role</code> key.
        </div>
      ) : null}

      {cards.length === 0 && !error ? (
        <Empty label="filed photos or documents" />
      ) : (
        <div className="vgrid">
          {cards.map(c => (
            <div className="vcard" key={c.id}>
              {c.url && c.isImage ? (
                // Signed image → show the thumbnail. Opens the full file in a new tab.
                <a href={c.url} target="_blank" rel="noopener noreferrer" className="vthumb">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={c.url} alt={c.storage_path ?? 'filed file'} loading="lazy" />
                </a>
              ) : c.url ? (
                // Signed non-image (e.g. a PDF) → a document tile that opens the file.
                <a href={c.url} target="_blank" rel="noopener noreferrer" className="vthumb vdoc">
                  <span className="vdoc-ico" aria-hidden="true">📄</span>
                  <span className="vdoc-open">Open file</span>
                </a>
              ) : (
                // No signed link (missing path / bucket) → a calm placeholder, no broken image.
                <div className="vthumb vdoc vmissing">
                  <span className="vdoc-ico" aria-hidden="true">🗂️</span>
                  <span className="vdoc-open">Link unavailable</span>
                </div>
              )}
              <div className="vmeta">
                <p className="vm-mime">{c.mime ?? 'file'}</p>
                <p className="vm-sub">
                  {prettySize(c.size_bytes)}
                  {c.record_id ? ' · linked to a record' : ''}
                </p>
                <p className="vm-date">{new Date(c.created_at).toLocaleDateString('en-MY')}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
