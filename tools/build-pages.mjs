import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const ROOT = path.resolve("D:/Users/l'y'l/Desktop/大模型推荐平台");
const SITE = process.env.SITE || 'https://myaskmate.com';
const TODAY = new Date().toISOString().slice(0, 10);
const B = path.join(ROOT, 'assets/js/');

function load(files) {
  const ctx = {}; ctx.window = ctx; ctx.globalThis = ctx;
  vm.createContext(ctx);
  for (const f of files) vm.runInContext(fs.readFileSync(path.join(B, f), 'utf8'), ctx, { filename: f });
  return ctx;
}
const ctx = load([
  'data/models.js', 'data/models-extra-cn.js', 'data/models-extra-global.js', 'data/models-extra-2.js',
  'data/prices.js', 'data/task-hall.js', 'data/solutions.js', 'data/tasks.js',
  'data/prompts-extra.js', 'data/prompts-pack-1.js', 'data/prompts-pack-2.js',
  'data/prompts-pack-3.js', 'data/prompts-pack-4.js', 'data/prompts-pack-5.js'
]);
const MODELS = (ctx.MP_MODELS || []).concat(ctx.MP_MODELS_EXTRA || []);
const PRICES = (ctx.MP_PRICES && ctx.MP_PRICES.entries) || {};
MODELS.forEach(m => {
  const p = PRICES[m.id];
  if (p) { m.priceIn = p.priceIn; m.priceOut = p.priceOut; m.priceConf = p.conf || m.priceConf; m.priceNote = p.note || m.priceNote; m.syncedAt = ctx.MP_PRICES.updatedAt; }
});
const TASKS = ctx.MP_TASKS || [];
const SOLUTIONS = ctx.MP_SOLUTIONS || [];
const PROMPTS = [];
(ctx.MP_DOMAINS || []).forEach(d => (d.subtasks || []).forEach(s => PROMPTS.push({
  id: s.id, title: s.title, cat: d.name, icon: d.icon || '·', goal: s.goal,
  tags: (d.keywords || []).slice(0, 5), mode: s.mode || [], why: s.advice || '', prompt: s.prompt
})));
(ctx.MP_EXTRA_PROMPTS || []).forEach(p => PROMPTS.push({
  id: p.id, title: p.title, cat: p.cat || '专题', icon: p.icon || '·', goal: p.goal,
  tags: p.tags || [], mode: p.mode || [], why: p.why || '', prompt: p.prompt
}));
(ctx.MP_PROMPT_PACKS || []).forEach(p => PROMPTS.push({
  id: p.id, title: p.title, cat: p.cat || '专题', icon: p.icon || '·', goal: p.goal,
  tags: p.tags || [], mode: p.mode || [], why: p.why || '', prompt: p.prompt
}));
const modelById = {}; MODELS.forEach(m => modelById[m.id] = m);

