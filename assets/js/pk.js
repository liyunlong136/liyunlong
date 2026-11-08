/* PK 对比：普通提示词 + L1/L2 vs 结构化提示词 + L4/L5。
   有 Key 时真调模型；没有 Key 时只做结构与成本对比，不伪造回答。 */
(function () {
  var MODELS = window.MP_MODELS || [];
  var PRESETS = {
    zhipu: { name: '智谱', base: 'https://open.bigmodel.cn/api/paas/v4', models: [
      { api: 'glm-4.7-flash', id: 'glm-4.7-flash' }, { api: 'glm-5.3-flash', id: 'glm-5.3-flash' },
      { api: 'glm-5.1', id: 'glm-5.1' }, { api: 'glm-5.3', id: 'glm-5.3' }
    ] },
    deepseek: { name: 'DeepSeek', base: 'https://api.deepseek.com', models: [
      { api: 'deepseek-flash', id: 'deepseek-flash' }, { api: 'deepseek-v4-pro', id: 'deepseek-v4-pro' }
    ] },
    qwen: { name: '通义千问', base: 'https://dashscope.aliyuncs.com/compatible-mode/v1', models: [
      { api: 'qwen3.8-flash', id: 'qwen3.8-flash' }, { api: 'qwen3.7-plus', id: 'qwen3.7-plus' }, { api: 'qwen3.8-max', id: 'qwen3.8-max' }
    ] },
    openai: { name: 'OpenAI', base: 'https://api.openai.com/v1', models: [
      { api: 'gpt-5.5-mini', id: 'gpt-5.5-mini' }, { api: 'gpt-5.5', id: 'gpt-5.5' }, { api: 'gpt-5.1', id: 'gpt-5.1' }
    ] }
  };
  var state = { provider: 'zhipu', key: '', running: false, mode: 'prompt', ctls: [], cancelRequested: false };
  var TIMEOUT_MS = 45000;

  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function modelById(id) { return MODELS.filter(function (m) { return m.id === id; })[0]; }
  function fmt(n) { return window.MPEngine ? window.MPEngine.fmt(n) : String(n); }

  function fillModels() {
    var p = PRESETS[state.provider];
    var opts = p.models.map(function (x) {
      var m = modelById(x.id);
      return '<option value="' + esc(x.api) + '">' + esc(m ? m.name : x.api) + (m ? ' · L' + m.tier : '') + '</option>';
    }).join('');
    var a = $('pkModelA'), b = $('pkModelB');
    if (!a || !b) return;
    a.innerHTML = opts; b.innerHTML = opts;
    a.value = p.models[0].api;
    b.value = p.models[p.models.length - 1].api;
  }

  function selectedModel(sel) {
    var api = $(sel).value;
    var p = PRESETS[state.provider];
    var hit = p.models.filter(function (x) { return x.api === api; })[0];
    return hit ? modelById(hit.id) : modelById('glm-5.3');
  }

  function genericPrompt(topic) {
    return '【角色】你是这个领域的资深从业者，习惯先给结论再给依据。\n' +
      '【输入】' + topic + '\n' +
      '【任务】\n1) 先复述你理解的目标和读者；\n2) 给出 3 个关键判断，每个配一条依据；\n3) 给一个可执行的下一步。\n' +
      '【约束】不确定的信息标注「待核实」；不编造数据；不写空话。\n' +
      '【输出格式】按「目标复述 / 3 个判断 / 下一步」三节输出，总字数 500 以内。';
  }

  function applyModeUI() {
    var promptMode = state.mode === 'prompt';
    var tagA = document.querySelector('#view-pk .pk-col .pk-tag');
    var tagB = document.querySelector('#view-pk .pk-col.expert .pk-tag');
    var hint = document.getElementById('pkModeHint');
    if (tagA) tagA.textContent = promptMode ? '普通提示词' : '模型 A';
    if (tagB) tagB.textContent = promptMode ? '专家提示词' : '模型 B';
    $('pkModelB').disabled = promptMode;
    if (hint) {
      hint.textContent = promptMode
        ? '同一模型，只换提示词：排除模型差异。'
        : '同一提示词，只换模型：排除提示词差异。';
    }
    $('pkMode').querySelectorAll('button').forEach(function (x) {
      x.classList.toggle('on', x.getAttribute('data-pk-mode') === state.mode);
    });
  }

  function buildPrompts() {
    applyModeUI();
    var topic = ($('pkTopic').value || '').trim();
    if (!topic) return;
    var structured = '';
    var match = window.MPPrompt ? window.MPPrompt.match(topic, 1)[0] : null;
    if (match && match.score >= 6) {
      structured = window.MPPrompt.substitute(match.item.prompt, topic);
    } else {
      structured = genericPrompt(topic);
    }

    if (state.mode === 'prompt') {
      // 同模型比提示词：两侧锁同一个模型，只换提示词
      var ma = selectedModel('pkModelA');
      $('pkModelB').value = $('pkModelA').value;
      $('pkModelB').disabled = true;
      if (window.MPPrompt && ma) {
        structured = window.MPPrompt.tailor(structured, ma, { opts: { time: 'normal', budget: 'mid', tokens: 'normal' }, files: [] }, { need: { ctx: 8000 } });
      }
      $('pkPromptA').value = topic;
      $('pkPromptB').value = structured;
    } else {
      // 同提示词比模型：两侧同提示词，必须不同模型
      $('pkModelB').disabled = false;
      var mb = selectedModel('pkModelB');
      if (mb && $('pkModelA').value === $('pkModelB').value) {
        var opts2 = $('pkModelB').options;
        for (var j = 0; j < opts2.length; j++) {
          if (opts2[j].value !== $('pkModelA').value) { $('pkModelB').value = opts2[j].value; break; }
        }
        mb = selectedModel('pkModelB');
      }
      $('pkPromptA').value = structured;
      $('pkPromptB').value = structured;
    }
    updateMeta();
  }

  function estimate(text, model, outTok) {
    var inTok = Math.max(1, Math.ceil(text.length / 1.6));
    var cost = (model.priceIn * inTok + model.priceOut * outTok) / 1e6;
    var tps = 8 + model.speed * 10;
    var ttft = Math.max(0.6, 4.2 - model.speed * 0.32);
    return { inTok: inTok, outTok: outTok, cost: cost, sec: ttft + outTok / tps };
  }
  function tokText(n) { return n >= 1000 ? (n / 1000).toFixed(1) + 'K' : String(Math.max(1, Math.round(n))); }
  function updateMeta() {
    var ma = selectedModel('pkModelA'), mb = selectedModel('pkModelB');
    if (!ma || !mb) return;
    var ea = estimate($('pkPromptA').value, ma, 800);
    var eb = estimate($('pkPromptB').value, mb, 800);
    $('pkMetaA').innerHTML = 'L' + ma.tier + ' · 约 ' + tokText(ea.inTok) + ' tokens · ¥' + fmt(ea.cost, 4) + ' · ' + Math.round(ea.sec) + ' 秒';
    $('pkMetaB').innerHTML = 'L' + mb.tier + ' · 约 ' + tokText(eb.inTok) + ' tokens · ¥' + fmt(eb.cost, 4) + ' · ' + Math.round(eb.sec) + ' 秒';
  }

  async function callModel(preset, key, apiModel, prompt, maxTokens) {
    var t0 = performance.now();
    var payload = { model: apiModel, messages: [{ role: 'user', content: prompt }] };
    if (/openai/i.test(preset.name)) { payload.max_completion_tokens = maxTokens; }
    else { payload.max_tokens = maxTokens; payload.temperature = 0.6; }
    var ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var timedOut = false;
    var timer = null;
    if (ctl) {
      state.ctls.push(ctl);
      timer = setTimeout(function () { timedOut = true; try { ctl.abort(); } catch (e) { } }, TIMEOUT_MS);
    }
    try {
      var opts = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + key },
        body: JSON.stringify(payload)
      };
      if (ctl) opts.signal = ctl.signal;
      var res = await fetch(preset.base.replace(/\/$/, '') + '/chat/completions', opts);
      if (!res.ok) {
        var txt = await res.text();
        throw new Error('HTTP ' + res.status + '：' + txt.slice(0, 120));
      }
      var data = await res.json();
      var text = data.choices && data.choices[0] && data.choices[0].message ? data.choices[0].message.content : '';
      var u = data.usage || {};
      return { text: text || '（返回为空）', inTok: u.prompt_tokens || null, outTok: u.completion_tokens || null, ms: performance.now() - t0 };
    } catch (e) {
      if (e && (e.name === 'AbortError' || (ctl && ctl.signal.aborted))) {
        throw new Error(timedOut ? '请求超过 ' + Math.round(TIMEOUT_MS / 1000) + ' 秒未返回，已自动中断' : '已手动取消');
      }
      throw e;
    } finally {
      if (timer) clearTimeout(timer);
      if (ctl) state.ctls = state.ctls.filter(function (c) { return c !== ctl; });
    }
  }

  function outputHtml(r, model) {
    if (!r) return '<div class="empty">没有结果</div>';
    var text = String(r.text || '').replace(/\n{3,}/g, '\n\n');
    return '<div class="pk-answer">' + esc(text) + '</div>' +
      '<div class="pk-stats">' + (r.inTok ? r.inTok + ' 输入 / ' : '') + (r.outTok ? r.outTok + ' 输出 · ' : '') +
      '¥' + fmt(r.cost || 0, 4) + ' · ' + Math.round(r.ms / 100) / 10 + ' 秒 · ' + esc(model.name) + '</div>';
  }

  function diffHtml(aText, bText, ma, mb, ra, rb) {
    var ea = ra ? { inTok: ra.inTok || 0, outTok: ra.outTok || 0 } : estimate(aText, ma, 800);
    var eb = rb ? { inTok: rb.inTok || 0, outTok: rb.outTok || 0 } : estimate(bText, mb, 800);
    var ca = (ma.priceIn * ea.inTok + ma.priceOut * ea.outTok) / 1e6;
    var cb = (mb.priceIn * eb.inTok + mb.priceOut * eb.outTok) / 1e6;
    var secA = ra ? ra.ms / 1000 : (ea.sec || 0);
    var secB = rb ? rb.ms / 1000 : (eb.sec || 0);
    function tk(n) { return n >= 1000 ? (n / 1000).toFixed(1) + 'K' : String(Math.max(0, Math.round(n))); }
    var has = function (t, k) { return t.indexOf('【' + k + '】') >= 0; };
    function yes(ok) { return ok ? '<span class="ok">有</span>' : '<span class="no">没有</span>'; }
    var rows = [
      ['角色设定', yes(has(aText, '角色')), yes(has(bText, '角色'))],
      ['任务拆解', yes(/\n\s*\d+[\)\.、]/.test(aText)), yes(/\n\s*\d+[\)\.、]/.test(bText))],
      ['约束 / 防幻觉', yes(has(aText, '约束')), yes(has(bText, '约束'))],
      ['输出格式', yes(has(aText, '输出格式')), yes(has(bText, '输出格式'))],
      ['模型等级', 'L' + ma.tier, 'L' + mb.tier],
      ['本次成本', ca > 0 ? '¥' + fmt(ca, 4) : '免费', cb > 0 ? '¥' + fmt(cb, 4) : '免费']
    ];
    return '<div class="panel pk-diff"><div class="panel-head"><h2>差异分析</h2><span class="hint">' +
      (ra ? '真实调用结果' : '结构对比（未调用模型）') + '</span></div>' +
      '<div class="pk-consume"><b>本次对话消耗预估</b>' +
      '<span>普通：' + tk(ea.inTok) + ' tokens · ' + (ca > 0 ? '¥' + fmt(ca, 4) : '免费') + ' · ' + Math.round(secA) + ' 秒</span>' +
      '<span>专家：' + tk(eb.inTok) + ' tokens · ' + (cb > 0 ? '¥' + fmt(cb, 4) : '免费') + ' · ' + Math.round(secB) + ' 秒</span>' +
      '<i>同样的事，人类助理约需 15 分钟</i></div>' +
      '<table class="dlg-table"><thead><tr><th>对比项</th><th>' + (state.mode === 'model' ? '模型 A' : '普通模式') + '</th><th>' + (state.mode === 'model' ? '模型 B' : '专家模式') + '</th></tr></thead><tbody>' +
      rows.map(function (r) { return '<tr><td>' + r[0] + '</td><td>' + r[1] + '</td><td>' + r[2] + '</td></tr>'; }).join('') +
      '</tbody></table>' +
      '<p class="pk-takeaway">' + (state.mode === 'model'
        ? '同提示词下，差异来自<b>模型本身</b>（L' + ma.tier + ' → L' + mb.tier + '）：能力、速度、价格和稳定性。'
        : '同模型下，差异来自<b>提示词结构</b>（角色、任务拆解、约束、输出格式）；这次不比较模型差异。') + '</p>' +
      '<div class="pk-costline">按每天 100 次：普通约 ¥' + fmt(ca * 100 * 30, 2) + '/月；专家约 ¥' + fmt(cb * 100 * 30, 2) + '/月。' +
      (ra ? '本次真实耗时：普通 ' + Math.round(ra.ms / 100) / 10 + ' 秒，专家 ' + Math.round(rb.ms / 100) / 10 + ' 秒。' : '') + '</div>' +
      '</div>';
  }

  function setOutputs(htmlA, htmlB, diff) {
    $('pkOutA').innerHTML = htmlA;
    $('pkOutB').innerHTML = htmlB;
    $('pkDiff').innerHTML = diff;
  }

  function runDemo() {
    buildPrompts();
    var ma = selectedModel('pkModelA'), mb = selectedModel('pkModelB');
    var a = $('pkPromptA').value, b = $('pkPromptB').value;
    setOutputs(
      '<div class="pk-placeholder"><b>未调用模型</b><p>' + (state.mode === 'model' ? '模型 A：同一提示词。' : '普通模式：只发送你原样输入的一句话。') + '</p></div>',
      '<div class="pk-placeholder"><b>未调用模型</b><p>' + (state.mode === 'model' ? '模型 B：同一提示词。' : '专家模式：发送右侧结构化提示词。') + '</p></div>',
      diffHtml(a, b, ma, mb, null, null)
    );
    if (window.MPTrack) MPTrack.event('pk_demo', { topic: a.slice(0, 40) });
    $('pkDiff').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function askPkConsent(providerName) {
    return new Promise(function (resolve) {
      var dlg = $('pkConsentDlg');
      if (!dlg) { resolve(false); return; }
      var check = $('pkConsentCheck');
      var go = $('pkConsentGo');
      var canceled = false;

      $('pkConsentProvider').textContent = providerName;
      check.checked = false;
      go.disabled = true;

      function cleanup() {
        check.removeEventListener('change', onChange);
        go.removeEventListener('click', onGo);
        $('pkConsentCancel').removeEventListener('click', onCancel);
        $('pkConsentClose').removeEventListener('click', onCancel);
        dlg.removeEventListener('cancel', onCancel);
        dlg.removeEventListener('click', onBackdrop);
      }
      function finish(ok) {
        cleanup();
        if (dlg.open) dlg.close();
        resolve(ok);
        if (canceled) canceled = false;
      }
      function onChange() { go.disabled = !check.checked; }
      function onGo() { if (check.checked) finish(true); }
      function onCancel() { canceled = true; finish(false); }
      function onBackdrop(e) { if (e.target === dlg) onCancel(); }

      check.addEventListener('change', onChange);
      go.addEventListener('click', onGo);
      $('pkConsentCancel').addEventListener('click', onCancel);
      $('pkConsentClose').addEventListener('click', onCancel);
      dlg.addEventListener('cancel', onCancel);
      dlg.addEventListener('click', onBackdrop);
      if (!dlg.open) dlg.showModal();
    });
  }

  function updateRunLabel() {
    var hasKey = !!($('pkKey').value || '').trim();
    if ($('pkRun')) $('pkRun').textContent = hasKey ? '生成对比（会发送到厂商）' : '生成对比';
  }

  function setRunningUI(running) {
    state.running = running;
    if (running) state.cancelRequested = false;
    if ($('pkCancel')) $('pkCancel').hidden = !running;
    if ($('pkRun')) $('pkRun').disabled = running;
  }

  function cancelRunning() {
    if (!state.running) return;
    state.cancelRequested = true;
    state.ctls.forEach(function (c) { try { c.abort(); } catch (e) { } });
    $('pkOutA').innerHTML = '<div class="pk-loading">取消中…</div>';
    $('pkOutB').innerHTML = '<div class="pk-loading">取消中…</div>';
  }

  async function runLive() {
    buildPrompts();
    var key = ($('pkKey').value || '').trim();
    if (!key) { runDemo(); return; }

    var providerName = PRESETS[state.provider].name;
    var consentKey = 'mp_pk_consent_' + state.provider;
    var consented = false;
    try { consented = !!sessionStorage.getItem(consentKey); } catch (e) { }
    if (!consented) {
      var ok = await askPkConsent(providerName);
      if (!ok) return;
      try { sessionStorage.setItem(consentKey, '1'); } catch (e) { }
    }

    if (window.MPTrack && !MPTrack.count('pk', 5)) {
      setOutputs('<div class="pk-error">今天的免费体验次数（5 次）用完了。明天再试，或只用「只看提示词对比」。</div>',
        '<div class="pk-error">今天的免费体验次数（5 次）用完了。</div>', '');
      return;
    }
    var p = PRESETS[state.provider];
    var ma = selectedModel('pkModelA'), mb = selectedModel('pkModelB');
    var apiA = $('pkModelA').value, apiB = $('pkModelB').value;
    setRunningUI(true);
    $('pkOutA').innerHTML = '<div class="pk-loading">正在调用…（单侧最长 45 秒，可点「取消请求」）</div>';
    $('pkOutB').innerHTML = '<div class="pk-loading">正在调用…（单侧最长 45 秒，可点「取消请求」）</div>';
    try {
      var results = await Promise.allSettled([
        callModel(p, key, apiA, $('pkPromptA').value, 800),
        callModel(p, key, apiB, $('pkPromptB').value, 800)
      ]);
      if (state.cancelRequested) {
        setOutputs('<div class="pk-error">已取消请求，本次没有产生结果。</div>',
          '<div class="pk-error">已取消请求，本次没有产生结果。</div>', '');
        return;
      }
      var ra = results[0].status === 'fulfilled' ? results[0].value : null;
      var rb = results[1].status === 'fulfilled' ? results[1].value : null;
      if (ra) ra.cost = (ma.priceIn * ra.inTok + ma.priceOut * ra.outTok) / 1e6;
      if (rb) rb.cost = (mb.priceIn * rb.inTok + mb.priceOut * rb.outTok) / 1e6;
      var errA = results[0].status === 'rejected' ? results[0].reason.message : '';
      var errB = results[1].status === 'rejected' ? results[1].reason.message : '';
      setOutputs(
        ra ? outputHtml(ra, ma) : '<div class="pk-error">调用失败：' + esc(errA) + '<br><span>常见原因：Key 无效、模型名不对、浏览器被 CORS 拦截，或请求超过 45 秒。</span><button class="btn btn-sm" data-pk-retry>重试</button></div>',
        rb ? outputHtml(rb, mb) : '<div class="pk-error">调用失败：' + esc(errB) + '<br><span>如果两边都失败，多半是 CORS；请换供应商或部署一个代理。</span><button class="btn btn-sm" data-pk-retry>重试</button></div>',
        diffHtml($('pkPromptA').value, $('pkPromptB').value, ma, mb, ra, rb)
      );
      if (window.MPTrack) MPTrack.event('pk_live', { okA: !!ra, okB: !!rb, provider: state.provider });
    } catch (e) {
      setOutputs('<div class="pk-error">' + esc(e.message) + '</div>', '', '');
    } finally {
      state.ctls = [];
      setRunningUI(false);
    }
  }

  function saveKey() {
    // 只放内存：不写 localStorage/sessionStorage，刷新即失效，降低 XSS 读取风险
    state.key = $('pkKey').value.trim();
    updateRunLabel();
  }

  function init() {
    if (!$('pkTopic')) return;
    fillModels();
    buildPrompts();
    $('pkProvider').addEventListener('change', function () {
      state.provider = this.value;
      fillModels(); buildPrompts();
    });
    $('pkTopic').addEventListener('input', function () {
      clearTimeout(this._t); var self = this;
      this._t = setTimeout(function () { buildPrompts(); }, 220);
    });
    ['pkModelA', 'pkModelB'].forEach(function (id) {
      $(id).addEventListener('change', function () {
        if (state.mode === 'prompt') $('pkModelB').value = $('pkModelA').value;
        buildPrompts();
      });
    });
    $('pkMode').addEventListener('click', function (e) {
      var b = e.target.closest('[data-pk-mode]'); if (!b) return;
      state.mode = b.getAttribute('data-pk-mode');
      if (state.mode === 'model') {
        // 同提示词比模型：两侧必须是不同模型，否则没有可比性
        var av = $('pkModelA').value, bv = $('pkModelB').value;
        if (av === bv) {
          var opts = $('pkModelB').options;
          for (var i = 0; i < opts.length; i++) {
            if (opts[i].value !== av) { $('pkModelB').value = opts[i].value; break; }
          }
        }
      }
      buildPrompts();
    });
    $('pkRun').addEventListener('click', function () { saveKey(); runLive(); });
    document.addEventListener('click', function (e) {
      if (e.target.closest('[data-pk-retry]')) { saveKey(); runLive(); }
    });
    $('pkDemo').addEventListener('click', runDemo);
    if ($('pkCancel')) $('pkCancel').addEventListener('click', cancelRunning);
    $('pkClearKey').addEventListener('click', function () {
      $('pkKey').value = ''; state.key = '';
    });
    $('pkKey').addEventListener('change', saveKey);
    $('pkKey').addEventListener('input', updateRunLabel);
    updateRunLabel();
    document.querySelectorAll('[data-copy-pk]').forEach(function (b) {
      b.addEventListener('click', function () {
        var v = b.getAttribute('data-copy-pk') === 'a' ? $('pkPromptA').value : $('pkPromptB').value;
        if (navigator.clipboard) navigator.clipboard.writeText(v).then(function () { b.textContent = '已复制'; setTimeout(function () { b.textContent = '复制'; }, 1200); });
      });
    });
  }

  window.MPPK = { init: init, buildPrompts: buildPrompts, demo: runDemo };
})();
