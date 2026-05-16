/**
 * Raimos Backend Tasks
 *
 * Task 1 – commentReply      : Firestore listener → AI replies to user comments on Moments
 * Task 2 – proactiveMsg      : Scheduler → AI sends proactive chat messages
 * Task 3 – proactiveMoment   : Scheduler (random distribution) → AI posts Moments
 * Task 4 – checkinReminders  : Scheduler → Web Push when check-in time arrives & goal unpunched
 */

import cron from 'node-cron';
import { db } from './firebase.js';
import { callAI } from './ai.js';
import { getWeather, weatherText, geocodeCity } from './weather.js';
import { sendPushToUser } from './push.js';

const UID = process.env.RAIMOS_UID;

// ─── Web Push ────────────────────────────────────────────────────────────────
export function initVapid() {
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (pub && priv) {
    webPush.setVapidDetails('mailto:raimos@app.local', pub, priv);
    console.log('[Push] VAPID configured ✓');
  } else {
    // Generate keys on first run and log for the user to add as env vars
    const keys = webPush.generateVAPIDKeys();
    console.log('[Push] VAPID keys not set. Add these to your env vars:');
    console.log(`  VAPID_PUBLIC_KEY=${keys.publicKey}`);
    console.log(`  VAPID_PRIVATE_KEY=${keys.privateKey}`);
  }
}

async function sendPush(title, body, tag = 'raimos') {
  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) return;
  try {
    const snap = await db.doc(`users/${UID}/pushSubscriptions/web`).get();
    if (!snap.exists) return;
    const sub = snap.data();
    await webPush.sendNotification(sub, JSON.stringify({ title, body, tag }));
  } catch(e) {
    if (e.statusCode === 410 || e.statusCode === 404) {
      // Subscription expired — clean up
      await db.doc(`users/${UID}/pushSubscriptions/web`).delete().catch(() => {});
    } else {
      console.warn('[Push] send failed:', e.message);
    }
  }
}

// ─── Tiny helpers ────────────────────────────────────────────────────────────

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
}

async function getSettings() {
  const snap = await db.doc(`users/${UID}/meta/settings`).get();
  return snap.exists ? snap.data() : {};
}

async function getContact(contactId) {
  if (!contactId) return null;
  const snap = await db.doc(`users/${UID}/contacts/${contactId}`).get();
  return snap.exists ? snap.data() : null;
}

/** Returns an array of memory strings, newest first. */
async function getMemories(limit = 20) {
  try {
    const snap = await db
      .collection(`users/${UID}/memories`)
      .orderBy('ts', 'desc')
      .limit(limit)
      .get();
    return snap.docs
      .map(d => d.data().content || d.data().text || '')
      .filter(Boolean);
  } catch {
    return [];
  }
}

/** Returns recent moment objects, newest first. */
async function getRecentMoments(limit = 5) {
  try {
    const snap = await db
      .collection(`users/${UID}/moments`)
      .orderBy('ts', 'desc')
      .limit(limit)
      .get();
    return snap.docs.map(d => d.data());
  } catch {
    return [];
  }
}

/** Resolve which API key + URL to use. Prefers user's stored key. */
function resolveApiKey(settings) {
  return {
    apiKey: settings.apiKey || process.env.OPENROUTER_API_KEY || '',
    apiUrl: settings.apiUrl || undefined,
  };
}

// ─── Date/time helpers ────────────────────────────────────────────────────────