const PAIRS = [
  ['deepseek-v4-pro', 'qwen3.8-max'],
  ['deepseek-v4-pro', 'kimi-k3.1-pro'],
  ['deepseek-v4-pro', 'glm-5.3'],
  ['qwen3.8-max', 'glm-5.3'],
  ['kimi-k3.1-pro', 'glm-5.3'],
  ['gpt-5.5', 'claude-fable-5'],
  ['gpt-5.5', 'gemini-3.5-pro'],
  ['claude-opus-4.6', 'gpt-5.5'],
  ['claude-fable-5', 'gemini-3.5-pro'],
  ['claude-sonnet-4.6', 'gpt-5.1'],
  ['claude-haiku-4.5', 'gemini-3.5-flash-8b'],
  ['doubao-seed-2.1-pro', 'qwen3.8-max'],
  ['doubao-seed-2.1-pro', 'kimi-k3.1-pro'],
  ['doubao-seed-2.1-turbo', 'qwen3.8-turbo'],
  ['doubao-seed-2.0-turbo', 'qwen3.7-plus'],
  ['deepseek-flash', 'glm-5.3-flash'],
  ['deepseek-flash', 'qwen3.8-flash'],
  ['doubao-seed-2.1-lite', 'gemini-3.5-flash-lite'],
  ['qwen3.8-turbo', 'glm-5.3-air'],
  ['qwen3.7-plus', 'kimi-k3'],
  ['kimi-k3', 'minimax-m3.1'],
  ['gpt-5.5-codex', 'claude-opus-4.6'],
  ['gpt-5.5-codex', 'deepseek-v4-pro'],
  ['qwen3-coder-plus', 'deepseek-v4-pro'],
  ['qwen3-coder-plus', 'kimi-k2.7-code'],
  ['o5', 'gpt-5.5'],
  ['o5', 'claude-opus-4.6'],
  ['o5-pro', 'gpt-5.5-pro'],
  ['gemini-3-pro', 'gpt-5.5'],
  ['glm-5v', 'qwen3.8-vl'],
  ['glm-ocr', 'qwen3.8-vl'],
  ['qwen3-vl-32b', 'gemma-3-27b'],
  ['llama-4.5-behemoth', 'qwen3.8-max'],
  ['llama-4.5-maverick', 'qwen3.8-max'],
  ['qwen3-235b-a22b', 'deepseek-v3.2'],
  ['qwen3-32b', 'llama-4.5-maverick-17b'],
  ['qwen3-8b', 'phi-4-mini'],
  ['gemma-3-9b', 'qwen3-8b'],
  ['glm-4.5-air', 'qwen3-14b'],
  ['mistral-large-3', 'llama-4.5-maverick'],
  ['command-r-plus', 'llama-3.3-70b'],
  ['nova-pro', 'gpt-5.1'],
  ['jamba-2', 'llama-4.5-maverick'],
  ['nemotron-4-340b', 'llama-3.3-70b'],
  ['ernie-5.0', 'glm-5.3'],
  ['spark-x1', 'deepseek-v4-pro'],
  ['hunyuan-turbos', 'glm-5.3-flash'],
  ['step-3', 'minimax-m2.5'],
  ['mistral-small-3', 'phi-4'],
  ['grok-5', 'gpt-5.5']
];
const pairMap = {};
PAIRS.forEach(([a, b]) => {
  if (!modelById[a] || !modelById[b]) { console.warn('skip pair', a, b); return; }
  const key = [a, b].sort().join('|');
  if (pairMap[key]) return;
  pairMap[key] = { a: a, b: b, slug: a + '-vs-' + b };
});
const PAIR_LIST = Object.keys(pairMap).map(k => pairMap[k]);
function pairFor(a, b) { return pairMap[[a, b].sort().join('|')]; }
function pairHref(a, b, prefix) { const p = pairFor(a, b); return p ? prefix + 'compare/' + p.slug + '.html' : null; }
function cap(m) {
  const d = m.dims;
  return d.reasoning * .2 + d.coding * .2 + d.writing * .15 + d.chinese * .15 + d.agent * .1 + d.longctx * .08 + d.vision * .07 + d.math * .05;
}
const promptGroups = {};
PROMPTS.forEach(p => { (promptGroups[p.cat] = promptGroups[p.cat] || []).push(p); });
const promptCats = Object.keys(promptGroups).sort((a, b) => promptGroups[b].length - promptGroups[a].length);

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function num(n) { return (+n).toFixed(2).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1'); }
function ctxText(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(n % 1000000 ? 1 : 0) + 'M';
  return Math.round(n / 1000) + 'K';
}
function tier(t) { return 'L' + t + ' ' + ({ 1: '免费', 2: '轻量', 3: '主力', 4: '旗舰', 5: '顶级' }[t] || ''); }
function confLabel(c) {
  return c === 'official' ? '官方同步价' : (c === 'ref' ? '参考价' : '估算价（下单前核对）');
}
function priceCell(m) {
  if (m.priceIn === 0 && m.priceOut === 0) return m.open ? '开源自托管' : '免费';
  return '¥' + num(m.priceIn) + ' / ¥' + num(m.priceOut) + ' 每百万 tokens';
}
function cost(m, calls, inTok, outTok) {
  if (!m) return '';
  var c = (inTok / 1e6 * m.priceIn + outTok / 1e6 * m.priceOut) * (calls || 1);
  return c === 0 ? '免费 / 自托管' : '约 ¥' + c.toFixed(c < 0.01 ? 4 : 2);
}
function dimBars(m) {
  var labels = { reasoning: '推理', coding: '代码', writing: '写作', chinese: '中文', longctx: '长文本', vision: '视觉', speed: '速度', value: '性价比', agent: 'Agent', math: '数学' };
  return Object.keys(labels).map(k => {
    var v = (m.dims && m.dims[k]) || 0;
    return '<div class="bar"><span>' + labels[k] + '</span><i><b style="width:' + (v * 10) + '%"></b></i><em>' + v.toFixed(1) + '</em></div>';
  }).join('');
}
function chips(arr) { return (arr || []).map(x => '<span class="chip">' + esc(x) + '</span>').join(''); }
function layout(opts) {
  var rel = opts.rel || '';
  var url = SITE + opts.path;
  var json = opts.jsonld ? '<script type="application/ld+json">' + JSON.stringify(opts.jsonld) + '</script>' : '';
  return '<!doctype html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">' +
    '<title>' + esc(opts.title) + ' | 模选 ModelPick</title>' +
    '<meta name="description" content="' + esc(opts.desc) + '">' +
    '<link rel="canonical" href="' + esc(url) + '">' +
    '<meta property="og:type" content="article"><meta property="og:site_name" content="模选 ModelPick">' +
    '<meta property="og:title" content="' + esc(opts.title) + '"><meta property="og:description" content="' + esc(opts.desc) + '">' +
    '<meta property="og:url" content="' + esc(url) + '"><meta property="og:image" content="' + SITE + '/assets/img/og.png">' +
    '<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="' + esc(opts.title) + '">' +
    '<meta name="twitter:description" content="' + esc(opts.desc) + '"><meta name="twitter:image" content="' + SITE + '/assets/img/og.png">' +
    json +
    '<link rel="stylesheet" href="' + rel + 'assets/css/page.css"></head><body>' +
    '<header class="ph"><div class="pw"><a class="plogo" href="' + rel + 'index.html"><b>M</b> 模选 ModelPick</a>' +
    '<nav><a href="' + rel + 'model/index.html">模型</a><a href="' + rel + 'task/index.html">任务</a><a href="' + rel + 'solution/index.html">方案</a><a href="' + rel + 'prompt/index.html">提示词</a></nav></div></header>' +
    '<main class="pw">' + opts.body + '</main>' +
    '<footer class="pf"><div class="pw"><span>模选 ModelPick · 免费、无登录、纯前端</span><a href="' + rel + 'index.html">回到选型首页 →</a></div></footer>' +
    '</body></html>';
}
function write(rel, html) {
  var p = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, html, 'utf8');
}
function modelPage(m) {
  var alts = MODELS.filter(x => x.id !== m.id && x.tier === m.tier).slice(0, 6);
  var body = '<p class="crumb"><a href="../model/index.html">模型库</a> / ' + esc(m.vendor) + '</p>' +
    '<h1>' + esc(m.name) + '</h1><p class="lead">' + esc(m.desc) + '</p>' +
    '<div class="meta"><span>' + esc(m.vendor) + '</span><span>' + tier(m.tier) + '</span><span>' + (m.open ? '开源自托管' : 'API 调用') + '</span><span>' + (m.country === 'CN' ? '国内直连' : '海外服务') + '</span></div>' +
    '<div class="cols"><section class="box"><h2>价格与容量</h2><p class="big">' + priceCell(m) + '</p><p class="muted">' + esc(confLabel(m.priceConf)) + ' · ' + ctxText(m.ctx) + ' 上下文 · 最大输出 ' + ctxText(m.maxOut) + '</p><p class="muted">' + esc(m.priceNote || '') + '</p></section>' +
    '<section class="box"><h2>十维能力</h2>' + dimBars(m) + '</section></div>' +
    '<section><h2>适合什么</h2><ul class="list">' + (m.bestFor || []).map(x => '<li>' + esc(x) + '</li>').join('') + '</ul></section>' +
    '<div class="cols"><section><h2>优势</h2><ul class="list good">' + (m.strengths || []).map(x => '<li>' + esc(x) + '</li>').join('') + '</ul></section>' +
    '<section><h2>注意</h2><ul class="list bad">' + (m.weaknesses || []).map(x => '<li>' + esc(x) + '</li>').join('') + '</ul></section></div>' +
    '<section><h2>可用模式</h2><div class="chips">' + chips(m.modes) + '</div></section>' +
    '<section><h2>常见问题</h2><details open><summary>' + esc(m.name) + ' 多少钱？</summary><p>' + priceCell(m) + '。' + esc(m.priceNote || '') + '</p></details>' +
    '<details><summary>适合什么任务？</summary><p>' + esc((m.bestFor || []).join('、')) + '。</p></details>' +
    '<details><summary>有什么缺点？</summary><p>' + esc((m.weaknesses || []).join('；')) + '。</p></details></section>' +
    '<section><h2>同级对比</h2><div class="cards">' + alts.map(function (x) { var href = pairHref(m.id, x.id, '../') || (x.id + '.html'); return '<a class="card" href="' + esc(href) + '"><b>' + esc(x.name) + '</b><span>' + tier(x.tier) + ' · ' + esc(priceCell(x)) + '</span></a>'; }).join('') + '</div></section>' +
    '<p class="cta"><a class="btn" href="../index.html?model=' + encodeURIComponent(m.id) + '#models">在选型器里打开 ' + esc(m.name) + ' →</a></p>';
  var faq = {
    '@context': 'https://schema.org', '@type': 'FAQPage',
    mainEntity: [
      { '@type': 'Question', name: m.name + ' 多少钱？', acceptedAnswer: { '@type': 'Answer', text: priceCell(m) + '。' + (m.priceNote || '') } },
      { '@type': 'Question', name: m.name + ' 适合什么？', acceptedAnswer: { '@type': 'Answer', text: (m.bestFor || []).join('、') } }
    ]
  };
  write('model/' + m.id + '.html', layout({
    title: m.name + ' 价格、能力与适用场景', desc: m.name + '：' + m.desc + ' ' + priceCell(m) + '。', path: '/model/' + m.id + '.html', rel: '../', body, jsonld: faq
  }));
}
function taskPage(t) {
  var m = modelById[t.model], c = modelById[t.compare];
  var body = '<p class="crumb"><a href="../task/index.html">任务大厅</a> / ' + esc(t.title) + '</p>' +
    '<h1>' + esc(t.title) + '</h1><p class="lead">' + esc(t.desc) + '</p>' +
    '<div class="meta"><span>' + esc(t.level) + '</span><span>' + esc(t.budget) + ' 预算</span><span>' + esc(t.time) + ' 时间</span><span>' + esc(t.tokens) + ' token</span></div>' +
    '<div class="cols"><section class="box"><h2>推荐模型</h2><p class="big"><a href="../model/' + esc(m.id) + '.html">' + esc(m.name) + '</a></p><p class="muted">' + tier(m.tier) + ' · ' + priceCell(m) + '</p></section>' +
    '<section class="box"><h2>这笔账</h2><p class="big">' + cost(m, t.sample.calls, t.sample.inTok, t.sample.outTok) + '</p><p class="muted">' + esc(t.sample.calls) + ' 次调用 · 输入 ' + esc(t.sample.inTok) + ' / 输出 ' + esc(t.sample.outTok) + ' tokens</p>' + (c ? '<p class="muted">对比 ' + esc(c.name) + '：' + cost(c, t.sample.calls, t.sample.inTok, t.sample.outTok) + '</p>' : '') + '</section></div>' +
    '<section><h2>为什么推荐</h2><ol class="list">' + (t.why || []).map(x => '<li>' + esc(x) + '</li>').join('') + '</ol></section>' +
    '<section><h2>直接可用的提示词</h2><pre class="prompt">' + esc(t.prompt) + '</pre><p class="muted">把提示词里的产品、人群和卖点换成你的，再发给模型。</p></section>' +
    '<section><h2>开始这个任务</h2><p class="cta"><a class="btn" href="../index.html?task=' + encodeURIComponent(t.id) + '#pick">让选型器按这个任务生成方案 →</a></p></section>' +
    (c ? '<section><h2>同类任务</h2><div class="cards">' + TASKS.filter(x => x.id !== t.id).slice(0, 4).map(x => '<a class="card" href="' + esc(x.id) + '.html"><b>' + esc(x.title) + '</b><span>' + esc(x.level) + '</span></a>').join('') + '</div></section>' : '');
  write('task/' + t.id + '.html', layout({
    title: t.title + '：推荐模型与提示词', desc: t.desc + ' 推荐 ' + m.name + '，单次' + cost(m, t.sample.calls, t.sample.inTok, t.sample.outTok) + '。', path: '/task/' + t.id + '.html', rel: '../', body,
    jsonld: { '@context': 'https://schema.org', '@type': 'HowTo', name: t.title, description: t.desc, step: (t.why || []).map((x, i) => ({ '@type': 'HowToStep', position: i + 1, text: x })) }
  }));
}
function solutionPage(s) {
  var main = modelById[(s.stack.find(x => x.role === '主模型') || {}).model];
  var body = '<p class="crumb"><a href="../solution/index.html">场景方案</a> / ' + esc(s.title) + '</p>' +
    '<h1>' + esc(s.title) + '</h1><p class="lead">' + esc(s.pain) + '</p>' +
    '<div class="meta"><span>' + esc(s.level) + '</span><span>' + esc(s.keywords.slice(0, 3).join(' · ')) + '</span></div>' +
    '<section><h2>怎么组合</h2><div class="stack">' + s.stack.map(x => '<div class="row"><b>' + esc(x.role) + '</b><span>' + (x.model ? '<a href="../model/' + esc(x.model) + '.html">' + esc((modelById[x.model] || {}).name || x.model) + '</a>' : esc(x.name || '')) + '</span><em>' + esc(x.note) + '</em></div>').join('') + '</div></section>' +
    '<section><h2>步骤</h2><ol class="list">' + (s.steps || []).map(x => '<li>' + esc(x) + '</li>').join('') + '</ol></section>' +
    '<section><h2>单次成本</h2><p class="big">' + (main ? cost(main, s.sample.calls, s.sample.inTok, s.sample.outTok) : '') + '</p><p class="muted">按 ' + esc(s.sample.calls) + ' 次调用、输入 ' + esc(s.sample.inTok) + ' / 输出 ' + esc(s.sample.outTok) + ' tokens 估算</p></section>' +
    '<section><h2>坑</h2><p>' + esc(s.tip) + '</p></section>' +
    '<section><h2>相关方案</h2><div class="cards">' + SOLUTIONS.filter(x => x.id !== s.id).slice(0, 4).map(x => '<a class="card" href="' + esc(x.id) + '.html"><b>' + esc(x.title) + '</b><span>' + esc(x.level) + '</span></a>').join('') + '</div></section>';
  write('solution/' + s.id + '.html', layout({
    title: s.title + '：模型组合与成本', desc: s.pain + ' ' + s.why, path: '/solution/' + s.id + '.html', rel: '../', body
  }));
}
function catSlug(i) { return 'cat-' + String(i + 1).padStart(2, '0'); }
function promptCatPage(cat, i) {
  var items = promptGroups[cat];
  var body = '<p class="crumb"><a href="../prompt/index.html">提示词库</a> / ' + esc(cat) + '</p>' +
    '<h1>' + esc(cat) + '提示词</h1><p class="lead">' + items.length + ' 条可直接套用的结构化提示词。每条都写清角色、输入、任务、约束和输出格式，替换 {{problem}} 即可用。</p>' +
    '<div class="chips">' + chips([...new Set(items.flatMap(x => x.tags || []))].slice(0, 10)) + '</div>' +
    items.map(p => '<article class="pcard" id="' + esc(p.id) + '"><div class="phead"><b>' + esc(p.title) + '</b><span>' + esc((p.mode || []).join(' · ')) + '</span></div>' +
      '<p class="muted">' + esc(p.goal) + '</p><pre class="prompt">' + esc(p.prompt) + '</pre>' +
      (p.why ? '<details><summary>为什么这样写</summary><p>' + esc(p.why) + '</p></details>' : '') + '</article>').join('') +
    '<p class="cta"><a class="btn" href="../index.html?pm=' + encodeURIComponent(items[0].title) + '#prompts">在提示词库里搜索同类 →</a></p>';
  write('prompt/' + catSlug(i) + '.html', layout({
    title: cat + '提示词（' + items.length + ' 条）', desc: cat + '场景的结构化提示词合集，共 ' + items.length + ' 条，含角色、任务、约束与输出格式。', path: '/prompt/' + catSlug(i) + '.html', rel: '../', body,
    jsonld: { '@context': 'https://schema.org', '@type': 'CollectionPage', name: cat + '提示词', description: cat + '场景的结构化提示词合集' }
  }));
}
function comparePage(p) {
  var a = modelById[p.a], b = modelById[p.b];
  if (!a || !b) return;
  var labels = { reasoning: '推理', coding: '代码', writing: '写作', chinese: '中文', longctx: '长文本', vision: '视觉', speed: '速度', value: '性价比', agent: 'Agent', math: '数学' };
  var rows = Object.keys(labels).map(function (k) {
    var av = (a.dims[k] || 0), bv = (b.dims[k] || 0);
    return '<div class="vs-row"><span>' + labels[k] + '</span>' +
      '<div class="vbar"><b style="width:' + (av * 10) + '%"></b><em>A ' + av.toFixed(1) + '</em></div>' +
      '<div class="vbar vb"><b style="width:' + (bv * 10) + '%"></b><em>B ' + bv.toFixed(1) + '</em></div></div>';
  }).join('');
  var sampleIn = 10000, sampleOut = 2000;
  var ca = cost(a, 1, sampleIn, sampleOut), cb = cost(b, 1, sampleIn, sampleOut);
  var scoreA = cap(a), scoreB = cap(b);
  var cheaper = (a.priceIn + a.priceOut) === (b.priceIn + b.priceOut) ? null : ((a.priceIn + a.priceOut) < (b.priceIn + b.priceOut) ? a : b);
  var codingWin = a.dims.coding === b.dims.coding ? null : (a.dims.coding > b.dims.coding ? a : b);
  var longWin = a.ctx === b.ctx ? null : (a.ctx > b.ctx ? a : b);
  var faq = [
    { q: a.name + ' 和 ' + b.name + ' 哪个便宜？', a: cheaper ? (cheaper.name + ' 更便宜：' + priceCell(cheaper) + '。单次 10K 输入 / 2K 输出约为 ' + (cheaper.id === a.id ? ca : cb) + '。') : ('两者价格接近：' + priceCell(a) + ' vs ' + priceCell(b) + '。') },
    { q: a.name + ' 和 ' + b.name + ' 哪个适合写代码？', a: codingWin ? (codingWin.name + ' 的代码能力分更高（' + codingWin.dims.coding.toFixed(1) + ' vs ' + (codingWin.id === a.id ? b.dims.coding : a.dims.coding).toFixed(1) + '），但复杂仓库仍建议先用小样本验证。') : '两者代码能力接近，建议按价格、上下文和工具调用支持来选。' },
    { q: a.name + ' 和 ' + b.name + ' 哪个上下文更长？', a: longWin ? (longWin.name + ' 更长：' + ctxText(longWin.ctx) + '，适合整本书/整份合同。') : '两者上下文一致：' + ctxText(a.ctx) + '。' },
    { q: a.name + ' 和 ' + b.name + ' 能私有化吗？', a: (a.open || b.open) ? ('开源/可私有化：' + [a, b].filter(x => x.open).map(x => x.name).join('、') + '；另一个是 API 调用。') : '两者目前都按 API 调用，不能直接私有化。' }
  ];
  var related = PAIR_LIST.filter(function (x) {
    return x.slug !== p.slug && (x.a === p.a || x.b === p.a || x.a === p.b || x.b === p.b);
  }).slice(0, 6);
  var body = '<p class="crumb"><a href="index.html">模型对比</a> / ' + esc(a.name) + ' vs ' + esc(b.name) + '</p>' +
    '<h1>' + esc(a.name) + ' vs ' + esc(b.name) + '</h1>' +
    '<p class="lead">' + esc(a.name) + ' 和 ' + esc(b.name) + ' 的价格、能力与适用场景对比。先看结论，再看细项。</p>' +
    '<div class="vs-head"><a class="vs-model" href="../model/' + esc(a.id) + '.html"><b>' + esc(a.name) + '</b><span>' + tier(a.tier) + ' · ' + esc(priceCell(a)) + '</span></a>' +
    '<span class="vs-mark">VS</span>' +
    '<a class="vs-model" href="../model/' + esc(b.id) + '.html"><b>' + esc(b.name) + '</b><span>' + tier(b.tier) + ' · ' + esc(priceCell(b)) + '</span></a></div>' +
    '<div class="verdict"><b>一句话结论</b><p>要「' + esc((a.bestFor || [a.desc])[0]) + '」优先看 <strong>' + esc(a.name) + '</strong>；要「' + esc((b.bestFor || [b.desc])[0]) + '」优先看 <strong>' + esc(b.name) + '</strong>。</p>' +
    '<p class="muted">能力分：' + scoreA.toFixed(2) + ' vs ' + scoreB.toFixed(2) + '（自研十维，不是官方 benchmark）。最终按你的预算、上下文和合规要求选。</p></div>' +
    '<h2>价格与规格</h2><table class="vs-table"><thead><tr><th></th><th>' + esc(a.name) + '</th><th>' + esc(b.name) + '</th></tr></thead><tbody>' +
    '<tr><th>等级</th><td>' + tier(a.tier) + '</td><td>' + tier(b.tier) + '</td></tr>' +
    '<tr><th>输入价</th><td>' + esc(priceCell(a)) + '</td><td>' + esc(priceCell(b)) + '</td></tr>' +
    '<tr><th>上下文</th><td>' + ctxText(a.ctx) + '</td><td>' + ctxText(b.ctx) + '</td></tr>' +
    '<tr><th>单次 10K / 2K</th><td>' + esc(ca) + '</td><td>' + esc(cb) + '</td></tr>' +
    '<tr><th>开源 / 私有化</th><td>' + (a.open ? '可私有化' : 'API') + '</td><td>' + (b.open ? '可私有化' : 'API') + '</td></tr>' +
    '</tbody></table>' +
    '<h2>十维能力对比</h2><div class="vs-dims">' + rows + '</div>' +
    '<div class="cols"><section><h2>' + esc(a.name) + ' 的优势</h2><ul class="list good">' + (a.strengths || []).map(x => '<li>' + esc(x) + '</li>').join('') + '</ul><h2>适合</h2><div class="chips">' + chips(a.bestFor) + '</div></section>' +
    '<section><h2>' + esc(b.name) + ' 的优势</h2><ul class="list good">' + (b.strengths || []).map(x => '<li>' + esc(x) + '</li>').join('') + '</ul><h2>适合</h2><div class="chips">' + chips(b.bestFor) + '</div></section></div>' +
    '<h2>怎么选</h2><ul class="list">' +
    '<li><b>预算优先：</b>' + (cheaper ? esc(cheaper.name) + ' 更便宜，单次约 ' + (cheaper.id === a.id ? ca : cb) + '。' : '两者价格接近，按能力与上下文选。') + '</li>' +
    '<li><b>写代码：</b>' + (codingWin ? esc(codingWin.name) + ' 的代码分更高，但先用你的真实仓库做 A/B。' : '两者代码能力接近。') + '</li>' +
    '<li><b>长文档：</b>' + (longWin ? esc(longWin.name) + ' 上下文更长（' + ctxText(longWin.ctx) + '）。' : '两者上下文一致。') + '</li>' +
    '<li><b>合规：</b>' + (a.open || b.open ? '需要私有化时选开源的那个；否则按 API 合规评估。' : '两者都是 API，需评估数据出境与厂商条款。') + '</li></ul>' +
    '<h2>常见问题</h2>' + faq.map(x => '<details><summary>' + esc(x.q) + '</summary><p>' + esc(x.a) + '</p></details>').join('') +
    '<h2>相关对比</h2><div class="cards">' + related.map(x => '<a class="card" href="' + esc(x.slug) + '.html"><b>' + esc(modelById[x.a].name) + ' vs ' + esc(modelById[x.b].name) + '</b><span>' + esc(priceCell(modelById[x.a])) + ' · ' + esc(priceCell(modelById[x.b])) + '</span></a>').join('') + '</div>' +
    '<p class="cta"><a class="btn" href="../index.html?model=' + encodeURIComponent(a.id) + '#models">打开 ' + esc(a.name) + ' 详情 →</a> <a class="btn" href="../index.html?model=' + encodeURIComponent(b.id) + '#models">打开 ' + esc(b.name) + ' 详情 →</a></p>';
  write('compare/' + p.slug + '.html', layout({
    title: a.name + ' vs ' + b.name + '：价格、能力与怎么选',
    desc: a.name + ' 和 ' + b.name + ' 的对比：' + priceCell(a) + ' vs ' + priceCell(b) + '，能力分 ' + scoreA.toFixed(1) + ' vs ' + scoreB.toFixed(1) + '。',
    path: '/compare/' + p.slug + '.html', rel: '../', body,
    jsonld: { '@context': 'https://schema.org', '@graph': [
      { '@type': 'FAQPage', mainEntity: faq.map(x => ({ '@type': 'Question', name: x.q, acceptedAnswer: { '@type': 'Answer', text: x.a } })) },
      { '@type': 'Article', headline: a.name + ' vs ' + b.name + '：价格、能力与怎么选', description: a.desc + ' / ' + b.desc, about: [{ '@type': 'SoftwareApplication', name: a.name }, { '@type': 'SoftwareApplication', name: b.name }] }
    ] }
  }));
}
function compareIndex() {
  var body = '<h1>A vs B 模型对比（' + PAIR_LIST.length + '）</h1><p class="lead">按真实选型场景整理的成对对比：价格、十维能力、上下文、适用场景，最后给一句怎么选。</p><div class="cards">' +
    PAIR_LIST.map(function (p) {
      var a = modelById[p.a], b = modelById[p.b];
      return '<a class="card" href="' + esc(p.slug) + '.html"><b>' + esc(a.name) + ' vs ' + esc(b.name) + '</b><span>' + tier(a.tier) + ' · ' + esc(priceCell(a)) + ' / ' + esc(priceCell(b)) + '</span></a>';
    }).join('') + '</div>';
  write('compare/index.html', layout({
    title: 'A vs B 模型对比：价格、能力、怎么选',
    desc: PAIR_LIST.length + ' 组高频模型对比，按价格、能力、上下文和场景给出结论。',
    path: '/compare/', rel: '../', body,
    jsonld: { '@context': 'https://schema.org', '@type': 'CollectionPage', name: 'A vs B 模型对比' }
  }));
}
function indexPage(kind) {
  var body = '', title = '';
  if (kind === 'model') {
    title = '全部模型';
    body = '<h1>全部模型（' + MODELS.length + '）</h1><p class="lead">按等级分组。每个模型都有独立页：价格、十维能力、适用场景、优缺点和同级对比。</p>';
    [5, 4, 3, 2, 1].forEach(t => {
      var arr = MODELS.filter(m => m.tier === t);
      body += '<section><h2>' + tier(t) + '（' + arr.length + '）</h2><div class="cards">' + arr.map(m => '<a class="card" href="' + esc(m.id) + '.html"><b>' + esc(m.name) + '</b><span>' + esc(m.vendor) + ' · ' + esc(priceCell(m)) + '</span></a>').join('') + '</div></section>';
    });
  } else if (kind === 'task') {
    title = '任务大厅';
    body = '<h1>任务大厅（' + TASKS.length + '）</h1><p class="lead">每个任务都配好推荐模型、成本账和可直接用的提示词。</p><div class="cards">' +
      TASKS.map(t => '<a class="card" href="' + esc(t.id) + '.html"><b>' + esc(t.icon + ' ' + t.title) + '</b><span>' + esc(t.level) + ' · ' + esc(t.desc) + '</span></a>').join('') + '</div>';
  } else if (kind === 'solution') {
    title = '场景方案';
    body = '<h1>场景方案（' + SOLUTIONS.length + '）</h1><p class="lead">主模型 + 省钱替代 + 配套工具，每套都算单次成本。</p><div class="cards">' +
      SOLUTIONS.map(s => '<a class="card" href="' + esc(s.id) + '.html"><b>' + esc(s.icon + ' ' + s.title) + '</b><span>' + esc(s.level) + ' · ' + esc(s.pain) + '</span></a>').join('') + '</div>';
  } else {
    title = '提示词库';
    body = '<h1>提示词库（' + PROMPTS.length + ' 条）</h1><p class="lead">按场景分集合。每条都有角色、任务、约束和输出格式，替换 {{problem}} 即可用。</p><div class="cards">' +
      promptCats.map((c, i) => '<a class="card" href="' + catSlug(i) + '.html"><b>' + esc(c) + '</b><span>' + promptGroups[c].length + ' 条 · ' + esc([...new Set(promptGroups[c].flatMap(x => x.tags || []))].slice(0, 3).join(' / ')) + '</span></a>').join('') + '</div>';
  }
  write(kind + '/index.html', layout({ title: title + ' | 模选 ModelPick', desc: title + '：' + MODELS.length + ' 个模型、' + TASKS.length + ' 个任务、' + SOLUTIONS.length + ' 套方案、' + PROMPTS.length + ' 条提示词。', path: '/' + kind + '/', rel: '../', body }));
}

