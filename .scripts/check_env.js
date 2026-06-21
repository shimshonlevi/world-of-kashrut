const fs = require('fs');
try {
  const buf = fs.readFileSync('.env');
  const key = Buffer.from('OPENAI_API_KEY=');
  const idx = buf.indexOf(key);
  if (idx === -1) {
    console.log('NOT_FOUND');
    process.exit(0);
  }
  let i = idx + key.length;
  let bytes = [];
  while (i < buf.length && buf[i] !== 10 && buf[i] !== 13) {
    bytes.push(buf[i]);
    i++;
  }
  console.log('LEN:' + bytes.length);
  console.log('START_HEX:' + bytes.slice(0, 8).map(b => b.toString(16)).join(','));
  console.log('LAST_DEC:' + bytes.slice(-4).join(','));
  if (i < buf.length) {
    console.log('NEXT_BYTE:' + buf[i]);
    if (buf[i] === 13) console.log('LINE_ENDS_WITH_CR');
    else if (buf[i] === 10) console.log('LINE_ENDS_WITH_LF');
  } else console.log('LINE_ENDS_WITH_EOF');
} catch (e) {
  console.error('ERR', e.message);
  process.exit(1);
}
