# CX 限定款旋向原廠證據複查（v0.19.1）

查核日期：2026-11-13（Asia/Taipei）。本筆記記錄官方來源研究；遊戲整合與發布驗收另見[驗收紀錄](spin-proof-qa-v0191.md)。

## 結論

下列五款都可由各自的**官方產品頁啟用 DOM → 官方 CSS → 實際 R 圖示**直接確認為右旋，證據分類均為 `direct-product`。不必使用同戰刃跨配色推論，也不必依賴產品名稱中的 S／B／R／G 字母。

| 產品 | 產品頁啟用的旋向圖示 class | 旋向 | 證據分類 |
|---|---|---|---|
| ワルキューレボルトS4-70V ガンメタVer. | `.atack` | R | `direct-product` |
| バックスアントラーズB2-60D メタルコート:オレンジ | `.defence` | R | `direct-product` |
| クラーケンリグルS3-70O メタルコート:ブルー | `.stamina` | R | `direct-product` |
| ホーネットフォートR7-60T メタルコート:イエロー | `.balance` | R | `direct-product` |
| ドレイクブレイブG4-70I メタルコート:ブルー | `.atack` | R | `direct-product` |

`official-same-blade-reference`：本次不需要使用。`still-inferred`：上述五款沒有剩餘項目。

## 證據鏈與方法

