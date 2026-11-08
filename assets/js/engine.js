/* 推荐引擎：任务拆解 + 约束打分 + 组合方案。纯前端，无依赖。 */
(function () {
  var MODELS = (window.MP_MODELS || []).concat(window.MP_MODELS_EXTRA || []);
  var META = window.MP_META || { dims: {}, tierLabels: {} };
  var DIMS = Object.keys(META.dims);

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function fmt(n, d) { if (n === 0) return '0'; if (n < 0.01) return n.toFixed(4); return n.toFixed(d === undefined ? 2 : d); }
  function has(arr, x) { return (arr || []).indexOf(x) >= 0; }
  function blend(m) { return m.priceIn * 0.7 + m.priceOut * 0.3; }
  function tierLabel(t) { return (META.tierLabels && META.tierLabels[t]) || ('L' + t); }
  function dimLabel(k) { return (META.dims && META.dims[k]) || k; }

  function estimateCost(m, inTok, outTok) {
    if (!m) return 0;
    return (m.priceIn * inTok + m.priceOut * outTok) / 1e6;
  }

  /* 补充口语关键词：生成的领域数据之外，再兜一层常见说法 */
  var EXTRA_KEYWORDS = {
    coding: ['小程序', 'app', '网站', '网页', '开发', '做一个', '搭建', '上线', '功能', '数据库', '接口'],
    writing: ['邮件', '道歉', '信件', '推文', '稿子', '演讲稿', '软文', '标题党'],
    academic: ['论文', '文献', '综述', '实验设计', '开题', '答辩', '期刊', '投稿'],
    data: ['excel', '表格', '统计', '可视化', '报表', '指标', '清洗'],
    learning: ['学习', '计划', '考试', '备考', '复习', '入门', '课程', '微调', '原理'],
    business: ['商业', '市场', '竞品', '汇报', 'ppt', '简历', '面试', '创业', '融资', '立项'],
    translation: ['翻译', '中译英', '英译中', '本地化', '字幕', '术语'],
    design: ['海报', 'logo', '图片', '视频', '剪辑', '设计', 'ui', '配色'],
    life: ['旅行', '健康', '法律', '合同', '看病', '减肥', '装修', '保险'],
    agent: ['自动化', '爬虫', '工作流', '机器人', '客服', 'rpa', '定时任务']
  };

  /* ---------- 子任务相关性筛选 ---------- */
  var STOP2 = {};
  ('我的 帮我 怎么 如何 一个 可以 需要 问题 现在 今天 这个 那个 想要 应该 什么 为什么 哪些 是否 能不能 有没有 一下 进行 通过 以及 还有 就是 但是 因为 所以 如果 然后 已经 比较 非常 我们 你们 他们 一份 看看 哪些 条款').split(' ').forEach(function (w) { STOP2[w] = 1; });
  function textGrams(text) {
    var map = {};
    var cjk = String(text || '').match(/[\u4e00-\u9fa5]+/g) || [];
    cjk.forEach(function (seg) {
      for (var i = 0; i + 1 < seg.length; i++) {
        var g = seg.slice(i, i + 2);
        if (!STOP2[g]) map[g] = 1;
      }
    });
    return map;
  }
  function selectSubtasks(list, text, domainId) {
    if (!list || !list.length) return list || [];
    // 只有「生活/法律/健康」这类并列选项的领域才按相关性裁剪；
    // 其他领域的前 3 步本身是策划好的流水线，直接保留顺序。
    if (domainId !== 'life' && domainId !== 'data') return list.slice(0, 3);
    var gm = textGrams(text), keys = Object.keys(gm);
    if (!keys.length) return list.slice(0, 3);
    var scored = list.map(function (s) {
      var hay = (s.title + ' ' + s.goal + ' ' + (s.advice || '') + ' ' + (s.mode || []).join(' ')).toLowerCase();
      var sc = 0;
      keys.forEach(function (g) { if (hay.indexOf(g) >= 0) sc += 2; });
      return { s: s, sc: sc };
    });
    var max = Math.max.apply(null, scored.map(function (x) { return x.sc; }));
    if (max === 0) return list.slice(0, 3);
    var floor = Math.max(1, max * 0.34);
    var keep = scored.filter(function (x) { return x.sc >= floor; }).map(function (x) { return x.s; });
    if (!keep.length) keep = [list[0]];
    if (keep.length < 2 && FALLBACK && FALLBACK.subtasks) keep.push(FALLBACK.subtasks[3]);
    return keep.slice(0, 4);
  }

  /* ---------- 领域匹配 ---------- */
  function matchDomain(text) {
    var t = (text || '').toLowerCase();
    var best = null, bestScore = 0, second = null, secondScore = 0;
    (window.MP_DOMAINS || []).forEach(function (d) {
      var sc = 0;
      var kws = (d.keywords || []).concat(EXTRA_KEYWORDS[d.id] || []);
      kws.forEach(function (k) {
        var kk = String(k).toLowerCase();
        if (kk && t.indexOf(kk) >= 0) sc += Math.min(6, kk.length);
      });
      if (sc > bestScore) { second = best; secondScore = bestScore; best = d; bestScore = sc; }
      else if (sc > secondScore) { second = d; secondScore = sc; }
    });
    return { domain: best, score: bestScore, secondary: (second && second !== best) ? second : null };
  }

  /* ---------- 通用兜底拆解 ---------- */
  var FALLBACK = {
    id: 'general', name: '通用复杂问题', icon: '*', keywords: [],
    summary: '没有命中具体领域时，用「澄清 → 拆解 → 初稿 → 校验」四步走。',
    subtasks: [
      {
        id: 'g-clarify', title: '澄清目标与约束', goal: '把模糊的一句话变成可执行的目标、边界和验收标准',
        dims: { reasoning: 4, writing: 2, chinese: 2, speed: 2 },
        need: { ctx: 8000 }, mode: ['深度思考'],
        advice: '先别急着要答案，让模型反问你 5 个关键问题，往往比直接生成更有用。',
        prompt: '你是一名资深顾问。我要解决的问题是：\n{{problem}}\n\n请先不要给方案，按下面做：\n1. 用一句话复述你理解的目标，并指出 2 处可能的歧义；\n2. 列出完成这件事必须确认的 5 个关键信息（按重要性排序），每个信息给出「为什么重要」；\n3. 给出 3 种不同的解决路径，各写一句适用前提与最大风险；\n4. 最后用表格输出：路径 | 适用前提 | 主要风险 | 需要资源。\n不确定的地方标注「待确认」，不要替我假设。'
      },
      {
        id: 'g-split', title: '拆解为可执行子任务', goal: '把大问题拆成有先后依赖、可独立验收的小步骤',
        dims: { reasoning: 4, writing: 2, agent: 3, speed: 1 },
        need: { ctx: 32000 }, mode: ['深度思考', '结构化输出'],
        advice: '要求模型给出依赖关系和验收标准，否则拆出来的步骤没法执行。',
        prompt: '你是项目经理。基于下面的目标：\n{{problem}}\n\n请输出一份执行拆解：\n1. 用 MECE 原则拆成 3-6 个子任务，每个子任务必须是「一个人一天内能验收」的粒度；\n2. 用表格列出：编号 | 子任务 | 产出物 | 验收标准 | 依赖的前置任务 | 预计耗时；\n3. 标出关键路径（哪几步决定总工期）；\n4. 指出最可能翻车的 2 个环节，并各给一个兜底方案。\n只输出表格和必要说明，不要写客套话。'
      },
      {
        id: 'g-draft', title: '产出主体初稿', goal: '拿到结构完整、可直接修改的第一版成果',
        dims: { writing: 3, reasoning: 3, chinese: 2, longctx: 2 },
        need: { ctx: 32000 }, mode: ['深度思考', '长输出'],
        advice: '先要结构再要内容：让模型先给目录，你确认后再逐节展开，质量会高很多。',
        prompt: '你是这个领域的资深从业者。请围绕下面的任务产出初稿：\n{{problem}}\n\n要求：\n1. 先给一份三级目录（不超过 6 个一级标题），等我确认后再展开；\n2. 每一节遵循「结论先行 → 论据 → 例子 → 落地建议」；\n3. 至少给出 2 个可验证的数据点或案例，无法核实的标注「示例/待核实」；\n4. 语言克制，不要排比句和空话；\n5. 最后列出 3 个你认为最可能被质疑的点，并各写一句回应。'
      },
      {
        id: 'g-review', title: '批判性校验与修订', goal: '找出事实错误、逻辑漏洞和可执行性问题',
        dims: { reasoning: 4, writing: 2, chinese: 1, speed: 1 },
        need: { ctx: 64000 }, mode: ['深度思考', '上传文件'],
        advice: '换一个模型做审稿，比让同一个模型自查更容易发现盲区。',
        prompt: '你是一名严格的审稿人，任务是找出问题而不是夸奖。请审阅下面的内容：\n{{problem}}\n\n按以下结构输出：\n1. 事实性问题：列出所有可能错误或无法核实的具体表述（引用原句），标注严重程度（高/中/低）；\n2. 逻辑问题：指出论证跳跃、因果倒置、以偏概全之处；\n3. 可执行性问题：如果读者照做，最可能卡在哪一步；\n4. 删减建议：哪 3 段可以删掉而不损失信息；\n5. 修订版：只重写问题最严重的 2 段。\n不要评价文笔，不要复述原文。'
      }
    ]
  };

  function getDomain(opts) {
    if (opts && opts.domainId) {
      var d = (window.MP_DOMAINS || []).filter(function (x) { return x.id === opts.domainId; })[0];
      if (d) return { domain: d, score: 99, secondary: null };
    }
    var m = matchDomain(opts && opts.problem);
    return m.domain ? m : { domain: FALLBACK, score: 0, secondary: null };
  }

  function decompose(problem, opts) {
    opts = opts || {};
    var m = getDomain({ problem: problem, domainId: opts.domainId });
    var d = m.domain || FALLBACK;
    var subs = (d.subtasks || FALLBACK.subtasks).slice();
    if (subs.length > 4) {
      if (opts.thorough) subs = subs.slice(0, 4);
      else subs = subs.slice(0, 3);
    }
    return { domain: d, secondary: m.secondary, subtasks: subs, matchedScore: m.score };
  }

  /* ---------- 单模型打分 ---------- */
  function scoreModel(m, st, o) {
    var reasons = [], cautions = [];
    var sn = st.need || {};
    var need = {
      ctx: Math.max(sn.ctx || 0, o.requireCtx || 0),
      vision: sn.vision || !!o.requireVision,
      audio: sn.audio || !!o.requireAudio,
      video: sn.video || !!o.requireVideo
    };
    var w = st.dims || {};
    var base = 0, sum = 0;
    DIMS.forEach(function (k) {
      var wk = w[k] || 0;
      // 「性价比」只在预算紧张时算分；「速度」只在赶时间时算分，避免便宜快模型霸榜
      if (k === 'value') wk *= (o.budget === 'free' || o.budget === 'low') ? 1 : (o.budget === 'mid' ? 0.3 : 0.06);
      if (k === 'speed') wk *= (o.time === 'urgent' ? 1.2 : (o.time === 'relaxed' ? 0.5 : 1));
      if (wk > 0) { base += (m.dims[k] || 5) * wk; sum += wk; }
    });
    base = sum ? (base / sum) * 10 : 60;

    if (!o.relaxAll) {
      if (o.local && !m.open) return { blocked: '需要私有化部署，闭源模型不可用', blockedCode: 'local' };
      if (need.ctx && m.ctx < need.ctx) return { blocked: '上下文 ' + Math.round(m.ctx / 1000) + 'K，不足本步所需 ' + Math.round(need.ctx / 1000) + 'K', blockedCode: 'ctx' };
      if (need.vision && !has(m.modalities, 'image')) return { blocked: '不支持图片输入', blockedCode: 'vision' };
      if (need.audio && !has(m.modalities, 'audio')) return { blocked: '不支持音频输入', blockedCode: 'audio' };
      if (need.video && !has(m.modalities, 'video')) return { blocked: '不支持视频输入', blockedCode: 'video' };
      // 零预算 = 不产生 API 账单。自托管开源权重没有 API 账单，
      // 不该被当成"不满足预算"直接排除，而是降权 + 在前端标注需自备算力。
      if (o.budget === 'free' && blend(m) > 0) return { blocked: '有 API 费用，不符合零预算', blockedCode: 'free' };
    }

    var s = base;
    var b = blend(m);
    if (o.budget === 'free') {
      if (b > 0.001) { s -= 26; cautions.push('不是免费模型，会产生费用'); }
      else if (m.open) { s -= 8; cautions.push('开源权重：零 API 账单，但需自备 GPU，不是零总成本'); }
      else s += 6;
    } else if (o.budget === 'low') {
      s -= Math.min(20, b * 1.1);
      if (b > 8) cautions.push('单价偏高，长文容易超预算');
    } else if (o.budget === 'mid') {
      s -= Math.min(9, b * 0.3);
    } else {
      s -= Math.min(4, b * 0.05);
    }

    if (o.tokens === 'scarce') {
      s -= Math.min(12, m.priceOut * 0.3);
      if (m.dims.value >= 9) s += 3;
      if (m.priceOut > 20) cautions.push('输出价高，长回答会烧掉大量 token');
    } else if (o.tokens === 'ample' && o.time === 'urgent') {
      s += (m.speed - 5) * 1.1;
    }

    if (o.time === 'urgent') { s += (m.speed - 6) * 2.4; if (m.speed <= 4) cautions.push('速度偏慢，赶时间不建议'); }
    else if (o.time === 'relaxed') { s += (m.tier - 3) * 1.4; }

    if (o.lang === 'zh') s += (m.dims.chinese - 8) * 1.2;
    if (o.region === 'cn' && m.country !== 'CN') {
      s -= 5;
      cautions.push('海外服务，国内访问需合规通道');
    }
    // "权重免费"是开源权重自托管，不是免费 API 额度，不能当成免费 API 加分
    if (o.budget === 'free' && !m.open && /免费|试用/.test(m.freeTier || '')) s += 5;
    if (m.country === 'CN' && o.region === 'cn') s += 2;

    var EST_CAP = 60000;
    var rawInTok = need.ctx || 4000;
    var inTok = Math.min(rawInTok, EST_CAP);
    var overCap = rawInTok > EST_CAP;
    var outTok = st.outTok || 1500;
    var cost = estimateCost(m, inTok, outTok);

    var ranked = DIMS.filter(function (k) { return (w[k] || 0) > 0; })
      .sort(function (a, c) { return (w[c] || 0) * m.dims[c] - (w[a] || 0) * m.dims[a]; });
    ranked.forEach(function (k) {
      if (reasons.length >= 2) return;
      var v = m.dims[k] || 0;
      if (v >= 8.2 && (w[k] || 0) >= 2) reasons.push('「' + dimLabel(k) + '」' + v.toFixed(1) + '/10，属第一梯队');
    });
    if (reasons.length < 3 && m.speed >= 8.5 && o.time === 'urgent') reasons.push('速度 ' + m.speed.toFixed(1) + '/10，等待时间短');
    if (reasons.length < 3 && b <= 0.001) reasons.push(m.open ? '开源权重，可私有化部署（需自备 GPU）' : '零成本，适合先跑通流程');
    else if (reasons.length < 3 && b <= 2.5) reasons.push('完成本步约 ¥' + fmt(cost, 3) + '，成本很低');
    if (reasons.length < 3 && need.ctx >= 100000 && m.ctx >= 500000) reasons.push(Math.round(m.ctx / 1000) + 'K 上下文，长资料一次放得下');
    if (reasons.length < 3 && need.vision) reasons.push('原生支持图片输入');
    if (reasons.length < 3 && m.tier >= 4) reasons.push('L4 以上旗舰，难题更稳');
    if (reasons.length < 2) reasons.push('能力覆盖本步需求，没有硬伤');

    if (m.priceConf === 'est') cautions.push('价格为同级推算，下单前请核对官网');
    if (m.priceConf === 'ref') cautions.push('价格为折算参考，海外账单以官方为准');
    if (!m.open && m.country !== 'CN' && o.region === 'cn') { /* already added */ }
    if (m.tier === 5) cautions.push('L5 顶级档，建议只用在关键步骤');

    var meta = window.MP_META || {};
    var audit = {
      matched: reasons.slice(0, 3),
      unverified: [
        '你的真实文件复杂度未验证',
        '厂商实时延迟与稳定性未验证',
        '你的账号限流与并发未验证'
      ],
      source: '自研十维 + 公开基准参考 + 人工校准',
      evaluatedAt: meta.dataDate || '',
      caveat: '这是规则匹配分，不是成功率，也不是官方 benchmark'
    };
    return {
      score: clamp(s, 1, 97), reasons: reasons.slice(0, 3), cautions: cautions.slice(0, 3),
      cost: cost, inTok: inTok, outTok: outTok, audit: audit,
      overCap: overCap, rawInTok: rawInTok
    };
  }

  function recommend(st, o, n, allowRelax) {
    o = o || {};
    var scored = [];
    var conflicts = {};      // 每个约束原因排除的模型数（按步骤）
    var blockedModels = {};  // 每个约束原因排除的模型 id 集合（用于跨步骤去重）
    function noteBlocked(code, id) {
      conflicts[code] = (conflicts[code] || 0) + 1;
      blockedModels[code] = blockedModels[code] || {};
      blockedModels[code][id] = 1;
    }
    MODELS.forEach(function (m) {
      var r = scoreModel(m, st, o);
      if (r.blocked) { noteBlocked(r.blockedCode || 'other', m.id); return; }
      scored.push({ model: m, score: r.score, reasons: r.reasons, cautions: r.cautions, cost: r.cost, inTok: r.inTok, outTok: r.outTok, audit: r.audit, overCap: r.overCap, rawInTok: r.rawInTok });
    });
    scored.sort(function (a, b) { return b.score - a.score; });

    if (!scored.length && !allowRelax) {
      var empty = [];
      empty.conflicts = conflicts;
      empty.blocked = blockedModels;
      empty.relaxed = false;
      return empty;
    }

    if (!scored.length && allowRelax) {
      var stillBlocked = {};
      function noteStill(code, id) { stillBlocked[code] = stillBlocked[code] || {}; stillBlocked[code][id] = 1; }
      MODELS.forEach(function (m) {
        var r = scoreModel(m, st, Object.assign({}, o, { relaxAll: true, local: false, requireCtx: 0, requireVision: false, requireAudio: false, requireVideo: false, budget: 'high' }));
        if (!r.blocked) scored.push({ model: m, score: r.score - 10, reasons: r.reasons, cautions: ['你已同意放宽硬性约束后推荐'].concat(r.cautions), cost: r.cost, inTok: r.inTok, outTok: r.outTok, audit: r.audit, overCap: r.overCap, rawInTok: r.rawInTok });
        else noteStill(r.blockedCode || 'other', m.id);
      });
      scored.sort(function (a, b) { return b.score - a.score; });
      var relaxedOut = scored.slice(0, n || 4);
      relaxedOut.relaxed = true;
      relaxedOut.conflicts = conflicts;
      relaxedOut.blocked = stillBlocked;
      return relaxedOut;
    }

    var out = scored.slice(0, n || 4);
    out.conflicts = conflicts;
    out.blocked = blockedModels;
    out.relaxed = false;
    return out;
  }

  function coreDim(st) {
    var best = null, bw = -1;
    DIMS.forEach(function (k) { if ((st.dims[k] || 0) > bw) { bw = st.dims[k]; best = k; } });
    return best;
  }

  function pickRoute(recs, key, st, o) {
    var top = recs[0];
    if (!top) return null;
    var kd = coreDim(st || { dims: {} });
    var topCore = kd ? (top.model.dims[kd] || 0) : 0;
    var budget = (o && o.budget) || 'mid';
    var baseSlack = budget === 'free' ? 3 : (budget === 'low' ? 2 : 1.2);
    function capable(r, slack) {
      if (!kd) return true;
      return (r.model.dims[kd] || 0) >= Math.max(5.8, topCore - (slack === undefined ? baseSlack : slack));
    }
    if (key === 'save') {
      var cands = recs.filter(function (r) { return r.score >= top.score - 10 && r.model.tier <= 3 && capable(r); });
      if (!cands.length) cands = recs.filter(function (r) { return r.score >= top.score - 12 && capable(r, baseSlack + 0.6); });
      if (!cands.length) cands = [top];
      return cands.sort(function (a, b) { return a.cost - b.cost || b.score - a.score; })[0];
    }
    if (key === 'fast') {
      var c2 = recs.filter(function (r) { return r.score >= top.score - 8 && capable(r, baseSlack - 0.4); });
      if (!c2.length) c2 = recs.filter(function (r) { return r.score >= top.score - 8; });
      if (!c2.length) c2 = [top];
      return c2.sort(function (a, b) { return b.model.speed - a.model.speed || b.score - a.score; })[0];
    }
    return top;
  }

  function fileBlock(files) {
    var list = files.map(function (f, i) { return (i + 1) + '. ' + f.name + '（' + f.brief + '）'; }).join('\n');
    return '\n\n【附件】我会在对话中上传以下文件：\n' + list +
      '\n请先确认能读取附件，再基于附件回答；如果读不到，请直接说明，不要凭空推测。';
  }

  function makeAttachSubtask(files, problem, o) {
    var list = files.map(function (f, i) { return (i + 1) + '. ' + f.name + '（' + f.brief + '）'; }).join('\n');
    var prompt = '【角色】你是一名严谨的文档分析师，习惯先确认「读到了什么」，再回答问题，从不假装看过没读到的内容。\n' +
      '【附件】\n' + list + '\n' +
      '【我的问题】\n' + (problem || '请先分析这些附件本身，找出最关键的信息与问题。') + '\n' +
      '【任务】\n' +
      '1) 先用 3 句话说明你实际读到了什么：文件类型、篇幅/页数、结构（有几章/几表/几列）；读不到就直说；\n' +
      '2) 用 5 条要点概括附件内容，每条不超过 40 字；\n' +
      '3) 找出与我的问题最相关的 3 处，引用原句或标明页码/章节/单元格位置；\n' +
      '4) 指出附件里缺失、矛盾或无法确认的信息，并说明它会如何影响结论。\n' +
      '【约束】只依据附件内容回答；附件没写的，写「附件未提及」，不要编造页码、条款号、数据或引用；看不清的地方标注「待确认」。\n' +
      '【输出格式】按「我读到了什么 / 5 条要点 / 与问题最相关的 3 处 / 缺失与矛盾」四节输出，总字数不超过 800 字。';
    return {
      id: 'attach-read', title: '读取并理解附件', goal: '先确认模型真的读到了附件，再让它基于附件回答',
      dims: { longctx: 4, vision: o.requireVision ? 4 : 1, reasoning: 2, chinese: 1 },
      need: { ctx: o.requireCtx || 32000, vision: !!o.requireVision },
      mode: ['上传文件'].concat(o.requireVision ? ['视觉输入'] : []),
      advice: '先让它复述附件结构；如果说读不到，换支持该格式的模型，或先把文件转成 PDF / 图片再试。',
      prompt: prompt, _attach: true
    };
  }

  function buildPlan(problem, opts) {
    opts = opts || {};
    var files = opts.files || [];
    var fileChars = 0, filePages = 0, fileVision = false, filePreview = '';
    files.forEach(function (f) {
      fileChars += (f.chars || 0) + (f.visionTokens ? Math.round(f.visionTokens * 1.2) : 0);
      filePages += f.pages || 0;
      if (f.needsVision) fileVision = true;
      if (f.text) filePreview += f.text.slice(0, 1200) + '\n';
    });
    var probe = problem + ' ' + (problem || '');
    if (filePreview) probe += ' ' + filePreview.slice(0, 2600);
    var dec = decompose(probe, opts);
    var approxChars = fileChars || (filePages * 2500);
    var o = {
      budget: opts.budget || 'mid', time: opts.time || 'normal', tokens: opts.tokens || 'normal',
      lang: opts.lang || 'zh', region: opts.region || 'cn', local: !!opts.local,
      domainId: opts.domainId,
      requireCtx: Math.max(opts.requireCtx || 0, Math.min(200000, approxChars ? Math.round(approxChars * 1.3) : 0)),
      requireVision: !!opts.requireVision || fileVision, requireAudio: !!opts.requireAudio, requireVideo: !!opts.requireVideo,
      allowRelax: !!opts.allowRelax
    };
    var constrained = (o.budget === 'free' || o.budget === 'low' || o.tokens === 'scarce');
    var routeKey = constrained ? 'save' : (o.time === 'urgent' ? 'fast' : 'quality');
    var domainSubs = selectSubtasks(dec.domain.subtasks || dec.subtasks, problem + ' ' + filePreview.slice(0, 1200), dec.domain.id);
    if (domainSubs.length > 3) domainSubs = domainSubs.slice(0, 3);
    var items = domainSubs.slice();
    if (files.length) items.unshift(makeAttachSubtask(files, problem, o));
    if (items.length > 4) items = items.slice(0, 4);
    var subs = items.map(function (st) {
      var recs = recommend(st, o, 5, !!o.allowRelax);
      var prompt = String(st.prompt || '').replace(/\{\{problem\}\}/g, problem || '（这里粘贴你的具体问题）');
      if (!/\{\{problem\}\}/.test(st.prompt || '') && (st.prompt || '').indexOf(problem) < 0 && !st._attach) {
        prompt = '【我的问题】\n' + problem + '\n\n' + prompt;
      }
      if (files.length && !st._attach) prompt += fileBlock(files);
      return {
        id: st.id, title: st.title, goal: st.goal, dims: st.dims, need: st.need,
        mode: st.mode || [], advice: st.advice || '', prompt: prompt, recs: recs, best: recs[0],
        save: recs.length ? pickRoute(recs, 'save', st, o) : null,
        fast: recs.length ? pickRoute(recs, 'fast', st, o) : null,
        conflicts: recs.conflicts || {},
        blocked: recs.blocked || {},
        relaxed: !!recs.relaxed
      };
    });

    var conflictMap = {};
    var blockedUnion = {};
    var relaxed = false;
    subs.forEach(function (s) {
      Object.keys(s.conflicts || {}).forEach(function (k) {
        conflictMap[k] = (conflictMap[k] || 0) + s.conflicts[k];
      });
      Object.keys(s.blocked || {}).forEach(function (k) {
        blockedUnion[k] = blockedUnion[k] || {};
        Object.keys(s.blocked[k]).forEach(function (id) { blockedUnion[k][id] = 1; });
      });
      if (s.relaxed) relaxed = true;
    });
    /* 跨步骤去重：同一个模型在多个步骤被排除只计一次 */
    var excluded = {};
    var excludedAll = {};
    Object.keys(blockedUnion).forEach(function (k) {
      excluded[k] = Object.keys(blockedUnion[k]).length;
      Object.keys(blockedUnion[k]).forEach(function (id) { excludedAll[id] = 1; });
    });
    var excludedTotal = Object.keys(excludedAll).length;

    var routes = {
      quality: { name: '质量优先', desc: '每一步都用当前最强，适合结果价值高、可反复返工的场景', picks: subs.map(function (s) { return s.best; }) },
      save: { name: '省钱优先', desc: '在能力不明显掉档的前提下选最便宜，适合 token 预算紧、任务可接受 90 分', picks: subs.map(function (s) { return s.save; }) },
      fast: { name: '速度优先', desc: '在能力够用的前提下选最快，适合赶时间、需要多轮交互', picks: subs.map(function (s) { return s.fast; }) }
    };
    Object.keys(routes).forEach(function (k) {
      routes[k].total = routes[k].picks.reduce(function (a, r) { return a + (r ? r.cost : 0); }, 0);
    });

    return {
      problem: problem, domain: dec.domain, secondary: dec.secondary, subtasks: subs,
      routes: routes, routeKey: routeKey, opts: o,
      totalCost: routes[routeKey].total, files: files,
      constraintConflicts: conflictMap, relaxed: relaxed,
      excluded: excluded, excludedTotal: excludedTotal,
      notes: buildNotes(subs, o, routeKey, files)
    };
  }

  function buildNotes(subs, o, routeKey, files) {
    var notes = [];
    if (files && files.length) {
      notes.push('附件只在这台设备上解析，没有上传到任何服务器；请把原文件拖进你选定模型的对话框，提示词里已写好附件说明。');
      if (files.some(function (f) { return f.needsVision; })) {
        notes.push('含图片 / 扫描件：推荐已按「需要视觉」筛选，表格里的数字仍建议人工复核。');
      }
    }
    if (o.time === 'urgent' && o.tokens === 'scarce') {
      notes.push('时间紧又缺 token：优先用「快模型 + 短输出」，把提示词写死输出长度，避免模型长篇大论。');
    } else if (o.time === 'urgent') {
      notes.push('时间紧：选速度优先路线，必要时把长任务拆成两次并发调用，而不是等一个大模型慢慢想。');
    } else if (o.budget === 'free') {
      notes.push('零预算：先用免费模型跑通结构，关键一步再花几毛钱升级，是最省的做法。');
    } else if (o.tokens === 'scarce') {
      notes.push('token 紧：把「资料」换成摘要再喂，用缓存命中价，关闭不必要的深度思考。');
    } else if (o.time === 'relaxed') {
      notes.push('时间充裕：先用便宜模型出初稿，再用旗舰模型精修关键段落，总成本通常低于全程旗舰。');
    }
    var vendors = {};
    subs.forEach(function (s) { if (s.best) vendors[s.best.model.vendor] = 1; });
    if (Object.keys(vendors).length >= 3) {
      notes.push('当前方案跨了 3 家以上厂商：如果追求稳定，可以合并到 1-2 家，减少账号与合规成本。');
    }
    return notes;
  }

  function strategyText(plan, key) {
    var r = plan.routes[key || plan.routeKey];
    var parts = [];
    parts.push('已拆成 ' + plan.subtasks.length + ' 步，采用「' + r.name + '」路线，单次执行预计 ¥' + fmt(r.total, 3) + '。');
    plan.subtasks.forEach(function (s, i) {
      var pick = r.picks[i];
      if (pick) parts.push('第 ' + (i + 1) + ' 步「' + s.title + '」交给 ' + pick.model.name + '（' + tierLabel(pick.model.tier) + '）。');
    });
    return parts.join('');
  }

  window.MPEngine = {
    decompose: decompose, recommend: recommend, buildPlan: buildPlan, strategyText: strategyText,
    estimateCost: estimateCost, tierLabel: tierLabel, dimLabel: dimLabel, matchDomain: matchDomain,
    fmt: fmt, blend: blend, DIMS: DIMS
  };
})();
