/* 提示词工具箱：合并模板、按问题匹配、解释结构、按模型改写话术。 */
(function () {
  var STOP = {};
  ('我的 帮我 怎么 如何 一个 可以 需要 问题 现在 今天 这个 那个 想要 应该 什么 为什么 哪些 是否 能不能 有没有 一下 进行 通过 以及 还有 就是 但是 因为 所以 如果 然后 已经 比较 非常 我们 你们 他们').split(' ').forEach(function (w) { STOP[w] = 1; });

  function all() {
    if (all._cache) return all._cache;
    var out = [];
    (window.MP_DOMAINS || []).forEach(function (d) {
      (d.subtasks || []).forEach(function (s) {
        var text = s.title + ' ' + s.goal + ' ' + (s.prompt || '');
        var tags = (d.keywords || []).filter(function (k) { return text.indexOf(k) >= 0; }).slice(0, 6);
        if (!tags.length) tags = (d.keywords || []).slice(0, 3);
        out.push({
          id: s.id, title: s.title, cat: d.name, icon: d.icon || '·', goal: s.goal,
          tags: tags, mode: s.mode || [], prompt: s.prompt,
          why: s.advice || '', advice: s.advice || '', source: 'domain', domainId: d.id
        });
      });
    });
    (window.MP_EXTRA_PROMPTS || []).forEach(function (p) {
      out.push({
        id: p.id, title: p.title, cat: p.cat, icon: p.icon || '·', goal: p.goal,
        tags: p.tags || [], mode: p.mode || [], prompt: p.prompt,
        why: p.why || '', advice: '', source: 'extra', domainId: ''
      });
    });
    (window.MP_PROMPT_PACKS || []).forEach(function (p) {
      out.push({
        id: p.id, title: p.title, cat: p.cat, icon: p.icon || '·', goal: p.goal,
        tags: p.tags || [], mode: p.mode || [], prompt: p.prompt,
        why: p.why || '', advice: '', source: 'extra', domainId: ''
      });
    });
    all._cache = out;
    return out;
  }

  function grams(text) {
    var map = {};
    var cjk = String(text).match(/[\u4e00-\u9fa5]+/g) || [];
    cjk.forEach(function (seg) {
      for (var i = 0; i + 1 < seg.length; i++) {
        var g = seg.slice(i, i + 2);
        if (!STOP[g]) map[g] = (map[g] || 0) + 1;
      }
    });
    var words = (String(text).toLowerCase().match(/[a-z]{3,}/g) || []);
    words.forEach(function (w) { if (!STOP[w]) map[w] = (map[w] || 0) + 1; });
    return map;
  }

  function match(text, limit) {
    var q = String(text || '').trim();
    if (q.length < 2) return [];
    var gm = grams(q), keys = Object.keys(gm);
    if (!keys.length) return [];
    var lower = q.toLowerCase();
    var scored = all().map(function (it) {
      var hay = (it.title + ' ' + it.goal + ' ' + it.cat + ' ' + it.tags.join(' ') + ' ' + String(it.prompt).slice(0, 800)).toLowerCase();
      var score = 0, tagHits = [], gramHits = [];
      it.tags.forEach(function (t) {
        if (t && lower.indexOf(String(t).toLowerCase()) >= 0) {
          score += 4;
          if (tagHits.indexOf(t) < 0) tagHits.push(t);
        }
      });
      keys.forEach(function (g) {
        if (hay.indexOf(g) >= 0) {
          score += 2 * Math.min(2, gm[g]);
          if (gramHits.length < 3 && (it.title + ' ' + it.goal).indexOf(g) >= 0 && tagHits.indexOf(g) < 0) gramHits.push(g);
        }
      });
      if (lower.indexOf(it.title.slice(0, 3)) >= 0) score += 5;
      var hits = tagHits.length ? tagHits : gramHits;
      return { item: it, score: score, hits: hits.slice(0, 4) };
    }).filter(function (x) { return x.score >= 5; });
    scored.sort(function (a, b) { return b.score - a.score; });
    if (!scored.length) return [];
    var floor = Math.max(7, scored[0].score * 0.5);
    return scored.filter(function (x) { return x.score >= floor; }).slice(0, limit || 3);
  }

  function substitute(prompt, text) {
    var q = String(text || '').trim() || '（这里粘贴你的具体问题）';
    return String(prompt || '').replace(/\{\{problem\}\}/g, q);
  }

  function explain(it) {
    var p = it.prompt || '';
    var has = {
      role: /【角色】/.test(p),
      input: /【(背景|输入|附件)/.test(p),
      task: /【任务】/.test(p),
      cons: /【约束】/.test(p),
      out: /【输出格式】/.test(p)
    };
    var steps = (p.match(/(^|\n)\s*\d+[\)\.、]/g) || []).length;
    var consText = (/【约束】([\s\S]*?)(【输出格式】|$)/.exec(p) || [])[1] || '';
    var consN = (consText.match(/[；;]/g) || []).length + (consText.match(/\n\s*-/g) || []).length + (consText ? 1 : 0);
    var rows = [
      { on: has.role, k: '角色', v: '把模型的知识视角收窄到「谁在回答」，语气和专业度更稳，少说正确的废话。' },
      { on: has.input, k: '输入', v: '一次给全背景、材料和约束，减少来回追问，也避免模型自己脑补。' },
      { on: has.task, k: '任务', v: '拆成 ' + (steps || 2) + ' 个编号步骤，输出可以逐条检查，而不是一大段无法验收的话。' },
      { on: has.cons, k: '约束', v: '约 ' + Math.max(2, consN || 2) + ' 条限制：防幻觉、限字数、禁套话。这是质量的下限。' },
      { on: has.out, k: '输出格式', v: '提前规定表格/分节/字段，拿到就能直接用，不用二次整理。' }
    ];
    var html = '<div class="ex-grid">';
    rows.forEach(function (r) {
      if (!r.on) return;
      html += '<div class="ex-item"><b>' + r.k + '</b><p>' + r.v + '</p></div>';
    });
    html += '</div>';
    if (it.why) html += '<p class="ex-why"><b>为什么这样写：</b>' + it.why + '</p>';
    html += '<p class="ex-note">把 <code>{{problem}}</code> 换成你的具体问题即可；占位符删掉会让模型失去上下文。</p>';
    return html;
  }

  function tailor(base, model, plan, st) {
    var E = window.MPEngine;
    var L = [];
    L.push('【你正在使用】' + model.name + '（' + (E ? E.tierLabel(model.tier) : 'L' + model.tier) + '，' + model.vendor + '）');
    var c = [];
    var o = plan.opts || {};
    if (o.time === 'urgent') c.push('时间很赶');
    if (o.time === 'relaxed') c.push('时间充裕');
    if (o.budget === 'free') c.push('零预算');
    if (o.budget === 'low') c.push('预算很低');
    if (o.budget === 'high') c.push('预算不设限');
    if (o.tokens === 'scarce') c.push('token 很紧');
    if (o.tokens === 'ample') c.push('token 充足');
    if (plan.files && plan.files.length) c.push('附件：' + plan.files.map(function (f) { return f.name; }).join('、'));
    if (c.length) L.push('【本次约束】' + c.join('；'));

    var modes = (model.modes || []).join(' ');
    var tips = [];
    if (/深度思考|扩展思考|超长思考/.test(modes)) tips.push('先开深度思考，用不超过 150 字列推理提纲，再给结论');
    if (model.dims.reasoning >= 9.2) tips.push('需要判断的地方，先给假设与验证路径，不要直接下结论');
    if (model.speed >= 8.5) tips.push('直接给答案，不要铺垫；背景最多 3 句');
    if (model.dims.longctx >= 9.2 && ((st.need && st.need.ctx > 50000) || (plan.files && plan.files.length))) tips.push('先通读材料，引用时标页码/章节，不要只根据开头回答');
    if (model.dims.vision >= 8.5 && st.need && st.need.vision) tips.push('先复述你在图片里看到的文字与结构，再作答');
    if (model.dims.chinese >= 9) tips.push('用简体中文，避免翻译腔、排比句和「首先其次最后」');
    if (model.dims.agent >= 9) tips.push('需要计算或查证时先调用工具，再把结果写进答案');
    if (model.tier <= 2) tips.push('一次只做一小步，输出控制在 600 字内；不确定就说不确定');
    if (model.tier >= 5) tips.push('关键结论标注依据；不确定的部分单独列出，不要混进结论');
    if (o.tokens === 'scarce') tips.push('输出尽量短：能一句话说清就不写一段');
    if (o.time === 'urgent') tips.push('先给可执行结论，细节放最后，方便我随时叫停');
    if (!tips.length) tips.push('按下面的任务要求执行，输出结构化、可检查');
    L.push('【使用这个模型时】');
    tips.slice(0, 4).forEach(function (t) { L.push('- ' + t); });
    L.push('【信息不足时】先问我最多 3 个关键问题，再开始；不要替我假设关键事实。');
    return L.join('\n') + '\n\n' + base;
  }

  function fullScript(plan, key) {
    var r = plan.routes[key || plan.routeKey];
    var L = [];
    L.push('我要完成的事：' + plan.problem);
    L.push('');
    L.push('请按下面 ' + plan.subtasks.length + ' 步来做。每完成一步先停下来给我看结果，我确认后再进入下一步：');
    plan.subtasks.forEach(function (s, i) { L.push((i + 1) + '. ' + s.title + '：' + s.goal); });
    L.push('');
    L.push('要求：');
    L.push('- 每一步先给结论，再给依据；信息不足时先问我最多 3 个问题，不要编造。');
    L.push('- 涉及附件时，先确认你读到了什么，再回答。');
    L.push('- 第一步只做「复述目标 + 列出需要我确认的信息」，不要直接给完整方案。');
    return L.join('\n');
  }

  window.MPPrompt = { all: all, match: match, substitute: substitute, explain: explain, tailor: tailor, fullScript: fullScript };
})();
