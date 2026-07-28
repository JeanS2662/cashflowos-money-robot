// 🔒 Don't edit — this keeps your import safe.
// scripts/import.mjs — feed YOUR real business into your Money Robot.
//
// Pure Node (no extra installs). Works the SAME on Mac, Windows PowerShell, and Linux.
// Reads SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from your .env (via --env-file-if-exists).
//
// WHAT IT DOES (Day-1, Block 4 — "feed it my real business"):
//   1. Reads a CSV file  → `npm run import -- docs/sample-import.csv`
//      …or inline JSON    → `npm run import -- '[{"title":"...","category":"cash_in","amount":500}]'`
//      …or a .json file   → `npm run import -- my-rows.json`
//      (no argument at all → it imports the sample CSV so you can see it work)
//   2. Checks every row in plain English: title present? amount a real number?
//      date valid? category one we understand? Leads: which funnel stage?
//   3. Puts the GOOD rows into your `records` table.
//   4. Prints a friendly report — including EXACTLY why any row was skipped
//      ("row 7 skipped: amount 'abc' isn't a number").
//
// Nothing is ever deleted. Bad rows are skipped and reported, never guessed.

import { readFileSync } from 'node:fs'

// ------------------------------------------------------------
// 0) Read + clean the Supabase connection (same rules as lib/supabase.ts,
//    so the same copy-paste slips are forgiven here too).
// ------------------------------------------------------------
const url = (process.env.SUPABASE_URL ?? '')
  .trim()
  .replace(/\/+$/, '')
  .replace(/\/rest\/v\d+$/i, '')
const key = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? '').trim()

if (!url || !key || /YOUR-PROJECT|placeholder/i.test(url) || /placeholder/i.test(key)) {
  console.error(
    '\n⚠️  Your Supabase keys aren\'t set yet.\n' +
    '   Open your .env and fill in SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY\n' +
    '   (the O & E steps), then run this again. Nothing was imported.\n'
  )
  process.exit(1)
}

// ------------------------------------------------------------
// 1) The categories your app understands, and the everyday words that map to them.
//    Beginners won't type "cash_in" — they'll type "income" or "sale". We translate.
// ------------------------------------------------------------
const CATEGORY_MAP = {
  cash_in:  ['cash_in', 'cashin', 'income', 'revenue', 'sale', 'sales', 'payment', 'paid', 'invoice', 'money in', 'money_in'],
  cash_out: ['cash_out', 'cashout', 'expense', 'expenses', 'cost', 'spend', 'spending', 'bill', 'receipt', 'purchase', 'money out', 'money_out'],
  lead:     ['lead', 'leads', 'prospect', 'enquiry', 'inquiry'],
  customer: ['customer', 'customers', 'client', 'clients'],
  content:  ['content', 'post', 'posts', 'reel', 'video', 'ad', 'ads', 'marketing'],
  task:     ['task', 'tasks', 'todo', 'to-do', 'to do'],
  doc:      ['doc', 'docs', 'document', 'documents', 'file', 'files'],
}
// The lead funnel stages, in order (a lead's `status` moves down this ladder).
const LEAD_STAGES = ['new', 'contacted', 'appointment', 'closed', 'nurture']
// Friendly words → the real funnel stage.
const STAGE_MAP = {
  new: 'new', fresh: 'new', cold: 'new',
  contacted: 'contacted', reached: 'contacted', replied: 'contacted', warm: 'contacted',
  appointment: 'appointment', appt: 'appointment', meeting: 'appointment', demo: 'appointment', booked: 'appointment',
  closed: 'closed', won: 'closed', paid: 'closed', signed: 'closed',
  nurture: 'nurture', quiet: 'nurture', 'follow-up': 'nurture', followup: 'nurture', lost: 'nurture',
}

// Turn any spelling of a category into our canonical one, or null if we don't get it.
function canonCategory(raw) {
  const s = String(raw ?? '').trim().toLowerCase()
  if (!s) return null
  for (const [canon, words] of Object.entries(CATEGORY_MAP)) {
    if (words.includes(s)) return canon
  }
  return null
}

// The non-meta columns every record has. Anything else in the CSV goes into `meta`.
const CORE_COLS = new Set(['title', 'status', 'amount', 'category', 'due_date', 'notes'])

