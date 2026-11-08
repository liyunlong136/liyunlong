import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ctx = {};
ctx.window = ctx;
ctx.globalThis = ctx;
vm.createContext(ctx);
[
  'assets/js/data/models.js',
  'assets/js/data/models-extra-cn.js',
  'assets/js/data/models-extra-global.js',
  'assets/js/data/models-extra-2.js',
  'assets/js/engine.js'
].forEach(f => {
  vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f });
});

const E = ctx.MPEngine;
const MODELS = (ctx.MP_MODELS || []).concat(ctx.MP_MODELS_EXTRA || []);

function state() {
  return {
    id: 'test', title: '测试', goal: '写一份周报',
    dims: { reasoning: 3, coding: 2, writing: 4, chinese: 3, longctx: 2, vision: 0, agent: 0, math: 0 },
    need: { ctx: 8000 }, mode: [], advice: ''
  };
}
function opts(extra) {
  return Object.assign({ budget: 'mid', time: 'normal', tokens: 'normal', lang: 'zh', region: 'cn' }, extra || {});
}

test('硬约束：必须私有化时只返回开源模型', () => {
  const recs = E.recommend(state(), opts({ local: true }), 20);
  assert.ok(recs.length > 0);
  recs.forEach(r => assert.equal(r.model.open, true, r.model.id + ' 不是开源模型'));
});

test('硬约束：必须看图时只返回支持图片的模型', () => {
  const recs = E.recommend(state(), opts({ requireVision: true }), 20);
  assert.ok(recs.length > 0);
  recs.forEach(r => assert.ok((r.model.modalities || []).includes('image'), r.model.id));
});

test('零预算：保留免费 API 和自托管，排除有 API 费用的模型', () => {
  const recs = E.recommend(state(), opts({ budget: 'free' }), 20);
  assert.ok(recs.length > 1);
  assert.ok(recs.some(r => r.model.open), '应包含自托管开源模型');
  recs.forEach(r => assert.equal(E.blend(r.model) > 0, false, r.model.id + ' 有 API 费用'));
});

test('硬约束不满足时不自动放宽', () => {
  const recs = E.recommend(state(), opts({
    local: true, requireVision: true, requireAudio: true, requireVideo: true,
    requireCtx: 200000, budget: 'free'
  }), 20);
  assert.equal(recs.length, 0);
  assert.ok(Object.keys(recs.conflicts || {}).length > 0);
  assert.equal(recs.relaxed, false);
});

test('显式放宽后才返回结果', () => {
  const recs = E.recommend(state(), opts({
    local: true, requireVision: true, requireAudio: true, requireVideo: true,
    requireCtx: 200000, budget: 'free'
  }), 20, true);
  assert.ok(recs.length > 0);
  assert.equal(recs.relaxed, true);
});

test('长文档超过 60K 估算上限时标记 overCap', () => {
  const recs = E.recommend(state(), opts({ requireCtx: 200000 }), 5);
  assert.ok(recs.length > 0);
  assert.equal(recs[0].overCap, true);
  assert.equal(recs[0].inTok, 60000);
  assert.equal(recs[0].rawInTok, 200000);
});

test('推荐分数在 0-100 且不重复模型', () => {
  const recs = E.recommend(state(), opts(), 20);
  const ids = new Set();
  recs.forEach(r => {
    assert.ok(r.score >= 0 && r.score <= 100, 'score out of range: ' + r.score);
    assert.equal(ids.has(r.model.id), false, 'duplicate ' + r.model.id);
    ids.add(r.model.id);
  });
});
