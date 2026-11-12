# 逐顆外形分級 v0.4.0

核對日期：2026-11-12。`src/model-profiles.json` 為目前83顆提供逐顆戰刃厚度、中央基座、肩部落差、軸心頭肩寬與齒輪半徑。所有模型尺寸都是**渲染座標的照片近似值**，不是原廠CAD、毫米、量測值或遊戲性能。

## 依據與可重現性

已檢視本機 `artifacts/factory-contact-0.png` 至 `factory-contact-6.png` 的原廠gallery接觸表，對照 `src/model-references.json` 所指定的原廠組合，依可見的厚／薄側壁、中心佔比與分層肩部人工分級。實際原始照片及逐張SHA-256留在 `public/model-references/`，來源總表見 [原廠照片](model-references.md)。

`node scripts/analyze-model-profiles.mjs` 以人工表產出JSON，並檢查83筆覆蓋、值域與共用CX主刃的厚度一致性。腳本不更動原始圖片、不按名稱雜湊隨機分派尺寸，也不更動物理參數。

- 71顆有對應斜視，標為 `photo-approximation`。這只表示有對照的斜視照片，**不保證已從投影可靠量出實際厚度**。
- 12顆缺指定組合斜視，標為 `family-approximation`。使用俯視輪廓與同金屬主刃／同類結構的保守側面分級，note另有註記。
- 軸心資料沿用 [54碼零件幾何參考](part-geometry-references.md)，獨立照片可見時核對肩部大小；其餘依代碼族群近似。`tipRadius`是**接地頭最寬肩部半徑**，不能直接當成針尖接觸半徑；應縮放整個接地頭的X/Z，保留原有針、球、平底的尖端曲線。
- `gearRadius`只區分一般、較寬齒輪和棘輪一體型大本體；未知齒數仍留在part-shapes，不從半徑反推齒數。

## 主要可辨識差異

| 模型／結構 | 照片可見差異與資料處理 |
| --- | --- |
| Dran Buster | 單一大擊刃明顯不對稱、厚肩配緊湊核心；保留照片輪廓，不能平均成三片一樣的刃。 |
| Shark Edge／Shark Scale | 三個大爪肩；Scale的厚側壁比Edge更明顯。Edge缺指定單品斜視，其厚度仍標同類近似。 |
| Wizard Rod／Ghost Circle | 連續圓盤外形；Rod有較高黃色中心，Ghost Circle保持薄、低平外盤。 |
| Phoenix Wing | 三片厚紅金屬翼及金橘底架；與普通銀色三翼分開。 |
| Whale Wave／Sphinx Cowl | 厚金屬側壁與下裙清楚，使用較高的厚度與肩落差。 |
| Silver Wolf | 下層獨立自由環與高低肩部，保留自由環的可見層次。 |
| Impact Drake | 三片大肩與可見紅色橡膠接觸區；`rubber-blade`只標示照片上的區域，不推定真實摩擦。 |
| Clock Mirage | 較寬中央盤與密集外周齒紋裙邊。 |
| Bullet Griffon／Glory Valkyrie／Hells Nether | 戰刃／棘輪一體的厚本體及高中央層，底部仍接各自普通軸心。 |
| CX | 主刃、金屬肩及輔助刃有層次；同Brave／Brush／Dark／Reaper／Flame／Arc金屬主刃在不同組合中保持相同厚度分級，配色和下段高度另外處理。 |

## 欄位

`bladeThickness`為主刃厚度；`coreRadius`為中央基座半徑；`coreRise`為中央面高差；`shoulderDrop`為金屬外肩的降階量；`tipRadius`與`gearRadius`為軸心外觀肩寬與齒輪半徑；`features`記錄可見結構表徵，未實作的表徵不得顯示成已精密還原。

47個厚度分級只是讓相近產品也能在渲染中保留定性的高低差，數字的三位小數不代表量測精度。需要實物量測、正交側視、3D掃描或原廠尺寸圖才能升級為幾何規格。這份資料不改變碰撞半徑、質量、轉速、勝率與重播結果。
