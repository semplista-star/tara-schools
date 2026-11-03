#!/usr/bin/env node
/**
 * Shin Dojo · vídeo explicatiu (60 s) — muntatge amb ffmpeg a partir de shots.json.
 *
 *   node motion/shindojo/explicatiu/scripts/build.mjs
 *
 * Per a cada pla busca footage/<id>.(mp4|mov|m4v|webm|jpg|jpeg|png|webp).
 *   · vídeo  → s'escala/retalla a 1920×1080 (opcional "in" a shots.json = segon d'inici)
 *   · foto   → moviment Ken Burns suau (zoom amb easing sinusoidal)
 *   · cap    → targeta de storyboard que descriu què cal gravar
 * Després: fosos encadenats (xfade), etalonatge comú, títols animats i subtítols (ASS),
 * i un llit sonor ambiental. La veu es posa després, fora d'aquí, seguint subtitols.ca.srt.
 *
 * Sortides (build/):
 *   shindojo-explicatiu-60s.mp4       títols + subtítols cremats
 *   shindojo-explicatiu-60s-net.mp4   només títols (per afegir-hi veu i subtítols a part)
 * I al costat de shots.json (es versionen): subtitols.ca.srt, subtitols.ca.ass, guio.md
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const BUILD = join(HERE, 'build'), SEG = join(BUILD, 'seg'), FONTS = join(BUILD, 'fonts'), FOOT = join(HERE, 'footage');
[BUILD, SEG, FONTS, FOOT].forEach(d => mkdirSync(d, { recursive: true }));
const cfg = JSON.parse(readFileSync(join(HERE, 'shots.json'), 'utf8'));
const { fps: FPS, transition: TR, wordsPerSecond: WPS } = cfg;
const W = 1920, H = 1080;
const ff = (args, quiet = true) => execFileSync('ffmpeg', ['-y', '-hide_banner', '-loglevel', quiet ? 'error' : 'info', ...args], { stdio: ['ignore', 'inherit', 'inherit'] });
const log = (...a) => console.log('›', ...a);

/* ── timeline ── */
let acc = 0;
const shots = cfg.shots.map((s, i) => { const o = { ...s, idx: i, start: acc, end: acc + s.dur }; acc += s.dur; return o; });
const TOTAL = acc;
const tc = t => { const m = Math.floor(t / 60), s = t - m * 60; return `${String(m).padStart(2, '0')}:${s.toFixed(1).padStart(4, '0')}`; };

/* ── fonts (Google Fonts, OFL) ── */
const FONT_URLS = {
  'ShipporiMinchoB1-800.ttf': 'https://fonts.gstatic.com/s/shipporiminchob1/v24/wXK1E2wCr44tulPdnn-xbIpJ9RgT9-nKLoxP3g.ttf',
  'ShipporiMinchoB1-500.ttf': 'https://fonts.gstatic.com/s/shipporiminchob1/v24/wXK1E2wCr44tulPdnn-xbIpJ9RgT9-nKeolP3g.ttf',
  'ZenKakuGothicNew-700.ttf': 'https://fonts.gstatic.com/s/zenkakugothicnew/v19/gNMVW2drQpDw0GjzrVNFf_valaDBcznOqodNaWQ.ttf',
  'ZenKakuGothicNew-500.ttf': 'https://fonts.gstatic.com/s/zenkakugothicnew/v19/gNMVW2drQpDw0GjzrVNFf_valaDBcznOqs9LaWQ.ttf',
  'DMMono-500.ttf': 'https://fonts.gstatic.com/s/dmmono/v16/aFTR7PB1QTsUX8KYvumzIYQ.ttf',
};
for (const [f, url] of Object.entries(FONT_URLS)) {
  const p = join(FONTS, f);
  if (!existsSync(p)) { log('font', f); execFileSync('curl', ['-sSfL', '-o', p, url]); }
}
const F = n => join(FONTS, n).replace(/:/g, '\\:');

