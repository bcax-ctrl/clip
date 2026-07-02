/**
 * Minimal TradingView data client.
 *
 * Uses TradingView's public (undocumented) endpoints:
 *   - symbol-search.tradingview.com  -> symbol lookup
 *   - scanner.tradingview.com/{market}/scan -> quotes, indicators, screener
 *
 * These endpoints are the same ones the tradingview.com website calls from the
 * browser. They require no API key but are rate limited and may change without
 * notice.
 */

import fs from "node:fs";
// Use undici's own fetch + ProxyAgent from the same package so the dispatcher
// interface matches (mixing the bundled fetch with a standalone ProxyAgent
// throws UND_ERR_INVALID_ARG). Without a proxy this behaves like global fetch.
import { fetch, ProxyAgent } from "undici";

const SYMBOL_SEARCH_URL = "https://symbol-search.tradingview.com/symbol_search/";
const SCANNER_URL = "https://scanner.tradingview.com";

/**
 * When an HTTPS proxy is configured (e.g. a corporate / sandbox egress proxy),
 * Node's built-in fetch does NOT use it automatically. Build an undici
 * ProxyAgent so requests are tunnelled correctly. If the proxy re-terminates
 * TLS, NODE_EXTRA_CA_CERTS must point at its CA bundle so verification passes.
 */
function buildDispatcher() {
  const proxyUri = process.env.HTTPS_PROXY || process.env.https_proxy;
  if (!proxyUri) return undefined;
  const caPath = process.env.NODE_EXTRA_CA_CERTS;
  let ca;
  try {
    if (caPath && fs.existsSync(caPath)) ca = fs.readFileSync(caPath);
  } catch {
    // fall back to system trust store
  }
  return new ProxyAgent({ uri: proxyUri, requestTls: ca ? { ca } : undefined });
}

const dispatcher = buildDispatcher();

/**
 * fetch wrapper that (a) injects the proxy dispatcher and (b) surfaces the
 * underlying network cause. Node's fetch throws a bare "fetch failed" and hides
 * the real reason (DNS, TLS, or an egress proxy rejecting the host) in `.cause`.
 */
async function httpFetch(url, options = {}) {
  try {
    return await fetch(url, { ...options, dispatcher });
  } catch (err) {
    const cause = err?.cause?.message || err?.cause?.code;
    throw new Error(`Network request to ${new URL(url).host} failed: ${cause || err.message}`);
  }
}

const DEFAULT_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
  Accept: "application/json",
  Origin: "https://www.tradingview.com",
  Referer: "https://www.tradingview.com/",
};

// TradingView scanner interval suffixes. Empty string means the daily timeframe.
export const INTERVALS = {
  "1m": "|1",
  "5m": "|5",
  "15m": "|15",
  "30m": "|30",
  "1h": "|60",
  "2h": "|120",
  "4h": "|240",
  "1d": "",
  "1W": "|1W",
  "1M": "|1M",
};

// Columns returned for a plain quote request.
const QUOTE_COLUMNS = [
  "name",
  "description",
  "close",
  "change",
  "change_abs",
  "high",
  "low",
  "open",
  "volume",
  "market_cap_basic",
  "currency",
  "exchange",
];

// Indicator columns used to derive the technical rating for a timeframe.
function taColumns(suffix) {
  return [
    "Recommend.Other",
    "Recommend.All",
    "Recommend.MA",
    "RSI",
    "Mom",
    "AO",
    "CCI20",
    "Stoch.K",
    "Stoch.D",
    "MACD.macd",
    "MACD.signal",
    "close",
    "change",
  ].map((c) => (suffix ? `${c}${suffix}` : c));
}

function ratingLabel(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return "N/A";
  if (value >= 0.5) return "STRONG_BUY";
  if (value >= 0.1) return "BUY";
  if (value > -0.1) return "NEUTRAL";
  if (value > -0.5) return "SELL";
  return "STRONG_SELL";
}

