// 通しテスト：偽のカメラ映像で index.html を動かし、数え方・画面遷移・はみ出し・エラーを確かめる。
// 準備: sh tests/e2e/setup.sh && python3 tests/e2e/make_videos.py（モデルと MediaPipe は vendor/ のものを使う）
// 実行: node tests/e2e/run.mjs   （Chromium の場所は CHROMIUM_PATH で指定。既定 /opt/pw-browsers/chromium）
import { createRequire } from 'module';
import http from 'http'; import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(HERE, '../..');
const { chromium } = createRequire(path.join(HERE, 'node', 'x.js'))('playwright-core');
const TYPES = { html: 'text/html', mjs: 'text/javascript', js: 'text/javascript', wasm: 'application/wasm', css: 'text/css', woff2: 'font/woff2' };
const server = http.createServer((req, res) => {
  const f = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); res.end(); } else { res.writeHead(200, { 'content-type': TYPES[f.split('.').pop()] || 'application/octet-stream' }); res.end(d); } });
}).listen(0);
const PORT = server.address().port;
const VIEWPORTS = [[390, 844], [844, 390], [820, 1180], [1180, 820]];

async function open(video, [w, h], { locale = 'ja-JP', query = '' } = {}) {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', `--use-file-for-fake-video-capture=${path.join(HERE, 'videos', video + '.y4m')}`, '--autoplay-policy=no-user-gesture-required'] });
  const page = await (await browser.newContext({ permissions: ['camera'], viewport: { width: w, height: h }, locale })).newPage();
  const errors = []; page.on('pageerror', e => errors.push(String(e).slice(0, 160)));
  const external = []; page.on('request', r => { const u = new URL(r.url()); if (!['localhost', '127.0.0.1'].includes(u.hostname) && !['data:', 'blob:'].includes(u.protocol)) external.push(u.href.slice(0, 100)); });
  await page.goto(`http://localhost:${PORT}/index.html${query}`);
  await page.evaluate(() => { try { localStorage.clear(); } catch (e) {} });
  await page.click('#go'); await page.waitForSelector('#menu:not([hidden])', { timeout: 30000 });
  return { browser, page, errors, external };
}
// 保護者ゲートの問題に答えて「おうちのかた」を開く
async function openParent(page) {
  await page.click('#openSheet');
  const q = await page.textContent('#gateQ'); const [a, b] = q.split('=')[0].split('×').map(Number);
  await page.click(`#gateOpts [data-ans="${a * b}"]`); await page.waitForSelector('#parent:not([hidden])');
}
async function play(page, game, stage) {
  await page.click(`[data-game="${game}"]`); await page.waitForSelector('#app:not([hidden])', { timeout: 60000 });
  if (stage) { await openParent(page); await page.click(`[data-stage="${stage}"]`); }
  await page.waitForTimeout(3500);
}
const overflow = page => page.evaluate(() => { const W = innerWidth, H = innerHeight, bad = []; document.querySelectorAll('body *').forEach(el => { const r = el.getBoundingClientRect(); if (r.width && el.offsetParent && !el.closest('.screen') && (r.right > W + 1 || r.bottom > H + 1 || r.left < -1)) bad.push(el.id || el.className); }); return bad.concat(document.documentElement.scrollWidth > W ? ['page-scroll'] : []); });

