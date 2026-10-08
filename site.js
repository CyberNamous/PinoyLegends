(async () => {
  let d;
  try { d = await (await fetch('/api/content')).json(); } catch { return; }
  const el = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; };
  const img = (src, alt) => { const i = el('img'); i.src = src; i.alt = alt; i.loading = 'lazy'; return i; };
  const when = s => s ? new Date(s).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '';
  const fill = (id, items, make) => { const box = document.getElementById(id); if (box && items && items.length) box.replaceChildren(...items.map(make)); };

  fill('heroes-grid', d.heroes, h => {
    const a = el('article', 'hero-card');
    a.append(h.image ? img(h.image, h.name) : el('div', 'ph'), el('h3', 0, h.name), el('p', 0, h.role));
    return a;
  });
  fill('news-grid', d.news, n => {
    const a = el('article', 'news-card'), b = el('div', 'news-body');
    if (n.image) a.append(img(n.image, ''));
    else { const p = el('div', 'ph'); p.dataset.label = 'News'; a.append(p); }
    const tm = el('time', 0, when(n.created_at) || n.date || '');
    if (n.created_at) tm.dateTime = n.created_at;
    b.append(tm, el('h3', 0, n.title), el('p', 0, n.body));
    if (n.updated_at) b.append(el('small', 'edited', 'Edited ' + when(n.updated_at)));
    a.append(b);
    return a;
  });
  const initials = n => { const w = n.trim().split(/\s+/); return (w.length > 1 ? w.map(x => x[0]).join('') : n.slice(0, 2)).slice(0, 2).toUpperCase(); };
  const card = s => {
    const a = el('article', 'panel staff-card'), av = el('div', 'staff-avatar', initials(s.name));
    av.setAttribute('aria-hidden', 'true');
    a.append(av, el('h3', 0, s.name), el('p', 'role', s.role), el('span', 'badge badge--' + (s.tone === 'blue' ? 'blue' : 'gold'), s.badge));
    return a;
  };
  fill('leadership-grid', (d.staff || []).filter(s => s.grp === 'Leadership'), card);
  fill('moderators-grid', (d.staff || []).filter(s => s.grp === 'Moderators'), card);
})();
