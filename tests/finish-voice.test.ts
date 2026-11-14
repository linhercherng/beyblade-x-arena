import{test}from'node:test';import assert from'node:assert/strict';import{finishSamples}from'../src/finish-voice.ts';
test('九種終結／勝負播報皆有聲、峰值安全且能在終結演出內完成',()=>{
 const identities=new Set<string>();for(const cue of ['burst','over','extreme','spin','draw','victory','defeat','player1','player2']as const){const a=finishSamples(cue);assert.ok(a.length/16000>.2&&a.length/16000<2);assert.ok(a.every(Number.isFinite));const peak=a.reduce((p,x)=>Math.max(p,Math.abs(x)),0);assert.ok(peak>.5&&peak<.8);identities.add(a.length+':'+a.slice(80,180).join(','));}assert.equal(identities.size,9);
});
