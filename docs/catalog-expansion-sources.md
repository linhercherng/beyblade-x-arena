# 2026 新增八款目錄來源

查證日期：2026-11-12。資料檔為 `scripts/catalog-expansion.json`，本批只新增下列八組官方商品，未改寫原有 83 組的參數。

中文名稱均為遊戲用**參考譯名**，資料狀態沿用 `nameStatus: translated`；英文採遊戲既有命名格式，不宣稱是台灣代理商或全球版正式商品名。`released` 保存官方商品頁列出的日期；目前頁面仍使用「発売予定」，不代表本次已確認實際庫存或通路開賣。

## 逐款來源

| 穩定 ID | 官方日文商品名 | 遊戲英文名／參考譯名 | 列出日期與官方頁 |
| --- | --- | --- | --- |
| `cx-00-valkyrie-volt-slash` | ワルキューレボルトS4-70V ガンメタVer. | Valkyrie Volt Slash／雷霆女武神·斬擊 | 2026-11-05，[商品頁](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/cx00-vv.html) |
| `cx-00-bucks-antlers-bumper` | バックスアントラーズB2-60D メタルコート:オレンジ | Bucks Antlers Bumper／雄鹿巨角·緩衝 | 2026-07-09，[商品頁](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/cx00-ba.html) |
| `cx-00-kraken-wriggle-slash` | クラーケンリグルS3-70O メタルコート:ブルー | Kraken Wriggle Slash／海怪蠕動·斬擊 | 2026-07-09，[商品頁](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/cx00-kw.html) |
| `cx-00-hornet-fort-round` | ホーネットフォートR7-60T メタルコート:イエロー | Hornet Fort Round／黃蜂堡壘·圓環 | 2026-07-09，[商品頁](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/cx00-hf.html) |
| `cx-00-drake-brave-gravity` | ドレイクブレイブG4-70I メタルコート:ブルー | Drake Brave Gravity／龍獸勇擊·重力 | 2026-07-09，[商品頁](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/cx00-drb.html) |
| `bx-00-storm-pegasus` | ストームペガシス3-70RA | Storm Pegasus／暴風天馬 | 2026-07-11，[商品頁](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/bx00-sp.html) |
| `bx-00-storm-spriggan` | ストームスプリガン2-70M | Storm Spriggan／暴風巨神 | 2026-03-28，[商品頁](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/bx00-ss.html) |
| `cx-00-tiga-rage-flow-turn` | ティガレイジFT3-60T | Tiga Rage Flow Turn／迪卡狂怒·流線·翻轉 | 2026-09-12，[商品頁](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/cx00-tiga.html) |

以上日期、組合及金屬塗裝名稱均在各自商品頁直接列出。不能只依 `BX-00` 或 `CX-00` 商品代碼合併日期；同碼包含不同限定商品。

## CX 字母與零件拆分

字母是 blade 零件代碼，不是棘輪的一部分。例如 `S4-70V` 應拆成 Slash 輔助刃、`4-70` 棘輪、`V` 軸。

| 代碼 | 全名／日文 | 證據與適用 |
| --- | --- | --- |
| S | Slash／スラッシュ | [CX-01 官方詳解](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/detail_CX01.png) 的標準同碼輔助刃；套用到本批 Valkyrie Volt、Kraken Wriggle 的 S 組合。 |
| B | Bumper／バンパー | [CX-03 官方詳解](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/detail_CX03.png) 的標準同碼輔助刃；本批 Bucks Antlers 使用 B。 |
| R | Round／ラウンド | [CX-02 官方詳解](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/detail_CX02.png) 的標準同碼輔助刃；本批 Hornet Fort 使用 R。 |
| G | Gravity／グラビティ | [Drake Brave 商品頁](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/cx00-drb.html) 明示 G 的全名及含金屬結構。G 不是 Guard；官方另註明不能與 Eclipse 主刃組合。 |
| F、T | Flow／フロー；Turn／ターン | [Tiga Rage 官方詳解](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/detail_BXG70.png)：F 是外刃（over blade），T 是輔助刃。`FT3-60T` 最後一個 T 才是 Taper 軸。 |

Tiga 的金屬主刃為 Rage、鎖定晶片為 Tiga；附不同色零件，可重組 Multi／Sky／Power 三種配色。目錄以一個原廠組合表示，未把三種顏色當成不同性能的新陀螺。

## 新軸 RA 與沿用軸

[Storm Pegasus 官方詳解](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/detail_BXG47.png) 明示 RA 為 **Rubber Accel／ラバーアクセル**、攻擊型、右旋。軸先是橡膠平底；照片為藍色塑膠本體、紅色實心圓形接觸頭，不應只因材質橡膠就畫成空心環。官方說明未給齒數，`gearTeeth` 留 `null`。遊戲可沿用現有攻擊型參數；商品詳解數值不直接當成遊戲物理數值。

其他七款軸 V、D、O、T、I、M 沿用既有已查證軸的遊戲型別；本批的 `typeVerification` 會區分官方整體產品明示與遊戲按軸映射。Tiga 的官方產品文案直接稱平衡型。Bucks、Kraken、Hornet、Drake、Valkyrie 的戰鬥特徵取自商品說明，但遊戲型別不是本次從照片猜測。

Storm Spriggan 的商品頁標題、商品名稱及讀音皆為 **2-70M**；另已直接渲染查看[官方說明書](https://beyblade.takaratomy.co.jp/beyblade-x/manual/BXG-21_manual.pdf)第 1 頁，零件清單明列 `M（マージ）`，配圖為白色橡膠外圈與紫紅色中央接觸軸尖，因此保留 Merge 軸。獨立軸照片雖有近似 Unite 的輪廓，也不能據此改寫為 U。顏色差異應記錄在該商品外觀，而不改動全域 M 的參數。

Storm Pegasus 官方詳解英字為 `STORMPEGASIS`。遊戲採 `Storm Pegasus`，與既有 Pegasus Blast 拼寫一致，原日文及官方英字另存於資料中。

## 圖片來源及尚未直接確認的項目

官方 HTML 指定的白底 gallery 前綴：Valkyrie `BXG65`、Bucks `BXG81`、Kraken `BXG80`、Hornet `BXG79`、Drake `BXH23`、Storm Pegasus `BXG47`、Storm Spriggan `BXG21`、Tiga `BXG70`。圖片皆位於同站 `lineup/_image/`；HTML 中的候選連結仍須實際下載驗證，不能把註解殘留當成有效證據。

本次已直接看過 `detail_BXG47.png` 與 `detail_BXG70.png` 的零件文字及旋向圖示。前五款限定商品的候選詳解圖回應 404；Spriggan 的候選詳解圖雖回應 200，內容為 0 bytes，不能當作已讀的圖片。前五款白底 gallery 沒有旋向圖示，商品文字亦未直接列旋向；Spriggan 本次已取得的商品文字也未直接明示旋向。

初次核對時，這六款的 `spin: R` 以遊戲正規化推定保存，沒有冒稱官方明示。

**2026-11-13補充核對（v0.19.1）**：六個原廠商品頁均有啟用的產品圖示節點，經原廠CSS對應到明確標示 **R／ミギカイテン** 的背景圖。移除全部HTML註解後圖示節點仍存在；這是各商品本身的直接證據，不依賴同類零件推論。六款改標 `official-product-icon`，逐款 `spinProof` 保存商品頁、selector、CSS、圖示、雜湊及日期；Pegasus、Tiga仍沿用原本的 `official-detail-image`。詳見[逐款研究與來源](spin-cx-official-research-v0191.md)。四張原圖原樣保存在 `docs/evidence/spin-20261113/`。
