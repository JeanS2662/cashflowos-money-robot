# 🔁 Renewal Nudge — my-agent.md  (Insurance · worked example)

> A filled brief you can copy. Every section maps 1:1 to a code knob.

**Name:** Renewal Nudge
**Owner (who it works for):** The agent / advisor
**Approver (whose YES it needs):** The advisor (before any reminder goes out)

---

## 1. WHEN does it wake up?  → knob `when` in `definition.ts`
`daily`

> Once a day, in the morning brief run.

## 2. LOOK AT — what does it read?  → knob `lookAt` in `definition.ts`
> `customer` records whose policy/subscription renews **within the next 30 days**.
> (`rows.filter(r => r.category === 'customer' && daysUntil(m(r,'renewal_date')) <= 30)`)

## 3. SUGGEST — what does it draft?  → knob `suggest` in `prompt.ts`
> A friendly renewal reminder with the policy name, renewal date, and premium — ready for the
> advisor to send and to book the review call.

## 4. ASK-BEFORE — what must it never do without a YES?  → knob `askBefore` in `definition.ts`
> **Always ask before sending.** It drafts the reminder; the advisor presses send.

---

## The autonomy dial
- 🟢 **AUTOPILOT**: (none — messaging a policyholder is never autopilot)
- 🟡 **ASK-FIRST**: draft each reminder and wait for the advisor's YES
- 🔴 **NEVER**: renew the policy · charge the premium · **auto-send to the client**

> **Golden rule:** the reminder is **drafted for you to send**. The robot never messages the client.
