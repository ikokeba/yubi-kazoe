// 通しテスト：偽のカメラ映像で index.html を動かし、数え方・画面遷移・はみ出し・エラーを確かめる。
// 準備: sh tests/e2e/fetch_models.sh && python3 tests/e2e/make_videos.py
// 実行: node tests/e2e/run.mjs   （Chromium の場所は CHROMIUM_PATH で指定。既定 /opt/pw-browsers/chromium）
import { createRequire } from 'module';
import http from 'http'; import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(HERE, '../..'), MODELS = path.join(HERE, 'models');
const { chromium } = createRequire(path.join(MODELS, 'x.js'))('playwright-core');
const TV = path.join(MODELS, 'node_modules/@mediapipe/tasks-vision');
const server = http.createServer((req, res) => {
  const f = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); res.end(); } else { res.writeHead(200, { 'content-type': f.endsWith('.html') ? 'text/html' : 'application/octet-stream' }); res.end(d); } });
}).listen(0);
const PORT = server.address().port;
const VIEWPORTS = [[390, 844], [844, 390], [820, 1180], [1180, 820]];

async function open(video, [w, h]) {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', `--use-file-for-fake-video-capture=${path.join(HERE, 'videos', video + '.y4m')}`, '--autoplay-policy=no-user-gesture-required'] });
  const page = await (await browser.newContext({ permissions: ['camera'], viewport: { width: w, height: h } })).newPage();
  const errors = []; page.on('pageerror', e => errors.push(String(e).slice(0, 160)));
  await page.route('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/**', r => { const p = new URL(r.request().url()).pathname.replace('/npm/@mediapipe/tasks-vision@0.10.14', ''); r.fulfill({ path: TV + p, contentType: /\.m?js$/.test(p) ? 'text/javascript' : p.endsWith('.wasm') ? 'application/wasm' : undefined }); });
  await page.route('https://storage.googleapis.com/**', r => r.fulfill({ path: path.join(MODELS, r.request().url().includes('pose') ? 'pose_landmarker_lite.task' : 'hand_landmarker.task') }));
  await page.route('https://fonts.**', r => r.abort());
  await page.route(/\?check=/, r => r.continue());
  await page.goto(`http://localhost:${PORT}/index.html`);
  await page.evaluate(() => { try { localStorage.clear(); } catch (e) {} });
  await page.click('#go'); await page.waitForSelector('#menu:not([hidden])', { timeout: 30000 });
  return { browser, page, errors };
}
async function play(page, game, stage) {
  await page.click(`[data-game="${game}"]`); await page.waitForSelector('#app:not([hidden])', { timeout: 60000 });
  if (stage) { await page.click('#openSheet'); await page.click(`[data-stage="${stage}"]`); }
  await page.waitForTimeout(3500);
}
const overflow = page => page.evaluate(() => { const W = innerWidth, H = innerHeight, bad = []; document.querySelectorAll('body *').forEach(el => { const r = el.getBoundingClientRect(); if (r.width && el.offsetParent && !el.closest('.screen') && (r.right > W + 1 || r.bottom > H + 1 || r.left < -1)) bad.push(el.id || el.className); }); return bad.concat(document.documentElement.scrollWidth > W ? ['page-scroll'] : []); });

const tests = [];
const t = (name, fn) => tests.push({ name, fn });
t('ゆび 6〜10：下向きの手は数えない（両手の写真 → 5）', async () => { const s = await open('two_hands', [820, 1180]); await play(s.page, 'yubi', '2'); const n = await s.page.textContent('#n'); await s.browser.close(); return [n === '5' && !s.errors.length, `n=${n} ${s.errors}`]; });
t('ゆび：サムズアップ → 1', async () => { const s = await open('thumb_up', [820, 1180]); await play(s.page, 'yubi'); const n = await s.page.textContent('#n'); await s.browser.close(); return [n === '1' && !s.errors.length, `n=${n} ${s.errors}`]; });
t('じゆう：見せた数だけりんご＋声', async () => { const s = await open('two_hands', [820, 1180]); await play(s.page, 'free'); const r = await s.page.evaluate(() => ({ a: document.querySelectorAll('#apples .apple').length, talk: window.__talkLog || [] })); await s.browser.close(); return [r.a === 5 && r.talk.includes('ko5'), JSON.stringify(r)]; });
t('とけい・かたち：骨格モデルが動く（エラーなし）', async () => { const s = await open('pose_sitting', [820, 1180]); await play(s.page, 'tokei'); await s.page.click('#back'); await play(s.page, 'katachi'); const ok = !s.errors.length; await s.browser.close(); return [ok, String(s.errors)]; });
t('シールが保存され、時間切れで終わる', async () => {
  const s = await open('thumb_up', [390, 844]); await play(s.page, 'yubi');
  await s.page.evaluate(() => window.__dev.award()); await s.page.waitForTimeout(2600);
  await s.page.click('#openSheet'); await s.page.click('[data-limit="5"]'); await s.page.click('#closeSheet');
  await s.page.evaluate(() => window.__dev.expire()); await s.page.waitForTimeout(800);
  const title = await s.page.textContent('#doneTitle');
  await s.page.reload(); await s.page.click('#go'); await s.page.waitForSelector('#menu:not([hidden])');
  const count = await s.page.textContent('#stickerCount'); await s.browser.close();
  return [title.includes('ここまで') && count === '1', `title=${title} stickers=${count}`];
});
for (const vp of VIEWPORTS) for (const g of ['yubi', 'tokei', 'katachi', 'free'])
  t(`表示 ${vp.join('x')} ${g}：はみ出し・エラーなし`, async () => { const s = await open(g === 'yubi' || g === 'free' ? 'two_hands' : 'pose_sitting', vp); const m = await overflow(s.page); await play(s.page, g); const b = await overflow(s.page); await s.browser.close(); return [!m.length && !b.length && !s.errors.length, `menu=${m} game=${b} ${s.errors}`]; });

let pass = 0;
for (const { name, fn } of tests) {
  let ok = false, detail = '';
  try { [ok, detail] = await fn(); } catch (e) { detail = String(e).slice(0, 200); }
  if (ok) pass++; console.log((ok ? 'OK ' : 'NG ') + name + (ok ? '' : `  (${detail})`));
}
console.log(`${pass}/${tests.length} passed`); server.close(); process.exit(pass === tests.length ? 0 : 1);
