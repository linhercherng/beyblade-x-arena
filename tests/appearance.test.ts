import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { BEYS } from "../src/catalog.ts";
import { PRODUCT_IMAGES } from "../src/appearance.ts";
import { MODEL_REFERENCES } from "../src/bey-model.ts";
test("83顆各有獨立實物原圖、來源、輪廓，檔案雜湊相符", () => {
  const hashes = new Set<string>(),
    outlines = new Set<string>();
  for (const bey of BEYS) {
    const p = PRODUCT_IMAGES[bey.id];
    assert.ok(p, bey.id);
    assert.ok(/^\/beys\/[a-z0-9-]+\.(png|webp)$/.test(p.src));
    assert.ok(
      ["beygear.app", "beyblade.takaratomy.co.jp"].includes(
        new URL(p.source).hostname,
      ),
    );
    const file = readFileSync(new URL("../public" + p.src, import.meta.url));
    assert.equal(
      createHash("sha256").update(file).digest("hex"),
      p.sha256,
      bey.id,
    );
    assert.equal(p.shape.length, 72);
    assert.ok(p.shape.every((n) => n > 0 && n <= 1));
    assert.ok(p.imageBounds.every((n) => n >= 0 && n <= 1));
    assert.ok(p.width >= 160 && p.height >= 160);
    hashes.add(p.sha256);
    outlines.add(JSON.stringify(p.shape));
  }
  assert.equal(hashes.size, 83);
  assert.equal(outlines.size, 83);
});

test("原廠組合各角度原圖可追溯，未遺漏卡牌、色碼或輪廓", () => {
  for (const bey of BEYS) {
    const ref = MODEL_REFERENCES[bey.id];
    assert.equal(ref.confidence, "official-combo", bey.id);
    assert.equal(new URL(ref.source).hostname, "beyblade.takaratomy.co.jp");
    assert.ok(
      ref.top.label && ref.top.teeth > 0 && ref.top.secondaryColor,
      bey.id,
    );
    assert.equal(ref.top.shape.length, 72);
    for (const color of Object.values(ref.colors))
      assert.ok(color === null || /^#[a-f\d]{6}$/i.test(color), bey.id);
    for (const photo of [ref.top, ref.side, ref.ratchetPhoto, ref.bitPhoto]) {
      if (!photo) continue;
      assert.match(photo.src, /^\/model-references\/[a-z\d_]+\.png$/i);
      assert.equal(
        new URL(photo.imageSource).hostname,
        "beyblade.takaratomy.co.jp",
      );
      const bytes = readFileSync(
        new URL("../public" + photo.src, import.meta.url),
      );
      assert.equal(
        createHash("sha256").update(bytes).digest("hex"),
        (photo as { sha256: string }).sha256,
        bey.id,
      );
    }
  }
});
