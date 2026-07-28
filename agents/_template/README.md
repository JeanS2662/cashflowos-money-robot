# The 4-knob agent template 🧰

This folder is a **safe skeleton** for a new AI employee. An agent is just four knobs:

| Knob | Lives in | What it decides |
|---|---|---|
| 👉 **WHEN** | `definition.ts` | when it wakes up (`daily` / `on_new_record` / `on_photo`) |
| 👉 **LOOK AT** | `definition.ts` | which records it reads |
| 👉 **SUGGEST** | `prompt.ts` | the words it drafts (for YOU to send) |
| 👉 **ASK-BEFORE** | `definition.ts` | when it must stop and get your YES |

`executor.ts` is **🔒 locked** — it drafts, never sends. That's the safety guarantee:
you can tune the four knobs freely and still never make the robot message a customer or move money.

## How to make your own (the one prompt)

1. Fill in `my-agent.md` (one page of blanks).
2. Paste this to Claude Code, exactly as written:

```
Copy agents/_template into agents/<name>, fill it from my `my-agent.md` — change ONLY
the four 👉 knobs — then register it in `agents/registry.ts`:
  1. one line in the AGENTS array, so it shows on the AI Employees tab;
  2. one line in EXECUTORS, only if it ACTS rather than just drafts;
  3. and if my agent is `daily`, one entry in the SCHEDULED array — WITHOUT this it
     never runs and no Approve buttons ever arrive.
Show me the diff before applying.
```

3. The line it adds to the `AGENTS` array looks like this:

```ts
{ key: '<name>', label: '<Your Agent>', emoji: '🤖', autonomyNote: '🟡 Daily: drafts X. You send it.' },
```

### ⚠️ Why three places, not one

| Array | If you skip it |
|---|---|
| `AGENTS` | it works, but never appears on the AI Employees tab |
| `EXECUTORS` | tapping ✅ Approve errors with *"no executor registered"* |
| **`SCHEDULED`** | **it NEVER runs.** The morning cron only sweeps this array — your agent sits there silently forever |

**Draft-only agents still need `SCHEDULED`** if they're `daily`. That's the #1 reason someone
says *"I built it but nothing happened."* Check that array first, every time.

That's it — nothing else in the repo moves. Review the diff, then say yes.
