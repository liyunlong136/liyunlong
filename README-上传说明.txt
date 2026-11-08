# myaskmate.com 更新包（可信度 + 实时价格核验）

覆盖到网站根目录，或把解压后的所有内容拖到 Netlify Deploys。

本包包含：
- 场景匹配榜（不再叫科学榜单）
- 模型卡/详情/推荐结果显示证据等级 A/B/C
- 评分审计增加证据等级与“当前 0 个公开评测样本”
- 新页面 /methodology/：五层证据链、价格口径、评测样本、榜单边界
- 模型详情增加“发现价格/能力标注错误”入口（预选数据纠错）
- 结果页增加“这个推荐能直接用吗”反馈（Netlify Forms result-feedback）
- 价格实时核验插件 assets/js/price-live.js
- 价格同步改为每小时（GitHub Actions）
- sitemap 292 条，包含 /methodology/

价格插件说明：
- 页面每次打开、进入模型库、打开模型详情都会请求最新 prices.json
- 显示“此刻已核验 / 快照 X 分钟前”
- 快照超过 24 小时会提示厂商可能已改价
- 静态站不能直接跨域抓厂商，快照由同步任务更新，不是厂商 API 实时报价

部署后检查：
1. /methodology/ 200
2. 模型卡有“证据 B/C”
3. 价格区出现“此刻核验”
4. 结果页出现“这个推荐能直接用吗”
5. Netlify Forms 出现 result-feedback
