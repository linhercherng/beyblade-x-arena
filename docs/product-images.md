# 陀螺實物圖片來源與外觀資料

擷取與核對日期：2026-11-12（Asia/Taipei）。83 顆陀螺對應 83 張不同圖片，未使用 AI 重繪或以共用底圖替代不同陀螺。

## 來源與顯示範圍

- 56 顆 BX／UX：取自企劃既有來源 [BeyGear 戰刃資料庫](https://beygear.app/parts/) 的獨立透明俯視圖。圖片表現實際戰刃輪廓與資料庫標準配色；不宣稱是此卡指定棘輪／軸心的整顆原廠組合實拍。
- 27 顆 CX：取自 [Takara Tomy 官方產品頁](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/) 各自的原廠組合俯視 gallery 圖；隨機包／套裝的各張單品已比對晶片圖樣、主刃及輔助刃，沒有拿同一張套裝照片冒充不同組合。
- 圖片原檔未裁切、去背、改色或重繪，保存在 public/beys/。來源連結、原圖 URL、SHA-256、實際尺寸與類型保存在 src/product-images.json。
- BeyGear 圖片多數長邊 256px、短邊 233–256px，Sieg Superion 為 202×192；官方原圖為 586×709。官方圖片含淺色背景與陰影，metadata transparent:false；BeyGear 56 張有 alpha，metadata transparent:true。

## 即時 3D 模型使用的外觀近似

`shape` 是從原圖可見外緣以 72 個角度讀取的正規化徑向半徑；`imageBounds` 是 [x,y,width,height] 的正規化前景範圍。`primaryColor`、`secondaryColor` 與 `teeth` 為像素分析得到的外觀近似，不是官方零件數據。

這些資料讓即時模型保留各顆的輪廓與主要配色，並可使用原圖作頂面參考貼圖。它們不是 3D 掃描或精確 CAD：不提供真實厚度、質量分布、氣動／摩擦性能；官方白底圖的輪廓推估也可能包含少量攝影陰影。所有項目均標示 geometryApproximate:true。

## 重新取得與自檢

```powershell
node scripts/acquire-product-images.mjs
```

需安裝專案開發依賴並有 Google Chrome；Chrome Canvas 僅用於唯讀像素分析。腳本自檢 83 個已知 ID、83 個不同 SHA-256、圖片 MIME／大小／可解碼性，以及 72 個有效半徑，不修改來源圖。

## 逐顆來源

| 陀螺                                 | 圖片範圍           | 來源頁                                                                       | 原圖                                                                             |
| ------------------------------------ | ------------------ | ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| BX-01 Dran Sword                     | 實際戰刃參考圖     | [BeyGear](https://beygear.app/parts/blade/dran-sword/)                       | [原圖](https://beygear.app/img/parts/blade/DrSw.webp)                            |
| BX-02 Hells Scythe                   | 實際戰刃參考圖     | [BeyGear](https://beygear.app/parts/blade/hells-scythe/)                     | [原圖](https://beygear.app/img/parts/blade/HlSc.webp)                            |
| BX-03 Wizard Arrow                   | 實際戰刃參考圖     | [BeyGear](https://beygear.app/parts/blade/wizard-arrow/)                     | [原圖](https://beygear.app/img/parts/blade/WzAr.webp)                            |
| BX-04 Knight Shield                  | 實際戰刃參考圖     | [BeyGear](https://beygear.app/parts/blade/knight-shield/)                    | [原圖](https://beygear.app/img/parts/blade/KnSh.webp)                            |
| BX-13 Knight Lance                   | 實際戰刃參考圖     | [BeyGear](https://beygear.app/parts/blade/knight-lance/)                     | [原圖](https://beygear.app/img/parts/blade/KnLn.webp)                            |
| BX-14 Shark Edge                     | 實際戰刃參考圖     | [BeyGear](https://beygear.app/parts/blade/shark-edge/)                       | [原圖](https://beygear.app/img/parts/blade/ShEd.webp)                            |
| BX-15 Leon Claw                      | 實際戰刃參考圖     | [BeyGear](https://beygear.app/parts/blade/leon-claw/)                        | [原圖](https://beygear.app/img/parts/blade/LnCl.webp)                            |
| BX-16 Viper Tail                     | 實際戰刃參考圖     | [BeyGear](https://beygear.app/parts/blade/viper-tail/)                       | [原圖](https://beygear.app/img/parts/blade/VpTl.webp)                            |
| BX-19 Rhino Horn                     | 實際戰刃參考圖     | [BeyGear](https://beygear.app/parts/blade/rhino-horn/)                       | [原圖](https://beygear.app/img/parts/blade/RhHr.webp)                            |
| BX-20 Dran Dagger                    | 實際戰刃參考圖     | [BeyGear](https://beygear.app/parts/blade/dran-dagger/)                      | [原圖](https://beygear.app/img/parts/blade/DrDg.webp)                            |
| BX-21 Hells Chain                    | 實際戰刃參考圖     | [BeyGear](https://beygear.app/parts/blade/hells-chain/)                      | [原圖](https://beygear.app/img/parts/blade/HlCh.webp)                            |
| BX-23 Phoenix Wing                   | 實際戰刃參考圖     | [BeyGear](https://beygear.app/parts/blade/phoenix-wing/)                     | [原圖](https://beygear.app/img/parts/blade/PhWn.webp)                            |
| BX-24 Wyvern Gale                    | 實際戰刃參考圖     | [BeyGear](https://beygear.app/parts/blade/wyvern-gale/)                      | [原圖](https://beygear.app/img/parts/blade/WyGl.webp)                            |
| BX-26 Unicorn Sting                  | 實際戰刃參考圖     | [BeyGear](https://beygear.app/parts/blade/unicorn-sting/)                    | [原圖](https://beygear.app/img/parts/blade/UnSt.webp)                            |
| BX-27 Sphinx Cowl                    | 實際戰刃參考圖     | [BeyGear](https://beygear.app/parts/blade/sphinx-cowl/)                      | [原圖](https://beygear.app/img/parts/blade/SpCw.webp)                            |
| BX-31 Tyranno Beat                   | 實際戰刃參考圖     | [BeyGear](https://beygear.app/parts/blade/tyranno-beat/)                     | [原圖](https://beygear.app/img/parts/blade/TyBt.webp)                            |
| BX-33 Weiss Tiger                    | 實際戰刃參考圖     | [BeyGear](https://beygear.app/parts/blade/weiss-tiger/)                      | [原圖](https://beygear.app/img/parts/blade/WsTg.webp)                            |
| BX-34 Cobalt Dragoon                 | 實際戰刃參考圖     | [BeyGear](https://beygear.app/parts/blade/cobalt-dragoon/)                   | [原圖](https://beygear.app/img/parts/blade/CbDg.webp)                            |
| BX-35 Black Shell                    | 實際戰刃參考圖     | [BeyGear](https://beygear.app/parts/blade/black-shell/)                      | [原圖](https://beygear.app/img/parts/blade/BlSh.webp)                            |
| BX-36 Whale Wave                     | 實際戰刃參考圖     | [BeyGear](https://beygear.app/parts/blade/whale-wave/)                       | [原圖](https://beygear.app/img/parts/blade/WhWv.webp)                            |
| BX-37 Bear Scratch                   | 實際戰刃參考圖     | [BeyGear](https://beygear.app/parts/blade/bear-scratch/)                     | [原圖](https://beygear.app/img/parts/blade/BrSc.webp)                            |
| BX-38 Crimson Garuda                 | 實際戰刃參考圖     | [BeyGear](https://beygear.app/parts/blade/crimson-garuda/)                   | [原圖](https://beygear.app/img/parts/blade/CrGr.webp)                            |
| BX-39 Shelter Drake                  | 實際戰刃參考圖     | [BeyGear](https://beygear.app/parts/blade/shelter-drake/)                    | [原圖](https://beygear.app/img/parts/blade/ShDr.webp)                            |
| BX-44 Tricera Press                  | 實際戰刃參考圖     | [BeyGear](https://beygear.app/parts/blade/tricera-press/)                    | [原圖](https://beygear.app/img/parts/blade/TrPr.webp)                            |
| BX-45 Samurai Calibur                | 實際戰刃參考圖     | [BeyGear](https://beygear.app/parts/blade/samurai-calibur/)                  | [原圖](https://beygear.app/img/parts/blade/SmCl.webp)                            |
| BX-46 Cobalt Drake                   | 實際戰刃參考圖     | [BeyGear](https://beygear.app/parts/blade/cobalt-drake/)                     | [原圖](https://beygear.app/img/parts/blade/CbDr.webp)                            |
| BX-46 Goat Tackle                    | 實際戰刃參考圖     | [BeyGear](https://beygear.app/parts/blade/goat-tackle/)                      | [原圖](https://beygear.app/img/parts/blade/GtTc.webp)                            |
| BX-48 Mammoth Tusk                   | 實際戰刃參考圖     | [BeyGear](https://beygear.app/parts/blade/mammoth-tusk/)                     | [原圖](https://beygear.app/img/parts/blade/MmTs.webp)                            |
| BX-49 Dran Strike                    | 實際戰刃參考圖     | [BeyGear](https://beygear.app/parts/blade/dran-strike/)                      | [原圖](https://beygear.app/img/parts/blade/DrSt.webp)                            |
| BX-50 Heavens Ring                   | 實際戰刃參考圖     | [BeyGear](https://beygear.app/parts/blade/heavens-ring/)                     | [原圖](https://beygear.app/img/parts/blade/HvRn.webp)                            |
| BX-52 Luster Dragoon                 | 實際戰刃參考圖     | [BeyGear](https://beygear.app/parts/blade/luster-dragoon/)                   | [原圖](https://beygear.app/img/parts/blade/LsDg.webp)                            |
| BX-54 Sieg Superion                  | 實際戰刃參考圖     | [BeyGear](https://beygear.app/parts/blade/sieg-superion/)                    | [原圖](https://beygear.app/img/parts/blade/SgSp.webp)                            |
| UX-01 Dran Buster                    | 實際戰刃參考圖     | [BeyGear](https://beygear.app/parts/blade/dran-buster/)                      | [原圖](https://beygear.app/img/parts/blade/DrBs.webp)                            |
| UX-02 Hells Hammer                   | 實際戰刃參考圖     | [BeyGear](https://beygear.app/parts/blade/hells-hammer/)                     | [原圖](https://beygear.app/img/parts/blade/HlHm.webp)                            |
| UX-03 Wizard Rod                     | 實際戰刃參考圖     | [BeyGear](https://beygear.app/parts/blade/wizard-rod/)                       | [原圖](https://beygear.app/img/parts/blade/WzRd.webp)                            |
| UX-05 Shinobi Shadow                 | 實際戰刃參考圖     | [BeyGear](https://beygear.app/parts/blade/shinobi-shadow/)                   | [原圖](https://beygear.app/img/parts/blade/ShSh.webp)                            |
| UX-06 Leon Crest                     | 實際戰刃參考圖     | [BeyGear](https://beygear.app/parts/blade/leon-crest/)                       | [原圖](https://beygear.app/img/parts/blade/LnCr.webp)                            |
| UX-07 Phoenix Rudder                 | 實際戰刃參考圖     | [BeyGear](https://beygear.app/parts/blade/phoenix-rudder/)                   | [原圖](https://beygear.app/img/parts/blade/PhRd.webp)                            |
| UX-08 Silver Wolf                    | 實際戰刃參考圖     | [BeyGear](https://beygear.app/parts/blade/silver-wolf/)                      | [原圖](https://beygear.app/img/parts/blade/SlWl.webp)                            |
| UX-09 Samurai Saber                  | 實際戰刃參考圖     | [BeyGear](https://beygear.app/parts/blade/samurai-saber/)                    | [原圖](https://beygear.app/img/parts/blade/SmSb.webp)                            |
| UX-10 Knight Mail                    | 實際戰刃參考圖     | [BeyGear](https://beygear.app/parts/blade/knight-mail/)                      | [原圖](https://beygear.app/img/parts/blade/KnMl.webp)                            |
| UX-10 Ptera Swing                    | 實際戰刃參考圖     | [BeyGear](https://beygear.app/parts/blade/ptera-swing/)                      | [原圖](https://beygear.app/img/parts/blade/PtSw.webp)                            |
| UX-11 Impact Drake                   | 實際戰刃參考圖     | [BeyGear](https://beygear.app/parts/blade/impact-drake/)                     | [原圖](https://beygear.app/img/parts/blade/ImDr.webp)                            |
| UX-12 Ghost Circle                   | 實際戰刃參考圖     | [BeyGear](https://beygear.app/parts/blade/ghost-circle/)                     | [原圖](https://beygear.app/img/parts/blade/GhCr.webp)                            |
| UX-13 Golem Rock                     | 實際戰刃參考圖     | [BeyGear](https://beygear.app/parts/blade/golem-rock/)                       | [原圖](https://beygear.app/img/parts/blade/GlRc.webp)                            |
| UX-14 Scorpio Spear                  | 實際戰刃參考圖     | [BeyGear](https://beygear.app/parts/blade/scorpio-spear/)                    | [原圖](https://beygear.app/img/parts/blade/ScSp.webp)                            |
| UX-15 Shark Scale                    | 實際戰刃參考圖     | [BeyGear](https://beygear.app/parts/blade/shark-scale/)                      | [原圖](https://beygear.app/img/parts/blade/ShSc.webp)                            |
| UX-15 Tyranno Roar                   | 實際戰刃參考圖     | [BeyGear](https://beygear.app/parts/blade/tyranno-roar/)                     | [原圖](https://beygear.app/img/parts/blade/TyRr.webp)                            |
| UX-16 Clock Mirage                   | 實際戰刃參考圖     | [BeyGear](https://beygear.app/parts/blade/clock-mirage/)                     | [原圖](https://beygear.app/img/parts/blade/ClMr.webp)                            |
| UX-17 Meteor Dragoon                 | 實際戰刃參考圖     | [BeyGear](https://beygear.app/parts/blade/meteor-dragoon/)                   | [原圖](https://beygear.app/img/parts/blade/MtDg.webp)                            |
| UX-18 Mummy Curse                    | 實際戰刃參考圖     | [BeyGear](https://beygear.app/parts/blade/mummy-curse/)                      | [原圖](https://beygear.app/img/parts/blade/MmCr.webp)                            |
| UX-19 Bullet Griffon                 | 實際戰刃參考圖     | [BeyGear](https://beygear.app/parts/blade/bullet-griffon/)                   | [原圖](https://beygear.app/img/parts/blade/BlGr.webp)                            |
| UX-20 Glory Valkyrie                 | 實際戰刃參考圖     | [BeyGear](https://beygear.app/parts/blade/glory-valkyrie/)                   | [原圖](https://beygear.app/img/parts/blade/GlVl.webp)                            |
| UX-21 Hells Nether                   | 實際戰刃參考圖     | [BeyGear](https://beygear.app/parts/blade/hells-nether/)                     | [原圖](https://beygear.app/img/parts/blade/HlNt.webp)                            |
| UX-21 Wyvern Hover                   | 實際戰刃參考圖     | [BeyGear](https://beygear.app/parts/blade/wyvern-hover/)                     | [原圖](https://beygear.app/img/parts/blade/WyHv.webp)                            |
| BX-53 Aero Pegasus                   | 實際戰刃參考圖     | [BeyGear](https://beygear.app/parts/blade/aero-pegasus/)                     | [原圖](https://beygear.app/img/parts/blade/ArPg.webp)                            |
| CX-01 Dran Brave Slash               | 官方原廠組合俯視圖 | [Takara Tomy](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/cx01.html) | [原圖](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/CX01_02@1.png) |
| CX-02 Wizard Arc Round               | 官方原廠組合俯視圖 | [Takara Tomy](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/cx02.html) | [原圖](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/CX02_02@1.png) |
| CX-03 Perseus Dark Bumper            | 官方原廠組合俯視圖 | [Takara Tomy](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/cx03.html) | [原圖](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/CX03_02@1.png) |
| CX-05 Hells Reaper Turn              | 官方原廠組合俯視圖 | [Takara Tomy](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/cx05.html) | [原圖](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/CX05_02@1.png) |
| CX-05 Rhino Reaper Charge            | 官方原廠組合俯視圖 | [Takara Tomy](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/cx05.html) | [原圖](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/CX05_03@1.png) |
| CX-05 Hells Arc Turn                 | 官方原廠組合俯視圖 | [Takara Tomy](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/cx05.html) | [原圖](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/CX05_05@1.png) |
| CX-06 Fox Brush Jaggy                | 官方原廠組合俯視圖 | [Takara Tomy](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/cx06.html) | [原圖](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/CX06_02@1.png) |
| CX-07 Pegasus Blast Assault          | 官方原廠組合俯視圖 | [Takara Tomy](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/cx07.html) | [原圖](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/CX07_02@1.png) |
| CX-08 Cerberus Flame Wheel           | 官方原廠組合俯視圖 | [Takara Tomy](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/cx08.html) | [原圖](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/CX08_02@1.png) |
| CX-08 Whale Flame Massive            | 官方原廠組合俯視圖 | [Takara Tomy](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/cx08.html) | [原圖](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/CX08_03@1.png) |
| CX-08 Cerberus Dark Wheel            | 官方原廠組合俯視圖 | [Takara Tomy](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/cx08.html) | [原圖](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/CX08_04@1.png) |
| CX-09 Sol Eclipse Dual               | 官方原廠組合俯視圖 | [Takara Tomy](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/cx09.html) | [原圖](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/CX09_02@1.png) |
| CX-10 Wolf Hunt Free                 | 官方原廠組合俯視圖 | [Takara Tomy](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/cx10.html) | [原圖](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/CX10_02@1.png) |
| CX-11 Emperor Might Heavy            | 官方原廠組合俯視圖 | [Takara Tomy](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/cx11.html) | [原圖](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/CX11_02@1.png) |
| CX-12 Phoenix Flare Zillion          | 官方原廠組合俯視圖 | [Takara Tomy](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/cx12.html) | [原圖](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/CX12_02@1.png) |
| CX-13 Bahamut Blitz Break Knuckle    | 官方原廠組合俯視圖 | [Takara Tomy](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/cx13.html) | [原圖](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/CX13_02@1.png) |
| CX-14 Knight Fortress Guard Vertical | 官方原廠組合俯視圖 | [Takara Tomy](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/cx14.html) | [原圖](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/CX14_02@1.png) |
| CX-15 Ragna Rage Flow Erase          | 官方原廠組合俯視圖 | [Takara Tomy](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/cx15.html) | [原圖](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/CX15_02@1.png) |
| CX-17 Unicorn Delta Peak Odd         | 官方原廠組合俯視圖 | [Takara Tomy](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/cx17.html) | [原圖](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/CX17_02@1.png) |
| CX-18 Brachio Whip Outer Wheel       | 官方原廠組合俯視圖 | [Takara Tomy](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/cx18.html) | [原圖](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/CX18_02@1.png) |
| CX-19 Croco Tread Tough Quell        | 官方原廠組合俯視圖 | [Takara Tomy](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/cx19.html) | [原圖](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/CX19_02@1.png) |
| CX-20 Phoenix Force Weight Heavy     | 官方原廠組合俯視圖 | [Takara Tomy](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/cx20.html) | [原圖](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/CX20_02@1.png) |
| UX-15 Hells Brave Jaggy              | 官方原廠組合俯視圖 | [Takara Tomy](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/ux15.html) | [原圖](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/UX15_11@1.png) |
| UX-18 Pegasus Brush Massive          | 官方原廠組合俯視圖 | [Takara Tomy](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/ux18.html) | [原圖](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/UX18_04@1.png) |
| UX-18 Sol Brave Charge               | 官方原廠組合俯視圖 | [Takara Tomy](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/ux18.html) | [原圖](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/UX18_05@1.png) |
| BX-50 Wolf Flame Dual                | 官方原廠組合俯視圖 | [Takara Tomy](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/bx50.html) | [原圖](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/BX50_06@1.png) |
| BX-50 Cerberus Reaper Bumper         | 官方原廠組合俯視圖 | [Takara Tomy](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/bx50.html) | [原圖](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/BX50_07@1.png) |
