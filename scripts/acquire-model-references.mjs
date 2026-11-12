import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile,writeFile,mkdir,readdir,unlink} from 'node:fs/promises';
import {chromium} from '@playwright/test';
const root=new URL('../',import.meta.url);
const rows=JSON.parse(await readFile(new URL('src/catalog-data.json',root),'utf8'));
const old=JSON.parse(await readFile(new URL('src/product-images.json',root),'utf8'));
const dir=new URL('public/model-references/',root);await mkdir(dir,{recursive:true});
// Gallery indices are visually checked against the actual model, never shared merely by kit code.
const base='https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/';
const single=new Set('BX01 BX02 BX03 BX04 BX13 BX15 BX19 BX23 BX26 BX33 BX34 BX38 BX44 BX45 BX49 BX52 BX54 UX01 UX02 UX03 UX06 UX08 UX09 UX11 UX13 UX14 UX17'.split(' '));
const choices={
 'BX14':[1], 'BX16':[2,1], 'BX20':['b_01','b_02','b_03','b_04'],
 'BX21':['p_01','p_02','p_03','p_04'],'BX24':[1],'BX27':[2,1],'BX31':[1],
 'BX35':[2,1],'BX36':[2,1],'BX37':[3,4],'BX39':[2,1],'BX48':[2,1],
 'BX50':[2,1],'BX53':[4,1],'UX05':[2,1],'UX07':['r_01','r_02','r_03','r_04'],
 'UX10':[2,1,4,5],'UX12':[2,1],'UX15':[2,1,4,5],'UX16':[2,1],'UX18':[2,1],
 'UX19':[1,2],'UX20':[1,2,null,3],'UX21':[2,1,null,4],
};
const special={
 'bx-46-cobalt-drake':[3,1], 'bx-46-goat-tackle':[4,2],
 'ux-10-ptera-swing':[6], 'ux-15-tyranno-roar':[7,6,8,9], 'ux-21-wyvern-hover':[9,10,11,12],
 'cx-05-rhino-reaper-charge':[3], 'cx-05-hells-arc-turn':[5],
 'cx-08-whale-flame-massive':[3], 'cx-08-cerberus-dark-wheel':[4],
 'ux-15-hells-brave-jaggy':[11,10,15,16], 'ux-18-pegasus-brush-massive':[4],
 'ux-18-sol-brave-charge':[5], 'bx-50-wolf-flame-dual':[6], 'bx-50-cerberus-reaper-bumper':[7],
 'cx-09-sol-eclipse-dual':[3,1],
 'cx-01-dran-brave-slash':[2,1,6,7], 'cx-02-wizard-arc-round':[2,1,6,7],
 'cx-03-perseus-dark-bumper':[2,1,6,7], 'cx-10-wolf-hunt-free':[2,1,6,7],
 'cx-13-bahamut-blitz-break-knuckle':[2,1,7,8], 'cx-14-knight-fortress-guard-vertical':[2,1,7,8],
 'cx-15-ragna-rage-flow-erase':[2,1,7,8],
 'cx-09-sol-eclipse-dual':[3,1,10,11], 'cx-12-phoenix-flare-zillion':[2,1,6,7],
 'cx-20-phoenix-force-weight-heavy':[2,1,8,9],
};
const manual={
 'bx-23-phoenix-wing':{bladeMetal:'#b92318',bladePlastic:'#d28a10'},
 'bx-46-cobalt-drake':{bladeMetal:'#aa2631',bladePlastic:'#80bdbf',ratchet:'#a72e39',bit:'#b4d9df'},
 'bx-46-goat-tackle':{bladePlastic:'#342c64',ratchet:'#12509b',bit:'#209b99'},
 'bx-16-viper-tail':{ratchet:'#126a9c',bit:'#e4762f'},
 'bx-27-sphinx-cowl':{ratchet:'#a58a3c',bit:'#087a9d'},
 'bx-35-black-shell':{ratchet:'#13271e',bit:'#29924f'},
 'bx-36-whale-wave':{ratchet:'#007a9c',bit:'#153a76'},
 'bx-39-shelter-drake':{ratchet:'#6b2126',bit:'#ad382d'},
 'bx-48-mammoth-tusk':{bladeMetal:'#282423',ratchet:'#b7770a',bit:'#e6ad1c'},
 'bx-50-heavens-ring':{ratchet:'#d6ee1c',bit:'#e0ed42'},
 'bx-53-aero-pegasus':{bladeMetal:'#078eae',ratchet:'#d1edf5',bit:'#45bbce'},
 'ux-05-shinobi-shadow':{ratchet:'#302d66',bit:'#488940'},
 'ux-10-knight-mail':{ratchet:'#84ad25',bit:'#0c805a'},
 'ux-12-ghost-circle':{ratchet:'#352261',bit:'#d07931'},
 'ux-15-shark-scale':{ratchet:'#273c76',bit:'#2c277c'},
 'ux-16-clock-mirage':{ratchet:'#bb2369',bit:'#e5d42e'},
 'ux-07-phoenix-rudder':{bladeMetal:'#a12335',bladePlastic:'#b52a40'},
 'cx-07-pegasus-blast-assault':{bladeMetal:'#168f83',bladePlastic:'#e1e54b',ratchet:'#155390',bit:'#16417b'},
 'cx-11-emperor-might-heavy':{bladeMetal:'#876019',bladePlastic:'#d89a19',ratchet:'#322b24',bit:'#882735'},
 'cx-12-phoenix-flare-zillion':{bladeMetal:'#6b2219',bladePlastic:'#c73618'},
 'cx-14-knight-fortress-guard-vertical':{bladeMetal:'#10a278'},
 'cx-19-croco-tread-tough-quell':{bladeMetal:'#a98138'},
 'bx-15-leon-claw':{bladePlastic:'#282c2d'}, 'bx-33-weiss-tiger':{bladePlastic:'#656d76'},
 'bx-44-tricera-press':{bladePlastic:'#36764c'}, 'ux-06-leon-crest':{bladePlastic:'#262823'},
 'ux-08-silver-wolf':{bladePlastic:'#718b8d',ratchet:'#767c7a'},
 'ux-20-glory-valkyrie':{bladePlastic:'#edf0eb'},
 'cx-18-brachio-whip-outer-wheel':{bladePlastic:'#8a6bb4'},
 'cx-20-phoenix-force-weight-heavy':{bladePlastic:'#d72a26'},
};
if(!process.argv.includes('--analyze')){
const pages={};let next=0;
const codes=[...new Set(rows.map(r=>r.code))];
await Promise.all(Array.from({length:6},async()=>{while(next<codes.length){const code=codes[next++],prefix=code.replace('-','');const source=`https://beyblade.takaratomy.co.jp/beyblade-x/lineup/${prefix.toLowerCase()}.html`;const html=await(await fetch(source)).text();const urls=[...new Set([...html.matchAll(/(?:src|href)="([^\"]+@1\.png)"/g)].map(m=>new URL(m[1],source).href))].filter(s=>new RegExp(`/${prefix}_[a-z0-9_]+@1\\.png$`,'i').test(s));pages[code]={source,urls};}}));
const files={};let queue=rows.flatMap(row=>{const code=row.code.replace('-','');const choice=special[row.id]??choices[code]??(single.has(code)?[1,2,3,4]:row.line==='CX'?[2,1]:[]);return choice.filter(i=>i!=null).map(i=>`${base}${code}_${typeof i==='number'?String(i).padStart(2,'0'):i}@1.png`).filter(u=>pages[row.code].urls.includes(u));}),cursor=0;
async function obtain(url){const name=url.split('/').at(-1).replace('@1','');const target=new URL(name,dir);let bytes;try{bytes=await readFile(target);}catch{const response=await fetch(url,{signal:AbortSignal.timeout(30000)});if(!response.ok)return null;bytes=Buffer.from(await response.arrayBuffer());await writeFile(target,bytes);}return {src:'/model-references/'+name,imageSource:url,sha256:createHash('sha256').update(bytes).digest('hex')};}
await Promise.all(Array.from({length:6},async()=>{while(cursor<queue.length){const url=queue[cursor++];try{files[url]=await obtain(url);}catch(e){console.error(url,e.message);}}}));
await writeFile(new URL('manifest.json',dir),JSON.stringify({pages,files},null,2));
console.log('Downloaded',Object.keys(files).length,'reference photos for',codes.length,'products');
}

