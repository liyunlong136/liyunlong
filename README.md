# 模选 ModelPick

**让更多人学会使用模型，而不是被模型选择。**

一个免费、无登录、纯前端的大模型选型与学习平台：上传截图或文件，把问题拆成几步，按你的时间、预算、token 余量推荐**具体模型**（精确到版本与 L1–L5 等级），说明为什么适合、该开什么模式、token 与时间成本，并给出可直接粘贴的提示词。

> 本地版：双击 `index.html`（或 `打开.bat`）。
> 在线版：整个目录丢到任意静态托管即可，无后端、无构建。

---

## 静态内容页（SEO）

首页是单页应用，模型详情、任务和提示词都在弹层里，搜索引擎只能看到一个 URL。所以额外生成一层预渲染 HTML，不依赖 JS：

| 目录 | 内容 | 数量 |
| --- | --- | --- |
| model/<id>.html | 单个模型：价格、十维能力、适合场景、优缺点、FAQ、同级对比 | 125 |
| task/<id>.html | 单个任务：推荐模型、成本账、为什么、完整提示词 | 10 |
| solution/<id>.html | 单套方案：主模型 / 省钱替代 / 配套 / 步骤 / 坑 | 10 |
| prompt/cat-xx.html | 按场景聚合的提示词集合页 | 90 |
| compare/<a>-vs-<b>.html | 50 组高频 A vs B 对比：价格、十维能力、怎么选、FAQ | 50 |
| model/ task/ solution/ prompt/ compare/ | 五个分栏索引 | 5 |

共 290 个静态页 + 首页，sitemap.xml 291 条 URL。每个页面都有独立的 title / description / canonical / og:image；模型、任务、方案、提示词集合和对比页另有 JSON-LD。

生成方式（不依赖 npm 包）：

    node tools/build-pages.mjs

站点域名默认是 https://myaskmate.com；部署到别的域名时用 SITE=https://你的域名 node tools/build-pages.mjs 重新生成。

相关文件：assets/css/page.css、assets/img/og.png、404.html、robots.txt、sitemap.xml。

---

## 现在能做什么

| 模块 | 说明 |
| --- | --- |
| 上传即分析 | 拖入图片、PDF、Word、PPT、Excel、代码或文本，浏览器本地解析类型、页数、字数、是否扫描件，自动加「视觉 / 长上下文」门槛，并生成一个「读取并理解附件」的子任务 |
| 智能选型 | 10 个领域自动识别，拆成 3–4 步；按时间 / 预算 / token / 硬需求给每一步推荐 Top 5 模型，含等级、匹配度、价格、理由、坑 |
| 任务大厅 | 首页直接给 10 个任务卡（写小红书、读财报、修 bug、发票录入…），点开先看「为什么推荐」和这笔账，再一键开始 |
| PK 对比 | 同一条问题：左边原样问 + L1/L2，右边结构化提示词 + L4/L5；可只做结构对比，也可用自己的 API Key 真跑 |
| A vs B 对比页 | 50 组高频成对对比（DeepSeek vs Qwen、GPT vs Claude、开源 vs 闭源、便宜档 vs 旗舰档），每页有价格表、十维对比、结论和 FAQ |
| 排行榜 | 首页总榜 + 口碑 / 代码 / 写作 / 性价比 / 长文本 / 多模态 / Agent / 免费 / L2 / 开源 10 个分榜；总榜 = 能力 80% + 用户评分 20% |
| 独立内容页 | 125 模型 + 10 任务 + 10 方案 + 90 提示词分类 + 50 组对比，共 290 个静态页；每页有 canonical、OG、JSON-LD |
| 最近方案 | 自动记住最近 5 次选型（问题 + 预算 / 时间 / token + 硬需求），首页一点即重跑；只存 localStorage |
| 方案分享 | 结果区「复制分享链接」把完整约束压进 ?h=，对方打开自动还原并重新生成同一套方案 |
| 场景方案 | 10 套「主模型 + 省钱替代 + 配套工具」组合：长文档、翻译、客服、代码、OCR、内容、数据、私有化、学习、Agent；直接算单次成本 |
| 降级算账 | 输入每天调用量，直接算 L5 → L2 的月成本、年节省、能力分差，并给降级平替 |
| 合规标签 | 国内直连 / 可私有化 / 境内备案 三个筛选；详情页有合规与部署说明，避免只看跑分 |
| 匿名统计 | 本地匿名 ID + 事件记录（看页面、点任务、跑 PK），只存 localStorage，不上传 |
| 防白嫖 | 前端每日次数 + 输入/输出上限；共享 Key 场景提供 Cloudflare Worker：Turnstile、IP/匿名 ID 限流、模型白名单 |
| 三套路线 | 质量优先 / 省钱优先 / 速度优先，一键切换，实时显示单次总成本与节省比例 |
| 全局搜索 | 顶部搜索（`Ctrl K` 或 `/`）跨模型、算法、任务模板搜索；模型库内还有独立筛选与搜索 |
| 模型卡 | 卡片上直接用 ✓ / ! 概括一条最大优点和一条最大注意点；点开看完整画像 |
| 模型详情 | 用途、价格、成本试算、**按问题选模式**（什么时候开 / 什么时候别开）、**Token 与时间效率**（4 种典型场景的费用与耗时）、**上下文能装多少**（万字 / PDF 页数） |
| 提示词库 | **500+ 条**结构化模板（37 条领域 + 19 条专题 + 5 个行业包）；支持搜索、按问题匹配、逐条解释「为什么这样写」 |
| 模型专用话术 | 选定模型后，把通用提示词改写成该模型专属话术：该开什么模式、输出多长、先做什么、信息不足时怎么问 |
| 价格同步 | 内置同步脚本，抓取智谱 / 火山方舟 / DeepSeek 官方定价；本地计划任务或 GitHub Actions 每天自动更新 |
| 算法库 | 65 条机器学习与大模型算法：怎么做、最容易踩的坑、什么时候用 |
| 使命展示 | 首页与关于页明确写出「让更多人学会使用模型」的目标与三条路径：看懂 / 选对 / 用起来 |

