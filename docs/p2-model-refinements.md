# P2 原廠零件外觀精修

核對日期：2026-11-14。基準：`a1f4d4019626d392539793e233259d881c503531`。

本輪只在 `beyModel` 完成基本三段模型後套用 `bey-visual-refinements.ts`。新模組只依產品 ID 選取渲染細節；沒有修改 `modelSpec`、圖鑑、戰鬥資料或物理公式。原始照片、輪廓資料、profile、part-shapes 與齒數均保留。

## 修正的三款

| 原廠組合 | 可見修正 | 比對照片 |
| --- | --- | --- |
| BX-34 Cobalt Dragoon 2-60C | C 軸底端加入螺旋接觸帶和較高的流道底面，取代整片平底；2-60 外殼改弧形雙凸瓣，分出藍色外殼／透明紅內件；戰刃中央實體改透明紅環。 | 本機 BX34_02、BX34_03、BX34_04 與官方 detail_bx34 |
| BX-35 Black Shell 4-60D | D 軸改較寬的低錐形底座與多個接地小凸點，取代單針；軸心配色由鮮綠調為照片的深灰綠；戰刃加入往外下降的八組護刃側緣。 | 本機 BX35_01 與官方 detail_bx35 的低角度對戰圖、D 軸獨立圖 |
| UX-09 Samurai Saber 2-70L | L 軸三階接觸面加入中央淺凹和獨立接地環；2-70 改弧形雙凸瓣並分出綠色外殼／透明內件；戰刃加入兩組靜態金屬翼軸。 | 本機 UX09_02、UX09_03、UX09_04 與官方 detail_ux09 |

BX-35 的八組護刃依官方 detail 圖明示的八枚防護刃，沒有用圖片像素推算齒數。C 的螺旋帶與 D 的凸點排列只是可辨識的表面採樣，不主張與原廠溝紋圈數、凸點總數相同。沒有新增或猜測軸心齒輪齒數。

## 官方來源

- [BX-34 原廠商品頁](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/bx34.html)／[結構說明原圖](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/detail_bx34.png)。本機獨立參考：[戰刃](../public/model-references/BX34_02.png)、[2-60 棘輪](../public/model-references/BX34_03.png)、[C 軸](../public/model-references/BX34_04.png)。
- [BX-35 原廠商品頁](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/bx35.html)／[結構說明原圖](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/detail_bx35.png)。本機參考：[原廠黑綠組合斜視](../public/model-references/BX35_01.png)。未挪用同一隨機包內其他配色的軸心照片。
- [UX-09 原廠商品頁](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/ux09.html)／[結構說明原圖](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/detail_ux09.png)。本機獨立參考：[戰刃](../public/model-references/UX09_02.png)、[2-70 棘輪](../public/model-references/UX09_03.png)、[L 軸](../public/model-references/UX09_04.png)。

上述本機原圖與當日官方 detail 原圖均已逐張檢視；沒有重新產生、修改或替換產品圖片。

## 參數與驗證邊界

渲染層保留原來的 tipFamily、tipRadius、gearRadius、bladeThickness、ratchetLobes、spec.colors，並且不改傳入的 Bey 或 spec 物件。D 雖然顯示多點接觸外形，既有引擎所讀的 `part-shapes` 仍維持原值；這是為了保留 v5 重播與現有平衡。

新增測試先出現預期 RED：5 項缺失失敗、既有參數保留測試通過。加入幾何後，以下小型模型測試為 12/12 GREEN：

```powershell
node --experimental-strip-types --test tests/p2-model-refinements.test.ts tests/model.test.ts
```

測試以實際 Three.js 網格與射線檢查螺旋高低差、多點接地／點間凹隙、三階底面、雙凸瓣與內件材質、護刃下降方向及側面露出；另外驗證三段爆裂分組、接地邊界、有限座標與原參數／輸入不變。沒有啟動瀏覽器、執行全套測試或重平衡。

這些尺寸與色碼仍是照片近似，非原廠 CAD、實測毫米或材料色票。翼軸為靜態閉合狀態，沒有模擬 Samurai Saber 金屬翼的開合機構；C／D 接觸紋也不會改變遊戲摩擦。透明零件排序與實際螢幕辨識度交由主流程的 browser QA 驗證。
