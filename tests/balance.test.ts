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
  assert.ok(report.finishes.spin / report.battles <= .5, `停轉占比 ${report.finishes.spin / report.battles}`);
  for (const [finish, minimum] of [["burst", .1], ["over", .1], ["extreme", .05]] as const)
    assert.ok(report.finishes[finish] / report.battles >= minimum, `${finish}: ${report.finishes[finish] / report.battles}`);
  const {attack, defense, stamina, balance} = report.types;
  assert.ok(attack.dashes > balance.dashes && balance.dashes > Math.max(defense.dashes,stamina.dashes));
  assert.ok(attack.winFinishes.burst > attack.winFinishes.spin);
  assert.ok(stamina.winFinishes.spin > stamina.wins / 2);
  assert.ok(defense.winFinishes.over + defense.winFinishes.extreme > defense.winFinishes.burst);
  assert.ok(Object.values(balance.winFinishes).every(n=>n>0));
});
