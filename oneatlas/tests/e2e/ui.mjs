/**
 * Browser UI tests (search, filters, sort, compare flow, theme, mobile layout, console errors).
 *
 * Needs: a built app (`npm run build`), a migrated + seeded database, and a Chrome/Chromium binary:
 *   npm i -D puppeteer-core
 *   CHROME_PATH="C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" node tests/e2e/ui.mjs
 * Set BASE_URL to test an already-running server instead of starting `next start` on :3300.
 * Screenshots are written to ./test-results/.
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import puppeteer from "puppeteer-core";

const OUT = "test-results"; fs.mkdirSync(OUT, { recursive: true });
const PORT = 3300, B = process.env.BASE_URL ?? `http://127.0.0.1:${PORT}`;
let srv = null;
if (!process.env.BASE_URL) srv = spawn("npx", ["next", "start", "-p", String(PORT)], { cwd: process.cwd(), detached: process.platform !== "win32", stdio: "ignore", shell: process.platform === "win32" });
const killSrv = () => {
  if (!srv) return;
  try { if (process.platform === "win32") spawn("taskkill", ["/pid", String(srv.pid), "/t", "/f"]); else process.kill(-srv.pid); } catch { /* already stopped */ }
};
process.on("exit", killSrv);
for (let i = 0; i < 60; i++) { try { if ((await fetch(`${B}/api/health`)).ok) break; } catch {} await new Promise((r) => setTimeout(r, 500)); }

let launch = { executablePath: process.env.CHROME_PATH, headless: true };
if (!launch.executablePath) { const { default: chromium } = await import("@sparticuz/chromium"); launch = { args: chromium.args, executablePath: await chromium.executablePath(), headless: "shell" }; }
const browser = await puppeteer.launch(launch);
const results = []; const problems = [];

async function newPage(w = 1440, h = 900) {
  const page = await browser.newPage();
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
  page.on("console", (m) => { if (m.type() === "error") problems.push(`console.error @ ${page.url()}: ${m.text().slice(0, 200)}`); });
  page.on("pageerror", (e) => problems.push(`pageerror @ ${page.url()}: ${String(e).slice(0, 200)}`));
  page.on("response", (r) => { if (r.status() >= 400 && !r.url().includes("/api/search") ) problems.push(`HTTP ${r.status()} ${r.url().replace(B, "")}`); });
  return page;
}
async function step(name, fn) {
  try { await fn(); results.push(["PASS", name]); } catch (e) { results.push(["FAIL", `${name} — ${String(e.message ?? e).slice(0, 220)}`]); }
}
const go = (page, path) => page.goto(B + path, { waitUntil: "networkidle0", timeout: 45000 });
const shot = (page, name, full = false) => page.screenshot({ path: `${OUT}/${name}.png`, fullPage: full });
const clickText = async (page, sel, text) => {
  const h = await page.evaluateHandle((sel, text) => [...document.querySelectorAll(sel)].find((e) => e.textContent.trim().toLowerCase().startsWith(text.toLowerCase())), sel, text);
  const el = h.asElement(); if (!el) throw new Error(`no ${sel} with text "${text}"`); await el.click();
};
const urlHas = (page, s) => page.waitForFunction((s) => location.search.includes(s) || location.pathname.includes(s), { timeout: 8000 }, s);
const assert = (c, m) => { if (!c) throw new Error(m); };

