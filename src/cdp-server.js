#!/usr/bin/env node
/**
 * TradingView Desktop CDP bridge (MCP server).
 *
 * Attaches to a running TradingView Desktop app (an Electron app launched with
 * --remote-debugging-port, see scripts/launch_tv_debug.bat) over the Chrome
 * DevTools Protocol, using Playwright's connectOverCDP. Exposes tools to inspect
 * pages, open symbols, screenshot the chart, and evaluate JS in the app.
 *
 * Point it at the debug endpoint via the CDP_URL env var (default
 * http://127.0.0.1:9222).
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { chromium } from "playwright";

const CDP_URL = process.env.CDP_URL || "http://127.0.0.1:9222";

const server = new McpServer({ name: "tradingview-cdp-mcp", version: "0.1.0" });

function ok(value) {
  return { content: [{ type: "text", text: JSON.stringify(value, null, 2) }] };
}
function fail(err) {
  return { isError: true, content: [{ type: "text", text: `Error: ${err?.message || String(err)}` }] };
}

/**
 * Connect over CDP, run fn(browser), always disconnect afterwards.
 * connectOverCDP attaches to the existing app without closing it on disconnect.
 */
async function withBrowser(fn) {
  let browser;
  try {
    browser = await chromium.connectOverCDP(CDP_URL);
  } catch (err) {
    throw new Error(
      `Could not connect to CDP endpoint ${CDP_URL}: ${err.message}. ` +
        "Is TradingView Desktop running with --remote-debugging-port? See scripts/launch_tv_debug.bat."
    );
  }
  try {
    return await fn(browser);
  } finally {
    await browser.close().catch(() => {});
  }
}

/** All pages across all contexts of the attached browser. */
function allPages(browser) {
  return browser.contexts().flatMap((ctx) => ctx.pages());
}

/** Pick the page to act on: by index if given, else the first non-devtools page. */
function pickPage(browser, index) {
  const pages = allPages(browser);
  if (pages.length === 0) throw new Error("No open pages found in the attached app.");
  if (typeof index === "number") {
    if (index < 0 || index >= pages.length) {
      throw new Error(`Page index ${index} out of range (0..${pages.length - 1}).`);
    }
    return pages[index];
  }
  return pages.find((p) => !p.url().startsWith("devtools://")) || pages[0];
}

server.registerTool(
  "cdp_status",
  {
    title: "CDP status",
    description:
      "Connect to the TradingView Desktop CDP endpoint and list open pages (index, title, url). " +
      "Use this first to confirm the bridge is connected.",
    inputSchema: {},
  },
  async () => {
    try {
      return await withBrowser(async (browser) => {
        const pages = allPages(browser);
        const info = await Promise.all(
          pages.map(async (p, i) => ({ index: i, title: await p.title().catch(() => ""), url: p.url() }))
        );
        return ok({ cdpUrl: CDP_URL, connected: true, pageCount: pages.length, pages: info });
      });
    } catch (err) {
      return fail(err);
    }
  }
);

server.registerTool(
  "cdp_open_symbol",
  {
    title: "Open symbol",
    description:
      "Navigate the active TradingView page to a symbol's chart, e.g. \"NASDAQ:AAPL\" or \"BINANCE:BTCUSDT\".",
    inputSchema: {
      symbol: z.string().describe('Fully-qualified symbol, e.g. "NASDAQ:AAPL"'),
      pageIndex: z.number().int().optional().describe("Target page index (from cdp_status). Default: active page."),
    },
  },
  async ({ symbol, pageIndex }) => {
    try {
      return await withBrowser(async (browser) => {
        const page = pickPage(browser, pageIndex);
        const url = `https://www.tradingview.com/chart/?symbol=${encodeURIComponent(symbol)}`;
        await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
        return ok({ navigatedTo: url, title: await page.title().catch(() => "") });
      });
    } catch (err) {
      return fail(err);
    }
  }
);

server.registerTool(
  "cdp_screenshot",
  {
    title: "Screenshot chart",
    description: "Capture a PNG screenshot of the active TradingView page (the chart).",
    inputSchema: {
      pageIndex: z.number().int().optional().describe("Target page index (from cdp_status). Default: active page."),
      fullPage: z.boolean().optional().describe("Capture the full scrollable page (default false)."),
    },
  },
  async ({ pageIndex, fullPage }) => {
    try {
      return await withBrowser(async (browser) => {
        const page = pickPage(browser, pageIndex);
        const buf = await page.screenshot({ fullPage: !!fullPage, type: "png" });
        return { content: [{ type: "image", data: buf.toString("base64"), mimeType: "image/png" }] };
      });
    } catch (err) {
      return fail(err);
    }
  }
);

server.registerTool(
  "cdp_eval",
  {
    title: "Evaluate JS",
    description:
      "Evaluate a JavaScript expression in the active TradingView page and return the result. " +
      "Useful for reading DOM state, chart data exposed on window, etc.",
    inputSchema: {
      expression: z.string().describe("A JavaScript expression to evaluate in the page context."),
      pageIndex: z.number().int().optional().describe("Target page index (from cdp_status). Default: active page."),
    },
  },
  async ({ expression, pageIndex }) => {
    try {
      return await withBrowser(async (browser) => {
        const page = pickPage(browser, pageIndex);
        const result = await page.evaluate((expr) => {
          // eslint-disable-next-line no-eval
          const value = eval(expr);
          return value;
        }, expression);
        return ok({ result });
      });
    } catch (err) {
      return fail(err);
    }
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`tradingview-cdp-mcp server running on stdio (CDP_URL=${CDP_URL})`);
}

main().catch((err) => {
  console.error("Fatal error starting tradingview-cdp-mcp:", err);
  process.exit(1);
});
