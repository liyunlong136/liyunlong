# myaskmate.com 线上更新包（2026-11-08）

当前线上仍是旧版。把本包内容覆盖到网站根目录（或拖到 Netlify Deploys）。

包含：
- 首页首屏输入框/生成按钮
- 关于页新文案：一个带「科学榜单」的选型工具……
- 隐私：本地 vs PK 云端调用，PK 首次确认
- 硬约束严格模式，不自动放宽
- 反馈：邮箱 + GitHub issue
- 无公共评分/口碑榜，评分仅本机
- 价格来源、更新时间、官方/折算/推算标签
- robots.txt + sitemap.xml（291 条）
- model/task/solution/prompt/compare 静态页

上传后检查：
- https://myaskmate.com/sitemap.xml 200
- https://myaskmate.com/robots.txt 200
- https://myaskmate.com/model/deepseek-v4-pro.html 200
- 首页首屏出现「描述你真正要解决的问题」
- 关于页出现「科学榜单」
