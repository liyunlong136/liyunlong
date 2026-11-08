/* 界面逻辑：纯原生 JS，无构建、无依赖，可直接双击 index.html 打开。 */
(function () {
  'use strict';
  var MODELS = (window.MP_MODELS || []).concat(window.MP_MODELS_EXTRA || []);
  var SOLUTIONS = window.MP_SOLUTIONS || [];
  var TASKS = window.MP_TASKS || [];
  var ALGOS = window.MP_ALGOS || [];
  var DOMAINS = window.MP_DOMAINS || [];
  var META = window.MP_META || {};
  var E = window.MPEngine;
  var CLIP = {};
  var clipSeq = 0;

  var state = {
    view: 'pick', plan: null, route: 'quality', files: [], autoProblem: '',
    allowRelax: false,
    audience: (function () { try { return localStorage.getItem('mp_audience') || 'beginner'; } catch (e) { return 'beginner'; } })(),
    callsPerDay: (function () { try { return Math.max(1, Number(localStorage.getItem('mp_calls_per_day') || 20)); } catch (e) { return 20; } })(),
    lib: { country: 'all', tier: 'all', flag: 'all', q: '', sort: 'power' },
    algo: { cat: '全部', q: '' },
    prompt: { cat: 'all', q: '', limit: 48 }
  };
  var priceCheck = null; // 最近一次「检查更新」结果：{ status: 'ok' | 'error', msg }
  var MAX_FILES = 3, MAX_SIZE = 15 * 1024 * 1024;
  var promptPacksLoaded = false, promptPacksLoading = false;
  function ensurePrompts(cb) {
    if (promptPacksLoaded) { if (cb) cb(); return; }
    if (promptPacksLoading) { setTimeout(function () { ensurePrompts(cb); }, 120); return; }
    promptPacksLoading = true;
    var files = ['prompts-pack-1', 'prompts-pack-2', 'prompts-pack-3', 'prompts-pack-4', 'prompts-pack-5'];
    var left = files.length;
    files.forEach(function (name) {
      var s = document.createElement('script');
      s.src = 'assets/js/data/' + name + '.js';
      s.onload = s.onerror = function () {
        if (--left === 0) {
          promptPacksLoaded = true;
          promptPacksLoading = false;
          if (window.MPPrompt && MPPrompt.all.clearCache) MPPrompt.all.clearCache();
          if (cb) cb();
        }
      };
      document.body.appendChild(s);
    });
  }

  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function fmt(n) { return E.fmt(n); }
  function pct(v) { return Math.max(4, Math.min(100, Math.round(v * 10))); }

  function toast(msg) {
    var t = $('toast');
    t.textContent = msg; t.classList.add('show');
    clearTimeout(t._timer);
    t._timer = setTimeout(function () { t.classList.remove('show'); }, 2200);
  }

  function copyText(text, okMsg) {
    var msg = okMsg || '已复制';
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(function () { toast(msg); }, function () { fallbackCopy(text, msg); });
    } else fallbackCopy(text, msg);
  }
  function fallbackCopy(text, okMsg) {
    var ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); toast(okMsg || '已复制'); } catch (e) { toast('复制失败，请手动选择'); }
    document.body.removeChild(ta);
  }
  function copyBtn(text, label) {
    var k = 'c' + (++clipSeq); CLIP[k] = text;
    return '<button class="btn btn-sm copy-btn" data-copy="' + k + '">' + esc(label || '复制') + '</button>';
  }

  /* ================= 附件 ================= */
  function extLabel(name) {
    var m = /\.([a-z0-9]+)$/i.exec(name || '');
    return m ? m[1].toUpperCase().slice(0, 4) : 'FILE';
  }
  function renderFiles() {
    var box = $('fileList');
    if (!box) return;
    box.innerHTML = state.files.map(function (f) {
      var status = f.status === 'reading' ? '解析中…' : ((f.status === 'error' || f.status === 'meta') ? '仅元数据' : '已解析');
      var meta = f.status === 'reading' ? (f.sizeText || '') : (f.brief || f.sizeText || '');
      return '<div class="file-chip" data-fid="' + esc(f.id) + '">' +
        '<span class="fc-ico">' + esc(extLabel(f.name)) + '</span>' +
        '<span class="fc-main"><b>' + esc(f.name) + '</b><span>' + esc(meta) + '</span></span>' +
        '<span class="fc-status ' + (f.status === 'error' ? 'err' : '') + '">' + esc(status) + '</span>' +
        '<button class="fc-del" data-del="' + esc(f.id) + '" title="移除" aria-label="移除">×</button>' +
        '</div>';
    }).join('');
  }
  function renderFileAnalysis() {
    var box = $('fileAnalysis');
    if (!box) return;
    var ok = state.files.filter(function (f) { return f.status !== 'reading'; });
    if (!ok.length) { box.innerHTML = ''; return; }
    var rows = ok.map(function (f) {
      var tag = f.status === 'error' ? '仅读取了文件信息' : (f.typeLabel || f.kind || '');
      return '<div class="fa-row"><i>' + esc(extLabel(f.name)) + '</i><b title="' + esc(f.name) + '">' + esc(f.name) + '</b>' +
        '<span>' + esc(tag) + (f.chars ? ' · 约 ' + f.chars + ' 字' : '') + (f.needsVision ? ' · 需要视觉' : '') + '</span></div>';
    }).join('');
    var vision = ok.some(function (f) { return f.needsVision; });
    var parsed = ok.filter(function (f) { return f.status !== 'error'; }).length;
    var failedCount = ok.length - parsed;
    box.innerHTML = '<div class="fa-head"><b>已读取 ' + parsed + ' 个附件' + (failedCount ? ' · ' + failedCount + ' 个未读到正文' : '') + '</b>' +
      '<span>' + (vision ? '会自动按「需要视觉」筛选模型' : '已按附件篇幅调整上下文门槛') + '</span>' +
      '<button class="btn btn-sm" id="useFileBtn">用附件生成问题描述</button></div>' +
      rows +
      (failedCount ? '<div class="fa-note" style="color:#fca5a5">有附件正文读取失败：生成前会让你确认，避免推荐偏离实际内容。</div>' : '') +
      '<div class="fa-note">文件只在本机解析，不会上传；选定模型后请把原文件拖进它的对话框，提示词里已写好附件说明。</div>';
  }
  function syncAutoProblem(force) {
    if (!state.files.length || !window.MPFile) return;
    var cur = $('problemInput').value.trim();
    if (!force && cur && cur !== state.autoProblem) return;
    state.autoProblem = window.MPFile.suggestProblem(state.files);
    $('problemInput').value = state.autoProblem;
    $('charCount').textContent = state.autoProblem.length + ' 字';
  }
  async function ingestFiles(fileList) {
    if (!window.MPFile) { toast('文件解析模块未加载'); return; }
    var arr = Array.prototype.slice.call(fileList || []);
    for (var i = 0; i < arr.length; i++) {
      if (state.files.length >= MAX_FILES) { toast('最多 3 个文件'); break; }
      var file = arr[i];
      if (file.size > MAX_SIZE) { toast(file.name + ' 超过 15MB'); continue; }
      var seed = { id: 'f' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), name: file.name, size: file.size, sizeText: window.MPFile.fmtSize(file.size), status: 'reading' };
      state.files.push(seed); renderFiles();
      try {
        var res = await window.MPFile.analyze(file);
        res.id = seed.id;
        Object.assign(seed, res);
        if (seed.status !== 'error' && seed.status !== 'meta') seed.status = 'ok';
      } catch (e) {
        seed.status = 'error'; seed.brief = seed.sizeText + ' · 解析失败';
      }
      renderFiles();
    }
    renderFileAnalysis();
    syncAutoProblem(false);
  }
  function removeFile(id) {
    state.files = state.files.filter(function (f) { return f.id !== id; });
    if (state.files.length && state.autoProblem && $('problemInput').value.trim() === state.autoProblem) {
      syncAutoProblem(true);
    } else if (!state.files.length && $('problemInput').value.trim() === state.autoProblem) {
      $('problemInput').value = ''; $('charCount').textContent = '0 字';
      state.autoProblem = '';
    }
    renderFiles(); renderFileAnalysis();
  }

  /* ================= 任务大厅 ================= */
  function taskCost(t) {
    var m = modelById(t.model);
    if (!m) return null;
    var per = E.estimateCost(m, t.sample.inTok, t.sample.outTok);
    return { m: m, per: per, total: per * (t.sample.calls || 1) };
  }
  function renderTaskHall() {
    var box = $('taskGrid');
    if (!box) return;
    box.innerHTML = TASKS.map(function (t) {
      var c = taskCost(t);
      return '<article class="task-card js-task" data-task="' + esc(t.id) + '" tabindex="0">' +
        '<div class="tc-top"><span class="tc-icon">' + esc(t.icon) + '</span><span class="tc-level">' + esc(t.level) + '</span></div>' +
        '<h3>' + esc(t.title) + '</h3><p>' + esc(t.desc) + '</p>' +
        '<div class="tc-foot"><span>约 ¥' + fmt(c ? c.total : 0, 2) + ' / ' + t.sample.calls + ' 次</span>' +
        '<span>' + esc(c ? c.m.name : '') + '</span></div></article>';
    }).join('');
  }
  function openWhy(id) {
    var t = TASKS.filter(function (x) { return x.id === id; })[0];
    if (!t) return;
    var c = taskCost(t);
    var altModel = modelById(t.compare);
    var altTotal = altModel ? E.estimateCost(altModel, t.sample.inTok, t.sample.outTok) * t.sample.calls : 0;
    var save = altTotal > 0 ? Math.round((1 - c.total / altTotal) * 100) : 0;
    $('whyTitle').textContent = t.title;
    $('whySub').textContent = '推荐 ' + (c ? c.m.name + ' · L' + c.m.tier : t.level);
    $('whyBody').innerHTML =
      '<div class="why-grid">' +
      '<div class="why-box"><span>这个任务大约</span><b>' + (c.total <= 0 ? '免费' : '¥' + fmt(c.total, 3)) + ' / ' + t.sample.calls + ' 次</b><i>按 ' + t.sample.calls + ' 次估算</i></div>' +
      '<div class="why-box"><span>换成 ' + esc(altModel ? altModel.name : '旗舰') + '</span><b>¥' + fmt(altTotal, 2) + '</b><i>' +
      (c.total <= 0 ? '从 0 到付费' : '约贵 ' + Math.round(altTotal / c.total) + ' 倍') + '</i></div>' +
      '<div class="why-box accent"><span>用推荐方案省</span><b>' + (save > 0 ? save + '%' : '—') + '</b><i>效果差距要用 A/B 验证</i></div>' +
      '</div>' +
      '<h4>为什么推荐它</h4><ul class="why-list">' + t.why.map(function (w) { return '<li>' + esc(w) + '</li>'; }).join('') + '</ul>' +
      '<div class="why-note">成本按公开价快照估算，实际受缓存、Batch、阶梯计价影响；「省多少」不等于「效果差多少」。</div>' +
      '<div class="why-actions"><button class="btn btn-primary" data-start-task="' + esc(t.id) + '">开始这个任务</button>' +
      '<button class="btn btn-ghost" data-view="solutions">看相关方案</button></div>';
    if (window.MPTrack) MPTrack.event('task_open', { id: t.id });
    if ($('whyDlg').open) $('whyDlg').close();
    $('whyDlg').showModal();
  }
  function startTask(id) {
    var t = TASKS.filter(function (x) { return x.id === id; })[0];
    if (!t) return;
    $('problemInput').value = t.prompt;
    $('charCount').textContent = t.prompt.length + ' 字';
    try {
      document.querySelector('input[name=budget][value="' + t.budget + '"]').checked = true;
      document.querySelector('input[name=time][value="' + t.time + '"]').checked = true;
      document.querySelector('input[name=tokens][value="' + t.tokens + '"]').checked = true;
    } catch (e) { }
    $('whyDlg').close();
    showView('pick');
    if (window.MPTrack) MPTrack.event('task_start', { id: id });
    setTimeout(function () { runPlan(); }, 120);
  }

  /* ================= 导航 ================= */
  function showView(name, replace) {
    state.view = name;
    document.querySelectorAll('.view').forEach(function (v) { v.classList.toggle('active', v.id === 'view-' + name); });
    document.querySelectorAll('.tab').forEach(function (t) { t.classList.toggle('active', t.getAttribute('data-view') === name); });
    try {
      if (location.hash !== '#' + name) {
        if (replace) history.replaceState(null, '', '#' + name);
        else history.pushState(null, '', '#' + name);
      }
    } catch (e) {
      try { location.hash = name; } catch (err) { }
    }
    if (window.MPTrack) MPTrack.event('view', { name: name });
    if (name === 'about' && typeof renderAboutTrack === 'function') renderAboutTrack();
    if (name === 'prompts') {
      ensurePrompts(function () {
        renderPromptFilters();
        renderPrompts();
        if ($('heroTasks')) $('heroTasks').innerHTML = allPrompts().length + '<em>套</em>';
        renderAbout();
      });
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /* ================= 分享链接 & 本地历史 ================= */

  /* ================= 选型 ================= */
  function readForm() {
    var problem = $('problemInput').value.trim();
    if (problem.length < 6 && !state.files.length) {
      $('formErr').classList.add('show'); return null;
    }
    $('formErr').classList.remove('show');
    if (problem.length < 6) {
      problem = window.MPFile ? window.MPFile.suggestProblem(state.files) : '请分析我上传的文件，找出关键问题并给出建议';
      $('problemInput').value = problem;
      $('charCount').textContent = problem.length + ' 字';
    }
    var budget = document.querySelector('input[name=budget]:checked').value;
    var time = document.querySelector('input[name=time]:checked').value;
    var tokens = document.querySelector('input[name=tokens]:checked').value;
    var need = {};
    document.querySelectorAll('.check input:checked').forEach(function (c) { need[c.value] = true; });
    return {
      problem: problem, budget: budget, time: time, tokens: tokens,
      lang: 'zh', region: 'cn', local: !!need.local,
      requireVision: !!need.vision, requireAudio: !!need.audio,
      requireVideo: !!need.video,
      requireCtx: need.longdoc ? 200000 : 0,
      domainId: $('domainSelect').value || '',
      need: need, files: state.files.slice(),
      allowRelax: !!state.allowRelax
    };
  }

  function runPlan(auto, instant, forceFiles) {
    if (state.files.some(function (x) { return x.status === 'reading'; })) {
      toast('附件还在解析，稍等一两秒'); return;
    }
    var failedFiles = state.files.filter(function (x) { return x.status === 'error'; });
    if (failedFiles.length && !forceFiles) { showFileParseError(failedFiles); return; }
    var f = readForm();
    if (!f) return;
    var btn = $('runBtn'); btn.disabled = true; btn.textContent = '正在拆解与匹配…';
    setTimeout(function () {
      try {
        var plan = E.buildPlan(f.problem, f);
        state.plan = plan;
        state.route = plan.routeKey;
        renderResults();
        var el = $('results');
        if (el && !auto) {
          if (instant) {
            // CSS 里 html{scroll-behavior:smooth} 会把 auto 也变成动画，这里临时关掉
            var de = document.documentElement, prev = de.style.scrollBehavior;
            de.style.scrollBehavior = 'auto';
            el.scrollIntoView({ block: 'start' });
            de.style.scrollBehavior = prev;
          } else {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }
      } catch (err) {
        console.error(err);
        showResultError('生成失败', err && err.message ? err.message : String(err), function () { runPlan(false, true, forceFiles); });
      } finally {
        btn.disabled = false; btn.textContent = '生成选型方案';
      }
    }, 60);
  }

  function showFileParseError(failed) {
    var box = $('results');
    if (!box) return;
    var names = failed.map(function (f) { return f.name; }).join('、');
    box.innerHTML = '<div class="error-state">' +
      '<div class="es-head"><b>有 ' + failed.length + ' 个附件没有读到正文</b>' +
      '<span>只拿到了文件信息（名称、大小），没有解析出内容</span></div>' +
      '<p>受影响：' + esc(names) + '</p>' +
      '<p>基于这些附件生成方案，推荐只能按文件名和篇幅估算，可能和实际内容对不上。扫描版 PDF、加密文档、特殊编码的 Office 文件最容易出现这种情况。</p>' +
      '<div class="actions">' +
      '<button class="btn btn-primary" id="retryFilesBtn">重新选择文件</button>' +
      '<button class="btn" id="removeFailedFilesBtn">移除这些附件</button>' +
      '<button class="btn btn-ghost" id="forceRunBtn">仍然生成（按文件名与问题推荐）</button>' +
      '</div>' +
      '<div class="hint-line" style="margin:8px 0 0">更稳的做法：扫描件先转成清晰图片，或另存成可复制文字的 PDF 再上传。</div>' +
      '</div>';
    box.scrollIntoView({ behavior: 'smooth', block: 'start' });
    $('retryFilesBtn').addEventListener('click', function () { $('fileInput').click(); });
    $('removeFailedFilesBtn').addEventListener('click', function () {
      failed.forEach(function (f) { removeFile(f.id); });
      runPlan(false, true);
    });
    $('forceRunBtn').addEventListener('click', function () { runPlan(false, true, true); });
  }

  function showResultError(title, detail, retry) {
    var box = $('results');
    if (!box) return;
    box.innerHTML = '<div class="error-state">' +
      '<div class="es-head"><b>' + esc(title) + '</b><span>这次没有生成结果；可以重试，或复制错误信息排查</span></div>' +
      '<p class="es-detail">' + esc(detail || '未知错误') + '</p>' +
      '<div class="actions"><button class="btn btn-primary" id="retryResultBtn">重试</button>' +
      '<button class="btn btn-ghost" id="copyErrBtn">复制错误信息</button></div>' +
      '</div>';
    box.scrollIntoView({ behavior: 'smooth', block: 'start' });
    $('retryResultBtn').addEventListener('click', retry || function () { runPlan(false, true); });
    $('copyErrBtn').addEventListener('click', function () { copyText(title + '：' + (detail || '')); });
  }

  var EXCLUDE_LABELS = {
    local: '必须私有化', ctx: '上下文不足', vision: '不支持图片',
    audio: '不支持音频', video: '不支持视频', free: '零预算', other: '其他硬条件'
  };
  function exclusionNoteHtml(plan) {
    if (plan.relaxed) return '';
    var ex = plan.excluded || {};
    var keys = Object.keys(ex).filter(function (k) { return ex[k] > 0; });
    var total = plan.excludedTotal || 0;
    if (!keys.length || !total) return '';
    var parts = keys.map(function (k) { return (EXCLUDE_LABELS[k] || k) + ' ' + ex[k] + ' 个'; }).join(' · ');
    return '<div class="exclude-note"><b>已按硬性条件排除 ' + total + ' 个模型</b>' +
      '<span>' + esc(parts) + '</span>' +
      '<span class="hint-inline">这些模型在部分步骤不满足条件，下面只用满足条件的模型；勾选越少，候选越多。</span></div>';
  }

  function routePicks(plan, key) {
    return plan.routes[key].picks;
  }

  function showScoreAudit(audit) {
    var a = audit || {};
    var list = function (arr) {
      return (arr && arr.length) ? '<ul class="list">' + arr.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>' : '<p class="muted">没有记录</p>';
    };
    $('scoreBody').innerHTML =
      '<p><b>匹配依据</b></p>' + list(a.matched) +
      '<p><b>还没有验证</b></p>' + list(a.unverified) +
      '<p><b>数据来源</b></p><p class="muted">' + esc(a.source || '自研十维') + ' · 评估日 ' + esc(a.evaluatedAt || '—') + '</p>' +
      '<div class="dlg-note">' + esc(a.caveat || '这是规则匹配分，不是成功率，也不是官方 benchmark。') + '</div>';
    var d = $('scoreDlg');
    if (d && !d.open) d.showModal();
  }

  function bindScoreHelp(root) {
    if (!root) return;
    root.querySelectorAll('.score-help').forEach(function (b) {
      b.addEventListener('click', function (e) {
        e.stopPropagation();
        var a = {};
        try { a = JSON.parse(b.getAttribute('data-audit') || '{}'); } catch (err) { }
        showScoreAudit(a);
      });
    });
  }

  function hardConstraintHtml(conflicts) {
    var labels = {
      local: '必须私有化：闭源模型被排除',
      ctx: '上下文不足：部分模型装不下你的资料',
      vision: '必须支持图片输入',
      audio: '必须支持音频输入',
      video: '必须支持视频输入',
      free: '零预算：自托管/付费 API 被排除'
    };
    var list = Object.keys(conflicts).map(function (k) {
      return '<li><b>' + esc(labels[k] || k) + '</b><span>' + conflicts[k] + ' 个模型因此被排除</span></li>';
    }).join('');
    return '<div class="hard-empty">' +
      '<h3>暂无符合硬性条件的模型</h3>' +
      '<p>系统没有自动放宽条件。你可以逐项取消，或明确同意放宽后重新搜索。</p>' +
      '<ul class="conflict-list">' + list + '</ul>' +
      '<div class="actions">' +
      '<button class="btn btn-primary" id="allowRelaxBtn">同意放宽全部硬约束并重新搜索</button>' +
      '<span class="hint-line" style="margin:0">放宽后结果会标注“不满足原硬约束”，请自行复核。</span>' +
      '</div></div>';
  }

  function audienceTabsHtml() {
    return '<div class="audience-tabs" role="tablist">' +
      '<button class="' + (state.audience === 'beginner' ? 'on' : '') + '" data-audience="beginner">新手 · 只看费用</button>' +
      '<button class="' + (state.audience === 'dev' ? 'on' : '') + '" data-audience="dev">开发者 · 看 Token</button>' +
      '</div>';
  }

  function conclusionHtml(plan) {
    var route = plan.routes[state.route];
    var pick = route && route.picks ? route.picks[0] : null;
    if (!pick) return '';
    var m = pick.model;
    var monthly = pick.cost * state.callsPerDay * 30;
    var reasons = (pick.reasons || []).slice(0, 3);
    return '<section class="conclusion">' +
      '<div class="conclusion-kicker">首选方案</div>' +
      '<div class="conclusion-main"><h2>' + esc(m.name) + '</h2>' +
      '<span class="tier tier-' + m.tier + '">' + esc(E.tierLabel(m.tier)) + '</span></div>' +
      '<p class="conclusion-price beginner-only">单次约 <b>¥' + fmt(pick.cost, 3) + '</b> · 每天 ' + state.callsPerDay + ' 次约 <b>¥' + fmt(monthly, 2) + '/月</b></p>' +
      '<p class="conclusion-price dev-only">本步约 <b>¥' + fmt(pick.cost, 3) + '</b> · ' + esc(priceShort(m)) + ' / 百万 token</p>' +
      '<ul class="conclusion-reasons">' + reasons.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>' +
      '<div class="conclusion-actions">' +
      '<button class="btn btn-primary" id="copyFirstPrompt">复制第一句提示词</button>' +
      '<button class="btn btn-ghost" id="showAllSteps">展开每一步</button>' +
      '<label class="calls-input">每天 <input id="callsPerDay" type="number" min="1" value="' + state.callsPerDay + '"> 次</label>' +
      '</div></section>';
  }

  function renderResults() {
    var plan = state.plan;
    if (!plan) return;
    var conflicts = plan.constraintConflicts || {};
    var hasAnyPick = plan.subtasks.some(function (s) { return !!s.best; });
    if (!hasAnyPick && Object.keys(conflicts).length && !plan.relaxed) {
      $('results').innerHTML = hardConstraintHtml(conflicts);
      var rb = $('allowRelaxBtn');
      if (rb) rb.addEventListener('click', function () {
        state.allowRelax = true;
        runPlan(false, true);
      });
      return;
    }
    var domain = plan.domain;
    var chips = [
      '<span class="chip acc">' + esc(domain.icon || '*') + ' ' + esc(domain.name) + '</span>',
      '<span class="chip">预算：' + budgetLabel(plan.opts.budget) + '</span>',
      '<span class="chip">时间：' + timeLabel(plan.opts.time) + '</span>',
      '<span class="chip dev-only">Token：' + tokenLabel(plan.opts.tokens) + '</span>'
    ];
    if (plan.opts.local) chips.push('<span class="chip">仅本地部署</span>');
    if (plan.files && plan.files.length) chips.push('<span class="chip acc">附件 ' + plan.files.length + ' 个</span>');

    var html = audienceTabsHtml() + conclusionHtml(plan);
    if (plan.relaxed) {
      html += '<div class="warn-banner">已按你的确认放宽硬约束：以下方案不再保证私有化 / 上下文 / 模态满足原条件。</div>';
    }
    html += '<details class="result-details" id="resultDetails"><summary>查看完整拆解、成本与每一步推荐</summary>';
    if (plan.files && plan.files.length) html += fileSummaryHtml(plan.files);
    html += '<div class="result-head"><div><h2>你的问题被拆成 <span>' + plan.subtasks.length + '</span> 步</h2>' +
      '<div style="font-size:13px;color:var(--dim);margin-top:4px">先拆解，再按你的时间 / 预算 / token 约束逐步骤匹配模型</div></div></div>';
    html += '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px">' + chips.join('') + '</div>';
    html += exclusionNoteHtml(plan);
    html += '<div class="summary"><div class="st-title">执行策略</div><p id="strategyText">' + esc(E.strategyText(plan, state.route)) + '</p>' +
      '<div class="route-note" id="saveLine">' + saveLine(plan, state.route) + '</div>' +
      '<div class="route-tabs" id="routeTabs">' + routeTabs(plan) + '</div>' +
      '<div class="route-note" id="routeNote">' + esc(plan.routes[state.route].desc) + '</div>' +
      (plan.notes.length ? '<div class="notes">' + plan.notes.map(function (n) { return '<div>' + esc(n) + '</div>'; }).join('') + '</div>' : '') +
      '</div>';
    html += matchedPanel(plan);
    html += '<div id="subtaskList">' + renderSubtasks() + '</div>';
    html += '<div class="actions"><button class="btn" id="copyPlanBtn">复制完整方案</button>' +
      '<button class="btn" id="copyScriptBtn">复制整段话术</button>' +

      '<button class="btn btn-ghost" id="printPlanBtn">打印 / 存 PDF</button>' +
      '<span class="hint-line" style="margin:0">价格为公开价快照，实际以下单页为准</span></div></details>';
    $('results').innerHTML = html;

    bindScoreHelp($('results'));

    $('routeTabs').addEventListener('click', function (e) {
      var b = e.target.closest('button[data-route]'); if (!b) return;
      state.route = b.getAttribute('data-route');
      $('routeTabs').innerHTML = routeTabs(plan);
      $('routeNote').textContent = plan.routes[state.route].desc;
      $('strategyText').textContent = E.strategyText(plan, state.route);
      $('saveLine').textContent = saveLine(plan, state.route);
      $('subtaskList').innerHTML = renderSubtasks();
      bindScoreHelp($('subtaskList'));
    });
    $('copyPlanBtn').addEventListener('click', function () { copyText(planToText(plan)); });
    $('copyScriptBtn').addEventListener('click', function () { copyText(window.MPPrompt.fullScript(plan, state.route)); });
    $('printPlanBtn').addEventListener('click', function () { window.print(); });
    var firstBtn = $('copyFirstPrompt');
    if (firstBtn) firstBtn.addEventListener('click', function () {
      var first = plan.subtasks[0];
      var fp = plan.routes[state.route].picks[0];
      if (first && fp) copyText(window.MPPrompt.tailor(first.prompt, fp.model, plan, first));
    });
    var showBtn = $('showAllSteps');
    if (showBtn) showBtn.addEventListener('click', function () {
      var d = $('resultDetails'); if (d) { d.open = true; d.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    });
    var calls = $('callsPerDay');
    if (calls) calls.addEventListener('change', function () {
      state.callsPerDay = Math.max(1, Number(this.value) || 20);
      try { localStorage.setItem('mp_calls_per_day', String(state.callsPerDay)); } catch (e) { }
      renderResults();
    });
  }

  function matchedPanel(plan) {
    if (!window.MPPrompt) return '';
    var matches = window.MPPrompt.match(plan.problem, 3).filter(function (m) {
      return !plan.subtasks.some(function (s) { return s.id === m.item.id; });
    }).slice(0, 2);
    if (!matches.length || matches[0].score < 10) return '';
    var cards = matches.map(function (m) {
      var ready = window.MPPrompt.substitute(m.item.prompt, plan.problem);
      return '<article class="match-card">' +
        '<div class="match-head"><div><span class="p-cat">' + esc(m.item.cat) + '</span><h3>' + esc(m.item.title) + '</h3></div>' +
        '<span class="match-badge">' + (m.score >= 16 ? '高匹配' : '较匹配') + '</span></div>' +
        '<p class="match-why">' + esc(m.item.goal) + '</p>' +
        '<div class="m-tags">' + m.hits.map(function (h) { return '<span class="m-tag">命中：' + esc(h) + '</span>'; }).join('') + '</div>' +
        '<details class="p-explain" style="border-top:0;margin-top:6px"><summary>查看提示词与解释</summary>' +
        '<pre class="match-prompt">' + esc(ready) + '</pre>' +
        window.MPPrompt.explain(m.item) + '</details>' +
        '<div class="p-foot">' + copyBtn(ready, '复制这条') + '</div>' +
        '</article>';
    }).join('');
    return '<div class="panel" style="margin-bottom:16px"><div class="panel-head"><h2>针对这个问题，更贴合的提示词</h2>' +
      '<span class="hint">来自提示词库的语义匹配，可直接复制</span></div>' + cards + '</div>';
  }

  function fileSummaryHtml(files) {
    var failedCount = files.filter(function (f) { return f.status === 'error'; }).length;
    var rows = files.map(function (f) {
      return '<div class="fa-row"><i>' + esc(extLabel(f.name)) + '</i><b title="' + esc(f.name) + '">' + esc(f.name) + '</b>' +
        '<span>' + esc(f.typeLabel || f.kind || '') + (f.chars ? ' · 约 ' + f.chars + ' 字' : '') +
        (f.needsVision ? ' · 需要视觉' : '') + (f.status === 'error' ? ' · 仅读取元数据' : '') + '</span></div>';
    }).join('');
    return '<div class="file-analysis" style="margin-bottom:14px">' +
      '<div class="fa-head"><b>本次方案基于 ' + files.length + ' 个附件</b><span>上下文门槛与视觉需求已按附件调整</span></div>' +
      rows +
      (failedCount ? '<div class="fa-note" style="color:#fca5a5">其中 ' + failedCount + ' 个附件只读到文件信息，推荐只按文件名与篇幅估算。</div>' : '') +
      '<div class="fa-note">附件未上传；把原文件拖进选定模型的对话框即可，提示词里已包含附件说明。</div></div>';
  }

  function saveLine(plan, key) {
    var q = plan.routes.quality.total, cur = plan.routes[key].total;
    if (key === 'quality' || cur >= q) return '当前就是质量优先，全程约 ¥' + fmt(q) + '；想省钱或提速可切换下面的路线。';
    var pctSaved = q > 0 ? Math.round((1 - cur / q) * 100) : 0;
    return '若全程用质量优先方案约 ¥' + fmt(q) + '；当前路线约 ¥' + fmt(cur) + '，省 ' + pctSaved + '%。';
  }

  function routeTabs(plan) {
    var out = '';
    ['quality', 'save', 'fast'].forEach(function (k) {
      var r = plan.routes[k];
      out += '<button data-route="' + k + '" class="' + (state.route === k ? 'on' : '') + '">' +
        r.name + ' · ¥' + fmt(r.total) + '</button>';
    });
    return out;
  }

  function renderSubtasks() {
    var plan = state.plan;
    var picks = routePicks(plan, state.route);
    return plan.subtasks.map(function (st, i) {
      var pick = picks[i];
      var others = st.recs.filter(function (r) { return !pick || r.model.id !== pick.model.id; }).slice(0, 3);
      var html = '<article class="subtask">';
      var modes = (st.mode || []).map(function (x) { return '<span class="mode-tag">' + esc(x) + '</span>'; }).join('');
      html += '<div class="subtask-head"><div class="num">' + (i + 1) + '</div><div><h3>' + esc(st.title) + '</h3><div class="goal">' + esc(st.goal) + '</div>' +
        (modes ? '<div class="sub-modes">建议模式：' + modes + '</div>' : '') + '</div></div>';
      html += '<div class="subtask-body">';
      html += '<div class="rec-list">' + (pick ? recCard(pick, i, true) : '<div class="empty">这一步没有满足硬约束的模型；取消对应勾选后重新生成，或点上方「同意放宽」</div>') + '</div>';
      if (others.length) {
        html += '<div class="alt-row"><b>备选：</b>' + others.map(function (r) {
          return '<button class="link-btn js-model" data-model="' + esc(r.model.id) + '">' + esc(r.model.name) + '</button>' +
            ' <span style="color:var(--dim)">' + MPEngineTier(r.model.tier) + ' · ' + Math.round(r.score) + '规则分 · ' + priceShort(r.model) + '</span>';
        }).join('　') + '</div>';
      }
      if (st.advice) html += '<div class="advice">用法建议：' + esc(st.advice) + '</div>';
      var tailored = pick ? window.MPPrompt.tailor(st.prompt, pick.model, plan, st) : st.prompt;
      html += '<div class="prompt-wrap">' +
        (pick ? '<div class="tailor-note">已按 ' + esc(pick.model.name) + ' 的能力与可用模式改写话术</div>' : '') +
        '<details class="prompt-details"><summary>查看给 ' + (pick ? esc(pick.model.name) : '模型') + ' 的专用话术（推荐）</summary>' +
        '<div class="prompt-box" style="margin-top:8px">' + copyBtn(tailored, '复制话术') + esc(tailored) + '</div>' +
        '</details>' +
        '<details class="prompt-details" style="margin-top:6px"><summary>查看通用版提示词（不绑定模型）</summary>' +
        '<div class="prompt-box" style="margin-top:8px">' + copyBtn(st.prompt, '复制通用版') + esc(st.prompt) + '</div>' +
        '</details></div>';
      html += '</div></article>';
      return html;
    }).join('');
  }

  function MPEngineTier(t) { return E.tierLabel(t); }
  function num(n) { return String(+Number(n).toFixed(2)); }
  function money(n) { return Math.round(n).toLocaleString('zh-CN'); }
  function priceShort(m) {
    if (m.priceIn === 0 && m.priceOut === 0) return m.open ? '自托管' : '免费';
    return '¥' + num(m.priceIn) + '/' + num(m.priceOut);
  }
  function priceConfLabel(m) {
    return m.priceConf === 'official' ? '官方' : (m.priceConf === 'ref' ? '折算' : '推算');
  }
  function priceSourceLabel(m) {
    var map = { zhipu: '智谱官网', volc: '火山方舟', deepseek: 'DeepSeek 官网', hunyuan: '腾讯混元官网' };
    if (m.syncSource && map[m.syncSource]) return map[m.syncSource];
    if (m.priceConf === 'official') return '厂商官网 / 公开定价页';
    if (m.priceConf === 'ref') return '渠道 / 聚合定价页';
    return '同级推算';
  }
  function priceUpdatedLabel(m) {
    return m.syncedAt ? dtText(m.syncedAt) : (META.dataDate || '—');
  }

  /* ================= 解决方案 ================= */
  function modelById(id) { return MODELS.filter(function (m) { return m.id === id; })[0]; }
  function solutionCost(sol) {
    var first = sol.stack.filter(function (x) { return x.model; })[0];
    var m = first ? modelById(first.model) : null;
    if (!m) return null;
    var per = E.estimateCost(m, sol.sample.inTok, sol.sample.outTok);
    return { model: m, per: per, total: per * (sol.sample.calls || 1) };
  }
  function solutionStackHtml(sol) {
    return sol.stack.map(function (x) {
      var m = x.model ? modelById(x.model) : null;
      return '<div class="sol-row"><span class="sol-role">' + esc(x.role) + '</span>' +
        '<b>' + esc(m ? m.name : (x.name || '配套工具')) + '</b>' +
        '<span class="sol-note">' + esc(x.note || '') + '</span></div>';
    }).join('');
  }
  function solutionCard(sol, highlight, noId) {
    var cost = solutionCost(sol);
    var costText = cost ? ('单次约 ¥' + fmt(cost.total, 3) + '（' + sol.sample.calls + ' 次）') : '';
    return '<article class="sol-card' + (highlight ? ' hl' : '') + '"' + (noId ? '' : ' id="sol-' + esc(sol.id) + '"') + '>' +
      '<div class="sol-head"><span class="sol-icon">' + esc(sol.icon) + '</span>' +
      '<div><h3>' + esc(sol.title) + '</h3><div class="sol-level">建议等级 ' + esc(sol.level) + '</div></div></div>' +
      '<p class="sol-pain">' + esc(sol.pain) + '</p>' +
      '<div class="sol-stack">' + solutionStackHtml(sol) + '</div>' +
      (costText ? '<div class="sol-cost">' + esc(costText) + '</div>' : '') +
      '<details class="sol-detail"><summary>落地步骤与提醒</summary>' +
      '<ol>' + sol.steps.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') + '</ol>' +
      '<p class="sol-tip">' + esc(sol.tip) + '</p></details>' +
      '</article>';
  }
  function renderSolutions() {
    if (!$('solutionGrid')) return;
    $('solutionGrid').innerHTML = SOLUTIONS.map(function (s) { return solutionCard(s); }).join('');
  }
  function matchSolutions(text) {
    var q = String(text || '').toLowerCase();
    if (q.length < 2) return [];
    var scored = SOLUTIONS.map(function (s) {
      var hits = [], sc = 0;
      s.keywords.forEach(function (k) { if (q.indexOf(String(k).toLowerCase()) >= 0) { sc += 4; hits.push(k); } });
      if (s.keywords[0] && q.indexOf(String(s.keywords[0]).toLowerCase()) >= 0) sc += 8;
      s.stack.forEach(function (x) {
        var name = x.model && modelById(x.model) ? modelById(x.model).name : (x.name || '');
        if (name && q.indexOf(name.toLowerCase()) >= 0) { sc += 6; hits.push(name); }
      });
      if (q.indexOf(s.title.slice(0, 3)) >= 0) sc += 4;
      return { sol: s, score: sc, hits: hits.slice(0, 5) };
    }).filter(function (x) { return x.score >= 4; });
    scored.sort(function (a, b) { return b.score - a.score; });
    return scored.slice(0, 2);
  }
  function renderSolutionMatch(text) {
    var box = $('solutionResults');
    if (!text || text.trim().length < 2) { box.innerHTML = ''; return; }
    var res = matchSolutions(text);
    if (!res.length) {
      box.innerHTML = '<div class="empty" style="border:0">没匹配到现成方案。可以试试下面「常见场景」里的组合，或到「智能选型」拆任务。</div>';
      return;
    }
    box.innerHTML = '<div class="match-results">' + res.map(function (r) {
      return '<div class="sol-match"><div class="sol-match-head"><b>为什么给你这套</b>' +
        r.hits.map(function (h) { return '<span class="m-tag">命中：' + esc(h) + '</span>'; }).join('') + '</div>' +
        solutionCard(r.sol, true, true) + '</div>';
    }).join('') + '</div>';
  }

  /* ================= 成本计算器 ================= */
  function fillCalcSelects() {
    var a = $('calcA'), b = $('calcB');
    if (!a || !b) return;
    var opts = MODELS.slice().sort(function (x, y) { return y.tier - x.tier || x.priceIn - y.priceIn; })
      .map(function (m) { return '<option value="' + esc(m.id) + '">' + esc(m.name) + ' · ' + E.tierLabel(m.tier) + '</option>'; }).join('');
    a.innerHTML = opts; b.innerHTML = opts;
    a.value = 'gpt-5.5'; b.value = 'glm-5.3-flash';
  }
  function calcMonthly(m, calls, iTok, oTok) {
    return E.estimateCost(m, iTok, oTok) * calls * 30;
  }
  function renderCalc() {
    var a = modelById($('calcA').value), b = modelById($('calcB').value);
    if (!a || !b) return;
    var calls = Math.max(1, +$('calcCalls').value || 1);
    var iTok = Math.max(0, +$('calcIn').value || 0);
    var oTok = Math.max(0, +$('calcOut').value || 0);
    var ca = calcMonthly(a, calls, iTok, oTok), cb = calcMonthly(b, calls, iTok, oTok);
    var save = ca - cb, pct = ca > 0 ? Math.round(save / ca * 100) : 0;
    var topDims = E.DIMS.slice().sort(function (x, y) { return a.dims[y] - a.dims[x]; }).slice(0, 4);
    var diff = 0; topDims.forEach(function (k) { diff += Math.abs((a.dims[k] || 0) - (b.dims[k] || 0)); });
    diff = (diff / topDims.length).toFixed(1);
    $('calcResult').innerHTML =
      '<div class="calc-grid">' +
      '<div class="calc-box"><span>现在：' + esc(a.name) + '（' + E.tierLabel(a.tier) + '）</span><b>¥' + money(ca) + ' / 月</b><i>' + money(ca * 1000) + ' 厘</i></div>' +
      '<div class="calc-box"><span>换成：' + esc(b.name) + '（' + E.tierLabel(b.tier) + '）</span><b>¥' + money(cb) + ' / 月</b><i>' + money(cb * 1000) + ' 厘</i></div>' +
      '<div class="calc-box accent"><span>每月' + (save >= 0 ? '省' : '多花') + '</span><b>¥' + money(Math.abs(save)) + '</b><i>' + (save >= 0 ? pct + '%' : '—') + ' · 能力分差 ' + diff + '/10</i></div>' +
      '</div>' +
      '<div class="dlg-note">按 30 天/月估算；单次 ' + (iTok / 1000) + 'K 输入 + ' + (oTok / 1000) + 'K 输出。能力分差是十维能力的平均差，不等于效果差 ' + diff + '%，上线前请做小流量 A/B。</div>';
  }
  function initCalc() {
    if (!$('calcA')) return;
    fillCalcSelects();
    renderCalc();
    ['calcA', 'calcB', 'calcCalls', 'calcIn', 'calcOut'].forEach(function (id) {
      $(id).addEventListener('input', renderCalc);
      $(id).addEventListener('change', renderCalc);
    });
    document.querySelectorAll('[data-preset]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var p = btn.getAttribute('data-preset');
        if (p === 'support') { $('calcA').value = 'gpt-5.5'; $('calcB').value = 'glm-5.3-flash'; $('calcCalls').value = 100000; $('calcIn').value = 1200; $('calcOut').value = 300; }
        if (p === 'longdoc') { $('calcA').value = 'kimi-k3.1-pro'; $('calcB').value = 'deepseek-flash'; $('calcCalls').value = 1000; $('calcIn').value = 60000; $('calcOut').value = 2000; }
        if (p === 'coding') { $('calcA').value = 'claude-sonnet-4.6'; $('calcB').value = 'glm-5.3'; $('calcCalls').value = 5000; $('calcIn').value = 30000; $('calcOut').value = 4000; }
        renderCalc();
      });
    });
  }

  function recCard(r, i, top) {
    var m = r.model;
    var mods = (m.modes || []).slice(0, 4).map(function (x) { return '<span class="mode-tag">' + esc(x) + '</span>'; }).join('');
    var html = '<article class="rec-card' + (top ? ' top' : '') + '">';
    html += '<div class="rec-main">';
    html += '<div class="rec-name"><h4>' + esc(m.name) + '</h4>' +
      '<span class="tier tier-' + m.tier + '">' + esc(E.tierLabel(m.tier)) + '</span>' +
      '<span class="rec-vendor">' + esc(m.vendor) + (m.open ? ' · 开源权重' : '') + (m.country !== 'CN' ? ' · 海外' : '') + '</span></div>';
    var monthly = r.cost * state.callsPerDay * 30;
    html += '<div class="rec-meta dev-only"><span>上下文 <b>' + ctxLabel(m.ctx) + '</b></span><span>速度 <b>' + m.speed.toFixed(1) + '/10</b></span>' +
      '<span>价格 <b>' + priceShort(m) + '</b> / 百万 token</span><span>本步约 <b>¥' + fmt(r.cost, 3) + '</b></span></div>';
    html += '<div class="rec-meta beginner-only"><span>单次约 <b>¥' + fmt(r.cost, 3) + '</b></span><span>每天 ' + state.callsPerDay + ' 次，约 <b>¥' + fmt(monthly, 2) + '/月</b></span></div>';
    if (r.overCap) html += '<div class="warn-banner">输入约 ' + (r.rawInTok || '') + ' tokens，超出 60K 估算上限；当前费用按 60K 计算，实际更高。</div>';
    html += '<ul class="reasons">' + r.reasons.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>';
    if (r.cautions && r.cautions.length) {
      html += '<ul class="cautions">' + r.cautions.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>';
    }
    html += '</div>';
    html += '<div class="rec-side"><div class="score">' + Math.round(r.score) + '<small>/100</small></div>' +
      '<button class="score-help" data-audit="' + esc(JSON.stringify(r.audit || {})) + '">规则匹配分 ⓘ</button>' +
      '<div class="score-bar"><i style="width:' + pct(r.score) + '%"></i></div>' +
      '<div class="price">' + esc(m.priceNote || '') + '</div></div>';
    html += '<div class="rec-foot">' + mods +
      '<span style="flex:1"></span>' +
      '<button class="btn btn-sm js-model" data-model="' + esc(m.id) + '">模型详情</button>' +
      '<a class="btn btn-sm" href="' + esc(m.url) + '" target="_blank" rel="noopener">官网</a></div>';
    html += '</article>';
    return html;
  }

  function ctxLabel(n) {
    if (n >= 1000000) return (n / 1000000).toFixed(n % 1000000 ? 1 : 0) + 'M';
    return Math.round(n / 1000) + 'K';
  }
  function budgetLabel(b) { return { free: '零预算', low: '低于 ¥5/M', mid: '中等', high: '不设上限' }[b] || b; }
  function timeLabel(t) { return { urgent: '很赶', normal: '正常', relaxed: '很充裕' }[t] || t; }
  function tokenLabel(t) { return { scarce: '很紧', normal: '够用', ample: '充足' }[t] || t; }

  function planToText(plan) {
    var L = [];
    L.push('# 大模型选型方案');
    L.push('');
    L.push('问题：' + plan.problem);
    if (plan.files && plan.files.length) {
      L.push('附件：' + plan.files.map(function (f) { return f.name + '（' + (f.brief || '') + '）'; }).join('；'));
    }
    L.push('领域：' + plan.domain.name + '｜预算：' + budgetLabel(plan.opts.budget) + '｜时间：' + timeLabel(plan.opts.time) + '｜Token：' + tokenLabel(plan.opts.tokens));
    L.push('策略：' + E.strategyText(plan, state.route));
    L.push('');
    plan.subtasks.forEach(function (st, i) {
      var pick = plan.routes[state.route].picks[i];
      L.push('## ' + (i + 1) + '. ' + st.title);
      L.push('目标：' + st.goal);
      if (pick) {
        L.push('推荐：' + pick.model.name + '（' + E.tierLabel(pick.model.tier) + '，规则匹配分 ' + Math.round(pick.score) + '/100）');
        L.push('理由：' + pick.reasons.join('；'));
        L.push('价格：' + priceShort(pick.model) + ' / 百万 token，本步约 ¥' + fmt(pick.cost, 3));
      }
      if (pick) {
        L.push('模型专用话术：');
        L.push(window.MPPrompt.tailor(st.prompt, pick.model, plan, st));
      } else {
        L.push('提示词：');
        L.push(st.prompt);
      }
      L.push('');
    });
    L.push('---');
    L.push('由 模选 ModelPick 生成，价格快照 ' + (META.dataDate || '') + '，实际以各平台下单页为准。');
    return L.join('\n');
  }

  /* ================= 模型库 ================= */
  function avgDim(m) {
    var s = 0, n = 0;
    E.DIMS.forEach(function (k) { s += m.dims[k]; n++; });
    return s / n;
  }
  function filteredModels() {
    var q = state.lib.q.toLowerCase();
    var list = MODELS.filter(function (m) {
      if (state.lib.country === 'cn' && m.country !== 'CN') return false;
      if (state.lib.country === 'global' && m.country === 'CN') return false;
      if (state.lib.country === 'open' && !m.open) return false;
      if (state.lib.tier !== 'all' && String(m.tier) !== state.lib.tier) return false;
      if (state.lib.flag === 'cn' && m.country !== 'CN') return false;
      if (state.lib.flag === 'private' && !m.open) return false;
      if (state.lib.flag === 'filed' && m.country !== 'CN') return false;
      if (q) {
        var hay = (m.name + ' ' + m.vendor + ' ' + m.desc + ' ' + (m.strengths || []).join(' ') + ' ' + (m.bestFor || []).join(' ')).toLowerCase();
        if (hay.indexOf(q) < 0) return false;
      }
      return true;
    });
    var s = state.lib.sort;
    list.sort(function (a, b) {
      if (s === 'price') return (a.priceIn * 0.7 + a.priceOut * 0.3) - (b.priceIn * 0.7 + b.priceOut * 0.3);
      if (s === 'ctx') return b.ctx - a.ctx;
      if (s === 'speed') return b.speed - a.speed;
      return b.tier - a.tier || avgDim(b) - avgDim(a);
    });
    return list;
  }

  function renderLibStats() {
    var total = MODELS.length;
    var cn = MODELS.filter(function (m) { return m.country === 'CN'; }).length;
    var free = MODELS.filter(function (m) { return m.priceIn === 0 && m.priceOut === 0; }).length;
    var open = MODELS.filter(function (m) { return m.open; }).length;
    var tiers = [0, 0, 0, 0, 0];
    MODELS.forEach(function (m) { tiers[m.tier - 1]++; });
    var avg = MODELS.reduce(function (a, m) { return a + m.ctx; }, 0) / total;
    var colors = ['#94a3b8', '#34d399', '#38bdf8', '#a78bfa', '#fbbf24'];
    var names = ['L1 免费', 'L2 轻量', 'L3 主力', 'L4 旗舰', 'L5 顶级'];
    var bar = '', legend = '';
    tiers.forEach(function (n, i) {
      if (!n) return;
      bar += '<i style="width:' + (n / total * 100) + '%;background:' + colors[i] + '"></i>';
      legend += '<span><i style="background:' + colors[i] + '"></i>' + names[i] + ' ' + n + '</span>';
    });
    $('libStats').innerHTML =
      '<div class="ss-item"><b>' + total + '</b><span>模型总数</span><div class="ss-sub">' + Object.keys(MODELS.reduce(function (o, m) { o[m.vendor] = 1; return o; }, {})).length + ' 家厂商</div></div>' +
      '<div class="ss-item"><b>' + cn + ' / ' + (total - cn) + '</b><span>国产 / 海外</span></div>' +
      '<div class="ss-item"><b>' + free + ' / ' + open + '</b><span>免费 / 开源</span></div>' +
      '<div class="ss-item"><b>' + Math.round(avg / 1000) + 'K</b><span>平均上下文</span></div>' +
      '<div class="ss-dist"><div class="dist-head"><span>等级分布</span><span>等级是「用在哪一层」，不是好坏</span></div>' +
      '<div class="dist-bar">' + bar + '</div><div class="dist-legend">' + legend + '</div></div>';
  }

  function modelFlags(m) {
    var f = [];
    if (m.country === 'CN') f.push({ k: '国内直连', c: 'ok', t: '厂商在国内提供可用 API' });
    else f.push({ k: '海外服务', c: 'warn', t: '需评估网络访问与数据出境' });
    if (m.open) f.push({ k: '可私有化', c: 'ok', t: '权重开放或提供私有部署' });
    if (m.country === 'CN') f.push({ k: '境内备案', c: 'ok', t: '按厂商公开信息，具体以网信办公示为准' });
    if (m.priceIn === 0 && m.priceOut === 0) f.push({ k: '免费', c: 'ok', t: '当前价格为 0' });
    return f;
  }

  function renderLibrary() {
    var list = filteredModels();
    $('modelCount').textContent = list.length;
    var html = list.map(function (m) {
      var topDims = E.DIMS.slice().sort(function (a, b) { return m.dims[b] - m.dims[a]; }).slice(0, 4);
      var bars = topDims.map(function (k) {
        return '<div class="dim-row"><span>' + esc(E.dimLabel(k)) + '</span><div class="bar"><i style="width:' + pct(m.dims[k]) + '%"></i></div><b>' + m.dims[k].toFixed(1) + '</b></div>';
      }).join('');
      return '<article class="model-card js-model" data-model="' + esc(m.id) + '">' +
        '<div class="m-head"><div><h3>' + esc(m.name) + '</h3><div class="m-sub">' + esc(m.vendor) + (m.country !== 'CN' ? ' · 海外' : ' · 国产') + (m.open ? ' · 开源' : '') + '</div>' +
        '<div class="m-flags">' + modelFlags(m).map(function (f) { return '<span class="m-flag ' + f.c + '" title="' + esc(f.t || '') + '">' + esc(f.k) + '</span>'; }).join('') + '</div></div>' +
        '<span class="tier tier-' + m.tier + '">' + esc(E.tierLabel(m.tier)) + '</span></div>' +
        '<p class="m-desc">' + esc(m.desc) + '</p>' +
        '<div class="m-pc">' +
        '<div class="pro"><b>✓</b><p>' + esc((m.strengths || [''])[0]) + '</p></div>' +
        '<div class="con"><b>!</b><p>' + esc((m.weaknesses || [''])[0]) + '</p></div>' +
        '</div>' +
        '<div class="m-tags">' + (m.bestFor || []).slice(0, 4).map(function (t) { return '<span class="m-tag">' + esc(t) + '</span>'; }).join('') + '</div>' +
        '<div class="m-dims">' + bars + '</div>' +
        '<div class="m-foot"><span>上下文 <b>' + ctxLabel(m.ctx) + '</b></span><span>价格 <b>' + priceShort(m) + '</b><i class="pc">' + priceConfLabel(m) + '</i></span></div>' +
        '<div class="price-meta">来源：' + esc(priceSourceLabel(m)) + ' · 更新：' + esc(priceUpdatedLabel(m)) + '</div>' +
        '</article>';
    }).join('');
    $('modelGrid').innerHTML = html || '<div class="empty">没有匹配的模型，换个关键词试试</div>';
  }

  var MODE_RULES = [
    { key: 'think', k: ['深度思考', '扩展思考', '超长思考', '思考'], q: '数学、算法、难 bug、架构设计、需要多步验证', no: '分类、抽取、改写：更慢更贵，还可能过度推理' },
    { key: 'fast', k: ['非思考', '快速', '低延迟'], q: '分类、抽取、翻译、格式转换、实时对话', no: '多跳推理与长链计算' },
    { key: 'web', k: ['联网', '搜索'], q: '价格、政策、新闻、竞品、实时数据', no: '需要稳定可复现的答案时' },
    { key: 'vision', k: ['视觉', '图片'], q: '截图、表格、图表、手写、UI 还原', no: '精确数字仍要二次核对' },
    { key: 'video', k: ['视频'], q: '课程录像、会议回放、长视频切片', no: '先分段再问，别整段塞进去' },
    { key: 'audio', k: ['音频', '语音', '实时'], q: '会议转写、语音客服、口语练习', no: '嘈杂环境先降噪' },
    { key: 'tools', k: ['工具', 'MCP', 'Function'], q: '算数、查库、调 API、多步自动化', no: '权限与回滚要先设计' },
    { key: 'long', k: ['长文档', '长上下文', '1M'], q: '整本书、整套财报、整库代码', no: '塞满会稀释注意力，先给结构' },
    { key: 'batch', k: ['Batch', '批量', '批处理'], q: '离线、可等、量大的任务', no: '实时交互别用' },
    { key: 'json', k: ['JSON', '结构化'], q: '要程序消费的输出、字段抽取', no: '需要长解释时反而受限' },
    { key: 'fim', k: ['FIM', '补全'], q: 'IDE 中间的代码补全', no: '对话式任务' },
    { key: 'code', k: ['Claude Code', '代码'], q: '在终端里读仓库、改代码、跑测试', no: '非代码任务' }
  ];
  function modeAdviceHtml(m) {
    var seen = {}, rows = [];
    (m.modes || []).forEach(function (mode) {
      MODE_RULES.forEach(function (r) {
        if (seen[r.key]) return;
        if (r.k.some(function (k) { return mode.indexOf(k) >= 0; })) {
          seen[r.key] = 1; rows.push({ mode: mode, q: r.q, no: r.no });
        }
      });
    });
    if (!rows.length) return '<div class="dlg-note">该模型未标注可用模式，按普通对话使用即可。</div>';
    return '<table class="dlg-table"><thead><tr><th>模式</th><th>什么时候开</th><th>什么时候别开</th></tr></thead><tbody>' +
      rows.map(function (r) {
        return '<tr><td>' + esc(r.mode) + '</td><td class="acc">' + esc(r.q) + '</td><td class="warn">' + esc(r.no) + '</td></tr>';
      }).join('') + '</tbody></table>' +
      '<div class="dlg-note">只列出这个模型实际提供的模式；各家命名不同，以官网为准。</div>';
  }
  function tokenTimeHtml(m) {
    var tps = 8 + m.speed * 10;
    var ttft = Math.max(0.6, 4.2 - m.speed * 0.32);
    var secs = [
      { n: '短问答', i: 500, o: 500 },
      { n: '日常任务', i: 3000, o: 1500 },
      { n: '长文/报告', i: 30000, o: 8000 },
      { n: '整份资料', i: 200000, o: 10000 }
    ];
    function dur(i, o) { return ttft + i / 20000 + o / tps; }
    function fmtT(s) { return s < 60 ? Math.round(s) + ' 秒' : (s / 60).toFixed(1) + ' 分'; }
    return '<table class="dlg-table"><thead><tr><th>场景</th><th>输入 / 输出</th><th>费用</th><th>预计耗时</th></tr></thead><tbody>' +
      secs.map(function (s) {
        var c = E.estimateCost(m, s.i, s.o);
        return '<tr><td>' + s.n + '</td><td>' + (s.i >= 1000 ? (s.i / 1000) + 'K' : s.i) + ' / ' +
          (s.o >= 1000 ? (s.o / 1000) + 'K' : s.o) + '</td><td class="acc">' +
          (c ? ('¥' + fmt(c, 3)) : '免费/自托管') + '</td><td>' + fmtT(dur(s.i, s.o)) + '</td></tr>';
      }).join('') + '</tbody></table>' +
      '<div class="dlg-note">估算口径：输出约 ' + Math.round(tps) + ' token/s，首字约 ' + ttft.toFixed(1) +
      ' 秒（由速度分推导）；深度思考通常再慢 1.5–2 倍，不含排队与网络。</div>';
  }
  function capacityHtml(m) {
    var chars = m.ctx * 1.5;
    return '<div class="cap-box">' +
      '<div><span>上下文窗口</span><b>' + ctxLabel(m.ctx) + ' tokens</b></div>' +
      '<div><span>约合中文</span><b>' + Math.round(chars / 10000) + ' 万字</b></div>' +
      '<div><span>约合 PDF</span><b>' + Math.round(chars / 3000) + ' 页</b></div>' +
      '</div>';
  }

  function downgradeHtml(m) {
    var cur = E.blend(m);
    var topDims = E.DIMS.slice().sort(function (a, b) { return m.dims[b] - m.dims[a]; }).slice(0, 4);
    var alts = MODELS.filter(function (x) { return x.id !== m.id && E.blend(x) < cur * 0.75; })
      .map(function (x) {
        var d = 0;
        topDims.forEach(function (k) { d += Math.abs((m.dims[k] || 0) - (x.dims[k] || 0)); });
        return { m: x, diff: d / topDims.length };
      })
      .sort(function (a, b) { return a.diff - b.diff; }).slice(0, 3);
    if (!alts.length) return '<div class="dlg-note">没有明显更便宜的替代；这个模型本身已经在低价档。</div>';
    var rows = alts.map(function (a) {
      var save = cur > 0 ? Math.round((1 - E.blend(a.m) / cur) * 100) : 0;
      return '<tr><td>' + esc(a.m.name) + '</td><td>' + E.tierLabel(a.m.tier) + '</td><td class="acc">¥' +
        num(a.m.priceIn) + '/¥' + num(a.m.priceOut) + '</td><td>' + a.diff.toFixed(1) + '/10</td><td class="warn">省 ' + save + '%</td></tr>';
    }).join('');
    return '<table class="dlg-table"><thead><tr><th>替代</th><th>等级</th><th>价格</th><th>能力分差</th><th>单价</th></tr></thead><tbody>' +
      rows + '</tbody></table><div class="dlg-note">按十维能力中最重要的 4 项算平均差；分差 1.0 不代表效果差 1%，只表示画像差距。上线前用小流量 A/B 验证。</div>';
  }

  function showModel(id) {
    var m = MODELS.filter(function (x) { return x.id === id; })[0];
    if (!m) return;
    var dlg = $('modelDlg');
    var dims = E.DIMS.map(function (k) {
      return '<div class="dim-row"><span>' + esc(E.dimLabel(k)) + '</span><div class="bar"><i style="width:' + pct(m.dims[k]) + '%"></i></div><b>' + m.dims[k].toFixed(1) + '</b></div>';
    }).join('');
    $('dlgTitle').textContent = m.name;
    $('dlgSub').textContent = m.vendor + ' · ' + E.tierLabel(m.tier) + (m.open ? ' · 开源权重' : '') + (m.country !== 'CN' ? ' · 海外服务' : '');
    var modeHtml = modeAdviceHtml(m);
    var timeHtml = tokenTimeHtml(m);
    var capHtml = capacityHtml(m);
    var flagsHtml = modelFlags(m).map(function (f) { return '<span class="m-flag ' + f.c + '" title="' + esc(f.t || '') + '">' + esc(f.k) + '</span>'; }).join('');
    var dgHtml = downgradeHtml(m);
    $('dlgBody').innerHTML =
      '<p>' + esc(m.desc) + '</p>' +
      '<div id="modelRating" class="rating-mount"></div>' +
      '<div class="dlg-grid" style="margin-top:12px">' +
      '<div class="dlg-stat"><span>上下文 / 最大输出</span><b>' + ctxLabel(m.ctx) + ' / ' + ctxLabel(m.maxOut) + '</b></div>' +
      '<div class="dlg-stat"><span>价格（输入 / 输出）</span><b>' + priceShort(m) + ' 每百万</b>' +
      '<i class="mini">' + Math.round(m.priceIn * 1000) + ' / ' + Math.round(m.priceOut * 1000) + ' 厘 · ' + priceConfLabel(m) + '</i></div>' +
      '<div class="dlg-stat"><span>速度</span><b>' + m.speed.toFixed(1) + ' / 10</b></div>' +
      '<div class="dlg-stat"><span>发布</span><b>' + esc(m.release || '-') + '</b></div>' +
      '</div>' +
      '<h4>能力雷达</h4><div class="m-dims">' + dims + '</div>' +
      '<h4>突出能力</h4><ul>' + (m.strengths || []).map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>' +
      '<h4>短板 / 注意</h4><ul>' + (m.weaknesses || []).map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>' +
      '<h4>适合场景</h4><div class="m-tags">' + (m.bestFor || []).map(function (x) { return '<span class="m-tag">' + esc(x) + '</span>'; }).join('') + '</div>' +
      '<h4>可用模式</h4><div class="m-tags">' + (m.modes || []).map(function (x) { return '<span class="m-tag">' + esc(x) + '</span>'; }).join('') + '</div>' +
      '<h4>合规与部署</h4><div class="m-tags">' + flagsHtml + '</div>' +
      '<div class="dlg-note">「境内备案」按厂商公开信息标注，具体以网信办公示与合同为准；海外模型需评估数据出境。</div>' +
      '<h4>降级平替（省钱路线）</h4>' + dgHtml +
      '<h4>按问题选模式</h4>' + modeHtml +
      '<h4>Token 与时间效率</h4>' + timeHtml +
      '<h4>上下文能装多少</h4>' + capHtml +
      '<h4>价格说明</h4><p>' + esc(m.priceNote || '') + '。' +
      '<span class="dlg-note">来源：' + esc(priceSourceLabel(m)) + ' · 更新：' + esc(priceUpdatedLabel(m)) + ' · ' + priceConfLabel(m) + '</span>。' +
      (m.freeTier ? '免费额度：' + esc(m.freeTier) + '。' : '') + '接口：' + esc(m.api || '-') + '。</p>' +
      '<h4>成本试算</h4><div class="calc"><input type="number" id="calcIn" value="3000" min="0"><span style="color:var(--dim);font-size:12px">输入 tokens</span>' +
      '<input type="number" id="calcOut" value="1500" min="0"><span style="color:var(--dim);font-size:12px">输出 tokens</span>' +
      '<b class="calc-out" id="calcOutLabel"></b></div>' +
      '<div style="margin-top:14px;display:flex;gap:8px;flex-wrap:wrap"><a class="btn btn-sm" href="model/' + esc(m.id) + '.html">独立页 / 分享</a>' +
      '<a class="btn btn-sm" href="' + esc(m.url) + '" target="_blank" rel="noopener">打开官网 / 文档</a>' +
      '<button class="btn btn-sm" id="dlgClose2">关闭</button></div>';

    if (window.MPRating) window.MPRating.mount($('modelRating'), m.id);

    function calc() {
      var i = +$('calcIn').value || 0, o = +$('calcOut').value || 0;
      var c = E.estimateCost(m, i, o);
      $('calcOutLabel').textContent = c === 0 ? '免费 / 自托管' : '单次约 ¥' + fmt(c, 4);
    }
    $('calcIn').addEventListener('input', calc);
    $('calcOut').addEventListener('input', calc);
    calc();
    $('dlgClose2').addEventListener('click', function () { dlg.close(); });
    if (dlg.open) dlg.close();
    dlg.showModal();
  }

  /* ================= 算法库 ================= */
  var CAT_ORDER = ['架构基础', '预训练', '后训练与对齐', '高效微调', '推理优化', '检索增强', '多模态', '评估与工程', '智能体'];

  function renderAlgoNav() {
    var counts = {};
    ALGOS.forEach(function (a) { counts[a.cat] = (counts[a.cat] || 0) + 1; });
    var out = '<button data-cat="全部" class="' + (state.algo.cat === '全部' ? 'on' : '') + '">全部 <em>' + ALGOS.length + '</em></button>';
    CAT_ORDER.forEach(function (c) {
      if (!counts[c]) return;
      out += '<button data-cat="' + esc(c) + '" class="' + (state.algo.cat === c ? 'on' : '') + '">' + esc(c) + ' <em>' + counts[c] + '</em></button>';
    });
    $('algoNav').innerHTML = out;
  }

  function renderAlgos() {
    var q = state.algo.q.toLowerCase();
    var list = ALGOS.filter(function (a) {
      if (state.algo.cat !== '全部' && a.cat !== state.algo.cat) return false;
      if (q && (a.name + ' ' + a.en + ' ' + a.oneLiner + ' ' + a.when).toLowerCase().indexOf(q) < 0) return false;
      return true;
    });
    $('algoCount').textContent = list.length;
    $('algoList').innerHTML = list.map(function (a) {
      return '<details class="algo-item" id="algo-' + esc(a.id) + '">' +
        '<summary><span class="a-name">' + esc(a.name) + '</span><span class="a-en">' + esc(a.en) + '</span>' +
        '<span class="a-level">' + esc(a.cat) + ' · ' + esc(a.level) + '</span>' +
        '<span class="a-one">' + esc(a.oneLiner) + '</span></summary>' +
        '<div class="algo-body">' +
        '<div class="algo-sec"><h4>怎么做</h4><ul>' + a.how.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul></div>' +
        '<div class="algo-sec pit"><h4>最容易踩的坑</h4><ul>' + a.pitfalls.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul></div>' +
        '<div class="algo-sec"><h4>什么时候用</h4><p>' + esc(a.when) + '</p></div>' +
        '<div class="algo-meta">' + (a.related || []).map(function (x) { return '<span>' + esc(x) + '</span>'; }).join('') +
        (a.refs || []).map(function (u) { return '<a href="' + esc(u) + '" target="_blank" rel="noopener" style="font-size:11px">参考链接</a>'; }).join('') +
        '</div></div></details>';
    }).join('');
    if (!list.length) $('algoList').innerHTML = '<div class="empty">没有匹配的条目</div>';
  }

  /* ================= 提示词库 ================= */
  function allSubs() {
    var out = [];
    DOMAINS.forEach(function (d) {
      (d.subtasks || []).forEach(function (s) { out.push({ domain: d, sub: s }); });
    });
    return out;
  }
  function allPrompts() { return window.MPPrompt ? window.MPPrompt.all() : []; }
  function renderPromptFilters() {
    var list = allPrompts();
    var counts = {};
    list.forEach(function (p) { counts[p.cat] = (counts[p.cat] || 0) + 1; });
    var extra = list.filter(function (p) { return p.source === 'extra'; }).length;
    var out = '<button class="fchip ' + (state.prompt.cat === 'all' ? 'on' : '') + '" data-pc="all">全部 · ' + list.length + '</button>';
    out += '<button class="fchip ' + (state.prompt.cat === '专题' ? 'on' : '') + '" data-pc="专题">专题模板 · ' + extra + '</button>';
    Object.keys(counts).forEach(function (c) {
      out += '<button class="fchip ' + (state.prompt.cat === c ? 'on' : '') + '" data-pc="' + esc(c) + '">' + esc(c) + ' · ' + counts[c] + '</button>';
    });
    $('promptFilters').innerHTML = out;
  }
  function renderPrompts() {
    var list = allPrompts();
    var q = state.prompt.q.toLowerCase();
    var filtered = list.filter(function (p) {
      if (state.prompt.cat === '专题' && p.source !== 'extra') return false;
      if (state.prompt.cat !== 'all' && state.prompt.cat !== '专题' && p.cat !== state.prompt.cat) return false;
      if (q) {
        var hay = (p.title + ' ' + p.goal + ' ' + p.cat + ' ' + p.tags.join(' ') + ' ' + p.prompt).toLowerCase();
        if (hay.indexOf(q) < 0) return false;
      }
      return true;
    });
    $('promptCount').textContent = list.length;
    var shown = filtered.slice(0, state.prompt.limit);
    $('promptGrid').innerHTML = shown.map(function (p) {
      return '<article class="p-card" id="p-' + esc(p.id) + '">' +
        '<div class="p-top"><span class="p-cat">' + esc(p.cat) + '</span><span class="p-src">' + (p.source === 'extra' ? '专题' : '领域') + '</span></div>' +
        '<h3>' + esc(p.title) + '</h3>' +
        '<p class="p-goal">' + esc(p.goal) + '</p>' +
        '<div class="m-tags">' + p.tags.slice(0, 4).map(function (t) { return '<span class="m-tag">' + esc(t) + '</span>'; }).join('') + '</div>' +
        '<pre>' + esc(p.prompt) + '</pre>' +
        '<details class="p-explain" data-explain-id="' + esc(p.id) + '"><summary>这条提示词什么意思</summary><div class="ex-wrap"></div></details>' +
        '<div class="p-foot"><span class="p-mode">' + esc((p.mode || []).join(' · ')) + '</span>' +
        '<span style="display:flex;gap:6px">' + copyBtn(p.prompt, '复制') +
        '<button class="btn btn-sm js-use" data-problem="' + esc(p.goal) + '">去选型</button></span></div>' +
        '</article>';
    }).join('');
    if (!filtered.length) $('promptGrid').innerHTML = '<div class="empty">没有匹配的提示词，换个关键词试试</div>';
    $('promptMoreWrap').innerHTML = filtered.length > state.prompt.limit
      ? '<button class="btn" id="promptMore">加载更多（已显示 ' + shown.length + ' / ' + filtered.length + '）</button>'
      : '';
  }
  function renderPromptMatch(text) {
    var box = $('promptMatchResults');
    if (!text || text.trim().length < 2) { box.innerHTML = ''; return; }
    var res = window.MPPrompt.match(text, 5);
    if (!res.length) {
      box.innerHTML = '<div class="empty" style="border:0">没找到特别贴合的模板。可以直接用下方「全部」里最接近的一条，或把问题写得更具体一点。</div>';
      return;
    }
    box.innerHTML = res.map(function (r) {
      var ready = window.MPPrompt.substitute(r.item.prompt, text);
      var level = r.score >= 16 ? '高匹配' : (r.score >= 9 ? '较匹配' : '可参考');
      return '<article class="match-card">' +
        '<div class="match-head"><div><span class="p-cat">' + esc(r.item.cat) + '</span><h3>' + esc(r.item.title) + '</h3></div>' +
        '<span class="match-badge">' + level + '</span></div>' +
        '<p class="match-why">' + esc(r.item.goal) + '</p>' +
        '<div class="m-tags">' + r.hits.map(function (h) { return '<span class="m-tag">命中：' + esc(h) + '</span>'; }).join('') + '</div>' +
        '<pre class="match-prompt">' + esc(ready) + '</pre>' +
        '<div class="p-foot">' + copyBtn(ready, '复制这条') +
        '<button class="btn btn-sm" data-explain="' + esc(r.item.id) + '">解释含义</button>' +
        '<button class="btn btn-sm js-use" data-problem="' + esc(text) + '">用它去选型</button></div>' +
        '<div class="ex-wrap" id="ex-' + esc(r.item.id) + '" hidden></div>' +
        '</article>';
    }).join('');
  }

  /* ================= 关于 ================= */
  function renderAbout() {
    var cn = MODELS.filter(function (m) { return m.country === 'CN'; }).length;
    var vendors = {}; MODELS.forEach(function (m) { vendors[m.vendor] = 1; });
    var cats = {}; ALGOS.forEach(function (a) { cats[a.cat] = 1; });
    $('aboutStats').innerHTML =
      '<div class="kv"><div><span>收录模型</span><b>' + MODELS.length + ' 个</b></div>' +
      '<div><span>国内 / 海外</span><b>' + cn + ' / ' + (MODELS.length - cn) + '</b></div>' +
      '<div><span>覆盖厂商</span><b>' + Object.keys(vendors).length + ' 家</b></div>' +
      '<div><span>算法条目</span><b>' + ALGOS.length + ' 条</b></div>' +
      '<div><span>算法分类</span><b>' + Object.keys(cats).length + ' 类</b></div>' +
      '<div><span>任务模板</span><b>' + allPrompts().length + ' 条</b></div>' +
      '<div><span>提示词分类</span><b>' + Object.keys(allPrompts().reduce(function (o, p) { o[p.cat] = 1; return o; }, {})).length + ' 类</b></div>' +
      '<div><span>数据快照</span><b>' + esc(META.dataDate || '-') + '</b></div>' +
      '<div><span>费用</span><b>完全免费，无登录</b></div></div>';
    $('aboutSources').innerHTML = (META.sources || []).map(function (s) {
      return '<a href="' + esc(s.url) + '" target="_blank" rel="noopener">' + esc(s.name) + '</a>';
    }).join('');

    var pr = window.MP_PRICES;
    if (pr && pr.entries) {
      var n = Object.keys(pr.entries).length;
      var pst = priceSyncStats(pr);
      var srcRows = (pr.sources || []).map(function (s) {
        return '<div class="kv"><div><span>' + esc(s.name) + '</span><b>' + (s.ok ? (s.count + ' 条') : '抓取失败') + '</b></div></div>';
      }).join('');
      $('aboutPriceSync').innerHTML =
        '<div class="kv"><div><span>最近同步</span><b>' + dtText(pr.updatedAt) + '</b></div>' +
        '<div><span>覆盖条目</span><b>' + n + ' 个模型</b></div>' +
        '<div><span>仍用旧价</span><b>' + pst.stale + ' 个模型（沿用快照 ' + esc(META.dataDate || '—') + '）</b></div>' +
        '<div><span>汇率</span><b>1 USD = ' + (pr.fx || 7.1) + ' CNY</b></div></div>' +
        srcRows +
        '<p class="hint-line" style="margin-top:10px">静态站点不能直接跨域抓各家官网，所以同步由一个小脚本完成；部署到 GitHub 后由 Actions 每天自动提交，本地可用计划任务。</p>' +
        '<code class="cmd">node tools/sync-prices.mjs --apply</code>' +
        '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px"><button class="btn btn-sm" id="aboutCheckPrice">立即检查更新</button>' +
        '<a class="btn btn-sm" href="tools/install-daily-sync.ps1" target="_blank" rel="noopener">每日任务脚本</a></div>' +
        '<div class="hint-line">同步只覆盖能稳定解析的官方来源；解析失败时保留原值，不猜测。</div>';
    } else {
      $('aboutPriceSync').innerHTML = '<p class="hint-line">还没有同步数据。运行 <code>node tools/sync-prices.mjs --apply</code> 生成 prices.js。</p>';
    }
    renderAboutTrack();
  }

  function renderAboutTrack() {
    if (!window.MPTrack || !$('aboutTrack')) return;
    var s = MPTrack.summary();
    var rows = Object.keys(s.by).sort(function (a, b) { return s.by[b] - s.by[a]; }).slice(0, 5)
      .map(function (k) { return '<div><span>' + esc(k) + '</span><b>' + s.by[k] + ' 次</b></div>'; }).join('');
    $('aboutTrack').innerHTML = '<div class="kv"><div><span>匿名 ID</span><b>' + esc(s.id) + '</b></div>' +
      '<div><span>本地记录事件</span><b>' + s.total + ' 条</b></div></div>' +
      '<div class="src">' + (rows || '<div>还没有事件</div>') + '</div>' +
      '<p class="hint-line">只存在这台设备的 localStorage，不上传、不跨站跟踪；清空浏览器即重置。</p>';
  }

  /* ================= 全局搜索 ================= */
  function searchIndex() {
    return {
      models: MODELS.map(function (m) {
        return {
          kind: 'model', id: m.id, title: m.name, tag: 'L' + m.tier,
          sub: m.vendor + ' · ' + priceShort(m) + ' · ' + ctxLabel(m.ctx) + ' 上下文',
          hay: (m.name + ' ' + m.vendor + ' ' + m.desc + ' ' + (m.strengths || []).join(' ') + ' ' +
            (m.weaknesses || []).join(' ') + ' ' + (m.bestFor || []).join(' ') + ' ' + (m.modes || []).join(' ')).toLowerCase()
        };
      }),
      algos: ALGOS.map(function (a) {
        return {
          kind: 'algo', id: a.id, title: a.name, tag: a.cat,
          sub: a.oneLiner,
          hay: (a.name + ' ' + a.en + ' ' + a.oneLiner + ' ' + a.cat + ' ' + (a.related || []).join(' ')).toLowerCase()
        };
      }),
      solutions: SOLUTIONS.map(function (s) {
        return {
          kind: 'solution', id: s.id, title: s.title, tag: '方案',
          sub: s.pain,
          hay: (s.title + ' ' + s.keywords.join(' ') + ' ' + s.pain + ' ' + s.level).toLowerCase()
        };
      }),
      tasks: allPrompts().map(function (p) {
        return {
          kind: 'task', id: p.id, cat: p.cat, title: p.title, tag: p.source === 'extra' ? '专题' : '任务',
          sub: p.cat + ' · ' + p.goal,
          hay: (p.title + ' ' + p.goal + ' ' + p.cat + ' ' + p.tags.join(' ') + ' ' + String(p.prompt).slice(0, 500)).toLowerCase()
        };
      })
    };
  }
  function srItem(x) {
    return '<button class="sr-item" data-kind="' + x.kind + '" data-id="' + esc(x.id) + '"' +
      (x.cat ? ' data-cat="' + esc(x.cat) + '"' : '') + '>' +
      '<b>' + esc(x.title) + '<em>' + esc(x.tag) + '</em></b><span>' + esc(x.sub) + '</span></button>';
  }
  function renderSearch(q) {
    q = (q || '').trim();
    var terms = q.toLowerCase().split(/\s+/).filter(Boolean);
    function hit(h) { return !terms.length || terms.every(function (t) { return h.indexOf(t) >= 0; }); }
    var idx = searchIndex();
    var models = idx.models.filter(function (x) { return hit(x.hay); });
    var algos = idx.algos.filter(function (x) { return hit(x.hay); });
    var tasks = idx.tasks.filter(function (x) { return hit(x.hay); });
    var sols = (idx.solutions || []).filter(function (x) { return hit(x.hay); });
    if (!q) models.sort(function (a, b) { return +b.tag.slice(1) - +a.tag.slice(1); });
    var html = '';
    if (sols.length && q) html += '<div class="sr-group">解决方案 · ' + sols.length + '</div>' + sols.slice(0, 3).map(srItem).join('');
    if (models.length) html += '<div class="sr-group">模型 · ' + models.length + '</div>' + models.slice(0, 5).map(srItem).join('');
    if (algos.length) html += '<div class="sr-group">算法 · ' + algos.length + '</div>' + algos.slice(0, 5).map(srItem).join('');
    if (tasks.length) html += '<div class="sr-group">任务模板 · ' + tasks.length + '</div>' + tasks.slice(0, 4).map(srItem).join('');
    $('searchResults').innerHTML = html || '<div class="empty" style="border:0;padding:28px">没找到。试试「长文档」「代码」「MoE」「合同」「翻译」</div>';
  }
  function openSearch() {
    var d = $('searchDlg');
    if (!d) return;
    if (!d.open) { $('globalSearch').value = ''; renderSearch(''); d.showModal(); }
    setTimeout(function () { $('globalSearch').focus(); }, 40);
  }
  function openSearchResult(el) {
    var kind = el.getAttribute('data-kind'), id = el.getAttribute('data-id'), cat = el.getAttribute('data-cat');
    $('searchDlg').close();
    if (kind === 'solution') {
      showView('solutions');
      setTimeout(function () {
        var el0 = document.getElementById('sol-' + id);
        if (el0) { el0.scrollIntoView({ behavior: 'smooth', block: 'center' }); el0.style.borderColor = 'rgba(94,234,212,.7)'; }
      }, 120);
      return;
    }
    if (kind === 'model') { showView('models'); showModel(id); return; }
    if (kind === 'algo') {
      state.algo.cat = '全部'; state.algo.q = ''; $('algoSearch').value = '';
      renderAlgoNav(); renderAlgos(); showView('algos');
      setTimeout(function () {
        var el2 = document.getElementById('algo-' + id);
        if (el2) { el2.open = true; el2.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
      }, 120);
      return;
    }
    if (kind === 'task') {
      state.prompt.cat = cat || 'all'; state.prompt.q = ''; if ($('promptSearch')) $('promptSearch').value = '';
      var sameCat = allPrompts().filter(function (p) { return state.prompt.cat === 'all' || p.cat === state.prompt.cat; });
      var idx = sameCat.findIndex(function (p) { return p.id === id; });
      state.prompt.limit = Math.max(48, idx + 1);
      renderPromptFilters(); renderPrompts(); showView('prompts');
      setTimeout(function () {
        var el3 = document.getElementById('p-' + id);
        if (el3) { el3.scrollIntoView({ behavior: 'smooth', block: 'center' }); el3.style.borderColor = 'rgba(94,234,212,.6)'; }
      }, 120);
    }
  }

  /* ================= 价格同步 ================= */
  function dtText(iso) {
    if (!iso) return '—';
    var d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    function p(n) { return (n < 10 ? '0' : '') + n; }
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
  }
  function applyPrices(pr) {
    if (!pr || !pr.entries) return;
    MODELS.forEach(function (m) {
      var e = pr.entries[m.id];
      if (!e) return;
      m.priceIn = e.priceIn;
      m.priceOut = e.priceOut;
      m.priceConf = e.conf || 'official';
      m.syncedAt = pr.updatedAt;
      m.syncSource = e.source;
      m.priceSource = e.source;
    });
  }
  function priceSyncStats(pr) {
    var sources = (pr && pr.sources) || [];
    var n = pr && pr.entries ? Object.keys(pr.entries).length : 0;
    var updated = MODELS.filter(function (m) { return pr && m.syncedAt === pr.updatedAt; }).length;
    return {
      n: n, sources: sources,
      okSources: sources.filter(function (s) { return s.ok; }).length,
      updated: updated, stale: MODELS.length - updated
    };
  }
  function renderPriceSync() {
    var box = $('priceSync');
    if (!box) return;
    var pr = window.MP_PRICES;
    if (!pr || !pr.entries) {
      box.innerHTML = '价格快照 ' + (META.dataDate || '') + ' · 运行 <code>tools/sync-prices.mjs</code> 可每日更新';
      return;
    }
    var st = priceSyncStats(pr);
    var html = '<span class="dot"></span>价格已同步 · ' + dtText(pr.updatedAt) +
      ' · 成功来源 ' + st.okSources + '/' + st.sources.length +
      ' · 本次更新 ' + st.n + ' 条（覆盖 ' + st.updated + '/' + MODELS.length + ' 个模型）' +
      (st.stale ? ' · <b style="color:#fcd34d">' + st.stale + ' 个模型仍用旧价</b>' : '') +
      ' <button class="link-btn" id="checkPriceBtn" type="button">检查更新</button>';
    if (st.stale) {
      html += '<div class="sync-note">未覆盖的模型沿用数据快照 ' + esc(META.dataDate || '—') + ' 的价格；「来源在线」只表示抓取成功，不等于价格已重新核验。</div>';
    }
    if (priceCheck && priceCheck.status === 'error') {
      html += '<div class="sync-note err">上次检查失败：' + esc(priceCheck.msg) +
        '；当前使用 ' + dtText(pr.updatedAt) + ' 的本地快照。</div>' +
        '<button class="link-btn" id="checkPriceBtn2" type="button">重试</button>';
    } else if (priceCheck && priceCheck.status === 'ok') {
      html += '<div class="sync-note ok">最近一次检查：' + esc(priceCheck.msg) + '</div>';
    }
    box.innerHTML = html;
  }
  function refreshAfterPrices() {
    renderPriceSync();
    renderLibStats();
    renderLibrary();
    renderAbout();
    if (state.plan) {
      try {
        state.plan = E.buildPlan(state.plan.problem, state.plan.opts);
        renderResults();
      } catch (e) { }
    }
  }
  function checkPrices() {
    if (location.protocol === 'file:') {
      priceCheck = { status: 'error', msg: 'file:// 模式不能联网检查' };
      renderPriceSync();
      toast('file:// 模式不能联网检查；请运行 node tools/sync-prices.mjs --apply 后刷新');
      return;
    }
    toast('正在检查最新价格…');
    fetch('assets/js/data/prices.json?ts=' + Date.now(), { cache: 'no-store' })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (pr) {
        var old = window.MP_PRICES && window.MP_PRICES.updatedAt;
        if (!old || new Date(pr.updatedAt) > new Date(old)) {
          window.MP_PRICES = pr;
          applyPrices(pr);
          priceCheck = { status: 'ok', msg: '已更新到 ' + dtText(pr.updatedAt) };
          refreshAfterPrices();
          toast('价格已更新到 ' + dtText(pr.updatedAt));
        } else {
          priceCheck = { status: 'ok', msg: '已是最新（' + dtText(pr.updatedAt) + '）' };
          renderPriceSync();
          toast('已经是最新价格');
        }
      })
      .catch(function (e) {
        priceCheck = { status: 'error', msg: (e && e.message) || '网络错误' };
        renderPriceSync();
        toast('检查失败，当前使用上次快照');
      });
  }

  /* ================= 事件 ================= */
  function bind() {
    var dz = $('dropZone'), fi = $('fileInput');
    if (dz && fi) {
      dz.addEventListener('click', function (e) { if (e.target === fi || e.target.closest('#pickFileBtn')) return; fi.click(); });
      $('pickFileBtn').addEventListener('click', function (e) { e.stopPropagation(); fi.click(); });
      fi.addEventListener('change', function () { ingestFiles(fi.files); fi.value = ''; });
      ['dragenter', 'dragover'].forEach(function (ev) {
        dz.addEventListener(ev, function (e) { e.preventDefault(); dz.classList.add('drag'); });
      });
      ['dragleave', 'drop'].forEach(function (ev) {
        dz.addEventListener(ev, function (e) { e.preventDefault(); dz.classList.remove('drag'); });
      });
      dz.addEventListener('drop', function (e) {
        if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length) ingestFiles(e.dataTransfer.files);
      });
      $('fileList').addEventListener('click', function (e) {
        var b = e.target.closest('[data-del]');
        if (b) { e.stopPropagation(); removeFile(b.getAttribute('data-del')); }
      });
      $('fileAnalysis').addEventListener('click', function (e) {
        if (e.target.closest('#useFileBtn')) syncAutoProblem(true);
      });
    }

    $('searchBtn').addEventListener('click', openSearch);
    $('globalSearch').addEventListener('input', function (e) { renderSearch(e.target.value); });
    $('globalSearch').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        var first = document.querySelector('#searchResults .sr-item');
        if (first) first.click();
      }
    });
    $('searchResults').addEventListener('click', function (e) {
      var item = e.target.closest('.sr-item');
      if (item) openSearchResult(item);
    });
    $('searchDlg').addEventListener('click', function (e) { if (e.target === $('searchDlg')) $('searchDlg').close(); });
    document.addEventListener('keydown', function (e) {
      var tag = (document.activeElement && document.activeElement.tagName) || '';
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) { e.preventDefault(); openSearch(); return; }
      if (e.key === '/' && ['INPUT', 'TEXTAREA', 'SELECT'].indexOf(tag) < 0 && !$('searchDlg').open) {
        e.preventDefault(); openSearch();
      }
    });

    document.querySelectorAll('.check').forEach(function (c) {
      var input = c.querySelector('input');
      input.addEventListener('change', function () { c.classList.toggle('on', input.checked); });
    });
    $('runBtn').addEventListener('click', runPlan);
    $('results').addEventListener('click', function (e) {
      var b = e.target.closest('[data-audience]');
      if (b) {
        state.audience = b.getAttribute('data-audience');
        try { localStorage.setItem('mp_audience', state.audience); } catch (err) { }
        document.body.dataset.audience = state.audience;
        renderResults();
        return;
      }
      var h = e.target.closest('.score-help');
      if (h) {
        var a = {};
        try { a = JSON.parse(h.getAttribute('data-audit') || '{}'); } catch (err) { }
        showScoreAudit(a);
      }
    });
    $('scoreClose').addEventListener('click', function () { $('scoreDlg').close(); });
    $('scoreDlg').addEventListener('click', function (e) { if (e.target === $('scoreDlg')) $('scoreDlg').close(); });
    $('problemInput').addEventListener('keydown', function (e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') runPlan();
    });
    $('problemInput').addEventListener('input', function () {
      $('charCount').textContent = $('problemInput').value.length + ' 字';
      state.allowRelax = false;
    });
    document.addEventListener('change', function (e) {
      if (e.target && e.target.matches('input[name=budget],input[name=time],input[name=tokens],.check input,#domainSelect')) {
        state.allowRelax = false;
      }
    });
    document.querySelectorAll('.js-example').forEach(function (b) {
      b.addEventListener('click', function () {
        $('problemInput').value = b.getAttribute('data-text');
        $('problemInput').focus();
        $('charCount').textContent = $('problemInput').value.length + ' 字';
        showView('pick');
        $('problemInput').scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    });

    $('libSearch').addEventListener('input', function (e) { state.lib.q = e.target.value; renderLibrary(); });
    $('libSort').addEventListener('change', function (e) { state.lib.sort = e.target.value; renderLibrary(); });
    $('libFilters').addEventListener('click', function (e) {
      var b = e.target.closest('[data-country]'); if (!b) return;
      state.lib.country = b.getAttribute('data-country');
      document.querySelectorAll('#libFilters .fchip').forEach(function (x) { x.classList.toggle('on', x === b); });
      renderLibrary();
    });
    $('libTierFilters').addEventListener('click', function (e) {
      var b = e.target.closest('[data-tier]'); if (!b) return;
      state.lib.tier = b.getAttribute('data-tier');
      document.querySelectorAll('#libTierFilters .fchip').forEach(function (x) { x.classList.toggle('on', x === b); });
      renderLibrary();
    });
    $('libFlagFilters').addEventListener('click', function (e) {
      var b = e.target.closest('[data-flag]'); if (!b) return;
      state.lib.flag = b.getAttribute('data-flag');
      document.querySelectorAll('#libFlagFilters .fchip').forEach(function (x) { x.classList.toggle('on', x === b); });
      renderLibrary();
    });

    $('algoNav').addEventListener('click', function (e) {
      var b = e.target.closest('[data-cat]'); if (!b) return;
      state.algo.cat = b.getAttribute('data-cat');
      renderAlgoNav(); renderAlgos();
    });
    $('algoSearch').addEventListener('input', function (e) { state.algo.q = e.target.value; renderAlgos(); });

    $('promptFilters').addEventListener('click', function (e) {
      var b = e.target.closest('[data-pc]'); if (!b) return;
      state.prompt.cat = b.getAttribute('data-pc');
      state.prompt.limit = 48;
      renderPromptFilters(); renderPrompts();
    });
    $('promptSearch').addEventListener('input', function (e) {
      state.prompt.q = e.target.value; state.prompt.limit = 48; renderPrompts();
    });
    $('promptMoreWrap').addEventListener('click', function (e) {
      if (e.target.closest('#promptMore')) { state.prompt.limit += 48; renderPrompts(); }
    });
    function fillExplain(d) {
      if (!d || !d.open) return;
      var box = d.querySelector('.ex-wrap');
      if (!box || box.innerHTML) return;
      var item = allPrompts().filter(function (x) { return x.id === d.getAttribute('data-explain-id'); })[0];
      if (item) box.innerHTML = window.MPPrompt.explain(item);
    }
    $('promptGrid').addEventListener('toggle', function (e) {
      if (e.target && e.target.tagName === 'DETAILS') fillExplain(e.target);
    }, true);
    $('promptGrid').addEventListener('click', function (e) {
      var d = e.target.closest('details.p-explain');
      if (d) setTimeout(function () { fillExplain(d); }, 0);
    });
    $('promptMatchBtn').addEventListener('click', function () {
      renderPromptMatch($('promptMatchInput').value);
      setTimeout(function () { $('promptMatchResults').scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 60);
    });
    $('promptMatchInput').addEventListener('keydown', function (e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); renderPromptMatch($('promptMatchInput').value); }
    });
    $('solutionBtn').addEventListener('click', function () {
      renderSolutionMatch($('solutionInput').value);
      setTimeout(function () { $('solutionResults').scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 60);
    });
    $('solutionInput').addEventListener('keydown', function (e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); renderSolutionMatch($('solutionInput').value); }
    });

    document.addEventListener('click', function (e) {
      if (e.target.closest('#checkPriceBtn, #checkPriceBtn2, #aboutCheckPrice')) { checkPrices(); return; }
      var copy = e.target.closest('[data-copy]');
      if (copy) { copyText(CLIP[copy.getAttribute('data-copy')] || ''); return; }
      var task = e.target.closest('.js-task');
      if (task) { openWhy(task.getAttribute('data-task')); return; }
      var start = e.target.closest('[data-start-task]');
      if (start) { startTask(start.getAttribute('data-start-task')); return; }
      var vb = e.target.closest('[data-view]');
      if (vb) {
        if ($('whyDlg').open) $('whyDlg').close();
        showView(vb.getAttribute('data-view')); return;
      }
      var model = e.target.closest('.js-model');
      if (model) { showModel(model.getAttribute('data-model')); return; }
      var ex = e.target.closest('[data-explain]');
      if (ex) {
        var id = ex.getAttribute('data-explain');
        var item = allPrompts().filter(function (x) { return x.id === id; })[0];
        var box = $('ex-' + id);
        if (item && box) {
          if (!box.innerHTML) box.innerHTML = window.MPPrompt.explain(item);
          box.hidden = !box.hidden;
          ex.textContent = box.hidden ? '解释含义' : '收起解释';
        }
        return;
      }
      var use = e.target.closest('.js-use');
      if (use) {
        $('problemInput').value = use.getAttribute('data-problem');
        $('charCount').textContent = $('problemInput').value.length + ' 字';
        showView('pick');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });

    $('dlgClose').addEventListener('click', function () { $('modelDlg').close(); });
    $('modelDlg').addEventListener('click', function (e) { if (e.target === $('modelDlg')) $('modelDlg').close(); });
    $('whyClose').addEventListener('click', function () { $('whyDlg').close(); });
    $('whyDlg').addEventListener('click', function (e) { if (e.target === $('whyDlg')) $('whyDlg').close(); });
    $('taskGrid').addEventListener('keydown', function (e) {
      if ((e.key === 'Enter' || e.key === ' ') && e.target.closest('.js-task')) {
        e.preventDefault(); openWhy(e.target.closest('.js-task').getAttribute('data-task'));
      }
    });
  }

  function init() {
    document.body.dataset.audience = state.audience;
    bind();
    applyPrices(window.MP_PRICES);
    renderPriceSync();
    var sel = $('domainSelect');
    DOMAINS.forEach(function (d) {
      var o = document.createElement('option');
      o.value = d.id; o.textContent = (d.icon ? d.icon + ' ' : '') + d.name;
      sel.appendChild(o);
    });
    var vendors = {}; MODELS.forEach(function (m) { vendors[m.vendor] = 1; });
    $('heroModels').innerHTML = MODELS.length + '<em>个</em>';
    $('heroAlgos').innerHTML = (ALGOS.length || '—') + '<em>条</em>';
    if (promptPacksLoaded) $('heroTasks').innerHTML = allPrompts().length + '<em>套</em>';
    $('heroVendors').innerHTML = Object.keys(vendors).length + '<em>家</em>';
    if (META.dataDate) {
      $('footDate').textContent = META.dataDate;
      if ($('dataDate')) $('dataDate').textContent = META.dataDate;
    }
    var pd = (window.MP_PRICES && MP_PRICES.updatedAt)
      ? new Date(MP_PRICES.updatedAt).toISOString().slice(0, 10)
      : (META.dataDate || '');
    if ($('priceDate')) $('priceDate').textContent = pd;
    renderAbout();
    renderLibStats();
    renderLibrary();
    renderAlgoNav(); renderAlgos();
    renderPromptFilters(); renderPrompts();
    renderSolutions(); initCalc();
    renderTaskHall();
    if (window.MPPK) MPPK.init();
    var h = (location.hash || '').replace('#', '');
    if (['pick', 'solutions', 'pk', 'models', 'algos', 'prompts', 'about'].indexOf(h) >= 0) showView(h, true);
    window.addEventListener('popstate', function () {
      var hh = (location.hash || '#pick').replace('#', '');
      if (['pick', 'solutions', 'pk', 'models', 'algos', 'prompts', 'about'].indexOf(hh) >= 0) showView(hh, true);
    });
    if (!ALGOS.length) $('algoList').innerHTML = '<div class="empty">算法库加载中…</div>';

    var qs = new URLSearchParams(location.search);
    var demoMap = {
      app: '我想做一个面向大学生的 AI 求职助手小程序，只有我一个人开发，两周内上线，预算很紧',
      report: '帮我读完这份 300 页的行业报告，输出 10 页汇报 PPT，明天上午就要讲，预算不限',
      coding: '我的 Python 爬虫在 Windows 上跑十分钟就崩溃，日志只有一行 MemoryError，今天必须修好',
      learn: '我想系统学习大模型原理，三个月后能自己微调一个 7B 模型，只有晚上和周末有时间'
    };
    var preset = qs.get('q') || demoMap[qs.get('demo')] || '';
    if (preset) {
      $('problemInput').value = preset;
      $('charCount').textContent = preset.length + ' 字';
      showView('pick');
      setTimeout(function () { runPlan(true); }, 120);
    }
    var mid = qs.get('model');
    if (mid) setTimeout(function () { showModel(mid); }, 500);
    var tid = qs.get('task');
    if (tid) setTimeout(function () { openWhy(tid); }, 300);
    if (qs.get('pk') === 'demo') {
      showView('pk');
      setTimeout(function () { if (window.MPPK) MPPK.demo(); }, 350);
    }
    var scene = qs.get('scene');
    if (scene) {
      showView('solutions');
      $('solutionInput').value = scene;
      renderSolutionMatch(scene);
    }
    var pm = qs.get('pm');
    if (pm) {
      showView('prompts');
      $('promptMatchInput').value = pm;
      renderPromptMatch(pm);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
