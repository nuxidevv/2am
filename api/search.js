export default async function handler(req, res) {
  const { q } = req.query;
  if (!q) return res.status(400).json({ error: 'Query manquante' });

  const KEY = process.env.YOUTUBE_API_KEY; // ← stockée dans Vercel, jamais dans le code
  const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoEmbeddable=true&maxResults=20&q=${encodeURIComponent(q + ' audio')}&key=${KEY}`;

  try {
    const r = await fetch(url);
    const data = await r.json();
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
    res.status(200).json(data);
  } catch (e) {
    res.status(500).json({ error: 'Erreur API' });
  }
}
