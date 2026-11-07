#!/usr/bin/env node
/* 价格同步：抓取各平台公开定价页，生成 assets/js/data/prices.js 与 prices.json
   用法：
     node tools/sync-prices.mjs --check   只检查，不写文件
     node tools/sync-prices.mjs --apply   写入（默认）
   设计原则：只覆盖能稳定解析的官方来源；解析失败就保留原值，不猜测。 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_JS = path.join(ROOT, 'assets/js/data/prices.js');
const OUT_JSON = path.join(ROOT, 'assets/js/data/prices.json');
const FX = 7.1;
const UA = { 'user-agent': 'Mozilla/5.0 (ModelPick price sync; +local)', 'accept-language': 'zh-CN,zh;q=0.9,en;q=0.8' };

const SOURCES = [
  { id: 'zhipu', name: '智谱开放平台', url: 'https://docs.bigmodel.cn/cn/guide/start/pricing.md', kind: 'zhipu' },
  { id: 'volc', name: '火山方舟', url: 'https://ark.volcengine.com/region:cn-beijing/docs/model-pricing.md', kind: 'volc' },
  { id: 'deepseek', name: 'DeepSeek 官方', url: 'https://api-docs.deepseek.com/quick_start/pricing', kind: 'deepseek' },
  { id: 'hunyuan', name: '腾讯混元', url: 'https://cloud.tencent.com/document/product/1729/97731', kind: 'hunyuan' }
];

function clean(html) {
  return String(html)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ').trim();
}
function num(s) {
  var t = String(s).replace(/[¥$,\s]/g, '').replace(/元.*$/, '');
  if (!/^\d+(\.\d+)?$/.test(t)) return null;
  return +t;
}
function put(entries, id, priceIn, priceOut, source, note, conf) {
  if (!id || priceIn == null || priceOut == null) return;
  if (priceIn < 0 || priceOut < 0) return;
  entries[id] = { priceIn: +priceIn.toFixed(3), priceOut: +priceOut.toFixed(3), source: source, conf: conf || 'official', note: note };
}

function parseZhipu(md, entries) {
  var map = {
    'GLM-5.3': 'glm-5.3', 'GLM-5.3-Flash': 'glm-5.3-flash', 'GLM-5.3-FlashX': 'glm-5.3-flashx',
    'GLM-5.2': 'glm-5.2', 'GLM-5.1': 'glm-5.1', 'GLM-4.7-Flash': 'glm-4.7-flash', 'GLM-4.7': 'glm-4.7',
    'GLM-5V-Turbo': 'glm-5v-turbo', 'GLM-OCR': 'glm-ocr'
  };
  var lines = md.split(/\r?\n/), seen = {}, count = 0;
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i].trim();
    if (!line.startsWith('|')) continue;
    var cells = line.split('|').map(function (s) { return s.trim(); });
    // ['', name, ctx, in, out, cacheStore, cacheHit, '']
    var name = cells[1], id = map[name];
    if (!id || seen[id]) continue;
    if (!/^\|?\s*-{2,}/.test(line) && cells.length >= 6) {
      var pIn = num(cells[3]), pOut = num(cells[4]);
      if (pIn === 0 && pOut === 0) { put(entries, id, 0, 0, 'zhipu', '官方免费'); seen[id] = 1; count++; }
      else if (pIn != null && pOut != null) { put(entries, id, pIn, pOut, 'zhipu', '每日同步：智谱官方价'); seen[id] = 1; count++; }
    }
  }
  return count;
}

function parseVolc(md, entries) {
  var map = {
    'doubao-seed-2.1-pro': 'doubao-seed-2.1-pro',
    'doubao-seed-2.1-lite': 'doubao-seed-2.1-lite',
    'doubao-seed-2.1-turbo': 'doubao-seed-2.1-turbo',
    'doubao-seed-2.0-code': 'doubao-seed-2-code',
    'kimi-k3.1-pro': 'kimi-k3.1-pro',
    'glm-5.3-flash': 'glm-5.3-flash',
    'glm-5.2': 'glm-5.2',
    'doubao-seed-evolving': 'doubao-seed-evolving',
    'doubao-seed-2.0-mini': 'doubao-seed-2.0-mini'
  };
  var lines = md.split(/\r?\n/), on = false, seen = {}, count = 0;
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i].trim();
    if (line.indexOf('在线推理（常规）') >= 0) { on = true; continue; }
    if (on && /^#{1,3}\s/.test(line) && line.indexOf('在线推理') < 0) { on = false; continue; }
    if (!on || !line.startsWith('|')) continue;
    var cells = line.split('|').map(function (s) { return s.trim(); });
    var name = cells[1];
    var id = map[name];
    if (!id || seen[id]) continue;
    // |name|condition|in|audioIn|cacheStore|cacheHit|audioHit|out|
    if (cells.length < 9) continue;
    var pIn = num(cells[3]), pOut = num(cells[8]);
    if (pIn == null || pOut == null) continue;
    put(entries, id, pIn, pOut, 'volc', '每日同步：火山方舟在线推理价');
    seen[id] = 1; count++;
  }
  return count;
}

function parseHunyuan(html, entries) {
  var t = clean(html);
  var m = t.match(/Hunyuan-a13b\s*输入：([\d.]+)元\s*输出：([\d.]+)元/);
  if (!m) return 0;
  put(entries, 'hunyuan-a13b', +m[1], +m[2], 'hunyuan', '每日同步：腾讯云刊例价');
  return 1;
}

function parseDeepSeek(html, entries) {
  var t = clean(html);
  var re = /1M INPUT TOKENS \(CACHE MISS\) OFF-PEAK \$([\d.]+) \$([\d.]+) PEAK \$([\d.]+) \$([\d.]+) 1M OUTPUT TOKENS OFF-PEAK \$([\d.]+) \$([\d.]+) PEAK \$([\d.]+) \$([\d.]+)/i;
  var m = t.match(re);
  if (!m) return 0;
  var flashIn = +m[1] * FX, flashOut = +m[5] * FX;
  var proIn = +m[2] * FX, proOut = +m[6] * FX;
  put(entries, 'deepseek-flash', flashIn, flashOut, 'deepseek', '每日同步：官方 USD 价 × 7.1（空闲时段）');
  put(entries, 'deepseek-v4-pro', proIn, proOut, 'deepseek', '每日同步：官方 USD 价 × 7.1（空闲时段）');
  return 2;
}

async function fetchText(url) {
  var r = await fetch(url, { headers: UA, signal: AbortSignal.timeout(20000), redirect: 'follow' });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  return await r.text();
}

async function main() {
  var apply = process.argv.indexOf('--check') < 0;
  var entries = {}, report = [];
  // 先读旧值：某个来源解析失败时保留上一次的价格，不让它消失
  try {
    var old = JSON.parse(await fs.readFile(OUT_JSON, 'utf8'));
    if (old && old.entries) entries = Object.assign({}, old.entries);
  } catch (e) { }
  for (var i = 0; i < SOURCES.length; i++) {
    var s = SOURCES[i];
    try {
      var text = await fetchText(s.url);
      var n = s.kind === 'zhipu' ? parseZhipu(text, entries)
        : s.kind === 'volc' ? parseVolc(text, entries)
        : s.kind === 'hunyuan' ? parseHunyuan(text, entries)
        : parseDeepSeek(text, entries);
      report.push({ id: s.id, name: s.name, url: s.url, ok: n > 0, count: n, fetchedAt: new Date().toISOString() });
      console.log('[ok] ' + s.name + ' parsed=' + n);
    } catch (e) {
      report.push({ id: s.id, name: s.name, url: s.url, ok: false, count: 0, error: String(e.message || e) });
      console.log('[fail] ' + s.name + ': ' + (e.message || e));
    }
  }
  var payload = {
    updatedAt: new Date().toISOString(),
    fx: FX,
    entries: entries,
    sources: report
  };
  var json = JSON.stringify(payload, null, 2);
  var js = '/* 自动生成：node tools/sync-prices.mjs --apply */\nwindow.MP_PRICES = ' + json + ';\n';
  if (apply) {
    await fs.writeFile(OUT_JSON, json, 'utf8');
    await fs.writeFile(OUT_JS, js, 'utf8');
    console.log('wrote ' + Object.keys(entries).length + ' prices -> ' + path.relative(ROOT, OUT_JS));
  } else {
    console.log(JSON.stringify(entries, null, 2));
  }
  var failed = report.filter(function (r) { return !r.ok; });
  if (failed.length === SOURCES.length) process.exitCode = 2;
}

main().catch(function (e) { console.error(e); process.exit(1); });
