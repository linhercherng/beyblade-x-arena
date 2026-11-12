# 零件幾何參考與驗證界線

查證日期：2026-11-12。這份資料用於戰鬥模型的可辨識外形，不是產品 CAD、量測尺寸或物理參數。`src/part-shapes.json` 覆蓋目前圖鑑 83 組原廠組合使用的 **54 種 bit**，以代碼區分大小寫（`Nr`、`Op`、`Tr`）。

## 如何讀取 JSON

- `family` 是接觸頭的渲染分類，不能據此更改遊戲攻擊／防禦／持久／平衡型別。
- `height` 是相對外觀分類。低軸的差距不全相同：官方圖明示 LF、LR、LO、LP、LC 低 1 mm，UF 低 2 mm；HN 高 1 mm。模型仍須配合棘輪高度。
- `gearTeeth` 只有官方文字明示時填數字。目前已確認 W 和 Nr 都是 **10 齒**；其他 `null` 表示本次未確認，不能解讀為沒有齒輪。程式若採通用齒輪，屬視覺近似，不應顯示成查證規格。
- `metalTip` 只指軸尖金屬；銀白顏色不等於金屬。例如 G 是低摩擦材質，M 是橡膠外圈，兩者不應套金屬材質。
- `freeRing` 指 bit 本身存在可見獨立自由環。FF／FB 是整顆 bit 相對棘輪自由迴轉，這不代表需要再加一圈外露轉環，故填 `false`。Silver Wolf 的自由環屬 blade 下層。
- `offsetTip` 只對偏心軸的 Q 開啟。側邊不對稱凸翼不等於接觸點偏心。
- `integrated` 只表示 **棘輪一體型 bit**；目前 Tr、Op 為 `true`。它不表示棘輪一體型 blade。
- `confidence: official-image` 表示本次已直接看官方產品詳解圖，僅確認 note 中寫出的可見輪廓／官方文字；`reference-only` 表示目前只有品名與產品頁連結，分類仍是低細節近似。不能把這個等級當精確尺寸的保證。

## 優先修正的外形

| 代碼 | 實際名稱與可見輪廓 | 主要證據 |
| --- | --- | --- |
| W | Wedge／ウェッジ；帶尖角的短楔狀軸先，官方明示 10 齒。 | [CX-03 詳解圖](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/detail_CX03.png) |
| WW | Wall Wedge；W 軸先外圍有筒狀壁。外壁不能畫成整顆球或自由旋轉環。 | [CX-12 詳解圖](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/detail_CX12.png) |
| WB | Wall Ball；中央球頭外圍另有筒狀壁。 | [CX-08 詳解圖](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/detail_CX08.png) |
| DS | Disk Spike；大圓盤與尖軸並存，盤面有開孔。Disk 不代表自由轉環。 | [BX-50 詳解圖](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/detail_BX50.png) |
| Nr | Narrow／ナロー；細窄長形接觸軸，官方明示 10 齒。沒有獨立滾輪。 | [CX-18 詳解圖](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/detail_CX18.png) |
| GU | Gear Unite；球狀接觸頭上有平接地面及中央突點，齒輪延伸至先端。 | [CX-17 詳解圖](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/detail_CX17.png) |
| MT | Metal Taper；塑膠肩部下方露出銀色金屬短錐台接觸頭。 | [CX-20 詳解圖](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/detail_CX20.png) |
| LC | Low Cyclone；比 C 低 1 mm，底緣有花瓣／鋸齒狀抓地削口。 | [BX-52 詳解圖](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/detail_BX52.png) |
| LP | Low Point／ローポイント；比 P 低 1 mm，平底中央有小突點。 | [BX-54 詳解圖](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/detail_BX54.png) |
| J | Jolt；細平軸先配大型齒輪肩，不能畫成球。 | [UX-17 詳解圖](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/detail_UX17.png) |
| BS | Bound Spike；有槽塑膠本體、可上下縮入的尖軸。官方圖沒有可見外露金屬線圈。 | [BX-44 詳解圖](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/detail_BX44.png) |
| M | Merge bit；尖塑膠軸先外圍為高摩擦橡膠環。與棘輪 M 的金屬環不同。 | [BX-45 詳解圖](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/detail_BX45.png) |
| Y | Yielding；大型球頭與向四個方向伸出的重量肩。 | [CX-15 詳解圖](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/detail_CX15.png) |
| Z | Zap；大型齒輪、平底、中央突點。 | [UX-14 詳解圖](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/detail_UX14.png) |

