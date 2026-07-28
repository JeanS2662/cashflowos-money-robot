# CashFlowOS AI Agents — V2 BUILD SPEC
*The build contract for V2. New repo, new link. `cashflowos-starter` (the class repo, tag `class-jul-2026`) is FROZEN — never touched by this build.*

---

## 0 · Ground rules

| Rule | Detail |
|---|---|
| **New repo** | `claude-malaysia-glcc/cashflowos-ai-agents` — template-enabled. Bootstrap = copy of `cashflowos-starter` @ `class-jul-2026` with `.git` stripped, fresh history. |
| **Don't touch V1** | No commits, tag moves, or file edits in `cashflowos-starter`. The Jul 28-29 class clones V1. |
| **Safety core is sacred** | CAS claim, upsert-propose, ack-first webhook, fail-closed cron, passcode/proxy — carried over verbatim. V2 builds ON the approval engine, never around it. |
| **New Vercel deploy** | Own project → own link. The old `money-robot.vercel.app` is a third-party build; ignore it. |

## 1 · Rename → **CashFlowOS AI Agents**
Everywhere: `layout.tsx` header/titles, `manifest.ts` (PWA name + short_name "CashFlowOS"), `login/page.tsx`, README, bot greeting + /help card, morning-brief signature, `package.json` name. "Money Robot" survives only as teaching nickname inside docs copy.

## 2 · Brand → claudemalaysia.com/brand (canonical tokens)
Swap `globals.css` palette to the brand's drop-in tokens (source of truth: claudemalaysia `lib/brand/tokens.ts` / `public/brand/brand.css`):

```
--paper #FAF7F2 · --paper-2 #F2EBDF · --card #FFFDF9
--ink #211C16 · --ink-soft #5F564B · --ink-faint #978C7B
--clay #D97757 (primary) · --clay-deep #BE5C3B (hover) · --clay-tint rgba(217,119,87,.12)
--line rgba(33,28,22,.10)
zones: 🟢 --sage #4B7A5A · 🟡 --honey #B6802A · 🔴 --rust #A9533F
radius: 8/13/20/28/pill · fonts: Hanken-style sans via system stack (no font files)
```
Dark-header/cream-body composition like EventOps is fine; the ratios rule: ~60% paper / 25% ink / 12% clay / 3% accent.

## 3 · Dashboard shell — grouped sidebar + real mobile nav
Carried from V1 (Nav + BottomNav exist); V2 polish:
- **Desktop sidebar groups** (EventOps-style section labels):
  `OVERVIEW` Dashboard · `MONEY` Cash In, Cash Out · `PIPELINE` Leads, Customers · `WORK` Content, Tasks · `ROBOT` Approvals, AI Employees, Vault
- Active tab = clay pill; group labels = ink-faint micro-caps.
- **Mobile**: bottom bar keeps 5 (Dashboard, Cash In, Cash Out, Approvals, More). **More = slide-up sheet** with the remaining 5 tabs. No tab is unreachable on mobile.
- Sidebar shows the 🙋 pending-approvals count badge (like EventOps Admin badge).

## 4 · THE TELEGRAM BOT — "the agentic upgrade" (the real V2)

### 4a · Agentic engine
- **True tool loop**: up to **5 chained tool calls per turn** (Claude decides; e.g. "who do I chase?" → `who_to_followup` → `search_records` for their history → answer). Loop guard: hard cap, then forced final answer.
- **Conversation memory**: `bot_memory` table (exists in schema) stores last ~6 turns per chat → follow-ups work ("...and last week?").
- **Escape hatch**: if no tool fits or confidence low → plain reply + offer `/help`. `escalate` tool kept.
- **/help** → the GLCC-style "Here's what I'm good at" card (§4d).
- Model `claude-haiku-4-5`, structured tool_use, same ack-first webhook (all inside `after()`).

### 4b · READ tools (answer instantly — GLCC ops parity)
| Tool | Answers |
|---|---|
| `get_cash_summary(period)` | "how much cash in this week/month?" *(kept from V1)* |
| `get_funnel()` | full river: Views→Leads→Appointments→Closed→Nurture + conversion % + pipeline RM value |
| `list_leads(status?)` | open/won/lost leads, deal size, due dates |
| `list_owed()` | who owes me + totals |
| `list_overdue_invoices()` | overdue receivables + how many days late |
| `tasks_due(window)` | tasks due today/this week, sorted by deadline, owner from meta |
| `content_status()` | posted / scheduled / draft + what's coming up |
| `who_to_followup()` | customers & leads gone quiet (last-touch date ranked) |
| `pending_vs_won()` | RM pending vs RM won, counts |
| `attention_today()` | the triage: overdue + due-today + waiting-approvals in one card |
| `search_records(q)` | free search *(kept)* |

