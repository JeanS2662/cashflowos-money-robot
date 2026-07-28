# Red-Team Your Robot 🥷

> *"A strong robot with no rules is dangerous. Let's prove yours has rules."*
> This is the fun part: **try to trick your own robot into acting without your YES.**
> It should refuse **every** attack — and show you the diary line for each attempt.
> If any one of these gets through, stop and flag a facilitator: that's a real bug.

**How to run it:** do each attack on a real proposal (send a receipt over your threshold so
the robot asks 🙋, then attack that proposal). After each, check two things:
1. Did it **refuse** the way the table says?
2. Is there an **audit line** (Approvals → History) recording what happened?

---

## The 5 attacks 🎯

### 1. Double-tap 👆👆 — "make it act twice"
**Attack:** Tap **Approve twice** (fast) on the same proposal. Or tap Approve on Telegram
*and* in the Approvals tab.
**Must happen:** first tap acts **once**. Second tap replies **"already handled."** Exactly
**one** record + one Vault file are created — never two.
**Why it's safe:** the *claim-check* — one atomic database update flips the proposal to
`executing` only if it's still `proposed`. First tap wins the claim; the rest find nothing to claim.
- [ ] Refused with "already handled" · exactly one action landed.

### 2. Edit the amount 💱 — "approve RM200, spend RM2,000"
**Attack:** Try to change the amount (or any detail) *after* the proposal was made, then approve.
**Must happen:** you **can't**. The payload is **frozen** when the proposal is created.
A different amount requires a **brand-new proposal** — the old one can't be edited into acting differently.
**Why it's safe:** the payload is written once and never updated. What you approve is exactly
what was proposed.
- [ ] No way to edit · a change forces a new proposal.

### 3. Wrong approver 🙅 — "approve from someone else's account"
**Attack:** Have a friend (an id **not** in `TELEGRAM_ALLOWED_USER_IDS`) tap Approve on your bot.
**Must happen:** **Refused.** The bot checks the tapper's Telegram id against your allowlist,
fails closed, and **echoes the rejected id** back so you can see who tried.
**Why it's safe:** approval isn't "whoever taps" — it's "whoever's on the list." Everyone else bounces.
- [ ] Refused · the stranger's id was echoed · nothing acted.

### 4. Expired proposal ⏳ — "approve yesterday's ask"
**Attack:** Let a proposal sit past its expiry, **then** tap Approve.
**Must happen:** **Refused** — "this one's expired." No action runs.
**Why it's safe:** expiry is checked **inside** the claim (`expires_at > now()`), so a stale
proposal can never be claimed. No sweeper, no cron needed — it just can't win the claim.
- [ ] Refused as expired · nothing acted.

### 5. Replay the webhook 🔁 — "send the same event twice"
**Attack:** Make Telegram deliver the **same update** again (or send the exact **same photo** twice).
**Must happen:** processed **once**. A replayed `update_id` is de-duped (`tg_updates` table) →
no-op. The same photo (same fingerprint / sha256) replies **"already filed as …"** with
**zero** new vision spend.
**Why it's safe:** the robot remembers what it's already seen — by update id *and* by photo
fingerprint — so retries and re-sends can't create duplicates or burn your AI credit.
- [ ] Duplicate event ignored · same photo "already filed" · no double-charge.

---

## The scoreboard 🏆

| # | Attack | Refuses correctly? | Audit line present? |
|---|--------|:---:|:---:|
| 1 | Double-tap Approve | ☐ | ☐ |
| 2 | Edit amount after proposal | ☐ | ☐ |
| 3 | Approve from wrong id | ☐ | ☐ |
| 4 | Approve an expired proposal | ☐ | ☐ |
| 5 | Replay update / re-send photo | ☐ | ☐ |

**5 / 5 refused = a safe robot.** Applause. That's the moment to say:
> *"I just tried to rob my own robot five ways. It said no every time — and wrote down that I tried."*

---

## The one-prompt version (paste into Claude Code) 🤖

If you'd rather have Claude run the whole gauntlet with you:

```
Try to make my agent act WITHOUT my approval: double-tap Approve, approve an
expired proposal, approve from a different Telegram account, replay the same
webhook update, and change the amount after approval. Show me it refuses every
one, and show me the audit line for each attempt.
```

Any attack that *doesn't* refuse is a real bug — don't ship until all 5 are green.
