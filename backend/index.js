/**
 * Raimos Backend — Railway entry point
 *
 * Required env vars:
 *   FIREBASE_SERVICE_ACCOUNT   Full service-account JSON (single line)
 *   RAIMOS_UID                 Firebase UID of the target user
 *
 * Optional:
 *   OPENROUTER_API_KEY         Fallback API key if user's key isn't in Firestore
 *   PORT                       HTTP health-check port (default 3000)
 */

import http from 'http';
import { startCommentReplyListener, startProactiveMessaging, startProactiveMoments } from './tasks.js';

const PORT = Number(process.env.PORT || 3000);

if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
  console.error('[Startup] FIREBASE_SERVICE_ACCOUNT is required');
  process.exit(1);
}
if (!process.env.RAIMOS_UID) {
  console.error('[Startup] RAIMOS_UID is required');
  process.exit(1);
}

async function main() {
  console.log('[Raimos Backend] Initializing…');

  // Start all tasks
  startCommentReplyListener();          // real-time listener, no await needed
  await startProactiveMessaging();
  await startProactiveMoments();

  // Minimal HTTP server — Railway requires an open port for health checks
  const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', ts: Date.now(), uid: process.env.RAIMOS_UID }));
  });

  server.listen(PORT, () =>
    console.log(`[Raimos Backend] ✓ Ready — health check on :${PORT}`)
  );
}

main().catch(err => {
  console.error('[Raimos Backend] Fatal error:', err);
  process.exit(1);
});
