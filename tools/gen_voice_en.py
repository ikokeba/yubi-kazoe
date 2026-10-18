"""英語の指示音声を Kokoro-82M（Apache-2.0、kokoro-onnx 経由）で作り、音量をそろえて
assets/voice/voice_en.json（mp3 を base64 で格納）に書き出す。

準備: pip install kokoro-onnx soundfile、ffmpeg、
      モデル kokoro-v1.0.onnx と voices-v1.0.bin（https://github.com/thewh1teagle/kokoro-onnx/releases の model-files-v1.0）
      を KOKORO_DIR に置く
使い方: KOKORO_DIR=/path/to/models python3 tools/gen_voice_en.py
キーは日本語版（gen_voice.py）とできるだけ同じ名前にする。英語の語順に合わせた文は専用のキー（add_a_b, t{h}, ht{h}, kq_*）。
"""
import os, json, base64, subprocess, tempfile, pathlib
import soundfile as sf
from kokoro_onnx import Kokoro

ROOT = pathlib.Path(__file__).resolve().parent.parent
D = os.environ.get('KOKORO_DIR', '.')
VOICE, SPEED = 'af_heart', 0.9
k = Kokoro(os.path.join(D, 'kokoro-v1.0.onnx'), os.path.join(D, 'voices-v1.0.bin'))

N = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve']
apples = lambda n, kind='': f"{N[n]} {kind + ' ' if kind else ''}apple{'' if n == 1 else 's'}"
SHAPE = {'banzai': 'hooray', 'hikouki': 'airplane', 'bou': 'pencil', 'maru': 'circle'}
L = {
  'welcome': "Let's play together! What do you want to play?",
  'q_yubi': 'How many apples? Show me with your fingers!',
  'q_yubi_both': 'How many apples? Use both hands to show me!',
  'hint_count': "Let's count together.",
  'next_stage': "Let's try the next level!",
  'done': 'Great job! You did it!',
  'tokei_first': 'The long hand points straight up.',
  'arm_straight': 'Stretch your arms out straight.',
  'step_back': 'Step back a little, so I can see your body.',
  'kh_banzai': 'Raise both arms up and out, like a Y.',
  'kh_hikouki': 'Stretch both arms out to the sides.',
  'kh_bou': 'Put both arms straight up, close together.',
  'kh_maru': 'Bend your arms and touch your hands above your head, to make a circle.',
  'ato1': 'One more!', 'ooi1': 'One too many!', 'motto': 'A little more!', 'ooi': 'A few too many!',
  'free_intro': 'Show me your fingers! How many?',
  'sticker': 'You got a sticker!',
  'timeup': "That's all for today. Let's play again soon!",
}
for i, w in enumerate(['Correct!', 'You did it!', 'Amazing!', 'Well done!', 'Perfect!']): L[f'praise{i}'] = w
for n in range(1, 13): L[f'c{n}'] = N[n].capitalize() + '.'
for n in range(1, 11): L[f'ko{n}'] = apples(n).capitalize() + '.'
for a in range(1, 4):
    for b in range(1, min(3, 5 - a) + 1):
        L[f'add_{a}_{b}'] = f"{apples(a, 'red').capitalize()}, and {apples(b, 'green')}. How many in all? Show me with your fingers!"
for h in range(1, 13):
    L[f'h{h}'] = f"{N[h].capitalize()} o'clock!"
    L[f't{h}'] = f"Make {N[h]} o'clock with your arms!"
    L[f'ht{h}'] = f'The long hand points up. The short hand points to {N[h]}.'
for s, name in SHAPE.items():
    L[f'k_{s}'] = name.capitalize() + '!'
    L[f'kq_{s}'] = f'Copy the {name} shape!'

out = {}
work = pathlib.Path(tempfile.mkdtemp())
for key, text in L.items():
    a, sr = k.create(text, voice=VOICE, speed=SPEED, lang='en-us')
    sf.write(work / f'{key}.wav', a, sr)
    # 日本語版と同じ処理：前後の無音を切り、ラウドネスを -16 LUFS 付近にそろえ、24kHz モノラル mp3 に
    subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', str(work / f'{key}.wav'), '-af',
        'silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse,loudnorm=I=-16:TP=-1.5:LRA=11,apad=pad_dur=0.04',
        '-ar', '24000', '-ac', '1', '-b:a', '40k', str(work / f'{key}.mp3')], check=True)
    out[key] = base64.b64encode((work / f'{key}.mp3').read_bytes()).decode()
json.dump(out, open(ROOT / 'assets' / 'voice' / 'voice_en.json', 'w'))
print(len(out), 'clips', round(sum(len(v) for v in out.values()) / 1024), 'KB base64')