// Returns localised { dateStr, timeStr, partOfDay } for a given IANA timezone.
// The server runs in UTC so we always pass an explicit timezone.
function getLocalDatetime(timezone) {
  const tz  = timezone || 'Asia/Shanghai';
  const now  = new Date();
  try {
    const dateStr = new Intl.DateTimeFormat('zh-CN', {
      timeZone: tz, year: 'numeric', month: 'long', day: 'numeric', weekday: 'long',
    }).format(now);
    const timeStr = new Intl.DateTimeFormat('zh-CN', {
      timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false,
    }).format(now);
    const h = parseInt(new Intl.DateTimeFormat('en', {
      timeZone: tz, hour: 'numeric', hour12: false,
    }).format(now), 10);
    const partOfDay = h < 6 ? '深夜' : h < 9 ? '清晨' : h < 12 ? '上午' : h < 14 ? '中午' : h < 18 ? '下午' : h < 21 ? '傍晚' : '晚上';
    return { dateStr, timeStr, partOfDay };
  } catch {
    return { dateStr: '', timeStr: '', partOfDay: '' };
  }
}

function currentHour() { return new Date().getHours(); }

function inActiveWindow(settings) {
  const h = currentHour();
  const start = Number(settings.proStart ?? 8);
  const end   = Number(settings.proEnd   ?? 22);
  return h >= start && h < end;
}

/** Pick a random timestamp within [startH, endH) on a given day offset (0 = today). */
function randomTsOnDay(dayOffset, startH, endH) {
  const base = new Date();
  base.setDate(base.getDate() + dayOffset);
  base.setHours(
    startH + Math.floor(Math.random() * (endH - startH)),
    Math.floor(Math.random() * 60),
    Math.floor(Math.random() * 60),
    0
  );
  return base.getTime();
}

// ═══════════════════════════════════════════════════════════════════════════════
//  TASK 1 — Comment Auto-Reply
// ═══════════════════════════════════════════════════════════════════════════════

export function startCommentReplyListener() {
  console.log('[CommentReply] Listener started');

  // Listen for comments that need an AI reply and haven't been replied to yet.
  // The frontend writes comments with needsAiReply:true when the user submits one.
  db.collection(`users/${UID}/comments`)
    .where('needsAiReply', '==', true)
    .where('replied', '==', false)
    .onSnapshot(async snapshot => {
      for (const change of snapshot.docChanges()) {
        if (change.type !== 'added') continue;
        const comment = { id: change.doc.id, ...change.doc.data() };

        // Atomically mark as replied to prevent duplicate processing
        try {
          await change.doc.ref.update({ replied: true });
        } catch {
          continue; // another instance may have grabbed it
        }

        replyToComment(comment).catch(e =>
          console.error('[CommentReply] Error for comment', comment.id, e.message)
        );
      }
    }, err => console.error('[CommentReply] Snapshot error:', err.message));
}

async function replyToComment(comment) {
  const settings = await getSettings();
  // Support both legacy 'commentAutoReply' and new 'replyMomentComments'
  if (!settings.replyMomentComments && !settings.commentAutoReply) return;

  const { apiKey } = resolveApiKey(settings);
  if (!apiKey) { console.log('[CommentReply] No API key'); return; }

  // Use per-comment contactId, fall back to commentContactId setting
  const contactId = comment.contactId || settings.commentContactId;
  const contact = await getContact(contactId);
  if (!contact) { console.log('[CommentReply] no contact configured for comment reply'); return; }

  // Fetch parent moment for context
  const momentSnap = await db.doc(`users/${UID}/moments/${comment.momentId}`).get();
  if (!momentSnap.exists) return;
  const moment = momentSnap.data();

  // Fetch recent comments for thread context (up to 8)
  const threadSnap = await db
    .collection(`users/${UID}/comments`)
    .where('momentId', '==', comment.momentId)
    .orderBy('ts', 'asc')
    .limit(8)
    .get();
  const thread = threadSnap.docs
    .map(d => {
      const c = d.data();
      return `${c.author}${c.replyTo ? ` → ${c.replyTo}` : ''}: ${c.text}`;
    })
    .join('\n');

  const system = contact.system ||
    `你是${contact.name}，一个活泼可爱的AI，正在浏览朋友圈。`;

  const prompt =
    `朋友圈内容：「${moment.text || '[图片]'}」\n\n` +
    `评论区：\n${thread}\n\n` +
    `请用自然口吻回复 "${comment.author}" 说的"${comment.text}"` +
    `（不超过40字，不加引号，像真实朋友一样，直接输出回复内容，不要在开头加名字或冒号）：`;

  const { content, tokens } = await callAI({
    apiKey,
    model: contact.model || settings.model || 'anthropic/claude-3-haiku',
    system,
    messages: [{ role: 'user', content: prompt }],
    maxTokens: 80,
  });

  if (!content) return;

  // Strip any accidental "name: " prefix the model may have added
  const cleanContent = content.replace(/^[\w\s一-龥]{1,15}[：:]\s*/u, '').trim() || content;

  const replyId = genId();
  await db.doc(`users/${UID}/comments/${replyId}`).set({
    id: replyId,
    momentId: comment.momentId,
    author: contact.name,
    avatar: contact.avatar || '🤖',
    text: cleanContent,
    replyTo: comment.author,
    ts: Date.now(),
    needsAiReply: false,
    replied: true,
    byBackend: true,
    tokens,
  });

  console.log(`[CommentReply] ✓ ${contact.name} → ${comment.author}: "${content.slice(0, 40)}"`);
}