## 上传文件是怎么工作的

- **不上传**：所有解析都在浏览器里完成，文件内容不会发到任何服务器，也不会被保存。
- **支持**：PNG/JPG/WebP/GIF/BMP、PDF、DOCX、PPTX、XLSX、TXT/MD/CSV/JSON/LOG，以及常见代码文件；最多 3 个，单个 ≤ 15MB。
- **文本类**：读取正文，判断主题、篇幅与类型（合同 / 论文 / 报错日志 / 简历 / 表格等）。
- **PDF**：尝试提取可读文字并统计页数；提取不到就判定为扫描件，自动按「需要视觉」筛选模型。
- **图片**：只读取尺寸、色调与明暗，判断是截图 / 文档 / 照片 / 图表；**不做 OCR**，需要模型开视觉模式自己读。
- **之后**：推荐结果里会多一个「读取并理解附件」步骤；每条提示词都带附件说明。选定模型后，把原文件拖进它的对话框即可。

> 为什么不做「站内直接回答」：那需要后端和 API Key，就不再是免费、离线、无追踪的工具了。本站负责「选对 + 问对」，真正的推理交给你选的模型。

## 提示词库怎么用

1. **不知道用哪条**：在提示词页顶部输入你的问题，点「帮我找提示词」，会按语义相似度返回 3–5 条，并显示命中词和匹配度。
2. **想知道为什么**：每条卡片都能展开「这条提示词什么意思」，逐段解释角色 / 输入 / 任务 / 约束 / 输出格式的作用。
3. **想直接复制**：匹配结果会把 `{{problem}}` 替换成你刚输入的问题，复制即可发给模型。
4. **已经选好模型**：在「智能选型」的结果页，每条推荐都有一条「给 XX 的专用话术」，会自动加上该模型该开的模式、输出长度和自检要求。
5. **想一次跑完**：结果页的「复制整段话术」会给出一条总控提示，让模型按步骤停下来等你确认。

## 价格每天同步

纯静态站点不能直接跨域抓各家官网（CORS + 反爬），所以同步由一个小脚本完成，站点只读生成后的 `prices.js`：

