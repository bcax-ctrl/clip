# tradingview-mcp

A [Model Context Protocol](https://modelcontextprotocol.io) (MCP) server that
exposes **TradingView** market data to MCP clients such as Claude Desktop,
Claude Code, and Cursor.

It talks to TradingView's public (undocumented) browser endpoints — the same
ones the tradingview.com website calls — so **no API key is required**. Note
that these endpoints are rate limited and may change without notice.

## Tools

| Tool | Description |
| --- | --- |
| `search_symbol` | Search the TradingView symbol database by free text. Returns fully-qualified tickers like `NASDAQ:AAPL`. |
| `get_quote` | Current price, change, high/low, volume and market cap for one or more tickers. |
| `get_technical_analysis` | TradingView's technical rating (`STRONG_BUY` … `STRONG_SELL`) plus oscillator/indicator values for a timeframe. |
| `screener` | Run a TradingView screener query with filters, column selection and sorting. |

Supported technical-analysis timeframes: `1m, 5m, 15m, 30m, 1h, 2h, 4h, 1d, 1W, 1M`.

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