// ═══════════════════════════════════════════════════════════════════════════════
//  TASK 2 — Proactive Messaging
// ═══════════════════════════════════════════════════════════════════════════════

let _nextProactiveTs = 0;

export async function startProactiveMessaging() {
  const settings = await getSettings();
  _nextProactiveTs = calcNextProactiveTs(settings);
  console.log(`[ProactiveMsg] Started — next at ${new Date(_nextProactiveTs).toLocaleString()}`);

  // Check every 5 minutes
  cron.schedule('*/5 * * * *', async () => {
    if (Date.now() < _nextProactiveTs) return;
    const s = await getSettings();
    if (!s.proactive && !s.proactiveEnabled) return;
    if (!inActiveWindow(s)) {
      _nextProactiveTs = calcNextProactiveTs(s);
      return;
    }
    try {
      await sendProactiveMessage(s);
    } catch (e) {
      console.error('[ProactiveMsg] Error:', e.message);
    }
    _nextProactiveTs = calcNextProactiveTs(s);
    console.log(`[ProactiveMsg] Next at ${new Date(_nextProactiveTs).toLocaleString()}`);
  });
}

function calcNextProactiveTs(settings) {
  const count   = Number(settings.proMax ?? 3);
  const startH  = Number(settings.proStart ?? 8);
  const endH    = Number(settings.proEnd   ?? 22);
  const spanMs  = (endH - startH) * 3_600_000;
  const slotMs  = spanMs / count;

  const now = Date.now();
  const todayStart = new Date();
  todayStart.setHours(startH, 0, 0, 0);
  const elapsed = now - todayStart.getTime();
  const nextSlot = Math.floor(elapsed / slotMs) + 1;

  // Add up to 20% random jitter within the slot
  const jitter = (Math.random() - 0.5) * slotMs * 0.4;
  let ts = todayStart.getTime() + nextSlot * slotMs + jitter;

  // If we've exhausted today's slots, start fresh tomorrow
  if (nextSlot >= count || ts <= now) {
    const tomorrow = new Date(todayStart);
    tomorrow.setDate(tomorrow.getDate() + 1);
    ts = tomorrow.getTime() + Math.random() * slotMs + jitter;
  }
  return ts;
}

