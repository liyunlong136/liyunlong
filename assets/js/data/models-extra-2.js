/* 第二批扩展：按尺寸、模态、推理/代码/轻量细分。 */
window.MP_MODELS_EXTRA = (window.MP_MODELS_EXTRA || []).concat([
  {
    id: 'qwen3-8b', name: 'Qwen3-8B', vendor: '阿里云百炼', country: 'CN', tier: 2,
    priceIn: 0, priceOut: 0, priceConf: 'official', priceNote: '开源权重，自托管仅算力成本',
    ctx: 128000, maxOut: 32768, speed: 9.0, open: true, modalities: ['text'],
    dims: { reasoning: 6.5, coding: 6.8, writing: 6.5, chinese: 8.0, longctx: 7.5, vision: 5.0, speed: 9.0, value: 9.8, agent: 6.0, math: 6.5 },
    desc: 'Qwen3 的小尺寸开源档，单卡可跑，适合分类、抽取、私有化边缘部署。',
    strengths: ['体量小、可离线', '中文基础好', '微调成本低'],
    weaknesses: ['复杂推理弱', '知识面有限'],
    bestFor: ['私有化小任务', '分类打标', '边缘部署', '教学演示'],
    modes: ['私有化', '微调'], api: '自托管 / vLLM', url: 'https://help.aliyun.com/zh/model-studio/models', release: '2026-04', freeTier: '权重免费'
  },
  {
    id: 'qwen3-14b', name: 'Qwen3-14B', vendor: '阿里云百炼', country: 'CN', tier: 2,
    priceIn: 0, priceOut: 0, priceConf: 'official', priceNote: '开源权重，自托管仅算力成本',
    ctx: 256000, maxOut: 32768, speed: 8.5, open: true, modalities: ['text'],
    dims: { reasoning: 7.0, coding: 7.2, writing: 7.0, chinese: 8.2, longctx: 8.0, vision: 5.2, speed: 8.5, value: 9.5, agent: 6.5, math: 7.0 },
    desc: '14B 的开源甜点档：能力明显强于 8B，单机多卡还能跑，适合企业内网通用助手。',
    strengths: ['能力/成本平衡', '可私有化', '中文稳定'],
    weaknesses: ['需要 GPU', '极限任务弱于 72B'],
    bestFor: ['内网助手', '知识库问答', '轻量 Agent', '微调基座'],
    modes: ['私有化', '微调', '工具调用'], api: '自托管 / vLLM', url: 'https://help.aliyun.com/zh/model-studio/models', release: '2026-04', freeTier: '权重免费'
  },
  {
    id: 'qwen3-72b', name: 'Qwen3-72B', vendor: '阿里云百炼', country: 'CN', tier: 3,
    priceIn: 0, priceOut: 0, priceConf: 'official', priceNote: '开源权重，自托管仅算力成本',
    ctx: 256000, maxOut: 32768, speed: 7.0, open: true, modalities: ['text'],
    dims: { reasoning: 8.0, coding: 8.2, writing: 7.8, chinese: 8.6, longctx: 8.5, vision: 5.5, speed: 7.0, value: 8.8, agent: 7.5, math: 7.8 },
    desc: '72B 开源旗舰档，接近闭源 L3 的能力，适合有 GPU 但要求数据不出域的场景。',
    strengths: ['开源里能力强', '长上下文', '可深度微调'],
    weaknesses: ['部署成本高', '多模态缺失'],
    bestFor: ['私有化旗舰', '复杂内网任务', '行业微调', '合规场景'],
    modes: ['私有化', '微调', '工具调用'], api: '自托管 / vLLM', url: 'https://help.aliyun.com/zh/model-studio/models', release: '2026-04', freeTier: '权重免费'
  },
  {
    id: 'qwen3-vl-32b', name: 'Qwen3-VL-32B', vendor: '阿里云百炼', country: 'CN', tier: 3,
    priceIn: 0, priceOut: 0, priceConf: 'official', priceNote: '开源视觉权重，自托管仅算力成本',
    ctx: 256000, maxOut: 32768, speed: 7.5, open: true, modalities: ['text', 'image', 'video'],
    dims: { reasoning: 7.4, coding: 7.0, writing: 7.4, chinese: 8.2, longctx: 8.2, vision: 9.0, speed: 7.5, value: 8.8, agent: 6.6, math: 6.8 },
    desc: '开源视觉理解档，能读图、读表、读视频，适合私有化的质检、票据、教育场景。',
    strengths: ['视觉强且可私有化', '中文图表理解', '支持视频'],
    weaknesses: ['部署门槛高', '纯文本推理一般'],
    bestFor: ['私有化视觉', '票据/质检', '教育图文', '视频理解'],
    modes: ['私有化', '视觉输入', '微调'], api: '自托管 / vLLM', url: 'https://help.aliyun.com/zh/model-studio/models', release: '2026-06', freeTier: '权重免费'
  },
  {
    id: 'qwen3-omni-7b', name: 'Qwen3-Omni-7B', vendor: '阿里云百炼', country: 'CN', tier: 2,
    priceIn: 0, priceOut: 0, priceConf: 'official', priceNote: '开源全模态权重',
    ctx: 128000, maxOut: 16384, speed: 8.8, open: true, modalities: ['text', 'image', 'audio', 'video'],
    dims: { reasoning: 6.4, coding: 6.0, writing: 7.0, chinese: 8.4, longctx: 6.8, vision: 8.8, speed: 8.8, value: 9.2, agent: 6.0, math: 5.8 },
    desc: '端到端全模态开源小模型，语音进语音出，适合做离线语音助手和视频打标。',
    strengths: ['语音/图像/视频原生', '可离线', '延迟低'],
    weaknesses: ['文本推理弱', '长上下文有限'],
    bestFor: ['离线语音助手', '视频打标', '多模态边缘', '教学'],
    modes: ['私有化', '实时语音', '视觉输入'], api: '自托管', url: 'https://help.aliyun.com/zh/model-studio/models', release: '2026-07', freeTier: '权重免费'
  },
  {
    id: 'kimi-k3-mini', name: 'Kimi K3 Mini', vendor: '月之暗面', country: 'CN', tier: 3,
    priceIn: 3, priceOut: 12, priceConf: 'est', priceNote: '按 K3 系列小尺寸推算',
    ctx: 1000000, maxOut: 65536, speed: 8.0, open: false, modalities: ['text', 'image'],
    dims: { reasoning: 8.2, coding: 8.2, writing: 8.6, chinese: 8.8, longctx: 9.4, vision: 7.0, speed: 8.0, value: 8.8, agent: 8.0, math: 7.8 },
    desc: 'K3 系列的轻量档，保留 1M 长文和中文写作，价格约为 K3 的一半。',
    strengths: ['1M 上下文', '中文长文', '价格适中'],
    weaknesses: ['极限推理弱于 K3', '多模态一般'],
    bestFor: ['长文总结', '资料综述', '中文写作', '轻量 Agent'],
    modes: ['深度思考', '长文档', '联网搜索'], api: 'OpenAI 兼容', url: 'https://platform.kimi.com/docs/pricing/chat', release: '2026-08', freeTier: '新用户额度'
  },
  {
    id: 'glm-5.3-flash-lite', name: 'GLM-5.3-Flash-Lite', vendor: '智谱 AI', country: 'CN', tier: 2,
    priceIn: 0.4, priceOut: 1.4, priceConf: 'est', priceNote: '按 Flash 系列更低档推算',
    ctx: 1000000, maxOut: 32768, speed: 9.4, open: false, modalities: ['text', 'image'],
    dims: { reasoning: 7.0, coding: 7.4, writing: 7.2, chinese: 8.2, longctx: 8.6, vision: 7.8, speed: 9.4, value: 9.8, agent: 6.8, math: 6.6 },
    desc: '智谱的超低价多模态档，适合海量截图理解、分类和轻客服。',
    strengths: ['极便宜', '速度快', '支持图片'],
    weaknesses: ['复杂任务浅', '长输出一般'],
    bestFor: ['批量图文', '分类打标', '轻客服', '内容审核'],
    modes: ['视觉输入', '低延迟', '批量'], api: 'OpenAI 兼容', url: 'https://docs.bigmodel.cn/cn/guide/start/pricing', release: '2026-10', freeTier: '有免费额度'
  },
  {
    id: 'doubao-seed-2.1-mini', name: '豆包 Seed 2.1 Mini', vendor: '字节跳动', country: 'CN', tier: 2,
    priceIn: 0.4, priceOut: 1.8, priceConf: 'est', priceNote: '按 Seed 2.1 小尺寸推算',
    ctx: 1000000, maxOut: 32768, speed: 9.4, open: false, modalities: ['text', 'image', 'audio'],
    dims: { reasoning: 6.2, coding: 6.0, writing: 7.2, chinese: 8.8, longctx: 8.6, vision: 7.4, speed: 9.4, value: 9.8, agent: 6.2, math: 5.8 },
    desc: '豆包 2.1 的 mini 档，支持音频与图片，适合语音客服和批量内容处理。',
    strengths: ['极低价格', '音频输入', '1M 上下文'],
    weaknesses: ['推理弱', '长文质量一般'],
    bestFor: ['语音客服', '批量打标', '简单问答', '内容审核'],
    modes: ['语音输入', '视觉输入', '非思考'], api: '火山方舟', url: 'https://ark.volcengine.com/region:cn-beijing/docs/model-pricing', release: '2026-09', freeTier: '新用户 tokens'
  },
  {
    id: 'hunyuan-large', name: '混元 Large', vendor: '腾讯', country: 'CN', tier: 3,
    priceIn: 0, priceOut: 0, priceConf: 'official', priceNote: '开源权重，自托管仅算力成本',
    ctx: 256000, maxOut: 32768, speed: 7.0, open: true, modalities: ['text'],
    dims: { reasoning: 7.8, coding: 7.0, writing: 7.8, chinese: 8.6, longctx: 8.0, vision: 5.0, speed: 7.0, value: 8.4, agent: 7.0, math: 7.6 },
    desc: '腾讯开源的大尺寸档，中文知识扎实，适合内网知识库与政务私有化。',
    strengths: ['中文知识', '可私有化', '长文'],
    weaknesses: ['生态小', '多模态弱'],
    bestFor: ['内网知识库', '政务私有化', '中文问答', '微调'],
    modes: ['私有化', '微调'], api: '自托管', url: 'https://cloud.tencent.com/product/hunyuan', release: '2026-03', freeTier: '权重免费'
  },
  {
    id: 'minimax-m3', name: 'MiniMax M3', vendor: 'MiniMax', country: 'CN', tier: 4,
    priceIn: 4, priceOut: 16, priceConf: 'est', priceNote: '按 M3 旗舰档推算',
    ctx: 1000000, maxOut: 65536, speed: 7.2, open: false, modalities: ['text', 'image'],
    dims: { reasoning: 8.4, coding: 8.0, writing: 8.4, chinese: 8.8, longctx: 9.4, vision: 7.0, speed: 7.2, value: 8.2, agent: 8.4, math: 7.8 },
    desc: 'MiniMax 的旗舰长会话档，角色一致性和长上下文强，适合陪伴、剧本和长客服。',
    strengths: ['长会话记忆', '中文自然', 'Agent 能力'],
    weaknesses: ['多模态一般', '极限推理弱'],
    bestFor: ['角色扮演', '长剧集', '长客服', 'Agent'],
    modes: ['深度思考', '长上下文', '工具调用'], api: 'OpenAI 兼容', url: 'https://platform.minimaxi.com', release: '2026-08', freeTier: '新用户额度'
  },
  {
    id: 'ernie-5.0-thinking', name: '文心一言 5.0 Thinking', vendor: '百度', country: 'CN', tier: 4,
    priceIn: 5, priceOut: 20, priceConf: 'est', priceNote: '按 5.0 推理档推算',
    ctx: 256000, maxOut: 32768, speed: 6.4, open: false, modalities: ['text', 'image'],
    dims: { reasoning: 8.8, coding: 7.8, writing: 8.6, chinese: 9.4, longctx: 8.4, vision: 8.0, speed: 6.4, value: 7.4, agent: 7.6, math: 8.4 },
    desc: '文心的深度思考档，中文知识、公文和教育场景强，适合需要严谨中文表达的任务。',
    strengths: ['中文知识密度', '公文规范', '图文理解'],
    weaknesses: ['代码一般', '速度偏慢'],
    bestFor: ['政务公文', '中文知识问答', '教育内容', '长文分析'],
    modes: ['深度思考', '联网搜索', '视觉输入'], api: '千帆平台', url: 'https://cloud.baidu.com/product/wenxinworkshop', release: '2026-05', freeTier: '新用户额度'
  },
  {
    id: 'spark-x1-mini', name: '讯飞星火 X1 Mini', vendor: '科大讯飞', country: 'CN', tier: 2,
    priceIn: 0.8, priceOut: 3.2, priceConf: 'est', priceNote: '按 X1 小尺寸推算',
    ctx: 128000, maxOut: 16384, speed: 7.8, open: false, modalities: ['text'],
    dims: { reasoning: 7.6, coding: 7.0, writing: 7.6, chinese: 8.6, longctx: 7.4, vision: 5.8, speed: 7.8, value: 9.2, agent: 6.4, math: 7.6 },
    desc: '星火的轻量推理档，数学与中文教育场景够用，价格低，适合批量解题和批改。',
    strengths: ['数学推理', '价格低', '中文教育'],
    weaknesses: ['代码弱', '上下文 128K'],
    bestFor: ['数学解题', '作业批改', '教学辅助', '中文问答'],
    modes: ['深度思考', '联网搜索'], api: '讯飞开放平台', url: 'https://xinghuo.xfyun.cn', release: '2026-04', freeTier: '有试用'
  },
  {
    id: 'gpt-5.5-pro', name: 'GPT-5.5 Pro', vendor: 'OpenAI', country: 'US', tier: 5,
    priceIn: 106, priceOut: 426, priceConf: 'est', priceNote: '按 $15 / $60 推算；以 OpenAI 官网为准',
    ctx: 1000000, maxOut: 128000, speed: 3.8, open: false, modalities: ['text', 'image'],
    dims: { reasoning: 10, coding: 9.9, writing: 9.4, chinese: 8.4, longctx: 9.8, vision: 9.2, speed: 3.8, value: 3.0, agent: 10, math: 10 },
    desc: 'GPT-5.5 的高算力档，面向最难的科研、算法和长程 Agent，价格也是最高一档。',
    strengths: ['极限推理', '长程 Agent', '多模态'],
    weaknesses: ['极贵', '慢', '国内访问难'],
    bestFor: ['科研难题', '关键系统设计', '复杂 Agent', '高价值决策'],
    modes: ['深度思考', '视觉输入', '代码执行', '工具调用'], api: 'OpenAI Responses', url: 'https://platform.openai.com/docs/pricing', release: '2026-06', freeTier: 'ChatGPT 付费档'
  },
  {
    id: 'gpt-5.5-codex', name: 'GPT-5.5 Codex', vendor: 'OpenAI', country: 'US', tier: 5,
    priceIn: 35.5, priceOut: 213, priceConf: 'est', priceNote: '按 GPT-5.5 同价推算，代码专用',
    ctx: 1000000, maxOut: 128000, speed: 4.5, open: false, modalities: ['text', 'image'],
    dims: { reasoning: 9.6, coding: 10, writing: 8.6, chinese: 8.0, longctx: 9.4, vision: 8.8, speed: 4.5, value: 3.5, agent: 9.8, math: 9.4 },
    desc: '面向代码仓库与终端操作的专用档，擅长长任务、补丁和测试闭环。',
    strengths: ['代码能力顶级', '长任务稳定', '工具调用'],
    weaknesses: ['价格高', '中文写作一般'],
    bestFor: ['大型仓库重构', '长程编码 Agent', '疑难 bug', '代码审查'],
    modes: ['深度思考', '工具调用', 'Claude Code 风格'], api: 'OpenAI Responses', url: 'https://platform.openai.com/docs/pricing', release: '2026-07', freeTier: 'ChatGPT 付费档'
  },
  {
    id: 'o5-pro', name: 'o5 Pro', vendor: 'OpenAI', country: 'US', tier: 5,
    priceIn: 71, priceOut: 284, priceConf: 'est', priceNote: '按 $10 / $40 推算',
    ctx: 400000, maxOut: 128000, speed: 3.2, open: false, modalities: ['text', 'image'],
    dims: { reasoning: 9.9, coding: 9.4, writing: 9.0, chinese: 8.0, longctx: 9.4, vision: 8.8, speed: 3.2, value: 3.2, agent: 9.6, math: 10 },
    desc: 'o 系列的推理专精档，用更长的思考换正确率，适合数学、算法和形式化任务。',
    strengths: ['数学/算法强', '长思考链', '自我验证'],
    weaknesses: ['极慢极贵', '不适合日常'],
    bestFor: ['数学证明', '算法竞赛', '科研推理', '高风险复核'],
    modes: ['超长思考', '视觉输入', '工具调用'], api: 'OpenAI Responses', url: 'https://platform.openai.com/docs/pricing', release: '2026-05', freeTier: 'ChatGPT 付费档'
  },
  {
    id: 'llama-4.5-maverick-17b', name: 'Llama 4.5 Maverick 17B', vendor: 'Meta', country: 'US', tier: 2,
    priceIn: 0, priceOut: 0, priceConf: 'official', priceNote: '开源权重，自托管仅算力成本',
    ctx: 1000000, maxOut: 32768, speed: 8.2, open: true, modalities: ['text', 'image'],
    dims: { reasoning: 7.0, coding: 7.0, writing: 7.2, chinese: 6.2, longctx: 8.0, vision: 7.2, speed: 8.2, value: 9.6, agent: 6.4, math: 6.6 },
    desc: 'Llama 4.5 的 17B 开源档，单机可跑，适合中小企业私有化和微调。',
    strengths: ['单机可跑', '可微调', '长上下文'],
    weaknesses: ['中文弱', '能力有限'],
    bestFor: ['私有化', '轻量助手', '微调基座', '离线部署'],
    modes: ['私有化', '微调', '视觉输入'], api: '自托管', url: 'https://www.llama.com', release: '2026-04', freeTier: '权重免费'
  },
  {
    id: 'mistral-large-3-instruct', name: 'Mistral Large 3 Instruct', vendor: 'Mistral AI', country: 'EU', tier: 3,
    priceIn: 14, priceOut: 42, priceConf: 'est', priceNote: '按 $2 / $6 推算，权重开放',
    ctx: 256000, maxOut: 32768, speed: 7.6, open: true, modalities: ['text', 'image'],
    dims: { reasoning: 7.8, coding: 7.8, writing: 8.0, chinese: 6.4, longctx: 7.6, vision: 7.0, speed: 7.6, value: 7.8, agent: 7.4, math: 7.4 },
    desc: 'Mistral 的指令微调旗舰，欧盟合规友好，适合出海和多语言业务。',
    strengths: ['欧盟合规', '多语言', '可私有化'],
    weaknesses: ['中文弱', '生态小'],
    bestFor: ['欧盟业务', '多语言客服', '私有化', '合规场景'],
    modes: ['私有化', '函数调用', '视觉输入'], api: 'Mistral API / 自托管', url: 'https://mistral.ai', release: '2026-05', freeTier: '有免费实验档'
  },
  {
    id: 'magistral-medium', name: 'Magistral Medium', vendor: 'Mistral AI', country: 'EU', tier: 3,
    priceIn: 10, priceOut: 30, priceConf: 'est', priceNote: '按 $1.4 / $4.2 推算，权重开放',
    ctx: 128000, maxOut: 32768, speed: 6.8, open: true, modalities: ['text'],
    dims: { reasoning: 8.6, coding: 8.4, writing: 7.8, chinese: 6.2, longctx: 8.2, vision: 5.0, speed: 6.8, value: 7.4, agent: 7.8, math: 8.8 },
    desc: 'Mistral 的推理专精档，数学与多步推理强，可私有化，适合欧洲合规场景。',
    strengths: ['推理/数学', '可私有化', '长思考'],
    weaknesses: ['中文弱', '无视觉'],
    bestFor: ['数学推理', '合规私有化', '多步分析', '科研'],
    modes: ['深度思考', '私有化'], api: 'Mistral API / 自托管', url: 'https://mistral.ai', release: '2026-06', freeTier: '有免费实验档'
  },
  {
    id: 'phi-4-mini', name: 'Phi-4 Mini', vendor: 'Microsoft', country: 'US', tier: 1,
    priceIn: 0, priceOut: 0, priceConf: 'official', priceNote: '开源小模型，自托管或 Azure 低价',
    ctx: 128000, maxOut: 16384, speed: 9.2, open: true, modalities: ['text'],
    dims: { reasoning: 6.8, coding: 7.0, writing: 6.8, chinese: 5.8, longctx: 6.8, vision: 5.6, speed: 9.2, value: 9.8, agent: 5.8, math: 6.6 },
    desc: '极小尺寸开源档，能跑在笔记本和边缘盒子上，适合离线工具和教学。',
    strengths: ['极小可离线', '价格为零', '响应快'],
    weaknesses: ['知识面窄', '中文弱'],
    bestFor: ['边缘部署', '离线工具', '教学演示', '轻量分类'],
    modes: ['私有化', '微调'], api: '自托管 / Azure', url: 'https://azure.microsoft.com', release: '2026-02', freeTier: '权重免费'
  },
  {
    id: 'gemma-3-9b', name: 'Gemma 3 9B', vendor: 'Google', country: 'US', tier: 2,
    priceIn: 0, priceOut: 0, priceConf: 'official', priceNote: '开源权重，自托管仅算力成本',
    ctx: 128000, maxOut: 16384, speed: 8.4, open: true, modalities: ['text', 'image'],
    dims: { reasoning: 6.8, coding: 6.6, writing: 7.0, chinese: 6.2, longctx: 7.4, vision: 7.0, speed: 8.4, value: 9.6, agent: 5.8, math: 6.4 },
    desc: 'Google 的 9B 开源多模态档，单卡可跑，适合私有化图片理解和轻助手。',
    strengths: ['单卡可跑', '支持图片', '可微调'],
    weaknesses: ['中文一般', '复杂任务弱'],
    bestFor: ['私有化视觉', '轻量助手', '边缘部署', '教学'],
    modes: ['私有化', '视觉输入', '微调'], api: '自托管', url: 'https://ai.google.dev', release: '2026-03', freeTier: '权重免费'
  }
]);
