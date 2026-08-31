const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

let raw = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => { raw += chunk; });
process.stdin.on("end", () => {
  try {
    const input = JSON.parse(raw || "{}");
    const rateLimits = input.rate_limits || {};
    const payload = {
      updatedAt: Date.now(),
      fiveHour: normalize(rateLimits.five_hour),
      sevenDay: normalize(rateLimits.seven_day)
    };

    const dir = path.join(os.homedir(), ".harness-deck");
    const file = path.join(dir, "claude-usage.json");
    const tmp = `${file}.tmp`;
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(tmp, JSON.stringify(payload));
    fs.renameSync(tmp, file);

    const model = input.model && (input.model.display_name || input.model.id) || "Claude";
    const segments = [
      format("5h", payload.fiveHour),
      format("7d", payload.sevenDay)
    ].filter(Boolean);
    process.stdout.write(segments.length ? `[${model}] | ${segments.join(" ")}` : `[${model}]`);
  } catch {
    process.stdout.write("Claude");
  }
});

function normalize(value) {
  if (!value || typeof value.used_percentage !== "number") return undefined;
  return {
    usedPercent: Math.max(0, Math.min(100, value.used_percentage)),
    resetsAt: typeof value.resets_at === "number" ? value.resets_at : undefined
  };
}

function format(label, value) {
  return value ? `${label}: ${Math.round(value.usedPercent)}%` : "";
}
