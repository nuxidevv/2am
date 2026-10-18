export default async function handler(req, res) {
  const { q, region, max } = req.query;
  const KEY = process.env.YOUTUBE_API_KEY;
  if (!KEY) return res.status(500).json({ error: 'YOUTUBE_API_KEY manquante sur Vercel' });

  const n = Math.min(Math.max(parseInt(max, 10) || 25, 1), 50);
  let url;
  if (q) {
    url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoCategoryId=10&videoEmbeddable=true&maxResults=${n}&q=${encodeURIComponent(q)}&key=${KEY}`;
  } else {
    const r = (region || 'FR').toUpperCase().slice(0, 2);
    url = `https://www.googleapis.com/youtube/v3/videos?part=snippet&chart=mostPopular&videoCategoryId=10&regionCode=${r}&maxResults=${max ? n : 20}&key=${KEY}`;
  }

  try {
    const r = await fetch(url);
    const data = await r.json();
    if (data.error) return res.status(500).json({ error: data.error.message });
    // Les recherches précises (import Spotify) sont gardées en cache plus longtemps : économise le quota
    res.setHeader('Cache-Control', q && max ? 's-maxage=604800, stale-while-revalidate=86400' : 's-maxage=1800, stale-while-revalidate=3600');
    res.status(200).json(data);
  } catch (e) {
    res.status(500).json({ error: 'Erreur API' });
  }
}
