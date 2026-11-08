/* 首页排行榜：总榜 + 分榜；能力分 + 用户评分（Supabase / 本地）。 */
(function () {
  var MODELS = (window.MP_MODELS || []).concat(window.MP_MODELS_EXTRA || []);
  var E = window.MPEngine;
  var CFG = window.MP_SUPABASE || {};
  var state = { dim: 'all', ratings: {}, votes: 0, source: 'none', loading: false };

  var DIMS = [
    { id: 'all', name: '总榜', sub: '综合能力 + 用户评分' },
    { id: 'rating', name: '口碑', sub: '用户真实评分' },
    { id: 'coding', name: '代码', sub: '代码工程与推理' },
    { id: 'writing', name: '写作', sub: '写作与中文语感' },
    { id: 'value', name: '性价比', sub: '能力与价格' },
    { id: 'longctx', name: '长文本', sub: '上下文与长文能力' },
    { id: 'vision', name: '多模态', sub: '视觉理解' },
    { id: 'agent', name: 'Agent', sub: '工具调用与长程任务' },
    { id: 'free', name: '免费', sub: '零成本可用' },
    { id: 'l2', name: 'L2 轻量', sub: '低成本主力' },
    { id: 'open', name: '开源', sub: '可私有化' }
  ];

  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function priceBlend(m) { return E ? E.blend(m) : (m.priceIn * 0.7 + m.priceOut * 0.3); }
  function priceShort(m) {
    if (m.priceIn === 0 && m.priceOut === 0) return m.open ? '自托管' : '免费';
    return '¥' + String(+m.priceIn.toFixed(2)) + '/' + String(+m.priceOut.toFixed(2));
  }
  function ctxLabel(n) {
    if (n >= 1000000) return (n / 1000000).toFixed(n % 1000000 ? 1 : 0) + 'M';
    return Math.round(n / 1000) + 'K';
  }
  function cfgOk() { return !!(CFG.url && CFG.anonKey && /^https?:\/\//i.test(CFG.url)); }
  function base() { return String(CFG.url || '').replace(/\/$/, '') + '/rest/v1/' + (CFG.table || 'ratings'); }
  function headers() { return { apikey: CFG.anonKey, Authorization: 'Bearer ' + CFG.anonKey }; }

  function localMap() {
    try {
      var o = JSON.parse(localStorage.getItem('mp_ratings') || '{}');
      var map = {};
      Object.keys(o).forEach(function (id) {
        var s = +o[id];
        if (s >= 1 && s <= 5) map[id] = { sum: s, count: 1 };
      });
      return map;
    } catch (e) { return {}; }
  }
  function userAvg(m) {
    var r = state.ratings[m.id];
    return r && r.count ? { avg: r.sum / r.count, count: r.count } : null;
  }

  function priceScore(m) {
    var b = priceBlend(m);
    if (b <= 0) return 10;
    return Math.max(0, 10 - Math.log10(1 + b) * 3.2);
  }
  function ctxScore(m) {
    return Math.min(10, Math.log10(Math.max(1, m.ctx / 1000)) / 3 * 10);
  }
  function baseScore(m, dim) {
    var d = m.dims;
    if (dim === 'coding') return d.coding * 0.65 + d.reasoning * 0.2 + d.agent * 0.15;
    if (dim === 'writing') return d.writing * 0.6 + d.chinese * 0.3 + d.reasoning * 0.1;
    if (dim === 'value') return d.value * 0.6 + priceScore(m) * 0.4;
    if (dim === 'longctx') return d.longctx * 0.5 + ctxScore(m) * 0.5;
    if (dim === 'vision') return d.vision * 0.7 + d.reasoning * 0.15 + d.longctx * 0.15;
    if (dim === 'agent') return d.agent * 0.6 + d.reasoning * 0.2 + d.coding * 0.2;
    return d.reasoning * 0.2 + d.coding * 0.2 + d.writing * 0.15 + d.chinese * 0.15 +
      d.agent * 0.1 + d.longctx * 0.08 + d.vision * 0.07 + d.math * 0.05;
  }
  function fits(m, dim) {
    if (dim === 'free') return m.priceIn === 0 && m.priceOut === 0;
    if (dim === 'l2') return m.tier <= 2;
    if (dim === 'open') return !!m.open;
    if (dim === 'rating') return !!userAvg(m);
    return true;
  }
  function scoreOf(m, dim) {
    var base = baseScore(m, dim);
    var u = userAvg(m);
    if (dim === 'rating') return u ? u.avg * 2 : 0;
    // 只有真实共享评分（Supabase）且样本足够，才混入总榜；本机评分不参与
    if (dim === 'all' && state.source === 'supabase' && u && u.count >= 3) {
      return base * 0.8 + (u.avg * 2) * 0.2;
    }
    return base;
  }
  function rank(dim, n) {
    return MODELS.filter(function (m) { return fits(m, dim); })
      .map(function (m) { return { m: m, score: scoreOf(m, dim), user: userAvg(m) }; })
      .sort(function (a, b) { return b.score - a.score || b.m.tier - a.m.tier; })
      .slice(0, n || 6);
  }

  function reason(m, dim, u) {
    var d = m.dims;
    var r = '';
    if (dim === 'rating') r = '用户评分 ' + (u ? u.avg.toFixed(1) : '-') + ' · ' + (u ? u.count : 0) + ' 人';
    else if (dim === 'coding') r = '代码 ' + d.coding.toFixed(1) + ' · 推理 ' + d.reasoning.toFixed(1);
    else if (dim === 'writing') r = '写作 ' + d.writing.toFixed(1) + ' · 中文 ' + d.chinese.toFixed(1);
    else if (dim === 'value') r = '性价比 ' + d.value.toFixed(1) + ' · ' + priceShort(m);
    else if (dim === 'longctx') r = '长文本 ' + d.longctx.toFixed(1) + ' · ' + ctxLabel(m.ctx) + ' 上下文';
    else if (dim === 'vision') r = '视觉 ' + d.vision.toFixed(1) + ' · 推理 ' + d.reasoning.toFixed(1);
    else if (dim === 'agent') r = 'Agent ' + d.agent.toFixed(1) + ' · 代码 ' + d.coding.toFixed(1);
    else if (dim === 'free') r = '零成本 · 能力 ' + ((d.reasoning + d.coding + d.writing) / 3).toFixed(1);
    else if (dim === 'l2') r = 'L2 · 代码 ' + d.coding.toFixed(1) + ' · 中文 ' + d.chinese.toFixed(1);
    else if (dim === 'open') r = '开源 · 代码 ' + d.coding.toFixed(1) + ' · 长文 ' + d.longctx.toFixed(1);
    else r = '推理 ' + d.reasoning.toFixed(1) + ' · 代码 ' + d.coding.toFixed(1);
    if (u && dim !== 'rating') r += ' · 用户 ' + u.avg.toFixed(1) + '（' + u.count + '）';
    return r;
  }

  function rowHtml(x, i) {
    var m = x.m;
    var cls = i === 0 ? 'r1' : (i === 1 ? 'r2' : (i === 2 ? 'r3' : ''));
    return '<article class="rank-item js-model" data-model="' + esc(m.id) + '" tabindex="0">' +
      '<div class="rank-no ' + cls + '">' + (i + 1) + '</div>' +
      '<div class="rank-main"><div class="rank-name">' + esc(m.name) +
      '<span class="tier tier-' + m.tier + '">' + esc(E.tierLabel(m.tier)) + '</span></div>' +
      '<div class="rank-sub">' + esc(m.vendor) + ' · ' + esc(priceShort(m)) + ' · ' + esc(ctxLabel(m.ctx)) + '</div>' +
      '<div class="rank-reason">' + esc(reason(m, state.dim, x.user)) + '</div></div>' +
      '<div class="rank-score">' + x.score.toFixed(2) + '<small>' + (state.dim === 'all' ? '综合' : '能力') + '</small></div>' +
      '</article>';
  }
  function renderTabs(el, isDialog) {
    if (!el) return;
    el.innerHTML = DIMS.map(function (d) {
      return '<button class="fchip' + (state.dim === d.id ? ' on' : '') + '" data-rank-dim="' + d.id + '">' + esc(d.name) + '</button>';
    }).join('');
  }
  function renderList(el, n, isDialog) {
    if (!el) return;
    var rows = rank(state.dim, n);
    if (!rows.length) {
      el.innerHTML = '<div class="empty">还没有用户评分。打开任意模型，点星星打分；配置 Supabase 后会汇总所有人。</div>';
      if (isDialog) el.className = 'rank-list dialog';
      return;
    }
    el.innerHTML = rows.map(function (x, i) { return rowHtml(x, i); }).join('');
    if (isDialog) el.className = 'rank-list dialog';
  }
  function noteText() {
    if (state.source === 'supabase') return '用户评分来自 Supabase（' + state.votes + ' 条）；同一模型至少 3 条评分才混入总榜，总榜 = 能力 80% + 共享评分 20%。';
    if (state.source === 'local') return '本机有你的评分，但本机评分不参与全站总榜；总榜当前按能力分排序。';
    return '还没有共享评分，当前按能力分排序；配置 Supabase 并收到至少 3 条同模型评分后，总榜才会混入共享评分。';
  }
  function renderAll() {
    renderTabs($('rankTabs'), false);
    renderTabs($('rankDlgTabs'), true);
    renderList($('rankList'), 6, false);
    renderList($('rankDlgList'), 20, true);
    var dim = DIMS.filter(function (d) { return d.id === state.dim; })[0];
    if ($('rankSub')) $('rankSub').textContent = (dim ? dim.sub : '') + ' · 能力分 80% + 用户评分 20%';
    if ($('rankDlgSub')) $('rankDlgSub').textContent = (dim ? dim.name + ' · ' + dim.sub : '');
    if ($('rankNote')) $('rankNote').textContent = noteText();
  }
  function bindTabs(el) {
    if (!el) return;
    el.addEventListener('click', function (e) {
      var b = e.target.closest('[data-rank-dim]'); if (!b) return;
      state.dim = b.getAttribute('data-rank-dim');
      renderAll();
    });
  }

  function loadLocal() {
    var map = localMap();
    if (Object.keys(map).length) {
      state.ratings = map; state.source = 'local';
      state.votes = Object.keys(map).length;
    }
  }
  function loadRemote() {
    if (!cfgOk()) { renderAll(); return; }
    state.loading = true;
    fetch(base() + '?select=model_id,score&limit=5000', { headers: headers() })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (rows) {
        if (!Array.isArray(rows) || !rows.length) throw new Error('empty');
        var map = {};
        rows.forEach(function (x) {
          if (!x.model_id) return;
          if (!map[x.model_id]) map[x.model_id] = { sum: 0, count: 0 };
          map[x.model_id].sum += +x.score || 0;
          map[x.model_id].count++;
        });
        state.ratings = map; state.source = 'supabase'; state.votes = rows.length;
        renderAll();
      })
      .catch(function () {
        if (state.source === 'none') { loadLocal(); }
        renderAll();
      })
      .finally(function () { state.loading = false; });
  }
  function openDlg() {
    var d = $('rankDlg');
    if (!d) return;
    renderAll();
    if (!d.open) d.showModal();
  }
  function init() {
    if (!$('rankList')) return;
    loadLocal();
    renderAll();
    bindTabs($('rankTabs'));
    bindTabs($('rankDlgTabs'));
    if ($('rankMore')) $('rankMore').addEventListener('click', openDlg);
    if ($('rankClose')) $('rankClose').addEventListener('click', function () { $('rankDlg').close(); });
    if ($('rankDlg')) $('rankDlg').addEventListener('click', function (e) { if (e.target === $('rankDlg')) $('rankDlg').close(); });
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      var row = e.target.closest('.rank-item');
      if (row) { e.preventDefault(); row.click(); }
    });
    window.addEventListener('mp:rated', function () {
      if (state.source !== 'supabase') loadLocal();
      renderAll();
      setTimeout(loadRemote, 800);
    });
    loadRemote();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
