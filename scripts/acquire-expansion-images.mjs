import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { chromium } from "@playwright/test";
const root = new URL("../", import.meta.url);
const output = new URL("public/model-references/", root);
await mkdir(output, { recursive: true });
const base = "https://beyblade.takaratomy.co.jp/beyblade-x/lineup/";
async function obtain(url, binary = false) {
  let failure;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
      assert.ok(response.ok, `${response.status} ${url}`);
      if (binary) {
        assert.ok(
          response.headers.get("content-type")?.startsWith("image/"),
          `非圖片 ${url}`,
        );
        return Buffer.from(await response.arrayBuffer());
      }
      return await response.text();
    } catch (error) {
      failure = error;
    }
  }
  throw failure;
}
const additions = [
  {
    id: "cx-00-valkyrie-volt-slash",
    name: "Valkyrie Volt Slash",
    page: "cx00-vv",
    code: "BXG65",
  },
  {
    id: "cx-00-bucks-antlers-bumper",
    name: "Bucks Antlers Bumper",
    page: "cx00-ba",
    code: "BXG81",
  },
  {
    id: "cx-00-kraken-wriggle-slash",
    name: "Kraken Wriggle Slash",
    page: "cx00-kw",
    code: "BXG80",
  },
  {
    id: "cx-00-hornet-fort-round",
    name: "Hornet Fort Round",
    page: "cx00-hf",
    code: "BXG79",
  },
  {
    id: "cx-00-drake-brave-gravity",
    name: "Drake Brave Gravity",
    page: "cx00-drb",
    code: "BXH23",
  },
  {
    id: "bx-00-storm-pegasus",
    name: "Storm Pegasus",
    page: "bx00-sp",
    code: "BXG47",
  },
  {
    id: "bx-00-storm-spriggan",
    name: "Storm Spriggan",
    page: "bx00-ss",
    code: "BXG21",
  },
  {
    id: "cx-00-tiga-rage-flow-turn",
    name: "Tiga Rage Flow Turn",
    page: "cx00-tiga",
    code: "BXG70",
  },
];
const photos = {};
for (const item of additions) {
  const source = `${base}${item.page}.html`;
  const html = await obtain(source);
  const urls = [
    ...new Set(
      [...html.matchAll(/(?:src|href)="([^\"]+@1\.png)"/g)].map(
        (m) => new URL(m[1], source).href,
      ),
    ),
  ].filter(
    (url) =>
      new URL(url).origin === new URL(base).origin &&
      url.includes(`/_image/${item.code}`),
  );
  assert.ok(urls.length >= 2, `${item.id} 缺少官方 gallery`);
  const entries = await Promise.all(
    urls.map(async (url) => {
      const filename = "new_" + url.split("/").at(-1).replace("@1", "");
      const target = new URL(filename, output);
      let bytes;
      try {
        bytes = await readFile(target);
      } catch {
        bytes = await obtain(url, true);
        assert.ok(
          bytes.length > 1000 && bytes.subarray(1, 4).toString() === "PNG",
          `不是有效 PNG：${url}`,
        );
        await writeFile(target, bytes);
      }
      return {
        src: `/model-references/${filename}`,
        imageSource: url,
        sha256: createHash("sha256").update(bytes).digest("hex"),
      };
    }),
  );
  photos[item.id] = { source, entries };
  console.log(item.id, entries.map((e) => e.src.split("/").at(-1)).join(", "));
}
if (process.argv.includes("--download")) process.exit(0);
const selections = {
  "cx-00-valkyrie-volt-slash": {
    top: 1,
    side: 0,
    colors: {
      bladePlastic: "#c51e2c",
      bladeMetal: "#45464b",
      ratchet: "#ae1e22",
      bit: "#b72b22",
    },
    profile: [0.128, 0.171, 0.024, 0.034, 0.091, 0.087],
    features: ["cx-layered", "three-wing", "stepped-shoulder", "recessed-core"],
    observation:
      "三向後掠槍灰金屬肩與紅色尖角晶片座；側面可見紅色下層與較低的內凹中心。",
  },
  "cx-00-bucks-antlers-bumper": {
    top: 1,
    side: 0,
    colors: {
      bladePlastic: "#24207b",
      bladeMetal: "#ba3d10",
      ratchet: "#1d42a5",
      bit: "#12294b",
    },
    profile: [0.141, 0.184, 0.023, 0.042, 0.047, 0.086],
    features: ["cx-layered", "three-wing", "forked-antler", "stepped-shoulder"],
    observation:
      "橙色中央座、深藍分叉角狀上肩與橙紅塗裝大外刃；側面有明顯分層及藍色下圈。",
  },
  "cx-00-kraken-wriggle-slash": {
    top: 1,
    side: 0,
    colors: {
      bladePlastic: "#00c4d7",
      bladeMetal: "#1375aa",
      ratchet: "#49219a",
      bit: "#602194",
    },
    profile: [0.124, 0.196, 0.018, 0.026, 0.063, 0.084],
    features: ["cx-layered", "three-wing", "rounded-arms", "clear-core"],
    observation:
      "三組圓弧藍色外肩、青色透明觸手紋上環與紫色三角晶片座；側面上環偏平、下層紫色。",
  },
  "cx-00-hornet-fort-round": {
    top: 1,
    side: 0,
    colors: {
      bladePlastic: "#eee118",
      bladeMetal: "#d6c91a",
      ratchet: "#e8e2df",
      bit: "#f27c18",
    },
    profile: [0.137, 0.191, 0.019, 0.032, 0.046, 0.083],
    features: ["cx-layered", "three-wing", "honeycomb-ring", "round-guard"],
    observation:
      "黃綠三向寬外弧，白色蜂巢狀內環與橙色幾何紋；側面有白色下圈與橙色軸心。",
  },
  "cx-00-drake-brave-gravity": {
    top: 1,
    side: 0,
    colors: {
      bladePlastic: "#162c8c",
      bladeMetal: "#164a9c",
      ratchet: "#a52b2a",
      bit: "#242c83",
    },
    profile: [0.143, 0.166, 0.029, 0.041, 0.102, 0.088],
    features: [
      "cx-layered",
      "three-wing",
      "swept-edge",
      "heavy-lower-shoulder",
    ],
    observation:
      "藍色金屬塗裝三個大後掠肩、黑色內層與紅色Gravity下緣；第三張官方圖提供獨立紅銀Gravity輔助刃。",
  },
  "bx-00-storm-pegasus": {
    top: 1,
    side: 0,
    ratchet: 3,
    bit: 4,
    setSide: true,
    colors: {
      bladePlastic: "#0275bc",
      bladeMetal: null,
      ratchet: "#0863ab",
      bit: "#0065b6",
    },
    profile: [0.099, 0.213, 0.035, 0.023, 0.085, 0.087],
    features: ["x-over", "three-wing", "raised-core", "clear-plastic-disc"],
    observation:
      "大型透明青藍上盤、凸起六角中心與三段亮銀色圓弧外環；RA是藍身加紅色實心平底膠頭，非空心環。",
  },
  "bx-00-storm-spriggan": {
    top: 1,
    side: 0,
    ratchet: 2,
    bit: 3,
    setSide: true,
    colors: {
      bladePlastic: "#aa2523",
      bladeMetal: null,
      ratchet: "#4c101c",
      bit: "#6e3649",
    },
    profile: [0.107, 0.187, 0.029, 0.026, 0.077, 0.085],
    features: ["x-over", "two-wing", "offset-shoulder", "clear-core"],
    observation:
      "紅色透明上層、兩個不對稱紅色大外肩與細銀色中環；M軸心深酒紅身、白色環狀接地膠及紫紅中央接觸部。",
  },
  "cx-00-tiga-rage-flow-turn": {
    top: 1,
    side: 0,
    ratchet: 10,
    bit: 11,
    setSide: true,
    colors: {
      bladePlastic: "#253875",
      bladeMetal: null,
      ratchet: "#707774",
      bit: "#82837a",
    },
    profile: [0.148, 0.168, 0.03, 0.038, 0.083, 0.087],
    features: ["cx-layered", "expanded-blade", "two-wing", "stepped-shoulder"],
    observation:
      "紅色Tiga晶片座、藍色Flow上刃、銀色金屬外環及紅色Turn下環，整體多層且較高；主圖採紅晶片／藍Flow，不使用附贈銀晶片／紅Flow。",
  },
};
const browser = await chromium.launch({ channel: "chrome", headless: true });
const measured = new Map();
async function measure(entry) {
  if (measured.has(entry.src)) return measured.get(entry.src);
  const bytes = await readFile(new URL("public" + entry.src, root));
  const page = await browser.newPage();
  try {
    // 僅讀取原圖像素；不重繪、去背、改色或覆存任何來源圖片。
    const info = await page.evaluate(async (bytes) => {
      const image = new Image();
      image.src = "data:image/png;base64," + bytes;
      await image.decode();
      const w = image.naturalWidth,
        h = image.naturalHeight,
        canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      ctx.drawImage(image, 0, 0);
      const d = ctx.getImageData(0, 0, w, h).data;
      const transparent = d.some((v, i) => i % 4 === 3 && v < 250);
      const fg = (x, y) => {
        x = Math.floor(x);
        y = Math.floor(y);
        if (x < 0 || y < 0 || x >= w || y >= h) return false;
        const i = (y * w + x) * 4;
        if (transparent) return d[i + 3] > 150;
        const max = Math.max(d[i], d[i + 1], d[i + 2]),
          min = Math.min(d[i], d[i + 1], d[i + 2]);
        return max < 165 || (max - min > 22 && min < 215);
      };
      let x0 = w,
        y0 = h,
        x1 = 0,
        y1 = 0;
      for (let y = 0; y < h; y++)
        for (let x = 0; x < w; x++)
          if (fg(x, y)) {
            x0 = Math.min(x0, x);
            x1 = Math.max(x1, x);
            y0 = Math.min(y0, y);
            y1 = Math.max(y1, y);
          }
      const cx = (x0 + x1) / 2,
        cy = (y0 + y1) / 2,
        radius = Math.max(x1 - x0, y1 - y0) / 2;
      const radial = Array.from({ length: 72 }, (_, i) => {
        const a = (i / 72) * Math.PI * 2;
        for (let r = radius * 1.15; r > radius * 0.4; r--)
          if (fg(cx + Math.cos(a) * r, cy + Math.sin(a) * r)) return r / radius;
        return 0.65;
      });
      const maxR = Math.max(...radial);
      const color = (lo, hi, saturated = true) => {
        const bins = new Map();
        for (let y = y0; y <= y1; y++)
          for (let x = x0; x <= x1; x++) {
            if (!fg(x, y)) continue;
            const radiusAt = Math.hypot(x - cx, y - cy) / radius;
            if (radiusAt < lo || radiusAt > hi) continue;
            const i = (y * w + x) * 4,
              c = [d[i], d[i + 1], d[i + 2]],
              mx = Math.max(...c),
              mn = Math.min(...c);
            if (saturated && (mx - mn < 45 || mx < 65)) continue;
            const k = c.map((v) => Math.floor(v / 32) * 32 + 16).join(",");
            bins.set(k, (bins.get(k) || 0) + 1);
          }
        const key = [...bins].sort((a, b) => b[1] - a[1])[0]?.[0];
        return key
          ? "#" +
              key
                .split(",")
                .map((v) => Math.min(255, +v).toString(16).padStart(2, "0"))
                .join("")
          : null;
      };
      const shape = radial.map((v) => Math.round((v / maxR) * 1000) / 1000);
      const harmonics = Array.from({ length: 10 }, (_, i) => {
        const k = i + 3;
        return {
          k,
          strength: Math.hypot(
            shape.reduce(
              (n, r, j) => n + r * Math.cos((j / 72) * Math.PI * 2 * k),
              0,
            ),
            shape.reduce(
              (n, r, j) => n + r * Math.sin((j / 72) * Math.PI * 2 * k),
              0,
            ),
          ),
        };
      });
      return {
        width: w,
        height: h,
        transparent,
        imageBounds: [x0 / w, y0 / h, (x1 - x0 + 1) / w, (y1 - y0 + 1) / h].map(
          (v) => Math.round(v * 10000) / 10000,
        ),
        shape,
        primaryColor: color(0.2, 0.68) || color(0, 1, false) || "#64758a",
        secondaryColor: color(0.72, 1) || "#bbc4ce",
        partColor: color(0, 1) || color(0, 1, false),
        teeth: harmonics.sort((a, b) => b.strength - a.strength)[0].k,
      };
    }, bytes.toString("base64"));
    assert.ok(
      info.width >= 200 && info.height >= 200,
      `圖片解析度不足 ${entry.src}`,
    );
    assert.equal(info.shape.length, 72);
    assert.ok(info.shape.every((n) => Number.isFinite(n) && n > 0 && n <= 1));
    const result = { ...entry, ...info };
    measured.set(entry.src, result);
    return result;
  } finally {
    await page.close();
  }
}
const readJSON = async (path) =>
  JSON.parse(await readFile(new URL(path, root), "utf8"));
