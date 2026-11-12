import { writeFileSync } from "node:fs";
import assert from "node:assert/strict";
import { runSuite, runEdges, runAllPairs } from "./balance-suite.ts";
import { ENGINE_VERSION, TUNING, PACING } from "../src/physics.ts";
const calibration = runSuite(256, 1);
const validation = runSuite(1024, 20261112);
const edges = runEdges();
const allPairs = runAllPairs();
const report = {
  engineVersion: ENGINE_VERSION,
  method:
    "四類型等量對手、每對互換玩家側；平手計入出戰分母，另列0.5分制。校準與驗收使用不同種子。蓄力覆蓋遊戲可用0.65–1，三個落點與0–30度傾角。",
  tuning: TUNING,
  pacing: PACING,
  calibration,
  validation,
  edges,
  allPairs,
};
writeFileSync(
  new URL("../docs/balance-report.json", import.meta.url),
  JSON.stringify(report, null, 2) + "\n",
);
console.log(
  JSON.stringify(
    {
      engineVersion: ENGINE_VERSION,
      calibrationBattles: calibration.battles,
      validationBattles: validation.battles,
      edges,
      allPairs,
      types: validation.types,
      minSeconds: validation.minSeconds,
      maxSeconds: validation.maxSeconds,
      finishes: validation.finishes,
    },
    null,
    2,
  ),
);
for (const suite of [calibration, validation]) {
  for (const [type, result] of Object.entries(suite.types))
    assert.ok(
      result.winRate >= 40 && result.winRate <= 60,
      `${type}: ${result.winRate}%`,
    );
  assert.equal(suite.outsideTarget, 0, `有${suite.outsideTarget}場超出15–40秒`);
}
assert.equal(edges.outsideTarget, 0, "邊界輸入超出15–40秒");
assert.equal(allPairs.outsideTarget, 0, "全91×91配對超出15–40秒");
