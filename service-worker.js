const CACHE_NAME = 'tap-game-v1';
const urlsToCache = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './icons/icon-192x192.png',
  './icons/icon-512x512.png'
  // キャッシュしたいアセットをすべて追加
];

// Service Workerのインストール時の処理
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('キャッシュを開きました');
        return cache.addAll(urlsToCache);
      })
  );
});

// ネットワークリクエスト時の処理
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // キャッシュがあればそれを返す
        if (response) {
          return response;
        }
        
        // リクエストのコピーを作成
        const fetchRequest = event.request.clone();
        
        // ネットワークにフェッチ
        return fetch(fetchRequest)
          .then(response => {
            // 有効なレスポンスでなければ、そのまま返す
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            // レスポンスのコピーを作成
            const responseToCache = response.clone();
            
            // キャッシュに追加
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });
              
            return response;
          });
      })
  );
});

// 古いキャッシュの削除
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            // 古いバージョンのキャッシュを削除
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
