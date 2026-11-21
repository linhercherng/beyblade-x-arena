# v0.44.2 已發售款式核對

核對日期：2026-11-21（臺北）。使用者指定「只更新已發售款式」。以日本原廠列定日期為截點，不代表已確認臺灣上市或即時通路庫存；這輪核對近期商品清單，不冒稱重新逐項查過全91款。

## 最新主打與收錄決定

[Takara Tomy產品清單](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/)列出11/21的[BX-54 Sieg Superion 0-70LP](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/bx54.html)與[CX-20 Customize Set C](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/cx20.html)。本庫原已收錄凱旋巨神及套裝主打鳳凰武力・配重・重裝M-65MT，不重複建立ID。原廠頁面仍用「発売予定」，保留為原廠列定日期，不宣稱現貨。

12/26預定的UX-22 Vanish Lucifer WW、BX-55內Horus Shatter 3-85MO及黑色Bahamut Blitz，本次依使用者要求排除，未進入執行時資料、搜尋、選隊或隨機池。既有純換色與配件不當成新的獨立性能型號。

另發現兩筆漏列的已發售V2改版，補入原版卡牌的獨立參考區：

| 原版ID | 改版資料 | 列定日期 | 原廠供貨形式 | 來源 |
|---|---|---|---|---|
| bx-01-dran-sword | 蒼龍神劍V2／Dran Sword Version 2.0 | 2026-08-08 | BX-00 B4商店限定，完整3-60F組合 | [商品頁](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/bx00-ds_v2.html)、[原廠詳解](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/detail_BXG49.png) |
| bx-02-hells-scythe | 惡魔紅鐮V2／Hells Scythe Version 2.0 | 2026-11-21 | CX-20套裝中的V2刃片，沒有單獨列出的完整組合 | [套裝頁](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/cx20.html)、[原廠詳解](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/detail_CX20.png) |

中文沿用既有遊戲參考譯名，未宣稱臺灣代理正式V2商品名。Dran Sword的商品頁明示性能重新檢視並調整的2.0更新；Hells Scythe詳解直接標明「バージョン2.0」及更新性能，不能把它當成純配色版。CX-20只為Phoenix Force WH M-65MT明列完整組合，Hells Scythe V2僅列刃片，因此新增資料的combo保留null，不把舊版4-60T假冒為此套裝的原廠V2整顆組合。

## 圖鑑與對戰界線

圖鑑搜尋「V2」「2.0」或中文V2名稱可找到兩張對應原版卡牌；詳細視窗展示新版原廠實物圖、日期、供貨形式、商品來源及零件詳解。原版3D、原版能力與戰績仍在同卡中明確分區，並說明V2尚未建立獨立對戰設定。

可對戰名單仍為91款。沒有將原版改名冒充V2，沒有捏造V2能力，也沒有增加ID、改排序、改CPU／隨機池或加入未知零件。選隊搜尋不索引V2別名，避免玩家搜尋V2時選到原版；正常原版中英文與零件搜尋不變。新增91款快照來自修改前實際f2641c0來源，核對ID順序、六項能力、類型、旋向、棘輪、軸心及高度完全相同。引擎仍為v7，v1～v7舊戰績保留。

## 圖片證據

src/catalog-revisions.json保存三張照片的原廠URL、bytes、SHA-256與本機位置，圖片未裁切或生成，保留原廠原始PNG：

- Dran Sword V2正面：BXG49_01@1.png；斜視：BXG49_02@1.png。
- Hells Scythe V2刃片：CX20_12@1.png；完整下載後目視與詳解核對為該V2刃片。

兩份詳解原圖原樣保存在 [docs/evidence/catalog-20261121](evidence/catalog-20261121/manifest.json)，manifest含來源、bytes及SHA-256。原廠CX-20詳解同時列Shark Scale、Wizard Rod及其他零件，不將它們自行組成多顆虛構商品。

## 驗證範圍

新增測試涵蓋已發售截點、兩種供貨形式／combo null、原始照片雜湊、圖鑑限定V2搜尋、91款不變，以及320／390／1440px的實際照片載入、來源連結、版面不溢出、鍵盤關閉與選隊不誤選。原生聚焦新圖鑑及v1～v7重播；既有CI繼續執行完整瀏覽器、377,748場平衡及建置，未放寬門檻。發布依同提交CI與實際公開站結果判定，不拿未提交試跑當正式發布通過。

本次沒有建立V2獨立3D或遊戲性能，也沒有實測實物陀螺；沒有iPhone可做實機驗收。
