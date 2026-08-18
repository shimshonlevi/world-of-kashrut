import prisma from '@/lib/prisma'

export const maxDuration = 30

const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini'

// Build a Hebrew system prompt summarising every project so the assistant can
// answer questions grounded in real data.
async function buildSystemPrompt() {
  const projects = await prisma.project.findMany({ orderBy: { createdAt: 'desc' } })

  const summaries = projects
    .map(
      (p) => `תיק: ${p.projectName}
- מזהה: ${p.id}
- יבואן: ${p.importer}
- מדינה: ${p.country}
- סוג כשרות: ${p.kosherBody}
- סטטוס: ${p.status}
- אחראית: ${p.responsible}
- משגיח: ${p.supervisor}${p.supervisorPhone ? ` (${p.supervisorPhone})` : ''}
- דוח התקבל: ${p.reportReceived ? 'כן' : 'לא'}
- תשלום התקבל: ${p.paid ? 'כן' : 'לא'}
- הוצאות: ${p.actualExpenses ?? 0}₪ | הצעת מחיר: ${p.quotedPrice ?? 0}₪
- תאריכים: ${p.startDate} → ${p.endDate}`
    )
    .join('\n---\n')

  return `אתה עוזר AI חכם במערכת ניהול כשרות KosherFlow.
יש לך גישה לנתוני כל הפרויקטים במערכת.

הנתונים:
${summaries || '(אין פרויקטים במערכת)'}

כללים:
1. ענה תמיד בעברית, מדויק ותמציתי.
2. בסס תשובות אך ורק על הנתונים שניתנו לך. אם חסר מידע — אמור זאת.
3. כשנשאלת על תיק ספציפי, תן פירוט; לשאלה כללית — תן סיכום והמלצות רלוונטיות.`
}

type IncomingMessage = { role?: string; content?: string }

export async function POST(req: Request) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return Response.json({ error: 'שירות ה-AI אינו מוגדר (חסר מפתח API)' }, { status: 503 })
  }

  let body: { messages?: IncomingMessage[] }
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'גוף הבקשה אינו תקין' }, { status: 400 })
  }

  const { messages } = body
  if (!Array.isArray(messages) || messages.length === 0) {
    return Response.json({ error: 'נדרשת רשימת הודעות' }, { status: 400 })
  }

  try {
    const systemPrompt = await buildSystemPrompt()
    const openaiMessages = [
      { role: 'system', content: systemPrompt },
      ...messages.map((m) => ({ role: m.role || 'user', content: m.content || '' })),
    ]

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages: openaiMessages,
        max_tokens: 800,
        temperature: 0.2,
      }),
    })

    if (!res.ok) {
      const detail = await res.text().catch(() => '')
      console.error('[api/ai-chat] OpenAI error', res.status, detail.slice(0, 500))
      return Response.json({ error: 'שגיאה בשירות ה-AI' }, { status: 502 })
    }

    const data = await res.json()
    const reply: string = data?.choices?.[0]?.message?.content?.trim() || ''
    return Response.json({ reply })
  } catch (err) {
    console.error('[api/ai-chat] error', err instanceof Error ? err.message : err)
    return Response.json({ error: 'שגיאה בשירות ה-AI' }, { status: 500 })
  }
}