const productImages = await readJSON("src/product-images.json"),
  references = await readJSON("src/model-references.json"),
  profiles = await readJSON("src/model-profiles.json");
const newIDs = new Set(additions.map((item) => item.id));
const original = [productImages, references, profiles].map((data) =>
  Object.fromEntries(Object.entries(data).filter(([id]) => !newIDs.has(id))),
);
assert.equal(original[0] && Object.keys(original[0]).length, 83);
assert.equal(Object.keys(original[1]).length, 83);
assert.equal(Object.keys(original[2]).length, 83);
try {
  for (const item of additions) {
    const choice = selections[item.id],
      gallery = photos[item.id];
    const photo = async (index) => {
      if (index == null) return null;
      const name = `new_${item.code}${index === 0 ? "" : "_" + String(index).padStart(2, "0")}.png`;
      const entry = gallery.entries.find((e) => e.src.endsWith("/" + name));
      assert.ok(entry, `缺少已核對圖片 ${name}`);
      return measure(entry);
    };
    const topPhoto = await photo(choice.top),
      sidePhoto = await photo(choice.side),
      ratchetPhoto = await photo(choice.ratchet),
      bitPhoto = await photo(choice.bit);
    const top = {
      ...topPhoto,
      source: gallery.source,
      kind: "complete",
      label: `${item.name} 原廠組合實物參考圖`,
      note: "Takara Tomy 原廠組合俯視照片；輪廓和色碼為照片估計，非精密CAD。",
      view: "top",
      geometryApproximate: true,
    };
    const side = {
      ...sidePhoto,
      label: `${item.name} ${choice.setSide ? "原廠套裝斜視（含發射器／替換件）" : "原廠組合斜視"}`,
      kind: choice.setSide ? "set" : "complete",
      note: choice.setSide
        ? "原圖包含發射器或替換件；僅參照其中已核對的主組合，不使用整張斜視圖估計戰刃輪廓。"
        : "原廠組合斜視原圖，可見上下分層；厚度仍為近似。",
    };
    references[item.id] = {
      source: gallery.source,
      top,
      side,
      ratchetPhoto,
      bitPhoto,
      colors: choice.colors,
      confidence: "official-combo",
      note:
        choice.observation +
        " 俯視與斜視均已目視核對；色碼為照片估色，無法證明精確材料或尺寸。",
      gallery: gallery.entries,
    };
    productImages[item.id] = top;
    const [
      bladeThickness,
      coreRadius,
      coreRise,
      shoulderDrop,
      tipRadius,
      gearRadius,
    ] = choice.profile;
    profiles[item.id] = {
      bladeThickness,
      coreRadius,
      coreRise,
      shoulderDrop,
      tipRadius,
      gearRadius,
      features: choice.features,
      source: gallery.source,
      confidence: "photo-approximation",
      note:
        choice.observation +
        " 各數值以此顆官方俯視及斜視照片單獨分級，非實物量測、掃描或原廠CAD；未複製既有陀螺模型。",
    };
  }
} finally {
  await browser.close();
}
for (const [index, data] of [productImages, references, profiles].entries())
  for (const [id, value] of Object.entries(original[index]))
    assert.deepEqual(data[id], value, `不可修改既有資料 ${id}`);
