import {test,expect} from '@playwright/test';
const fixture='/tests/fixtures/stadium.html'+(process.env.CI?'?software-gpu':'');
import {writeFileSync} from 'node:fs';
for(const mobile of [false,true])test(`${mobile?'手機':'桌面'}盤體全景、斜齒近鏡與側面凹槽可正常繪製`,async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.setViewportSize(mobile?{width:390,height:844}:{width:1440,height:1000});
  await page.goto(fixture);
  await expect(page.locator('canvas')).toBeVisible();
  await expect.poll(()=>page.evaluate(()=>(window as any).stadiumMetrics().frames.length),{timeout:process.env.CI?30000:10000}).toBeGreaterThan(45);
  for(const view of ['wide','close','low']){
    await page.locator('#'+view).click();
    await page.screenshot({path:`artifacts/stadium-${mobile?'mobile':'desktop'}-${view}-v0110.png`});
  }
  const m=await page.evaluate(()=>{
    const m=(window as any).stadiumMetrics();const f=m.frames.slice(12).sort((a:number,b:number)=>a-b);
    return {...m,frames:undefined,samples:f.length,medianFrameMs:f[Math.floor(f.length*.5)],p95FrameMs:f[Math.floor(f.length*.95)]};
  });
  expect(m.teeth).toBeGreaterThanOrEqual(220);expect(m.calls).toBeLessThanOrEqual(95);
  expect(m.triangles).toBeLessThan(110000);expect(m.renderProfile.softwareGpu).toBe(!!process.env.CI);expect(Number.isFinite(m.p95FrameMs)&&m.p95FrameMs>0).toBe(true);if(!process.env.CI)expect(m.p95FrameMs).toBeLessThan(100);
  writeFileSync(process.env.CI?`artifacts/stadium-${mobile?'mobile':'desktop'}-software-v0430.json`:`artifacts/stadium-${mobile?'mobile':'desktop'}-metrics-v0110.json`,JSON.stringify(m,null,2));
  expect(errors).toEqual([]);
});
test('戰鬥模型在中心、斜坡與齒軌內緣皆貼合實際盤面',async({page})=>{
 await page.setViewportSize({width:1440,height:1000});await page.goto(fixture);
 const clearances=await page.evaluate(async()=>{
  const {createBattle}=await import('/src/physics.ts'),{BEYS}=await import('/src/catalog.ts'),THREE=(window as any).stadiumThree;
  const a=(window as any).stadiumArena,b=createBattle(BEYS[0],BEYS[11],[{power:.9,lane:1,angle:0},{power:.9,lane:1,angle:0}],7),clearances=[];
  a.models.forEach((m:any)=>m.visible=true);
  for(const r of [0,2.7,3.9]){b.tops[0].x=r;b.tops[1].x=-r;b.tops.forEach(t=>t.z=0);a.draw(0,b);a.stadium.updateMatrixWorld(true);const hit=new THREE.Raycaster(new THREE.Vector3(r,2,0),new THREE.Vector3(0,-1,0)).intersectObject(a.stadium.getObjectByName('bowl-surface'))[0];const model=a.models[0],contact=model.userData.contact;let gap=Infinity;
    for(const p of contact.vertices){const w=p.clone().applyQuaternion(model.quaternion).add(model.position);const ray=new THREE.Raycaster(new THREE.Vector3(w.x,2,w.z),new THREE.Vector3(0,-1,0));const h=ray.intersectObject(a.stadium.getObjectByName('bowl-surface'))[0];if(h)gap=Math.min(gap,w.y-h.point.y);}
    clearances.push(gap);}
  return clearances;
 });
 for(const gap of clearances){expect(gap).toBeGreaterThanOrEqual(-.002);expect(gap).toBeLessThan(.015);}
 await page.locator('#wide').click();await page.screenshot({path:'artifacts/stadium-battle-contact-v0250.png'});
});
