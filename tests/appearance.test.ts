import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { BEYS } from "../src/catalog.ts";
import { PRODUCT_IMAGES } from "../src/appearance.ts";
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