// ------------------------------------------------------------
// 2) A small, correct CSV reader (handles "quoted, commas", ""escaped quotes"",
//    and both \n and \r\n line endings — so a file saved on Windows Excel is fine).
// ------------------------------------------------------------
function parseCSV(text) {
  const rows = []
  let row = [], field = '', inQuotes = false
  // Strip a UTF-8 BOM (Excel loves to add one) so the first header isn't "﻿title".
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1)
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++ } // "" → one literal quote
        else inQuotes = false
      } else field += c
    } else if (c === '"') inQuotes = true
    else if (c === ',') { row.push(field); field = '' }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = '' }
    else if (c === '\r') { /* ignore — the \n handles the newline */ }
    else field += c
  }
  // flush the last field/row if the file didn't end with a newline
  if (field.length || row.length) { row.push(field); rows.push(row) }
  // drop fully-blank rows
  return rows.filter(r => r.some(cell => cell.trim() !== ''))
}

// CSV grid → array of {header: value} objects.
function csvToObjects(text) {
  const grid = parseCSV(text)
  if (grid.length < 2) return []
  const headers = grid[0].map(h => h.trim().toLowerCase())
  return grid.slice(1).map(cells => {
    const obj = {}
    headers.forEach((h, i) => { obj[h] = (cells[i] ?? '').trim() })
    return obj
  })
}

// ------------------------------------------------------------
// 3) Figure out what the participant gave us: a CSV path, a JSON file, or inline JSON.
// ------------------------------------------------------------
const arg = process.argv[2]
let rawRows = []
let sourceLabel = ''

try {
  if (!arg) {
    // No argument → import the shipped sample so a beginner can watch it work.
    sourceLabel = 'docs/sample-import.csv (the built-in sample — pass your own file to import real data)'
    rawRows = csvToObjects(readFileSync(new URL('../docs/sample-import.csv', import.meta.url), 'utf8'))
  } else if (arg.trim().startsWith('[') || arg.trim().startsWith('{')) {
    // Inline JSON on the command line.
    sourceLabel = 'the JSON you passed on the command line'
    const parsed = JSON.parse(arg)
    rawRows = Array.isArray(parsed) ? parsed : [parsed]
  } else if (arg.toLowerCase().endsWith('.json')) {
    sourceLabel = arg
    const parsed = JSON.parse(readFileSync(arg, 'utf8'))
    rawRows = Array.isArray(parsed) ? parsed : [parsed]
  } else {
    // Anything else = treat it as a path to a CSV file.
    sourceLabel = arg
    rawRows = csvToObjects(readFileSync(arg, 'utf8'))
  }
} catch (e) {
  console.error(
    `\n⚠️  Couldn't read "${arg}".\n` +
    `   ${e.message}\n` +
    '   Give me a CSV file path, a .json file, or JSON in quotes. Nothing was imported.\n'
  )
  process.exit(1)
}

if (!rawRows.length) {
  console.error('\n⚠️  That file had no data rows (just a header, or empty). Nothing to import.\n')
  process.exit(1)
}

// ------------------------------------------------------------
// 4) Validate every row. Good rows → `clean`. Bad rows → `skipped` with a plain reason.
// ------------------------------------------------------------
const clean = []
const skipped = []

// Is this a real, sane RM amount? (blank = 0 is fine; garbage = skip)
function parseAmount(raw) {
  if (raw === undefined || raw === null || String(raw).trim() === '') return { ok: true, value: 0 }
  // strip "RM", commas and spaces so "RM 1,200" reads as 1200
  const cleaned = String(raw).replace(/rm/i, '').replace(/[,\s]/g, '')
  const n = Number(cleaned)
  if (!Number.isFinite(n)) return { ok: false }
  if (n < 0) return { ok: false, reason: 'negative' }
  if (n > 1_000_000_000) return { ok: false, reason: 'too big' }
  return { ok: true, value: n }
}

