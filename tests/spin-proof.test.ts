import{test}from'node:test';import assert from'node:assert/strict';import{readFileSync}from'node:fs';import{createHash}from'node:crypto';
import expansion from'../scripts/catalog-expansion.json'with{type:'json'};import{getBey}from'../src/catalog.ts';
const records=[['cx-00-valkyrie-volt-slash','atack','atack'],['cx-00-bucks-antlers-bumper','defence','defense'],['cx-00-kraken-wriggle-slash','stamina','stamina'],['cx-00-hornet-fort-round','balance','balance'],['cx-00-drake-brave-gravity','atack','atack'],['bx-00-storm-spriggan','balance','balance']];
test('6款推定旋向改以各自原廠有效DOM及R圖示確證，證據與原圖雜湊可追溯',()=>{
 for(const[id,selector,icon]of records){const row=expansion.products.find(p=>p.id===id)!;assert.equal(row.details.spinVerification,'official-product-icon',id);
  const proof=(row.details as any).spinProof,b=getBey(id);assert.equal(b.spin,'R');assert.equal(b.spinNote,'');assert.deepEqual(b.spinProof,proof);
  assert.equal(proof.kind,'direct-product');assert.equal(proof.source,row.source);assert.equal(proof.selector,'dl.detail dd .spec .icon .'+selector);assert.equal(proof.stylesheet,'https://beyblade.takaratomy.co.jp/beyblade-x/css/pc.css');assert.equal(proof.icon,`https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/icon_${icon}@2x.png`);assert.equal(proof.label,'R／ミギカイテン');assert.match(proof.checkedAt,/^\d{4}-\d{2}-\d{2}$/);
  assert.equal(createHash('sha256').update(readFileSync(new URL(`../docs/evidence/spin-20261113/icon_${icon}@2x.png`,import.meta.url))).digest('hex'),proof.iconSha256);
 }
});
