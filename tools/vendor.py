"""読み取りのプログラム（MediaPipe Tasks Vision）とフォント（Zen Maru Gothic）を vendor/ に置く。
モデル（*.task）は GitHub Actions（.github/workflows/fetch-models.yml）が Google の公式配布元から取得する。

使い方: python3 tools/vendor.py   （npm が必要。画面の文言を変えたら流し直す：使う文字に合わせてフォントを選ぶため）
"""
import pathlib, re, shutil, subprocess, tarfile, tempfile, json
ROOT = pathlib.Path(__file__).resolve().parent.parent
VENDOR = ROOT / 'vendor'
TV_VERSION = '0.10.14'
FONT_PKG = '@fontsource/zen-maru-gothic@5.3.1'
WEIGHTS = (500, 700, 900)

def npm_pack(spec, dest):
    name = subprocess.run(['npm', 'pack', '--silent', spec], cwd=dest, check=True, capture_output=True, text=True).stdout.strip().splitlines()[-1]
    with tarfile.open(pathlib.Path(dest) / name) as t: t.extractall(dest, filter='data')
    return pathlib.Path(dest) / 'package'

def chars_used():
    text = ''.join((ROOT / 'src' / f).read_text() for f in ('app.html', 'about.html'))
    text += ''.join(json.loads((ROOT / 'assets' / 'voice' / 'voice.json').read_text()).keys())
    return {ord(c) for c in text} | set(range(0x20, 0x7f))

def in_ranges(cps, rng):
    for part in rng.split(','):
        part = part.strip().replace('U+', '')
        lo, _, hi = part.partition('-')
        lo = int(lo, 16); hi = int(hi, 16) if hi else lo
        if any(lo <= c <= hi for c in cps): return True
    return False

with tempfile.TemporaryDirectory() as tmp:
    # MediaPipe Tasks Vision（Apache-2.0）
    pkg = npm_pack(f'@mediapipe/tasks-vision@{TV_VERSION}', tmp)
    out = VENDOR / 'tasks-vision'; shutil.rmtree(out, ignore_errors=True); (out / 'wasm').mkdir(parents=True)
    shutil.copy(pkg / 'vision_bundle.mjs', out); shutil.copy(pkg / 'LICENSE', out) if (pkg / 'LICENSE').exists() else None
    for f in (pkg / 'wasm').iterdir(): shutil.copy(f, out / 'wasm')
    shutil.rmtree(pkg)
    # フォント：使う文字を含むサブセットだけ（woff2）
    pkg = npm_pack(FONT_PKG, tmp)
    used = chars_used()
    out = VENDOR / 'fonts'; shutil.rmtree(out, ignore_errors=True); (out / 'files').mkdir(parents=True)
    css, n = [], 0
    for w in WEIGHTS:
        for block in re.findall(r'@font-face \{.*?\}', (pkg / f'{w}.css').read_text(), re.S):
            rng = re.search(r'unicode-range: ([^;]+);', block).group(1)
            if not in_ranges(used, rng): continue
            woff2 = re.search(r'url\(\./files/([^)]+\.woff2)\)', block).group(1)
            shutil.copy(pkg / 'files' / woff2, out / 'files')
            css.append(re.sub(r"src: [^;]+;", f"src: url(./files/{woff2}) format('woff2');", block)); n += 1
    (out / 'fonts.css').write_text('/* Zen Maru Gothic（SIL OFL 1.1）。このアプリで使う文字を含むサブセットだけ */\n' + '\n'.join(css) + '\n')
    shutil.copy(pkg / 'LICENSE', out / 'LICENSE')
print('vendored: tasks-vision', TV_VERSION, '/ font subsets', n)