async function sendProactiveMessage(settings) {
  const { apiKey } = resolveApiKey(settings);
  if (!apiKey) return;

  const contact = await getContact(settings.proContactId);
  if (!contact) { console.log('[ProactiveMsg] proContactId not configured'); return; }

  const memories = await getMemories(10);
  const memCtx = memories.length
    ? `已知关于用户的事：${memories.slice(0, 5).join('；')}`
    : '';

  const h = currentHour();
  const timeLabel = h < 6 ? '深夜' : h < 12 ? '早上' : h < 18 ? '下午' : '晚上';

  const { content, tokens } = await callAI({
    apiKey,
    model: contact.model || settings.model || 'anthropic/claude-3-haiku',
    system: contact.system || `你是${contact.name}，一个温柔体贴的AI伴侣。`,
    messages: [{
      role: 'user',
      content:
        `现在是${timeLabel}。${memCtx}\n\n` +
        `请主动给用户发一条暖心短消息，像真实朋友一样自然（不超过60字，不要自我介绍是AI）：`,
    }],
    maxTokens: 120,
  });

  if (!content) return;

  await db.doc(`users/${UID}/proactiveMsgs/${genId()}`).set({
    id: genId(),
    contactId: contact.id || settings.proContactId,
    contactName: contact.name,
    contactAvatar: contact.avatar || '🤖',
    text: content,
    ts: Date.now(),
    read: false,
    tokens,
    byBackend: true,
  });

  await sendPush(`💬 ${contact.name}`, content.slice(0, 80), 'proactive-msg');
  console.log(`[ProactiveMsg] ✓ ${contact.name}: "${content.slice(0, 40)}"`);
}

// ═══════════════════════════════════════════════════════════════════════════════
//  TASK 3 — Proactive Moments
// ═══════════════════════════════════════════════════════════════════════════════

// Holds sorted list of upcoming trigger timestamps for the current period
let _momentSchedule = [];

export async function startProactiveMoments() {
  const settings = await getSettings();
  _momentSchedule = buildMomentSchedule(settings);
  const next = _momentSchedule[0];
  console.log(`[ProactiveMoment] Started — next at ${next ? new Date(next).toLocaleString() : 'none'}`);

  // Check every 10 minutes
  cron.schedule('*/10 * * * *', async () => {
    const s = await getSettings();
    // Support both 'autoPost' (frontend) and legacy 'momentAutoPost'
    if (!s.autoPost && !s.momentAutoPost) return;

    if (!_momentSchedule.length) {
      _momentSchedule = buildMomentSchedule(s);
    }

    const nextTs = _momentSchedule[0];
    if (!nextTs || Date.now() < nextTs) return;

    // Consume this slot
    _momentSchedule.shift();

    // Rebuild if empty (next period)
    if (!_momentSchedule.length) _momentSchedule = buildMomentSchedule(s, true);

    try {
      await postProactiveMoment(s);
    } catch (e) {
      console.error('[ProactiveMoment] Error:', e.message);
    }

    console.log(`[ProactiveMoment] Next at ${_momentSchedule[0] ? new Date(_momentSchedule[0]).toLocaleString() : '(rebuilding)'}`);
  });
}

/**
 * Build a sorted list of future trigger timestamps.
 * mode = 'perDay'  → count triggers distributed randomly within today (or tomorrow if nextPeriod)
 * mode = 'perWeek' → count triggers distributed randomly across the next 7 days
 */
function buildMomentSchedule(settings, nextPeriod = false) {
  const mode   = settings.momentFreqMode  || 'perDay';
  const count  = Math.max(1, Number(settings.momentFreqCount ?? 1));
  const startH = Number(settings.momentStartHour ?? settings.proStart ?? 8);
  const endH   = Number(settings.momentEndHour   ?? settings.proEnd   ?? 22);
  const now    = Date.now();

  const times = [];

  if (mode === 'perDay') {
    const dayOffset = nextPeriod ? 1 : 0;
    for (let i = 0; i < count; i++) {
      times.push(randomTsOnDay(dayOffset, startH, endH));
    }
  } else {
    // perWeek — spread across next 7 days
    const days = Array.from({ length: 7 }, (_, i) => i + (nextPeriod ? 7 : 0));
    for (let i = 0; i < count; i++) {
      const d = days[Math.floor(Math.random() * days.length)];
      times.push(randomTsOnDay(d, startH, endH));
    }
  }

  // Only keep future times, sorted ascending
  return times.filter(t => t > now).sort((a, b) => a - b);
}

