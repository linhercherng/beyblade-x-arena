# 擴充8顆陀螺的實物圖與模型近似

核對日：2026-11-12（Asia/Taipei）。新增檔案一律為 public/model-references/new_*.png；保留來源原始bytes與SHA-256，不改動原83顆影像與metadata值。

## 參考範圍

- 8顆各有自己的官方俯視與斜視照片、72點輪廓及單獨的模型分級，沒有借用舊陀螺圖片或輪廓。
- 五款限定CX的俯視為 `_01`、斜視為未編號原圖。Storm兩款與Tiga的未編號原圖含發射器／替換件，因此side標記set；只有獨立俯視圖用來推輪廓。
- Tiga主組合使用紅晶片／藍Flow，不把附贈銀晶片或紅Flow當成主組合；Drake的G依官方說明為Gravity。
- Storm Pegasus的RA獨立圖顯示藍色軸身與齒輪、紅色實心平底膠頭；Storm Spriggan的M軸身酒紅、白色環狀接地膠及紫紅中央接觸部，兩者不能混用。
- 厚度、核心層高、肩部落差、軸肩寬及色碼均為照片分級近似；透明材質、金屬反射與陰影會影響估計，不是量測、掃描、CAD或官方色票。
- 限定款缺少獨立棘輪／軸心圖時保持null；配色只取斜視可見部分，不推論未見的下側結構。

## 重現與自檢

`node scripts/acquire-expansion-images.mjs` 只追加／更新此8個ID，對原83筆逐一deepEqual；來源圖快取只寫new_新檔。`--download`只下載，不改JSON。腳本驗證8張不同主圖、8個不同輪廓、8份單獨profile、俯／斜視皆存在、圖片可解碼與原圖hash。

## 逐顆來源

| 陀螺                 | 官方頁                                                                     | 俯視                                                                              | 斜視                                                                               | 棘輪                                                                              | 軸心                                                                              |
| -------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Valkyrie Volt Slash  | [來源](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/cx00-vv.html)   | [原圖](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/BXG65_01@1.png) | [斜視](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/BXG65@1.png)     | —                                                                                 | —                                                                                 |
| Bucks Antlers Bumper | [來源](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/cx00-ba.html)   | [原圖](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/BXG81_01@1.png) | [斜視](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/BXG81@1.png)     | —                                                                                 | —                                                                                 |
| Kraken Wriggle Slash | [來源](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/cx00-kw.html)   | [原圖](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/BXG80_01@1.png) | [斜視](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/BXG80@1.png)     | —                                                                                 | —                                                                                 |
| Hornet Fort Round    | [來源](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/cx00-hf.html)   | [原圖](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/BXG79_01@1.png) | [斜視](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/BXG79@1.png)     | —                                                                                 | —                                                                                 |
| Drake Brave Gravity  | [來源](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/cx00-drb.html)  | [原圖](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/BXH23_01@1.png) | [斜視](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/BXH23@1.png)     | —                                                                                 | —                                                                                 |
| Storm Pegasus        | [來源](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/bx00-sp.html)   | [原圖](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/BXG47_01@1.png) | [套裝斜視](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/BXG47@1.png) | [原圖](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/BXG47_03@1.png) | [原圖](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/BXG47_04@1.png) |
| Storm Spriggan       | [來源](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/bx00-ss.html)   | [原圖](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/BXG21_01@1.png) | [套裝斜視](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/BXG21@1.png) | [原圖](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/BXG21_02@1.png) | [原圖](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/BXG21_03@1.png) |
| Tiga Rage Flow Turn  | [來源](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/cx00-tiga.html) | [原圖](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/BXG70_01@1.png) | [套裝斜視](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/BXG70@1.png) | [原圖](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/BXG70_10@1.png) | [原圖](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/BXG70_11@1.png) |

## 逐顆模型觀察

- **Valkyrie Volt Slash**：三向後掠槍灰金屬肩與紅色尖角晶片座；側面可見紅色下層與較低的內凹中心。
- **Bucks Antlers Bumper**：橙色中央座、深藍分叉角狀上肩與橙紅塗裝大外刃；側面有明顯分層及藍色下圈。
- **Kraken Wriggle Slash**：三組圓弧藍色外肩、青色透明觸手紋上環與紫色三角晶片座；側面上環偏平、下層紫色。
- **Hornet Fort Round**：黃綠三向寬外弧，白色蜂巢狀內環與橙色幾何紋；側面有白色下圈與橙色軸心。
- **Drake Brave Gravity**：藍色金屬塗裝三個大後掠肩、黑色內層與紅色Gravity下緣；第三張官方圖提供獨立紅銀Gravity輔助刃。
- **Storm Pegasus**：大型透明青藍上盤、凸起六角中心與三段亮銀色圓弧外環；RA是藍身加紅色實心平底膠頭，非空心環。
- **Storm Spriggan**：紅色透明上層、兩個不對稱紅色大外肩與細銀色中環；M軸心深酒紅身、白色環狀接地膠及紫紅中央接觸部。
- **Tiga Rage Flow Turn**：紅色Tiga晶片座、藍色Flow上刃、銀色金屬外環及紅色Turn下環，整體多層且較高；主圖採紅晶片／藍Flow，不使用附贈銀晶片／紅Flow。
