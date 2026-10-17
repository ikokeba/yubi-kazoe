// src/app.html から判定ロジックを切り出して読み込む（アプリと同じコードをテストするため）
import fs from 'fs';
const html = fs.readFileSync(new URL('../../src/app.html', import.meta.url), 'utf8');
const cut = (a, b) => { const i = html.indexOf(a), j = html.indexOf(b); if (i < 0 || j < 0) throw new Error('marker not found: ' + a); return html.slice(i, j); };
export function load(names) {
  const code = cut('  function straight(', '  function fingerFlags(') + cut('// ==TOKEI-LOGIC-START==', '// ==TOKEI-LOGIC-END==') + cut('// ==KATACHI-LOGIC-START==', '// ==KATACHI-LOGIC-END==');
  return new Function(code + `; return { ${names.join(', ')} };`)();
}
export function report(results) {
  let pass = 0;
  for (const r of results) { if (r.ok) pass++; console.log((r.ok ? 'OK ' : 'NG ') + r.name + (r.ok ? '' : `  (${r.detail})`)); }
  console.log(`${pass}/${results.length} passed`);
  if (pass !== results.length) process.exit(1);
}
