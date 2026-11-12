import { test } from "node:test";
import assert from "node:assert/strict";
import { BEYS, filterBeys } from "../src/catalog.ts";
import names from "../src/chinese-names.json" with { type: "json" };

test("83顆均有繁體中文名稱及命名來源，中文或英文搜尋都能定位", () => {
  for (const b of BEYS) {
    assert.match(b.zhName, /[\u3400-\u9fff]/u, b.id);
    const entry = names[b.id as keyof typeof names];
    assert.equal(b.zhName, entry.name);
    assert.ok(["official-tw", "translated"].includes(entry.status));
    assert.ok(entry.source?.startsWith("https://"));
    assert.ok(filterBeys(b.zhName).some((r) => r.id === b.id));
    assert.ok(filterBeys(b.name).some((r) => r.id === b.id));
  }
});
