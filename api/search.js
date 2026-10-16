export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const { q } = req.query;
  if (!q) return res.status(400).json({ error: 'Query manquante' });

  const KEY = process.env.YOUTUBE_API_KEY;
  if (!KEY) return res.status(500).json({ error: 'YOUTUBE_API_KEY manquante sur Vercel' });

  const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoEmbeddable=true&maxResults=25&q=${encodeURIComponent(q)}&key=${KEY}`;

  try {
    const r = await fetch(url);
    const data = await r.json();
    if (data.error) return res.status(500).json({ error: data.error.message });
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
    res.status(200).json(data);
  } catch (e) {
    res.status(500).json({ error: 'Erreur API' });
  }
}
