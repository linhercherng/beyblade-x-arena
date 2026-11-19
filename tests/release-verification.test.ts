import{test}from'node:test';import assert from'node:assert/strict';import{existsSync,mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync}from'node:fs';import{tmpdir}from'node:os';import{join}from'node:path';import{execFileSync}from'node:child_process';
async function release(){const url=new URL('../scripts/verify-release.ts',import.meta.url);assert.ok(existsSync(url),'需提供統一發布驗收命令');return import(url.href);}
function workspace(){const root=mkdtempSync(join(tmpdir(),'spinforge-release-'));writeFileSync(join(root,'.gitignore'),'artifacts/\ndist/\n');writeFileSync(join(root,'package.json'),JSON.stringify({version:'0.43.0'}));execFileSync('git',['init','-q',root]);execFileSync('git',['-C',root,'add','.']);execFileSync('git',['-C',root,'-c','user.name=Test','-c','user.email=test@example.invalid','commit','-qm','fixture']);return root;}
function clean(root:string){assert.ok(root.startsWith(join(tmpdir(),'spinforge-release-')));rmSync(root,{recursive:true,force:true});}
function browser(step:any,log:string){if(step.id==='browser')writeFileSync(join(log,'..','browser-results.json'),JSON.stringify({stats:{expected:1,unexpected:0,skipped:0,flaky:0}}));}
test('發布驗收依序跑完整測試、平衡、建置，成功報告包含來源與產物雜湊',async()=>{
 const {verifyRelease}=await release(),root=workspace(),seen:string[]=[];try{
  const result=await verifyRelease(root,async(step:any,_root:string,log:string)=>{seen.push(step.id);browser(step,log);if(step.id==='build'){mkdirSync(join(root,'dist/assets'),{recursive:true});writeFileSync(join(root,'dist/index.html'),'<script src="/assets/game.js"></script>');writeFileSync(join(root,'dist/assets/game.js'),'const x=1;');}return 0;});
  assert.deepEqual(seen,['core','browser','balance','build']);assert.equal(result.status,'passed');assert.match(result.commit,/^[a-f0-9]{40}$/);assert.ok(result.assets.find((a:any)=>a.path==='assets/game.js'&&a.sha256.length===64));assert.equal(JSON.parse(readFileSync(join(root,'artifacts/release-verification.json'),'utf8')).status,'passed');
 }finally{clean(root);}
});
test('任一階段失敗即停止，覆寫舊成功報告並留下失敗與未執行狀態',async()=>{
 const {verifyRelease}=await release(),root=workspace(),seen:string[]=[];try{
  mkdirSync(join(root,'artifacts'));writeFileSync(join(root,'artifacts/release-verification.json'),'{"status":"passed"}');await assert.rejects(verifyRelease(root,async(step:any)=>{seen.push(step.id);return step.id==='browser'?7:0;}),/browser/);
  assert.deepEqual(seen,['core','browser']);const r=JSON.parse(readFileSync(join(root,'artifacts/release-verification.json'),'utf8'));assert.equal(r.status,'failed');assert.equal(r.steps[1].exitCode,7);assert.equal(r.steps[2].status,'pending');assert.deepEqual(r.assets,[]);
 }finally{clean(root);}
});
test('未提交來源、驗收中來源改變或未建立產物皆不得顯示通過',async()=>{
 const {verifyRelease}=await release();for(const mode of ['dirty','changed','missing']){const root=workspace();try{
  if(mode==='dirty')writeFileSync(join(root,'package.json'),'{}');await assert.rejects(verifyRelease(root,async(step:any,_root:string,log:string)=>{browser(step,log);if(mode==='changed'&&step.id==='core')writeFileSync(join(root,'package.json'),'{}');return 0;}),/來源|產物/);assert.equal(JSON.parse(readFileSync(join(root,'artifacts/release-verification.json'),'utf8')).status,'failed');
 }finally{clean(root);}}
});
test('瀏覽器略過或重試通過不能作為完整驗收',async()=>{
 const {verifyRelease}=await release();for(const stat of ['skipped','flaky']){const root=workspace();try{
  await assert.rejects(verifyRelease(root,async(step:any,_root:string,log:string)=>{if(step.id==='browser')writeFileSync(join(log,'..','browser-results.json'),JSON.stringify({stats:{expected:1,unexpected:0,skipped:0,flaky:0,[stat]:1}}));return 0;}),/不可略過/);
 }finally{clean(root);}}
});
test('套件資料損毀也會取代過去成功狀態',async()=>{
 const {verifyRelease}=await release(),root=workspace();try{
  mkdirSync(join(root,'artifacts'));writeFileSync(join(root,'artifacts/release-verification.json'),'{"status":"passed"}');writeFileSync(join(root,'package.json'),'{');
  await assert.rejects(verifyRelease(root,async()=>0));assert.equal(JSON.parse(readFileSync(join(root,'artifacts/release-verification.json'),'utf8')).status,'failed');
 }finally{clean(root);}
});
test('四分片僅影響該次瀏覽器參數，其他階段與本機全集不變且拒絕非法分片',async()=>{
 const {verifyRelease}=await release();for(const shard of ['2/4',undefined,'0/4','1/3','']){const root=workspace(),seen:any[]=[];try{
  const run=async(step:any,_root:string,log:string)=>{seen.push(step);browser(step,log);if(step.id==='build'){mkdirSync(join(root,'dist'));writeFileSync(join(root,'dist/index.html'),'ok');writeFileSync(join(root,'dist/game.js'),'ok');}return 0;};
  if(shard!==undefined&&shard!=='2/4'){await assert.rejects(verifyRelease(root,run,shard),/分片/);assert.equal(seen.length,0);continue;}
  const result=await verifyRelease(root,run,shard);assert.equal(result.environment.browserShard,shard??null);const args=seen.find(s=>s.id==='browser').args;assert.equal(args.includes('--shard=2/4'),shard==='2/4');assert.equal(args.includes('--fully-parallel'),shard==='2/4');assert.deepEqual(seen.filter(s=>s.id!=='browser').map(s=>s.args),[['test'],['run','balance:check'],['run','build']]);
 }finally{clean(root);}}
});