/* ── helpers ── */
function wrap(text, max) {
  const words = text.split(' '), lines = []; let cur = '';
  for (const w of words) { if ((cur + ' ' + w).trim().length > max && cur) { lines.push(cur); cur = w; } else cur = (cur + ' ' + w).trim(); }
  if (cur) lines.push(cur);
  return lines;
}
// two balanced subtitle lines (≤ 42 chars each when possible)
function subLines(text) {
  if (text.length <= 42) return [text];
  const words = text.split(' '); let best = null;
  for (let i = 1; i < words.length; i++) {
    const a = words.slice(0, i).join(' '), b = words.slice(i).join(' ');
    const score = Math.max(a.length, b.length) + (/[,:.]$/.test(a) ? -6 : 0);
    if (!best || score < best.score) best = { a, b, score };
  }
  return [best.a, best.b];
}
const findFootage = id => {
  const exts = ['mp4', 'mov', 'm4v', 'webm', 'jpg', 'jpeg', 'png', 'webp'];
  const files = existsSync(FOOT) ? readdirSync(FOOT) : [];
  for (const e of exts) { const f = files.find(x => x.toLowerCase() === `${id}.${e}`); if (f) return { path: join(FOOT, f), kind: ['jpg', 'jpeg', 'png', 'webp'].includes(e) ? 'image' : 'video' }; }
  return null;
};
const esc = s => s.replace(/\\/g, '\\\\').replace(/:/g, '\\:').replace(/'/g, '\u2019').replace(/%/g, '\\%');

/* ── 1 · one segment per shot ── */
const GRADE = 'eq=contrast=1.05:saturation=0.9:gamma=0.98,colorbalance=rs=0.03:bs=-0.03:rh=0.02:bh=-0.02,vignette=PI/4.5';
const report = [];
for (const s of shots) {
  const L = s.idx === shots.length - 1 ? s.dur : s.dur + TR;
  const out = join(SEG, `${s.id}.mp4`);
  const src = findFootage(s.id);
  const N = Math.round(L * FPS);
  const blur = s.idx === shots.length - 1 ? ',gblur=sigma=14,eq=brightness=-0.08' : '';
  const enc = ['-an', '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-r', String(FPS), '-frames:v', String(N), out];
  if (src?.kind === 'video') {
    ff(['-stream_loop', '-1', '-ss', String(s.in || 0), '-i', src.path,
      '-vf', `scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},fps=${FPS},setsar=1,${GRADE}${blur}`, ...enc]);
  } else if (src?.kind === 'image') {
    // Ken Burns: sine-eased zoom 1.00 → 1.08, drifting toward the centre
    const z = `1+0.08*(0.5-0.5*cos(PI*on/${N}))`;
    ff(['-loop', '1', '-i', src.path, '-vf',
      `scale=${W * 2}:${H * 2}:force_original_aspect_ratio=increase,crop=${W * 2}:${H * 2},zoompan=z='${z}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${N}:s=${W}x${H}:fps=${FPS},setsar=1,${GRADE}${blur}`, ...enc]);
  } else {
    // storyboard card
    const desc = wrap(s.imatge, 46);
    const draws = [
      `drawtext=fontfile='${F('DMMono-500.ttf')}':text='${esc(`${s.id.toUpperCase()}  ·  ${tc(s.start)} – ${tc(s.end)}  ·  ${s.act.toUpperCase()}`)}':x=150:y=150:fontsize=26:fontcolor=0xd6a54a`,
      ...desc.map((l, i) => `drawtext=fontfile='${F('ZenKakuGothicNew-500.ttf')}':text='${esc(l)}':x=150:y=${210 + i * 56}:fontsize=40:fontcolor=0xece6d6@0.82`),
      `drawtext=fontfile='${F('DMMono-500.ttf')}':text='${esc(s.pla.toUpperCase())}':x=150:y=${230 + desc.length * 56}:fontsize=22:fontcolor=0xece6d6@0.5`,
      `drawtext=fontfile='${F('DMMono-500.ttf')}':text='${esc(`FALTA METRATGE  ·  footage/${s.id}.mp4  (o .jpg)`)}':x=w-tw-150:y=150:fontsize=22:fontcolor=0xece6d6@0.45`,
      `drawbox=x=150:y=${290 + desc.length * 56}:w=420:h=2:color=0xece6d6@0.18:t=fill`,
    ].join(',');
    // slow light drift so the card isn't a frozen frame
    // a soft light that drifts slowly so the card isn't a frozen frame (glow rendered once, then moved)
    const glow = join(BUILD, 'glow.png');
    if (!existsSync(glow)) ff(['-f', 'lavfi', '-i', `color=c=black:s=${W + 400}x${H}:d=1`, '-frames:v', '1', '-vf', `format=gray,geq=lum='255*exp(-((X-${(W + 400) * 0.62})^2+(Y-${H * 0.38})^2)/180000)'`, glow]);
    ff(['-f', 'lavfi', '-i', `color=c=0x13241c:s=${W}x${H}:r=${FPS}:d=${L}`, '-loop', '1', '-i', glow,
      '-filter_complex', `[1:v]format=yuv420p,colorchannelmixer=rr=0.16:gg=0.24:bb=0.18[g];[0:v][g]overlay=x='-200+120*sin(t*0.25)':y=0:shortest=1,vignette=PI/4,${draws}`,
      ...enc]);
  }
  report.push({ pla: s.id, inici: tc(s.start), dur: s.dur, font: src ? src.path.replace(HERE + '/', '') : 'storyboard' });
}
console.table(report);

/* ── 2 · join with eased crossfades ── */
const raw = join(BUILD, 'video-raw.mp4');
{
  const ins = shots.flatMap(s => ['-i', join(SEG, `${s.id}.mp4`)]);
  let fc = '', last = '0:v';
  shots.slice(1).forEach((s, i) => {
    const o = `x${i}`;
    fc += `${fc ? ';' : ''}[${last}][${i + 1}:v]xfade=transition=fade:duration=${TR}:offset=${s.start.toFixed(3)}[${o}]`;
    last = o;
  });
  ff([...ins, '-filter_complex', fc, '-map', `[${last}]`, '-c:v', 'libx264', '-preset', 'medium', '-crf', '17', '-pix_fmt', 'yuv420p', '-r', String(FPS), '-t', String(TOTAL), raw]);
}

/* ── 3 · titles + subtitles (ASS) and SRT ── */
const assTime = t => { const h = Math.floor(t / 3600), m = Math.floor(t / 60) % 60, s = t % 60; return `${h}:${String(m).padStart(2, '0')}:${s.toFixed(2).padStart(5, '0')}`; };
const srtTime = t => { const ms = Math.round(t * 1000), h = Math.floor(ms / 3600000), m = Math.floor(ms / 60000) % 60, s = Math.floor(ms / 1000) % 60; return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(ms % 1000).padStart(3, '0')}`; };
const subs = [], warnings = [];
for (const s of shots) {
  const words = s.vo.split(/\s+/).length, need = words / WPS;
  const start = s.start + (s.idx === 0 ? 0.6 : 0.35);
  const end = Math.min(s.end - 0.12, start + Math.max(1.6, need + 0.5));
  if (need > end - start) warnings.push(`${s.id}: ${words} paraules ≈ ${need.toFixed(1)} s, però només hi ha ${(end - start).toFixed(1)} s`);
  subs.push({ id: s.id, start, end, text: s.vo, lines: subLines(s.vo), words, need });
}
const STYLE_HDR = `[Script Info]
Title: ${cfg.title}
ScriptType: v4.00+
PlayResX: ${W}
PlayResY: ${H}
WrapStyle: 2
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Hero,Shippori Mincho B1 ExtraBold,112,&H00D6E6EC,&H00D6E6EC,&H00101810,&H90000000,0,0,0,0,100,100,0,0,1,0,4,5,80,80,0,1
Style: Logo,Shippori Mincho B1 ExtraBold,150,&H00D6E6EC,&H00D6E6EC,&H00101810,&H90000000,0,0,0,0,100,100,22,0,1,0,4,5,80,80,0,1
Style: Kicker,DM Mono Medium,30,&H004AA5D6,&H004AA5D6,&H00101810,&HA0000000,0,0,0,0,100,100,8,0,1,0,2,5,80,80,0,1
Style: Lower,Zen Kaku Gothic New,54,&H00D6E6EC,&H00D6E6EC,&H00101810,&H90000000,-1,0,0,0,100,100,0,0,1,0,3,5,80,80,0,1
Style: Sub,Zen Kaku Gothic New,46,&H00FFFFFF,&H00FFFFFF,&H00101810,&H96000000,-1,0,0,0,100,100,0,0,1,2.6,1.2,2,160,160,62,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;
const overlayEvents = shots.flatMap(s => (s.overlay || []).map(o => {
  const st = s.start + o.in, en = s.start + o.out, d = Math.round((en - st) * 1000);
  const [x, y] = o.pos || (o.style === 'Logo' ? [960, 520] : [960, 545]);
  const an = o.an || 5;
  // ease-out settle from 106% (accel 0.35 ≈ power-out), then a slow type "Ken Burns"
  const tags = `{\\an${an}\\pos(${x},${y})\\fscx106\\fscy106\\fad(650,500)\\t(0,900,0.35,\\fscx100\\fscy100)\\t(900,${d},1,\\fscx102\\fscy102)}`;
  return `Dialogue: 1,${assTime(st)},${assTime(en)},${o.style},,0,0,0,,${tags}${o.text}`;
}));
const subEvents = subs.map(s => `Dialogue: 2,${assTime(s.start)},${assTime(s.end)},Sub,,0,0,0,,{\\fad(180,180)}${s.lines.join('\\N')}`);
const assTitles = join(BUILD, 'titols.ass'), assAll = join(BUILD, 'titols-subtitols.ass');
writeFileSync(assTitles, STYLE_HDR + overlayEvents.join('\n') + '\n');
writeFileSync(assAll, STYLE_HDR + [...overlayEvents, ...subEvents].join('\n') + '\n');
writeFileSync(join(HERE, 'subtitols.ca.ass'), STYLE_HDR + subEvents.join('\n') + '\n');
writeFileSync(join(HERE, 'subtitols.ca.srt'), subs.map((s, i) => `${i + 1}\n${srtTime(s.start)} --> ${srtTime(s.end)}\n${s.lines.join('\n')}\n`).join('\n'));

/* ── 4 · ambient bed + burn ── */
const bed = join(BUILD, 'ambient.wav');
ff(['-f', 'lavfi', '-i', `aevalsrc='(0.035*sin(2*PI*98*t)+0.022*sin(2*PI*147*t)+0.014*sin(2*PI*196.5*t))*(0.7+0.3*sin(2*PI*0.08*t))':s=44100:d=${TOTAL}`,
  '-f', 'lavfi', '-i', `anoisesrc=color=pink:amplitude=0.05:d=${TOTAL}:r=44100`,
  '-filter_complex', `[0:a]aformat=channel_layouts=stereo[a];[1:a]lowpass=f=650,highpass=f=120,volume=0.5,aformat=channel_layouts=stereo[b];[a][b]amix=inputs=2:normalize=0,afade=t=in:d=2.5,afade=t=out:st=${TOTAL - 2.5}:d=2.5,alimiter=limit=0.9`, bed]);
const burn = (ass, out) => ff(['-i', raw, '-i', bed, '-vf', `ass='${ass.replace(/:/g, '\\:')}':fontsdir='${FONTS.replace(/:/g, '\\:')}'`,
  // capped so the 60 s file stays ≈ 15–20 MB (easy to upload and share)
  '-c:v', 'libx264', '-preset', 'slow', '-crf', '21', '-maxrate', '2400k', '-bufsize', '4800k', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '128k', '-t', String(TOTAL), '-movflags', '+faststart', out]);
burn(assAll, join(BUILD, 'shindojo-explicatiu-60s.mp4'));
burn(assTitles, join(BUILD, 'shindojo-explicatiu-60s-net.mp4'));

/* ── 5 · guió (markdown) ── */
const md = [`# ${cfg.title}`, '',
  `Durada: ${TOTAL} s · 1920×1080 · ${FPS} fps · fosos de ${TR} s · ritme de locució previst: ${WPS} paraules/s.`, '',
  'Cada pla indica què cal gravar, el text de la veu en off (per a ElevenLabs) i els rètols que surten a pantalla. El fitxer `subtitols.ca.srt` té els temps exactes de cada frase.', '',
  '| Pla | Temps | Acte | Imatge que cal gravar | Veu en off | Rètols |', '|---|---|---|---|---|---|',
  ...shots.map((s, i) => `| ${s.id} | ${tc(s.start)}–${tc(s.end)} | ${s.act} | **${s.pla}.** ${s.imatge} | «${s.vo}» (${subs[i].words} paraules, ≈${subs[i].need.toFixed(1)} s) | ${(s.overlay || []).map(o => o.text.replace(/\{[^}]*\}/g, '').replace(/\\N/g, ' ')).join(' · ') || '—'} |`),
  '', '## Text complet de la veu en off', '', ...shots.map(s => `${s.vo}`), '',
  '## Notes per a la locució (ElevenLabs)', '',
  '- Veu càlida i pausada, en català central. Model recomanat: `eleven_v3` amb `language_code: "ca"`.',
  '- Genera una frase per pla i col·loca-la a l\'inici del subtítol corresponent (`subtitols.ca.srt`).',
  '- Si una frase dura més que el seu subtítol, accelera-la com a màxim un 10–15 % o allarga el pla a `shots.json` i torna a muntar.',
  '', '## Com posar-hi les imatges reals', '',
  'Desa cada clip o foto a `footage/` amb el nom del pla (`pla01.mp4`, `pla05.jpg`…) i executa `node motion/shindojo/explicatiu/scripts/build.mjs`. Els plans sense material surten com a targeta de storyboard. Per començar un clip més tard, afegeix `"in": 12.5` al pla.', '',
];
if (warnings.length) md.push('## Avisos de ritme', '', ...warnings.map(w => `- ${w}`), '');
writeFileSync(join(HERE, 'guio.md'), md.join('\n'));
if (warnings.length) warnings.forEach(w => log('⚠', w));
log('fet →', join(BUILD, 'shindojo-explicatiu-60s.mp4'));