其餘已直接查看的官方圖連結存於 JSON 的 `source`。DB 是球軸配開孔大圓盤；E 是中段大型固定導引盤；L 是三階接觸頭；G 是半球低摩擦接觸面；I 是帶多個底緣突起的大圓筒軸先。這些應透過側面輪廓辨識，而不只改變頂部貼圖。

## 棘輪與整合式結構

### 數字棘輪與 0

棘輪的第一段通常是外緣刃數、第二段是高度規格。外圈仍然是圓形／多段圓形組件，刃數應畫成周向凸瓣，不能直接替換成實心正多邊形。不同刃有不同形狀；例如官方 6-60 圖顯示兩種輪廓交替，不能只做六個完全相同尖角。

`0-70`、`0-80` 的 **0 表示零枚刃**，外緣仍有平滑圓形裙邊和內部組件，不能把整個棘輪省略。證據：[BX-54 的 0-70](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/detail_BX54.png)、[BX-50 的 0-80](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/detail_BX50.png)。

### M 棘輪

`M-85`、`M-65` 屬 joint-simple 結構，官方說明含金屬部件，照片可見底側銀色金屬環。M 不是數字刃數，不能推成 6 枚刃；模型應保留圓形接合體與金屬環。M-85 與 M-65 的高度不同，實際外圈輪廓也不完全相同，通用圓形體只是近似。證據：[BX-44 M-85](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/detail_BX44.png)、[CX-20 M-65](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/detail_CX20.png)。

### 棘輪一體型 bit

- [Tr／Turbo，CX-07](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/detail_CX07.png)：上部是粗大棘輪環體，下面才是可變軸。高速細軸、低速粗軸的示意高度為 90→65。靜態模型以細軸狀態為預設；不要另疊一顆普通棘輪，也不要畫出未見於圖中的內部機構。
- [Op／Operate，CX-11](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/detail_CX11.png)：黑色環體配金色下圈與紅色軸先。防禦模式為四刃和細軸；攻擊模式為二刃和粗軸，可手動切換，官方標示高度 80/85。靜態預設採細軸防禦模式。

### 棘輪一體型 blade

它與上段是不同結構：棘輪層已接在 blade，下面仍可插普通 bit。不能因名稱省略 H、LF、Z 的外形，也不能再堆普通棘輪。

- [UX-19 Bullet Griffon H](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/detail_UX19.png)：blade 一體棘輪，使用普通 H；具有可分離 Bullet 與本體的特殊厚層輪廓。
- [UX-20 Glory Valkyrie LF](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/detail_UX20.png)：blade 一體棘輪，使用普通 LF；官方剖視示意出 blade 內部彈簧。這不能作為 BS 軸有外露彈簧的依據。
- [UX-21 Hells Nether Z](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/detail_UX21.png)：blade 一體棘輪可切換高低，使用普通 Z。

官方註記這兩類一體型組件不能彼此疊裝。模型資料須以整合所在零件分流，不能用單一「integrated」旗標同時代表整顆陀螺的所有結構。

## 名稱與圖片配對風險

現有目錄英文別名曾將 Nr 寫成 Needle Roller、LP 寫成 Level Point。官方日文名稱及圖形確認應為 Narrow 與 Low Point，這份 JSON 已更正。BeyGear 的 [bit 零件索引](https://beygear.app/parts/) 也列相同英文名稱；本次僅用它交叉核對索引名稱，幾何結論取自上述官方詳解圖。

搜尋圖片時應同時核對商品代碼、組合碼、官方詳解中的零件標籤。M 可以是 Merge bit，也可以是 M-65/M-85 棘輪；產品名的 H 可以是 Heavy assist blade，也可能是 Hexa bit；產品圖還可能是再版、隨機包異色或不同金屬塗裝。不能從單一英文關鍵字命中的圖片直接套配色或零件。

## 尚未驗證

20 個 `reference-only` bit 的分類目前是可渲染近似，沒有逐一取得側面量測。所有模型均未作精準比例、材料透明度、內部機構或真實 CAD 比對；亦未由數張透視照片推算齒數。外觀資料不調整遊戲的平衡／碰撞參數。
