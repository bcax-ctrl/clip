#!/usr/bin/env node
/**
 * Doctor / self-check for both servers. Run on the machine where you intend to
 * use them (e.g. your Windows box) to confirm each path is reachable:
 *
 *   node scripts/check.mjs            # check both
 *   node scripts/check.mjs scanner    # only the scanner-API path
 *   node scripts/check.mjs cdp        # only the CDP desktop-bridge path
 *
 * Exit code is non-zero if any requested check fails.
 */
import { searchSymbol } from "../src/tradingview.js";

const CDP_URL = process.env.CDP_URL || "http://127.0.0.1:9222";
const which = process.argv[2] || "all";

function line(ok, label, detail) {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? " — " + detail : ""}`);
  return ok;
}

async function checkScanner() {
  try {
    const res = await searchSymbol("AAPL", { limit: 1 });
    if (Array.isArray(res) && res.length > 0) {
      return line(true, "scanner: TradingView HTTP endpoints", `got ${res[0].ticker}`);
    }
    return line(false, "scanner: TradingView HTTP endpoints", "empty response");
  } catch (err) {
    return line(false, "scanner: TradingView HTTP endpoints", err.message);
  }
}

async function checkCdp() {
  // 1) Is the debug endpoint reachable at all?
  try {
    const res = await fetch(`${CDP_URL}/json/version`, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return line(false, `cdp: ${CDP_URL}`, `HTTP ${res.status}`);
    const info = await res.json();
    // 2) Can Playwright actually attach over CDP?
    const { chromium } = await import("playwright");
    const browser = await chromium.connectOverCDP(CDP_URL);
    const pages = browser.contexts().flatMap((c) => c.pages()).length;
    await browser.close();
    return line(true, `cdp: ${CDP_URL}`, `${info.Browser}, ${pages} page(s)`);
  } catch (err) {
    return line(
      false,
      `cdp: ${CDP_URL}`,
      `${err.message}. Start TradingView Desktop with scripts/launch_tv_debug.bat`
    );
  }
}

const results = [];
if (which === "all" || which === "scanner") results.push(await checkScanner());
if (which === "all" || which === "cdp") results.push(await checkCdp());

const allOk = results.every(Boolean);
console.log(`\n${allOk ? "All checks passed." : "Some checks failed (see above)."}`);
process.exit(allOk ? 0 : 1);
