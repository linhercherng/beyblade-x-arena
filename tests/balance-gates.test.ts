import{test}from'node:test';import assert from'node:assert/strict';import{readFileSync}from'node:fs';
import{assertBalance}from'../scripts/balance-gates.ts';
const saved=JSON.parse(readFileSync(new URL('../docs/balance-report.json',import.meta.url),'utf8'));
test('目前保存的完整平衡報告通過原有勝率、時長與終結門檻',()=>assert.doesNotThrow(()=>assertBalance(saved)));
test('勝率使用未四捨五入的勝場／出戰數，低於40或超過60即失敗',()=>{
 for(const rate of [.399999,.600001]){const r=structuredClone(saved);r.validation.types.attack.played=1000000;r.validation.types.attack.wins=Math.round(rate*1000000);r.validation.types.attack.winRate=rate<.5?40:60;assert.throws(()=>assertBalance(r),/attack/);}
});
test('14.43秒例外即使outside計數錯誤也會被阻擋，所有配對與邊界都檢查',()=>{
 for(const key of ['calibration','validation','edges','allPairs']){const r=structuredClone(saved);r[key].minSeconds=14.43;r[key].outsideTarget=0;assert.throws(()=>assertBalance(r),/15.*40/);}
});
test('不接受缺少類型、無對戰樣本或終結分布退步',()=>{
 let r=structuredClone(saved);delete r.validation.types.stamina;assert.throws(()=>assertBalance(r));
 r=structuredClone(saved);r.allPairs.battles=0;assert.throws(()=>assertBalance(r));
 r=structuredClone(saved);r.validation.finishes.spin=r.validation.battles;assert.throws(()=>assertBalance(r));
});
