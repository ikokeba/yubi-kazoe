"""指示音声を Open JTalk + HTS voice tohoku-f01（happy, CC BY 4.0）で作り、音量をそろえて
assets/voice/voice.json（mp3 を base64 で格納）に書き出す。

準備: pip install pyopenjtalk-plus（wheel版）、ffmpeg、
      git clone https://github.com/icn-lab/htsvoice-tohoku-f01 （TOHOKU_F01 で場所を指定）
使い方: TOHOKU_F01=/path/to/htsvoice-tohoku-f01 python3 tools/gen_voice.py
セリフを足すときは下の L に追加して、このスクリプトを流し直す。
"""
import sys, os, json, base64, subprocess, tempfile, pathlib, numpy as np, wave
import pyopenjtalk
from pyopenjtalk.htsengine import HTSEngine

ROOT = pathlib.Path(__file__).resolve().parent.parent
VOICE = os.path.join(os.environ.get('TOHOKU_F01', '/tmp/claude-0/f01'), 'tohoku-f01-happy.htsvoice')
SPEED, TONE = 0.9, 1.5
eng = HTSEngine(VOICE.encode())
eng.set_speed(SPEED); eng.add_half_tone(TONE)
sr = eng.get_sampling_frequency()

COUNT = ['', 'いち','に','さん','よん','ご','ろく','なな','はち','きゅう','じゅう','じゅういち','じゅうに']
KO = ['', 'いっこ','にこ','さんこ','よんこ','ごこ','ろっこ','ななこ','はっこ','きゅうこ','じゅっこ']
HOUR = ['', 'いちじ','にじ','さんじ','よじ','ごじ','ろくじ','しちじ','はちじ','くじ','じゅうじ','じゅういちじ','じゅうにじ']
L = {
  'welcome': 'いっしょに あそぼう！ なにで あそぶ？',
  'q_yubi': 'りんごは いくつ？ ゆびで みせてね。',
  'q_yubi_both': 'りんごは いくつ？ りょうての ゆびで みせてね。',
  'add_red': 'あかい りんごが、',
  'add_green': 'みどりの りんごが、',
  'add_to': 'と、',
  'add_q': 'ぜんぶで いくつ？ ゆびで みせてね。',
  'hint_count': 'いっしょに かぞえよう。',
  'dane': 'だね。',
  'next_stage': 'つぎの もんだいに すすむよ！',
  'done': 'よく できました！ すごいね！',
  'retry': 'だいじょうぶ。 もう いっかい やってみよう。',
  'q_tokei': 'を、 からだで つくってね。',
  'tokei_first': 'ながい はりは、 まうえ だよ。',
  'hint_tokei_1': 'ながい はりは まうえ。 みじかい はりは、',
  'hint_tokei_2': 'の ほう だよ。',
  'arm_straight': 'うでを、 まっすぐ のばしてね。',
  'step_back': 'からだが うつるように、 すこし はなれてね。',
  # まねっこ かたち
  'q_katachi': 'の かたちを、 まねしてね。',
  'k_banzai': 'ばんざい', 'k_hikouki': 'ひこうき', 'k_bou': 'ぼう', 'k_maru': 'まる',
  'kh_banzai': 'りょうてを、 ななめ うえに あげてね。',
  'kh_hikouki': 'りょうてを、 よこに ひろげてね。',
  'kh_bou': 'りょうてを、 まっすぐ うえに そろえてね。',
  'kh_maru': 'あたまの うえで、 てと てを くっつけて、 まるく してね。',
  # まちがい方に合わせた声かけ
  'ato1': 'あと ひとつ！', 'ooi1': 'ひとつ おおいよ。', 'motto': 'もう すこし！', 'ooi': 'ちょっと おおいよ。',
  # じゆうあそび・シール・時間
  'free_intro': 'ゆびを みせてね。 いくつ かな？',
  'sticker': 'シールを もらったよ！',
  'timeup': 'きょうは ここまで。 また あそぼうね！',
}
for i, w in enumerate(['せいかい！', 'やったね！', 'すごい！', 'できたね！', 'ぴったり！']): L[f'praise{i}'] = w
for n in range(1, 13): L[f'c{n}'] = COUNT[n] + '。'
for n in range(1, 11): L[f'ko{n}'] = KO[n]
for h in range(1, 13): L[f'h{h}'] = HOUR[h]

out = {}
work = tempfile.mkdtemp(); os.chdir(work); os.makedirs('wav', exist_ok=True); os.makedirs('mp3', exist_ok=True)
for key, text in L.items():
    x = eng.synthesize(pyopenjtalk.extract_fullcontext(text))
    eng.refresh()
    x = np.clip(x, -32768, 32767).astype(np.int16)
    with wave.open(f'wav/{key}.wav', 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr); w.writeframes(x.tobytes())
    # 前後の無音を切り、ラウドネスを -16 LUFS 付近にそろえ、24kHz モノラル mp3 に
    subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', f'wav/{key}.wav', '-af',
        'silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse,loudnorm=I=-16:TP=-1.5:LRA=11,apad=pad_dur=0.04',
        '-ar', '24000', '-ac', '1', '-b:a', '40k', f'mp3/{key}.mp3'], check=True)
    out[key] = base64.b64encode(open(f'mp3/{key}.mp3', 'rb').read()).decode()
json.dump(out, open(ROOT / 'assets' / 'voice' / 'voice.json', 'w'))
tot = sum(len(v) for v in out.values())
print(len(out), 'clips', round(tot / 1024), 'KB base64')