MODELS.forEach(modelPage);
TASKS.forEach(taskPage);
SOLUTIONS.forEach(solutionPage);
promptCats.forEach(promptCatPage);
['model', 'task', 'solution', 'prompt'].forEach(indexPage);
PAIR_LIST.forEach(comparePage);
compareIndex();

// main index canonical / OG / JSON-LD is handled separately.
var urls = [SITE + '/', SITE + '/model/', SITE + '/task/', SITE + '/solution/', SITE + '/prompt/', SITE + '/compare/'];
MODELS.forEach(m => urls.push(SITE + '/model/' + m.id + '.html'));
TASKS.forEach(t => urls.push(SITE + '/task/' + t.id + '.html'));
SOLUTIONS.forEach(s => urls.push(SITE + '/solution/' + s.id + '.html'));
promptCats.forEach((c, i) => urls.push(SITE + '/prompt/' + catSlug(i) + '.html'));
PAIR_LIST.forEach(p => urls.push(SITE + '/compare/' + p.slug + '.html'));
var sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
  urls.map(u => '  <url><loc>' + esc(u) + '</loc><lastmod>' + TODAY + '</lastmod></url>').join('\n') + '\n</urlset>\n';
write('sitemap.xml', sitemap);
write('robots.txt', 'User-agent: *\nAllow: /\nSitemap: ' + SITE + '/sitemap.xml\n');

var notFound = '<h1>404</h1><p class="lead">这个页面不存在，或者已经被移动。</p><p class="cta"><a class="btn" href="index.html">回到选型首页 →</a></p><p class="muted">你可以从 <a href="model/index.html">模型库</a>、<a href="task/index.html">任务大厅</a>、<a href="prompt/index.html">提示词库</a> 重新找。</p>';
write('404.html', layout({ title: '页面不存在', desc: '页面不存在', path: '/404.html', rel: '', body: notFound }));

console.log(JSON.stringify({ models: MODELS.length, tasks: TASKS.length, solutions: SOLUTIONS.length, prompts: PROMPTS.length, promptCats: promptCats.length, urls: urls.length }, null, 2));
