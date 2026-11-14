import{test}from'node:test';import assert from'node:assert/strict';import{readFileSync}from'node:fs';
import{freshProfile,parseBackup}from'../src/storage.ts';import{backupSummary}from'../src/backup-preview.ts';
test('預覽只讀統計且列出舊引擎版本，不修改已驗證的備份',()=>{
 const p=freshProfile();p.recent=[1,2,3,4,5].map(v=>JSON.parse(readFileSync(new URL(`./fixtures/v${v}-match.json`,import.meta.url),'utf8')));
 const validated=parseBackup(JSON.stringify(p)),before=JSON.stringify(validated),s=backupSummary(validated);
 assert.equal(s.recent,5);assert.deepEqual(s.engines,[1,2,3,4,5]);assert.equal(s.rounds,p.recent.reduce((n,m)=>n+m.rounds.length,0));assert.equal(JSON.stringify(validated),before);
 assert.equal(backupSummary(freshProfile()).recent,0);assert.deepEqual(backupSummary(freshProfile()).engines,[]);
});