- **本地**：`node tools/sync-prices.mjs --apply`；Windows 可运行 `tools/install-daily-sync.ps1` 注册每天 09:00 的计划任务。
- **部署**：仓库已带 `.github/workflows/sync-prices.yml`，每天 09:00（北京时间）抓取并自动提交；用户刷新页面即可看到新价。
- **覆盖来源**：智谱开放平台、火山方舟、DeepSeek 官方、腾讯混元（当前 17 个模型；解析失败的来源会保留原值，并在「关于 → 价格每日同步」里标出失败）。
- **在线检查**：通过 http 访问时，点「立即检查更新」会拉取最新的 `prices.json`；file:// 本地打开时该按钮会提示改用脚本。

## 如果要接共享 API Key（防白嫖）

**永远不要把共享 Key 放在前端。** 前端只放一个网关地址，Key 放在服务端。

仓库带了 `server/worker.js`（Cloudflare Worker，无依赖）：

- Cloudflare Turnstile 无感验证，挡脚本
- 匿名 ID 每天 5 次 + 单 IP 每天 20 次（KV 计数）
- 模型白名单：免费只放 L1/L2，L5 需要任务/邀请解锁
- 输入 4000 字上限、`max_tokens` 硬上限 500
- 上游 Key 只存在 Worker secret；匿名日志只记模型和 token 数，不记内容

部署：

    cd server
    npm i -g wrangler
    wrangler kv namespace create MP_KV   # 把 id 填进 wrangler.toml
    wrangler secret put UPSTREAM_BASE    # 例如 https://api.deepseek.com
    wrangler secret put UPSTREAM_KEY
    wrangler secret put TURNSTILE_SECRET
    wrangler secret put ALLOWED_MODELS   # 例如 deepseek-flash,glm-4.7-flash
    wrangler deploy

前端 PK 页目前是「自带 Key 真跑」模式：Key 只存 sessionStorage，关闭标签页即失效，最多 5 次/天（本地限制）。如果要改成走网关，把 `pk.js` 里的 `callModel` 换成请求你的 Worker 即可。

## 反馈入口

右下角固定「✎ 反馈」按钮，页脚也有入口。

- 反馈类型：体验问题 / 功能建议 / 数据纠错 / 提示词建议 / 其他
- 可选 1–5 星评分、联系方式、页面与浏览器信息
- 默认保存到本机 localStorage（最多 100 条），可一键复制、发邮件或去 GitHub 提 issue
- 配置 `assets/js/feedback-config.js` 里的 `endpoint` 后，提交会直接 POST 过去（Formspree、自己的 Worker、飞书/钉钉机器人网关都可以）
- `email` / `github` 用于本地模式的备用入口；不填就只保留「复制反馈内容」

隐私：默认不上传；勾选「附上页面与浏览器信息」也只包含 UA、语言、视口和匿名 ID，不包含输入内容与文件。

## 模型评分（Supabase）

模型详情页现在有一个五星评分：SVG 星星、悬停浅金、点击锁定、下方弹出「感谢您的评价！」。评分会写入 Supabase 的  ratings  表；没配置时只保存在本机。

### 1. 建表与 RLS

在 Supabase SQL Editor 执行：

    create table public.ratings (
      id bigint generated by default as identity primary key,
      model_id text not null,
      user_fingerprint uuid not null,
      score smallint not null check (score between 1 and 5),
      created_at timestamptz not null default now(),
      unique (model_id, user_fingerprint)
    );

    alter table public.ratings enable row level security;

    create policy "ratings read" on public.ratings
      for select to anon using (true);

    create policy "ratings insert" on public.ratings
      for insert to anon with check (true);

    create policy "ratings update" on public.ratings
      for update to anon using (true) with check (true);

生产环境建议把 update 策略收窄（例如只允许改自己的 fingerprint），排行榜用只读视图或 RPC。

### 2. 填配置

编辑 `assets/js/supabase-config.js`：

    window.MP_SUPABASE = {
      url: 'https://你的项目.supabase.co',
      anonKey: 'sb_publishable_...',
      table: 'ratings'
    };

anon key 是公开的，但必须配合 RLS 使用；**绝对不要把 service_role key 放到前端**。

### 3. 两种写入方式

