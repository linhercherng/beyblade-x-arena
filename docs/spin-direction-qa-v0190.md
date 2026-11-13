# v0.19.0 旋向定義與戰鬥標示

核對日期：2026-11-13。本輪只調整顯示與旋向型別，不改寫91顆的既有R／L值、能力值或物理規則。

## 原廠核對

從下列官方商品頁實際取得詳解圖並目視核對。L表示左迴旋，從上方看為逆時針；R表示右迴旋，從上方看為順時針。

| 遊戲型號 | 原廠證據 | 結論 |
| --- | --- | --- |
| BX-34 Cobalt Dragoon | [官方商品頁](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/bx34.html)、[詳解圖](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/detail_bx34.png) | L圖示與左回転文字 |
| BX-52 Luster Dragoon | [官方商品頁](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/bx52.html)、[詳解圖](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/detail_BX52.png) | L圖示與左回転文字 |
| UX-17 Meteor Dragoon | [官方商品頁](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/ux17.html)、[詳解圖](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/detail_UX17.png) | L圖示與左回転文字 |
| CX-09 Sol Eclipse Dual | [官方商品頁](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/cx09.html)、[詳解圖](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/detail_CX09.png) | R圖示；Dual與8模式為主刃、輔助刃、軸心模式，不是左右雙迴旋 |

目前圖鑑3顆左迴旋、88顆右迴旋。新增八款中仍有6款右旋只有相容規格推定，本輪沒有把它們冒稱官方確認；其逐款限制見[擴充來源](catalog-expansion-sources.md)。其他原有資料沿用保存的企劃／既有核對，本輪並未逐顆重查所有右迴旋商品。

## 定義與演出

- catalog的Bey與Blade旋向改用R／L限定型別；建表遇到其他值直接報錯，不再把未知值默認右旋。共享SPIN定義文字、完整環形箭頭與頂視方向描述。
- 對戰名牌、圖鑑卡牌及詳情共用同一旋向標籤。左迴旋藍色、右迴旋暖色，另有文字和↺／↻箭頭；推定資料直接顯示「推定」，詳情保留來源限制。名牌在準備、倒數、交戰、終結及重播沿用實際出場陀螺資料，不依玩家側猜旋向。
- 頂視投影重現舊版右旋模型前進20ms產生+0.104rad的逆時針角差。Three.js正Y角從上方看為逆時針，原本直接套物理圈數導致顯示相反；現只把顯示角反號，保持物理座標、移動、吸轉、勝負與保存圈數原樣。
- 開場、主畫面、勝者延續、出界及爆裂散件採同一顯示方向。爆裂的碗面高度同步依實際顯示角換算；不增加幾何、特效、音源或每幀DOM更新。
- 低速旋轉fixture改用真正的左迴旋BX-34，依各顆spin驅動，避免把右旋的UX-12當作左轉示意。

## 驗證與發布

- 新增1項核心及3項瀏覽器測試，舊版缺定義／名牌、旋向投影相反皆失敗；實作後3項瀏覽器先行通過。頂視檢查涵蓋交戰、開場、主畫面與左右勝者；另檢查桌機／手機比例HUD及推定標籤不溢出。
- 81項核心測試與TypeScript／Vite正式建置通過。原8,192場保留樣本仍通過類型40–60%勝率與15–40秒模擬時長；physics、match及storage沒有差異。保留既有大型JavaScript分塊提示。
- 旋向、低速旋轉、開場、終結、衝刺銜接、精彩重播與一鍵開局的22項本機Chrome專項全數通過（2.9分鐘）；另有91張圖鑑／模型預覽／手機卡牌的版面回歸通過（13.3秒），合計23項獨立案例。
- 低速旋轉取樣336幀，中位數16.7ms、p95 16.9ms、零停格、幾何UUID穩定；精彩重播取樣107幀，p95 16.9ms、取樣混音峰值0.1003，幾何UUID穩定。
- 唯讀程式碼審查未發現重要缺陷。依使用者要求同步公開GitHub儲存庫與Sites網站，實際提交／部署／存取設定記錄於忽略的artifacts/deployment-v0190.json。

未執行完整63項瀏覽器套件、62,340場完整平衡、實體手機或實物轉向拍攝比對；不把本機Chrome幀時間當成實機保證。
