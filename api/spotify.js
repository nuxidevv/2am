// Importe une playlist / un album Spotify : renvoie { name, cover, tracks:[{title, artist, duration}] }
// Mode 1 (complet, toutes les pistes) : variables SPOTIFY_CLIENT_ID + SPOTIFY_CLIENT_SECRET sur Vercel
// Mode 2 (sans clé, ~100 premières pistes) : lecture de la page publique "embed" de Spotify
export default async function handler(req, res) {
  const raw = String(req.query.url || req.query.id || '');
  const m = raw.match(/(playlist|album)[\/:]([A-Za-z0-9]{10,})/) || (/^[A-Za-z0-9]{10,}$/.test(raw) ? [0, 'playlist', raw] : null);
  if (!m) return res.status(400).json({ error: 'Lien Spotify invalide (playlist ou album)' });
  const type = m[1], id = m[2];

  try {
    let out = null;
    const CID = process.env.SPOTIFY_CLIENT_ID, SEC = process.env.SPOTIFY_CLIENT_SECRET;
    if (CID && SEC) {
      try { out = await viaApi(type, id, CID, SEC); } catch (e) { out = null; }
    }
    if (!out) out = await viaEmbed(type, id);
    if (!out || !out.tracks.length) return res.status(404).json({ error: 'Playlist introuvable ou privée' });
    res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=3600');
    res.status(200).json(out);
  } catch (e) {
    res.status(500).json({ error: 'Impossible de lire la playlist Spotify' });
  }
}

async function viaApi(type, id, CID, SEC) {
  const tk = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Authorization: 'Basic ' + Buffer.from(CID + ':' + SEC).toString('base64') },
    body: 'grant_type=client_credentials'
  }).then(r => r.json());
  if (!tk.access_token) throw new Error('token');
  const H = { Authorization: 'Bearer ' + tk.access_token };
  const meta = await fetch(`https://api.spotify.com/v1/${type}s/${id}`, { headers: H }).then(r => r.json());
  if (meta.error) throw new Error('meta');
  const tracks = [];
  const push = (t, fallbackImg) => { if (t && t.name) tracks.push({ title: t.name, artist: (t.artists || []).map(a => a.name).join(', '), duration: Math.round((t.duration_ms || 0) / 1000) }); };
  let page = meta.tracks;
  for (let i = 0; page && i < 20; i++) {
    (page.items || []).forEach(it => push(type === 'playlist' ? it.track : it));
    if (!page.next) break;
    page = await fetch(page.next, { headers: H }).then(r => r.json());
  }
  return { name: meta.name, cover: (meta.images && meta.images[0] && meta.images[0].url) || '', tracks };
}

async function viaEmbed(type, id) {
  const html = await fetch(`https://open.spotify.com/embed/${type}/${id}`, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36' } }).then(r => r.text());
  const j = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
  if (!j) return null;
  const data = JSON.parse(j[1]);
  const ent = data && data.props && data.props.pageProps && data.props.pageProps.state && data.props.pageProps.state.data && data.props.pageProps.state.data.entity;
  if (!ent) return null;
  const imgs = (ent.coverArt && ent.coverArt.sources) || ent.images || [];
  return {
    name: ent.name || ent.title || 'Playlist Spotify',
    cover: (imgs[0] && imgs[0].url) || '',
    tracks: (ent.trackList || []).map(t => ({ title: t.title, artist: t.subtitle || '', duration: Math.round((t.duration || 0) / 1000) })).filter(t => t.title)
  };
}