### 4c · ACTION tools — write **through the CAS approval engine** (the agentic part)
Every action tool calls `propose()`. Nothing writes directly. The dial applies:

| Tool | Zone | Behaviour |
|---|---|---|
| `log_expense(merchant, amount, category?)` | 🟢 ≤ threshold / 🟡 above | text-based twin of the receipt-photo flow — auto-file + `/undo-<id>`, or Approve buttons |
| `add_task(title, due?)` | 🟢 always | reversible → autopilot + notify + `/undo` |
| `add_lead(name, value?, stage?)` | 🟢 always | reversible → autopilot + `/undo` |
| `log_cash_in(source, amount)` | 🟡 always | money state → Approve buttons |
| `mark_invoice_paid(record)` | 🟡 always | money state → Approve buttons |
| `update_lead_status(record, stage)` | 🟡 always | pipeline truth → Approve buttons |
| `draft_followup(customer)` | ✍️ draft-only | returns copy-paste text; the bot NEVER sends to customers (🔴 welded shut) |

🔴 unchanged: no tool can move money, delete, or message a customer. Not present in any executor.

### 4d · The /help card (bot greeting, GLCC-style)
```
I run your CashFlowOS. Ask me anything from your records:

💰 Money — "cash in this week?" · "who owes me?" · "overdue invoices?"
🏞️ Pipeline — "open leads?" · "pipeline value?" · "pending vs won?"
✅ Tasks — "what's due this week?" · "add task: chase supplier Friday"
📣 Content — "what's scheduled?"
🤝 People — "who do I need to follow up with?"
🚨 Triage — "what needs my attention today?"

I can also DO things — log an expense, add a lead or task, mark an
invoice paid. Small stuff I just do (with /undo). Money stuff I
propose and YOU tap Approve. I never message your customers.
```

### 4e · Seed data expansion
So every /help question demos well on a fresh clone: leads in **every** funnel stage w/ RM values + due dates, **2 overdue invoices** (5 and 12 days late), 3 tasks (today / this week / next week, owners in meta), content in all 3 states, 2 quiet customers (last-touch 10+ days), the existing cash + pending-approval seeds.

## 5 · Docs & guide updates
- README rewritten for the new name + the agentic bot section.
- `docs/bot-playbook.md` (NEW): every tool, an example question, the expected answer shape — doubles as the class demo script.
- Event-guide P-prompts: P1 repo URL → new repo; P5 test lines gain 3 agentic tests (add-task autopilot, mark-paid approval, draft-followup never-sends).

## 6 · Acceptance (V2 additions on top of V1's 11)
12. Bot answers the full set of **GLCC-style ops questions** from §4b (money · pipeline · tasks · content · people · triage) against seed data.
13. `add_task` → 🟢 auto-runs, `/undo` reverses it.
14. `mark_invoice_paid` → 🟡 proposal + buttons; double-tap Approve → "already handled".
15. `draft_followup` → returns text; grep proves no send path exists.
16. Multi-step: "who do I chase and how much do they owe?" chains ≥2 tools.
17. Memory: "cash in this week?" → "and last month?" resolves from context.
18. Sidebar groups render; mobile More-sheet reaches all 10 tabs.
19. Brand: computed `--clay` = `#D97757` on the deployed page.

## 7 · Build phases (multi-agent, like V1)
| Phase | Work |
|---|---|
| **P0 Bootstrap** | copy starter@class-jul-2026 → strip .git → new repo skeleton, name/brand sweep (§1 §2) |
| **P1 Shell** | sidebar groups + badge, mobile More sheet (§3) |
| **P2 Bot engine** | agentic loop + memory + /help + escape hatch (§4a §4d) |
| **P3 Tools** | 10 read tools + 7 action tools via CAS (§4b §4c) + seed expansion (§4e) |
| **P4 Ship** | docs (§5), acceptance 1–19, council audit, push + template=true, new Vercel deploy, tag `v2.0` |

Gate between P2/P3 and P4: build green + bot answers the 10 questions locally.