// Is this a real date? Accept YYYY-MM-DD (what the DB wants) and forgive DD/MM/YYYY.
function parseDate(raw) {
  const s = String(raw ?? '').trim()
  if (!s) return { ok: true, value: null } // blank date is allowed
  let m
  if ((m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/))) {
    // already ISO
  } else if ((m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/))) {
    // DD/MM/YYYY → rebuild as ISO
    const [, d, mo, y] = m
    return isoIfReal(y, mo, d)
  } else {
    return { ok: false }
  }
  const [, y, mo, d] = m
  return isoIfReal(y, mo, d)
}
function isoIfReal(y, mo, d) {
  const iso = `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  const dt = new Date(iso + 'T00:00:00Z')
  if (Number.isNaN(dt.getTime())) return { ok: false }
  return { ok: true, value: iso }
}

rawRows.forEach((r, idx) => {
  const rowNum = idx + 2 // +1 for 0-index, +1 for the header line → matches what they see in Excel
  const lower = {}
  for (const [k, v] of Object.entries(r)) lower[String(k).trim().toLowerCase()] = v

  const title = String(lower.title ?? '').trim()
  if (!title) { skipped.push(`row ${rowNum} skipped: no title — every row needs a name`); return }

  const category = canonCategory(lower.category)
  if (!category) {
    skipped.push(
      `row ${rowNum} ("${title}") skipped: category "${lower.category ?? ''}" isn't one I know ` +
      `— use cash_in, cash_out, lead, customer, content, task, or doc`
    )
    return
  }

  const amt = parseAmount(lower.amount)
  if (!amt.ok) {
    const why = amt.reason ? `amount is ${amt.reason}` : `amount "${lower.amount}" isn't a number`
    skipped.push(`row ${rowNum} ("${title}") skipped: ${why}`)
    return
  }

  const date = parseDate(lower.due_date)
  if (!date.ok) {
    skipped.push(`row ${rowNum} ("${title}") skipped: date "${lower.due_date}" isn't a real date (use YYYY-MM-DD)`)
    return
  }

  // Status: for leads we normalise to a funnel stage so the Dashboard river fills in.
  let status = String(lower.status ?? '').trim()
  if (category === 'lead') {
    const stage = STAGE_MAP[status.toLowerCase()] || (LEAD_STAGES.includes(status.toLowerCase()) ? status.toLowerCase() : null)
    if (!stage) {
      // Don't skip a real lead over a fuzzy stage — default to 'new' and tell them.
      if (status) skipped.push(`note: row ${rowNum} ("${title}") — lead stage "${status}" not recognised, set to "new"`)
      status = 'new'
    } else status = stage
  }
  if (!status) status = category === 'cash_in' || category === 'cash_out' ? 'paid' : 'open'

  // Everything that ISN'T a core column becomes a meta field (customer, platform, views, next…).
  const meta = {}
  for (const [k, v] of Object.entries(lower)) {
    if (CORE_COLS.has(k) || v === '' || v === undefined || v === null) continue
    // numbers-looking meta (views, potential) stored as numbers so the funnel can sum them
    const n = Number(String(v).replace(/[,\s]/g, ''))
    meta[k] = (String(v).trim() !== '' && Number.isFinite(n) && /^\s*[\d,. ]+\s*$/.test(String(v))) ? n : v
  }

  clean.push({
    title,
    status,
    amount: amt.value,
    category,
    due_date: date.value,
    notes: String(lower.notes ?? '').trim() || null,
    meta,
  })
})

// ------------------------------------------------------------
// 5) Show the plan first (P3 promise: "show me what you'll import first").
// ------------------------------------------------------------
console.log(`\n📥 Importing from ${sourceLabel}`)
console.log(`   ${clean.length} row(s) look good · ${skipped.length} note(s)/skip(s).\n`)

if (clean.length) {
  console.log('   Will add:')
  for (const c of clean) {
    const money = c.amount ? ` · RM${c.amount.toLocaleString('en-MY')}` : ''
    console.log(`     • [${c.category}] ${c.title} (${c.status})${money}`)
  }
  console.log('')
}
if (skipped.length) {
  console.log('   Notes & skips (in plain English):')
  for (const s of skipped) console.log(`     ⚠️  ${s}`)
  console.log('')
}

if (!clean.length) {
  console.log('Nothing valid to import. Fix the notes above and run it again.\n')
  process.exit(0)
}

// ------------------------------------------------------------
// 6) Insert the good rows into `records` (one batch call to Supabase's REST API).
// ------------------------------------------------------------
try {
  const res = await fetch(`${url}/rest/v1/records`, {
    method: 'POST',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(clean),
    signal: AbortSignal.timeout(15000),
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    console.error(
      `\n⚠️  Supabase said no (HTTP ${res.status}). Nothing was imported.\n` +
      `   ${body.slice(0, 300)}\n` +
      '   Most common cause: the `records` table doesn\'t exist yet — paste supabase/schema.sql\n' +
      '   into the Supabase SQL Editor and click Run, then try again.\n'
    )
    process.exit(1)
  }
  console.log(`✅ Done — added ${clean.length} row(s) to your records table. Open your dashboard to see them.\n`)
} catch (e) {
  console.error(
    `\n⚠️  Couldn't reach Supabase (${e.message}). Nothing was imported.\n` +
    '   Check your internet + that SUPABASE_URL is the base URL (no /rest/v1). Then try again.\n'
  )
  process.exit(1)
}
