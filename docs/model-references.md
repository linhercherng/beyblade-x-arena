# 原廠組合、多角度與三段零件參考

核對日期：2026-11-12。83 顆均對應 Takara Tomy 官方商品 gallery 的指定原廠組合；套裝與隨機包已依晶片、主刃、顏色逐張比對。

共 245 筆圖片引用、245 張不同原圖；71 顆提供斜視，45 顆提供獨立棘輪，46 顆提供獨立軸心。未取得單品斜視或零件圖的欄位保留 null。

原圖以相同 bytes 保存在 public/model-references/，未裁切、去背、改色或重繪；SHA-256、來源頁與 imageSource 可逐張追溯。資料在 src/model-references.json，top 保留 ProductImage 全部欄位，另有 side、ratchetPhoto、bitPhoto、colors 與 confidence。

## 近似與未確認範圍

- official-combo 代表圖片已確認是此品號的該組合，不表示模型是原廠 CAD 或所有零件色碼均已確認。
- colors 是照片的可見表面估色；光線、陰影、透明材質、金屬反射會影響色碼。沒有可見依據的棘輪／軸心保留 null。bladeMetal 為有證據的塗裝估色；null 採一般銀色。
- bladePlastic 優先採中環飽和色，少數深色／白色零件經視覺修正，避開中央晶片圖樣的誤色。
- imageBounds 與 72 點 shape 以 Canvas 唯讀像素取得，仍可能含少量陰影；teeth 保留既有 metadata，並非重算成實際齒數。
- CX-09 Sol Eclipse 官方展示紅、藍雙面，本資料選藍面俯視與整顆斜視；不將另一面誤認為其他配色。
- 厚度、棘輪高度及零件咬合由即時模型近似；未做實物量測、3D 掃描或材料色票比對。

## 重現

執行 `node scripts/acquire-model-references.mjs` 會核對官方 gallery、快取下載、唯讀像素分析、驗證 83 個 ID 與有效輪廓，再只保留實際引用原圖。已有 manifest 時可用 `--analyze` 離線重產資料。需要專案開發依賴與 Chrome。

## 逐顆來源

