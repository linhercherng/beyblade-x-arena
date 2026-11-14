# v0.20.3 Safari／iPhone雙人觸控相容性

2026-11-14。物理引擎5、個體數值、勝負運算、舊戰績與重播格式未變。

## 修正

- 具Touch Events能力的瀏覽器以每根手指的identifier獨立控制；不依賴Safari的pointer capture。Pointer Events仍服務滑鼠、筆與未提供Touch Events的裝置，避免兩條路徑重複執行。
- 雙方可同時調角度、選落點／方向、鎖定蓄力、交戰呼喊。取消僅清理對應觸點；同玩家另指不搶原滑桿。攔截已處理的實體click，保留鍵盤與程式啟動。
- 暫停、旋轉、寬度改變、失焦、pagehide及pageshow清除舊手勢；回來後重新碰觸即可操作。pagehide也暫停遊戲及聲音。工具列造成僅高度變更時，保留進行中的拖曳。
- 橫向對戰的主內容與工具列加入左右safe-area；沒有全域停用頁面縮放。
- 無Web Audio API時unlock安全返回，避免音訊能力不足讓選隊／開局按鈕拋錯。

## 驗證方法與界線

Windows Playwright WebKit27.2（revision2388）以390×1080觸控模式執行。此環境WebGL2正常，沒有AudioContext；新音訊降級測試先失敗、修正後通過。新TouchEvent雙滑桿案例也先失敗、修正後通過。

`tests/e2e/safari-touch.spec.ts`：兩項使用明確標示的**合成TouchEvent**驗證雙方同時拖曳、鎖定與呼喊、局部取消、工具列高度變更、橫直向切換、背景暫停恢復；另一項使用WebKit公開自動化提供的**原生單點tap**與鍵盤鎖定。WebKit公開協定無多觸點dispatch，不能把合成事件稱作Safari硬體多指驗收。

`tests/e2e/multitouch.spec.ts`：Chrome CDP `Input.dispatchTouchEvent`送入同時存在的不同ID觸點，覆蓋雙人鎖定／呼喊、滑桿、方向／落點、局部與全體取消、暫停、同玩家競爭及橫直向來回切換。另保留320／390／844橫向／1280／1440像素的左右配置測試。

執行：

```powershell
npm test
npx playwright install webkit
npx playwright test --config=playwright.webkit.config.ts
npx playwright test tests/e2e/multitouch.spec.ts tests/e2e/player-controls.spec.ts
npm run build
```

尚未驗證iPhone實機Safari、VoiceOver、真實瀏海安全區與Safari音訊恢復。Playwright的WebKit建置與品牌Safari不同，平台行為仍有差異。本次未重跑平衡模擬批次；物理與能力檔案未更動。

## 一手參考

- [Playwright WebKit與Safari差異](https://playwright.dev/docs/browsers#webkit)
- [W3C Touch Events：identifier與changedTouches](https://www.w3.org/TR/touch-events/)
- [W3C Pointer Events：取消與click語義](https://www.w3.org/TR/pointerevents/)
- [Safari13 Pointer Events支援](https://webkit.org/blog/9674/new-webkit-features-in-safari-13/)

本輪結果：WebKit專項3／3、Chrome多指及五尺寸配置12／12、完整賽事／舊重播／暫停／一鍵開局／降下／音訊回歸9／9，核心測試89／89。TypeScript與Vite正式建置通過；獨立唯讀程式審查未發現重要缺陷。截圖、日誌與公開端匿名驗證回執保留於忽略的artifacts，不含使用者戰績或憑證。
