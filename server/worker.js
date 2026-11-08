/* Cloudflare Worker：共享 API Key 的最小防线。
   部署：wrangler deploy；需要 KV 绑定 MP_KV，并设置以下 secret：
   UPSTREAM_BASE / UPSTREAM_KEY / TURNSTILE_SECRET / ALLOWED_MODELS（逗号分隔）
   前端只拿 Turnstile token 和匿名 ID，永远不接触上游 Key。 */

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

function json(body, status) {
  return new Response(JSON.stringify(body), {
    status: status || 200,
    headers: Object.assign({ 'content-type': 'application/json; charset=utf-8' }, CORS)
  });
}

async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
}

async function verifyTurnstile(env, token, ip) {
  if (!token) return false;
  const form = new URLSearchParams();
  form.set('secret', env.TURNSTILE_SECRET);
  form.set('response', token);
  if (ip) form.set('remoteip', ip);
  const r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: form });
  const data = await r.json().catch(() => ({}));
  return !!data.success;
}

async function bump(env, key, limit, ttl) {
  const cur = +(await env.MP_KV.get(key)) || 0;
  if (cur >= limit) return false;
  await env.MP_KV.put(key, String(cur + 1), { expirationTtl: ttl || 90000 });
  return true;
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });
    if (request.method !== 'POST') return json({ error: 'method not allowed' }, 405);

    const url = new URL(request.url);

    if (url.pathname === '/api/feedback') {
      const len = +(request.headers.get('content-length') || 0);
      if (len > 20000) return json({ error: 'body too large' }, 413);

      let body;
      try { body = await request.json(); } catch (e) { return json({ error: 'invalid json' }, 400); }
      if (body.website) return json({ ok: true }, 201);
      const text = String(body.text || '').trim();
      if (text.length < 5) return json({ error: 'text too short' }, 400);
      if (text.length > 2000) return json({ error: 'text too long' }, 413);
      if (!env.DB) return json({ error: 'feedback database not configured' }, 503);

      const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
      const day = new Date().toISOString().slice(0, 10);
      const ipHash = await sha256(ip + '|fb|' + day);
      if (!(await bump(env, 'fb:ip:' + day + ':' + ipHash, 10, 86400))) {
        return json({ error: 'daily feedback limit reached' }, 429);
      }

      await env.DB.prepare(
        'INSERT INTO feedback (type, rating, text, contact, page, model, ua, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, datetime(\'now\'))'
      ).bind(
        String(body.type || '').slice(0, 40),
        Math.max(0, Math.min(5, +(body.rating || 0))),
        text,
        String(body.contact || '').slice(0, 120),
        String(body.page || '').slice(0, 160),
        String(body.model || '').slice(0, 120),
        String(request.headers.get('User-Agent') || '').slice(0, 300)
      ).run();

      return json({ ok: true }, 201);
    }

    if (url.pathname !== '/v1/chat') return json({ error: 'not found' }, 404);

    const len = +(request.headers.get('content-length') || 0);
    if (len > 20000) return json({ error: 'body too large' }, 413);

    let body;
    try { body = await request.json(); } catch (e) { return json({ error: 'invalid json' }, 400); }

    const ip = request.headers.get('CF-Connecting-IP') || '';
    const anon = String(body.anonId || '').slice(0, 64) || 'anon';
    const okHuman = await verifyTurnstile(env, body.turnstileToken, ip);
    if (!okHuman) return json({ error: 'turnstile failed' }, 403);

    const day = new Date().toISOString().slice(0, 10);
    const ipHash = await sha256(ip + '|' + day);
    if (!(await bump(env, 'rl:ip:' + day + ':' + ipHash, 20))) return json({ error: 'IP daily limit reached' }, 429);
    if (!(await bump(env, 'rl:anon:' + day + ':' + anon, 5))) return json({ error: 'anonymous daily limit reached' }, 429);

    const allowed = String(env.ALLOWED_MODELS || '').split(',').map(s => s.trim()).filter(Boolean);
    const model = String(body.model || '');
    if (!allowed.includes(model)) return json({ error: 'model not allowed on free tier' }, 403);

    const messages = Array.isArray(body.messages) ? body.messages.slice(0, 6) : [];
    const totalChars = messages.reduce((a, m) => a + String(m.content || '').length, 0);
    if (totalChars > 4000) return json({ error: 'input too long (max 4000 chars)' }, 413);

    const maxTokens = Math.min(500, Math.max(64, +body.max_tokens || 500));
    const upstream = await fetch(String(env.UPSTREAM_BASE).replace(/\/$/, '') + '/chat/completions', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: 'Bearer ' + env.UPSTREAM_KEY },
      body: JSON.stringify({ model, messages, max_tokens: maxTokens, temperature: 0.6 })
    });

    if (!upstream.ok) {
      const text = await upstream.text();
      return json({ error: 'upstream error', status: upstream.status, detail: text.slice(0, 200) }, 502);
    }
    const data = await upstream.json();
    // 匿名日志：只记模型、耗时、token 数，不记内容
    try {
      const key = 'evt:' + Date.now() + ':' + anon;
      await env.MP_KV.put(key, JSON.stringify({
        model, day, inTok: data.usage && data.usage.prompt_tokens, outTok: data.usage && data.usage.completion_tokens
      }), { expirationTtl: 2592000 });
    } catch (e) { }
    return json(data);
  }
};
