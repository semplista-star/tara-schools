#!/usr/bin/env node
/**
 * Shin Dojo · 60 s motion piece → MP4 with a Catalan ElevenLabs voice-over.
 *
 *   node motion/shindojo/scripts/build.mjs            # render + voice + mix
 *   node motion/shindojo/scripts/build.mjs --no-voice # render + ambient bed only
 *   node motion/shindojo/scripts/build.mjs --skip-render   # reuse build/frames video
 *
 * Env:
 *   ELEVENLABS_API_KEY   (required for the voice)
 *   ELEVENLABS_VOICE_ID  (default: JBFqnCBsd6RMkjVDRZzb)
 *   ELEVENLABS_MODEL     (default: eleven_v3 — supports Catalan)
 *   ELEVENLABS_LANG      (default: ca; set to "" to omit language_code)
 *   FPS                  (default: 30)
 *   GSAP_FILE            (optional local gsap.min.js if cdnjs is unreachable)
 *
 * Needs: ffmpeg/ffprobe on PATH and Playwright (Chromium).
 * Output: motion/shindojo/build/shindojo-60s.mp4
 */
import { createRequire } from 'node:module';
import { spawn, execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const PAGE = join(ROOT, 'index.html');
const OUT = join(ROOT, 'build');
const VODIR = join(OUT, 'vo');
const FPS = Number(process.env.FPS || 30);
const DUR = 60;
const args = new Set(process.argv.slice(2));
mkdirSync(VODIR, { recursive: true });

const log = (...a) => console.log('›', ...a);

function loadPlaywright() {
  try { return require('playwright'); } catch { /* fall through */ }
  try { return require(require.resolve('playwright', { paths: [process.cwd(), '/usr/lib/node_modules', '/usr/local/lib/node_modules'] })); }
  catch { throw new Error('Playwright not found. Install it with `npm i -D playwright` (and `npx playwright install chromium`).'); }
}
function gsapLocal() {
  if (process.env.GSAP_FILE && existsSync(process.env.GSAP_FILE)) return process.env.GSAP_FILE;
  try { return require.resolve('gsap/dist/gsap.min.js', { paths: [process.cwd(), ROOT] }); } catch { return null; }
}

async function openPage() {
  const { chromium } = loadPlaywright();
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const g = gsapLocal();
  if (g) await page.route('**/gsap.min.js', r => r.fulfill({ path: g, contentType: 'application/javascript' }));
  page.on('pageerror', e => console.error('page error:', e.message));
  await page.goto(pathToFileURL(PAGE).href);
  await page.waitForFunction(() => typeof window.seekTo === 'function' && window.fontsReady, null, { timeout: 30000 });
  await page.evaluate(() => window.fontsReady);
  return { browser, page };
}

/* 1 · Render every frame from the canvas and pipe it into ffmpeg */
async function renderVideo() {
  const silent = join(OUT, 'video-silent.mp4');
  const { browser, page } = await openPage();
  const vo = await page.evaluate(() => window.VO);
  writeFileSync(join(OUT, 'vo-cues.json'), JSON.stringify(vo, null, 2));
  if (args.has('--skip-render') && existsSync(silent)) { await browser.close(); return { silent, vo }; }

  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-pix_fmt', 'yuv420p', '-r', String(FPS), '-movflags', '+faststart', silent], { stdio: ['pipe', 'inherit', 'inherit'] });
  const total = DUR * FPS;
  for (let f = 0; f < total; f++) {
    const b64 = await page.evaluate(t => { window.seekTo(t); return document.getElementById('stage').toDataURL('image/jpeg', 0.95).split(',')[1]; }, f / FPS);
    if (!ff.stdin.write(Buffer.from(b64, 'base64'))) await new Promise(r => ff.stdin.once('drain', r));
    if (f % FPS === 0) process.stdout.write(`\r› render ${String(f / FPS).padStart(2)} / ${DUR} s`);
  }
  ff.stdin.end();
  await new Promise((res, rej) => ff.on('close', c => (c === 0 ? res() : rej(new Error('ffmpeg failed: ' + c)))));
  process.stdout.write('\n');
  await browser.close();
  return { silent, vo };
}

/* 2 · ElevenLabs TTS, one clip per cue (cached by text + voice + model) */
async function makeVoice(vo) {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) { log('ELEVENLABS_API_KEY not set → building without voice-over'); return null; }
  const voice = process.env.ELEVENLABS_VOICE_ID || 'JBFqnCBsd6RMkjVDRZzb';
  const model = process.env.ELEVENLABS_MODEL || 'eleven_v3';
  const lang = process.env.ELEVENLABS_LANG ?? 'ca';
  const files = [];
  for (let i = 0; i < vo.length; i++) {
    const h = createHash('sha1').update([vo[i].text, voice, model, lang].join('|')).digest('hex').slice(0, 10);
    const file = join(VODIR, `${String(i + 1).padStart(2, '0')}-${h}.mp3`);
    if (!existsSync(file)) {
      const body = { text: vo[i].text, model_id: model, voice_settings: { stability: 0.55, similarity_boost: 0.8, style: 0.15, use_speaker_boost: true } };
      if (lang) body.language_code = lang;
      const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}?output_format=mp3_44100_128`, {
        method: 'POST', headers: { 'xi-api-key': key, 'Content-Type': 'application/json', Accept: 'audio/mpeg' }, body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`ElevenLabs ${res.status} on cue ${i + 1}: ${await res.text()}`);
      writeFileSync(file, Buffer.from(await res.arrayBuffer()));
      log(`voice ${i + 1}/${vo.length}: ${vo[i].text}`);
    }
    files.push(file);
  }
  return files;
}

const probe = f => Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).toString().trim());

/* 3 · Ambient bed + voice placed on its cues, ducked under the voice */
function mix(silent, vo, files) {
  const final = join(OUT, 'shindojo-60s.mp4');
  // forest air (filtered pink noise) + a slow drone that rises through act III and stops at the flash
  const drone = "aevalsrc='(0.045*sin(2*PI*98*t)+0.03*sin(2*PI*147*t)+0.02*sin(2*PI*196.5*t))*(0.7+0.3*sin(2*PI*0.08*t))" +
    "+0.028*sin(2*PI*294*t)*min(1,max(0,(t-40)/13))*lt(t,54.6)+0.03*sin(2*PI*220*t)*gte(t,54.6)*exp(-(t-54.6)/2.5)':s=44100:d=60";
  const inputs = ['-i', silent, '-f', 'lavfi', '-i', drone, '-f', 'lavfi', '-i', 'anoisesrc=color=pink:amplitude=0.05:d=60:r=44100'];
  let filter = '[1:a]aformat=channel_layouts=stereo[dr];[2:a]lowpass=f=700,highpass=f=120,volume=0.55,aformat=channel_layouts=stereo[wind];' +
    '[dr][wind]amix=inputs=2:normalize=0,afade=t=in:d=2.5,afade=t=out:st=57.5:d=2.5[bed]';
  const plan = [];
  if (files) {
    let prevEnd = 0;
    files.forEach((f, i) => {
      const raw = probe(f), start = Math.max(vo[i].at, prevEnd + 0.12);
      // slot = time until the next cue (or the end card); squeeze up to ×1.15 so the line lands on its scene
      const slot = (i + 1 < vo.length ? vo[i + 1].at : DUR - 1.2) - start - 0.12;
      const tempo = Math.min(1.15, Math.max(1, raw / Math.max(slot, 0.1)));
      const d = raw / tempo;
      plan.push({ cue: i + 1, at: vo[i].at, start: +start.toFixed(2), dur: +d.toFixed(2), tempo: +tempo.toFixed(3), drift: +(start - vo[i].at).toFixed(2) });
      prevEnd = start + d;
      inputs.push('-i', f);
      const ms = Math.round(start * 1000);
      filter += `;[${i + 3}:a]aformat=sample_rates=44100:channel_layouts=stereo,atempo=${tempo.toFixed(4)},adelay=${ms}|${ms}[v${i}]`;
    });
    filter += `;${files.map((_, i) => `[v${i}]`).join('')}amix=inputs=${files.length}:normalize=0,volume=1.0,asplit=2[voice][sc]` +
      ';[bed][sc]sidechaincompress=threshold=0.03:ratio=6:attack=20:release=400[duck];[duck][voice]amix=inputs=2:normalize=0,alimiter=limit=0.95[aout]';
    console.table(plan);
    if (prevEnd > DUR - 0.3) log(`⚠ voice runs to ${prevEnd.toFixed(1)} s — shorten a line or raise the speaking rate`);
  } else {
    filter += ';[bed]alimiter=limit=0.95[aout]';
  }
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...inputs, '-filter_complex', filter, '-map', '0:v', '-map', '[aout]',
    '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-t', String(DUR), '-movflags', '+faststart', final], { stdio: 'inherit' });
  writeFileSync(join(OUT, 'vo-plan.json'), JSON.stringify(plan, null, 2));
  return final;
}

const { silent, vo } = await renderVideo();
const files = args.has('--no-voice') ? null : await makeVoice(vo);
const final = mix(silent, vo, files);
log('done →', final, files ? '(with voice-over)' : '(ambient only, no voice-over)');
