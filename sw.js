const CACHE_NAME = 'raimos-v4-checkin';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/style.css',
  './js/db.js',
  './js/app.js',
  './js/checkin.js',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});

// ── Periodic Background Sync: 每小时唤醒检查打卡提醒 ──
self.addEventListener('periodicsync', e => {
  if (e.tag === 'checkin-reminder') {
    e.waitUntil(swCheckReminders());
  }
});

// ── 接收主页面发来的提醒计划（存到 SW 内存+IDB） ──
self.addEventListener('message', e => {
  if (e.data?.type === 'SET_CK_REMINDERS') {
    swSaveReminders(e.data.reminders);
  }
});

// ── Push（预留，后端可以接入 Web Push） ──
self.addEventListener('push', e => {
  const data = e.data?.json?.() || {};
  const title = data.title || 'Raimos 打卡提醒';
  const body  = data.body  || '今天还没打卡哦，快去完成目标！';
  e.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: 'ck-push',
      renotify: true,
    })
  );
});

// ── 点击通知：打开或聚焦 App ──
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const c of list) {
        if (c.url.includes('index.html') || c.url.endsWith('/')) {
          return c.focus();
        }
      }
      return clients.openWindow('./');
    })
  );
});

// ═══════════════════════════════════════
//  SW-side reminder helpers
// ═══════════════════════════════════════

// Reminder format stored in Cache Storage as JSON:
// [{ goalId, title, emoji, times: ['HH:MM', ...] }]
const REMINDER_CACHE = 'raimos-ck-reminders-v1';

async function swSaveReminders(reminders) {
  const cache = await caches.open(REMINDER_CACHE);
  const blob  = new Blob([JSON.stringify(reminders)], { type: 'application/json' });
  await cache.put('reminders.json', new Response(blob));
}

async function swLoadReminders() {
  try {
    const cache = await caches.open(REMINDER_CACHE);
    const res   = await cache.match('reminders.json');
    if (!res) return [];
    return await res.json();
  } catch { return []; }
}

async function swCheckReminders() {
  const reminders = await swLoadReminders();
  if (!reminders.length) return;

  const now   = new Date();
  const hhmm  = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
  const today = now.toISOString().slice(0, 10);

  // Load today's checked-in goals from IndexedDB via client message
  // (SW can't open IndexedDB easily across origins, so we show the notification
  //  and let the page suppress it if already checked in)
  for (const r of reminders) {
    if (!r.times?.some(t => swTimeClose(t, hhmm, 30))) continue;
    // Show notification; the page will dismiss it if user already checked in
    await self.registration.showNotification(`打卡提醒 · ${r.emoji || '🎯'} ${r.title}`, {
      body: '今天还没打卡哦，坚持才能看到改变 💪',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: `ck-reminder-${r.goalId}-${today}`,
      data: { goalId: r.goalId, date: today },
      actions: [
        { action: 'open', title: '去打卡 ✅' },
        { action: 'dismiss', title: '稍后提醒' },
      ],
    });
  }
}

// Returns true if `time` is within `marginMins` minutes of `now`
function swTimeClose(time, now, marginMins) {
  const toMins = t => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
  return Math.abs(toMins(time) - toMins(now)) <= marginMins;
}