assert.equal(
  new Set(additions.map((item) => productImages[item.id].sha256)).size,
  8,
);
assert.equal(
  new Set(additions.map((item) => JSON.stringify(productImages[item.id].shape)))
    .size,
  8,
);
assert.equal(
  new Set(additions.map((item) => JSON.stringify(profiles[item.id]))).size,
  8,
);
for (const item of additions) {
  const e = references[item.id];
  assert.ok(e.top && e.side);
  assert.ok(
    profiles[item.id].bladeThickness > profiles[item.id].shoulderDrop * 2,
  );
}
async function appendOwnedEntries(path, data) {
  const text = await readFile(new URL(path, root), "utf8");
  const first = text.indexOf(`  "${additions[0].id}":`);
  const prefix =
    first < 0
      ? text.trimEnd().slice(0, -1).trimEnd()
      : text.slice(0, first).trimEnd().replace(/,$/, "");
  const owned = Object.fromEntries(
    additions.map((item) => [item.id, data[item.id]]),
  );
  const body = JSON.stringify(owned, null, 2)
    .split("\n")
    .slice(1, -1)
    .join("\n");
  const updated = prefix + ",\n" + body + "\n}\n";
  assert.deepEqual(JSON.parse(updated), data, `追加資料不一致 ${path}`);
  await writeFile(new URL(path, root), updated);
}
await appendOwnedEntries("src/product-images.json", productImages);
await appendOwnedEntries("src/model-references.json", references);
await appendOwnedEntries("src/model-profiles.json", profiles);
const doc = [
  "# 擴充8顆陀螺的實物圖與模型近似",
  "",
  "核對日：2026-11-12（Asia/Taipei）。新增檔案一律為 public/model-references/new_*.png；保留來源原始bytes與SHA-256，不改動原83顆影像與metadata值。",
  "",
  "## 參考範圍",
  "",
  "- 8顆各有自己的官方俯視與斜視照片、72點輪廓及單獨的模型分級，沒有借用舊陀螺圖片或輪廓。",
  "- 五款限定CX的俯視為 `_01`、斜視為未編號原圖。Storm兩款與Tiga的未編號原圖含發射器／替換件，因此side標記set；只有獨立俯視圖用來推輪廓。",
  "- Tiga主組合使用紅晶片／藍Flow，不把附贈銀晶片或紅Flow當成主組合；Drake的G依官方說明為Gravity。",
  "- Storm Pegasus的RA獨立圖顯示藍色軸身與齒輪、紅色實心平底膠頭；Storm Spriggan的M軸身酒紅、白色環狀接地膠及紫紅中央接觸部，兩者不能混用。",
  "- 厚度、核心層高、肩部落差、軸肩寬及色碼均為照片分級近似；透明材質、金屬反射與陰影會影響估計，不是量測、掃描、CAD或官方色票。",
  "- 限定款缺少獨立棘輪／軸心圖時保持null；配色只取斜視可見部分，不推論未見的下側結構。",
  "",
  "## 重現與自檢",
  "",
  "`node scripts/acquire-expansion-images.mjs` 只追加／更新此8個ID，對原83筆逐一deepEqual；來源圖快取只寫new_新檔。`--download`只下載，不改JSON。腳本驗證8張不同主圖、8個不同輪廓、8份單獨profile、俯／斜視皆存在、圖片可解碼與原圖hash。",
  "",
  "## 逐顆來源",
  "",
  "| 陀螺 | 官方頁 | 俯視 | 斜視 | 棘輪 | 軸心 |",
  "| --- | --- | --- | --- | --- | --- |",
  ...additions.map((item) => {
    const e = references[item.id];
    return `| ${item.name} | [來源](${e.source}) | [原圖](${e.top.imageSource}) | [${e.side.kind === "set" ? "套裝斜視" : "斜視"}](${e.side.imageSource}) | ${e.ratchetPhoto ? `[原圖](${e.ratchetPhoto.imageSource})` : "—"} | ${e.bitPhoto ? `[原圖](${e.bitPhoto.imageSource})` : "—"} |`;
  }),
  "",
  "## 逐顆模型觀察",
  "",
  ...additions.map(
    (item) => `- **${item.name}**：${selections[item.id].observation}`,
  ),
  "",
];
await writeFile(
  new URL("docs/catalog-expansion-images.md", root),
  doc.join("\n"),
);
console.log(
  JSON.stringify({
    added: 8,
    products: Object.keys(productImages).length,
    references: Object.keys(references).length,
    profiles: Object.keys(profiles).length,
    originalEntriesPreserved: true,
  }),
);
