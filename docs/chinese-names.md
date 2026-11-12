# 繁體中文名稱與來源界線

核對日期：2026-11-12。`src/chinese-names.json` 補齊現有 **83 顆**陀螺的繁體中文名，以穩定 `bey.id` 對照；保留英文名稱、品號與原廠組合資料。

## 顯示與命名原則

- `official-tw`：本次有臺灣代理刊物的一級名稱證據。目前 **1 顆**，BX-20「蒼龍利刃」；新光三越刊物的 Funbox 專櫃以此名稱刊登 BX-20 改造組。
- `translated`：**82 顆**為遊戲繁中參考譯名，可能採常見臺灣用名，也可能依原廠英文／日文名稱翻譯。本次未取得臺灣原廠或代理對完整名稱的一級證據，不能在介面一概標成「官方中文名稱」。JSON 的原廠來源頁用於對照原名與品號，不表示該日文頁刊登中文譯名。
- CX 名稱依原有晶片、主刃、輔助刃順序完整顯示，用「・」分段。例如 Dran Brave Slash 為「蒼龍勇氣・斬擊」，Bahamut Blitz Break Knuckle 為「龍王閃擊・破擊・拳鋒」。套裝內不同型號各有獨立名稱，不以整盒套組名稱取代。
- 中文名不包含棘輪／軸心代碼；沿用現有獨立欄位顯示，避免重複。地區不同的正式用名並不一定相同，不能把香港用名自動認作臺灣用名。

## 一級來源

1. [新光三越 2024 兒童節刊物／Funbox 專櫃](https://img.skmbuy.com.tw/App_Images/727/WSDMUpload/2024/0319/4f5799a7-010c-4a95-8aa9-0eb670fd8cc5.pdf)：刊登「BX-20 蒼龍利刃改造組」，支持本次唯一 `official-tw`。
2. [Funbox 麗嬰國際官方購物網站](https://shop.funbox.com.tw/)、[戰鬥陀螺分類](https://shop.funbox.com.tw/collections/%E6%88%B0%E9%AC%A5%E9%99%80%E8%9E%BA)：HTTP 能讀取，但本次分類僅列近期少數商品，BX-01 查詢沒有結果，不能藉此驗證所有舊款名稱。
3. [Funbox CX-19 商品頁](https://shop.funbox.com.tw/products/bb08062)：確認主名「鱷魚裂甲」。本卡完整名「鱷魚裂甲・堅韌・鎮壓」中的 Tough／Quell 為延伸譯名，故整筆仍保守標 `translated`。
4. [Takara Tomy Asia 官方香港商城](https://takaratomyasiamall.com/index.php?order=DESC&page=2&path=1028&route=product%2Fcategory&sort=p.price)：例如 UX-01「翔龍破壞劍」、UX-02「煉獄惡鎚」、UX-08「白銀戰狼」、UX-17「隕石青龍」，和臺灣慣用的蒼龍爆刃、惡魔戰鎚、霜輝銀狼、隕星龍騎士有所不同。因此本專案未將香港標題混標為 `official-tw`。
5. 各卡的 [Takara Tomy 日本產品頁](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/index.html) 逐筆存於 JSON，對照英文／日文原名及完整型號。

## 通行譯法參照

[beygg 臺灣玩家圖鑑](https://beygg.com/beyblades)、[BeybladeHub 上蓋圖鑑](https://beybladehub.app/parts/blades) 與 [戰鬥陀螺 X 宇宙零件表](https://beybladexx.com/part/) 用於避免把核心款重新發明成難辨識的譯名。這些是獨立玩家來源，不能作為代理正式命名的證據。不同玩家來源仍可能有譯名差異，本專案維持明確的 `translated` 狀態。

## 驗證

已驗證 JSON 有83個現有ID、名稱皆含繁體中文字、名稱各自唯一、來源均為HTTPS，狀態僅有 `official-tw`／`translated`。本次不修改英文名稱、數值、物理、戰績或備份內容。
