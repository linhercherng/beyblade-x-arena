import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { chromium } from "@playwright/test";

const root = new URL("../", import.meta.url);
const rows = JSON.parse(
  await readFile(new URL("src/catalog-data.json", root), "utf8"),
);
const destination = new URL("public/beys/", root);
await mkdir(destination, { recursive: true });
let previous = {};
try {
  previous = JSON.parse(
    await readFile(new URL("src/product-images.json", root), "utf8"),
  );
} catch {
  /* 首次擷取 */
}
const index = await (await fetch("https://beygear.app/parts/")).text();
const bladeImages = new Map(
  [...index.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)]
    .map((m) => m[1])
    .filter((s) => s.includes("/parts/blade/"))
    .map((s) => {
      const href = s.match(/href="(\/parts\/blade\/[^\"]+)/)?.[1];
      const image = s.match(/src="([^\"]+)/)?.[1];
      return [href?.split("/").filter(Boolean).at(-1), { href, image }];
    }),
);

// 官方套裝與隨機包的俯視 gallery，已逐張比對晶片圖樣、主刃與輔助刃。
const officialGallery = {
  "cx-05-rhino-reaper-charge": "CX05_03@1.png",
  "cx-05-hells-arc-turn": "CX05_05@1.png",
  "cx-08-whale-flame-massive": "CX08_03@1.png",
  "cx-08-cerberus-dark-wheel": "CX08_04@1.png",
  "ux-15-hells-brave-jaggy": "UX15_11@1.png",
  "ux-18-pegasus-brush-massive": "UX18_04@1.png",
  "ux-18-sol-brave-charge": "UX18_05@1.png",
  "bx-50-wolf-flame-dual": "BX50_06@1.png",
  "bx-50-cerberus-reaper-bumper": "BX50_07@1.png",
};
const metadata = {};
let next = 0;
await Promise.all(
  Array.from({ length: 5 }, async () => {
    while (next < rows.length) {
      const row = rows[next++];
      let image, source, kind, note;
      if (row.line === "CX") {
        const name =
          officialGallery[row.id] ?? `${row.code.replace("-", "")}_02@1.png`;
        image = `https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/${name}`;
        source = `https://beyblade.takaratomy.co.jp/beyblade-x/lineup/${row.code.replace("-", "").toLowerCase()}.html`;
        kind = "complete";
        note = "Takara Tomy 原廠組合產品俯視圖；照片與實品可能略有差異。";
      } else {
        const match = bladeImages.get(row.blade);
        assert.ok(match?.image, `缺少戰刃圖片：${row.id}`);
        image = new URL(match.image, "https://beygear.app").href;
        source = new URL(match.href, "https://beygear.app").href;
        kind = "blade";
        note =
          "BeyGear 戰刃資料庫參考圖；顯示戰刃外觀，不代表指定棘輪／軸心或原廠組合配色。";
      }
      const ext = image.endsWith(".webp") ? "webp" : "png";
      const file = new URL(`${row.id}.${ext}`, destination);
      let buffer;
      try {
        if (previous[row.id] && previous[row.id].imageSource !== image)
          throw new Error("圖片來源已變更，重新下載");
        buffer = await readFile(file);
      } catch {
        let error;
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            const response = await fetch(image, {
              signal: AbortSignal.timeout(30000),
            });
            assert.ok(
              response.ok &&
                response.headers.get("content-type")?.startsWith("image/"),
              `${response.status} ${image}`,
            );
            buffer = Buffer.from(await response.arrayBuffer());
            assert.ok(buffer.length > 1000, `圖片過小：${image}`);
            await writeFile(file, buffer);
            break;
          } catch (e) {
            error = e;
          }
        }
        if (!buffer) throw error;
      }
      metadata[row.id] = {
        src: `/beys/${row.id}.${ext}`,
        source,
        imageSource: image,
        kind,
        label: `${row.name} ${kind === "blade" ? "實際戰刃參考圖" : "原廠組合產品圖"}`,
        note,
        view: "top",
        geometryApproximate: true,
        sha256: createHash("sha256").update(buffer).digest("hex"),
      };
    }
  }),
);
assert.equal(Object.keys(metadata).length, 83);
assert.equal(
  new Set(Object.values(metadata).map((v) => v.sha256)).size,
  83,
  "每顆陀螺必須對應不同的產品圖",
);

