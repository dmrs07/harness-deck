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
    const freshFiveHour = normalize(rateLimits.five_hour);
    const freshSevenDay = normalize(rateLimits.seven_day);

    const dir = path.join(os.homedir(), ".harness-deck");
    const file = path.join(dir, "claude-usage.json");
    fs.mkdirSync(dir, { recursive: true });

    const previous = readPrevious(file);
    const now = Date.now();
    const fiveHour = freshFiveHour ? { ...freshFiveHour, updatedAt: now } : previous.fiveHour;
    const sevenDay = freshSevenDay ? { ...freshSevenDay, updatedAt: now } : previous.sevenDay;

    if (freshFiveHour || freshSevenDay) {
      const payload = {
        updatedAt: now,
        fiveHour,
        sevenDay
      };
      const tmp = `${file}.tmp`;
      fs.writeFileSync(tmp, JSON.stringify(payload));
      fs.renameSync(tmp, file);
    }

    const model = input.model && (input.model.display_name || input.model.id) || "Claude";
    const segments = [
      format("5h", freshFiveHour || previous.fiveHour),
      format("7d", freshSevenDay || previous.sevenDay)
    ].filter(Boolean);
    process.stdout.write(segments.length ? `[${model}] | ${segments.join(" ")}` : `[${model}]`);
  } catch {
    process.stdout.write("Claude");
  }
});

function readPrevious(file) {
  try {
    const value = JSON.parse(fs.readFileSync(file, "utf8"));
    return value && typeof value === "object" ? value : {};
  } catch {
    return {};
  }
}

function normalize(value) {
  if (!value || typeof value.used_percentage !== "number") return undefined;
  return {
    usedPercent: Math.max(0, Math.min(100, value.used_percentage)),
    resetsAt: typeof value.resets_at === "number" ? value.resets_at : undefined
  };
}

function format(label, value) {
  return value && typeof value.usedPercent === "number" ? `${label}: ${Math.round(value.usedPercent)}%` : "";
}
