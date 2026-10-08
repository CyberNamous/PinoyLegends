const J = (d, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
const b64u = s => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
const T = { news: ['title', 'body', 'image'], heroes: ['name', 'role', 'image', 'sort'], staff: ['name', 'role', 'grp', 'badge', 'tone', 'sort'] };

// Checks the Cloudflare Access login token. Returns null if valid, otherwise a short reason. Fails closed.
async function check(req, env) {
  if (!env.ACCESS_TEAM_DOMAIN || !env.ACCESS_AUD) return 'not-configured';
  const t = req.headers.get('Cf-Access-Jwt-Assertion');
  if (!t) return 'no-login-token';
  try {
    const [h, p, s] = t.split('.'), dec = x => JSON.parse(new TextDecoder().decode(b64u(x)));
    const head = dec(h), pay = dec(p);
    if (pay.exp * 1000 < Date.now()) return 'expired';
    if (![].concat(pay.aud).includes(env.ACCESS_AUD)) return 'wrong-aud';
    if (pay.iss !== `https://${env.ACCESS_TEAM_DOMAIN}`) return 'wrong-team-domain';
    const jwks = await (await fetch(`https://${env.ACCESS_TEAM_DOMAIN}/cdn-cgi/access/certs`, { cf: { cacheTtl: 3600 } })).json();
    const jwk = jwks.keys.find(k => k.kid === head.kid);
    if (!jwk) return 'key-not-found';
    const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
    return (await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, b64u(s), new TextEncoder().encode(h + '.' + p))) ? null : 'bad-signature';
  } catch { return 'invalid-token'; }
}

export async function onRequest({ request: req, env, params }) {
  const why = await check(req, env);
  if (why) return J({ error: 'unauthorized', reason: why }, 401);
  if (req.method !== 'GET' && req.headers.get('x-admin') !== '1') return J({ error: 'bad request' }, 400);
  const [seg, id] = params.path || [];

  if (seg === 'me') return J({ ok: true });

  if (seg === 'upload' && req.method === 'POST') {
    const f = (await req.formData()).get('file');
    if (!f || !/^image\/(webp|jpeg|png)$/.test(f.type) || f.size > 5e6) return J({ error: 'Use a JPG, PNG or WebP under 5 MB' }, 400);
    const key = crypto.randomUUID() + '.' + (f.type === 'image/jpeg' ? 'jpg' : f.type.slice(6));
    await env.IMAGES.put(key, await f.arrayBuffer(), { httpMetadata: { contentType: f.type } });
    return J({ url: '/img/' + key });
  }

  if (T[seg]) {
    const f = T[seg], now = new Date().toISOString();
    const clean = b => f.map(k => {
      if (k === 'sort') return +b[k] || 0;
      let v = String(b[k] ?? '').trim().slice(0, k === 'body' ? 4000 : 300);
      if (k === 'image' && v && !v.startsWith('/img/')) v = '';
      return v;
    });
    if (req.method === 'POST') {
      const vals = clean(await req.json()), cols = [...f];
      if (!vals[0]) return J({ error: 'Missing required field' }, 400);
      if (seg === 'news') { cols.push('created_at'); vals.push(now); }
      await env.DB.prepare(`INSERT INTO ${seg} (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`).bind(...vals).run();
      return J({ ok: true });
    }
    if (req.method === 'PUT' && id) {
      const vals = clean(await req.json()), sets = f.map(k => k + '=?');
      if (!vals[0]) return J({ error: 'Missing required field' }, 400);
      if (seg === 'news') { sets.push('updated_at=?'); vals.push(now); }
      await env.DB.prepare(`UPDATE ${seg} SET ${sets.join(',')} WHERE id = ?`).bind(...vals, +id).run();
      return J({ ok: true });
    }
    if (req.method === 'DELETE' && id) {
      await env.DB.prepare(`DELETE FROM ${seg} WHERE id = ?`).bind(+id).run();
      return J({ ok: true });
    }
  }
  return J({ error: 'not found' }, 404);
}
