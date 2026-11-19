import assert from'node:assert/strict';import{mkdirSync,readFileSync,writeFileSync}from'node:fs';import{join,resolve,sep}from'node:path';import{execFileSync}from'node:child_process';import{fileURLToPath}from'node:url';
type Json=Record<string,any>;
function testIds(report:Json,executed:boolean){
 const ids:string[]=[];
 const walk=(suites:Json[])=>{assert.ok(Array.isArray(suites),'缺少測試集合');for(const suite of suites){for(const spec of suite.specs??[]){assert.equal(typeof spec.id,'string');assert.ok(Array.isArray(spec.tests));for(const t of spec.tests){assert.equal(typeof t.projectId,'string');assert.equal(t.expectedStatus,'passed');if(executed){assert.equal(t.status,'expected');assert.equal(t.results?.length,1);assert.equal(t.results[0].status,'passed');assert.equal(t.results[0].retry,0);}ids.push(JSON.stringify([spec.id,t.projectId]));}}if(suite.suites)walk(suite.suites);}};
 walk(report.suites);assert.equal(new Set(ids).size,ids.length,'測試ID重複');return ids;
}
export function verifyShards(list:Json,shards:{summary:Json;browser:Json}[],commit:string,version:string){
 assert.match(commit,/^[a-f0-9]{40}$/);assert.equal(shards.length,4,'必須完整四分片');
 const expected=testIds(list,false),observed:string[]=[];assert.ok(expected.length>0,'測試全集不可為空');
 const assets=shards[0].summary.assets;assert.ok(Array.isArray(assets)&&assets.length>0,'缺少建置產物');
 for(const [index,{summary:s,browser:b}]of shards.entries()){
  assert.equal(s.commit,commit,'來源不同');assert.equal(s.version,version);assert.equal(s.status,'passed');assert.equal(s.environment?.ci,true);assert.equal(s.environment.browserShard,`${index+1}/4`);
  assert.deepEqual(s.steps?.map((step:Json)=>[step.id,step.status,step.exitCode]),['core','browser','balance','build'].map(id=>[id,'passed',0]));assert.deepEqual(s.assets,assets,'建置產物不同');
  const ids=testIds(b,true);assert.ok(ids.length>0);const stats={expected:ids.length,unexpected:0,skipped:0,flaky:0};for(const [key,value]of Object.entries(stats))assert.equal(b.stats?.[key],value);assert.deepEqual(s.browser,stats);observed.push(...ids);
 }
 assert.equal(new Set(observed).size,observed.length,'跨分片測試重複');assert.deepEqual([...observed].sort(),[...expected].sort(),'測試全集缺漏或額外');
 return{status:'passed',commit,version,shards:4,browser:{expected:expected.length,unexpected:0,skipped:0,flaky:0},assets,environment:{scope:'ci-fixture-profile',physicalDeviceVerified:false}};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 mkdirSync('artifacts',{recursive:true});const output='artifacts/release-verification-combined.json';writeFileSync(output,JSON.stringify({status:'running'})+'\n');
 try{
  const read=(path:string)=>JSON.parse(readFileSync(path,'utf8')),root=resolve('artifacts/release-shards');
  const shards=Array.from({length:4},(_,i)=>{const dir=join(root,`release-verification-${i+1}`),summary=read(join(dir,'release-verification.json'));const browserPath=resolve(dir,summary.steps.find((s:Json)=>s.id==='browser').log.replace(/^artifacts\//,'').replace(/browser\.log$/,'browser-results.json'));assert.ok(browserPath.startsWith(dir+sep));return{summary,browser:read(browserPath)};});
  const result=verifyShards(read('artifacts/release-test-list.json'),shards,execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),read('package.json').version);
  writeFileSync(output,JSON.stringify(result,null,2)+'\n');console.log(`四分片完整驗收通過：${result.commit}，${result.browser.expected}項，無缺漏、重複、略過或重試`);
 }catch(error){const message=error instanceof Error?error.message:String(error);writeFileSync(output,JSON.stringify({status:'failed',error:message})+'\n');console.error(message);process.exitCode=1;}
}
