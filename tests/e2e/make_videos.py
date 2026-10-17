"""テスト用の画像から、カメラの代わりに流す動画（y4m, 640x480, 2秒）を作る。
カメラは鏡写しで表示されるので、元の向きに戻すため左右反転してから入れる。
使い方: python3 tests/e2e/make_videos.py [追加の画像フォルダ ...]
"""
import sys, pathlib
from PIL import Image
HERE = pathlib.Path(__file__).resolve().parent
out = HERE / 'videos'; out.mkdir(exist_ok=True)
dirs = [HERE / 'images'] + [pathlib.Path(d) for d in sys.argv[1:]]
for d in dirs:
    for p in sorted(d.glob('*.jpg')) + sorted(d.glob('*.png')):
        im = Image.open(p).convert('RGB').transpose(Image.FLIP_LEFT_RIGHT)
        s = min(640 / im.width, 480 / im.height); im = im.resize((int(im.width * s), int(im.height * s)))
        bg = Image.new('RGB', (640, 480), (200, 200, 200)); bg.paste(im, ((640 - im.width) // 2, (480 - im.height) // 2))
        y, u, v = bg.convert('YCbCr').split(); u = u.resize((320, 240)); v = v.resize((320, 240))
        with open(out / (p.stem + '.y4m'), 'wb') as f:
            f.write(b'YUV4MPEG2 W640 H480 F15:1 Ip A1:1 C420jpeg\n')
            for _ in range(30): f.write(b'FRAME\n' + y.tobytes() + u.tobytes() + v.tobytes())
        print('video:', p.stem)
