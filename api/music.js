export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { action, q, id } = req.query;

  // L'API non officielle de JioSaavn (souvent utilisée par les projets open source)
  const SAavN_API = 'https://jiosaavn-api.vercel.app'; 

  try {
    // --- ACTION 1 : RECHERCHE DE CHANSONS ---
    if (action === 'search' && q) {
      const searchUrl = `${SAavN_API}/search/songs?query=${encodeURIComponent(q)}`;
      const response = await fetch(searchUrl);
      if (!response.ok) throw new Error(`Erreur JioSaavn: ${response.status}`);
      
      const json = await response.json();
      const results = json.data?.results || json.results || [];

      // On formate les résultats pour ton application
      const tracks = results.map(t => {
        // On cherche la meilleure qualité audio disponible (320kbps)
        const downloadUrls = t.downloadUrl || [];
        const bestAudio = downloadUrls.find(d => d.quality === '320kbps') || downloadUrls[downloadUrls.length - 1];
        
        return {
          id: t.id,
          title: t.name,
          artist: t.artists?.primary?.[0]?.name || 'Artiste inconnu',
          thumb: t.image?.[t.image.length - 1]?.url || '', // La plus grande image
          stream_url: bestAudio?.url || '', // L'URL de streaming direct
          duration: t.duration
        };
      }).filter(t => t.stream_url); // On ne garde que ce qui est jouable

      return res.status(200).json({ tracks });
    }

    // --- ACTION 2 : REDIRECTION POUR LE STREAM AUDIO ---
    if (action === 'stream' && id) {
      // JioSaavn fournit déjà une URL directe, on redirige simplement
      const streamUrl = `https://jiosaavn-api.vercel.app/song/stream?id=${id}`;
      return res.redirect(302, streamUrl);
    }

    return res.status(400).json({ error: 'Action non reconnue' });

  } catch (error) {
    console.error('Erreur API Musique:', error);
    res.status(500).json({ error: 'Impossible de récupérer la musique' });
  }
}
