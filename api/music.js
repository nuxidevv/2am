export default async function handler(req, res) {
  // Autoriser les requêtes depuis ton site (CORS)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { action, q, id } = req.query;
  // Point d'accès officiel de l'API Audius
  const AUDIUS_HOST = 'https://api.audius.co';
  const APP_NAME = '2AM_App'; 

  try {
    // --- ACTION 1 : RECHERCHE DE PISTES ---
    if (action === 'search' && q) {
      const searchUrl = `${AUDIUS_HOST}/v1/tracks/search?query=${encodeURIComponent(q)}&app_name=${APP_NAME}`;
      const response = await fetch(searchUrl);
      if (!response.ok) throw new Error(`Erreur Audius: ${response.status}`);
      
      const json = await response.json();
      
      // On formate les résultats pour ton application
      const tracks = (json.data || []).map(t => ({
        id: t.id,
        title: t.title,
        artist: t.user.name,
        thumb: t.artwork ? (t.artwork['480x480'] || t.artwork['150x150']) : '',
        stream_url: `${AUDIUS_HOST}/v1/tracks/${t.id}/stream?app_name=${APP_NAME}`,
        duration: t.duration
      }));
      
      return res.status(200).json({ tracks: tracks }); 
    }

    // --- ACTION 2 : REDIRECTION VERS LE STREAM AUDIO ---
    if (action === 'stream' && id) {
      const streamUrl = `${AUDIUS_HOST}/v1/tracks/${id}/stream?app_name=${APP_NAME}`;
      // On redirige le navigateur vers le fichier audio direct
      return res.redirect(302, streamUrl);
    }

    return res.status(400).json({ error: 'Action non reconnue' });

  } catch (error) {
    console.error('Erreur API Musique:', error);
    res.status(500).json({ error: 'Impossible de récupérer la musique' });
  }
}
