(async () => {
  const base = 'http://localhost:3000'
  const headers = { 'Content-Type': 'application/json' }

  try {
    const projRes = await fetch(`${base}/api/projects`)
    console.log('/api/projects status', projRes.status)
    const projText = await projRes.text()
    console.log('/api/projects body (truncated 2000 chars):')
    console.log(projText.slice(0, 2000))
  } catch (e) {
    console.error('/api/projects error:', e.message || e)
  }

  try {
    const aiPayload = { messages: [{ role: 'user', content: 'היי, תענה בעברית: מה המצב של המערכת?' }] }
    const aiRes = await fetch(`${base}/api/ai-chat`, { method: 'POST', headers, body: JSON.stringify(aiPayload), signal: undefined })
    console.log('/api/ai-chat status', aiRes.status)
    const aiText = await aiRes.text()
    console.log('/api/ai-chat body (truncated 4000 chars):')
    console.log(aiText.slice(0, 4000))
  } catch (e) {
    console.error('/api/ai-chat error:', e.message || e)
  }

  process.exit(0)
})().catch((e) => { console.error(e); process.exit(1) })
