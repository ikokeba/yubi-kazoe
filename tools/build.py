"""src/app.html に音声データと版番号を差し込んで、公開用の index.html を作る。

使い方: python3 tools/build.py        （版番号は VERSION ファイルから読む）
"""
import json, pathlib
ROOT = pathlib.Path(__file__).resolve().parent.parent
version = (ROOT / 'VERSION').read_text().strip()
src = (ROOT / 'src' / 'app.html').read_text()
voice = json.loads((ROOT / 'assets' / 'voice' / 'voice.json').read_text())
out = src.replace('/*VOICE_DATA*/{}', json.dumps(voice, separators=(',', ':'))).replace('__VERSION__', version)
assert '__VERSION__' not in out and '/*VOICE_DATA*/' not in out
(ROOT / 'index.html').write_text(out)
print(f'built {version}: {len(out) // 1024} KB, {len(voice)} voice clips')
