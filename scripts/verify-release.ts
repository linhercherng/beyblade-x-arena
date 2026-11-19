import{spawn,execFileSync}from'node:child_process';
import{mkdirSync,writeFileSync,readFileSync,readdirSync,createWriteStream}from'node:fs';
import{join,resolve,dirname,relative}from'node:path';import{fileURLToPath}from'node:url';import{createHash}from'node:crypto';
const steps=[{id:'core',args:['test']},{id:'browser',args:['run','test:e2e','--','--reporter=line,json','--max-failures=1']},{id:'balance',args:['run','balance:check']},{id:'build',args:['run','build']}];
type Step=typeof steps[number];
async function runCommand(step:Step,root:string,log:string):Promise<number>{
 const npm=process.env.npm_execpath;if(!npm)throw Error('請使用 npm run verify:release 執行');
 return new Promise((done,reject)=>{
  const output=createWriteStream(log),child=spawn(process.execPath,[npm,...step.args],{cwd:root,windowsHide:true,env:{...process.env,...(step.id==='browser'?{SPINFORGE_RELEASE_VERIFY:'1',PLAYWRIGHT_JSON_OUTPUT_NAME:join(dirname(log),'browser-results.json')}:{})},stdio:['ignore','pipe','pipe']});
  child.stdout.pipe(output,{end:false});child.stderr.pipe(output,{end:false});
  child.stdout.pipe(process.stdout,{end:false});child.stderr.pipe(process.stderr,{end:false});
  child.on('error',error=>{output.end();reject(error);});child.on('close',code=>output.end(()=>done(code??-1)));
 });
}
export async function verifyRelease(root:string,run=runCommand,browserShard?:string){
 const selectedSteps=steps.map(step=>({...step,args:step.id==='browser'&&browserShard?[...step.args,`--shard=${browserShard}`,'--fully-parallel','--workers=1']:step.args}));
 const dir=join(root,'artifacts/release-verification',new Date().toISOString().replace(/[:.]/g,'-'));mkdirSync(dir,{recursive:true});
 const report={environment:{platform:process.platform,node:process.version,ci:!!process.env.CI,scope:process.env.CI?'ci-fixture-profile':'local-default-profile',physicalDeviceVerified:false,browserShard:browserShard??null},version:null as string|null,commit:'',startedAt:new Date().toISOString(),finishedAt:null as string|null,status:'running',error:null as string|null,browser:null as null|{expected:number;unexpected:number;skipped:number;flaky:number},steps:selectedSteps.map(s=>({id:s.id,command:['npm',...s.args],status:'pending',exitCode:null as number|null,seconds:0,log:relative(root,join(dir,s.id+'.log')).replaceAll('\\','/')})),assets:[] as {path:string;bytes:number;sha256:string}[]};
 const save=()=>{const json=JSON.stringify(report,null,2)+'\n';writeFileSync(join(dir,'summary.json'),json);writeFileSync(join(root,'artifacts/release-verification.json'),json);};
 const git=(...args:string[])=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim();
 const checkSource=()=>{if(git('status','--porcelain')||git('rev-parse','HEAD')!==report.commit)throw Error('驗收來源必須已提交且全程保持不變');};
 save();
 try{
  if(browserShard!==undefined&&!/^[1-4]\/4$/.test(browserShard))throw Error('發布分片必須為1/4至4/4');
  report.commit=git('rev-parse','HEAD');checkSource();
  report.version=JSON.parse(readFileSync(join(root,'package.json'),'utf8')).version;
  for(const [i,step]of selectedSteps.entries()){
   const current=report.steps[i],start=Date.now();current.status='running';save();console.log(`[verify:release] ${step.id} 開始，日誌 ${current.log}`);
   try{
    current.exitCode=await run(step,root,join(dir,step.id+'.log'));if(current.exitCode!==0)throw Error(`${step.id} 未通過（exit ${current.exitCode}）`);
    if(step.id==='browser'){
     const stats=JSON.parse(readFileSync(join(dir,'browser-results.json'),'utf8')).stats;
     if(!stats||!(stats.expected>0)||stats.unexpected!==0||stats.skipped!==0||stats.flaky!==0)throw Error('browser 必須完整通過，不可略過或以重試通過');
     report.browser={expected:stats.expected,unexpected:stats.unexpected,skipped:stats.skipped,flaky:stats.flaky};
    }
    checkSource();current.status='passed';
   }catch(error){current.status='failed';throw error;}finally{current.seconds=(Date.now()-start)/1000;save();}
   console.log(`[verify:release] ${step.id} 通過（${current.seconds.toFixed(1)}秒）`);
  }
  const dist=join(root,'dist');let files:string[]=[];
  const walk=(dir:string)=>{for(const entry of readdirSync(dir,{withFileTypes:true})){const path=join(dir,entry.name);if(entry.isDirectory())walk(path);else if(entry.isFile())files.push(path);}};
  try{walk(dist);if(!files.includes(join(dist,'index.html'))||!files.some(f=>f.endsWith('.js')))throw Error('缺少 index 或 JS');}catch{throw Error('正式建置產物缺失');}
  report.assets=files.sort().map(path=>{const content=readFileSync(path);return{path:relative(dist,path).replaceAll('\\','/'),bytes:content.length,sha256:createHash('sha256').update(content).digest('hex')};});
  checkSource();report.status='passed';return report;
 }catch(error){report.status='failed';report.error=error instanceof Error?error.message:String(error);throw error;}
 finally{report.finishedAt=new Date().toISOString();save();}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 verifyRelease(fileURLToPath(new URL('..',import.meta.url)),runCommand,process.env.SPINFORGE_BROWSER_SHARD).then(r=>console.log(`[verify:release] ${r.environment.browserShard?`分片${r.environment.browserShard}通過，尚須合併驗收`:'全部通過'}：${r.commit}，${r.browser?.expected}項瀏覽器案例，${r.assets.length}個產物檔案`)).catch(error=>{console.error(error.message);process.exitCode=1;});
}