async function getRecentChats(limit = 5) {
  try {
    const snap = await db.collection(`users/${UID}/chats`).orderBy('updatedAt', 'desc').limit(3).get();
    const chats = snap.docs.map(d => d.data());
    const msgs = [];
    for (const chat of chats) {
      const mSnap = await db.collection(`users/${UID}/messages`)
        .where('chatId', '==', chat.id)
        .orderBy('ts', 'desc').limit(Math.ceil(limit / chats.length)).get();
      mSnap.docs.forEach(d => { const m = d.data(); if (m.role === 'user' && m.content) msgs.push(m.content); });
    }
    return msgs.slice(0, limit);
  } catch { return []; }
}

async function postProactiveMoment(settings) {
  const { apiKey } = resolveApiKey(settings);
  if (!apiKey) return;

  const contact = await getContact(settings.momentContactId);
  if (!contact) { console.log('[ProactiveMoment] momentContactId not configured'); return; }

  // --- Context gathering ---
  let weatherInfo = '';
  let timezone = 'Asia/Shanghai'; // default; overridden if geocoding returns one
  const city = settings.city || '';
  if (city) {
    const geo = await geocodeCity(city);
    if (geo) {
      if (geo.timezone) timezone = geo.timezone;
      const w = await getWeather(geo.lat, geo.lon);
      if (w) weatherInfo = `${city}当前天气：${weatherText(w)}`;
    }
  } else if (settings.weatherLat && settings.weatherLon) {
    const w = await getWeather(Number(settings.weatherLat), Number(settings.weatherLon));
    if (w) weatherInfo = `当前天气：${weatherText(w)}`;
  }

  const refMem = settings.refMemEnabled !== false;
  const memories = refMem ? await getMemories(15) : [];
  const memCtx = memories.slice(0, 8).join('；');

  const refChat = settings.refChatEnabled;
  const chatCount = Math.max(1, Number(settings.refChatCount || 5));
  const recentChats = refChat ? await getRecentChats(chatCount) : [];
  const chatCtx = recentChats.length ? `最近聊天内容：${recentChats.join('；')}` : '';

  const recentMoments = await getRecentMoments(5);
  const recentTexts = recentMoments.map(m => m.text || '').filter(Boolean);

  // Gather album photos with labels for AI-driven selection
  let albumPhotos = [];
  try {
    const albumSnap = await db.collection(`users/${UID}/album`).get();
    albumPhotos = albumSnap.docs
      .map(d => d.data())
      .filter(p => (p.storageUrl || p.url) && (p.storageUrl || p.url).startsWith('http'));
  } catch { /* no album */ }

  const albumLabels = albumPhotos.length
    ? `可用相册照片标签（格式：标签→图片编号）：${albumPhotos.map((p,i)=>`${p.label||'无标签'}→${i}`).join('；')}`
    : '';

  // Build date/time in user's local timezone (server runs UTC; use Intl to convert)
  const { dateStr, timeStr, partOfDay } = getLocalDatetime(timezone);

  const contextLines = [
    `现在是${dateStr}${partOfDay}${timeStr}。`,
    weatherInfo,
    memCtx    ? `关于用户的记忆片段：${memCtx}` : '',
    chatCtx,
    recentTexts.length ? `最近发过的朋友圈（避免重复）：${recentTexts.join('；')}` : '',
    albumLabels,
  ].filter(Boolean).join('\n');

  const { content, tokens } = await callAI({
    apiKey,
    model: contact.model || settings.model || 'anthropic/claude-3-haiku',
    system: contact.system || `你是${contact.name}，一个有温度、爱生活的AI，正在发朋友圈。`,
    messages: [{
      role: 'user',
      content:
        `${contextLines}\n\n` +
        `请写一条朋友圈文案，自然真实、像真人在分享生活。` +
        `可以聊天气、心情、日常观察、有趣的想法等。` +
        `（30-120字，不加话题标签，不提"我是AI"）\n\n` +
        `${albumPhotos.length ? '如果有合适的相册照片，在文案末尾加一行：IMG:图片编号（如IMG:2），没有合适的不用加。' : ''}\n` +
        `只输出文案内容，不要其他说明：`,
    }],
    maxTokens: 220,
  });

  if (!content) return;

  // Parse AI-chosen image index
  const imgMatch = content.match(/\bIMG:(\d+)\b/);
  let imageUrl = null;
  let finalContent = content.replace(/\bIMG:\d+\b/g, '').trim();
  if (imgMatch) {
    const idx = parseInt(imgMatch[1]);
    if (albumPhotos[idx]) imageUrl = albumPhotos[idx].storageUrl || albumPhotos[idx].url || null;
  }

  const momentId = genId();
  await db.doc(`users/${UID}/moments/${momentId}`).set({
    id: momentId,
    author: contact.name,
    avatar: contact.avatar || '🤖',
    text: finalContent,
    images: imageUrl ? [imageUrl] : [],
    ts: Date.now(),
    likes: 0,
    byBackend: true,
    tokens,
    contactId: settings.momentContactId,
  });

  await sendPush(`🌸 ${contact.name} 发了朋友圈`, finalContent.slice(0, 80), 'proactive-moment');
  console.log(`[ProactiveMoment] ✓ Posted by ${contact.name}: "${content.slice(0, 50)}"`);
}

