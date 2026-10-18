export default async function handler(req, res) {
  // Autoriser les requêtes depuis ton site (CORS)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { q } = req.query;
  if (!q) return res.status(400).json({ error: 'Paramètre "q" manquant' });

  // Payload standard pour l'API Innertube (client WEB)[reference:3]
  const payload = {
    context: {
      client: {
        clientName: 'WEB',
        clientVersion: '2.20240101.00.00',
        hl: 'fr',
        gl: 'FR'
      }
    },
    query: q
  };

  // Clé API publique utilisée par le site web de YouTube[reference:4]
  const API_KEY = 'AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8';
  const url = `https://www.youtube.com/youtubei/v1/search?key=${API_KEY}&prettyPrint=false`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) throw new Error(`Erreur YouTube: ${response.status}`);

    const data = await response.json();

    // --- Extraction des vidéos depuis la réponse d'Innertube ---
    const videos = [];
    // La structure de réponse est complexe, on navigue dans les "renderers"[reference:5]
    const contents = data?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents || [];
    
    for (const section of contents) {
      const items = section?.itemSectionRenderer?.contents || [];
      for (const item of items) {
        if (item.videoRenderer) {
          const v = item.videoRenderer;
          const title = v.title?.runs?.[0]?.text || '';
          const videoId = v.videoId;
          const channel = v.ownerText?.runs?.[0]?.text || 'Artiste inconnu';
          // On récupère la miniature la plus grande disponible
          const thumb = v.thumbnail?.thumbnails?.slice(-1)[0]?.url || '';
          
          if (videoId && title) {
            videos.push({ id: videoId, title, channel, thumb });
          }
        }
      }
    }

    // On renvoie un format simple et uniforme pour ton application
    res.status(200).json({ videos });

  } catch (error) {
    console.error('Erreur Innertube:', error);
    res.status(500).json({ error: 'Impossible de récupérer les vidéos' });
  }
}
