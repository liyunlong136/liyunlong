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
    '<section><h2>同级对比</h2><div class="cards">' + alts.map(x => '<a class="card" href="' + esc(x.id) + '.html"><b>' + esc(x.name) + '</b><span>' + tier(x.tier) + ' · ' + esc(priceCell(x)) + '</span></a>').join('') + '</div></section>' +
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

// main index canonical / OG / JSON-LD is handled separately.
var urls = [SITE + '/', SITE + '/model/', SITE + '/task/', SITE + '/solution/', SITE + '/prompt/'];
MODELS.forEach(m => urls.push(SITE + '/model/' + m.id + '.html'));
TASKS.forEach(t => urls.push(SITE + '/task/' + t.id + '.html'));
SOLUTIONS.forEach(s => urls.push(SITE + '/solution/' + s.id + '.html'));
promptCats.forEach((c, i) => urls.push(SITE + '/prompt/' + catSlug(i) + '.html'));
var sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
  urls.map(u => '  <url><loc>' + esc(u) + '</loc><lastmod>' + TODAY + '</lastmod></url>').join('\n') + '\n</urlset>\n';
write('sitemap.xml', sitemap);
write('robots.txt', 'User-agent: *\nAllow: /\nSitemap: ' + SITE + '/sitemap.xml\n');

var notFound = '<h1>404</h1><p class="lead">这个页面不存在，或者已经被移动。</p><p class="cta"><a class="btn" href="index.html">回到选型首页 →</a></p><p class="muted">你可以从 <a href="model/index.html">模型库</a>、<a href="task/index.html">任务大厅</a>、<a href="prompt/index.html">提示词库</a> 重新找。</p>';
write('404.html', layout({ title: '页面不存在', desc: '页面不存在', path: '/404.html', rel: '', body: notFound }));

console.log(JSON.stringify({ models: MODELS.length, tasks: TASKS.length, solutions: SOLUTIONS.length, prompts: PROMPTS.length, promptCats: promptCats.length, urls: urls.length }, null, 2));
