# 🗂️ Leave / Claim Approval — my-agent.md  (HR · worked example)

> A filled brief you can copy. Every section maps 1:1 to a code knob.

**Name:** Leave / Claim Approval
**Owner (who it works for):** The owner / manager
**Approver (whose YES it needs):** The manager (every request, always)

---

## 1. WHEN does it wake up?  → knob `when` in `definition.ts`
`on_new_record`

> Fires when a staff member submits a leave request or an expense claim.

## 2. LOOK AT — what does it read?  → knob `lookAt` in `definition.ts`
> `task` records tagged as a leave/claim submission awaiting sign-off.
> (`rows.filter(r => r.category === 'task' && m(r,'kind') === 'leave_claim' && r.status === 'submitted')`)

## 3. SUGGEST — what does it draft?  → knob `suggest` in `prompt.ts`
> A tidy one-liner: who · what (leave dates / claim amount) · any balance left — so the manager
> can approve or reject in one glance.

## 4. ASK-BEFORE — what must it never do without a YES?  → knob `askBefore` in `definition.ts`
> **Always ask.** HR sign-off never runs on its own — every request waits for the manager's YES.

---

## The autonomy dial
- 🟢 **AUTOPILOT**: (none — sign-off is always a human decision)
- 🟡 **ASK-FIRST**: present each request and wait for approve/reject
- 🔴 **NEVER**: **auto-approve** · pay a claim · delete the request

> **Golden rule:** the decision is **always yours**. The robot only lays the request out clearly.
