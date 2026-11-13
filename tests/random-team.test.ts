import {test} from 'node:test';
import assert from 'node:assert/strict';
import {BEYS} from '../src/catalog.ts';
import {randomTeam} from '../src/match.ts';

test('隨機隊伍可重現、全圖鑑可入選且每隊三顆不同戰刃',()=>{
 const before=BEYS.map(b=>b.id),seen=new Set<string>(),teams=new Set<string>();
 for(let seed=1;seed<=512;seed++){
  const team=randomTeam(seed);
  assert.equal(team.length,3);assert.equal(new Set(team.map(b=>b.blade)).size,3);
  assert.deepEqual(team,randomTeam(seed));
  team.forEach(b=>{assert.ok(BEYS.includes(b));seen.add(b.id);});teams.add(team.map(b=>b.id).join());
 }
 assert.deepEqual(BEYS.map(b=>b.id),before);assert.equal(seen.size,BEYS.length);assert.ok(teams.size>500);
});
