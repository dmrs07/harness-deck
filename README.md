# Harness Deck

Harness Deck puts the usage limits of the AI coding harnesses you use on an Elgato Stream Deck.

The plugin supports **OpenAI Codex** and **Claude Code** with these actions:

- **Codex Usage** — 5-hour and 7-day usage windows on one key.
- **Claude Usage** — 5-hour and 7-day usage windows on one key.
- **Codex Usage Strip** — one segment of a Codex usage strip spanning multiple keys.
- **Claude Usage Strip** — one segment of a Claude usage strip spanning multiple keys.
- **AI Usage** — automatically displays whichever harness is currently closest to its limit.

Press any key to force an immediate refresh. Otherwise the plugin refreshes once per minute using a single shared polling service.

## How it works

### Codex

Harness Deck starts `codex app-server` locally and reads the structured `account/rateLimits/read` JSON-RPC response. It does not scrape terminal output and does not send a model prompt.

The adapter classifies the returned windows by `windowDurationMins` (300 minutes for the 5-hour window and 10,080 minutes for the 7-day window), with `primary` / `secondary` as compatibility fallbacks.

### Claude Code

Claude Code exposes subscription rate limits to its documented `statusLine` command input as:

- `rate_limits.five_hour.used_percentage`
- `rate_limits.five_hour.resets_at`
- `rate_limits.seven_day.used_percentage`
- `rate_limits.seven_day.resets_at`

`scripts/claude-statusline-cache.cjs` copies those values into `~/.harness-deck/claude-usage.json`. The Stream Deck plugin reads that local cache, so it does not use private APIs, credentials, or extra Claude requests.

Claude freshness is tracked independently for the 5-hour and 7-day windows. A retained window expires after 15 minutes without a fresh value instead of being kept alive by updates to the other window.

## Requirements

- Stream Deck 7.1+
- Node.js 24+
- `@elgato/cli` (installed by this project's dev dependencies)
- Codex CLI installed and authenticated for Codex usage
- Claude Code authenticated with a Claude.ai Pro/Max subscription for subscription rate-limit fields

## Development setup

```bash
git clone https://github.com/dmrs07/harness-deck.git
cd harness-deck
npm install
npm run link
npm run build
npm run restart
```

For development:

```bash
npm run watch
```

Then add the desired Harness Deck actions from the Stream Deck app.

## Configure Claude Code

Point Claude Code's `statusLine` setting at the bridge script in this repository. Example:

```json
{
  "statusLine": {
    "type": "command",
    "command": "node \"C:/path/to/harness-deck/scripts/claude-statusline-cache.cjs\""
  }
}
```

On macOS/Linux, use the corresponding absolute path.

> If you already use a custom Claude Code status line, do not blindly replace it. Merge the small cache-write step from `scripts/claude-statusline-cache.cjs` into your existing script, or make your existing script invoke it while preserving its own output.

The rate-limit object is only available for eligible Claude.ai subscribers and appears after the first API response in a Claude Code session.

## Bar direction

Each usage window can be configured independently from the action's Property Inspector:

- **Completing** — starts empty and fills as quota is consumed. The number is `% used`.
- **Depleting** — starts full and empties as quota is consumed. The number is `% remaining`.

Existing actions default to **Completing**.

For example, with 42% of the 5-hour quota consumed:

```text
Completing:  5H USED  42%  [████░░░░░░]
Depleting:   5H LEFT  58%  [██████░░░░]
```

Danger color always follows **quota consumed**, regardless of bar direction: amber at 75% used and red at 90% used.

## Multi-key strips

`Codex Usage Strip` and `Claude Usage Strip` let one usage visualization span **N adjacent keys**. Every key renders a crop of one shared virtual strip, using its physical Stream Deck column as the segment position.

The default is designed for a 15-key Stream Deck:

- `Start column = 0`
- `N = 5`

Place the same Strip action on all five keys in the first row and they form one continuous usage display.

The layout deliberately gives the 5-hour session almost the entire key height, while the weekly window is a thin rail pinned to the bottom:

```text
┌────────┬────────┬────────┬────────┬────────┐
│        5H USED — large continuous bar      │
│                    42%                     │
│                              reset 2h 17m  │
├────────┴────────┴────────┴────────┴────────┤
│ 7D USED — thin weekly rail              68%│
└────────────────────────────────────────────┘
```

At 42% completing usage on a five-key strip, the large 5-hour fill occupies exactly 2.1 keys worth of virtual width. In depleting mode the same usage renders 58% remaining, or 2.9 keys worth of fill. The weekly rail uses its own direction and percentage independently.

The Property Inspector exposes:

- **Keys in strip (N)** — 1 to 8 segments.
- **Start column** — zero-based first column of the strip.
- **5-hour direction** — completing or depleting.
- **7-day direction** — completing or depleting.

For the default five-key first-row layout no per-key adjustment is needed: every Strip instance starts with `N = 5` and column `0`. For a custom range, use the same Strip settings on each participating key.

## Architecture

```text
src/
  adapters/
    codex.ts          # Codex app-server JSON-RPC
    claude.ts         # local Claude statusLine cache
  actions/
    usage-actions.ts  # Stream Deck actions + strip coordination
  config/
    bar-settings.ts   # bar direction + strip geometry
  domain/
    usage.ts          # normalized usage model
  service/
    usage-service.ts  # shared 60s polling + subscriptions
  ui/
    render.ts         # dynamic SVG + virtual multi-key strip rendering
  plugin.ts
com.dmrs07.harness-deck.sdPlugin/
  ui/
    bar-settings.html # offline Property Inspector + strip preview
scripts/
  claude-statusline-cache.cjs
```

The normalized model deliberately keeps harness-specific collection separate from Stream Deck rendering, so additional adapters (Gemini CLI, Copilot CLI, etc.) can be added without coupling them to the UI.

## Current limitations

- Claude Code's documented status-line payload exposes the shared 5-hour and 7-day subscription windows, not every model-scoped limit visible in `/usage`.
- Claude values update when Claude Code invokes its status line. If Claude Code is not running, the last snapshot remains visible and eventually becomes stale.
- Multi-key strips are horizontal and coordinate by physical key column; Strip actions are not intended for Stream Deck Multi Actions.
- This plugin targets macOS and Windows, matching the Stream Deck desktop application.

## License

MIT
