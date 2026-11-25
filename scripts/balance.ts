import { mkdirSync, writeFileSync } from "node:fs";
import {assertBalance} from "./balance-gates.ts";
import { runSuite, runEdges, runAllPairs } from "./balance-suite.ts";
import { ENGINE_VERSION, TUNING, PACING, COMBAT_STYLE } from "../src/physics.ts";
import{BalanceObservation,observationMarkdown}from'./balance-observation.ts';
import{runModelInvestigation}from'./model-balance-investigation.ts';
import{runMummyInvestigation,assertBoundaryRelease}from'./mummy-boundary.ts';
import{runV2Balance}from'./v2-balance.ts';
const calibration = runSuite(256, 1);
const validation = runSuite(1024, 20261112);
const edges = runEdges();
const observation=new BalanceObservation();
const allPairs = runAllPairs((s,profile)=>observation.record(s,profile));
const report = {
  engineVersion: ENGINE_VERSION,
  method:
    "四類型等量對手、每對互換玩家側；平手計入出戰分母，另列0.5分制。校準與驗收使用不同種子。蓄力覆蓋遊戲可用0.65–1，三個落點、0–30度傾角、三種內外切方向。",
  tuning: TUNING,
  pacing: PACING,
  combatStyles: COMBAT_STYLE,
  calibration,
  validation,
  edges,
  allPairs,
};
const output=new URL(process.argv.includes("--check")?"../artifacts/balance-check.json":"../docs/balance-report.json",import.meta.url);
mkdirSync(new URL("./",output),{recursive:true});
mkdirSync(new URL('../artifacts/',import.meta.url),{recursive:true});
const observed=observation.report();
writeFileSync(new URL('../artifacts/balance-observation.json',import.meta.url),JSON.stringify({engineVersion:ENGINE_VERSION,...observed},null,2)+'\n');
writeFileSync(new URL('../artifacts/balance-observation.md',import.meta.url),observationMarkdown(observed));
writeFileSync(
  output,
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
assertBalance(report);
runV2Balance();
runModelInvestigation();
assertBoundaryRelease(runMummyInvestigation());
