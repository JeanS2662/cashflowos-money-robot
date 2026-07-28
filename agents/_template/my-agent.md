# 🤖 my-agent — the fill-in-the-blank brief

> One page. Fill every blank, then hand this file to Claude Code with the prompt in
> **README.md**. Each section maps 1:1 to a code knob — the words you write here are
> the words Claude changes in the code. Nothing else moves.

**Name:** _______________________________
**Owner (who it works for):** _______________________________
**Approver (whose YES it needs):** _______________________________

---

## 1. WHEN does it wake up?  → knob `when` in `definition.ts`
Pick ONE: `daily` · `on_new_record` · `on_photo`

> _e.g. daily_

## 2. LOOK AT — what does it read?  → knob `lookAt` in `definition.ts`
Which records does it care about? (a category + a condition)

> _e.g. leads that have been quiet for more than 3 days_

## 3. SUGGEST — what does it draft?  → knob `suggest` in `prompt.ts`
The exact message/action it prepares FOR YOU. Keep it a draft.

> _e.g. a short, friendly WhatsApp nudge with their name and last topic_

## 4. ASK-BEFORE — what must it never do without a YES?  → knob `askBefore` in `definition.ts`
When must it stop and wait for you? (Anything customer-facing = always ask.)

> _e.g. always ask before I send anything to a lead_

---

## The autonomy dial — sort every action into a colour
- 🟢 **AUTOPILOT** (small + reversible — it just does it, then tells you): _______________________________
- 🟡 **ASK-FIRST** (consequential — it drafts and waits for your YES): _______________________________
- 🔴 **NEVER** (not built into any executor, not even with approval): move money · delete records · **auto-send to a customer**

> **Golden rule:** customer-facing messages are **DRAFTED for you to send**. The robot
> never hits send. That rule lives in `executor.ts` — which is locked (🔒) so it stays true.
