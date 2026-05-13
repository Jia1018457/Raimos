/**
 * Raimos — Web Push utility
 *
 * Required env vars (add to Railway):
 *   VAPID_PUBLIC_KEY   — run `npx web-push generate-vapid-keys` to generate
 *   VAPID_PRIVATE_KEY
 *   VAPID_EMAIL        — e.g. mailto:you@example.com  (any valid email)
 */

import webpush from 'web-push';
import { db }   from './firebase.js';

const PUBLIC_KEY  = process.env.VAPID_PUBLIC_KEY;
const PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const EMAIL       = process.env.VAPID_EMAIL || 'mailto:raimos@example.com';

export const vapidPublicKey = PUBLIC_KEY || null;

if (PUBLIC_KEY && PRIVATE_KEY) {
  webpush.setVapidDetails(EMAIL, PUBLIC_KEY, PRIVATE_KEY);
  console.log('[Push] VAPID configured ✓');
} else {
  console.warn('[Push] VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY not set — push disabled');
}

// ── Save a browser push subscription to Firestore ──
// Path: users/{uid}/pushSubscriptions/{key}
export async function saveSubscription(uid, subscription) {
  // Use the tail of the endpoint URL as a stable document key
  const key = subscription.endpoint.replace(/[^a-zA-Z0-9]/g, '').slice(-40);
  await db.doc(`users/${uid}/pushSubscriptions/${key}`).set({
    subscription,
    uid,
    updatedAt: Date.now(),
  });
  console.log(`[Push] Subscription saved for uid=${uid}`);
}

// ── Remove a subscription ──
export async function removeSubscription(uid, endpoint) {
  const key = endpoint.replace(/[^a-zA-Z0-9]/g, '').slice(-40);
  await db.doc(`users/${uid}/pushSubscriptions/${key}`).delete().catch(() => {});
}

// ── Load all subscriptions for a user ──
async function getSubscriptions(uid) {
  try {
    const snap = await db.collection(`users/${uid}/pushSubscriptions`).get();
    return snap.docs.map(d => ({ docRef: d.ref, sub: d.data().subscription }))
                    .filter(x => x.sub?.endpoint);
  } catch { return []; }
}

// ── Send push to all devices of a user ──
export async function sendPushToUser(uid, payload) {
  if (!PUBLIC_KEY || !PRIVATE_KEY) {
    console.warn('[Push] Skipping — VAPID keys not configured');
    return;
  }

  const entries = await getSubscriptions(uid);
  if (!entries.length) return;

  const body = JSON.stringify(payload);
  const results = await Promise.allSettled(
    entries.map(({ sub }) => webpush.sendNotification(sub, body))
  );

  // Prune subscriptions that are no longer valid (HTTP 410 Gone / 404)
  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    if (r.status === 'rejected') {
      const code = r.reason?.statusCode;
      if (code === 410 || code === 404) {
        entries[i].docRef.delete().catch(() => {});
        console.log(`[Push] Removed stale subscription for uid=${uid}`);
      } else {
        console.warn(`[Push] Send failed (${code}):`, r.reason?.message);
      }
    }
  }

  const sent = results.filter(r => r.status === 'fulfilled').length;
  console.log(`[Push] Sent to ${sent}/${entries.length} devices for uid=${uid}`);
}
