/* 最近方案 + 方案分享（不改主站逻辑，独立挂载）。 */
(function () {
  var KEY = 'mp_recent_plans';
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function b64e(s) { return btoa(unescape(encodeURIComponent(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
  function b64d(s) { s = s.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; return decodeURIComponent(escape(atob(s))); }
  function val(name) { var e = document.querySelector('input[name="' + name + '"]:checked'); return e ? e.value : ''; }
  function read() { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (e) { return []; } }
  function write(arr) { try { localStorage.setItem(KEY, JSON.stringify(arr.slice(0, 5))); } catch (e) { } }

  function snapshot() {
    var q = $('problemInput') ? $('problemInput').value.trim() : '';
    if (q.length < 6) return null;
    var checks = {};
    document.querySelectorAll('.check input[type="checkbox"]').forEach(function (c) { checks[c.value] = !!c.checked; });
    return { q: q, b: val('budget'), t: val('time'), k: val('tokens'), d: $('domainSelect') ? $('domainSelect').value : '', c: checks, ts: Date.now() };
  }
  function save() {
    var st = snapshot(); if (!st) return;
    var arr = read().filter(function (x) { return x.q !== st.q || x.b !== st.b || x.t !== st.t || x.k !== st.k || JSON.stringify(x.c) !== JSON.stringify(st.c); });
    arr.unshift(st); write(arr); render();
  }
  function meta(st) {
    var b = { free: '零预算', low: '低预算', mid: '中等预算', high: '预算不设限' }[st.b] || '默认预算';
    var t = { urgent: '很赶', normal: '正常', relaxed: '不急' }[st.t] || '';
    return [b, t].filter(Boolean).join(' · ');
  }
  function render() {
    var wrap = $('recentWrap'), list = $('recentList'); if (!wrap || !list) return;
    var arr = read();
    if (!arr.length) { wrap.hidden = true; list.innerHTML = ''; return; }
    wrap.hidden = false;
    list.innerHTML = arr.map(function (x, i) {
      var q = x.q.length > 46 ? x.q.slice(0, 46) + '…' : x.q;
      return '<button type="button" class="recent-item" data-recent="' + i + '"><b>' + esc(q) + '</b><span>' + esc(meta(x)) + ' → 重新生成</span></button>';
    }).join('');
  }
  function apply(st, auto) {
    if (!st || !st.q) return false;
    $('problemInput').value = st.q;
    $('problemInput').dispatchEvent(new Event('input', { bubbles: true }));
    [['budget', st.b], ['time', st.t], ['tokens', st.k]].forEach(function (p) {
      if (!p[1]) return;
      var e = document.querySelector('input[name="' + p[0] + '"][value="' + p[1] + '"]');
      if (e) e.checked = true;
    });
    Object.keys(st.c || {}).forEach(function (k) {
      var e = document.querySelector('.check input[value="' + k + '"]');
      if (e) e.checked = !!st.c[k];
    });
    if (st.d && $('domainSelect')) $('domainSelect').value = st.d;
    var tab = document.querySelector('[data-view="pick"]'); if (tab) tab.click();
    setTimeout(function () { var b = $('runBtn'); if (b) b.click(); }, auto ? 180 : 60);
    return true;
  }
  function copy(text) {
    function fallback() {
      var ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); } catch (e) { }
      document.body.removeChild(ta);
    }
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(function () { }, fallback); else fallback();
  }
  function share() {
    var st = snapshot(); if (!st) return;
    var base = location.href.split('#')[0].split('?')[0];
    copy(base + '?h=' + b64e(JSON.stringify(st)));
    var b = $('shareRecent'); if (b) { b.textContent = '链接已复制'; setTimeout(function () { b.textContent = '复制分享链接'; }, 1600); }
  }
  function addShare() {
    if (!document.querySelector('#results .result-head')) return;
    var acts = document.querySelector('#results .actions');
    if (!acts || $('shareRecent')) return;
    var b = document.createElement('button');
    b.className = 'btn btn-ghost'; b.id = 'shareRecent'; b.type = 'button'; b.textContent = '复制分享链接';
    b.addEventListener('click', share);
    acts.appendChild(b);
  }
  function init() {
    if (!$('recentWrap')) return;
    render();
    $('recentClear').addEventListener('click', function () { write([]); render(); });
    $('recentList').addEventListener('click', function (e) {
      var b = e.target.closest('[data-recent]'); if (!b) return;
      var arr = read(); apply(arr[+b.getAttribute('data-recent')]);
    });
    var obs = new MutationObserver(function () {
      clearTimeout(obs._t);
      obs._t = setTimeout(function () { addShare(); if (document.querySelector('#results .result-head')) save(); }, 350);
    });
    obs.observe($('results'), { childList: true, subtree: true });
    var m = /[?&]h=([^&]+)/.exec(location.search || '');
    if (m) { try { apply(JSON.parse(b64d(m[1])), true); } catch (e) { } }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