站点默认用原生 `fetch` 直接调 PostgREST，不需要打包器，file:// 也能跑（如果浏览器允许跨域）：

    await fetch(SUPABASE_URL + '/rest/v1/ratings?on_conflict=model_id,user_fingerprint', {
      method: 'POST',
      headers: {
        apikey: ANON_KEY,
        Authorization: 'Bearer ' + ANON_KEY,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=minimal'
      },
      body: JSON.stringify({ model_id: 'deepseek-v4-pro', user_fingerprint: UUID, score: 5 })
    });

如果你更习惯官方 SDK，初始化方式：

    npm i @supabase/supabase-js
    # 或浏览器直接：
    # <script type="module">
    import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

    const supabase = createClient('https://你的项目.supabase.co', 'sb_publishable_...');

    const { error } = await supabase
      .from('ratings')
      .upsert(
        { model_id: 'deepseek-v4-pro', user_fingerprint: crypto.randomUUID(), score: 5 },
        { onConflict: 'model_id,user_fingerprint' }
      );

评分组件在 `assets/js/rating.js`；挂载点是模型详情弹窗里的 `#modelRating`。用户指纹存在 `localStorage.mp_rating_uid`，只是一个随机 UUID，不代表真实身份。

没配置 Supabase 时：星星照常可用，评分写入 `localStorage.mp_ratings`，并提示「本地演示」。

## 快速开始

方式一（最简单）：

    双击 index.html

方式二（本地服务器）：

    cd 大模型推荐平台
    python -m http.server 8080
    # 打开 http://localhost:8080

方式三（部署）：把整个目录上传到 GitHub Pages / Vercel / Netlify / 对象存储。

## 目录结构

    大模型推荐平台/
    ├─ index.html                  # 页面骨架：选型 / 模型库 / 算法库 / 提示词 / 关于
    ├─ model/ task/ solution/ prompt/ compare/ # 预渲染内容页（290 个）
    ├─ 404.html / robots.txt / sitemap.xml
    ├─ assets/
    │  ├─ css/style.css            # 深色主题、响应式、打印样式
    │  ├─ css/page.css             # 静态内容页样式
    │  ├─ img/og.png               # 1200×630 分享图
    │  └─ js/
    │     ├─ data/
    │     │  ├─ models.js          # 57 个基础模型：能力分、价格、模式、优缺点
    │     │  ├─ models-extra-*.js  # 68 个扩展模型（国产 39 + 海外 29）
    │     │  ├─ prices.js/.json    # 每日同步生成的官方价（脚本写入）
    │     │  ├─ algorithms.js      # 65 条算法知识
    │     │  ├─ tasks.js           # 10 个领域 / 37 个子任务
    │     │  ├─ prompts-extra.js   # 19 条专题提示词
    │     │  ├─ prompts-pack-1~5.js # 5 个行业包，共 450 条
    │     │  ├─ solutions.js       # 10 套场景组合方案
    │     │  └─ task-hall.js       # 10 个任务大厅卡片
    │     ├─ recent.js             # 最近 5 次方案 + ?h= 分享还原
    │     ├─ ranking.js            # 首页总榜/分榜：能力分 + 用户评分
    │     ├─ rating.js             # 五星评分 + Supabase 写入
    │     ├─ supabase-config.js    # Supabase URL / anon key
    │     ├─ feedback.js           # 反馈弹窗：本地保存/复制/邮件/可选 endpoint
    │     ├─ feedback-config.js    # endpoint / email / github 配置
    │     ├─ track.js              # 匿名 ID 与本地事件
    │     ├─ pk.js                 # PK 对比 + 自带 Key 调用
    │     ├─ prompt-kit.js         # 提示词匹配、解释、按模型改写话术
    │     ├─ file-analyzer.js      # 本地文件解析（ZIP/PDF/图片/文本）
    │     ├─ engine.js             # 拆解 + 打分 + 组合方案（纯函数）
    │     └─ app.js                # 渲染、上传、搜索、模型详情
    ├─ tools/
    │  ├─ build-pages.mjs          # 生成 model/task/solution/prompt 静态页与 sitemap
    │  ├─ sync-prices.mjs          # 抓取官方定价
    │  ├─ sync-prices.ps1          # Windows 包装脚本
    │  └─ install-daily-sync.ps1   # 注册每天 09:00 的计划任务
    ├─ server/
    │  ├─ worker.js                # Cloudflare 网关：Turnstile + 限流 + 白名单
    │  └─ wrangler.toml
    ├─ .github/workflows/sync-prices.yml
    └─ README.md

