# v0.20.5 耳機路由／來電中斷恢復

2026-11-14。沿用v0.20.4聲源追蹤、過期回呼保護、配樂位置保存與250ms總音量淡入；物理引擎、能力值、計分與舊戰績格式未變。

## 行為

- 以能力偵測監聽MediaDevices devicechange、AudioContext sinkchange，以及可用時的navigator.audioSession statechange。中斷時停止、斷開舊聲源並讓對戰暫停；連續事件在同一恢復階段只通知一次。
- AudioSession仍為interrupted時，不建立或恢復聲音；返回active不會自行開聲。按「繼續」後才使用原有手勢內的受控恢復。沒有設定AudioSession.type，也沒有要求麥克風權限、列舉裝置或改選輸出裝置。
- 音訊裝置切換若沒有事件、仍回報running但currentTime停住超過1秒，利用既有畫面迴圈偵測並清理。只在預期有配樂、短音效或交戰聲音且未靜音時檢查，不另開輪詢計時器。
- 「♫ 配樂」新增「恢復音訊」：遇到沒有裝置通知或聲音未恢復時可手動重新連接現有音訊圖。保留音量及靜音偏好、清除舊聲源，不把音量提高作為修復手段；不會自行解除遊戲暫停。

## 驗證與界線

`audio-route.spec.ts`先重現裝置事件、AudioSession中斷與無事件凍結時鐘三案例失敗，修正後通過。量測使用Chrome原生AudioContext、實際MP3解碼、AnalyserNode波形及已連接聲源數；裝置／sink事件、AudioSession和假running狀態均是**故障注入**，不冒稱真實藍牙、拔插耳機或電話通話。

專項涵蓋：連續裝置通知、來電期間恢復阻擋、通話結束等待手勢、靜音與低音量偏好、重複手動恢復、過期resume完成、凍結時鐘，以及正式雙人遊戲中暫停／繼續與手機恢復按鈕。既有背景／鎖屏恢復、撞擊／衝刺／終結／精彩重播混音與多指操作也保留回歸。

瀏覽器不保證對每次耳機切換都通知，也無法由音訊時鐘判斷所有硬體無聲情況，因此保留手動恢復。網頁不控制iPhone系統音量或耳機本身的音量；測試確認的是應用程式音量與聲源，不是耳機的實際聲壓。

**尚未驗證iPhone實機Safari、真實藍牙切換、耳機拔插、來電與主觀聆聽。** WebKit自動化僅驗證操作及降級相容性，不能替代Safari音訊硬體驗收。

## 一手參考

- [W3C Audio Session工作草案：state與中斷](https://www.w3.org/TR/audio-session/)
- [W3C Audio Output Devices：裝置變更與輸出限制](https://www.w3.org/TR/audio-output/)
- [W3C Web Audio：音訊時鐘與狀態](https://www.w3.org/TR/webaudio/)
- [Playwright WebKit與Safari差異](https://playwright.dev/docs/browsers#webkit)

本輪結果：音訊路由／來電／背景恢復／正式雙人流程20項、既有撞擊／衝刺／終結／重播混音7項、WebKit操作3項、Chrome原生多觸點7項均通過；核心89項及TypeScript／Vite正式建置通過。獨立審查找到的純音效停鐘缺漏已先重現再修正。390px手機音訊面板截圖與界線檢查通過。日誌及匿名公開端回執留於忽略的artifacts，未新增依賴或重跑未更動的平衡批次。

主要指令：`npm test`、`npx playwright test tests/e2e/audio-route.spec.ts tests/e2e/audio-game.spec.ts tests/e2e/audio-lifecycle.spec.ts tests/e2e/audio.spec.ts`、`npx playwright test --config=playwright.webkit.config.ts`、`npm run build`；其他音效與觸控回歸使用既有spec。