// ───────── Desktop, dark ─────────
const page = await newPage();
await step("home renders dashboard sections", async () => {
  await go(page, "/");
  const t = await page.evaluate(() => document.body.innerText);
  for (const s of ["AI model intelligence", "Trending", "Recently released", "Popular models", "Pricing insights", "Compare shortcuts", "Featured AI labs"]) assert(t.includes(s), `missing ${s}`);
  const svgs = await page.$$eval("svg.recharts-surface", (e) => e.length);
  const homeBars = await page.$$eval(".recharts-bar-rectangle, .recharts-pie-sector", (e) => e.length); assert(homeBars >= 20, `home chart shapes: ${homeBars}`);
  assert(svgs >= 4, `expected ≥4 Recharts charts, got ${svgs}`);
  assert(await page.evaluate(() => document.documentElement.classList.contains("dark")), "dark theme should be default");
  await shot(page, "01-home-dark", true);
});
await step("global search: live dropdown, keyboard nav, Enter opens result", async () => {
  await go(page, "/");
  await page.click('input[role="combobox"]'); await page.keyboard.type("claude", { delay: 30 });
  await page.waitForSelector('[role="listbox"] [role="option"]', { timeout: 8000 });
  const n = await page.$$eval('[role="option"]', (e) => e.length); assert(n >= 3, `got ${n} options`);
  await shot(page, "02-search-dropdown");
  await page.keyboard.press("ArrowDown"); await page.keyboard.press("Enter");
  await page.waitForFunction(() => location.pathname.startsWith("/models/"), { timeout: 10000 });
});
await step("global search: Enter with no selection searches the catalog; ⌘K focuses", async () => {
  await go(page, "/"); await page.keyboard.down("Control"); await page.keyboard.press("k"); await page.keyboard.up("Control");
  assert(await page.evaluate(() => document.activeElement?.getAttribute("role") === "combobox"), "Ctrl+K should focus search");
  await page.keyboard.type("gemini"); await page.keyboard.press("Enter"); await urlHas(page, "q=gemini");
});
await step("quick-filter chip navigates with filters applied", async () => {
  await go(page, "/"); await clickText(page, "a", "Free"); await page.waitForFunction(() => location.pathname === "/models" && location.search.includes("free=1"), { timeout: 8000 });
  await page.waitForFunction(() => document.querySelector("tbody tr") && /^\d+ models?$/m.test(document.body.innerText), { timeout: 8000 });
  const total = await page.evaluate(() => Number(document.body.innerText.match(/^(\d+) models?$/m)?.[1])); assert(total > 0 && total < 100, `free count ${total}`);
});

