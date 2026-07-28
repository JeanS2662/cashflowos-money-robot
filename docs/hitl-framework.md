# The 5-Finger Rule (LATAR) — how every robot in CashFlowOS thinks 🤚

> **The one big idea:** your robot is an employee, not a magic button.
> A good employee *watches* your business, *notices* when something needs doing,
> **asks before it touches your money**, does the job **once**, and **writes it all down**.
> That's the whole thing. Five fingers. Say it with your hand.

This is the framework the code actually follows. Every agent — the receipt filer,
the Vault, the ones you build yourself — runs this exact loop. Nothing skips it.

---

## LATAR — the five fingers ✋

Hold up one hand. One finger per step. This is the loop.

| Finger | Step | Emoji | Kid version | What the code does |
|--------|------|-------|-------------|--------------------|
| 👍 Thumb | **LOOK** | 👀 | "It watches your stuff." | Reads a photo, a new record, or the daily list of your numbers. |
| ☝️ Index | **ASSESS** | 🤔 | "It thinks — *something needs doing*." | Works out what it found: a RM45 receipt? a lead gone quiet? an invoice unpaid 8 days? |
| 🖕 Middle | **ASK** | 🙋 | "It raises its hand — *Boss, can I?*" | For anything with money or a customer, it makes a **proposal** and waits. No YES = nothing happens. |
| 💍 Ring | **ACT** | ⚡ | "Only after YES — and only ONCE." | The one and only executor runs a single time. Tap Approve twice → still one action. |
| 🤙 Pinky | **RECORD** | 📝 | "Everything goes in the diary." | Every action — big or small, asked-for or automatic — lands in the audit trail (Approvals → History). |

> **Say it out loud as it happens.** When you build the Vault agent in class, walk the
> five fingers while the robot works: *"It LOOKED at my photo… it ASSESSED it's a RM269
> receipt… it's ASKING me… I tap Approve… it ACTED once… and it RECORDED it."*
> Bodies remember what hands do.

**Why ACT is welded to "once":** the code uses a *claim-check* — one atomic database
update that flips a proposal from `proposed` to `executing` only if it's still waiting.
The first tap wins the claim. Every later tap gets "already handled." You cannot
double-spend, even if you mash the button. (Red-team it yourself — see
`red-team-checklist.md`.)

---

## 🟢🟡🔴 The three zones — the dial, not the leash 🎚️

A robot that asks permission to staple paper isn't an employee — it's a form.
A robot that spends your money without asking is dangerous. The answer is a **dial**.

### 🟢 GREEN — just do it (AUTOPILOT)
Small, reversible, boring. The robot **acts on its own, then tells you.** You review the
diary, not every action. There's always an **UNDO**.
- File a RM45 receipt under the threshold → filed ✅ + *"reply /undo-45 to reverse."*
- Back up a photo to your Vault.
- Draft the morning brief.

> This is what makes it an **agent** and not a button. Green is the whole point.

### 🟡 YELLOW — ask first (ASK-FIRST)
Consequential. Costs real money, touches a customer, or changes something with money impact.
The robot makes a **proposal** and **waits for your YES.**
- A RM269 receipt (over your RM200 line) → 🙋 buzz → you tap Approve.
- A draft that's about to be published.
- Anything the robot is **unsure** about — low confidence always drops to 🟡, even if it's small.

### 🔴 RED — never, ever (not even with approval)
These aren't "ask harder." They **do not exist in any executor.** The robot literally cannot.
- Move money / make a payment / transfer funds.
- **Delete** a record (undo makes a *reversal* entry — it never hard-deletes).
- Message a customer on its own. Customer messages are **drafted for YOU to send.**

### The knob 🎛️
**The line between 🟢 and 🟡 is a number you set** (`EXPENSE_APPROVAL_THRESHOLD`, default RM200).
- Brand-new robot you don't trust yet? **Dial low** → it asks about almost everything.
- Robot that's earned your trust? **Dial up** → it handles more on its own.
- You don't approve everything. **You set the dial.** That's the skill.

```
        cheaper / more trust  ─────────────►  everything asks
   🟢 AUTOPILOT   │   🟡 ASK-FIRST   │   🔴 NEVER (welded shut)
        dial ▲ up                dial ▼ down
              └──── the RM200 line moves ────┘
```

---

## 🎮 The Zone Sorting Game — sort these 10 cards

Print these as 10 cards. One set per table. Read each action out loud and drop it in
🟢, 🟡, or 🔴. Then check your answers below. (This is the Day-2 warm-up — and the
reveal is: *"you already built this yesterday."*)

| # | The action card | Where does it go? |
|---|-----------------|-------------------|
| 1 | File a RM30 parking receipt | ❓ |
| 2 | File a RM480 laptop receipt (your line is RM200) | ❓ |
| 3 | Back up a photo of a signed contract to the Vault | ❓ |
| 4 | Pay the RM480 supplier invoice from your bank | ❓ |
| 5 | Draft a "your invoice is 8 days overdue" WhatsApp to a customer | ❓ |
| 6 | Send that overdue-invoice WhatsApp to the customer | ❓ |
| 7 | Delete a lead that looks like spam | ❓ |
| 8 | Write tomorrow's morning brief (funnel + money + what needs your YES) | ❓ |
| 9 | Publish a drafted Instagram post to your account | ❓ |
| 10 | A receipt where the robot can't read the amount clearly | ❓ |

<details>
<summary><b>Answers</b> (peek after you've sorted)</summary>

1. 🟢 — small, reversible, under the line. Auto-file + tell you.
2. 🟡 — over the line. Propose → wait for YES.
3. 🟢 — backing up a copy harms nothing. Auto + record.
4. 🔴 — **moving money.** Never built. You pay it yourself.
5. 🟡 — a *draft* is fine to prepare, but a customer message needs your eyes.
6. 🔴 — **sending to a customer** autonomously. The robot drafts; YOU send.
7. 🔴 — **deleting.** Never. (Mark it spam / status it instead — reversible.)
8. 🟢 — drafting your own internal brief is harmless. Auto.
9. 🔴 — publishing to the public on its own. Draft only; you hit post.
10. 🟡 — **unsure → always ask,** even though it's small. "⚠️ robot unsure — double-check the amount."

**The pattern:** money-out and customer-facing and delete → 🔴 or 🟡, never 🟢.
Backing up, drafting-for-you, and small reversible filing → 🟢.
Unsure → bump up a zone. When in doubt, ask.
</details>

---

## The Golden Rule (the one sentence on the wall)

> **ASK before you SPEND or SEND.**

Everything else is detail. If you remember nothing else, remember the wall poster:
five fingers, three colours, one line — **ask before spend or send.**
