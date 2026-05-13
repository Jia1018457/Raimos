import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
if (!raw) {
  console.error('[Firebase] FIREBASE_SERVICE_ACCOUNT env var is missing');
  process.exit(1);
}

let serviceAccount;
try {
  serviceAccount = JSON.parse(raw);
} catch (e) {
  console.error('[Firebase] Failed to parse FIREBASE_SERVICE_ACCOUNT JSON:', e.message);
  process.exit(1);
}

initializeApp({ credential: cert(serviceAccount) });

export const db = getFirestore();
