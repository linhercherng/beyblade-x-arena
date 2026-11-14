import{test}from'node:test';import assert from'node:assert/strict';import{RADIUS}from'../src/physics.ts';import{stadiumSurface}from'../src/stadium-surface.ts';
test('視覺碗面加深中心，外緣維持抓軌與出口高度且無垂直階差',()=>{
 assert.ok(stadiumSurface(0)<-.2);assert.equal(stadiumSurface(RADIUS),RADIUS*RADIUS*.024-.03);assert.equal(stadiumSurface(RADIUS+2),stadiumSurface(RADIUS));
 let previous=stadiumSurface(0);for(let r=.01;r<=RADIUS;r+=.01){const h=stadiumSurface(r);assert.ok(h>=previous&&h-previous<.004);previous=h;}
});