| 陀螺 | 俯視原圖 | 斜視 | 棘輪 | 軸心 | 官方頁 |
| --- | --- | --- | --- | --- | --- |
| Dran Sword | [原圖](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/BX01_01@1.png) | 有 | 有 | 有 | [BX-01](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/bx01.html) |
| Hells Scythe | [原圖](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/BX02_01@1.png) | 有 | 有 | 有 | [BX-02](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/bx02.html) |
| Wizard Arrow | [原圖](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/BX03_01@1.png) | 有 | 有 | 有 | [BX-03](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/bx03.html) |
| Knight Shield | [原圖](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/BX04_01@1.png) | 有 | 有 | 有 | [BX-04](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/bx04.html) |
| Knight Lance | [原圖](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/BX13_01@1.png) | 有 | 有 | 有 | [BX-13](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/bx13.html) |
| Shark Edge | [原圖](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/BX14_01@1.png) | — | — | — | [BX-14](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/bx14.html) |
| Leon Claw | [原圖](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/BX15_01@1.png) | 有 | 有 | 有 | [BX-15](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/bx15.html) |
| Viper Tail | [原圖](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/BX16_02@1.png) | 有 | — | — | [BX-16](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/bx16.html) |
| Rhino Horn | [原圖](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/BX19_01@1.png) | 有 | 有 | 有 | [BX-19](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/bx19.html) |
| Dran Dagger | [原圖](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/BX20_b_01@1.png) | 有 | 有 | 有 | [BX-20](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/bx20.html) |
| Hells Chain | [原圖](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/BX21_p_01@1.png) | 有 | 有 | 有 | [BX-21](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/bx21.html) |
| Phoenix Wing | [原圖](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/BX23_01@1.png) | 有 | 有 | 有 | [BX-23](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/bx23.html) |
| Wyvern Gale | [原圖](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/BX24_01@1.png) | — | — | — | [BX-24](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/bx24.html) |
| Unicorn Sting | [原圖](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/BX26_01@1.png) | 有 | 有 | 有 | [BX-26](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/bx26.html) |
| Sphinx Cowl | [原圖](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/BX27_02@1.png) | 有 | — | — | [BX-27](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/bx27.html) |
| Tyranno Beat | [原圖](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/BX31_01@1.png) | — | — | — | [BX-31](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/bx31.html) |
| Weiss Tiger | [原圖](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/BX33_01@1.png) | 有 | 有 | 有 | [BX-33](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/bx33.html) |
| Cobalt Dragoon | [原圖](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/BX34_01@1.png) | 有 | 有 | 有 | [BX-34](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/bx34.html) |
| Black Shell | [原圖](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/BX35_02@1.png) | 有 | — | — | [BX-35](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/bx35.html) |
| Whale Wave | [原圖](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/BX36_02@1.png) | 有 | — | — | [BX-36](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/bx36.html) |
| Bear Scratch | [原圖](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/BX37_03@1.png) | 有 | — | — | [BX-37](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/bx37.html) |
| Crimson Garuda | [原圖](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/BX38_01@1.png) | 有 | 有 | 有 | [BX-38](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/bx38.html) |
| Shelter Drake | [原圖](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/BX39_02@1.png) | 有 | — | — | [BX-39](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/bx39.html) |
| Tricera Press | [原圖](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/BX44_01@1.png) | 有 | 有 | 有 | [BX-44](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/bx44.html) |
| Samurai Calibur | [原圖](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/BX45_01@1.png) | 有 | 有 | 有 | [BX-45](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/bx45.html) |
| Cobalt Drake | [原圖](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/BX46_03@1.png) | 有 | — | — | [BX-46](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/bx46.html) |
| Goat Tackle | [原圖](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/BX46_04@1.png) | 有 | — | — | [BX-46](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/bx46.html) |
| Mammoth Tusk | [原圖](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/BX48_02@1.png) | 有 | — | — | [BX-48](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/bx48.html) |
| Dran Strike | [原圖](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/BX49_01@1.png) | 有 | 有 | 有 | [BX-49](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/bx49.html) |
| Heavens Ring | [原圖](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/BX50_02@1.png) | 有 | — | — | [BX-50](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/bx50.html) |
| Luster Dragoon | [原圖](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/BX52_01@1.png) | 有 | 有 | 有 | [BX-52](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/bx52.html) |
| Sieg Superion | [原圖](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/BX54_01@1.png) | 有 | 有 | 有 | [BX-54](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/bx54.html) |
| Dran Buster | [原圖](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/UX01_01@1.png) | 有 | 有 | 有 | [UX-01](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/ux01.html) |
| Hells Hammer | [原圖](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/UX02_01@1.png) | 有 | 有 | 有 | [UX-02](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/ux02.html) |
| Wizard Rod | [原圖](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/UX03_01@1.png) | 有 | 有 | 有 | [UX-03](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/ux03.html) |
| Shinobi Shadow | [原圖](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/UX05_02@1.png) | 有 | — | — | [UX-05](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/ux05.html) |
| Leon Crest | [原圖](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/UX06_01@1.png) | 有 | 有 | 有 | [UX-06](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/ux06.html) |
| Phoenix Rudder | [原圖](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/UX07_r_01@1.png) | 有 | 有 | 有 | [UX-07](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/ux07.html) |
| Silver Wolf | [原圖](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/UX08_01@1.png) | 有 | 有 | 有 | [UX-08](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/ux08.html) |
| Samurai Saber | [原圖](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/UX09_01@1.png) | 有 | 有 | 有 | [UX-09](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/ux09.html) |
| Knight Mail | [原圖](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/UX10_02@1.png) | 有 | 有 | 有 | [UX-10](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/ux10.html) |
| Ptera Swing | [原圖](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/UX10_06@1.png) | — | — | — | [UX-10](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/ux10.html) |
| Impact Drake | [原圖](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/UX11_01@1.png) | 有 | 有 | 有 | [UX-11](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/ux11.html) |
| Ghost Circle | [原圖](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/UX12_02@1.png) | 有 | — | — | [UX-12](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/ux12.html) |
| Golem Rock | [原圖](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/UX13_01@1.png) | 有 | 有 | — | [UX-13](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/ux13.html) |
| Scorpio Spear | [原圖](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/UX14_01@1.png) | 有 | 有 | 有 | [UX-14](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/ux14.html) |
| Shark Scale | [原圖](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/UX15_02@1.png) | 有 | 有 | 有 | [UX-15](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/ux15.html) |
| Tyranno Roar | [原圖](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/UX15_07@1.png) | 有 | 有 | 有 | [UX-15](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/ux15.html) |
| Clock Mirage | [原圖](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/UX16_02@1.png) | 有 | — | — | [UX-16](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/ux16.html) |
| Meteor Dragoon | [原圖](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/UX17_01@1.png) | 有 | 有 | 有 | [UX-17](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/ux17.html) |
| Mummy Curse | [原圖](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/UX18_02@1.png) | 有 | — | — | [UX-18](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/ux18.html) |
| Bullet Griffon | [原圖](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/UX19_01@1.png) | 有 | — | — | [UX-19](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/ux19.html) |
| Glory Valkyrie | [原圖](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/UX20_01@1.png) | 有 | — | 有 | [UX-20](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/ux20.html) |
| Hells Nether | [原圖](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/UX21_02@1.png) | 有 | — | 有 | [UX-21](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/ux21.html) |
| Wyvern Hover | [原圖](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/UX21_09@1.png) | 有 | 有 | 有 | [UX-21](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/ux21.html) |
| Aero Pegasus | [原圖](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/BX53_04@1.png) | 有 | — | — | [BX-53](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/bx53.html) |
| Dran Brave Slash | [原圖](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/CX01_02@1.png) | 有 | 有 | 有 | [CX-01](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/cx01.html) |
| Wizard Arc Round | [原圖](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/CX02_02@1.png) | 有 | 有 | 有 | [CX-02](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/cx02.html) |
| Perseus Dark Bumper | [原圖](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/CX03_02@1.png) | 有 | 有 | 有 | [CX-03](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/cx03.html) |
| Hells Reaper Turn | [原圖](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/CX05_02@1.png) | 有 | — | — | [CX-05](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/cx05.html) |
| Rhino Reaper Charge | [原圖](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/CX05_03@1.png) | — | — | — | [CX-05](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/cx05.html) |
| Hells Arc Turn | [原圖](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/CX05_05@1.png) | — | — | — | [CX-05](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/cx05.html) |
| Fox Brush Jaggy | [原圖](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/CX06_02@1.png) | 有 | — | — | [CX-06](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/cx06.html) |
| Pegasus Blast Assault | [原圖](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/CX07_02@1.png) | 有 | — | — | [CX-07](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/cx07.html) |
| Cerberus Flame Wheel | [原圖](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/CX08_02@1.png) | 有 | — | — | [CX-08](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/cx08.html) |
| Whale Flame Massive | [原圖](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/CX08_03@1.png) | — | — | — | [CX-08](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/cx08.html) |
| Cerberus Dark Wheel | [原圖](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/CX08_04@1.png) | — | — | — | [CX-08](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/cx08.html) |
| Sol Eclipse Dual | [原圖](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/CX09_03@1.png) | 有 | 有 | 有 | [CX-09](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/cx09.html) |
| Wolf Hunt Free | [原圖](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/CX10_02@1.png) | 有 | 有 | 有 | [CX-10](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/cx10.html) |
| Emperor Might Heavy | [原圖](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/CX11_02@1.png) | 有 | — | — | [CX-11](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/cx11.html) |
| Phoenix Flare Zillion | [原圖](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/CX12_02@1.png) | 有 | 有 | 有 | [CX-12](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/cx12.html) |
| Bahamut Blitz Break Knuckle | [原圖](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/CX13_02@1.png) | 有 | 有 | 有 | [CX-13](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/cx13.html) |
| Knight Fortress Guard Vertical | [原圖](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/CX14_02@1.png) | 有 | 有 | 有 | [CX-14](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/cx14.html) |
| Ragna Rage Flow Erase | [原圖](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/CX15_02@1.png) | 有 | 有 | 有 | [CX-15](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/cx15.html) |
| Unicorn Delta Peak Odd | [原圖](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/CX17_02@1.png) | 有 | — | — | [CX-17](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/cx17.html) |
| Brachio Whip Outer Wheel | [原圖](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/CX18_02@1.png) | 有 | — | — | [CX-18](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/cx18.html) |
| Croco Tread Tough Quell | [原圖](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/CX19_02@1.png) | 有 | — | — | [CX-19](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/cx19.html) |
| Phoenix Force Weight Heavy | [原圖](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/CX20_02@1.png) | 有 | 有 | 有 | [CX-20](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/cx20.html) |
| Hells Brave Jaggy | [原圖](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/UX15_11@1.png) | 有 | 有 | 有 | [UX-15](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/ux15.html) |
| Pegasus Brush Massive | [原圖](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/UX18_04@1.png) | — | — | — | [UX-18](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/ux18.html) |
| Sol Brave Charge | [原圖](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/UX18_05@1.png) | — | — | — | [UX-18](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/ux18.html) |
| Wolf Flame Dual | [原圖](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/BX50_06@1.png) | — | — | — | [BX-50](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/bx50.html) |
| Cerberus Reaper Bumper | [原圖](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/BX50_07@1.png) | — | — | — | [BX-50](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/bx50.html) |
