#!/usr/bin/env node
// scripts/tts.mjs — render text to mp3 via tailnet speaches.
// Usage:
//   node scripts/tts.mjs --text "..." --out src/content/posts/<slug>/audio.mp3
//   node scripts/tts.mjs --file path/to/text.txt --out ...
// ENV: TTS_ENDPOINT, TTS_MODEL, TTS_VOICE
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';

const ENDPOINT = process.env.TTS_ENDPOINT || 'http://precision-node4:8000';
const MODEL = process.env.TTS_MODEL || 'speaches-ai/Kokoro-82M-v1.0-ONNX';
const VOICE = process.env.TTS_VOICE || 'af_bella';

const { values } = parseArgs({
  options: {
    text: { type: 'string' },
    file: { type: 'string' },
    out:  { type: 'string' },
    voice:{ type: 'string', default: VOICE },
    model:{ type: 'string', default: MODEL },
    speed:{ type: 'string', default: '1.0' },
  },
});
if (!values.out || (!values.text && !values.file)) {
  console.error('usage: node scripts/tts.mjs (--text "..." | --file path) --out <mp3-path> [--voice af_bella] [--speed 1.0]');
  process.exit(1);
}

const input = values.text ?? await readFile(values.file, 'utf-8');
const out = path.resolve(values.out);
await mkdir(path.dirname(out), { recursive: true });

console.log(`[tts] ${input.length} chars → ${out} (voice ${values.voice}, speed ${values.speed})`);

const ensure = await fetch(`${ENDPOINT}/v1/models/${encodeURIComponent(values.model)}`, { method: 'POST' });
if (!ensure.ok && ensure.status !== 200 && ensure.status !== 409) {
  console.warn(`[tts] model ensure returned ${ensure.status}`);
}

const t0 = Date.now();
const res = await fetch(`${ENDPOINT}/v1/audio/speech`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    model: values.model,
    voice: values.voice,
    input,
    response_format: 'mp3',
    speed: parseFloat(values.speed),
  }),
});
if (!res.ok) {
  console.error(`[tts] HTTP ${res.status}: ${await res.text()}`);
  process.exit(2);
}
const buf = Buffer.from(await res.arrayBuffer());
await writeFile(out, buf);
console.log(`[tts] wrote ${(buf.length/1024).toFixed(1)} KB in ${(Date.now()-t0)/1000}s`);
