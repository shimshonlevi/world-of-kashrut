const fetch = global.fetch || require('node-fetch');
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const url = 'http://localhost:3000/api/ai-chat'
  const body = { messages: [{ role: 'user', content: 'hello from local test' }] }
  const maxAttempts = 30
  for (let i = 1; i <= maxAttempts; i++) {
    try {
      const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const text = await res.text()
      console.log('ATTEMPT', i, 'STATUS', res.status)
      console.log('BODY_SNIPPET', text.slice(0, 1000))
      process.exit(res.ok ? 0 : 2)
    } catch (err) {
      console.log('ATTEMPT', i, 'ERROR', err.message)
      await sleep(2000)
    }
  }
  console.error('API not reachable after retries')
  process.exit(3)
})()
