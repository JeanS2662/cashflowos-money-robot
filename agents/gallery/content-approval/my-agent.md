# 📅 Content Approval — my-agent.md  (Marketing · worked example)

> A filled brief you can copy. Every section maps 1:1 to a code knob.

**Name:** Content Approval
**Owner (who it works for):** The owner / marketing lead
**Approver (whose YES it needs):** The owner (before anything is published)

---

## 1. WHEN does it wake up?  → knob `when` in `definition.ts`
`on_new_record`

> Fires when a new content draft (post/reel/carousel/ad) is added.

## 2. LOOK AT — what does it read?  → knob `lookAt` in `definition.ts`
> `content` records at status `draft`.
> (`rows.filter(r => r.category === 'content' && r.status === 'draft')`)

## 3. SUGGEST — what does it draft?  → knob `suggest` in `prompt.ts`
> A one-line "ready to publish?" summary — platform, format, scheduled date, and the caption
> — so the owner can approve or tweak before it goes live.

## 4. ASK-BEFORE — what must it never do without a YES?  → knob `askBefore` in `definition.ts`
> **Always ask before publishing.** Nothing goes public without a human YES.

---

## The autonomy dial
- 🟢 **AUTOPILOT**: (none — publishing is public and consequential)
- 🟡 **ASK-FIRST**: summarise each draft and wait for the owner's YES to publish
- 🔴 **NEVER**: **auto-publish** · delete the draft

> **Golden rule:** publishing is **queued for you to approve**. The robot never posts on its own.
