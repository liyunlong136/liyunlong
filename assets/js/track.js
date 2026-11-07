/* 匿名统计：不注册、不上传，只在本地记录行为，用于产品改进演示。 */
(function () {
  var ID_KEY = 'mp_aid', EV_KEY = 'mp_events';
  function uuid() {
    if (window.crypto && crypto.randomUUID) return 'u_' + crypto.randomUUID().slice(0, 12);
    return 'u_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }
  var id;
  try {
    id = localStorage.getItem(ID_KEY);
    if (!id) { id = uuid(); localStorage.setItem(ID_KEY, id); }
  } catch (e) { id = 'u_session'; }

  function event(name, data) {
    try {
      var arr = JSON.parse(localStorage.getItem(EV_KEY) || '[]');
      arr.push({ t: Date.now(), n: name, d: data || {} });
      if (arr.length > 300) arr = arr.slice(-300);
      localStorage.setItem(EV_KEY, JSON.stringify(arr));
    } catch (e) { }
  }
  function count(key, max) {
    try {
      var day = new Date().toISOString().slice(0, 10);
      var k = 'mp_q_' + key + '_' + day;
      var n = +(localStorage.getItem(k) || 0);
      if (n >= max) return false;
      localStorage.setItem(k, String(n + 1));
      return true;
    } catch (e) { return true; }
  }
  function summary() {
    try {
      var arr = JSON.parse(localStorage.getItem(EV_KEY) || '[]');
      var by = {};
      arr.forEach(function (e) { by[e.n] = (by[e.n] || 0) + 1; });
      return { id: id, total: arr.length, by: by };
    } catch (e) { return { id: id, total: 0, by: {} }; }
  }
  window.MPTrack = { id: id, event: event, count: count, summary: summary };
})();
