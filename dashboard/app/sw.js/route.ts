const appVersion = process.env.NEXT_PUBLIC_APP_VERSION ?? "development";

export const dynamic = "force-dynamic";

export function GET() {
  return new Response(serviceWorkerSource(appVersion), {
    headers: {
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "Content-Type": "application/javascript; charset=utf-8",
      "Service-Worker-Allowed": "/",
    },
  });
}

function serviceWorkerSource(version: string) {
  const serializedVersion = JSON.stringify(version);

  return `
const APP_VERSION = ${serializedVersion};
const CACHE_PREFIXES = ["readyline-", "vehicle-control-"];

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter((cacheName) =>
              CACHE_PREFIXES.some((prefix) => cacheName.startsWith(prefix)),
            )
            .map((cacheName) => caches.delete(cacheName)),
        ),
      ),
    ]),
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }

  if (event.data?.type === "GET_VERSION") {
    event.source?.postMessage({ type: "APP_VERSION", version: APP_VERSION });
  }
});

self.addEventListener("fetch", (event) => {
  const request = event.request;

  if (request.method !== "GET" || request.mode !== "navigate") return;

  event.respondWith(
    fetch(request, { cache: "no-store" }).catch(
      () =>
        new Response(
          \`<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <meta name="theme-color" content="#115e59" />
    <title>Readyline — Hors connexion</title>
    <style>
      * { box-sizing: border-box; }
      body {
        align-items: center;
        background: #f9fafb;
        color: #111827;
        display: flex;
        font-family: Arial, Helvetica, sans-serif;
        justify-content: center;
        margin: 0;
        min-height: 100vh;
        padding: 24px;
      }
      main {
        background: white;
        border: 1px solid #e5e7eb;
        border-radius: 16px;
        box-shadow: 0 20px 45px rgba(15, 23, 42, .1);
        max-width: 420px;
        padding: 32px;
        text-align: center;
        width: 100%;
      }
      .icon {
        align-items: center;
        background: #ccfbf1;
        border-radius: 999px;
        color: #115e59;
        display: inline-flex;
        font-size: 28px;
        height: 64px;
        justify-content: center;
        width: 64px;
      }
      h1 { font-size: 20px; margin: 20px 0 8px; }
      p { color: #6b7280; font-size: 14px; line-height: 1.5; margin: 0; }
      button {
        background: #0f766e;
        border: 0;
        border-radius: 8px;
        color: white;
        font-size: 14px;
        font-weight: 600;
        margin-top: 24px;
        padding: 10px 16px;
      }
    </style>
  </head>
  <body>
    <main>
      <span class="icon" aria-hidden="true">⌁</span>
      <h1>Vous êtes hors connexion</h1>
      <p>Reconnectez-vous à Internet pour accéder aux dossiers véhicules et récupérer la dernière version.</p>
      <button type="button" onclick="location.reload()">Réessayer</button>
    </main>
  </body>
</html>\`,
          {
            headers: {
              "Content-Type": "text/html; charset=utf-8",
              "Cache-Control": "no-store",
            },
            status: 503,
          },
        ),
    ),
  );
});
`;
}
