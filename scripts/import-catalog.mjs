import { readFileSync, writeFileSync } from 'node:fs';
const text = readFileSync(new URL('../docs/企劃書.md', import.meta.url), 'utf8');
const beys = [];
let line;
for (const row of text.split(/\r?\n/)) {
  if (row.startsWith('### 基本線')) line = 'BX';
  if (row.startsWith('### 特殊線')) line = 'UX';
  if (row.startsWith('### 自訂線')) line = 'CX';
  if (row.startsWith('### 未收錄')) break;
  if (!/^\| (BX|UX|CX)-\d+ \|/.test(row)) continue;
  const [code, combo, type, feature] = row.split('|').slice(1,5).map(s=>s.trim());
  const match = combo.match(/^(.*?) (?:(M|\d+)-(\d+))?([A-Za-z]+)$/);
  if (!match) throw new Error(`不能解析 ${combo}`);
  const [, blade, teeth, height, bit] = match;
  const id = `${code}-${blade}`.toLowerCase().replaceAll(' ', '-');
  beys.push({ id, code, line, name: blade, combo, blade: blade.toLowerCase().replaceAll(' ','-'), ratchet: teeth ? `${teeth}-${height}` : `integrated-${bit}`, bit, spin: type.includes('左旋')?'L':'R', typeNote: type, feature });
}
if (beys.length!==83) throw new Error(`預期83，實際${beys.length}`);
writeFileSync(new URL('../src/catalog-data.json', import.meta.url), JSON.stringify(beys,null,2)+'\n');
console.log(`已匯入 ${beys.length} 顆，BX/UX/CX = ${['BX','UX','CX'].map(l=>beys.filter(b=>b.line===l).length).join('/')}`);
