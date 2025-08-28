// /sw.js
const CACHE = "v1";
self.addEventListener("install", (e) => self.skipWaiting());
self.addEventListener("activate", (e) => self.clients.claim());
self.addEventListener("fetch", () => {}); // handler présent => OK pour Chrome
