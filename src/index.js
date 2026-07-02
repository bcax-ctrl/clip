#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import {
  searchSymbol,
  getQuotes,
  getTechnicalAnalysis,
  runScreener,
  INTERVALS,
} from "./tradingview.js";

const server = new McpServer({
  name: "tradingview-mcp",
  version: "0.1.0",
});

/** Wrap a value as an MCP text-content result (pretty JSON). */
function ok(value) {
  return { content: [{ type: "text", text: JSON.stringify(value, null, 2) }] };
}

/** Wrap an error as an MCP error result. */
function fail(err) {
  return {
    isError: true,
    content: [{ type: "text", text: `Error: ${err?.message || String(err)}` }],
  };
}

server.registerTool(
  "search_symbol",
  {
    title: "Search symbols",
    description:
      "Search the TradingView symbol database by free text. Returns fully-qualified tickers " +
      '(e.g. "NASDAQ:AAPL") that can be passed to get_quote and get_technical_analysis.',
    inputSchema: {
      query: z.string().describe('Free-text query, e.g. "AAPL", "bitcoin", "EURUSD"'),
      type: z
        .enum(["stock", "crypto", "forex", "futures", "index", "economic", "bond", "fund"])
        .optional()
        .describe("Restrict to an asset class"),
      exchange: z.string().optional().describe('Restrict to an exchange, e.g. "NASDAQ", "BINANCE"'),
      limit: z.number().int().min(1).max(50).optional().describe("Max results (default 20)"),
    },
  },
  async ({ query, type, exchange, limit }) => {
    try {
      return ok(await searchSymbol(query, { type, exchange, limit }));
    } catch (err) {
      return fail(err);
    }
  }
);

server.registerTool(
  "get_quote",
  {
    title: "Get quotes",
    description:
      "Fetch current price/quote data (price, change, high/low, volume, market cap) for one or " +
      "more fully-qualified tickers.",
    inputSchema: {
      tickers: z
        .array(z.string())
        .min(1)
        .describe('Fully-qualified tickers, e.g. ["NASDAQ:AAPL", "BINANCE:BTCUSDT"]'),
      market: z
        .string()
        .optional()
        .describe('Scanner market segment (default "global"). Use "crypto", "forex", etc. if needed.'),
    },
  },
  async ({ tickers, market }) => {
    try {
      return ok(await getQuotes(tickers, market));
    } catch (err) {
      return fail(err);
    }
  }
);

server.registerTool(
  "get_technical_analysis",
  {
    title: "Technical analysis",
    description:
      "Compute TradingView's technical rating (STRONG_BUY … STRONG_SELL) plus underlying " +
      "oscillator/indicator values for a symbol on a given timeframe.",
    inputSchema: {
      ticker: z.string().describe('Fully-qualified ticker, e.g. "NASDAQ:AAPL"'),
      interval: z
        .enum(Object.keys(INTERVALS))
        .optional()
        .describe(`Timeframe (default "1d"). One of: ${Object.keys(INTERVALS).join(", ")}`),
      market: z.string().optional().describe('Scanner market segment (default "global")'),
    },
  },
  async ({ ticker, interval, market }) => {
    try {
      return ok(await getTechnicalAnalysis(ticker, interval, market));
    } catch (err) {
      return fail(err);
    }
  }
);

server.registerTool(
  "screener",
  {
    title: "Run screener",
    description:
      "Run a TradingView screener query against a market. Supports raw TradingView filter " +
      "clauses, column selection and sorting. Returns matching symbols with the requested columns.",
    inputSchema: {
      market: z
        .string()
        .optional()
        .describe('Market segment (default "america"). e.g. "crypto", "forex", "germany".'),
      filter: z
        .array(
          z.object({
            left: z.string(),
            operation: z.string(),
            right: z.any().optional(),
          })
        )
        .optional()
        .describe(
          'TradingView filter clauses, e.g. [{"left":"market_cap_basic","operation":"greater","right":1000000000}]'
        ),
      columns: z
        .array(z.string())
        .optional()
        .describe('Columns to return, e.g. ["name","close","change","volume"]'),
      sortBy: z.string().optional().describe('Column to sort by, e.g. "volume"'),
      sortOrder: z.enum(["asc", "desc"]).optional().describe('Sort direction (default "desc")'),
      limit: z.number().int().min(1).max(200).optional().describe("Max rows (default 25)"),
    },
  },
  async ({ market, filter, columns, sortBy, sortOrder, limit }) => {
    try {
      const sort = sortBy ? { sortBy, sortOrder } : undefined;
      return ok(await runScreener({ market, filter, columns, sort, limit }));
    } catch (err) {
      return fail(err);
    }
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // stdio transport: log to stderr so we don't corrupt the protocol on stdout.
  console.error("tradingview-mcp server running on stdio");
}

main().catch((err) => {
  console.error("Fatal error starting tradingview-mcp:", err);
  process.exit(1);
});