const manifest=JSON.parse(await readFile(new URL('manifest.json',dir),'utf8'));
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage();
const measured=new Map();
async function measure(entry){
 if(measured.has(entry.src))return measured.get(entry.src);
 const bytes=await readFile(new URL('public'+entry.src,root));
 const info=await page.evaluate(async bytes=>{
  const image=new Image();image.src='data:image/png;base64,'+bytes;await image.decode();
  const w=image.naturalWidth,h=image.naturalHeight,cv=document.createElement('canvas');cv.width=w;cv.height=h;
  const ctx=cv.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0);const d=ctx.getImageData(0,0,w,h).data;
  const transparent=d.some((v,i)=>i%4===3&&v<250);
  const fg=(x,y)=>{x=Math.floor(x);y=Math.floor(y);if(x<0||y<0||x>=w||y>=h)return false;const i=(y*w+x)*4;if(transparent)return d[i+3]>150;const max=Math.max(d[i],d[i+1],d[i+2]),min=Math.min(d[i],d[i+1],d[i+2]);return max<165||(max-min>22&&min<215);};
  let x0=w,y0=h,x1=0,y1=0;for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(fg(x,y)){x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);}
  const cx=(x0+x1)/2,cy=(y0+y1)/2,radius=Math.max(x1-x0,y1-y0)/2;
  const radial=Array.from({length:72},(_,i)=>{const a=i/72*Math.PI*2;for(let r=radius*1.15;r>radius*.4;r--)if(fg(cx+Math.cos(a)*r,cy+Math.sin(a)*r))return r/radius;return .65;});const maxR=Math.max(...radial);
  const color=(lo,hi,saturated=true)=>{const bins=new Map();for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){if(!fg(x,y))continue;const radiusAt=Math.hypot(x-cx,y-cy)/radius;if(radiusAt<lo||radiusAt>hi)continue;const i=(y*w+x)*4,c=[d[i],d[i+1],d[i+2]],mx=Math.max(...c),mn=Math.min(...c);if(saturated&&(mx-mn<45||mx<65))continue;const k=c.map(v=>Math.floor(v/32)*32+16).join(',');bins.set(k,(bins.get(k)||0)+1);}const key=[...bins].sort((a,b)=>b[1]-a[1])[0]?.[0];return key?'#'+key.split(',').map(v=>Math.min(255,+v).toString(16).padStart(2,'0')).join(''):null;};
  return {width:w,height:h,transparent,imageBounds:[x0/w,y0/h,(x1-x0+1)/w,(y1-y0+1)/h].map(v=>Math.round(v*10000)/10000),shape:radial.map(v=>Math.round(v/maxR*1000)/1000),primaryColor:color(.2,.68),outerColor:color(.72,1),partColor:color(0,1)||color(0,1,false)};
 },bytes.toString('base64'));
 const result={...entry,...info};measured.set(entry.src,result);return result;
}
const metadata={};
try{for(const row of rows){
 const code=row.code.replace('-','');let choice=special[row.id]??choices[code]??(single.has(code)?[1,2,3,4]:row.line==='CX'?[2,1]:null);
 const photo=async index=>{if(index==null)return null;const n=typeof index==='number'?String(index).padStart(2,'0'):index;const e=manifest.files[`${base}${code}_${n}@1.png`];return e?await measure(e):null;};
 let top=choice?await photo(choice[0]):null;
 const confirmed=Boolean(top);top=top?{...old[row.id],...top,source:manifest.pages[row.code].source,kind:'complete',label:row.name+' 原廠組合實物參考圖',note:'Takara Tomy 原廠組合產品俯視；輪廓及色碼為照片估計，非精密 CAD。',teeth:old[row.id].teeth}:old[row.id];
 const side=choice?await photo(choice[1]):null,ratchetPhoto=choice?await photo(choice[2]):null,bitPhoto=choice?await photo(choice[3]):null;
 const colors={bladePlastic:confirmed?top.primaryColor:old[row.id].primaryColor,bladeMetal:null,ratchet:ratchetPhoto?.partColor??null,bit:bitPhoto?.partColor??null,...manual[row.id]};
 metadata[row.id]={source:confirmed?manifest.pages[row.code].source:old[row.id].source,top,side,ratchetPhoto,bitPhoto,colors,confidence:confirmed?'official-combo':'reference-only',note:confirmed?'已依官方商品 gallery 核對此原廠組合；色碼為照片像素與可見零件估計，非官方色票。'+(!side?'未取得此組合的斜視圖；未見零件配色保留未知。':'斜視圖供側面與三段結構參照；模型厚度仍為近似。'):'沿用既有戰刃參考；原廠組合配色未核對，未知零件保留 null。'};
 }}finally{await browser.close();}
