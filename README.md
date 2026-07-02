# tradingview-mcp

A [Model Context Protocol](https://modelcontextprotocol.io) (MCP) server that
exposes **TradingView** market data to MCP clients such as Claude Desktop,
Claude Code, and Cursor.

There are **two servers** in this repo, usable independently or together:

1. **`src/index.js` — Scanner-API server.** Talks to TradingView's public
   (undocumented) HTTP endpoints. Runs headless anywhere, **no API key and no
   desktop app**. Provides symbol search, quotes, technical ratings, screener.
2. **`src/cdp-server.js` — Desktop CDP bridge.** Attaches to the **TradingView
   Desktop** app (an Electron app) over the Chrome DevTools Protocol to drive
   the real UI — open symbols, screenshot charts, evaluate JS. Requires the
   desktop app running with remote debugging (see
   [`scripts/launch_tv_debug.bat`](./scripts/launch_tv_debug.bat)).

## Scanner-API server (`src/index.js`)

Uses TradingView's public browser endpoints — the same ones the tradingview.com
website calls — so **no API key is required**. These endpoints are rate limited
and may change without notice. In proxied environments set `HTTPS_PROXY` (and
`NODE_EXTRA_CA_CERTS` if the proxy re-terminates TLS) and requests are routed
through it automatically.

### Tools

| Tool | Description |
| --- | --- |
| `search_symbol` | Search the TradingView symbol database by free text. Returns fully-qualified tickers like `NASDAQ:AAPL`. |
| `get_quote` | Current price, change, high/low, volume and market cap for one or more tickers. |
| `get_technical_analysis` | TradingView's technical rating (`STRONG_BUY` … `STRONG_SELL`) plus oscillator/indicator values for a timeframe. |
| `screener` | Run a TradingView screener query with filters, column selection and sorting. |

Supported technical-analysis timeframes: `1m, 5m, 15m, 30m, 1h, 2h, 4h, 1d, 1W, 1M`.

Run it with `npm start`.

## Desktop CDP bridge (`src/cdp-server.js`)

Drives the **TradingView Desktop** app over the Chrome DevTools Protocol.
Windows-focused (the launcher is a `.bat`), and the desktop app must be running
with remote debugging enabled.

1. Launch TradingView Desktop in debug mode:

   ```bat
   scripts\launch_tv_debug.bat
   ```

   This starts `TradingView.exe` with `--remote-debugging-port=9222`. Verify the
   endpoint with `curl http://127.0.0.1:9222/json/version`.

2. Start the bridge (defaults to `CDP_URL=http://127.0.0.1:9222`):

   ```bash
   npm run start:cdp
   ```

### Tools

| Tool | Description |
| --- | --- |
| `cdp_status` | Connect and list open pages (index, title, url). Use first to confirm the bridge is attached. |
| `cdp_open_symbol` | Navigate the active page to a symbol's chart, e.g. `NASDAQ:AAPL`. |
| `cdp_screenshot` | Capture a PNG screenshot of the active chart page. |
| `cdp_eval` | Evaluate a JavaScript expression in the active page and return the result. |

> The bridge requires a running TradingView Desktop app and cannot run purely
> headless. The CDP mechanics (connect / list / eval / screenshot) work against
> any Chromium/Electron CDP endpoint.

## Install

```bash
npm install
```

## Run

```bash
npm start
```

The server communicates over **stdio**, so it is normally launched by an MCP
client rather than run by hand.

## Configure in an MCP client

### Claude Desktop / Claude Code

Add the server to your MCP config (`claude_desktop_config.json`, or via
`claude mcp add`). Point it at the absolute path of `src/index.js`:

```json
{
  "mcpServers": {
    "tradingview": {
      "command": "node",
      "args": ["/absolute/path/to/clip/src/index.js"]
    }
  }
}
```

An example config is provided in [`config.example.json`](./config.example.json).

## Example prompts

- "Search TradingView for Apple stock."
- "What's the current quote for NASDAQ:AAPL and BINANCE:BTCUSDT?"
- "Give me the 1h technical analysis for NASDAQ:TSLA."
- "Screen US stocks with a market cap over 100B, sorted by volume."

## Notes & limitations

- Data is best-effort from public endpoints; there is no SLA and requests may be
  rate limited or blocked from some networks.
- Tickers must be fully qualified (`EXCHANGE:SYMBOL`). Use `search_symbol` first
  if you only know a name or plain ticker.
- This project is not affiliated with or endorsed by TradingView.

## License

MIT
