import{test}from'node:test';
import assert from'node:assert/strict';
import{readFileSync,existsSync}from'node:fs';
import{createHash}from'node:crypto';
import{BEYS,filterBeys}from'../src/catalog.ts';
import{CATALOG_REVISIONS,CATALOG_CHECKED_AT,catalogRevision}from'../src/catalog-revisions.ts';

test('只補已發售V2參考資料，完整組合與單獨刃片分開，不收12/26新品',()=>{
 assert.equal(CATALOG_CHECKED_AT,'2026-11-21');assert.equal(Object.keys(CATALOG_REVISIONS).length,2);
 assert.equal(catalogRevision('bx-01-dran-sword')!.combo,'Dran Sword 3-60F Version 2.0');
 assert.equal(catalogRevision('bx-01-dran-sword')!.productCode,'BX-00');
 assert.equal(catalogRevision('bx-02-hells-scythe')!.productCode,'CX-20');
 assert.equal(catalogRevision('bx-02-hells-scythe')!.combo,null);
 for(const[id,r]of Object.entries(CATALOG_REVISIONS)){
  assert.ok(BEYS.some(b=>b.id===id));assert.ok(r.releaseDate<=CATALOG_CHECKED_AT);
  assert.match(r.source,/^https:\/\/beyblade\.takaratomy\.co\.jp\//);
  assert.match(r.zhName,/V2/);assert.equal(r.spin,'R');
  for(const photo of r.photos){
   assert.match(photo.src,/^\/beys\/revisions\/[\w-]+\.png$/);
   const path=new URL('../public'+photo.src,import.meta.url);assert.ok(existsSync(path));
   const bytes=readFileSync(path);assert.equal(bytes.length,photo.bytes);assert.equal(createHash('sha256').update(bytes).digest('hex'),photo.sha256);
  }
 }
 assert.equal(catalogRevision('ux-22-vanish-lucifer'),undefined);
 assert.equal(catalogRevision('bx-55-horus-shatter'),undefined);
 assert.equal(catalogRevision('constructor'),undefined);
 assert.equal(catalogRevision('__proto__'),undefined);
});

test('V2與2.0只在圖鑑擴充搜尋，不讓選隊誤選為新版',()=>{
 assert.equal(filterBeys('V2').length,0);
 assert.deepEqual(filterBeys('V2','all','all','code',true).map(b=>b.id),['bx-01-dran-sword','bx-02-hells-scythe']);
 assert.equal(filterBeys('2.0','all','all','code',true).length,2);
 assert.equal(filterBeys('蒼龍神劍 V2','all','all','code',true)[0].id,'bx-01-dran-sword');
 assert.ok(filterBeys('BX-00','all','all','code',true).some(b=>b.id==='bx-01-dran-sword'));
 assert.ok(filterBeys('CX-20','all','all','code',true).some(b=>b.id==='bx-02-hells-scythe'));
 assert.ok(!filterBeys('BX-00').some(b=>b.id==='bx-01-dran-sword'));
});

test('新增參考資料不改f2641c0的91款順序、能力、旋向及零件',()=>{
 const frozen=JSON.parse(readFileSync(new URL('./fixtures/catalog-v0441.json',import.meta.url),'utf8'));
 assert.equal(frozen.source,'f2641c06ebb69ec556d9e4b9c146dfa7cd92e1a6');
 assert.deepEqual(BEYS.map(({id,stats,spin,ratchet,bit,height,type})=>({id,stats,spin,ratchet,bit,height,type})),frozen.beys);
});
