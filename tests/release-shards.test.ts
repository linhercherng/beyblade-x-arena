import{test}from'node:test';import assert from'node:assert/strict';
import{verifyShards}from'../scripts/verify-release-shards.ts';
import{mkdirSync,mkdtempSync,writeFileSync,readFileSync,rmSync}from'node:fs';import{tmpdir}from'node:os';import{join}from'node:path';import{execFileSync,spawnSync}from'node:child_process';import{fileURLToPath}from'node:url';
const commit='a'.repeat(40),version='0.43.0';
function browser(ids:string[],executed=false){return{stats:{expected:ids.length,unexpected:0,skipped:0,flaky:0},suites:[{specs:ids.map(id=>({id,tests:[{projectId:'',expectedStatus:'passed',...(executed?{status:'expected',results:[{status:'passed',retry:0}]}:{})}]}))}]};}
function fixture(){return Array.from({length:4},(_,i)=>({summary:{commit,version,status:'passed',environment:{ci:true,browserShard:`${i+1}/4`},browser:{expected:1,unexpected:0,skipped:0,flaky:0},steps:['core','browser','balance','build'].map(id=>({id,status:'passed',exitCode:0,log:`artifacts/release-verification/fixture/${id}.log`})),assets:[{path:'index.html',bytes:1,sha256:'b'.repeat(64)}]},browser:browser([String(i)],true)}));}
test('四分片合併只在同來源、全部成功且測試ID恰為全集時通過',()=>{const result=verifyShards(browser(['0','1','2','3']),fixture(),commit,version);assert.equal(result.status,'passed');assert.equal(result.browser.expected,4);assert.equal(result.shards,4);});
test('缺漏、重複、額外測試與少一分片都不能冒稱完整驗收',()=>{
 for(const mode of ['missing','duplicate','extra','shard']){const shards=fixture();if(mode==='missing')shards[3].browser=browser([],true);if(mode==='duplicate')shards[3].browser=browser(['0'],true);if(mode==='extra')shards[3].browser=browser(['unexpected'],true);if(mode==='shard')shards.pop();assert.throws(()=>verifyShards(browser(['0','1','2','3']),shards,commit,version),mode);}
});
test('錯來源、失敗階段、不同產物、略過、重試或失敗結果皆拒收',()=>{
 for(const mode of ['commit','version','step','assets','skipped','retry','failed','index']){const shards=fixture(),s=shards[0];if(mode==='commit')s.summary.commit='c'.repeat(40);if(mode==='version')s.summary.version='old';if(mode==='step')s.summary.steps[3].status='pending';if(mode==='assets')s.summary.assets[0].sha256='d'.repeat(64);if(mode==='skipped')s.browser.stats.skipped=1;if(mode==='retry')s.browser.suites[0].specs[0].tests[0].results![0].retry=1;if(mode==='failed')s.browser.suites[0].specs[0].tests[0].results![0].status='failed';if(mode==='index')s.summary.environment.browserShard='2/4';assert.throws(()=>verifyShards(browser(['0','1','2','3']),shards,commit,version),mode);}
});
test('合併命令讀取獨立分片目錄，失敗覆寫舊成功，完整報告才成功',()=>{
 const root=mkdtempSync(join(tmpdir(),'spinforge-shards-'));try{
  const run=()=>spawnSync(process.execPath,['--experimental-strip-types',fileURLToPath(new URL('../scripts/verify-release-shards.ts',import.meta.url))],{cwd:root,encoding:'utf8'}),output=join(root,'artifacts/release-verification-combined.json');
  mkdirSync(join(root,'artifacts'));writeFileSync(output,'{"status":"passed"}');assert.notEqual(run().status,0);assert.equal(JSON.parse(readFileSync(output,'utf8')).status,'failed');
  writeFileSync(join(root,'.gitignore'),'artifacts/\n');writeFileSync(join(root,'package.json'),JSON.stringify({version}));execFileSync('git',['init','-q',root]);execFileSync('git',['-C',root,'add','.']);execFileSync('git',['-C',root,'-c','user.name=Test','-c','user.email=test@example.invalid','commit','-qm','fixture']);const sha=execFileSync('git',['-C',root,'rev-parse','HEAD'],{encoding:'utf8'}).trim();
  writeFileSync(join(root,'artifacts/release-test-list.json'),JSON.stringify(browser(['0','1','2','3'])));
  for(const [i,s]of fixture().entries()){const dir=join(root,`artifacts/release-shards/release-verification-${i+1}`);mkdirSync(join(dir,'release-verification/fixture'),{recursive:true});s.summary.commit=sha;writeFileSync(join(dir,'release-verification.json'),JSON.stringify(s.summary));writeFileSync(join(dir,'release-verification/fixture/browser-results.json'),JSON.stringify(s.browser));}
  const result=run();assert.equal(result.status,0,result.stderr);assert.equal(JSON.parse(readFileSync(output,'utf8')).browser.expected,4);
 }finally{assert.ok(root.startsWith(join(tmpdir(),'spinforge-shards-')));rmSync(root,{recursive:true,force:true});}
});
