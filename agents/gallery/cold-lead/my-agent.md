# 🎯 Cold-Lead Follow-up — my-agent.md  (Sales · worked example)

> A filled brief you can copy. Every section maps 1:1 to a code knob.

**Name:** Cold-Lead Follow-up
**Owner (who it works for):** The owner / sales closer
**Approver (whose YES it needs):** The closer (before any nudge goes out)

---

## 1. WHEN does it wake up?  → knob `when` in `definition.ts`
`daily`

> Once a day, in the morning brief run.

## 2. LOOK AT — what does it read?  → knob `lookAt` in `definition.ts`
> `lead` records that have gone **quiet for more than 3 days** and aren't `closed`.
> (`rows.filter(r => r.category === 'lead' && r.status !== 'closed' && daysSince(m(r,'last_touch')) > 3)`)

## 3. SUGGEST — what does it draft?  → knob `suggest` in `prompt.ts`
> A warm, low-pressure re-engagement DM using their name and last topic — short enough to send as-is.

## 4. ASK-BEFORE — what must it never do without a YES?  → knob `askBefore` in `definition.ts`
> **Always ask before sending.** It drafts the nudge; the closer presses send.

---

## The autonomy dial
- 🟢 **AUTOPILOT**: (none — messaging a lead is never autopilot)
- 🟡 **ASK-FIRST**: draft every nudge and wait for the closer's YES
- 🔴 **NEVER**: delete the lead · **auto-send the DM to the lead**

> **Golden rule:** the nudge is **drafted for you to send**. The robot never messages the lead.
