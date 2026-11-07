/* 本地文件解析：图片 / PDF / Word / PPT / Excel / 代码 / 文本。
   全部在浏览器内完成，不上传任何内容。只做「读懂概况」，不做 OCR。 */
(function () {
  var MAX_TEXT = 200000; // 单文件最多保留 20 万字符用于分析

  function ext(name) {
    var m = /\.([a-z0-9]+)$/i.exec(name || '');
    return m ? m[1].toLowerCase() : '';
  }
  function fmtSize(n) {
    if (n < 1024) return n + ' B';
    if (n < 1048576) return (n / 1024).toFixed(1) + ' KB';
    return (n / 1048576).toFixed(1) + ' MB';
  }
  function decodeEntities(s) {
    return s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"').replace(/&apos;/g, "'")
      .replace(/&#x([0-9a-f]+);/gi, function (_, h) { return String.fromCodePoint(parseInt(h, 16)); })
      .replace(/&#(\d+);/g, function (_, d) { return String.fromCodePoint(+d); });
  }
  function xmlText(xml) {
    xml = xml.replace(/<w:tab[^>]*\/>/g, '\t').replace(/<w:br[^>]*\/>/g, '\n')
      .replace(/<\/w:p>/g, '\n').replace(/<\/a:p>/g, '\n').replace(/<a:br[^>]*\/>/g, '\n')
      .replace(/<\/row>/g, '\n').replace(/<\/c>/g, '\t');
    var t = xml.replace(/<[^>]+>/g, '');
    return decodeEntities(t).replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  }

  /* ---------- ZIP（docx/pptx/xlsx 都是 zip） ---------- */
  async function unzip(buffer) {
    var u8 = new Uint8Array(buffer), view = new DataView(buffer);
    var eocd = -1;
    for (var i = u8.length - 22; i >= Math.max(0, u8.length - 66000); i--) {
      if (view.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
    }
    if (eocd < 0) throw new Error('不是有效的 zip 容器');
    var count = view.getUint16(eocd + 10, true);
    var off = view.getUint32(eocd + 16, true);
    var entries = {};
    for (var n = 0; n < count; n++) {
      if (off + 46 > u8.length || view.getUint32(off, true) !== 0x02014b50) break;
      var method = view.getUint16(off + 10, true);
      var compSize = view.getUint32(off + 20, true);
      var nameLen = view.getUint16(off + 28, true);
      var extraLen = view.getUint16(off + 30, true);
      var cmtLen = view.getUint16(off + 32, true);
      var lho = view.getUint32(off + 42, true);
      var name = new TextDecoder().decode(u8.subarray(off + 46, off + 46 + nameLen));
      if (lho + 30 <= u8.length) {
        var ln = view.getUint16(lho + 26, true);
        var le = view.getUint16(lho + 28, true);
        var start = lho + 30 + ln + le;
        entries[name] = { method: method, data: u8.subarray(start, start + compSize) };
      }
      off += 46 + nameLen + extraLen + cmtLen;
    }
    return entries;
  }
  async function entryText(e) {
    if (!e) return '';
    if (e.method === 0) return new TextDecoder().decode(e.data);
    if (typeof DecompressionStream === 'undefined') throw new Error('浏览器不支持解压');
    var stream = new Blob([e.data]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
    return await new Response(stream).text();
  }

  async function readDocx(buf) {
    var z = await unzip(buf);
    var main = await entryText(z['word/document.xml']);
    var text = xmlText(main || '');
    var pages = (main.match(/<w:br[^>]*w:type="page"/g) || []).length + 1;
    return { text: text, pages: pages };
  }
  async function readPptx(buf) {
    var z = await unzip(buf);
    var names = Object.keys(z).filter(function (k) { return /^ppt\/slides\/slide\d+\.xml$/.test(k); });
    names.sort(function (a, b) { return (+a.match(/(\d+)/)[1]) - (+b.match(/(\d+)/)[1]); });
    var out = [];
    for (var i = 0; i < names.length; i++) {
      var x = xmlText(await entryText(z[names[i]]));
      if (x) out.push('【第 ' + (i + 1) + ' 页】\n' + x);
    }
    return { text: out.join('\n\n'), pages: names.length };
  }
  async function readXlsx(buf) {
    var z = await unzip(buf);
    var shared = [];
    if (z['xl/sharedStrings.xml']) {
      var sx = await entryText(z['xl/sharedStrings.xml']);
      (sx.match(/<si>[\s\S]*?<\/si>/g) || []).forEach(function (si) {
        shared.push(decodeEntities((si.replace(/<[^>]+>/g, ''))));
      });
    }
    var sheetName = Object.keys(z).filter(function (k) { return /^xl\/worksheets\/sheet\d+\.xml$/.test(k); }).sort()[0];
    var text = '';
    if (sheetName) {
      var sh = await entryText(z[sheetName]);
      var rows = sh.match(/<row[\s\S]*?<\/row>/g) || [];
      var lines = [];
      rows.slice(0, 200).forEach(function (r) {
        var cells = r.match(/<c[^>]*>[\s\S]*?<\/c>/g) || [];
        var vals = cells.map(function (c) {
          var v = /<v>([\s\S]*?)<\/v>/.exec(c);
          if (!v) return '';
          var t = /\st="([^"]+)"/.exec(c);
          if (t && t[1] === 's') return shared[+v[1]] || '';
          return decodeEntities(v[1]);
        });
        if (vals.join('').trim()) lines.push(vals.join('\t'));
      });
      text = lines.join('\n');
    }
    return { text: text, pages: 1, sheets: Object.keys(z).filter(function (k) { return /^xl\/worksheets\/sheet\d+\.xml$/.test(k); }).length };
  }

  /* ---------- PDF ---------- */
  async function inflate(u8, raw) {
    if (typeof DecompressionStream === 'undefined') return '';
    try {
      var ds = new DecompressionStream(raw ? 'deflate-raw' : 'deflate');
      var s = new Blob([u8]).stream().pipeThrough(ds);
      return await new Response(s).text();
    } catch (e) { return ''; }
  }
  function pdfUnescape(s) {
    return s.replace(/\\([nrtbf()\\])/g, function (_, c) {
      return { n: '\n', r: '\r', t: '\t', b: '\b', f: '\f', '(': '(', ')': ')', '\\': '\\' }[c];
    }).replace(/\\([0-7]{1,3})/g, function (_, o) { return String.fromCharCode(parseInt(o, 8)); });
  }
  function pdfStrings(chunk) {
    var out = [], m;
    var reTj = /\(((?:\\.|[^\\()])*)\)\s*Tj/g;
    while ((m = reTj.exec(chunk))) out.push(pdfUnescape(m[1]));
    var reTJ = /\[((?:[^\[\]]|\\.)*)\]\s*TJ/g;
    while ((m = reTJ.exec(chunk))) {
      var parts = m[1].match(/\(((?:\\.|[^\\()])*)\)/g) || [];
      out.push(parts.map(function (p) { return pdfUnescape(p.slice(1, -1)); }).join(''));
    }
    return out.join(' ');
  }
  async function readPdf(buf) {
    var u8 = new Uint8Array(buf);
    var latin = new TextDecoder('latin1').decode(u8);
    var pages = (latin.match(/\/Type\s*\/Page[^s]/g) || []).length;
    var texts = [], budget = 120, scanned = 0;
    var re = /stream\r?\n/g, m;
    while ((m = re.exec(latin)) && budget-- > 0) {
      var start = m.index + m[0].length;
      var end = latin.indexOf('endstream', start);
      if (end < 0 || end - start > 4000000) continue;
      var head = latin.slice(Math.max(0, m.index - 300), m.index);
      if (!/\/FlateDecode/.test(head)) continue;
      var chunk = u8.subarray(start, end);
      var out = await inflate(chunk, false);
      if (!out) out = await inflate(chunk, true);
      if (out) { var t = pdfStrings(out); if (t) texts.push(t); }
      scanned++;
    }
    var text = texts.join('\n').replace(/[ \t]{2,}/g, ' ').trim();
    var cjk = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
    var ascii = (text.match(/[A-Za-z]{3,}/g) || []).length;
    var needsVision = pages > 0 && cjk < 20 && ascii < 30;
    if (text.length > MAX_TEXT) text = text.slice(0, MAX_TEXT);
    return { text: text, pages: pages || 1, needsVision: needsVision, scanned: scanned, cjk: cjk };
  }

  /* ---------- 图片 ---------- */
  function analyzeImage(file) {
    return new Promise(function (resolve) {
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () {
        try {
          var c = document.createElement('canvas');
          c.width = 64; c.height = 64;
          var ctx = c.getContext('2d', { willReadFrequently: true });
          ctx.drawImage(img, 0, 0, 64, 64);
          var d = ctx.getImageData(0, 0, 64, 64).data;
          var sum = 0, sum2 = 0, white = 0, edge = 0, n = 64 * 64;
          var lum = new Array(n);
          for (var i = 0; i < n; i++) {
            var r = d[i * 4], g = d[i * 4 + 1], b = d[i * 4 + 2];
            var l = 0.299 * r + 0.587 * g + 0.114 * b;
            lum[i] = l; sum += l; sum2 += l * l;
            if (l > 238) white++;
          }
          for (var y = 0; y < 64; y++) for (var x = 0; x < 63; x++) edge += Math.abs(lum[y * 64 + x] - lum[y * 64 + x + 1]);
          var mean = sum / n, sd = Math.sqrt(Math.max(0, sum2 / n - mean * mean));
          var kind = '图片';
          if (white / n > 0.68 && sd < 42) kind = '浅色文档/截图（可能含文字或表格）';
          else if (mean < 70 && sd < 45) kind = '深色界面截图';
          else if (sd > 55) kind = '照片/复杂图像';
          else kind = '图表/混合图像';
          var tokens = Math.min(4000, Math.round(img.width * img.height / 750));
          resolve({ w: img.width, h: img.height, mean: Math.round(mean), sd: Math.round(sd), kind: kind, tokens: tokens, pages: 1 });
        } catch (e) {
          resolve({ w: img.width, h: img.height, kind: '图片', pages: 1, tokens: 800 });
        } finally { URL.revokeObjectURL(url); }
      };
      img.onerror = function () { URL.revokeObjectURL(url); resolve({ kind: '图片（无法读取元数据）', pages: 1, tokens: 800 }); };
      img.src = url;
    });
  }

  /* ---------- 类型判断 ---------- */
  var CODE = ['py', 'js', 'ts', 'jsx', 'tsx', 'java', 'c', 'cpp', 'h', 'hpp', 'go', 'rs', 'rb', 'php', 'cs', 'kt', 'swift', 'sql', 'sh', 'ps1', 'vue', 'html', 'css', 'scss', 'yaml', 'yml', 'toml', 'ini'];
  function guessKind(name, text) {
    var e = ext(name);
    if (e === 'docx') return (/摘要|Abstract|参考文献|引言|实验报告|开题报告/.test(text)) ? '论文/研究报告' : 'Word 文档';
    if (e === 'pptx') return '演示文稿';
    if (e === 'xlsx') return '表格数据';
    if (e === 'pdf') return 'PDF 文档';
    if (CODE.indexOf(e) >= 0) return '代码文件';
    if (e === 'csv') return '表格数据（CSV）';
    if (e === 'json') return '结构化数据（JSON）';
    if (e === 'md') return 'Markdown 文档';
    if (/Traceback \(most recent call last\)|Exception in thread|^\s*at .+\(.+:\d+\)/m.test(text)) return '报错日志';
    if (/摘要|Abstract|参考文献|References|引言|实验报告|开题报告/.test(text)) return '论文/研究报告';
    if (/甲方[\s\S]{0,300}乙方|合同书|劳动合同|服务协议|保密协议|本协议|条款/.test(text)) return '合同/协议';
    if (/工作经历|教育背景|求职意向|简历/.test(text)) return '简历';
    if (/<!doctype html>|<html[\s>]/i.test(text)) return '网页源码';
    if ((text.match(/,/g) || []).length > 20 && (text.match(/\n/g) || []).length > 5) return '表格/CSV 文本';
    if (/^[\{\[]/.test(text.trim())) return '结构化数据';
    return '文本资料';
  }

  function countCJK(t) { return (t.match(/[\u4e00-\u9fa5]/g) || []).length; }

  async function analyze(file) {
    var e = ext(file.name);
    var base = { id: 'f' + Math.random().toString(36).slice(2, 9), name: file.name, ext: e, size: file.size, sizeText: fmtSize(file.size) };
    try {
      if (['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'avif'].indexOf(e) >= 0) {
        var im = await analyzeImage(file);
        return Object.assign(base, {
          kind: '图片', typeLabel: im.kind, chars: 0, pages: 1, visionTokens: im.tokens,
          needsVision: true, status: 'ok', w: im.w, h: im.h,
          brief: '图片 ' + im.w + '×' + im.h + '，' + im.kind + '；约 ' + im.tokens + ' 视觉 token',
          detail: '本地只读取了尺寸与色调，未做 OCR。模型需要开视觉模式才能看图。'
        });
      }
      if (e === 'pdf') {
        var pdf = await readPdf(await file.arrayBuffer());
        return Object.assign(base, {
          kind: 'PDF', typeLabel: pdf.needsVision ? '扫描版 PDF / 字体编码不可读' : '可提取文字的 PDF',
          chars: pdf.text.length, pages: pdf.pages, needsVision: pdf.needsVision,
          status: pdf.text.length ? 'ok' : 'meta',
          text: pdf.text, brief: 'PDF ' + pdf.pages + ' 页' + (pdf.text.length ? '，已提取约 ' + pdf.text.length + ' 字' : '，未提取到可读文字'),
          detail: pdf.needsVision ? '可能是扫描件或使用了不可提取的字体，推荐时会按「需要视觉」处理。' : '已提取文字用于判断主题；原文仍以你上传的文件为准。'
        });
      }
      if (e === 'docx' || e === 'pptx' || e === 'xlsx') {
        var buf = await file.arrayBuffer();
        var r = e === 'docx' ? await readDocx(buf) : (e === 'pptx' ? await readPptx(buf) : await readXlsx(buf));
        var text = (r.text || '').slice(0, MAX_TEXT);
        return Object.assign(base, {
          kind: e.toUpperCase(), typeLabel: guessKind(file.name, text), chars: text.length, pages: r.pages || 1,
          needsVision: false, status: text.length ? 'ok' : 'meta', text: text,
          brief: e.toUpperCase() + ' ' + (r.pages || 1) + ' 页，已提取约 ' + text.length + ' 字',
          detail: text.length ? '已解析出文字，用于判断主题与篇幅。' : '这个文件没有可提取的文字（可能全是图片），需要视觉模型。'
        });
      }
      // 文本类
      var t = await file.text();
      if (t.length > MAX_TEXT) t = t.slice(0, MAX_TEXT);
      return Object.assign(base, {
        kind: e ? e.toUpperCase() : '文本', typeLabel: guessKind(file.name, t), chars: t.length, pages: 1,
        needsVision: false, status: 'ok', text: t,
        brief: (e ? e.toUpperCase() : '文本') + '，约 ' + t.length + ' 字，' + guessKind(file.name, t),
        detail: '已读取全文用于判断主题；正文仍以你上传的文件为准。'
      });
    } catch (err) {
      return Object.assign(base, {
        kind: e ? e.toUpperCase() : '文件', typeLabel: '仅读取到元数据', chars: 0, pages: 0,
        needsVision: ['png', 'jpg', 'jpeg', 'webp', 'pdf'].indexOf(e) >= 0,
        status: 'error', brief: (e ? e.toUpperCase() : '文件') + ' · ' + base.sizeText + ' · 解析失败',
        detail: '浏览器未能解析该文件（' + (err.message || '格式不支持') + '）。推荐时只按文件类型与大小估算。'
      });
    }
  }

  function suggestProblem(files) {
    if (!files.length) return '';
    var names = files.map(function (f) { return '《' + f.name + '》'; }).join('、');
    var kinds = files.map(function (f) { return f.typeLabel || f.kind; }).join('；');
    var focus = '找出其中最关键的问题或机会，并给出可执行的下一步建议';
    if (/合同|协议/.test(kinds)) focus = '重点检查违约责任、付款与交付、解除条件、争议解决和保密/竞业条款，标出对我方不利或模糊的地方';
    else if (/论文|研究|报告/.test(kinds)) focus = '提炼研究问题、方法、主要结论与局限，指出证据不足或前后矛盾的地方';
    else if (/报错|代码/.test(kinds)) focus = '定位根因，给出最小复现步骤、修复补丁和回归测试点';
    else if (/表格|数据|CSV/.test(kinds)) focus = '先检查缺失值、异常值和统计口径，再给出可验证的结论';
    else if (/图片|截图|文档/.test(kinds)) focus = '先描述你在图片里看到的内容，再指出异常、风险或可改进之处';
    else if (/简历/.test(kinds)) focus = '按目标岗位评估匹配度，指出最该改的 3 处并给出改写示例';
    return '请分析我上传的' + names + '（' + kinds + '）。' + focus + '。请先说明你实际读到了什么，读不到就直说，不要编造。';
  }

  function summaryText(files) {
    if (!files.length) return '';
    return files.map(function (f) {
      return f.name + '（' + f.brief + (f.needsVision ? '，需视觉' : '') + '）';
    }).join('；');
  }

  window.MPFile = { analyze: analyze, suggestProblem: suggestProblem, summaryText: summaryText, fmtSize: fmtSize };
})();
