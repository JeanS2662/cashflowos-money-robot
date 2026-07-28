# Add Your Own Tab — the copy-paste prompt

> Used **twice** in class (Day 1 to add a tab to the ship, Day 2 to add YOUR business's tab).
> You paste ONE prompt into **Claude Code** inside your CashFlowOS repo. Claude interviews you, then builds it — the page, BOTH navs, and (optional) an automation.

---

## Why this is easy in CashFlowOS (the one-table pattern)

Your whole app is **one Supabase table: `records`**. Every tab is just a filtered view of it.

- A tab = `app/<name>/page.tsx` — a **server component** that reads `records` via `lib/records.ts` (`getRecords()`), then filters by **`category`**.
- The `records` table has a **`meta` jsonb** column → any custom field (commission %, owner, platform, SKU, reorder level…) lives in there with **NO schema change**. Read it with the `m(row, 'field')` helper.
- Money formats with `rm(amount)`; today's date is `todayISO()`.
- **Two navs, always kept in sync:**
  - `app/_components/Nav.tsx` — the **desktop sidebar** (the `TABS` array).
  - `app/_components/BottomNav.tsx` — the **phone bottom bar**: 4 `PRIMARY` thumb tabs + a `MORE` sheet for the rest.
  - **A tab added to only one nav is a bug** — it would show on desktop but vanish on phones (or the reverse), and CashFlowOS is a mobile-first app. The prompt below updates BOTH.

So "a new tab" = **filter `records` by a category + a page + two nav lines + (optional) a reminder.** Beginners do it in one prompt.

---

## ▶️ THE PROMPT — copy everything in the box into Claude Code (inside your CashFlowOS repo)

```
You're helping me add a NEW tab to my CashFlowOS app. FIRST read these files so you copy the
EXACT pattern already in the repo — do not invent your own:
  app/page.tsx                     (a real tab: reads getRecords(), filters, renders Stat cards)
  app/cash-in/page.tsx             (a simple tab shell)
  app/_components/Nav.tsx          (the desktop sidebar — the TABS array)
  app/_components/BottomNav.tsx    (the phone bottom bar — PRIMARY + MORE)
  app/_components/Stat.tsx         (the stat-card component + its props)
  lib/records.ts                   (getRecords, the Rec type, m(), rm(), todayISO())
  agents/registry.ts               (only if I want an automation)

Key facts about my app (do not fight these):
- ONE Supabase table: `records`. Every tab is a filtered view of it — a SERVER component
  (export const dynamic = 'force-dynamic') that calls getRecords() then filters in JS.
- `records` columns: title, status, amount, category, due_date, notes, meta (jsonb for ANY
  custom field), created_at. Use `category` to decide which rows belong on my tab; put custom
  fields in `meta` and read them with m(row,'field') — NO schema change, ever.
- Format money with rm(amount). Use rm/m/todayISO from lib/records — don't rewrite them.
- There are TWO navs and they MUST stay in sync:
    • app/_components/Nav.tsx      → add ONE line to the TABS array (desktop sidebar).
    • app/_components/BottomNav.tsx → add my tab to MORE (or, if it's a top-4 daily tab,
      swap it into PRIMARY and keep PRIMARY at ~4). This is what makes it show on phones.
  A tab added to only one nav is a BUG — do both.

Interview me ONE question at a time. Wait for my answer before the next:
1) What should the tab be called, and what emoji?  (e.g. Inventory 📦, Clients 👥, Bookings 📅)
2) What CATEGORY string should its rows use?  (a fresh one like 'inventory' or 'booking' — NOT
   one of the built-in ones cash_in/cash_out/lead/customer/content/task/doc, so my numbers
   don't bleed into the other tabs).
3) What do I want to SEE on it? — which fields to show as columns (custom ones like commission%,
   owner, platform, sku go in `meta`), and 2–4 Stat cards at the top (e.g. Total, Paid,
   Outstanding RM).
4) Any per-row detail or status I care about? (e.g. overdue flag, paid vs waiting) — optional.
5) What do I want to AUTOMATE about this tab? (optional) — a line in my daily Telegram brief
   (e.g. "3 items below reorder level", "2 bookings with deposit unpaid"), or "none".

Then BUILD it:
- Create app/<tab>/page.tsx following the EXACT pattern of my existing tabs: a server component,
  export const dynamic = 'force-dynamic', getRecords() → filter by my category → Stat cards +
  a simple table/cards. Reuse the Stat component and rm()/m() — match the existing className
  style (.ph, .cap, .grid, .empty); do NOT add Tailwind or a CSS framework.
- Add ONE line to the TABS array in app/_components/Nav.tsx.
- Add my tab to app/_components/BottomNav.tsx (MORE, or PRIMARY if it's a daily-glance tab).
- If I asked for an automation, extend the daily brief in app/api/cron-daily/route.ts using the
  existing pattern — do NOT add a new cron entry to vercel.json (Hobby allows only 2, and one
  slot is reserved on purpose).
- Give me the SQL to insert 3–5 example rows into `records` with my new category + meta, so the
  tab isn't empty when I open it.

Rules — do NOT:
- touch my other tabs, my .env, lib/supabase.ts, the service_role key, proxy.ts, or anything
  under agents/ marked 🔒 or the bot's safety/injection guard.
- turn a tab into a client-side fetch — every tab stays a SERVER component using the
  server-only Supabase client.
- add a second cron or a new database table.

When done: show me the diff, tell me exactly what to run to see it locally (npm run dev), and
how to put it live (git push → Vercel auto-deploys). Then remind me to run the example-rows SQL
in Supabase so the tab has data.

Ask me question 1 now.
```

---

## Stuck for ideas? Steal one (fill-in examples)

| Tab | `category` | `meta` fields | Automate (a line in your daily brief) |
|-----|-----------|---------------|----------------------------------------|
| **Inventory / Stock** 📦 | `inventory` | sku, qty, reorder_at | "items below reorder level" |
| **Clients** 👥 | `client` | tier, owner, renewal_date | "renewals due in 7 days" |
| **Bookings** 📅 | `booking` | date, pax, deposit_paid | "bookings with deposit not paid" |
| **Affiliates** 🤝 | `affiliate` | partner, commission%, paid | "affiliates not yet paid" |
| **Suppliers** 🚚 | `supplier` | terms, next_order | "supplier orders due this week" |
| **Projects** 🗂️ | `project` | client, phase, deadline | "projects past deadline" |

> **Inspiration tip:** screenshot a tool you already use (or the Dashboard tab), paste it into Claude Code, and say *"build me a CashFlowOS tab like this for my business, same one-table pattern."*

---

## Watch-for (the 5 things that go wrong)

1. **Only one nav updated** → tab shows on laptop but not on your phone (or vice-versa). Both `Nav.tsx` AND `BottomNav.tsx`. This is the #1 miss.
2. **Reusing a built-in category** (`cash_in`, `lead`, …) → your rows pollute the money/funnel numbers. Use a fresh category string.
3. **Forgot the example-rows SQL** → the tab renders the calm "Coming soon / nothing here yet" box. Run the insert in Supabase.
4. **Forgot to redeploy** → new tab isn't live. `git push` → Vercel auto-deploys.
5. **Made it a client component / added Tailwind** → don't. Server component + the existing hand-written CSS classes.
