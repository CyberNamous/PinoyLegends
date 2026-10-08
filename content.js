export async function onRequestGet({ env }) {
  const q = s => env.DB.prepare(s).all().then(r => r.results);
  const body = JSON.stringify({
    news: await q('SELECT * FROM news ORDER BY date DESC, id DESC LIMIT 12'),
    heroes: await q('SELECT * FROM heroes ORDER BY sort, id'),
    staff: await q('SELECT * FROM staff ORDER BY sort, id')
  });
  return new Response(body, { headers: { 'content-type': 'application/json', 'cache-control': 'public, max-age=60' } });
}
