const fs = require('fs');
(async () => {
  try {
    const env = fs.readFileSync('.env', 'utf8').split(/\r?\n/);
    const line = env.find(l => l.trim().startsWith('OPENAI_API_KEY='));
    if (!line) {
      console.error('MISSING_OPENAI_API_KEY_IN_.env');
      process.exit(2);
    }
    let key = line.split('=')[1] || '';
    key = key.replace(/^"|"$/g, '').trim();
    if (!key) {
      console.error('OPENAI_API_KEY_EMPTY');
      process.exit(3);
    }

    const res = await fetch('https://api.openai.com/v1/models', {
      method: 'GET',
      headers: { Authorization: `Bearer ${key}` },
      // don't follow redirects differently
    });

    const text = await res.text();
    console.log('STATUS:' + res.status);
    console.log('OK:' + res.ok);
    console.log('BODY_SNIPPET:' + text.slice(0,1000));
  } catch (err) {
    console.error('REQUEST_ERROR:', err && err.message ? err.message : err);
    process.exit(1);
  }
})();