## 数据覆盖

- **125 个模型 / 27 家厂商**：75 个国产、50 个海外；L1 4 个、L2 39 个、L3 47 个、L4 23 个、L5 12 个。
- **506 条提示词 / 90 个分类**：37 条领域任务 + 19 条专题 + 450 条行业包（职场商业、教育学术、生活健康、技术内容、行业决策）。
- **65 条算法**：从 Transformer、MoE 到 GRPO、RAG、量化、Agent。
- **10 套场景方案 + 10 个任务大厅卡片 + 10 个领域拆解**。

数据是快照：17 个模型有每日同步官方价，其余为 official / ref / est 标注；价格与版本以官网为准。

## 推荐逻辑

1. **领域识别**：问题 + 附件文本前 2600 字一起匹配 10 个领域的关键词。
2. **加附件门槛**：有图片/扫描件 → 只保留支持视觉的模型；附件字数 → 自动抬高上下文要求（上限 200K）。
3. **插入附件步骤**：有附件时，第一步固定为「读取并理解附件」，先让模型复述结构再回答。
4. **加权打分**：模型十维能力 × 子任务权重；「性价比」只在预算紧张时计入，「速度」只在赶时间时加权。
5. **三路取优**：质量取最高分；省钱在同档里取最低成本；速度在同档里取最高速度。
6. **给理由**：每条推荐输出「哪项能力匹配 + 本步大约多少钱 + 有什么坑」。

## 数据说明

- 价格单位：人民币 / 百万 tokens；海外模型按 1 USD ≈ 7.1 CNY 折算，未含渠道与税费。
- 价格标记：`official` 官网可查；`ref` 渠道/折算；`est` 同级推算，仅用于横向比较。
- 能力分 `dims` 是 0–10 的相对分，用于同一问题下排序，不是 benchmark 绝对值。
- Token / 时间估算口径：输出约 `8 + 速度分 × 10` token/s，首字约 `4.2 − 速度分 × 0.32` 秒；深度思考通常再慢 1.5–2 倍，不含排队与网络。

### 新增 / 更新模型

编辑 `assets/js/data/models.js`，一个对象就是一个模型；改完刷新即生效。必需字段：`id/name/vendor/country/tier/priceIn/priceOut/ctx/maxOut/speed/dims/modalities/strengths/weaknesses/bestFor/modes`。

## 已知限制

- 价格与版本变化快：可同步来源会每日更新，未覆盖的来源仍是**快照**，关键决策前以官网为准。
- 图片不做 OCR；扫描件与复杂表格的数字建议人工复核。
- DOCX/PPTX/XLSX 依赖浏览器 `DecompressionStream`（Chrome/Edge 80+），老浏览器会退化为「仅读取元数据」。
- 推荐是规则引擎，不是训练出来的排序模型：可解释、可修改，但不如真实评测精细。
- 「所有大模型」在工程上只能覆盖主流（当前 125 个 / 27 家、506 条提示词），长尾模型与垂直模板可按上面的方法自行添加。

## 路线图

- [ ] 模型并排对比（2–3 个）
- [ ] 图片 OCR（本地 WASM）与表格结构化
- [ ] 用户自带 API Key，把提示词直接发给选定模型
- [ ] 自定义权重与方案本地保存
- [ ] 数据一键导入 / 导出 JSON

## 数据来源

- DeepSeek 官方定价：https://api-docs.deepseek.com/quick_start/pricing
- 火山方舟模型价格：https://ark.volcengine.com/region:cn-beijing/docs/model-pricing
- 智谱 API 定价：https://docs.bigmodel.cn/cn/guide/start/pricing
- Kimi 开放平台定价：https://platform.kimi.com/docs/pricing/chat
- 阿里云百炼模型大全：https://help.aliyun.com/zh/model-studio/models
- 腾讯混元计费：https://cloud.tencent.com/document/product/1729/97731
- AWS Bedrock GPT-5.5：https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-openai-gpt-55.html
- Anthropic Opus 4.6：https://www.anthropic.com/news/claude-opus-4-6

---

免费使用 · 本地计算 · 不收集你的问题。价格与能力以各平台官网为准。