const tests = [];
const t = (name, fn) => tests.push({ name, fn });
t('外部への通信がゼロ（読み取り・フォント・音声すべて同梱）', async () => { const s = await open('two_hands', [820, 1180]); await play(s.page, 'yubi'); await s.page.click('#back'); await play(s.page, 'katachi'); await s.browser.close(); return [!s.external.length && !s.errors.length, `external=${s.external} ${s.errors}`]; });
t('保護者ゲート：まちがえると開かず、正しく答えると開く', async () => {
  const s = await open('two_hands', [390, 844]); await play(s.page, 'yubi');
  await s.page.click('#openSheet'); const q = await s.page.textContent('#gateQ'); const [a, b] = q.split('=')[0].split('×').map(Number);
  const wrong = await s.page.$$eval('#gateOpts [data-ans]', (bs, ans) => bs.map(x => +x.dataset.ans).find(v => v !== ans), a * b);
  await s.page.click(`#gateOpts [data-ans="${wrong}"]`); const closed = await s.page.isHidden('#parent');
  await openParent(s.page); const opened = await s.page.isVisible('#parent'); await s.browser.close();
  return [closed && opened, `closed=${closed} opened=${opened}`];
});
t('ゆび 6〜10：下向きの手は数えない（両手の写真 → 5）', async () => { const s = await open('two_hands', [820, 1180]); await play(s.page, 'yubi', '2'); const n = await s.page.textContent('#n'); await s.browser.close(); return [n === '5' && !s.errors.length, `n=${n} ${s.errors}`]; });
t('ゆび：サムズアップ → 1', async () => { const s = await open('thumb_up', [820, 1180]); await play(s.page, 'yubi'); const n = await s.page.textContent('#n'); await s.browser.close(); return [n === '1' && !s.errors.length, `n=${n} ${s.errors}`]; });
t('じゆう：見せた数だけりんご＋声', async () => { const s = await open('two_hands', [820, 1180]); await play(s.page, 'free'); const r = await s.page.evaluate(() => ({ a: document.querySelectorAll('#apples .apple').length, talk: window.__talkLog || [] })); await s.browser.close(); return [r.a === 5 && r.talk.includes('ko5'), JSON.stringify(r)]; });
t('とけい・かたち：骨格モデルが動く（エラーなし）', async () => { const s = await open('pose_sitting', [820, 1180]); await play(s.page, 'tokei'); await s.page.click('#back'); await play(s.page, 'katachi'); const ok = !s.errors.length; await s.browser.close(); return [ok, String(s.errors)]; });
t('シールが保存され、時間切れで終わる', async () => {
  const s = await open('thumb_up', [390, 844]); await play(s.page, 'yubi');
  await s.page.evaluate(() => window.__dev.award()); await s.page.waitForTimeout(2600);
  await openParent(s.page); await s.page.click('[data-limit="5"]'); await s.page.click('#closeSheet');
  await s.page.evaluate(() => window.__dev.expire()); await s.page.waitForTimeout(800);
  const title = await s.page.textContent('#doneTitle');
  await s.page.reload(); await s.page.click('#go'); await s.page.waitForSelector('#menu:not([hidden])');
  const count = await s.page.textContent('#stickerCount'); await s.browser.close();
  return [title.includes('ここまで') && count === '1', `title=${title} stickers=${count}`];
});
// ことば：端末が英語なら英語で始まり、声も英語の組み立てになる。保護者の設定で切り替えられ、次回も覚えている
t('英語：端末が英語なら英語の画面と声（とけいは英語専用の文）', async () => {
  const s = await open('pose_sitting', [1180, 820], { locale: 'en-US' });
  const r1 = await s.page.evaluate(() => ({ title: document.querySelector('#menu h1').textContent, name: document.querySelector('[data-game="yubi"] .name').textContent, lang: document.documentElement.lang }));
  await play(s.page, 'tokei');
  const r2 = await s.page.evaluate(() => ({ label: document.getElementById('tLabel').textContent, talk: window.__talkLog || [], audio: window.__audio.state() }));
  await s.browser.close();
  const ok = r1.lang === 'en' && r1.name === 'Finger Count' && /o'clock/.test(r2.label) && r2.talk.some(k => /^t\d+/.test(k)) && r2.audio.decoded === r2.audio.total && r2.audio.total > 90 && !s.errors.length;
  return [ok, JSON.stringify({ r1, r2: { ...r2, talk: r2.talk.slice(-3) } }) + s.errors];
});
t('英語：たしざんは英語の1文で読み上げ、?lang=ja で日本語に戻せる', async () => {
  const s = await open('two_hands', [820, 1180], { locale: 'en-US' });
  await play(s.page, 'yubi', '3');
  const r1 = await s.page.evaluate(() => ({ prompt: document.getElementById('prompt').textContent, talk: (window.__talkLog || []).filter(k => k.startsWith('add')).pop() || '' }));
  await s.page.goto(s.page.url().replace('index.html', 'index.html?lang=ja')); await s.page.click('#go'); await s.page.waitForSelector('#menu:not([hidden])');
  const ja = await s.page.textContent('[data-game="yubi"] .name'); await s.browser.close();
  return [r1.prompt === 'How many in all?' && /^add_\d_\d$/.test(r1.talk) && ja === 'ゆびで かぞえよう', JSON.stringify(r1) + ja];
});
t('ことばの切り替え：おうちのかたで English → 問題が出し直され、次回も英語', async () => {
  const s = await open('two_hands', [390, 844]); await play(s.page, 'yubi');
  await openParent(s.page); await s.page.click('#parent [data-lang="en"]');
  await s.page.waitForTimeout(500);
  const r = await s.page.evaluate(() => ({ prompt: document.getElementById('prompt').textContent, level: document.getElementById('level').textContent, back: document.getElementById('back').textContent }));
  await s.page.reload(); const go = await s.page.textContent('#go'); await s.browser.close();
  return [r.prompt === 'How many apples?' && r.back === 'Back' && go === 'Start' && !s.errors.length, JSON.stringify(r) + go + s.errors];
});
t('英語：about ページも英語で開く', async () => {
  const s = await open('two_hands', [390, 844], { locale: 'en-US' });
  await s.page.goto(s.page.url().replace('index.html', 'about.html'));
  const r = await s.page.evaluate(() => ({ en: !document.getElementById('en').hidden, ja: !document.getElementById('ja').hidden }));
  await s.browser.close(); return [r.en && !r.ja, JSON.stringify(r)];
});
for (const lang of ['en-US']) for (const vp of VIEWPORTS) for (const g of ['yubi', 'tokei'])
  t(`表示（英語） ${vp.join('x')} ${g}：はみ出し・エラーなし`, async () => { const s = await open(g === 'yubi' ? 'two_hands' : 'pose_sitting', vp, { locale: lang }); const m = await overflow(s.page); await play(s.page, g); const b = await overflow(s.page); await s.browser.close(); return [!m.length && !b.length && !s.errors.length, `menu=${m} game=${b} ${s.errors}`]; });
for (const vp of VIEWPORTS) for (const g of ['yubi', 'tokei', 'katachi', 'free'])
  t(`表示 ${vp.join('x')} ${g}：はみ出し・エラーなし`, async () => { const s = await open(g === 'yubi' || g === 'free' ? 'two_hands' : 'pose_sitting', vp); const m = await overflow(s.page); await play(s.page, g); const b = await overflow(s.page); await s.browser.close(); return [!m.length && !b.length && !s.errors.length, `menu=${m} game=${b} ${s.errors}`]; });

let pass = 0;
const run = tests.filter(x => !process.env.ONLY || x.name.includes(process.env.ONLY));   // ONLY=文字列 で絞り込める
for (const { name, fn } of run) {
  let ok = false, detail = '';
  try { [ok, detail] = await fn(); } catch (e) { detail = String(e).slice(0, 200); }
  if (ok) pass++; console.log((ok ? 'OK ' : 'NG ') + name + (ok ? '' : `  (${detail})`));
}
console.log(`${pass}/${run.length} passed`); server.close(); process.exit(pass === run.length ? 0 : 1);