// 只讀取原圖像素以估計輪廓／配色，不重繪或改存來源圖片。
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const page = await browser.newPage();
  for (const row of rows) {
    const entry = metadata[row.id];
    const buffer = await readFile(new URL(`public${entry.src}`, root));
    const pixels = await page.evaluate(
      async ({ bytes, type }) => {
        const image = new Image();
        image.src = `data:${type};base64,${bytes}`;
        await image.decode();
        const canvas = document.createElement("canvas");
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        ctx.drawImage(image, 0, 0);
        const { width: w, height: h } = canvas;
        const data = ctx.getImageData(0, 0, w, h).data;
        const transparent = data.some((v, i) => i % 4 === 3 && v < 250);
        const foreground = (x, y) => {
          if (x < 0 || y < 0 || x >= w || y >= h) return false;
          const p = (Math.floor(y) * w + Math.floor(x)) * 4;
          if (transparent) return data[p + 3] > 150;
          const max = Math.max(data[p], data[p + 1], data[p + 2]),
            min = Math.min(data[p], data[p + 1], data[p + 2]);
          return max < 165 || (max - min > 22 && min < 215);
        };
        let x0 = w,
          y0 = h,
          x1 = 0,
          y1 = 0;
        const colors = new Map();
        for (let y = 0; y < h; y++)
          for (let x = 0; x < w; x++)
            if (foreground(x, y)) {
              x0 = Math.min(x0, x);
              x1 = Math.max(x1, x);
              y0 = Math.min(y0, y);
              y1 = Math.max(y1, y);
              const p = (y * w + x) * 4,
                r = data[p],
                g = data[p + 1],
                b = data[p + 2];
              if (
                Math.max(r, g, b) - Math.min(r, g, b) > 45 &&
                Math.max(r, g, b) > 65
              ) {
                const key = [r, g, b]
                  .map((v) => Math.floor(v / 32) * 32 + 16)
                  .join(",");
                colors.set(key, (colors.get(key) ?? 0) + 1);
              }
            }
        const cx = (x0 + x1) / 2,
          cy = (y0 + y1) / 2,
          radius = Math.max(x1 - x0, y1 - y0) / 2;
        const shape = Array.from({ length: 72 }, (_, i) => {
          const angle = (i / 72) * Math.PI * 2;
          for (let r = radius * 1.15; r > radius * 0.4; r--)
            if (foreground(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r))
              return r / radius;
          return 0.65;
        });
        const maximum = Math.max(...shape),
          normalized = shape.map(
            (r) => Math.round((r / maximum) * 1000) / 1000,
          );
        const sorted = [...colors]
          .sort((a, b) => b[1] - a[1])
          .map(([key]) => key.split(",").map(Number));
        const first = sorted[0] ?? [70, 130, 180],
          second = sorted.find(
            (c) => Math.hypot(...c.map((v, i) => v - first[i])) > 110,
          ) ?? [190, 200, 210];
        const hex = (c) =>
          "#" +
          c.map((v) => Math.min(255, v).toString(16).padStart(2, "0")).join("");
        const harmonics = Array.from({ length: 10 }, (_, i) => {
          const k = i + 3;
          const re = normalized.reduce(
            (n, r, j) => n + r * Math.cos((j / 72) * Math.PI * 2 * k),
            0,
          );
          const im = normalized.reduce(
            (n, r, j) => n + r * Math.sin((j / 72) * Math.PI * 2 * k),
            0,
          );
          return { k, strength: Math.hypot(re, im) };
        });
        const peaks = harmonics.sort((a, b) => b.strength - a.strength)[0].k;
        return {
          width: w,
          height: h,
          transparent,
          imageBounds: [
            x0 / w,
            y0 / h,
            (x1 - x0 + 1) / w,
            (y1 - y0 + 1) / h,
          ].map((v) => Math.round(v * 10000) / 10000),
          shape: normalized,
          primaryColor: hex(first),
          secondaryColor: hex(second),
          teeth: Math.max(3, Math.min(16, peaks)),
        };
      },
      {
        bytes: buffer.toString("base64"),
        type: entry.src.endsWith(".webp") ? "image/webp" : "image/png",
      },
    );
    assert.ok(
      pixels.width >= 160 && pixels.height >= 160,
      `解析度不足：${row.id}`,
    );
    assert.ok(pixels.shape.every((r) => Number.isFinite(r) && r > 0 && r <= 1));
    Object.assign(entry, pixels);
  }
} finally {
  await browser.close();
}
const ordered = Object.fromEntries(
  rows.map((row) => [row.id, metadata[row.id]]),
);
await writeFile(
  new URL("src/product-images.json", root),
  JSON.stringify(ordered, null, 2) + "\n",
);
const doc = [
  "# 陀螺實物圖片來源與外觀資料",
  "",
  "擷取與核對日期：2026-11-12（Asia/Taipei）。83 顆陀螺對應 83 張不同圖片，未使用 AI 重繪或以共用底圖替代不同陀螺。",
  "",
  "## 來源與顯示範圍",
  "",
  "- 56 顆 BX／UX：取自企劃既有來源 [BeyGear 戰刃資料庫](https://beygear.app/parts/) 的獨立透明俯視圖。圖片表現實際戰刃輪廓與資料庫標準配色；不宣稱是此卡指定棘輪／軸心的整顆原廠組合實拍。",
  "- 27 顆 CX：取自 [Takara Tomy 官方產品頁](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/) 各自的原廠組合俯視 gallery 圖；隨機包／套裝的各張單品已比對晶片圖樣、主刃及輔助刃，沒有拿同一張套裝照片冒充不同組合。",
  "- 圖片原檔未裁切、去背、改色或重繪，保存在 public/beys/。來源連結、原圖 URL、SHA-256、實際尺寸與類型保存在 src/product-images.json。",
  "- BeyGear 圖片多數長邊 256px、短邊 233–256px，Sieg Superion 為 202×192；官方原圖為 586×709。官方圖片含淺色背景與陰影，metadata transparent:false；BeyGear 56 張有 alpha，metadata transparent:true。",
  "",
  "## 即時 3D 模型使用的外觀近似",
  "",
  "`shape` 是從原圖可見外緣以 72 個角度讀取的正規化徑向半徑；`imageBounds` 是 [x,y,width,height] 的正規化前景範圍。`primaryColor`、`secondaryColor` 與 `teeth` 為像素分析得到的外觀近似，不是官方零件數據。",
  "",
  "這些資料讓即時模型保留各顆的輪廓與主要配色，並可使用原圖作頂面參考貼圖。它們不是 3D 掃描或精確 CAD：不提供真實厚度、質量分布、氣動／摩擦性能；官方白底圖的輪廓推估也可能包含少量攝影陰影。所有項目均標示 geometryApproximate:true。",
  "",
  "## 重新取得與自檢",
  "",
  "```powershell",
  "node scripts/acquire-product-images.mjs",
  "```",
  "",
  "需安裝專案開發依賴並有 Google Chrome；Chrome Canvas 僅用於唯讀像素分析。腳本自檢 83 個已知 ID、83 個不同 SHA-256、圖片 MIME／大小／可解碼性，以及 72 個有效半徑，不修改來源圖。",
  "",
  "## 逐顆來源",
  "",
  "| 陀螺 | 圖片範圍 | 來源頁 | 原圖 |",
  "| --- | --- | --- | --- |",
  ...rows.map((row) => {
    const e = ordered[row.id];
    return `| ${row.code} ${row.name} | ${e.kind === "blade" ? "實際戰刃參考圖" : "官方原廠組合俯視圖"} | [${e.kind === "blade" ? "BeyGear" : "Takara Tomy"}](${e.source}) | [原圖](${e.imageSource}) |`;
  }),
  "",
];
await writeFile(new URL("docs/product-images.md", root), doc.join("\n"));
console.log(
  JSON.stringify({
    images: rows.length,
    unique: new Set(Object.values(metadata).map((e) => e.sha256)).size,
    transparent: Object.values(metadata).filter((e) => e.transparent).length,
    officialComplete: Object.values(metadata).filter(
      (e) => e.kind === "complete",
    ).length,
  }),
);