// ═══════════════════════════════════════════════════════════════════════════════
//  TASK 4 — Check-in Reminders (Web Push)
// ═══════════════════════════════════════════════════════════════════════════════

export function startCheckinReminders() {
  console.log('[CheckinReminder] Started — polling every 5 min');

  // Run once immediately on startup (catches any missed reminders)
  fireCheckinReminders().catch(e => console.error('[CheckinReminder] Startup check:', e.message));

  // Then every 5 minutes
  cron.schedule('*/5 * * * *', () => {
    fireCheckinReminders().catch(e =>
      console.error('[CheckinReminder] Error:', e.message)
    );
  });
}

async function fireCheckinReminders() {
  const now   = new Date();
  const nowM  = now.getHours() * 60 + now.getMinutes();
  const today = now.toISOString().slice(0, 10);

  // Load all check-in goals for this user
  let goalsSnap;
  try {
    goalsSnap = await db.collection(`users/${UID}/checkinGoals`).get();
  } catch (e) {
    console.warn('[CheckinReminder] Could not read goals:', e.message);
    return;
  }
  if (goalsSnap.empty) return;

  for (const gDoc of goalsSnap.docs) {
    const goal = gDoc.data();
    if (!goal.reminderEnabled || !goal.reminderTimes?.length) continue;

    // Is any reminder time within ±3 minutes of now?
    const shouldFire = goal.reminderTimes.some(t => {
      const [h, m] = t.split(':').map(Number);
      return Math.abs(h * 60 + m - nowM) <= 3;
    });
    if (!shouldFire) continue;

    // Has the user already checked in today for this goal?
    try {
      const recsSnap = await db
        .collection(`users/${UID}/checkinRecords`)
        .where('goalId', '==', goal.id)
        .get();
      const alreadyDone = recsSnap.docs.some(d => {
        const r = d.data();
        return r.date === today && r.completed === true;
      });
      if (alreadyDone) continue;
    } catch (e) {
      console.warn('[CheckinReminder] Could not read records:', e.message);
      continue;
    }

    // Fire!
    await sendPushToUser(UID, {
      title: `打卡提醒 · ${goal.emoji || '🎯'} ${goal.title}`,
      body:  '今天还没打卡哦，坚持才能看到改变 💪',
      icon:  '/icon-192.png',
      badge: '/icon-192.png',
      tag:   `ck-${goal.id}-${today}`,
      url:   '/',
    });
    console.log(`[CheckinReminder] ✓ Push sent — goal="${goal.title}" time=${now.toLocaleTimeString()}`);
  }
}
