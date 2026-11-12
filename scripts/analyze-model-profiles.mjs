import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';

const root=new URL('../',import.meta.url);
const rows=JSON.parse(await readFile(new URL('src/catalog-data.json',root),'utf8'));
const refs=JSON.parse(await readFile(new URL('src/model-references.json',root),'utf8'));
const parts=JSON.parse(await readFile(new URL('src/part-shapes.json',root),'utf8'));
// Parameters are conservative photo grades, not measurements or random stat-derived dimensions.
// thickness, core radius, core rise, shoulder drop, visible features, photo observation.
const blades={
 'dran-sword':[.100,.180,.018,.024,['three-wing','swept-edge'],'三個細長金屬上擊肩，藍色中環較窄。'],
 'hells-scythe':[.094,.205,.014,.018,['four-wing'],'四向寬金屬肩，圓形中環佔比高。'],
 'wizard-arrow':[.090,.205,.021,.016,['three-wing','recessed-core'],'三片狹長外弧，中央塑膠隆起。'],
 'knight-shield':[.112,.185,.016,.032,['shield','four-wing'],'較高的四面護盾肩與內凹綠色核心。'],
 'knight-lance':[.122,.170,.020,.036,['lance','three-wing'],'三向尖肩與較厚的外沿。'],
 'shark-edge':[.123,.175,.015,.036,['claw','three-wing'],'俯視可見三個外伸大爪；無此組合斜視，以同類攻擊肩厚度近似。'],
 'leon-claw':[.098,.195,.014,.027,['claw','five-wing'],'五向爪刃，中央黑色基座外露。'],
 'viper-tail':[.115,.185,.022,.033,['three-wing','stepped-shoulder'],'三個下切角與下層塑膠裙邊。'],
 'rhino-horn':[.122,.155,.025,.034,['compact','horn'],'小直徑、厚實的凸角肩與較小中心。'],
 'dran-dagger':[.106,.180,.017,.025,['three-wing','double-edge'],'三組雙層短刀肩，邊緣比Sword更寬。'],
 'hells-chain':[.118,.190,.018,.031,['chain','stepped-shoulder'],'周向肩塊連接成高低交錯的鏈環。'],
 'phoenix-wing':[.136,.190,.025,.037,['three-wing','thick-wing'],'紅金屬三大片厚翼，底部有金橘塑膠內架。'],
 'wyvern-gale':[.100,.195,.018,.023,['four-wing'],'四個弧形翼口；無單品斜視，厚度以近似同系肩部處理。'],
 'unicorn-sting':[.108,.185,.020,.032,['asymmetric','dual-edge'],'尖刺側與圓弧側輪廓不對稱。'],
 'sphinx-cowl':[.151,.195,.025,.040,['thick-wing','stepped-shoulder'],'斜視可見大面積厚金屬側壁和深色下裙。'],
 'tyranno-beat':[.139,.180,.019,.039,['claw','thick-wing'],'俯視有寬大的斜角撞擊肩；缺指定單品斜視，厚度屬同類近似。'],
 'weiss-tiger':[.106,.175,.022,.029,['three-wing','swept-edge'],'三向細長折角肩，灰色中環外露較少。'],
 'cobalt-dragoon':[.126,.180,.026,.035,['two-wing','left-spin'],'左旋兩大片外翼與明顯中央環。'],
 'black-shell':[.115,.195,.013,.036,['four-wing','shield'],'四組寬角防護塊與低平中央。'],
 'whale-wave':[.166,.195,.020,.040,['thick-wing','stepped-shoulder'],'斜視有特別厚的金屬上層及明顯下層藍色盤。'],
 'bear-scratch':[.108,.195,.015,.029,['claw','four-wing'],'四組短爪凸角，外沿有凹槽。'],
 'crimson-garuda':[.113,.180,.024,.032,['two-wing','swept-edge'],'雙向斜長翼肩，紅色內環高於凹面。'],
 'shelter-drake':[.136,.205,.025,.039,['shield','thick-wing'],'大塊寬厚金屬防護肩，核心較高。'],
 'tricera-press':[.151,.185,.023,.040,['horn','thick-wing'],'三個突出的厚重肩塊，整體側面高。'],
 'samurai-calibur':[.116,.190,.021,.034,['two-wing','swept-edge'],'雙向折刃與凹入核心，外圈局部較厚。'],
 'cobalt-drake':[.142,.175,.024,.039,['four-wing','thick-wing'],'紅金屬四個寬翼，中央青色塑膠較緊湊。'],
 'goat-tackle':[.131,.185,.019,.038,['horn','stepped-shoulder'],'四向厚突肩與凸起紫色核心。'],
 'mammoth-tusk':[.132,.180,.025,.038,['tusk','thick-wing'],'黑色外肩帶突牙，中心橘色高層。'],
 'dran-strike':[.129,.180,.025,.037,['three-wing','stepped-shoulder'],'三組厚外伸刃肩，中央藍色鎖定層清楚。'],
 'heavens-ring':[.108,.225,.010,.023,['disc','recessed-core'],'大面積連續外環與低平中央盤。'],
 'luster-dragoon':[.124,.185,.022,.034,['two-wing','left-spin'],'左旋兩大片折翼，紫色內圈環繞晶片。'],
 'sieg-superion':[.115,.180,.027,.032,['three-wing','raised-core'],'三角向肩與明顯金色高核心。'],
 'dran-buster':[.148,.165,.030,.040,['single-strike','asymmetric','thick-wing'],'單一特別長的大擊刃，核心偏緊；不可改為均勻三刃外形。'],
 'hells-hammer':[.129,.190,.028,.036,['three-wing','hammer'],'三塊厚錘面，橘色核心高低差明顯。'],
 'wizard-rod':[.102,.225,.035,.017,['disc','raised-core'],'圓周大盤較薄，中心黃色結構高起。'],
 'shinobi-shadow':[.091,.205,.014,.018,['disc','recessed-core'],'薄圓盤式外沿、低平三向中心。'],
 'leon-crest':[.142,.180,.030,.039,['claw','thick-wing'],'多層外伸爪肩，黑色內架在肩間外露。'],
 'phoenix-rudder':[.118,.210,.025,.029,['three-wing','raised-core'],'三向大外環與較寬的紅色中央盤。'],
 'silver-wolf':[.137,.190,.023,.036,['free-ring','stepped-shoulder'],'下方獨立自由環與三組高低層外肩。'],
 'samurai-saber':[.118,.170,.021,.037,['two-wing','asymmetric'],'雙向長刃，兩側外沿不等寬。'],
 'knight-mail':[.147,.195,.023,.040,['shield','thick-wing'],'三大寬盾肩與深的金屬側壁。'],
 'ptera-swing':[.111,.180,.020,.030,['two-wing','swept-edge'],'寬翼形上刃；缺此單品斜視，側面採近似。'],
 'impact-drake':[.153,.180,.027,.040,['rubber-blade','three-wing','thick-wing'],'三組大撞擊肩與紅色橡膠接觸區，核心比外肩低。'],
 'ghost-circle':[.083,.215,.012,.015,['disc','recessed-core'],'非常平滑的薄圓盤外沿，凹入中央。'],
 'golem-rock':[.148,.170,.022,.040,['rock','thick-wing'],'三塊厚大岩塊肩與高側壁。'],
 'scorpio-spear':[.126,.180,.025,.034,['spear','raised-core'],'三向槍肩、中央橘色結構隆起。'],
 'shark-scale':[.160,.175,.021,.040,['claw','three-wing','thick-wing'],'三個特厚外伸爪肩與大面積金屬壁。'],
 'tyranno-roar':[.139,.180,.022,.037,['claw','stepped-shoulder'],'三組外伸短爪，肩部有明顯兩層。'],
 'clock-mirage':[.118,.230,.012,.024,['disc','serrated-skirt'],'寬且平的中央盤、外周密集齒紋裙邊。'],
 'meteor-dragoon':[.133,.180,.028,.038,['two-wing','left-spin','thick-wing'],'兩塊寬厚的白色外翼，紅色核心較高。'],
 'mummy-curse':[.114,.175,.020,.035,['three-wing','claw'],'三塊內彎的凸肩與緊湊核心。'],
 'bullet-griffon':[.168,.205,.032,.040,['integrated-blade','thick-wing','raised-core'],'戰刃／棘輪連成較高的兩層本體，紅色頂部高起。'],
 'glory-valkyrie':[.163,.190,.032,.040,['integrated-blade','three-wing','raised-core'],'一體式厚本體與高白色核心，底部另接LF。'],
 'hells-nether':[.159,.210,.031,.039,['integrated-blade','disc','raised-core'],'寬橘色中心盤與厚的外緣及一體式下層。'],
 'wyvern-hover':[.127,.195,.020,.034,['four-wing','stepped-shoulder'],'四組外伸肩及較高下裙。'],
 'aero-pegasus':[.143,.180,.024,.039,['three-wing','thick-wing'],'三組厚長翼肩，青色金屬外壁。'],
 'dran-brave-slash':[.125,.175,.025,.035,['cx-layered','three-wing','swept-edge'],'晶片、塑膠主刃與金屬外肩層次清楚。'],
 'wizard-arc-round':[.105,.210,.024,.020,['cx-layered','disc'],'圓弧外肩連接成薄盤，黃色中央層稍高。'],
 'perseus-dark-bumper':[.136,.180,.022,.038,['cx-layered','shield','thick-wing'],'三組寬護盾肩，深色塑膠底層佔比高。'],
 'hells-reaper-turn':[.133,.195,.025,.037,['cx-layered','two-wing','stepped-shoulder'],'兩組寬刃與紅色輔助刃下層。'],
 'rhino-reaper-charge':[.133,.195,.025,.037,['cx-layered','two-wing','stepped-shoulder'],'同Reaper主刃層寬肩；無此完整組合斜視，層高採Reaper近似。'],
 'hells-arc-turn':[.105,.210,.024,.020,['cx-layered','disc'],'沿用Arc主刃的圓弧低平肩，缺此完整組合斜視。'],
 'fox-brush-jaggy':[.121,.175,.025,.034,['cx-layered','three-wing','claw'],'三個斜長爪肩與較窄核心。'],
 'pegasus-blast-assault':[.138,.195,.028,.039,['cx-layered','three-wing','integrated-bit'],'外翼與白色下層交錯，下方接大體積一體式軸心。'],
 'cerberus-flame-wheel':[.127,.195,.024,.035,['cx-layered','three-wing','stepped-shoulder'],'三組紅色外肩，下層黑色輔助環清楚外露。'],
 'whale-flame-massive':[.127,.195,.024,.035,['cx-layered','three-wing','stepped-shoulder'],'同Flame主刃的三肩層次，無此完整組合斜視。'],
 'cerberus-dark-wheel':[.136,.180,.022,.038,['cx-layered','shield','thick-wing'],'同Dark主刃寬護盾肩，無此完整組合斜視。'],
 'sol-eclipse-dual':[.132,.195,.025,.036,['cx-layered','dual-face','stepped-shoulder'],'藍面為預設，外緣有高低交錯肩，紅／藍為雙面模式。'],
 'wolf-hunt-free':[.111,.185,.021,.026,['cx-layered','disc'],'圓形外肩內有多組削口，下層輔助環獨立；不僅依名稱推定轉動機構。'],
 'emperor-might-heavy':[.154,.180,.030,.040,['cx-layered','thick-wing','integrated-bit'],'四組厚金色肩塊，下方接Op一體式粗環。'],
 'phoenix-flare-zillion':[.134,.180,.029,.036,['cx-layered','three-wing','swept-edge'],'三組長紅翼、黑色主刃夾層。'],
 'bahamut-blitz-break-knuckle':[.147,.175,.026,.040,['cx-layered','claw','thick-wing'],'粉紅框與多組寬厚金屬爪，外緣分層高。'],
 'knight-fortress-guard-vertical':[.151,.190,.024,.040,['cx-layered','shield','thick-wing'],'三片特厚護盾肩，綠色外框與金色內架。'],
 'ragna-rage-flow-erase':[.122,.195,.028,.030,['cx-layered','three-wing','raised-core'],'三向下切外肩，橘色核心相對高起。'],
 'unicorn-delta-peak-odd':[.118,.190,.022,.031,['cx-layered','asymmetric','stepped-shoulder'],'偏斜尖肩與不等寬外弧，紫色核心低於外緣。'],
 'brachio-whip-outer-wheel':[.108,.225,.015,.022,['cx-layered','disc'],'寬圓盤與薄外緣，中央面低平。'],
 'croco-tread-tough-quell':[.140,.190,.022,.038,['cx-layered','serrated-skirt','thick-wing'],'密集外沿削口與厚金色肩，下層綠環。'],
 'phoenix-force-weight-heavy':[.158,.190,.030,.040,['cx-layered','thick-wing','stepped-shoulder'],'厚銀色上肩與大面積紅色下層，斜視可見深側壁。'],
 'hells-brave-jaggy':[.125,.175,.025,.035,['cx-layered','three-wing','swept-edge'],'沿用Brave金屬肩，藍紫塑膠主刃與不同輔助刃。'],
 'pegasus-brush-massive':[.121,.175,.025,.034,['cx-layered','three-wing','claw'],'同Brush三斜爪肩；無完整組合斜視。'],
 'sol-brave-charge':[.125,.175,.025,.035,['cx-layered','three-wing','swept-edge'],'同Brave三向金屬肩，無完整組合斜視。'],
 'wolf-flame-dual':[.127,.195,.024,.035,['cx-layered','three-wing','stepped-shoulder'],'同Flame三組寬肩，無完整組合斜視。'],
 'cerberus-reaper-bumper':[.133,.195,.025,.037,['cx-layered','two-wing','stepped-shoulder'],'同Reaper兩向外刃，無完整組合斜視。'],
};
// Maximum contact-head shoulder radius, not the needle's ground-contact radius.
const tipByFamily={flat:.083,needle:.048,ball:.064,orb:.064,point:.082,taper:.084,hexa:.083,stepped:.105,wedge:.074};
const tipOverrides={A:.095,R:.058,LR:.058,F:.085,LF:.080,UF:.092,Q:.090,DB:.064,DS:.048,BS:.055,Nr:.042,J:.055,Z:.090,I:.100,M:.082};
const largeGears=new Set(['GF','GN','GP','GB','GU','GR']);
const profiles={};
for(const row of rows){
  const ref=refs[row.id],p=blades[row.blade],part=parts[row.bit];
  assert.ok(p,'Missing manual blade '+row.blade);
  const [bladeThickness,coreRadius,coreRise,shoulderDrop,features,observation]=p;
  const confidence=ref.side?'photo-approximation':'family-approximation';
  profiles[row.id]={bladeThickness,coreRadius,coreRise,shoulderDrop,
    tipRadius:tipOverrides[row.bit]??tipByFamily[part.family]??.084,
    gearRadius:part.integrated?.19:['J','Z'].includes(row.bit)?.112:largeGears.has(row.bit)?.110:.083,
    features:[...features,...(row.bit==='BS'?['bound-spike']:[])],source:ref.source,confidence,
    note:observation+' 厚度、核心層高及軸心肩寬為照片分級近似，非量測；軸心未有獨立照片時沿用同代碼族群。'};
}
assert.equal(Object.keys(profiles).length,83);
for(const [id,p] of Object.entries(profiles)){
  for(const [k,lo,hi] of [['bladeThickness',.075,.17],['coreRadius',.14,.24],['coreRise',.005,.04],['shoulderDrop',.01,.04],['tipRadius',.035,.105],['gearRadius',.075,.19]])assert.ok(p[k]>=lo&&p[k]<=hi,id+': '+k);
  assert.equal(new URL(p.source).hostname,'beyblade.takaratomy.co.jp');
}
// Same metal blade reused by different CX chips/assist parts must retain its thickness grade.
for(const names of [['dran-brave-slash','hells-brave-jaggy','sol-brave-charge'],['fox-brush-jaggy','pegasus-brush-massive'],['perseus-dark-bumper','cerberus-dark-wheel'],['hells-reaper-turn','rhino-reaper-charge','cerberus-reaper-bumper'],['cerberus-flame-wheel','whale-flame-massive','wolf-flame-dual'],['wizard-arc-round','hells-arc-turn']])assert.equal(new Set(names.map(n=>blades[n][0])).size,1);
await writeFile(new URL('src/model-profiles.json',root),JSON.stringify(profiles,null,2)+'\n');
console.log(JSON.stringify({profiles:Object.keys(profiles).length,photoApproximation:Object.values(profiles).filter(p=>p.confidence==='photo-approximation').length,familyApproximation:Object.values(profiles).filter(p=>p.confidence==='family-approximation').length,thicknessGrades:new Set(Object.values(profiles).map(p=>p.bladeThickness)).size}));