await step("catalog: table, filters, sorting, pagination", async () => {
  await go(page, "/models"); await shot(page, "03-models-dark");
  const rows0 = await page.$$eval("tbody tr", (e) => e.length); assert(rows0 === 24, `rows ${rows0}`);
  await clickText(page, "label", "Reasoning"); await urlHas(page, "cap=reasoning");
  await page.waitForFunction(() => /\d+ models/.test(document.body.innerText) && !document.querySelector('[aria-busy="true"]'), { timeout: 8000 });
  const caps = await page.$$eval("tbody tr", (rs) => rs.every((r) => r.querySelector('[aria-label="Reasoning: yes"]'))); assert(caps, "all rows should have reasoning=yes");
  await clickText(page, "label", "Open weights"); await urlHas(page, "open=1");
  assert(await page.$$eval("tbody tr", (rs) => rs.every((r) => r.textContent.includes("Open"))), "open filter rows");
  await clickText(page, "button", "Clear filters"); await page.waitForFunction(() => !location.search.includes("cap="), { timeout: 8000 });
  await clickText(page, "th a", "Context"); await urlHas(page, "sort=context");
  await shot(page, "04-models-sorted");
  const sorted = await page.$$eval("tbody tr td:nth-child(4)", (c) => c.map((x) => x.textContent)); assert(sorted.length > 5, "sorted rows");
  await clickText(page, "a", "Next page") .catch(() => {});
  await page.click('a[aria-label="Next page"]'); await urlHas(page, "page=2");
});
await step("catalog: search box (debounced), chips, grid view, page size", async () => {
  await go(page, "/models"); await page.click('input[aria-label="Search models"]'); await page.keyboard.type("deepseek", { delay: 20 });
  await urlHas(page, "q=deepseek");
  await page.waitForFunction(() => [...document.querySelectorAll("tbody tr")].every((r) => /deepseek/i.test(r.textContent)), { timeout: 8000 });
  await page.click('button[aria-label="Grid view"]'); await urlHas(page, "view=grid");
  assert((await page.$$eval("tbody tr", (e) => e.length)) === 0, "grid should replace table");
  await shot(page, "05-models-grid");
  await page.click('button[aria-label^="Results per page"]'); await clickText(page, '[role="menuitemcheckbox"]', "12 per page"); await urlHas(page, "pageSize=12");
  await clickText(page, "button", "Clear all"); await page.waitForFunction(() => !location.search.includes("q="), { timeout: 8000 });
});
await step("compare: select rows → tray → compare page → remove → share link", async () => {
  await page.evaluate(() => localStorage.clear()); await go(page, "/models");
  const boxes = await page.$$('button[role="checkbox"]'); await boxes[0].click(); await boxes[1].click(); await boxes[2].click();
  await page.waitForFunction(() => document.body.innerText.includes("Compare now"), { timeout: 5000 });
  await shot(page, "06-compare-tray");
  await clickText(page, "a", "Compare now"); await page.waitForFunction(() => location.pathname === "/compare", { timeout: 10000 });
  assert(!(await page.evaluate(() => document.body.innerText.includes("Compare now"))), "tray should be hidden on /compare");
  await page.waitForSelector("table thead th"); const cols = await page.$$eval("thead th", (e) => e.length); assert(cols === 4, `expected 4 header cols, got ${cols}`);
  assert(await page.evaluate(() => /pricing \(usd per 1m tokens\)/i.test(document.body.innerText)), "pricing section");
  await shot(page, "07-compare-page", true);
  await page.click('a[aria-label^="Remove "]'); await page.waitForFunction(() => document.querySelectorAll("thead th").length === 3, { timeout: 10000 });
  await page.evaluate(() => { navigator.clipboard.writeText = async () => {}; });
  await clickText(page, "button", "Copy share link"); await page.waitForFunction(() => document.body.innerText.includes("Comparison link copied"), { timeout: 5000 });
});
await step("compare: add a model via search", async () => {
  await page.click('input[aria-label="Search models to add"]'); await page.keyboard.type("gemini", { delay: 20 });
  await page.waitForSelector('input[aria-label="Search models to add"] ~ ul li button', { timeout: 8000 });
  const before = await page.evaluate(() => document.querySelectorAll("thead th").length);
  await page.evaluate(() => { const b = [...document.querySelectorAll('input[aria-label="Search models to add"] ~ ul li button')].find((x) => !x.disabled); b.click(); });
  await page.waitForFunction((n) => document.querySelectorAll("thead th").length === n + 1, { timeout: 10000 }, before);
});
await step("model detail: sections, copy buttons, compare button", async () => {
  await go(page, "/models/openai/gpt-4o"); await shot(page, "08-model-detail", true);
  const t = await page.evaluate(() => document.body.innerText);
  for (const s of ["Providers & pricing", "Capabilities & modalities", "Benchmark performance", "Related models", "Specifications"]) assert(t.includes(s), `missing ${s}`);
  await clickText(page, "button", "Add to compare"); await page.waitForFunction(() => document.body.innerText.includes("Added to compare"), { timeout: 5000 });
});
await step("rankings: category tabs and top-N", async () => {
  await go(page, "/rankings");
  const bars = await page.$$eval(".recharts-bar-rectangle", (e) => e.length); assert(bars >= 10, `ranking chart bars: ${bars}`);
  await shot(page, "09-rankings", true);
  await clickText(page, '[role="tab"]', "Coding"); await urlHas(page, "category=coding");
  await clickText(page, "a", "50"); await urlHas(page, "limit=50");
  assert((await page.$$eval("tbody tr", (e) => e.length)) === 50, "50 rows");
  assert(await page.evaluate(() => document.body.innerText.includes("Simulated sample scores")), "simulated banner");
});
for (const [name, path, must] of [
  ["benchmarks index + chart", "/benchmarks", ["Benchmark catalog", "Score comparison"]],
  ["benchmark detail", "/benchmarks/coding-index", ["Evaluation methodology", "Leaderboard"]],
  ["labs directory", "/labs", ["AI labs", "Anthropic"]],
  ["lab detail", "/labs/anthropic", ["Latest releases", "Available through"]],
  ["providers directory", "/providers", ["API providers", "Amazon Bedrock"]],
  ["provider detail", "/providers/amazon-bedrock", ["Models & pricing", "Labs served"]],
]) await step(name, async () => { await go(page, path); const t = await page.evaluate(() => document.body.innerText); for (const s of must) assert(t.includes(s), `missing ${s}`); await shot(page, "10-" + path.replace(/\W+/g, "-").slice(1), true); });
await step("labs search form", async () => {
  await go(page, "/labs"); await page.type('input[name="q"]', "deep"); await Promise.all([page.waitForNavigation({ waitUntil: "networkidle0" }), clickText(page, "button", "Apply")]);
  assert(page.url().includes("q=deep"), "url"); const names = await page.$$eval("main h2", (e) => e.map((x) => x.textContent)); assert(names.includes("DeepSeek") && !names.includes("OpenAI") && !names.includes("Anthropic"), `cards: ${names}`);
});
await step("theme toggle switches to light and persists", async () => {
  await go(page, "/"); await page.click('button[aria-label="Change theme"]'); await clickText(page, '[role="menuitemcheckbox"]', "Light");
  await page.waitForFunction(() => !document.documentElement.classList.contains("dark"), { timeout: 5000 });
  await shot(page, "11-home-light", true);
  await go(page, "/models"); assert(!(await page.evaluate(() => document.documentElement.classList.contains("dark"))), "light should persist");
  await shot(page, "12-models-light");
});
await step("404 page for unknown model shows not-found UI", async () => { const r = await page.goto(B + "/models/openai/nope", { waitUntil: "networkidle0" }); assert(r.status() === 404, `status ${r.status()}`); assert(await page.evaluate(() => document.body.innerText.includes("Page not found")), "ui"); });
await page.close();

