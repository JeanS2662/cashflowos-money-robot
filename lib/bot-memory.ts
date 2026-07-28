import { supabase, supabaseConfigured } from './supabase'

// 🔒 Don't edit — this keeps your robot safe.
// Short-term memory for the bot — keeps the last few turns so Jarvis can resolve
// "and her?" / "what about last week?". Backed by the bot_memory table.
type Turn = { q: string; a: string }

export async function loadTurns(chatId: number): Promise<string> {
  if (!supabaseConfigured) return ''   // skip the slow failing fetch before keys are set
  const { data } = await supabase.from('bot_memory').select('turns').eq('chat_id', chatId).maybeSingle()
  const turns = (data?.turns ?? []) as Turn[]
  return turns.slice(-6).map(t => `Q: ${t.q}\nA: ${t.a}`).join('\n')
}

export async function appendTurn(chatId: number, q: string, a: string) {
  if (!supabaseConfigured) return   // no memory to persist until keys are set
  const { data } = await supabase.from('bot_memory').select('turns').eq('chat_id', chatId).maybeSingle()
  const turns = ((data?.turns ?? []) as Turn[]).concat({ q, a }).slice(-6)
  await supabase.from('bot_memory').upsert({ chat_id: chatId, turns, updated_at: new Date().toISOString() })
}

// The bot_memory table doubles as a per-chat daily counter (e.g. the vision-call
// cost cap in the Vault agent). Keyed by chat_id + a YYYY-MM-DD day string so the
// count naturally resets each day without a sweeper. Never throws.
export async function bumpDailyCounter(chatId: number, name: string, day: string): Promise<number> {
  if (!supabaseConfigured) return 0
  const { data } = await supabase.from('bot_memory').select('counters').eq('chat_id', chatId).maybeSingle()
  const counters = (data?.counters ?? {}) as Record<string, number>
  const key = `${name}:${day}`
  const next = (counters[key] ?? 0) + 1
  // Keep the bag small — drop any key not for today.
  const pruned: Record<string, number> = { [key]: next }
  await supabase.from('bot_memory').upsert({ chat_id: chatId, counters: pruned, updated_at: new Date().toISOString() })
  return next
}
