import { expect, test } from "bun:test";
import { spawnSync } from "node:child_process";

// Skips if act not installed
function hasAct(): boolean {
  return spawnSync("act", ["--version"], { stdio: "ignore" }).status === 0;
}

test("composite action runs under act", () => {
  if (!hasAct()) {
    console.log("[skip] act CLI not installed – skipping integration test");
    return;
  }
  const res = spawnSync("bash", ["scripts/act-test.sh"], { stdio: "inherit" });
  expect(res.status).toBe(0);
}); 