"""src/app.html に音声データ（日本語・英語）と版番号を差し込んで、公開用の index.html（と about.html）を作る。

使い方: python3 tools/build.py        （版番号は VERSION ファイルから読む）
"""
import json, pathlib
ROOT = pathlib.Path(__file__).resolve().parent.parent
version = (ROOT / 'VERSION').read_text().strip()
src = (ROOT / 'src' / 'app.html').read_text()
voice = json.loads((ROOT / 'assets' / 'voice' / 'voice.json').read_text())
voice_en = json.loads((ROOT / 'assets' / 'voice' / 'voice_en.json').read_text())
out = (src.replace('/*VOICE_DATA*/{}', json.dumps(voice, separators=(',', ':')))
          .replace('/*VOICE_DATA_EN*/{}', json.dumps(voice_en, separators=(',', ':'))).replace('__VERSION__', version))
assert '__VERSION__' not in out and '/*VOICE_DATA' not in out
(ROOT / 'index.html').write_text(out)
about = (ROOT / 'src' / 'about.html').read_text().replace('__VERSION__', version)
(ROOT / 'about.html').write_text(about)
print(f'built {version}: index.html {len(out) // 1024} KB ({len(voice)} ja + {len(voice_en)} en voice clips), about.html')
