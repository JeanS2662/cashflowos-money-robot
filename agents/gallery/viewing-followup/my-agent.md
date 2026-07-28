# 🏠 Viewing Follow-up — my-agent.md  (Real-Estate · worked example)

> A filled brief you can copy. Every section maps 1:1 to a code knob.

**Name:** Viewing Follow-up
**Owner (who it works for):** The agent
**Approver (whose YES it needs):** The agent (before any follow-up goes out)

---

## 1. WHEN does it wake up?  → knob `when` in `definition.ts`
`daily`

> Once a day, in the morning brief run.

## 2. LOOK AT — what does it read?  → knob `lookAt` in `definition.ts`
> `lead` records where a **viewing is done** and no follow-up has been sent yet.
> (`rows.filter(r => r.category === 'lead' && m(r,'viewing_status') === 'done' && !m(r,'followed_up'))`)

## 3. SUGGEST — what does it draft?  → knob `suggest` in `prompt.ts`
> A warm post-viewing message referencing the property they saw, asking for their thoughts and
> offering next steps (second viewing / offer) — ready to send.

## 4. ASK-BEFORE — what must it never do without a YES?  → knob `askBefore` in `definition.ts`
> **Always ask before sending.** It drafts the follow-up; the agent presses send.

---

## The autonomy dial
- 🟢 **AUTOPILOT**: (none — messaging a viewer is never autopilot)
- 🟡 **ASK-FIRST**: draft each follow-up and wait for the agent's YES
- 🔴 **NEVER**: delete the lead · **auto-send to the viewer**

> **Golden rule:** the follow-up is **drafted for you to send**. The robot never messages the viewer.
