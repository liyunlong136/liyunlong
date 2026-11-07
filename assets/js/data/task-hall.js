/* 任务大厅：用户不需要知道模型名，只需要选一个任务。 */
window.MP_TASKS = [
  {
    id: 'xhs', icon: '📝', title: '写 10 条小红书文案',
    desc: '有产品、有卖点，但不知道怎么写才像真人分享。',
    prompt: '我要给一款便携咖啡机写 10 条小红书文案，目标人群是通勤上班族，预算不高，要求像真实用户分享，不要广告腔。',
    level: 'L3', model: 'doubao-seed-2.1-turbo', budget: 'low', time: 'normal', tokens: 'normal',
    sample: { inTok: 800, outTok: 1200, calls: 10 }, compare: 'gpt-5.5',
    why: [
      '小红书的核心是「平台语感 + 真实细节」，豆包对中文口语和种草体最熟。',
      'L3 主力档足够，10 条文案总成本约几毛钱；换成 L5 会贵好几倍，但文案未必更好。',
      '先用 L3 批量出稿，挑出 2 条再让 L4 精修开头，比全程旗舰更划算。'
    ]
  },
  {
    id: 'finance', icon: '📚', title: '解析 50 页财报',
    desc: '整份财报读不完，想知道哪三张表最该看、风险在哪。',
    prompt: '帮我读完这份 50 页的上市公司财报，提炼营收、利润、现金流三个核心指标，指出 3 个风险点，并给出 5 个追问。',
    level: 'L4', model: 'kimi-k3.1-pro', budget: 'high', time: 'normal', tokens: 'ample',
    sample: { inTok: 80000, outTok: 3000, calls: 1 }, compare: 'gpt-5.5',
    why: [
      '财报是典型的「长上下文 + 严谨引用」任务，Kimi 的 1M 上下文可以一次读完。',
      'L5 也能做，但价格是 Kimi 的数倍；财报的关键是读全，不是跑分。',
      '要求它标页码和原文，能显著降低编造数字的概率。'
    ]
  },
  {
    id: 'bug', icon: '🐞', title: '修一个线上 bug',
    desc: '有报错栈和日志，但定位不到根因，今天就要修。',
    prompt: '我的 Python 服务在高峰期偶尔返回 502，日志里有 TimeoutError 和连接池耗尽，今天必须修好。',
    level: 'L4', model: 'glm-5.3', budget: 'mid', time: 'urgent', tokens: 'normal',
    sample: { inTok: 12000, outTok: 2500, calls: 3 }, compare: 'claude-opus-4.6',
    why: [
      '修 bug 需要读代码、读日志、给可回滚补丁，GLM-5.3 的工程能力在 L3–L4 里最强。',
      '先用 L3 跑 2–3 轮，把范围缩小；关键补丁再让 L5 复核，比一上来就上旗舰省很多。',
      '把完整报错栈和相关文件一起给，效果比只贴一行错误好一倍。'
    ]
  },
  {
    id: 'translate', icon: '🌐', title: '把 50 页 PDF 翻成中文',
    desc: '整篇翻译，术语不能乱，预算越低越好。',
    prompt: '我想把一份 50 页的英文产品手册翻译成中文，术语要统一，预算越低越好，最后给我一份术语表。',
    level: 'L2', model: 'deepseek-flash', budget: 'low', time: 'normal', tokens: 'normal',
    sample: { inTok: 20000, outTok: 20000, calls: 1 }, compare: 'gpt-5.5',
    why: [
      '翻译的瓶颈是术语一致性，不是模型智商；L2 的 DeepSeek Flash 中文已经够顺。',
      '50 页整篇约几毛钱；用 L5 翻同样内容要几十块，差异主要在极少数文学性表达。',
      '先建 20 个术语表，再分段翻，最后只让 L3 校对标题和法务段落。'
    ]
  },
  {
    id: 'competitor', icon: '⚔', title: '做一份竞品分析',
    desc: '老板要对比 3 个竞品，找出我们能打的空位。',
    prompt: '帮我分析 3 个直接竞品，从功能、定价、渠道、用户心智四个面做对比，找出 2 个我们可以切入的空位。',
    level: 'L4', model: 'qwen3.8-max', budget: 'mid', time: 'normal', tokens: 'normal',
    sample: { inTok: 6000, outTok: 3000, calls: 2 }, compare: 'gpt-5.5',
    why: [
      '竞品分析需要中文语感和商业常识，Qwen Max 在这两项上是国产第一梯队。',
      '关键不是让模型编数据，而是让它给「对手守不住的地方」；L4 足够。',
      '把已知的定价、渠道信息一起给它，并要求不确定的标「待核实」。'
    ]
  },
  {
    id: 'support', icon: '☎', title: '做客服 FAQ 机器人',
    desc: '每天几万次重复问题，想用最便宜的方式回答。',
    prompt: '我们有 200 条产品 FAQ，想做一个客服机器人，每天大约 3 万次问答，回答要短、不能乱承诺，预算尽量低。',
    level: 'L2', model: 'glm-5.3-flash', budget: 'low', time: 'normal', tokens: 'scarce',
    sample: { inTok: 1200, outTok: 300, calls: 30000 }, compare: 'gpt-5.5',
    why: [
      '90% 的客服问题是重复的，L2 的 GLM-5.3-Flash 完全够用，价格只有旗舰的几十分之一。',
      '真正要花钱的是「答不准导致转人工」，所以要配 RAG 和置信度路由。',
      '每天 3 万次，L2 月成本约几百元；L5 会到十万元级。'
    ]
  },
  {
    id: 'invoice', icon: '🧾', title: '把发票录成 Excel',
    desc: '一堆积压的发票和扫描件，要字段化、能核对。',
    prompt: '我有 300 张发票扫描件，想提取发票号、金额、税号、开票日期，做成 Excel，金额必须能核对。',
    level: 'L2', model: 'glm-ocr', budget: 'low', time: 'normal', tokens: 'normal',
    sample: { inTok: 3000, outTok: 500, calls: 300 }, compare: 'gpt-5.5',
    why: [
      '认字和推理要分开：GLM-OCR 专门做版面/表格识别，比通用模型准且便宜。',
      '通用视觉模型容易把 8 看成 3；金额、税号必须加正则校验和人工抽检。',
      'OCR + 规则校验的组合，成本只有通用 L5 的几十分之一。'
    ]
  },
  {
    id: 'interview', icon: '🎤', title: '模拟一次面试',
    desc: '下周面试，想被真实追问，而不是背答案。',
    prompt: '我下周要面试产品经理，帮我模拟一次面试，会追问细节，最后给评分和改写示范。',
    level: 'L3', model: 'qwen3.7-plus', budget: 'low', time: 'relaxed', tokens: 'normal',
    sample: { inTok: 2000, outTok: 1500, calls: 10 }, compare: 'gpt-5.5',
    why: [
      '模拟面试的关键是「会追问」，不是模型多大；L3 的 Qwen Plus 足够。',
      '要求它一次只问一个问题、根据回答追问两层，比一次列 20 道题有效。',
      '最后让它给评分表和改写示范，你才知道差在哪。'
    ]
  },
  {
    id: 'excel', icon: '📊', title: '分析一份 Excel 数据',
    desc: '有一张销售表，想知道趋势、异常和下一步。',
    prompt: '我有一份 12 个月的销售数据，帮我检查缺失值和异常值，找出 3 个趋势和 2 个异常，并给出下一步验证建议。',
    level: 'L4', model: 'deepseek-v4-pro', budget: 'low', time: 'normal', tokens: 'normal',
    sample: { inTok: 8000, outTok: 2000, calls: 2 }, compare: 'gpt-5.5',
    why: [
      '数据分析的关键是「让模型写代码算」，不是让模型心算；DeepSeek V4 Pro 写 SQL/Python 又便宜又好。',
      'L3 足够处理常规报表；真正难的是口径和异常解释，不是模型等级。',
      '要求它先确认字段和口径，再下结论，能减少一半的误读。'
    ]
  },
  {
    id: 'teach', icon: '🧑‍🏫', title: '讲懂一个复杂概念',
    desc: '看书看不懂，想要一个能听懂的讲解。',
    prompt: '用费曼学习法给我讲懂「Transformer 的注意力机制」，我是产品经理，数学基础一般。',
    level: 'L1', model: 'glm-4.7-flash', budget: 'free', time: 'relaxed', tokens: 'normal',
    sample: { inTok: 1500, outTok: 1500, calls: 5 }, compare: 'gpt-5.5',
    why: [
      '概念讲解不需要顶级模型，L1 免费档就能讲清楚，关键在提示词让它用类比和反例。',
      '先让它用生活类比，再给定义，最后出 3 道题；比直接读教科书有效。',
      '如果讲到一半听不懂，让它换一个类比，而不是换更贵的模型。'
    ]
  }
];
