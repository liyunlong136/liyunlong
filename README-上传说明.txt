# A vs B 对比页：上传说明

这个压缩包包含：
- compare/：50 个对比页 + 对比总览（新增）
- model/：125 个模型页（已把「同级对比」指向对比页）
- assets/css/page.css、assets/img/og.png
- index.html（页脚新增「A vs B 对比」）
- sitemap.xml（291 条 URL）
- tools/build-pages.mjs（生成器，可不传）

## 怎么用
1. 解压后，把里面的 compare/、model/、assets/、index.html、sitemap.xml 覆盖到网站根目录。
2. 确认能打开：
   - https://myaskmate.com/compare/
   - https://myaskmate.com/compare/deepseek-v4-pro-vs-qwen3.8-max.html
3. 去 Google Search Console / 百度搜索资源平台重新提交 sitemap.xml。
4. 对比页是纯静态 HTML，不需要 Node、不需要构建、不需要数据库。

## 只想最小改动
如果不想覆盖 model/，至少上传：
- compare/
- assets/css/page.css
- assets/img/og.png
- index.html
- sitemap.xml
model/ 只是让模型页的「同级对比」直接跳到对比页，不传也能访问对比页。