// ───────── Mobile ─────────
const m = await newPage(390, 844);
await step("mobile: home layout has no horizontal overflow", async () => { await go(m, "/"); await shot(m, "13-mobile-home", true);
  const o = await m.evaluate(() => document.documentElement.scrollWidth - window.innerWidth); assert(o <= 1, `overflow ${o}px`); });
await step("mobile: navigation drawer opens and navigates", async () => {
  await m.click('button[aria-label="Open navigation menu"]'); await m.waitForSelector('nav[aria-label="Mobile"]'); await shot(m, "14-mobile-nav");
  await clickText(m, 'nav[aria-label="Mobile"] a', "Rankings"); await m.waitForFunction(() => location.pathname === "/rankings", { timeout: 8000 });
});
await step("mobile: catalog filters drawer applies a filter", async () => {
  await go(m, "/models"); await clickText(m, "button", "Filters"); await m.waitForSelector('[role="dialog"]'); await shot(m, "15-mobile-filters");
  await clickText(m, '[role="dialog"] label', "Free models"); await urlHas(m, "free=1");
  const o = await m.evaluate(() => document.documentElement.scrollWidth - window.innerWidth); assert(o <= 1, `overflow ${o}px`);
});
await step("mobile: model detail & compare fit the viewport", async () => {
  for (const p of ["/models/openai/gpt-4o", "/compare?ids=openai/gpt-4o,anthropic/claude-sonnet-4-5", "/rankings"]) { await go(m, p); const o = await m.evaluate(() => document.documentElement.scrollWidth - window.innerWidth); assert(o <= 1, `${p} overflow ${o}px`); }
  await go(m, "/models/openai/gpt-4o"); await shot(m, "16-mobile-detail");
});
await browser.close(); killSrv();
process.exitCode = results.some((r) => r[0] === "FAIL") ? 1 : 0;

for (const [s, n] of results) console.log(s, n);
console.log(`\n${results.filter((r) => r[0] === "PASS").length}/${results.length} passed`);
const uniq = [...new Set(problems)]; console.log(`\nbrowser problems (${uniq.length}):`); uniq.slice(0, 25).forEach((p) => console.log(" -", p));
