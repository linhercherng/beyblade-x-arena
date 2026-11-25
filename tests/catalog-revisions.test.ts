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

test('V2與2.0選隊搜尋只回傳獨立新版，不把舊版冒充V2',()=>{
 const ids=['bx-00-dran-sword-v2','cx-20-hells-scythe-v2'];
 for(const q of ['V2','2.0'])assert.deepEqual(new Set(filterBeys(q).map(b=>b.id)),new Set(ids));
 for(const[id,r]of Object.entries(CATALOG_REVISIONS)){
  assert.ok(filterBeys(r.productCode).some(b=>b.id===r.battleId));
  assert.equal(filterBeys(r.zhName)[0].id,r.battleId);
  assert.ok(!filterBeys('V2').some(b=>b.id===id));
 }
});

test('獨立新增V2仍不改f2641c0的91款順序、能力、旋向及零件',()=>{
 const frozen=JSON.parse(readFileSync(new URL('./fixtures/catalog-v0441.json',import.meta.url),'utf8'));
 assert.equal(frozen.source,'f2641c06ebb69ec556d9e4b9c146dfa7cd92e1a6');
 assert.deepEqual(BEYS.slice(0,91).map(({id,stats,spin,ratchet,bit,height,type})=>({id,stats,spin,ratchet,bit,height,type})),frozen.beys);
});
