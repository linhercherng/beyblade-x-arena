import{test}from'node:test';import assert from'node:assert/strict';
import{createServer}from'node:http';import{spawn}from'node:child_process';import{mkdirSync,mkdtempSync,writeFileSync}from'node:fs';import{join}from'node:path';import{fileURLToPath}from'node:url';
test('發布驗收禁止重用既有伺服器，一般開發仍可重用',async()=>{
 const previous=process.env.SPINFORGE_RELEASE_VERIFY;
 try{
  process.env.SPINFORGE_RELEASE_VERIFY='1';const release=(await import('../playwright.config.ts?release-source')).default;assert.equal(release.webServer.reuseExistingServer,false);
  delete process.env.SPINFORGE_RELEASE_VERIFY;const dev=(await import('../playwright.config.ts?dev-source')).default;assert.equal(dev.webServer.reuseExistingServer,true);
 }finally{if(previous===undefined)delete process.env.SPINFORGE_RELEASE_VERIFY;else process.env.SPINFORGE_RELEASE_VERIFY=previous;}
});
test('發布模式遇到已占用網址必須失敗，不能驗收另一份程式',async()=>{
 const root=fileURLToPath(new URL('..',import.meta.url));mkdirSync(join(root,'artifacts'),{recursive:true});const dir=mkdtempSync(join(root,'artifacts/release-server-probe-'));
 const server=createServer((_req,res)=>res.end('unrelated server'));await new Promise<void>(done=>server.listen(0,'127.0.0.1',done));
 try{
  const port=(server.address()as any).port;
  writeFileSync(join(dir,'probe.spec.ts'),"import{test}from'@playwright/test';test('probe',()=>{});\n");
  writeFileSync(join(dir,'config.ts'),`import base from '../../playwright.config.ts';export default {...base,testDir:'.',testMatch:'probe.spec.ts',webServer:{...base.webServer,url:'http://127.0.0.1:${port}',command:'node -e "process.exit(99)"'},use:{}};`);
  const result=await new Promise<{code:number|null;output:string}>((done,reject)=>{let output='';const child=spawn(process.execPath,[join(root,'node_modules/@playwright/test/cli.js'),'test','--config',join(dir,'config.ts'),'--reporter=line'],{cwd:root,env:{...process.env,SPINFORGE_RELEASE_VERIFY:'1'},windowsHide:true});child.stdout.on('data',v=>output+=v);child.stderr.on('data',v=>output+=v);child.on('error',reject);child.on('close',code=>done({code,output}));});
  assert.notEqual(result.code,0,'既有伺服器不可讓發布驗收通過');assert.match(result.output,/already used|already in use/);
 }finally{await new Promise<void>(done=>server.close(()=>done()));}
});
