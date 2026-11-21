# 已發售 V2 改版資料 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 核對2026-11-21原廠清單，只更新已發售款式，補齊兩筆V2改版資料並發布。

**Architecture:** 目前91個可對戰原廠組合已涵蓋11/21的BX-54、CX-20主打。新增獨立的改版參考資料，連到既有蒼龍神劍／惡魔紅鐮卡牌；V2沒有獨立遊戲能力，不混入隊伍／隨機池。Hells Scythe V2僅為套裝刃片，不自行配棘輪與軸心。使用者明確排除未發售款，12/26新品不進入遊戲資料。

**Tech Stack:** TypeScript, Vite, Node tests, Playwright, Sites.

1. [x] 以f2641c0來源輸出91款ID／順序／能力／旋向／零件快照；新增測試先驗證缺少改版資料而失敗。
2. [x] 補兩筆原廠來源、日期、中文名稱、原始實物照片與SHA-256；保留詳解原圖作證據。僅蒼龍神劍V2有官方完整3-60F組合，惡魔紅鐮V2的combo為null。
3. [x] 圖鑑卡牌及詳細視窗顯示改版資料，圖鑑可用V2／2.0及BX-00／CX-20搜尋；選隊不把V2關鍵字匹配為原版。明示3D／對戰仍為原版。沿用現有版面與鍵盤關閉／焦點行為。
4. [ ] 核心測試與建置、新圖鑑桌機／手機回歸、舊v1～v7重播與公開完整單雙人流程驗證。UI資料以外的91款／物理／舊快照不變；既有CI仍跑全部瀏覽器與377,748場平衡。
5. [ ] 檢查數字與原廠來源，獨立審查後提交；保持來源乾淨，同步GitHub，CI全過後用同SHA建置部署公開站並核對版本／資產／圖鑑與重播。

核取方塊為提交前狀態，最終正式證據以同SHA的GitHub Actions及artifacts/release-checkpoint-v0442.json為準。

提交前208核心與建置通過；初版原生10項（3尺寸圖鑑＋7版重播）通過，補正商品代碼與own-property查詢後3尺寸再驗亦通過。獨立唯讀審查無阻擋問題。
