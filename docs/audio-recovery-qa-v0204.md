# v0.20.4 背景／鎖屏後音訊恢復

2026-11-14。集中修改Sound音訊生命週期及主畫面的背景事件；物理引擎5、能力值、計分、戰績與重播格式未變。

## 使用行為

- 切到背景或pagehide時立即關閉總輸出，保存目前配樂位置、取消未完成的曲目切換，停止並斷開所有已建立的配樂與短音效，包含交叉淡出中的舊配樂。持續轉動的振盪器歸零後重用。
- 返回前景或pageshow時保留靜音與遊戲暫停。按「繼續」、觸控放開或鍵盤操作會在使用者手勢內嘗試恢復；總輸出由零淡入250ms，配樂沿用原500ms淡入與保存進度，不補播中斷前的撞擊或終結聲。
- 系統將AudioContext停住時同樣清理舊聲源。恢復中即使回報running，仍重新排入suspend／resume，避免只看狀態而忽略停住的音訊時鐘。這些呼叫在同一手勢內同步發出，未加入固定等待後自動播放的計時器。
- 相近操作限制恢復請求頻率，未完成的Promise不會永久阻止後續手勢重試；過期回呼不能開啟背景音訊。背景期間下載失敗的過期請求不會永久封鎖該曲目。
- 靜音切換先取消既有總音量排程，避免恢復淡入蓋掉新靜音狀態。保留全域靜音、配樂音量與各聲部混音比例。

## 測試證據與範圍

新增音訊生命週期測試使用Chrome原生AudioContext、實際MP3解碼與AnalyserNode波形，以及原生聲源連接數。原版在原生suspend後仍保留battle播放狀態的案例先失敗，修正後通過。審查另找到淡入期間切靜音與假running凍結時鐘問題，兩項均先重現失敗再修正。

測試包含原生suspend、雙人遊戲背景暫停後以tap／Escape繼續、快速背景往返、靜音及音量偏好、過期恢復、未完成的resume重試、背景下載失敗重試、淡入期間靜音／取消靜音、原有音訊與混音演出回歸。

interrupted狀態、假running、延遲／未完成Promise及pagehide／pageshow以**明確故障注入**驗證容錯；不冒稱真的iPhone鎖屏、電話中斷或Safari原生音訊測試。停止的音訊時鐘可能讓AudioParam.value及分析器保留上一塊資料，因此恢復音訊時鐘後再量測靜音輸出，並檢查聲源已斷開。

Windows上的Playwright WebKit27.2沒有AudioContext，僅可驗證無音訊API時遊戲仍可操作、觸控與背景暫停恢復；實際聲音量測由Chrome完成。**尚未驗證iPhone實機Safari、硬體鎖屏、藍牙／耳機路由切換與主觀聆聽。** 瀏覽器若仍拒絕播放，保持靜音並在下次操作重試。

## 一手資料

- [W3C Web Audio：AudioContext resume／suspend與使用者啟用限制](https://www.w3.org/TR/webaudio/)
- [WebKit 276016：失焦後中斷與running但時鐘停住的回報](https://bugs.webkit.org/show_bug.cgi?id=276016)
- [WebKit 281566：背景恢復Promise可能不完成的回報](https://bugs.webkit.org/show_bug.cgi?id=281566)
- [Playwright WebKit與品牌Safari的差異](https://playwright.dev/docs/browsers#webkit)

這些WebKit回報提供測試情境，並非保證所有Safari版本已由本次修正解決；本次未更換音訊框架或修改瀏覽器政策。

本輪驗證：音訊生命週期／正式雙人／配樂與音效／重播混音20項、Chrome原生多觸點7項、WebKit觸控與背景恢復3項全部通過；核心89項與TypeScript／Vite正式建置通過。獨立審查提出的兩項音量／時鐘問題已重現修正；首次立即播放終結音效的既有回歸測試亦恢復通過。日誌與匿名公開端回執保留在忽略的artifacts；無音訊新增依賴，未重跑未更動的平衡模擬批次。

重現與驗證指令：`npm test`、`npx playwright test tests/e2e/audio-lifecycle.spec.ts tests/e2e/audio-game.spec.ts tests/e2e/audio.spec.ts`、`npx playwright test --config=playwright.webkit.config.ts`、`npm run build`；其他混音／觸控回歸使用既有對應spec。
