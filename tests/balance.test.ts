import { test } from "node:test";
import assert from "node:assert/strict";
import { runSuite } from "../scripts/balance-suite.ts";
test("四種類型在對稱保留樣本各40–60%，所有對決15–40秒", () => {
  const report = runSuite(512, 900001);
  for (const [type, result] of Object.entries(report.types))
    assert.ok(
      result.winRate >= 40 && result.winRate <= 60,
      `${type}: ${result.winRate}%`,
    );
  assert.equal(
    report.outsideTarget,
    0,
    `${report.minSeconds}–${report.maxSeconds}s，${report.outsideTarget}場超界`,
  );
});
