# 古屍詛咒邊界勝率追查 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 增加獨立配對樣本，區分發射分布、對手組成與持續偏離，只對確認失衡者改值，驗收後發布。

**Architecture:** 重用現有物理引擎與 BalanceObservation，不改既有實驗種子或門檻。獨立腳本產出來源、逐場輸入／結果與分層統計；整合 balance:check 及 CI 證據。既有 checkout 乾淨且適用，沿用目前分支。

**Tech Stack:** TypeScript, Node test runner, Playwright, Vite, GitHub Actions, Sites.

## 預先固定實驗與判定（看新結果前）

- 目標 ux-18-mummy-curse；排除鏡像，對其他全部90款。
- 三批種子 0x52691db3、0xd04ba827、0x91e3c65d；每對手／情境8個種子，每個種子與輸入互換玩家側。實際種子集合需彼此及既有 model/allPairs 種子不重疊。
- 4組原觀測形式：雙方0.4、0.65對1、雙方1、獨立0.4–1；固定傾角／落點組在重複樣本中交換輸入角色，異力量組兩種優劣各半；呼喊沿用原觀測720／840 tick（6／7秒）並隨輸入角色交換。
- 12組等條件：雙方力量0.4／0.65／0.85／1 × 雙方傾角0／15／30度，落點與方向獨立抽取；同時呼喊。與原觀測分開統計，不合成一個無意義的總勝率。
- 每批兩個同種子對照池：現有v7能力、固定v5對手能力（目標仍v7），隔離上輪對手校準的影響。共138,240場；目標能力保持不變。
- 原始型號等量、四類各25%等權，並列四個單類對手、各類50%其餘各1/6的偏重組成；後者由同一條件結果重新加權，不當成新增對戰。
- 兩側合成一個配對樣本。對主分析的原始／四類等權列95% Hoeffding區間（以獨立種子為假設）；不把兩側視為獨立。結論限固定遊戲情境，不推論實物或所有玩家操作。
- 確認需三批現有對手池的等條件主分析，兩種權重區間都完全低於40%或高於60%，且三批同向。原觀測、單一發射條件／單類對手／偏重組成作解釋，不能單獨觸發調值。
- 若未確認，不修改任何陀螺數值／引擎／快照；若確認，先固定校準批、單變數測試、凍結v7能力與新引擎分流，另立未見結果的驗收批再發布。不可看完本三批又拿其中一批充當調值後的保留驗收。

## Task 1: 實驗工具與護欄

Files: scripts/mummy-boundary.ts, tests/mummy-boundary.test.ts.

- [x] 先寫測試：輸入角色平衡、配對計數、加權、種子交集拒絕、只有三批兩權重區間同向才確認；run node --experimental-strip-types --test tests/mummy-boundary.test.ts，缺模組而失敗。
- [x] 實作最小工具，使用真實引擎的小型四類對手試跑；同命令通過。逐場保存實際輸入／種子／側／結果／秒數，立即拒絕15–40秒以外。
- [x] 跑完整三批並保留開發證據；記錄結果與判斷，未符合確認標準，保留數值。

## Task 2: 整合與說明

Files: scripts/balance.ts, package.json, package-lock.json, src/diagnostics.ts, .github/workflows/balance.yml, README.md, docs/mummy-boundary-v0441.md.

- [x] 將新實驗加入 balance:check 與獨立 balance:mummy 指令；CI 保存 JSON、Markdown、逐場資料。報告未完成／失敗須明確，不能沿用舊通過報告。
- [x] 根據證據記錄逐條件與對手組成結果，更新版本0.44.1；不調值，沿用引擎7及所有既有重播。
- [ ] 核心測試、型別建置、代碼審查通過後提交；來源保持乾淨不變，執行 npm run verify:release 並同步 GitHub 四分片驗收。

## Task 3: 發布

- [ ] 核對來源SHA、原生／Linux驗收、類型40–60%與全場15–40秒、舊v1～v7重播。
- [ ] 使用相同SHA的正式建置保存 Sites 版本並部署，保留公開受眾。
- [ ] 匿名核對0.44.1、JS/CSS雜湊與公開站26項回歸；保存最終檢查點。無iPhone／實體耳機，明列實機未驗證，不宣稱通過。

核取方塊記錄提交前狀態；提交後完整驗收及發布的來源、結果與產物以artifacts/release-checkpoint-v0441.json和GitHub Actions同SHA產物為準，不能將開發試跑當正式發布通過。
