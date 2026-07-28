'use server'

// 🔒 Don't edit — this keeps your robot safe.
// The IN-APP front door for Approve / Reject. It exists so the client button leaf
// (ApproveButtons.tsx) can decide an action WITHOUT importing lib/actions.ts — that
// module sits behind `import 'server-only'` and can never cross into the browser.
// This thin 'use server' wrapper runs the SAME claim-check (CAS) as the Telegram
// path, so both front doors share one once-only guarantee. It also strips the
// Telegram buttons (via the stored notify ids) so a proposal decided here can't
// still be tapped in the chat.

import { revalidatePath } from 'next/cache'
import { claim, executeClaimed, summarizeResult } from '@/lib/actions'
import { editMessageReplyMarkup, sendMessage } from '@/lib/telegram'
import { logRun } from '@/lib/runs'

// In-app decisions are made by the owner. Stamp their chat id if we know it.
const approverId = () => (process.env.OWNER_CHAT_ID ? Number(process.env.OWNER_CHAT_ID) : null)
// Strip the HTML tags summarizeResult() uses for Telegram, for a plain in-app toast.
const plain = (s: string) => s.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&')

export async function approveAction(id: number): Promise<{ ok: boolean; message: string }> {
  const claimed = await claim(id, approverId(), 'executing')
  if (!claimed) {
    revalidatePath('/approvals')
    return { ok: false, message: 'Already handled — nothing changed.' }
  }
  // Keep the Telegram message in sync: strip its buttons + note the app decision.
  if (claimed.notify_chat_id && claimed.notify_message_id) {
    await editMessageReplyMarkup(claimed.notify_chat_id, claimed.notify_message_id)
    await sendMessage(claimed.notify_chat_id, 'Approved in the app ✅ — running…')
  }
  const outcome = await executeClaimed(claimed)
  if (claimed.notify_chat_id) {
    await sendMessage(
      claimed.notify_chat_id,
      outcome.ok ? summarizeResult(outcome.result) : `⚠️ Approved but the action failed: ${outcome.error}`,
    )
  }
  revalidatePath('/approvals')
  revalidatePath('/')
  return outcome.ok
    ? { ok: true, message: plain(summarizeResult(outcome.result)) }
    : { ok: false, message: `Approved, but the action failed: ${outcome.error}. It's logged in Activity.` }
}

export async function rejectAction(id: number): Promise<{ ok: boolean; message: string }> {
  const claimed = await claim(id, approverId(), 'rejected')
  if (!claimed) {
    revalidatePath('/approvals')
    return { ok: false, message: 'Already handled — nothing changed.' }
  }
  if (claimed.notify_chat_id && claimed.notify_message_id) {
    await editMessageReplyMarkup(claimed.notify_chat_id, claimed.notify_message_id)
    await sendMessage(claimed.notify_chat_id, '❌ Rejected in the app — nothing was done.')
  }
  await logRun(claimed.agent_key, 'rejected', { action_id: id, by: approverId() ?? 'app' })
  revalidatePath('/approvals')
  return { ok: true, message: 'Rejected — nothing was done.' }
}
