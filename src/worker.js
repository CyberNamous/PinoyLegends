const J = (d, s = 200, h = {}) => new Response(JSON.stringify(d), { status: s, headers: { 'content-type': 'application/json', 'cache-control': 'no-store', ...h } });
const b64u = s => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
const T = { news: ['title', 'body', 'image', 'date'], heroes: ['name', 'role', 'image', 'sort'], staff: ['name', 'role', 'grp', 'badge', 'tone', 'sort'] };

// Verifies the Cloudflare Access login token. Fails closed if not configured.
async function isAdmin(req, env) {
  const t = req.headers.get('Cf-Access-Jwt-Assertion');
  if (!t || !env.ACCESS_TEAM_DOMAIN || !env.ACCESS_AUD) return false;
  try {
    const [h, p, s] = t.split('.'), dec = x => JSON.parse(new TextDecoder().decode(b64u(x)));
    const head = dec(h), pay = dec(p);
    if (pay.exp * 1000 < Date.now() || ![].concat(pay.aud).includes(env.ACCESS_AUD) || pay.iss !== `https://${env.ACCESS_TEAM_DOMAIN}`) return false;
    const jwks = await (await fetch(`https://${env.ACCESS_TEAM_DOMAIN}/cdn-cgi/access/certs`, { cf: { cacheTtl: 3600 } })).json();
    const jwk = jwks.keys.find(k => k.kid === head.kid);
    if (!jwk) return false;
    const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
    return await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, b64u(s), new TextEncoder().encode(h + '.' + p));
  } catch { return false; }
}

export default {
  async fetch(req, env) {
    const p = new URL(req.url).pathname;

    if (p === '/api/content') {
      const q = s => env.DB.prepare(s).all().then(r => r.results);
      return J({
        news: await q('SELECT * FROM news ORDER BY date DESC, id DESC LIMIT 12'),
        heroes: await q('SELECT * FROM heroes ORDER BY sort, id'),
        staff: await q('SELECT * FROM staff ORDER BY sort, id')
      }, 200, { 'cache-control': 'public, max-age=60' });
    }

    if (p.startsWith('/img/')) {
      const key = p.slice(5);
      if (!/^[\w-]+\.(webp|jpe?g|png)$/.test(key)) return new Response('Not found', { status: 404 });
      const o = await env.IMAGES.get(key);
      if (!o) return new Response('Not found', { status: 404 });
      return new Response(o.body, { headers: { 'content-type': o.httpMetadata?.contentType || 'image/webp', 'cache-control': 'public, max-age=31536000, immutable' } });
    }

    if (p.startsWith('/api/admin/')) {
      if (!(await isAdmin(req, env))) return J({ error: 'unauthorized' }, 401);
      if (req.method !== 'GET' && req.headers.get('x-admin') !== '1') return J({ error: 'bad request' }, 400);
      const [, , , seg, id] = p.split('/');

      if (seg === 'me') return J({ ok: true });

      if (seg === 'upload' && req.method === 'POST') {
        const f = (await req.formData()).get('file');
        if (!f || !/^image\/(webp|jpeg|png)$/.test(f.type) || f.size > 5e6) return J({ error: 'Use a JPG, PNG or WebP under 5 MB' }, 400);
        const key = crypto.randomUUID() + '.' + (f.type === 'image/jpeg' ? 'jpg' : f.type.slice(6));
        await env.IMAGES.put(key, await f.arrayBuffer(), { httpMetadata: { contentType: f.type } });
        return J({ url: '/img/' + key });
      }

      if (T[seg]) {
        if (req.method === 'POST') {
          const b = await req.json(), f = T[seg];
          const vals = f.map(k => {
            if (k === 'sort') return +b[k] || 0;
            let v = String(b[k] ?? '').trim().slice(0, k === 'body' ? 4000 : 300);
            if (k === 'image' && v && !v.startsWith('/img/')) v = '';
            return v;
          });
          if (!vals[0]) return J({ error: 'Missing required field' }, 400);
          await env.DB.prepare(`INSERT INTO ${seg} (${f.join(',')}) VALUES (${f.map(() => '?').join(',')})`).bind(...vals).run();
          return J({ ok: true });
        }
        if (req.method === 'DELETE' && id) {
          await env.DB.prepare(`DELETE FROM ${seg} WHERE id = ?`).bind(+id).run();
          return J({ ok: true });
        }
      }
      return J({ error: 'not found' }, 404);
    }

    return env.ASSETS.fetch(req);
  }
};
