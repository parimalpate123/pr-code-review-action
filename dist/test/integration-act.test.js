"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const bun_test_1 = require("bun:test");
const node_child_process_1 = require("node:child_process");
// Skips if act not installed
function hasAct() {
    return (0, node_child_process_1.spawnSync)("act", ["--version"], { stdio: "ignore" }).status === 0;
}
(0, bun_test_1.test)("composite action runs under act", () => {
    if (!hasAct()) {
        console.log("[skip] act CLI not installed – skipping integration test");
        return;
    }
    const res = (0, node_child_process_1.spawnSync)("bash", ["scripts/act-test.sh"], { stdio: "inherit" });
    (0, bun_test_1.expect)(res.status).toBe(0);
});
