import{test}from'node:test';import assert from'node:assert/strict';
import{BEYS,SPIN}from'../src/catalog.ts';
test('91顆有明確旋向定義，左迴旋三款不變且6款原廠核對後不再推定',()=>{
 assert.equal(SPIN.R.label,'右迴旋');assert.equal(SPIN.R.arrow,'↻');assert.equal(SPIN.L.label,'左迴旋');assert.equal(SPIN.L.arrow,'↺');
 assert.deepEqual(BEYS.filter(b=>b.spin==='L').map(b=>b.id).sort(),['bx-34-cobalt-dragoon','bx-52-luster-dragoon','ux-17-meteor-dragoon']);
 assert.ok(BEYS.every(b=>b.spin==='L'||b.spin==='R'));assert.equal(BEYS.filter(b=>b.spinNote).length,0);assert.equal(BEYS.filter(b=>b.spinProof).length,6);
 assert.equal(BEYS.find(b=>b.id==='cx-09-sol-eclipse-dual')!.spin,'R');
});