1. 以 HTTP 取得五個官方產品頁；它們均載入 `../css/pc.css`。
2. 以 HTML parser 移除**所有** `Comment` 節點，再選取 `.spec .icon`；下列產品旋向 class 全仍存在，並非註解中的舊模板。
3. 追查官方 [pc.css](https://beyblade.takaratomy.co.jp/beyblade-x/css/pc.css) 的 `dl.detail dd .spec .icon` 選擇器，取得真正的背景圖 URL。
4. 下載四張 `@2x` 圖（均 HTTP 200），以 `view_image` 逐張目視。每張圖右半都是圓箭頭內的 **R**，下方明寫 **ミギカイテン**（右旋）。左半分別是類型圖示，不影響右半旋向。

這裡的 R 是官方獨立旋向圖示；不是從商品名稱的字母拆解而來。HTML 節點內另有 `ミギカイテン` 註解，可作一致性對照，但判定主體是**刪除註解後仍啟用的節點及其可視背景圖**。

官方 [sp.css](https://beyblade.takaratomy.co.jp/beyblade-x/css/sp.css) 的產品列表也使用相同的 `@2x` 圖示資產；本次證據鏈採產品詳情的 `pc.css` selector。

## 四張已目視的官方旋向圖示

| DOM class | 官方 CSS 位置（本次下載檔行號） | 實際資產 | 目視結果 |
|---|---|---|---|
| `.atack` | `pc.css:2024–2032` | [icon_atack@2x.png](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/icon_atack@2x.png) | 左：アタック；右：R／ミギカイテン |
| `.balance` | `pc.css:2035–2043` | [icon_balance@2x.png](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/icon_balance@2x.png) | 左：バランス；右：R／ミギカイテン |
| `.stamina` | `pc.css:2046–2054` | [icon_stamina@2x.png](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/icon_stamina@2x.png) | 左：スタミナ；右：R／ミギカイテン |
| `.defence` | `pc.css:2057–2065` | [icon_defense@2x.png](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/icon_defense@2x.png) | 左：ディフェンス；右：R／ミギカイテン |

CSS 的 `.defence` 與檔名的 `defense` 拼字不同，以上均按原廠原文記錄。

CSS 實例（其他三類型只替換 class／圖檔名）：

```css
dl.detail dd .spec .icon .atack {
  width: 102px;
  height: 62px;
  background-image: url("../lineup/_image/icon_atack.png");
  background-image: image-set(url("../lineup/_image/icon_atack.png") 1x, url("../lineup/_image/icon_atack@2x.png") 2x);
  background-image: -webkit-image-set(url("../lineup/_image/icon_atack.png") 1x, url("../lineup/_image/icon_atack@2x.png") 2x);
  background-repeat: no-repeat;
  background-size: 100% auto;
}
```

## 逐款直接產品證據

### ワルキューレボルトS4-70V ガンメタVer.

- [本款官方產品頁](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/cx00-vv.html)，本次 HTML 第 1494–1497 行，製品の特徴區。
- 移除註解後的有效 DOM：`<div class="icon"><div class="b4_cx"></div><div class="atack"></div></div>`。
- `.atack` 經上述 CSS 對應至 [官方 R 圖示](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/icon_atack@2x.png)。
- 適用理由：class 直接存在於標示「ガンメタVer.」的該產品詳情，不涉及舊金色款與本款是否同結構的推論。結論：`R / direct-product`。

### バックスアントラーズB2-60D メタルコート:オレンジ

- [本款官方產品頁](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/cx00-ba.html)，本次 HTML 第 1497–1500 行，製品の特徴區。
- 移除註解後的有效 DOM：`<div class="icon"><div class="b4_cx"></div><div class="defence"></div></div>`。
- `.defence` 經上述 CSS 對應至 [官方 R 圖示](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/icon_defense@2x.png)。
- 適用理由：橘色限定款本身的官方頁直接啟用 R 圖示。結論：`R / direct-product`。

### クラーケンリグルS3-70O メタルコート:ブルー

- [本款官方產品頁](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/cx00-kw.html)，本次 HTML 第 1497–1500 行，製品の特徴區。
- 移除註解後的有效 DOM：`<div class="icon"><div class="b4_cx"></div><div class="stamina"></div></div>`。
- `.stamina` 經上述 CSS 對應至 [官方 R 圖示](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/icon_stamina@2x.png)。
- 適用理由：藍色限定款本身的官方頁直接啟用 R 圖示。結論：`R / direct-product`。

### ホーネットフォートR7-60T メタルコート:イエロー

- [本款官方產品頁](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/cx00-hf.html)，本次 HTML 第 1497–1500 行，製品の特徴區。
- 移除註解後的有效 DOM：`<div class="icon"><div class="b4_cx"></div><div class="balance"></div></div>`。
- `.balance` 經上述 CSS 對應至 [官方 R 圖示](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/icon_balance@2x.png)。
- 適用理由：黃色限定款本身的官方頁直接啟用 R 圖示。結論：`R / direct-product`；沒有把商品名中的 R 當旋向證據。

### ドレイクブレイブG4-70I メタルコート:ブルー

- [本款官方產品頁](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/cx00-drb.html)，本次 HTML 第 1501–1504 行，製品の特徴區。
- 移除註解後的有效 DOM：`<div class="icon"><div class="b4_cx"></div><div class="atack"></div></div>`。
- `.atack` 經上述 CSS 對應至 [官方 R 圖示](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/icon_atack@2x.png)。
- 適用理由：藍色限定款本身的官方頁直接啟用 R 圖示；沒有因名稱含ブレイブ就套用ドランブレイブ。結論：`R / direct-product`。

## 補充：ストームスプリガン2-70M 也有直接 R 證據

主代理追加查核的 [bx00-ss.html](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/bx00-ss.html)，本次 HTML 第 1506–1510 行，移除所有註解後仍是：

```html
<div class="icon">
  <div class="bx"></div>
  <div class="balance"></div>
</div>
```

這個產品專屬 `.balance` 節點同樣經 `pc.css:2035–2043` 使用 [icon_balance@2x.png](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/icon_balance@2x.png) 的 R／ミギカイテン圖示，因此可直接記為 `R / direct-product`，不必只依一般組裝說明書判定。

## 未採用的線索與查核限制

- 五頁 modal 的真實 `img src` 分別是 `_image/detail_BXG65.png`、`detail_BXG81.png`、`detail_BXG80.png`、`detail_BXG79.png`、`detail_BXH23.png`；全部於本次 HTTP 請求回傳 404，**沒有把這些圖片當作證據**。完整 URL 為 `https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/` 加上述檔名。
- 各產品頁的 `../manual/..._manual.pdf` 連結實際位於 HTML 註解，非啟用連結。BA／KW／HF／DRB 分別為 `BXG-81`／`BXG-80`／`BXG-79`／`BXH-23`，VV 註解也寫 `BXH-23`；四個 URL 皆回傳 404。沒有把 VV 的註解當成產品對應正確的 PDF。
- [官方產品站 manual 索引](https://beyblade.takaratomy.co.jp/beyblade-x/manual/) 沒有這五款的有效下載項；另一套 [客服說明書索引](https://www.takaratomy.co.jp/support/manual/beyblade/index.html) 有 DRB／BA／KW 專屬入口：[DRB](https://www.takaratomy.co.jp/support/manual/beyblade/2026072916090.html)、[BA](https://www.takaratomy.co.jp/support/manual/beyblade/2026072916089.html)、[KW](https://www.takaratomy.co.jp/support/manual/beyblade/2026072916088.html)。已確認這些入口有啟用的 JAN 專屬 PDF href，但本次不再下載、渲染這些替代 PDF，沒有宣稱已從其頁面讀出旋向。
- [官方 app 頁](https://beyblade.takaratomy.co.jp/beyblade-x/app/) 對應的產品宣傳圖已下載目視，只有名稱與產品照，沒有明確旋向圖示，未作為旋向證據。
- 本次確認的是原廠頁面針對各產品呈現的旋向規格，不是實物拆裝或發射測試，也沒有宣稱已驗證遊戲執行行為。

## 本機查核資料

HTML、CSS、已目視圖示保留於 ignored 的 `artifacts/spin-cx-research-v0191/`；`git check-ignore artifacts` 已確認該目錄被忽略。研究交付只新增本 Markdown。

後續重新整理來源時應重新取得 HTML 與 CSS；上列行號是 2026-11-13 下載版本的定位輔助，URL、DOM selector 與圖示內容才是證據鏈。
