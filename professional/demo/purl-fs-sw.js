/*
 * Purl web demo: serves stored files by URL (docs/features/web-demo.md, WD-12).
 *
 * The app keeps a visitor's files in IndexedDB (`src/webStandIns/fs/store.ts`,
 * database `purl-fs`, store `data`, keyed by path). An <Image> asks for
 * `/__purlfs/<path under /purl/>`; this answers from that database. Every other
 * request is left to the browser: the worker answers `/__purlfs/*` and nothing
 * else (WD-50.2), so it can never hand one login a build meant for another.
 */
'use strict';

self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (e) { e.waitUntil(self.clients.claim()); });

var TYPES = {
  pdf: 'application/pdf', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp',
  gif: 'image/gif', heic: 'image/heic', svg: 'image/svg+xml', json: 'application/json', txt: 'text/plain'
};

function openDb() {
  return new Promise(function (resolve, reject) {
    var r = indexedDB.open('purl-fs', 1);
    r.onupgradeneeded = function () {
      ['meta', 'data'].forEach(function (s) { if (!r.result.objectStoreNames.contains(s)) r.result.createObjectStore(s); });
    };
    r.onsuccess = function () { resolve(r.result); };
    r.onerror = function () { reject(r.error); };
  });
}

function readFile(path) {
  return openDb().then(function (db) {
    return new Promise(function (resolve, reject) {
      var g = db.transaction(['data'], 'readonly').objectStore('data').get(path);
      g.onsuccess = function () { resolve(g.result); };
      g.onerror = function () { reject(g.error); };
    });
  });
}

// A build served under a folder (the weaving preview at /preview/weave/) is
// registered with that folder as its scope, and asks for files under it.
var FILES = (function () {
  try { return new URL(self.registration.scope).pathname.replace(/\/?$/, '/') + '__purlfs/'; } catch (x) { return '/__purlfs/'; }
})();

self.addEventListener('fetch', function (e) {
  var url = new URL(e.request.url);
  if (url.origin !== self.location.origin || url.pathname.indexOf(FILES) !== 0) return;
  var rest;
  try { rest = decodeURI(url.pathname.slice(FILES.length)); } catch (x) { rest = url.pathname.slice(FILES.length); }
  var path = '/purl/' + rest;
  e.respondWith(readFile(path).then(function (bytes) {
    if (!bytes) return new Response('Not found', { status: 404 });
    var ext = (path.split('.').pop() || '').toLowerCase();
    return new Response(bytes, { headers: { 'Content-Type': TYPES[ext] || 'application/octet-stream', 'Cache-Control': 'no-store' } });
  }, function () { return new Response('Storage error', { status: 500 }); }));
});
