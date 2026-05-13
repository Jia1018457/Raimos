/**
 * Raimos Backend — Railway entry point
 *
 * Required env vars:
 *   FIREBASE_SERVICE_ACCOUNT   Full service-account JSON (single line)
 *   RAIMOS_UID                 Firebase UID of the target user
 *
 * Optional:
 *   OPENROUTER_API_KEY         Fallback API key if user's key isn't in Firestore
 *   VAPID_PUBLIC_KEY           Web Push VAPID public key  (run: npx web-push generate-vapid-keys)
 *   VAPID_PRIVATE_KEY          Web Push VAPID private key
 *   VAPID_EMAIL                mailto:you@example.com
 *   PORT                       HTTP port (default 3000)
 */

import http from 'http';
import {
  startCommentReplyListener,
  startProactiveMessaging,
  startProactiveMoments,
  startCheckinReminders,
} from './tasks.js';
import { vapidPublicKey, saveSubscription } from './push.js';

const PORT = Number(process.env.PORT || 3000);

if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
  console.error('[Startup] FIREBASE_SERVICE_ACCOUNT is required');
  process.exit(1);
}
if (!process.env.RAIMOS_UID) {
  console.error('[Startup] RAIMOS_UID is required');
  process.exit(1);
}

// ── Parse JSON request body ──
function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', chunk => { raw += chunk; });
    req.on('end',  () => { try { resolve(JSON.parse(raw || '{}')); } catch { resolve({}); } });
    req.on('error', reject);
  });
}

async function main() {
  console.log('[Raimos Backend] Initializing…');

  startCommentReplyListener();
  await startProactiveMessaging();
  await startProactiveMoments();
  startCheckinReminders();

  const server = http.createServer(async (req, res) => {
    // ── CORS (frontend may be on a different origin) ──
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(204); res.end(); return;
    }

    const url = req.url?.split('?')[0];

    // ── Health check ──
    if (url === '/' || url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', ts: Date.now(), uid: process.env.RAIMOS_UID }));
      return;
    }

    // ── VAPID public key (frontend needs this to subscribe to push) ──
    if (req.method === 'GET' && url === '/vapid-public-key') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ publicKey: vapidPublicKey }));
      return;
    }

    // ── Save push subscription ──
    if (req.method === 'POST' && url === '/push/subscribe') {
      try {
        const body = await readBody(req);
        if (body.uid && body.subscription?.endpoint) {
          await saveSubscription(body.uid, body.subscription);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: true }));
        } else {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: false, error: 'uid and subscription required' }));
        }
      } catch (e) {
        console.error('[/push/subscribe] Error:', e.message);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: e.message }));
      }
      return;
    }

    res.writeHead(404); res.end('Not found');
  });

  server.listen(PORT, () =>
    console.log(`[Raimos Backend] ✓ Ready on :${PORT}`)
  );
}

main().catch(err => {
  console.error('[Raimos Backend] Fatal:', err);
  process.exit(1);
});