async function postJson(url, body) {
  const res = await httpFetch(url, {
    method: "POST",
    headers: { ...DEFAULT_HEADERS, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`TradingView request failed (${res.status} ${res.statusText}): ${text.slice(0, 300)}`);
  }
  return res.json();
}

/**
 * Search the TradingView symbol database.
 * @param {string} text free-text query, e.g. "AAPL" or "bitcoin"
 * @param {{type?: string, exchange?: string, limit?: number}} [opts]
 */
export async function searchSymbol(text, opts = {}) {
  const params = new URLSearchParams({
    text,
    hl: "1",
    lang: "en",
    domain: "production",
  });
  if (opts.type) params.set("type", opts.type); // stock | crypto | forex | futures | index | economic ...
  if (opts.exchange) params.set("exchange", opts.exchange);

  const res = await httpFetch(`${SYMBOL_SEARCH_URL}?${params.toString()}`, {
    headers: DEFAULT_HEADERS,
  });
  if (!res.ok) {
    throw new Error(`Symbol search failed (${res.status} ${res.statusText})`);
  }
  const data = await res.json();
  const list = Array.isArray(data) ? data : data.symbols || [];
  const limit = opts.limit ?? 20;
  return list.slice(0, limit).map((s) => ({
    symbol: s.symbol,
    exchange: s.exchange,
    description: stripTags(s.description),
    type: s.type,
    currency: s.currency_code,
    // Fully-qualified ticker usable by the scanner, e.g. "NASDAQ:AAPL".
    ticker: s.exchange && s.symbol ? `${s.exchange}:${stripTags(s.symbol)}` : stripTags(s.symbol),
  }));
}

function stripTags(str) {
  return typeof str === "string" ? str.replace(/<\/?[^>]+>/g, "") : str;
}

/**
 * Fetch quote data for one or more fully-qualified tickers.
 * @param {string[]} tickers e.g. ["NASDAQ:AAPL", "BINANCE:BTCUSDT"]
 * @param {string} [market] scanner market segment (default "global")
 */
export async function getQuotes(tickers, market = "global") {
  const body = {
    symbols: { tickers, query: { types: [] } },
    columns: QUOTE_COLUMNS,
  };
  const data = await postJson(`${SCANNER_URL}/${market}/scan`, body);
  return (data.data || []).map((row) => mapColumns(row.s, row.d, QUOTE_COLUMNS));
}

/**
 * Compute TradingView's technical rating for a symbol on a timeframe.
 * @param {string} ticker fully-qualified ticker, e.g. "NASDAQ:AAPL"
 * @param {string} interval one of INTERVALS keys (default "1d")
 * @param {string} [market] scanner market segment (default "global")
 */
export async function getTechnicalAnalysis(ticker, interval = "1d", market = "global") {
  const suffix = INTERVALS[interval];
  if (suffix === undefined) {
    throw new Error(`Unknown interval "${interval}". Valid: ${Object.keys(INTERVALS).join(", ")}`);
  }
  const columns = taColumns(suffix);
  const body = { symbols: { tickers: [ticker], query: { types: [] } }, columns };
  const data = await postJson(`${SCANNER_URL}/${market}/scan`, body);
  const row = (data.data || [])[0];
  if (!row) throw new Error(`No data returned for ${ticker}`);

  const values = {};
  columns.forEach((c, i) => {
    const key = c.replace(suffix, "");
    values[key] = row.d[i];
  });

  return {
    ticker: row.s,
    interval,
    summary: {
      recommendation: ratingLabel(values["Recommend.All"]),
      moving_averages: ratingLabel(values["Recommend.MA"]),
      oscillators: ratingLabel(values["Recommend.Other"]),
    },
    indicators: {
      close: values["close"],
      change_pct: values["change"],
      RSI: values["RSI"],
      Momentum: values["Mom"],
      AwesomeOscillator: values["AO"],
      CCI20: values["CCI20"],
      "Stoch.K": values["Stoch.K"],
      "Stoch.D": values["Stoch.D"],
      "MACD.macd": values["MACD.macd"],
      "MACD.signal": values["MACD.signal"],
    },
  };
}

/**
 * Run a TradingView screener query.
 * @param {object} opts
 * @param {string} [opts.market="america"] market segment (america, crypto, forex, ...)
 * @param {Array} [opts.filter] TradingView filter clauses
 * @param {string[]} [opts.columns] columns to return
 * @param {{sortBy: string, sortOrder: "asc"|"desc"}} [opts.sort]
 * @param {number} [opts.limit=25]
 */
export async function runScreener(opts = {}) {
  const {
    market = "america",
    filter = [],
    columns = ["name", "close", "change", "volume", "market_cap_basic"],
    sort,
    limit = 25,
  } = opts;

  const body = {
    filter,
    options: { lang: "en" },
    columns,
    range: [0, Math.max(1, Math.min(limit, 200))],
  };
  if (sort) body.sort = { sortBy: sort.sortBy, sortOrder: sort.sortOrder || "desc" };

  const data = await postJson(`${SCANNER_URL}/${market}/scan`, body);
  return {
    totalCount: data.totalCount,
    results: (data.data || []).map((row) => mapColumns(row.s, row.d, columns)),
  };
}

function mapColumns(symbol, values, columns) {
  const out = { ticker: symbol };
  columns.forEach((c, i) => {
    out[c] = values[i];
  });
  return out;
}