assert.equal(Object.keys(metadata).length,83);
for(const entry of Object.values(metadata)){assert.equal(entry.top.shape.length,72);assert.ok(entry.top.shape.every(n=>Number.isFinite(n)&&n>0&&n<=1));}
await writeFile(new URL('src/model-references.json',root),JSON.stringify(metadata,null,2)+'\n');
console.log('Published',Object.values(metadata).filter(e=>e.confidence==='official-combo').length,'official combos;',Object.values(metadata).filter(e=>e.side).length,'oblique photos');
const references=Object.values(metadata).flatMap(e=>[e.top,e.side,e.ratchetPhoto,e.bitPhoto]).filter(Boolean);
const keep=new Set(references.map(e=>e.src.split('/').at(-1)));
for(const name of await readdir(dir))if(/\.png$/i.test(name)&&!keep.has(name))await unlink(new URL(name,dir));
manifest.files=Object.fromEntries(Object.entries(manifest.files).filter(([,e])=>e&&keep.has(e.src.split('/').at(-1))));
await writeFile(new URL('manifest.json',dir),JSON.stringify(manifest,null,2)+'\n');
const doc=[
 '# 原廠組合、多角度與三段零件參考','',
 '核對日期：2026-11-12。83 顆均對應 Takara Tomy 官方商品 gallery 的指定原廠組合；套裝與隨機包已依晶片、主刃、顏色逐張比對。','',
 `共 ${references.length} 筆圖片引用、${keep.size} 張不同原圖；${Object.values(metadata).filter(e=>e.side).length} 顆提供斜視，${Object.values(metadata).filter(e=>e.ratchetPhoto).length} 顆提供獨立棘輪，${Object.values(metadata).filter(e=>e.bitPhoto).length} 顆提供獨立軸心。未取得單品斜視或零件圖的欄位保留 null。`,'',
 '原圖以相同 bytes 保存在 public/model-references/，未裁切、去背、改色或重繪；SHA-256、來源頁與 imageSource 可逐張追溯。資料在 src/model-references.json，top 保留 ProductImage 全部欄位，另有 side、ratchetPhoto、bitPhoto、colors 與 confidence。','',
 '## 近似與未確認範圍','',
 '- official-combo 代表圖片已確認是此品號的該組合，不表示模型是原廠 CAD 或所有零件色碼均已確認。','- colors 是照片的可見表面估色；光線、陰影、透明材質、金屬反射會影響色碼。沒有可見依據的棘輪／軸心保留 null。bladeMetal 為有證據的塗裝估色；null 採一般銀色。','- bladePlastic 優先採中環飽和色，少數深色／白色零件經視覺修正，避開中央晶片圖樣的誤色。','- imageBounds 與 72 點 shape 以 Canvas 唯讀像素取得，仍可能含少量陰影；teeth 保留既有 metadata，並非重算成實際齒數。','- CX-09 Sol Eclipse 官方展示紅、藍雙面，本資料選藍面俯視與整顆斜視；不將另一面誤認為其他配色。','- 厚度、棘輪高度及零件咬合由即時模型近似；未做實物量測、3D 掃描或材料色票比對。','',
 '## 重現','',
 '執行 `node scripts/acquire-model-references.mjs` 會核對官方 gallery、快取下載、唯讀像素分析、驗證 83 個 ID 與有效輪廓，再只保留實際引用原圖。已有 manifest 時可用 `--analyze` 離線重產資料。需要專案開發依賴與 Chrome。','',
 '## 逐顆來源','',
 '| 陀螺 | 俯視原圖 | 斜視 | 棘輪 | 軸心 | 官方頁 |','| --- | --- | --- | --- | --- | --- |',
 ...rows.map(row=>{const e=metadata[row.id];return `| ${row.name} | [原圖](${e.top.imageSource}) | ${e.side?'有':'—'} | ${e.ratchetPhoto?'有':'—'} | ${e.bitPhoto?'有':'—'} | [${row.code}](${e.source}) |`;})
];
await writeFile(new URL('docs/model-references.md',root),doc.join('\n')+'\n');
