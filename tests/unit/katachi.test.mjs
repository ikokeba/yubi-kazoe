// 「まねっこかたち」の判定の単体テスト
import { load, report } from './load.mjs';
const T = load(['readShape']);
const W = 640, H = 480;
// 画面（鏡写し）上の座標で体を作り、カメラ生データの座標に直す。肩はば 100px、腕の長さ 160px
function body({ armL, armR, elbowL, elbowR, wristL, wristR, vis = 0.95 }) {
  const lm = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, z: 0, visibility: vis }));
  const put = (i, [x, y]) => { lm[i] = { x: 1 - x / W, y: y / H, z: 0, visibility: vis }; };
  const SL = [270, 260], SR = [370, 260];
  put(0, [320, 210]); put(11, SL); put(12, SR);
  const straightArm = ([sx, sy], deg) => { const a = deg * Math.PI / 180; return [[sx + Math.sin(a) * 80, sy - Math.cos(a) * 80], [sx + Math.sin(a) * 160, sy - Math.cos(a) * 160]]; };
  const [eL, wL] = armL !== undefined ? straightArm(SL, armL) : [elbowL, wristL];
  const [eR, wR] = armR !== undefined ? straightArm(SR, armR) : [elbowR, wristR];
  put(13, eL); put(15, wL); put(14, eR); put(16, wR);
  return lm;
}
const cases = [
  ['ひこうき：両腕まよこ', body({ armL: 270, armR: 90 }), 'hikouki'],
  ['ひこうき：少し下がり気味（20度）', body({ armL: 250, armR: 110 }), 'hikouki'],
  ['ひこうき：下がりすぎ（40度）', body({ armL: 230, armR: 130 }), null],
  ['ばんざい：ななめ35度', body({ armL: 325, armR: 35 }), 'banzai'],
  ['ばんざい：大きく50度', body({ armL: 310, armR: 50 }), 'banzai'],
  ['ばんざい：片腕だけ上', body({ armL: 325, armR: 180 }), null],
  ['ぼう：少し内向き（手首が近い）', body({ armL: 15, armR: 345 }), 'bou'],
  ['ぼう：まっすぐ平行', body({ armL: 0, armR: 0 }), 'bou'],
  ['境目：外へ10度ずつ', body({ armL: 350, armR: 10 }), null],
  ['まる：ひじを曲げて頭の上で手をつなぐ', body({ elbowL: [205, 180], wristL: [312, 110], elbowR: [435, 180], wristR: [328, 110] }), 'maru'],
  ['ぼう：手首をくっつける（内向き18度）', body({ armL: 18, armR: 342 }), 'bou'],
  ['ぼう：頭の上で手を合わせ、ひじは狭い', body({ elbowL: [275, 180], wristL: [314, 100], elbowR: [365, 180], wristR: [326, 100] }), 'bou'],
  ['境目：外へ20度ずつ（ばんざい側）', body({ armL: 340, armR: 20 }), 'banzai'],
  ['まる でない：手首が口より下', body({ elbowL: [205, 260], wristL: [312, 240], elbowR: [435, 260], wristR: [328, 240] }), null],
  ['気をつけ：両腕した', body({ armL: 180, armR: 180 }), null],
  ['腕が見えていない', body({ armL: 270, armR: 90, vis: 0.3 }), null],
];
report(cases.map(([name, lm, expect]) => {
  const r = T.readShape(lm, W, H);
  return { name, ok: r.label === expect, detail: `got ${r.label}` };
}));
