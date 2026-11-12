# v0.9.0 圖鑑擴充驗收

日期：2026-11-12。基準：`edc345c0cd8de62b16c5bfcc2b0fe25329c6a04c`（v0.8.0）。

## 內容

原企劃83款加8款：Valkyrie Volt Slash、Bucks Antlers Bumper、Kraken Wriggle Slash、Hornet Fort Round、Drake Brave Gravity、Storm Pegasus、Storm Spriggan、Tiga Rage Flow Turn。總數91，BX34／UX24／CX33。資料在scripts/catalog-expansion.json，原src/catalog-data.json與企劃書不變，npm run catalog不會刪除擴充包。

同為BX-00／CX-00的產品使用獨立ID、日期與來源，不以共用品號覆蓋日期。8款中文均為參考譯名；6款旋向以相容規格推定，卡牌詳情有註記；另2款由官方詳解直接確認。StormSpriggan的M已由官方說明書零件表確證，不能因圖片外形相似就改成U；Drake的G依官方文案為Gravity。

新增35張官方原圖，共280張多角度參考；8款皆有不同俯視圖、72點輪廓及斜視。部分斜視含發射器／替換件，明確標set，輪廓只取獨立俯視。原83筆metadata值、原圖bytes保持不變。厚度、色碼與幾何是照片近似，未作CAD或實物量測。詳細證據見[catalog-expansion-sources.md](catalog-expansion-sources.md)及[catalog-expansion-images.md](catalog-expansion-images.md)。

RA新增紅色實心平底膠頭、藍色軸身；StormSpriggan保留M代碼但使用該款白色接觸環。原有M模型不變。圖鑑／選隊新增「新增8」篩選與NEW標示，計數取實際資料長度。

## 驗證

- 新增3項擴充Node測試，先觀察83不等91失敗，再整合至通過。保存原83款的ID、stats、spin、ratchet、bit、height快照，逐款相等；中文／英文查找、逐款日期／來源、8個獨立輪廓／側視、RA實心接觸端均驗證。
- 91個模型既有三段契約、足尖接地、有限幾何、實物圖雜湊及命名回歸；初始RA膠頭低於原點.007的錯誤已由模型測試抓出，修成底面0後通過。
- 新增實際Chrome流程：91卡／新增8篩選、8張實物可載入、8款逐顆中文搜尋／側面／拆解、RA底部、手機無溢出及選3款發射。針對性測試通過（15.3秒），截圖在本機artifacts/catalog-new-v090.png、new-*-side.png、new-ra-bottom-v090.png、catalog-new-mobile-v090.png、new-beys-battle-v090.png。
- 最終 `npm test`：49項通過；`npx playwright test --reporter=line`：26項全部通過（5.6分鐘），涵蓋新增款、91卡圖片、1P／2P完整對戰、備份／舊版重播、終結、音訊、開場、暫停、低速旋轉及繪圖預算；`npm run build`通過，既有單一大chunk提示仍存在。
- 已查看新版8款桌機圖鑑、RA實心膠頭底部、Tiga側面及手機圖鑑／對戰截圖，模型與DOM正常。
- 唯讀審查確認原83款ID與戰鬥參數一致、physics／storage／match與原始83資料無修改，未發現擴充整合阻擋問題。

## 平衡稽核與已知限制

- 新款專項：8款各對全部91款、3組種子並交換先後手，含65–100%蓄力、三落點、0–30度傾角及呼喊，共4,368場，全部16.058–37.558秒。`node --experimental-strip-types scripts/expansion-balance.ts`通過，詳見[expansion-balance-report.json](expansion-balance-report.json)。
- 全體：4,096校準＋16,384獨立驗收＋4,368邊界，共24,848場。獨立驗收攻擊／防禦／持久／平衡勝率49.084%／46.436%／56.140%／48.218%，均在40–60%；所有邊界個案15.042–39.617秒。
- **完整驗收有1個時長例外，npm run balance仍以exit1失敗，沒有放寬門檻或換種子掩蓋。** 原有UX-15 Tyranno Roar對BX-31 Tyranno Beat，seed72101967，14.433333秒爆裂；兩方輸入為power .6767411596607417／.9601050117402338、lane1／0、angle15／8，呼喊tick720／840。用git取v0.8.0原始物理碼重新執行同輸入及未變更的原能力值，結果完全相同，確認屬舊引擎既有個案，並非新款能力改壞。
- 完整報告及可重現失敗輸入保存在[balance-report.json](balance-report.json)；原v0.2.0報告另存[balance-report-v020.json](balance-report-v020.json)，不再把舊樣本all-pass當作目前全體的保證。

本次不修改既有物理及能力值，保留歷史重播行為。尚未驗證實體手機效能與喇叭／耳機；新款旋向／照片幾何的推定界線如上，不宣稱實體產品勝率。
