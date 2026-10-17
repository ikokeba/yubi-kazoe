// 「からだとけい」の判定の単体テスト
import { load, report } from './load.mjs';
const T = load(['readClock', 'judgeClock', 'CLOCK_TOL']);
const W = 640, H = 480;
// 画面（鏡写し）上の角度で腕を作り、カメラ生データの座標に直す
function pose(leftDeg, rightDeg, { bendLeft = 0, vis = 0.99 } = {}) {
  const lm = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, z: 0, visibility: vis }));
  const put = (i, dx, dy) => { lm[i] = { x: 1 - dx / W, y: dy / H, z: 0, visibility: vis }; };
  const S = { 11: [270, 190], 12: [370, 190] };   // 本人の左肩は画面の左
  const arm = (s, e, w, deg, bend) => {
    const [sx, sy] = S[s], r = deg * Math.PI / 180, L = 170;
    put(s, sx, sy);
    const ex = sx + Math.sin(r) * L / 2 + bend, ey = sy - Math.cos(r) * L / 2 + bend;
    put(e, ex, ey); put(w, sx + Math.sin(r) * L, sy - Math.cos(r) * L);
  };
  arm(11, 13, 15, leftDeg, bendLeft); arm(12, 14, 16, rightDeg, 0);
  return lm;
}
const cases = [
  ['3じ：左腕うえ・右腕よこ', 3, pose(0, 90), true],
  ['3じ：右腕うえ・左腕を右へ（交差）', 3, pose(90, 0), true],
  ['9じ：左腕よこ・右腕うえ', 9, pose(270, 0), true],
  ['6じ：左腕した・右腕うえ', 6, pose(180, 0), true],
  ['12じ：両腕うえ', 12, pose(0, 0), true],
  ['1じ：右腕30度・左腕うえ', 1, pose(0, 30), true],
  ['8じ：左腕240度・右腕うえ', 8, pose(240, 0), true],
  ['3じ：15度ずれ（合格のはず）', 3, pose(15, 75), true],
  ['3じ：30度ずれ（不合格のはず）', 3, pose(0, 120), false],
  ['3じの問題に9じの形', 3, pose(270, 0), false],
  ['3じ：左ひじを大きく曲げる', 3, pose(0, 90, { bendLeft: 120 }), false],
  ['3じ：腕が見えていない', 3, pose(0, 90, { vis: 0.2 }), false],
  ['6じの問題に12じの形', 6, pose(0, 0), false],
];
report(cases.map(([name, h, lm, expect]) => {
  const arms = T.readClock(lm, W, H), j = T.judgeClock(arms, h), got = j.err <= T.CLOCK_TOL;
  return { name, ok: got === expect, detail: `got ${got}, err ${j.err}` };
}));
