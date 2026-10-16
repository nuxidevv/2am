export default async function handler(req, res) {
  const { q, region } = req.query;
  const KEY = process.env.YOUTUBE_API_KEY;
  if (!KEY) return res.status(500).json({ error: 'YOUTUBE_API_KEY manquante sur Vercel' });

  let url;
  if (q) {
    url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoCategoryId=10&videoEmbeddable=true&maxResults=25&q=${encodeURIComponent(q)}&key=${KEY}`;
  } else {
    const r = (region || 'FR').toUpperCase().slice(0, 2);
    url = `https://www.googleapis.com/youtube/v3/videos?part=snippet&chart=mostPopular&videoCategoryId=10&regionCode=${r}&maxResults=20&key=${KEY}`;
  }

  try {
    const r = await fetch(url);
    const data = await r.json();
    if (data.error) return res.status(500).json({ error: data.error.message });
    res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=3600');
    res.status(200).json(data);
  } catch (e) {
    res.status(500).json({ error: 'Erreur API' });
  }
}
