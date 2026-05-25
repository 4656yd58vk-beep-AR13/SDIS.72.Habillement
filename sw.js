const CACHE_NAME = 'sdis-epi-v1';
const ASSETS = [
  '/',
  '/index.html',
  'https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.0.0/tabler-icons.min.css',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js',
  'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js',
];

// Installation : mettre en cache les assets
self.addEventListener('install', function(e){
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache){
      return cache.addAll(ASSETS.map(url => new Request(url, {mode:'no-cors'})));
    })
  );
  self.skipWaiting();
});

// Activation : nettoyer les anciens caches
self.addEventListener('activate', function(e){
  e.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      );
    })
  );
  self.clients.claim();
});

// Fetch : network first, cache fallback
self.addEventListener('fetch', function(e){
  // Ne pas intercepter les requêtes Supabase (données en temps réel)
  if(e.request.url.includes('supabase.co') || 
     e.request.url.includes('resend.com') ||
     e.request.url.includes('brevo.com')){
    return;
  }

  e.respondWith(
    fetch(e.request)
      .then(function(response){
        // Mettre en cache la réponse fraîche
        var responseClone = response.clone();
        caches.open(CACHE_NAME).then(function(cache){
          if(e.request.method === 'GET'){
            cache.put(e.request, responseClone);
          }
        });
        return response;
      })
      .catch(function(){
        // Hors ligne : utiliser le cache
        return caches.match(e.request).then(function(cached){
          if(cached) return cached;
          // Fallback sur index.html pour la navigation
          if(e.request.mode === 'navigate'){
            return caches.match('/index.html');
          }
        });
      })
  );
});
