/* 豆瓣式星级评分：SVG 五角星、悬停浅金、点击锁定、Supabase 写入。 */
(function () {
  var STAR_PATH = 'M12 2.6l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5-5.8-3.1-5.8 3.1 1.1-6.5L2.6 9.4l6.5-.9z';
  var CFG = window.MP_SUPABASE || {};
  var uidCache = null;

  function $(id) { return document.getElementById(id); }
  function cfgOk() {
    return !!(CFG.url && CFG.anonKey && /^https?:\/\//i.test(CFG.url));
  }
  function base() { return String(CFG.url || '').replace(/\/$/, '') + '/rest/v1/' + (CFG.table || 'ratings'); }
  function headers(extra) {
    return Object.assign({
      apikey: CFG.anonKey,
      Authorization: 'Bearer ' + CFG.anonKey,
      'Content-Type': 'application/json'
    }, extra || {});
  }
  function uuid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
  function fingerprint() {
    if (uidCache) return uidCache;
    try {
      var k = localStorage.getItem('mp_rating_uid');
      if (!k) { k = uuid(); localStorage.setItem('mp_rating_uid', k); }
      uidCache = k;
    } catch (e) { uidCache = uuid(); }
    return uidCache;
  }
  function localGet(modelId) {
    try {
      var o = JSON.parse(localStorage.getItem('mp_ratings') || '{}');
      return o[modelId] || 0;
    } catch (e) { return 0; }
  }
  function localSet(modelId, score) {
    try {
      var o = JSON.parse(localStorage.getItem('mp_ratings') || '{}');
      o[modelId] = score;
      localStorage.setItem('mp_ratings', JSON.stringify(o));
    } catch (e) { }
  }
  function starsHtml() {
    var out = '';
    for (var i = 1; i <= 5; i++) {
      out += '<button class="rate-star" type="button" data-score="' + i + '" role="radio" aria-checked="false" aria-label="' + i + ' 星" tabindex="0">' +
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="' + STAR_PATH + '"></path></svg></button>';
    }
    return out;
  }
  function mount(el, modelId) {
    if (!el || !modelId) return;
    el.innerHTML =
      '<div class="rate-card" data-model="' + modelId + '">' +
      '<div class="rate-top"><div class="rate-title">我的评分 <small>仅本机</small></div><div class="rate-avg">暂无共享评分</div></div>' +
      '<div class="rate-stars" role="radiogroup" aria-label="模型评分">' + starsHtml() + '</div>' +
      '<div class="rate-thanks" hidden>感谢您的评价！</div>' +
      '<div class="rate-status"></div>' +
      '</div>';

    var card = el.querySelector('.rate-card');
    var stars = Array.prototype.slice.call(card.querySelectorAll('.rate-star'));
    var avgEl = card.querySelector('.rate-avg');
    var thanks = card.querySelector('.rate-thanks');
    var status = card.querySelector('.rate-status');
    var locked = localGet(modelId);
    var hover = 0;
    var sending = false;
    var userRated = false;

    function paint() {
      var v = hover || locked;
      stars.forEach(function (b, i) {
        var on = i < v;
        b.classList.toggle('on', on && !!locked && !hover);
        b.classList.toggle('hover', on && !!hover);
        b.setAttribute('aria-checked', locked === i + 1 ? 'true' : 'false');
      });
    }
    function setStatus(text, isErr) {
      status.textContent = text || '';
      status.classList.toggle('err', !!isErr);
    }
    function showThanks() {
      thanks.hidden = false;
      thanks.classList.remove('show');
      void thanks.offsetWidth;
      thanks.classList.add('show');
    }
    function renderAvg(avg, count) {
      if (!count) { avgEl.textContent = '暂无共享评分'; return; }
      avgEl.textContent = avg.toFixed(1) + ' · ' + count + ' 人';
    }
    function loadAverage() {
      if (!cfgOk()) return;
      fetch(base() + '?model_id=eq.' + encodeURIComponent(modelId) + '&select=score&limit=1000', { headers: headers() })
        .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
        .then(function (rows) {
          if (!Array.isArray(rows) || !rows.length) { renderAvg(0, 0); return; }
          var sum = rows.reduce(function (a, x) { return a + (+x.score || 0); }, 0);
          renderAvg(sum / rows.length, rows.length);
        })
        .catch(function () { avgEl.textContent = '评分暂不可用'; });
    }
    function loadMine() {
      if (!cfgOk()) { setStatus('我的评分只保存在本机，不参与全站总榜。'); return; }
      fetch(base() + '?model_id=eq.' + encodeURIComponent(modelId) + '&user_fingerprint=eq.' + encodeURIComponent(fingerprint()) + '&select=score&limit=1', { headers: headers() })
        .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
        .then(function (rows) {
          if (!userRated && Array.isArray(rows) && rows.length) { locked = +rows[0].score || locked; paint(); }
        })
        .catch(function () { });
    }
    function submit(score) {
      locked = score; hover = 0; userRated = true; paint(); showThanks();
      localSet(modelId, score);
      try { window.dispatchEvent(new CustomEvent('mp:rated', { detail: { model_id: modelId, score: score } })); } catch (e) { }
      if (window.MPTrack) MPTrack.event('rate', { model: modelId, score: score, sent: cfgOk() });
      if (!cfgOk()) {
        setStatus('已记录在本地（未配置 Supabase）。');
        return;
      }
      if (sending) return;
      sending = true;
      setStatus('正在提交…');
      fetch(base() + '?on_conflict=model_id,user_fingerprint', {
        method: 'POST',
        headers: headers({ Prefer: 'resolution=merge-duplicates,return=minimal' }),
        body: JSON.stringify({ model_id: modelId, user_fingerprint: fingerprint(), score: score })
      }).then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        setStatus('已提交，谢谢！');
        loadAverage();
      }).catch(function (e) {
        setStatus('提交失败，已保存在本地：' + (e.message || '网络错误'), true);
      }).finally(function () { sending = false; });
    }

    stars.forEach(function (b) {
      var v = +b.getAttribute('data-score');
      b.addEventListener('mouseenter', function () { if (!sending) { hover = v; paint(); } });
      b.addEventListener('focus', function () { hover = v; paint(); });
      b.addEventListener('mouseleave', function () { hover = 0; paint(); });
      b.addEventListener('blur', function () { hover = 0; paint(); });
      b.addEventListener('click', function () { submit(v); });
      b.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); submit(v); }
      });
    });

    paint();
    loadMine();
    loadAverage();
    if (locked) thanks.hidden = true;
  }

  window.MPRating = { mount: mount, fingerprint: fingerprint };
})();
