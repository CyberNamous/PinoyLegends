export async function onRequestGet({ env, params }) {
  const key = params.key;
  if (!/^[\w-]+\.(webp|jpe?g|png)$/.test(key)) return new Response('Not found', { status: 404 });
  const o = await env.IMAGES.get(key);
  if (!o) return new Response('Not found', { status: 404 });
  return new Response(o.body, { headers: { 'content-type': o.httpMetadata?.contentType || 'image/webp', 'cache-control': 'public, max-age=31536000, immutable' } });
}
