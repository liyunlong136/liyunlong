/* 价格实时核验插件
   说明：静态站点无法直接跨域请求厂商价格，本插件每次查看都会向本站请求
   最新 prices.json 快照，并显示快照时间、核验时间、数据年龄。
   快照由 tools/sync-prices.mjs + GitHub Actions 更新。 */
(function () {
  var state = {
    status: 'idle',        // idle | checking | fresh | updated | error | local
    checkedAt: 0,
    snapshotAt: '',
    message: ''
  };
  var timer = null;
  var lastCheck = 0;
  var INTERVAL = 5 * 60 * 1000;

  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function ageMin(iso) {
    if (!iso) return 0;
    var t = new Date(iso).getTime();
    if (isNaN(t)) return 0;
    return Math.max(0, Math.round((Date.now() - t) / 60000));
  }
  function ageText(iso) {
    var m = ageMin(iso);
    if (!m) return '刚刚';
    if (m < 60) return m + ' 分钟前';
    var h = Math.floor(m / 60);
    if (h < 24) return h + ' 小时前';
    return Math.floor(h / 24) + ' 天前';
  }
  function fmt(ts) {
    if (!ts) return '—';
    var d = new Date(ts);
    function p(n) { return (n < 10 ? '0' : '') + n; }
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) +
      ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
  }

  function paint() {
    var pill = $('livePrice');
    if (pill) {
      var cls = 'live-price ' + state.status;
      var text = '价格核验中…';
      if (state.status === 'checking') text = '正在核验价格…';
      else if (state.status === 'fresh') text = '此刻已核验 · 快照 ' + ageText(state.snapshotAt);
      else if (state.status === 'updated') text = '已更新 · 快照 ' + ageText(state.snapshotAt);
      else if (state.status === 'error') text = '核验失败 · 使用上次快照';
      else if (state.status === 'local') text = '本地模式 · 无法联网核验';
      pill.className = cls;
      pill.textContent = text;
      pill.title = state.message || '';
    }
    var note = $('livePriceNote');
    if (note) {
      var line = '此刻价格核验：' + (state.checkedAt ? fmt(state.checkedAt) : '尚未核验') +
        ' · 价格快照：' + (state.snapshotAt ? fmt(state.snapshotAt) + '（' + ageText(state.snapshotAt) + '）' : '—');
      if (state.status === 'error') line += ' · 核验失败，仍使用上次快照';
      if (state.status === 'local') line += ' · 本地文件模式无法联网';
      var stale = ageMin(state.snapshotAt);
      if (stale > 24 * 60) line += ' · 快照超过 24 小时，厂商可能已改价';
      note.textContent = line;
      note.className = 'live-price-note ' + (stale > 24 * 60 ? 'stale' : '');
    }
  }

  function check(manual) {
    if (location.protocol === 'file:') {
      state.status = 'local';
      state.message = 'file:// 模式不能联网核验';
      paint();
      if (manual && window.MPApp && MPApp.toast) MPApp.toast('本地文件模式不能联网核验');
      return Promise.resolve(null);
    }
    if (state.status === 'checking') return Promise.resolve(null);
    state.status = 'checking';
    paint();
    lastCheck = Date.now();
    return fetch('assets/js/data/prices.json?ts=' + Date.now(), { cache: 'no-store' })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (pr) {
        if (!pr || !pr.entries) throw new Error('价格数据格式无效');
        var old = (window.MPApp && MPApp.getPrices()) || window.MP_PRICES;
        var oldAt = old && old.updatedAt ? new Date(old.updatedAt).getTime() : 0;
        var newAt = new Date(pr.updatedAt).getTime();
        state.snapshotAt = pr.updatedAt;
        state.checkedAt = Date.now();
        if (newAt > oldAt) {
          window.MP_PRICES = pr;
          if (window.MPApp) {
            MPApp.applyPrices(pr);
            MPApp.refreshAfterPrices();
          }
          state.status = 'updated';
          state.message = '已更新到 ' + fmt(pr.updatedAt);
          if (manual && window.MPApp) MPApp.toast('价格已更新到 ' + fmt(pr.updatedAt));
        } else {
          state.status = 'fresh';
          state.message = '已是最新快照 ' + fmt(pr.updatedAt);
          if (manual && window.MPApp) MPApp.toast('已是最新价格');
          if (window.MPApp) MPApp.renderPriceSync();
        }
        paint();
        return pr;
      })
      .catch(function (e) {
        state.status = 'error';
        state.message = (e && e.message) || '网络错误';
        paint();
        if (manual && window.MPApp) MPApp.toast('价格核验失败，仍使用上次快照');
        return null;
      });
  }

  function maybeCheck() {
    if (Date.now() - lastCheck > INTERVAL) check(false);
  }

  function init() {
    if (!$('priceSync')) return;
    setTimeout(function () { check(false); }, 900);
    if (timer) clearInterval(timer);
    timer = setInterval(function () {
      if (!document.hidden) check(false);
    }, INTERVAL);
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) maybeCheck();
    });
    document.addEventListener('click', function (e) {
      if (e.target.closest('#livePriceBtn')) check(true);
    });
    document.addEventListener('mp:prices-rendered', paint);
    document.addEventListener('mp:model-open', function () { check(false); });
    document.addEventListener('mp:view', function (e) {
      var name = e.detail && e.detail.name;
      if (name === 'models') check(false);
    });
    paint();
  }

  window.MPPriceLive = { check: check, state: state, paint: paint };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();