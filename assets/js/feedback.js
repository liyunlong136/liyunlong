/* 反馈入口：默认保存在本地，可复制/发邮件；配置 endpoint 后可直传。 */
(function () {
  var FB = window.MP_FEEDBACK || {};
  var ONLINE = !!FB.endpoint;
  var TYPES = [
    { k: '体验问题', i: '🧭' }, { k: '功能建议', i: '💡' },
    { k: '数据纠错', i: '📊' }, { k: '提示词建议', i: '✎' }, { k: '其他', i: '…' }
  ];
  var RATING = ['', '很不顺', '一般', '还行', '不错', '很顺'];
  var sel = { type: '体验问题', rating: 0 };
  var lastEntry = null;

  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function pageLabel() {
    var el = document.querySelector('.view.active');
    var id = el ? el.id.replace('view-', '') : 'pick';
    var map = { pick: '智能选型', solutions: '解决方案', pk: 'PK 对比', models: '模型库', algos: '算法库', prompts: '提示词库', about: '关于' };
    return (map[id] || id) + (location.hash ? ' ' + location.hash : '');
  }
  function modelLabel() {
    var d = $('modelDlg');
    return d && d.open ? ($('dlgTitle') ? $('dlgTitle').textContent : '') : '';
  }
  function meta() {
    return {
      ua: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      viewport: window.innerWidth + 'x' + window.innerHeight,
      dpr: window.devicePixelRatio || 1,
      aid: window.MPTrack ? MPTrack.id : ''
    };
  }
  function collect() {
    var text = $('fbText').value.trim();
    if (text.length < 5) { $('fbErr').classList.add('show'); $('fbText').focus(); return null; }
    $('fbErr').classList.remove('show');
    return {
      id: 'fb_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      ts: new Date().toISOString(),
      type: sel.type,
      rating: sel.rating,
      text: text,
      contact: $('fbContact').value.trim(),
      page: pageLabel(),
      model: modelLabel(),
      meta: $('fbMeta').checked ? meta() : {}
    };
  }
  function save(entry) {
    try {
      var arr = JSON.parse(localStorage.getItem('mp_feedback') || '[]');
      arr.push(entry);
      localStorage.setItem('mp_feedback', JSON.stringify(arr.slice(-100)));
    } catch (e) { }
  }
  function format(entry) {
    var L = [];
    L.push('【模选 ModelPick 反馈】');
    L.push('类型：' + entry.type + (entry.rating ? '｜评分：' + entry.rating + '/5（' + RATING[entry.rating] + '）' : ''));
    L.push('页面：' + entry.page);
    if (entry.model) L.push('模型：' + entry.model);
    L.push('内容：');
    L.push(entry.text);
    if (entry.contact) L.push('联系方式：' + entry.contact);
    L.push('时间：' + entry.ts);
    if (entry.meta && entry.meta.aid) {
      L.push('匿名 ID：' + entry.meta.aid);
      L.push('设备：' + (entry.meta.platform || '') + '｜' + (entry.meta.viewport || '') + '｜' + (entry.meta.language || ''));
    }
    return L.join('\n');
  }
  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(function () { toast('已复制'); }, fallback);
    } else fallback();
    function fallback() {
      var ta = document.createElement('textarea');
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); toast('已复制'); } catch (e) { toast('复制失败，请手动选择'); }
      document.body.removeChild(ta);
    }
  }
  function toast(msg) {
    var t = $('toast');
    if (!t) return;
    t.textContent = msg; t.classList.add('show');
    clearTimeout(t._timer);
    t._timer = setTimeout(function () { t.classList.remove('show'); }, 2200);
  }
  function renderTypes() {
    $('fbTypes').innerHTML = TYPES.map(function (t) {
      return '<button class="fb-chip' + (sel.type === t.k ? ' on' : '') + '" data-fb-type="' + esc(t.k) + '">' +
        '<span>' + t.i + '</span>' + esc(t.k) + '</button>';
    }).join('');
  }
  function renderStars() {
    var html = '<span class="fb-label">这次体验</span>';
    for (var i = 1; i <= 5; i++) {
      html += '<button class="fb-star' + (sel.rating >= i ? ' on' : '') + '" data-fb-star="' + i + '" aria-label="' + i + ' 星">★</button>';
    }
    html += '<span class="fb-rating-text">' + (sel.rating ? RATING[sel.rating] : '可选') + '</span>';
    $('fbStars').innerHTML = html;
  }
  function showDone(msg, entry, sent) {
    lastEntry = entry;
    var mail = '';
    if (FB.email) {
      var subject = encodeURIComponent('模选反馈：' + entry.type);
      var body = encodeURIComponent(format(entry).slice(0, 1800));
      mail = '<a class="btn btn-sm" href="mailto:' + esc(FB.email) + '?subject=' + subject + '&body=' + body + '">发邮件</a>';
    }
    var gh = FB.github
      ? '<a class="btn btn-sm" target="_blank" rel="noopener" href="' + esc(FB.github) + (FB.github.indexOf('?') >= 0 ? '&' : '?') +
        'title=' + encodeURIComponent('反馈：' + entry.type) + '&body=' + encodeURIComponent(format(entry).slice(0, 1800)) + '">去 GitHub 提 issue</a>'
      : '';
    $('fbDone').innerHTML = '<div class="fb-success"><b>' + esc(msg) + '</b>' +
      '<p>' + (sent ? '已经发送到反馈接口。' : (ONLINE ? '发送失败，已保存草稿，可复制或重试。' : '当前未接后端，反馈已保存为草稿，可复制或发邮件。')) + '</p>' +
      '<div class="actions"><button class="btn btn-sm" data-fb-copy>复制反馈内容</button>' + mail + gh +
      '<button class="btn btn-sm btn-ghost" data-fb-again>再写一条</button></div></div>';
    if (window.MPTrack) MPTrack.event('feedback_submit', { type: entry.type, sent: !!sent });
  }
  function submit() {
    var entry = collect();
    if (!entry) return;
    save(entry);
    if (!ONLINE) { showDone('草稿已保存', entry, false); return; }
    var btn = $('fbSubmit');
    btn.disabled = true; btn.textContent = '发送中…';
    fetch(FB.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry)
    }).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      showDone('已发送，谢谢', entry, true);
    }).catch(function () {
      showDone('发送失败，已保存在本地', entry, false);
    }).finally(function () {
      btn.disabled = false; btn.textContent = '提交反馈';
    });
  }
  function open() {
    var d = $('feedbackDlg');
    if (!d) return;
    if (d.open) { $('fbText').focus(); return; }
    d.showModal();
    if (window.MPTrack) MPTrack.event('feedback_open', { page: pageLabel() });
    setTimeout(function () { $('fbText').focus(); }, 60);
  }
  function reset() {
    $('fbText').value = '';
    $('fbContact').value = '';
    $('fbDone').innerHTML = '';
    sel.rating = 0;
    sel.type = '体验问题';
    renderTypes(); renderStars();
    $('fbErr').classList.remove('show');
  }
  function init() {
    if (!$('feedbackDlg')) return;
    renderTypes(); renderStars();
    $('fbTypes').addEventListener('click', function (e) {
      var b = e.target.closest('[data-fb-type]'); if (!b) return;
      sel.type = b.getAttribute('data-fb-type'); renderTypes();
    });
    $('fbStars').addEventListener('click', function (e) {
      var b = e.target.closest('[data-fb-star]'); if (!b) return;
      sel.rating = +b.getAttribute('data-fb-star'); renderStars();
    });
    document.querySelectorAll('#feedbackBtn, [data-open-feedback]').forEach(function (b) {
      b.addEventListener('click', open);
    });
    $('fbClose').addEventListener('click', function () { $('feedbackDlg').close(); });
    $('feedbackDlg').addEventListener('click', function (e) { if (e.target === $('feedbackDlg')) $('feedbackDlg').close(); });
    if (!ONLINE) {
      $('fbSubmit').textContent = '保存草稿';
      var note = document.querySelector('.fb-note');
      if (note) note.textContent = '当前未接后端：反馈只保存在本机，可复制后发邮件。配置 endpoint 后才会真正提交。';
    }
    $('fbSubmit').addEventListener('click', submit);
    $('fbCopy').addEventListener('click', function () {
      var entry = collect(); if (!entry) return;
      save(entry); copyText(format(entry));
      if (window.MPTrack) MPTrack.event('feedback_copy', { type: entry.type });
    });
    $('fbText').addEventListener('keydown', function (e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') submit();
    });
    $('fbDone').addEventListener('click', function (e) {
      if (e.target.closest('[data-fb-copy]')) copyText(format(lastEntry));
      if (e.target.closest('[data-fb-again]')) { reset(); $('fbText').focus(); }
    });
    try {
      if (new URLSearchParams(location.search).get('feedback') === '1') setTimeout(open, 300);
    } catch (e) { }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
