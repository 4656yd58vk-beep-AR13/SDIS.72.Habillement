// Vercel Function — Envoi de notifications push
// api/send-notification.js
const webpush = require('web-push');

const VAPID_PUBLIC  = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY;
const VAPID_EMAIL   = process.env.VAPID_EMAIL || 'mailto:admin@csplfb.fr';
const SUPA_URL      = process.env.SUPABASE_URL;
const SUPA_KEY      = process.env.SUPABASE_SERVICE_KEY; // clé service_role

webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC, VAPID_PRIVATE);

module.exports = async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if(req.method === 'OPTIONS') return res.status(200).end();
  if(req.method !== 'POST') return res.status(405).json({error:'Method not allowed'});

  // Vérifier token Supabase (anon key dans le header)
  const auth = req.headers.authorization;
  if(!auth) return res.status(401).json({error:'Unauthorized'});

  const { utilisateur_id, title, body, url, tag } = req.body;
  if(!utilisateur_id || !title) return res.status(400).json({error:'Missing fields'});

  try {
    // Récupérer les subscriptions de l'utilisateur
    const resp = await fetch(`${SUPA_URL}/rest/v1/push_subscriptions?utilisateur_id=eq.${utilisateur_id}`, {
      headers: {
        'apikey': SUPA_KEY,
        'Authorization': `Bearer ${SUPA_KEY}`
      }
    });
    const subs = await resp.json();
    if(!subs.length) return res.status(200).json({sent:0, message:'No subscriptions'});

    const payload = JSON.stringify({ title, body, url: url||'/', tag: tag||'csp-lfb' });
    const results = await Promise.allSettled(
      subs.map(sub => webpush.sendNotification(sub.subscription, payload))
    );

    // Nettoyer les subscriptions expirées (410 Gone)
    const expired = subs.filter((_, i) =>
      results[i].status === 'rejected' &&
      results[i].reason?.statusCode === 410
    );
    if(expired.length){
      await fetch(`${SUPA_URL}/rest/v1/push_subscriptions`, {
        method: 'DELETE',
        headers: {
          'apikey': SUPA_KEY,
          'Authorization': `Bearer ${SUPA_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ id: { in: expired.map(s=>s.id) } })
      });
    }

    const sent = results.filter(r => r.status === 'fulfilled').length;
    return res.status(200).json({ sent, total: subs.length });

  } catch(err) {
    console.error('Push error:', err);
    return res.status(500).json({ error: err.message });
  }
};
