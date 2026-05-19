// ═══════════════════════════════════════════
//  RAIMOS — Daily Check-in Module
// ═══════════════════════════════════════════
'use strict';

// ── State ──
let CK = {
  goals: [],
  activeGoalId: null,
  calYear: new Date().getFullYear(),
  calMonth: new Date().getMonth(),
  reminderTimers: [],
  _editingGoalId: null,
  _checkinDate: null,
  _confettiRaf: null,
  _confettiParticles: [],
};

const CK_MILESTONES = [
  { days:  3, emoji: '🌱', label: '三日新苗' },
  { days:  7, emoji: '⭐', label: '一周之星' },
  { days: 14, emoji: '🌟', label: '两周达人' },
  { days: 21, emoji: '🏆', label: '三周习惯' },
  { days: 30, emoji: '🥇', label: '月度勇士' },
  { days: 60, emoji: '💎', label: '两月钻石' },
  { days:100, emoji: '👑', label: '百日王者' },
  { days:365, emoji: '🌈', label: '年度传奇' },
];

// ══════════════════════════════
//  DB HELPERS
// ══════════════════════════════
async function ckGetGoals()            { return dbGetAll('checkinGoals'); }
async function ckGetRecords(goalId)    { return dbGetAll('checkinRecords', 'goalId', goalId); }
async function ckGetRecordByDate(goalId, date) {
  const all = await ckGetRecords(goalId);
  return all.find(r => r.date === date) || null;
}

function ckDaySchedule(goal, dateStr) {
  if (goal.scheduleType === 'weekly' && Array.isArray(goal.weeklySchedule) && goal.weeklySchedule.length === 7) {
    const dow = new Date(dateStr + 'T12:00:00').getDay();
    const slot = goal.weeklySchedule[dow] || { minutes: 0 };
    return { required: slot.minutes > 0, minutes: slot.minutes };
  }
  return { required: true, minutes: goal.targetMinutes || 30 };
}

// ══════════════════════════════
//  INIT
// ══════════════════════════════
async function initCheckin() {
  CK.goals = await ckGetGoals();
  if (CK.goals.length && !CK.activeGoalId) CK.activeGoalId = CK.goals[0].id;
  setupCheckinReminders();
  await ckCatchUpReminders();
  // Pull latest data from cloud in background, then refresh UI
  ckLoadFromCloud().then(() => {
    if (document.getElementById('checkin-page')?.classList.contains('active')) {
      renderCheckinPage();
    }
  });
}

// ══════════════════════════════
//  PAGE RENDER
// ══════════════════════════════
async function renderCheckinPage() {
  CK.goals = await ckGetGoals();
  if (CK.goals.length && !CK.activeGoalId) CK.activeGoalId = CK.goals[0].id;

  const moreBtn = $i('ck-more-btn');
  if (moreBtn) moreBtn.style.display = CK.activeGoalId ? 'inline-flex' : 'none';

  renderCkGoalTabs();
  await renderCkCalendar();
  await renderCkTodaySection();
  await renderCkBadges();
}

// ── Goal Tabs ──
function renderCkGoalTabs() {
  const el = $i('ck-goal-tabs');
  if (!el) return;
  el.innerHTML = '';
  CK.goals.forEach(g => {
    const btn = document.createElement('button');
    btn.className = 'ck-goal-tab' + (g.id === CK.activeGoalId ? ' active' : '');
    btn.style.cssText = `--goal-color:${g.color || '#ff8fab'}`;
    btn.innerHTML = `<span class="ck-tab-dot"></span><span class="ck-tab-label">${g.emoji || '🎯'} ${g.title}</span>`;
    btn.onclick = () => ckSwitchGoal(g.id);
    el.appendChild(btn);
  });
  if (!CK.goals.length) {
    el.innerHTML = '<div style="padding:10px 14px;color:var(--text3);font-size:13px">还没有打卡目标，点右上角新建吧！</div>';
  }
}

async function ckSwitchGoal(goalId) {
  CK.activeGoalId = goalId;
  const moreBtn = $i('ck-more-btn');
  if (moreBtn) moreBtn.style.display = goalId ? 'inline-flex' : 'none';
  renderCkGoalTabs();
  await renderCkCalendar();
  await renderCkTodaySection();
  await renderCkBadges();
}

// ── Calendar ──
async function renderCkCalendar() {
  const el = $i('ck-calendar');
  if (!el) return;

  if (!CK.activeGoalId) {
    el.innerHTML = '<div class="ck-empty-hint">请先创建打卡目标</div>';
    return;
  }

  const goal = CK.goals.find(g => g.id === CK.activeGoalId);
  if (!goal) return;

  const year  = CK.calYear;
  const month = CK.calMonth;
  const records  = await ckGetRecords(CK.activeGoalId);
  const recMap   = {};
  records.forEach(r => recMap[r.date] = r);

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDow    = new Date(year, month, 1).getDay();
  const startOffset = (firstDow + 6) % 7; // Mon=0
  const today       = ckTodayStr();
  const color       = goal.color || '#ff8fab';

  const monthNames  = ['一月','二月','三月','四月','五月','六月','七月','八月','九月','十月','十一月','十二月'];
  const totalChecked = records.filter(r => r.completed).length;
  const streak       = ckStreakFromRecords(records, goal);

  let html = `
    <div class="ck-cal-wrap">
      <div class="ck-cal-header">
        <button class="ck-cal-nav" onclick="ckNavMonth(-1)">‹</button>
        <div class="ck-cal-title-col">
          <span class="ck-cal-month">${year}年 ${monthNames[month]}</span>
          <span class="ck-cal-stats-inline">累计 ${totalChecked} 天 · 连续 ${streak} 天</span>
        </div>
        <button class="ck-cal-nav" onclick="ckNavMonth(1)">›</button>
      </div>
      <div class="ck-cal-grid">
        <div class="ck-wd">一</div><div class="ck-wd">二</div><div class="ck-wd">三</div>
        <div class="ck-wd">四</div><div class="ck-wd">五</div><div class="ck-wd">六</div>
        <div class="ck-wd">日</div>`;

  for (let i = 0; i < startOffset; i++) html += `<div class="ck-cal-cell empty"></div>`;

  for (let d = 1; d <= daysInMonth; d++) {
    const ds  = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const rec = recMap[ds];
    const done      = !!rec?.completed;
    const totalIt   = goal.items?.length || 0;
    const doneIt    = totalIt > 0 ? Object.values(rec?.items || {}).filter(Boolean).length : 0;
    const partial   = !done && !!rec && totalIt > 0 && doneIt > 0;
    const isToday   = ds === today;
    const isFuture  = ds > today;
    const daySched = ckDaySchedule(goal, ds);
    const isRestDay = !daySched.required;
    const hasBonus = isRestDay && !!rec && (rec.minutesLogged > 0 || rec.completed);

    let cls = 'ck-cal-cell';
    if (isToday)  cls += ' today';
    if (done)     cls += ' checked';
    if (partial)  cls += ' partial';
    if (isFuture) cls += ' future';
    if (isRestDay && !done) cls += ' rest-day';
    if (hasBonus) cls += ' rest-done';

    const bgStyle = done ? `style="--cell-color:${color}"` :
                    partial ? `style="--cell-color:${color}"` :
                    hasBonus ? `style="--cell-color:${color}88"` : '';
    const cellInner = done
      ? `<span class="ck-cell-day">${d}</span><span class="ck-cell-mark">✓</span>`
      : hasBonus
        ? `<span class="ck-cell-day">${d}</span><span class="ck-cell-mark" style="font-size:9px">+</span>`
        : partial
          ? `<span class="ck-cell-day">${d}</span><span class="ck-cell-part-mark">${doneIt}/${totalIt}</span>`
          : `<span class="ck-cell-day">${d}</span>${isToday ? `<span class="ck-cell-today-dot"></span>` : isRestDay && !isFuture ? `<span class="ck-cell-rest-dot"></span>` : ''}`;
    html += `<div class="${cls}" ${bgStyle} onclick="ckCellClick('${ds}')">${cellInner}</div>`;
  }

  html += `</div></div>`;
  el.innerHTML = html;
}

function ckNavMonth(dir) {
  CK.calMonth += dir;
  if (CK.calMonth > 11) { CK.calMonth = 0; CK.calYear++; }
  if (CK.calMonth < 0)  { CK.calMonth = 11; CK.calYear--; }
  renderCkCalendar();
}

async function ckCellClick(date) {
  const today = ckTodayStr();
  if (date > today) return;
  const rec = await ckGetRecordByDate(CK.activeGoalId, date);
  if (rec?.completed) {
    openCkViewModal(rec);
  } else {
    openCkCheckinModal(date);
  }
}

// ── Today Section ──
async function renderCkTodaySection() {
  const el = $i('ck-today-section');
  if (!el) return;

  if (!CK.activeGoalId || !CK.goals.length) {
    el.innerHTML = `
      <div class="ck-welcome-card">
        <div class="ck-welcome-icon">📅</div>
        <div class="ck-welcome-title">开始你的打卡之旅</div>
        <div class="ck-welcome-sub">设定目标，每天坚持，见证成长</div>
        <button class="btn-p" onclick="openCkGoalModal(null)">＋ 创建第一个目标</button>
      </div>`;
    return;
  }

  const goal   = CK.goals.find(g => g.id === CK.activeGoalId);
  if (!goal) return;

  const today  = ckTodayStr();
  const rec    = await ckGetRecordByDate(CK.activeGoalId, today);
  const streak = await ckGetStreak(CK.activeGoalId);
  const total  = await ckGetTotalDays(CK.activeGoalId);
  const color  = goal.color || '#ff8fab';

  const isTimer    = goal.goalType === 'timer';
  const daySched   = ckDaySchedule(goal, today);
  const isRestDay  = isTimer && !daySched.required;
  const targetMins = isRestDay ? 0 : daySched.minutes;
  const loggedMins = rec?.minutesLogged || 0;
  const timerPct   = (isTimer && targetMins > 0) ? Math.min(100, Math.round((loggedMins / targetMins) * 100)) : null;

  const totalItems = (goal.items || []).length;
  const doneItems  = totalItems > 0 ? (goal.items || []).filter(it => rec?.items?.[it.id]) : [];
  const doneCount  = doneItems.length;
  const isPartial  = !!rec && !rec.completed && totalItems > 0 && doneCount > 0;

  let doneHtml = '';
  if (rec?.completed) {
    const completedSub = isTimer
      ? `今日已完成 ${loggedMins} 分钟`
      : (totalItems ? `${doneCount}/${totalItems} 项完成 · ${rec.progress||100}%` : `${rec.progress||100}% 完成`);
    doneHtml = `
      <div class="ck-done-banner">
        <div class="ck-done-stamp" style="--stamp-color:${color}">✓</div>
        <div class="ck-done-text">
          <div class="ck-done-title">今日已打卡！</div>
          <div class="ck-done-sub">${completedSub}</div>
          ${rec.notes ? `<div class="ck-done-notes">"${rec.notes}"</div>` : ''}
        </div>
      </div>
      <div class="ck-action-row">
        <button class="btn-s" onclick="openCkViewModal(null,'${today}')">📝 查看详情</button>
        ${goal.aiEnabled ? `<button class="btn-s" onclick="ckShowAiComment('${CK.activeGoalId}','${today}')">🤖 AI 点评</button>` : ''}
        <button class="btn-s" onclick="openCkGoalModal('${goal.id}')">⚙️ 目标设置</button>
      </div>`;
  } else if (isPartial) {
    const itemsStatusHtml = `<div class="ck-items-preview">${goal.items.map(it => {
      const done = !!rec.items?.[it.id];
      return `<span class="ck-item-chip${done ? ' done' : ''}">${done ? '✅' : '⬜'} ${it.label}</span>`;
    }).join('')}</div>`;
    doneHtml = `
      <div style="padding:6px 0 4px;font-size:13px;color:var(--text2)">
        <strong>${doneCount}/${totalItems}</strong> 项已完成，还差 ${totalItems - doneCount} 项
      </div>
      ${itemsStatusHtml}
      <div class="ck-action-row" style="margin-top:8px">
        <button class="btn-p" onclick="openCkCheckinModal('${today}')">➕ 继续打卡</button>
        <button class="btn-s" onclick="openCkViewModal(null,'${today}')">📝 查看记录</button>
      </div>`;
  } else if (isTimer && loggedMins > 0) {
    // Timer goal in progress (not yet completed)
    doneHtml = `
      <div class="ck-checkin-cta" onclick="openCkCheckinModal('${today}')">
        <div class="ck-cta-left">
          <div class="ck-cta-icon" style="--goal-color:${color}">⏱️</div>
          <div>
            <div class="ck-cta-title">继续计时</div>
            <div class="ck-cta-sub">${isRestDay ? `休息日，已累积 ${loggedMins} 分钟` : `已累积 ${loggedMins} 分钟，目标 ${targetMins} 分钟`}</div>
          </div>
        </div>
        <div class="ck-cta-arrow">›</div>
      </div>
      <div class="ck-timer-progress-wrap">
        <div class="ck-timer-bar-row">
          <div class="ck-timer-bar"><div class="ck-timer-bar-fill" style="width:${timerPct}%;background:${color}"></div></div>
          <span class="ck-timer-label">${isRestDay ? `${loggedMins} 分钟（自由打卡）` : `${loggedMins}/${targetMins} 分钟`}</span>
        </div>
      </div>`;
  } else {
    let itemsPreview = '';
    if (goal.items?.length) {
      itemsPreview = `<div class="ck-items-preview">${goal.items.map(it =>
        `<span class="ck-item-chip">${it.label}</span>`).join('')}</div>`;
    }
    const ctaTitle = isTimer ? '开始计时' : '立即打卡';
    const ctaSub   = isTimer
      ? (isRestDay ? `今天是休息日，可以选择性打卡累积时长` : `今日目标 ${targetMins} 分钟，还没开始哦`)
      : '今天还没打卡哦，坚持是最好的习惯';
    doneHtml = `
      <div class="ck-checkin-cta" onclick="openCkCheckinModal('${today}')">
        <div class="ck-cta-left">
          <div class="ck-cta-icon" style="--goal-color:${color}">${isTimer ? '⏱️' : '📝'}</div>
          <div>
            <div class="ck-cta-title">${ctaTitle}</div>
            <div class="ck-cta-sub">${ctaSub}</div>
          </div>
        </div>
        <div class="ck-cta-arrow">›</div>
      </div>
      ${itemsPreview}`;
  }

  const periodLabel = goal.durationType === 'fixed'
    ? `${goal.durationDays}天挑战`
    : '长期坚持';

  el.innerHTML = `
    <div class="ck-today-card" style="--goal-color:${color}">
      <div class="ck-today-header">
        <div class="ck-today-emoji">${goal.emoji || '🎯'}</div>
        <div class="ck-today-info">
          <div class="ck-today-title">${goal.title}</div>
          <div class="ck-today-period">${periodLabel}</div>
        </div>
        <div class="ck-today-streak">
          <div class="ck-streak-num">${streak}</div>
          <div class="ck-streak-lbl">🔥连续</div>
        </div>
      </div>
      <div class="ck-stats-row">
        <div class="ck-stat-box">
          <span class="ck-stat-num" style="color:${color}">${total}</span>
          <span class="ck-stat-lbl">累计天数</span>
        </div>
        <div class="ck-stat-box">
          <span class="ck-stat-num" style="color:${color}">${streak}</span>
          <span class="ck-stat-lbl">连续坚持</span>
        </div>
        <div class="ck-stat-box">
          <span class="ck-stat-num" style="color:${color}">${ckGetProgress(goal, total)}%</span>
          <span class="ck-stat-lbl">目标进度</span>
        </div>
      </div>
      ${doneHtml}
    </div>`;
}

function ckGetProgress(goal, totalDays) {
  if (goal.durationType !== 'fixed' || !goal.durationDays) return 0;
  return Math.min(100, Math.round(totalDays / goal.durationDays * 100));
}

// ── Streak / Stats ──
async function ckGetStreak(goalId) {
  const records = await ckGetRecords(goalId);
  const goal = CK.goals.find(g => g.id === goalId);
  return ckStreakFromRecords(records, goal);
}

function ckStreakFromRecords(records, goal) {
  const doneSet = new Set(records.filter(r => r.completed).map(r => r.date));
  let streak = 0;
  const now = new Date();
  for (let i = 0; i < 366; i++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const ds = ckDateStr(d);
    if (doneSet.has(ds)) { streak++; }
    else if (goal && !ckDaySchedule(goal, ds).required) { continue; }
    else if (i > 0) { break; }
  }
  return streak;
}

async function ckGetTotalDays(goalId) {
  const records = await ckGetRecords(goalId);
  return records.filter(r => r.completed).length;
}

// ── Badges ──
async function renderCkBadges() {
  const el = $i('ck-badges');
  if (!el || !CK.activeGoalId) return;
  const total = await ckGetTotalDays(CK.activeGoalId);
  const goal  = CK.goals.find(g => g.id === CK.activeGoalId);
  if (!goal) return;

  const color = goal.color || '#ff8fab';
  let html = '<div class="ck-badges-title">🏅 成就徽章</div><div class="ck-badges-grid">';
  CK_MILESTONES.forEach(m => {
    const earned = total >= m.days;
    html += `<div class="ck-badge-card ${earned ? 'earned' : 'locked'}" ${earned ? `style="--badge-color:${color}"` : ''}>
      <div class="ck-badge-emoji">${earned ? m.emoji : '🔒'}</div>
      <div class="ck-badge-days">${m.days}天</div>
      <div class="ck-badge-name">${m.label}</div>
      ${earned ? '<div class="ck-badge-earned-tag">已获得</div>' : ''}
    </div>`;
  });
  html += '</div>';
  el.innerHTML = html;
}

// ══════════════════════════════
//  CHECK-IN MODAL
// ══════════════════════════════
async function openCkCheckinModal(date) {
  const goal = CK.goals.find(g => g.id === CK.activeGoalId);
  if (!goal) { toast('请先选择打卡目标'); return; }
  CK._checkinDate = date;

  const dateLabel   = date === ckTodayStr() ? '今天' : date;
  const existingRec = await ckGetRecordByDate(CK.activeGoalId, date);
  const totalItems  = (goal.items || []).length;
  const doneCount   = totalItems > 0 ? Object.values(existingRec?.items || {}).filter(Boolean).length : 0;
  const isSubsequent = !!existingRec && totalItems > 0 && doneCount < totalItems;

  let itemsHtml = '';
  if (goal.items?.length) {
    const doneItems      = isSubsequent ? goal.items.filter(it => existingRec?.items?.[it.id]) : [];
    const remainingItems = isSubsequent ? goal.items.filter(it => !existingRec?.items?.[it.id]) : goal.items;

    itemsHtml = `<div class="ck-modal-section">
      <div class="ck-modal-section-title">今日分项
        ${isSubsequent ? `<span style="font-size:11px;opacity:.65;font-weight:400">（${doneCount}/${totalItems} 已完成，继续打卡剩余项）</span>` : ''}
      </div>
      <div class="ck-checkin-items">`;
    doneItems.forEach(item => {
      itemsHtml += `<label class="ck-check-label" style="opacity:.5;pointer-events:none">
        <input type="checkbox" id="cki-${item.id}" checked disabled>
        <span class="ck-check-box"></span>
        <span class="ck-check-text">${item.label} ✅</span>
      </label>`;
    });
    remainingItems.forEach(item => {
      itemsHtml += `<label class="ck-check-label">
        <input type="checkbox" id="cki-${item.id}">
        <span class="ck-check-box"></span>
        <span class="ck-check-text">${item.label}</span>
      </label>`;
    });
    itemsHtml += `</div></div>`;
  }

  const prevProgress = existingRec?.progress ?? 100;
  const isTimer    = goal.goalType === 'timer';
  const daySched   = ckDaySchedule(goal, date);
  const isRestDay  = isTimer && !daySched.required;
  const targetMins = isRestDay ? 0 : daySched.minutes;
  const prevMins   = existingRec?.minutesLogged || 0;

  const progressSection = isTimer ? `
    <div class="ck-modal-section">
      <div class="ck-modal-section-title">本次时长</div>
      <div class="ck-progress-row" style="align-items:center;gap:8px">
        <input type="number" id="cki-minutes" value="30" min="0" max="1440"
          style="max-width:90px;background:var(--input-bg);border:1.5px solid var(--border);
                 border-radius:8px;padding:6px 10px;font-size:13px;color:var(--text);
                 font-family:inherit;outline:none"/> 分钟
        <span style="font-size:12px;color:var(--text3)">${isRestDay ? `已累积: ${prevMins} 分钟（休息日，无上限）` : `已累积: ${prevMins}/${targetMins} 分钟`}</span>
      </div>
    </div>` : `
    <div class="ck-modal-section">
      <div class="ck-modal-section-title">完成进度</div>
      <div class="ck-progress-row">
        <input type="range" id="cki-progress" min="0" max="100" step="10" value="${prevProgress}"
          oninput="$i('cki-progress-v').textContent=this.value+'%'"
          style="flex:1;accent-color:${goal.color||'var(--accent)'}"/>
        <span id="cki-progress-v" class="ck-progress-val">${prevProgress}%</span>
      </div>
    </div>`;

  $i('ck-checkin-modal-body').innerHTML = `
    <div class="ck-modal-goal-badge" style="--goal-color:${goal.color||'#ff8fab'}">
      <span>${goal.emoji||'🎯'}</span> ${goal.title}
      <span class="ck-modal-date-tag">${dateLabel}</span>
    </div>
    ${isSubsequent ? `<div style="font-size:12px;color:var(--text3);padding:2px 0 8px">第 ${(existingRec?.submissions?.length||0)+1} 次打卡记录</div>` : ''}
    ${itemsHtml}
    ${progressSection}
    <div class="ck-modal-section">
      <div class="ck-modal-section-title">本次备注 <span style="font-weight:400;opacity:.6">（选填${goal.aiEnabled && goal.aiCommentScopes?.includes('notes') ? '，AI 将参考备注点评' : ''}）</span></div>
      <textarea id="cki-notes" placeholder="今天的感受、遇到的困难、小小成就…" rows="3"
        style="width:100%;resize:vertical;background:var(--input-bg);border:1.5px solid var(--border);
               border-radius:10px;padding:8px 10px;font-size:13px;color:var(--text);
               font-family:inherit;outline:none"></textarea>
    </div>`;

  $i('ck-checkin-modal').classList.add('show');
}

async function doCkCheckin() {
  const goal = CK.goals.find(g => g.id === CK.activeGoalId);
  if (!goal || !CK._checkinDate) return;

  const isTimer    = goal.goalType === 'timer';
  const daySched   = ckDaySchedule(goal, CK._checkinDate);
  const isRestDay  = isTimer && !daySched.required;
  const targetMins = isRestDay ? 0 : daySched.minutes;

  const totalItems = (goal.items || []).length;
  const newItems = {};
  (goal.items || []).forEach(item => {
    newItems[item.id] = $i(`cki-${item.id}`)?.checked ?? false;
  });
  const notes    = ($i('cki-notes')?.value || '').trim();

  const existing = await ckGetRecordByDate(CK.activeGoalId, CK._checkinDate);

  let progress, minutesLogged, completed;
  if (isTimer) {
    const addedMins = parseInt($i('cki-minutes')?.value || '0');
    minutesLogged = (existing?.minutesLogged || 0) + addedMins;
    progress  = isRestDay ? 100 : Math.min(100, Math.round((minutesLogged / targetMins) * 100));
    completed = isRestDay ? minutesLogged > 0 : minutesLogged >= targetMins;
  } else {
    progress  = parseInt($i('cki-progress')?.value ?? '100');
    // Merge items (union — once checked, stays checked)
    const mergedItems_ = { ...(existing?.items || {}), ...Object.fromEntries(
      Object.entries(newItems).filter(([,v]) => v)
    )};
    const doneCount_ = totalItems > 0 ? Object.values(mergedItems_).filter(Boolean).length : 0;
    completed = (totalItems === 0 || doneCount_ >= totalItems) || (totalItems === 0 && progress > 0);
  }

  // Merge items (union — once checked, stays checked)
  const mergedItems = { ...(existing?.items || {}), ...Object.fromEntries(
    Object.entries(newItems).filter(([,v]) => v)
  )};
  const doneCount = totalItems > 0 ? Object.values(mergedItems).filter(Boolean).length : 0;
  const allDone   = totalItems === 0 || doneCount >= totalItems;
  if (!isTimer) completed = allDone || (totalItems === 0 && progress > 0);

  // Append this submission to history
  const submission = { ts: new Date().toISOString(), items: newItems, notes, progress, ...(isTimer ? { minutesThisSession: parseInt($i('cki-minutes')?.value || '0') } : {}) };
  const submissions = [...(existing?.submissions || []), submission];

  const rec = {
    id:          existing?.id || uid(),
    goalId:      CK.activeGoalId,
    date:        CK._checkinDate,
    items:       mergedItems,
    progress:    isTimer ? progress : Math.max(existing?.progress || 0, progress),
    notes,
    submissions,
    completed,
    aiComment:   existing?.aiComment || '',
    completedAt: new Date().toISOString(),
    ...(isTimer ? { minutesLogged } : {}),
  };

  await dbPut('checkinRecords', rec);
  ckSyncRecordUp(rec);
  closeModal('ck-checkin-modal');

  const today = ckTodayStr();
  if (CK._checkinDate === today && !existing?.completed && rec.completed) {
    if (typeof haptic === 'function') haptic([20, 10, 20, 10, 40]);
    await playCkStampAnim(goal);
  } else if (!existing && CK._checkinDate === today) {
    if (typeof haptic === 'function') haptic([8, 5, 8]);
    if (isTimer) {
      toast(`✅ 已记录 ${parseInt($i('cki-minutes')?.value||'0')} 分钟！累计 ${minutesLogged}/${targetMins} 分钟`);
    } else {
      toast(`✅ 已记录！${totalItems > 0 ? `${doneCount}/${totalItems} 项` : `${progress}% 完成`}`);
    }
  } else if (isTimer && rec.completed && !existing?.completed) {
    if (typeof haptic === 'function') haptic([20, 10, 20, 10, 40]);
    await playCkStampAnim(goal);
  }

  await renderCheckinPage();

  if (rec.completed && !existing?.completed) {
    const totalDays = await ckGetTotalDays(CK.activeGoalId);
    const newBadge = CK_MILESTONES.find(m => m.days === totalDays);
    if (newBadge) setTimeout(() => ckShowBadgeUnlock(newBadge), 1600);
    if (goal.aiEnabled && goal.aiEncourageEnabled && S.settings.apiKey) {
      setTimeout(() => ckGenerateAiComment(CK.activeGoalId, CK._checkinDate, rec), 2200);
    }
  }
}

// ══════════════════════════════
//  VIEW RECORD MODAL
// ══════════════════════════════
async function openCkViewModal(rec, date) {
  if (!rec && date) rec = await ckGetRecordByDate(CK.activeGoalId, date);
  if (!rec) return;

  const goal  = CK.goals.find(g => g.id === CK.activeGoalId);
  const color = goal?.color || '#ff8fab';

  let itemsHtml = '';
  if (goal?.items?.length) {
    itemsHtml = '<div class="ck-view-items">';
    goal.items.forEach(it => {
      const done = rec.items?.[it.id];
      itemsHtml += `<div class="ck-view-item ${done ? 'done' : ''}">
        <span class="ck-view-item-icon">${done ? '✅' : '⬜'}</span> ${it.label}</div>`;
    });
    itemsHtml += '</div>';
  }

  $i('ck-view-modal-body').innerHTML = `
    <div class="ck-view-header" style="--goal-color:${color}">
      <span class="ck-view-date">${rec.date}</span>
      <span class="ck-view-completed">✓ 已打卡</span>
    </div>
    <div class="ck-view-progress-wrap">
      <div class="ck-view-progress-bar" style="--pct:${rec.progress||100}%;--bar-color:${color}">
        <div class="ck-view-progress-fill"></div>
      </div>
      <span class="ck-view-progress-label">${rec.progress||100}% 完成</span>
    </div>
    ${itemsHtml}
    ${rec.notes ? `<div class="ck-view-notes">📝 ${rec.notes}</div>` : ''}
    ${rec.submissions?.length > 1 ? `
      <div style="margin:10px 0 4px;font-size:12px;font-weight:700;color:var(--text2)">📋 打卡记录（共 ${rec.submissions.length} 次）</div>
      ${rec.submissions.map((sub, i) => `
        <div style="background:var(--bg2);border-radius:8px;padding:8px 10px;margin-bottom:5px;font-size:12px;">
          <div style="font-weight:700;color:var(--text2);margin-bottom:3px">第 ${i+1} 次 · ${sub.ts ? new Date(sub.ts).toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'}) : ''}</div>
          ${sub.notes ? `<div style="color:var(--text3)">备注：${sub.notes}</div>` : ''}
          ${sub.progress !== undefined ? `<div style="color:var(--text3)">进度：${sub.progress}%</div>` : ''}
        </div>`).join('')}
    ` : ''}
    ${rec.aiComment ? `
      <div class="ck-view-ai-block">
        <div class="ck-view-ai-label">🤖 AI 点评</div>
        <div class="ck-view-ai-text">${rec.aiComment}</div>
      </div>` : ''}
    <div class="mbtns" style="margin-top:14px">
      ${goal?.aiEnabled ? `<button class="btn-s" onclick="ckRegenComment('${rec.goalId}','${rec.date}')">🤖 ${rec.aiComment ? '重新生成' : '生成点评'}</button>` : ''}
      <button class="btn-p" onclick="closeModal('ck-view-modal')">关闭</button>
    </div>`;

  $i('ck-view-modal').classList.add('show');
}

async function ckRegenComment(goalId, date) {
  const rec = await ckGetRecordByDate(goalId, date);
  if (!rec) return;
  toast('AI 正在思考点评…');
  await ckGenerateAiComment(goalId, date, rec);
  openCkViewModal(null, date);
}

// ══════════════════════════════
//  GOAL MODAL (CREATE / EDIT)
// ══════════════════════════════
function openCkGoalModal(goalId) {
  CK._editingGoalId = goalId;
  const g = goalId ? CK.goals.find(x => x.id === goalId) : null;

  $i('ckg-modal-title').innerHTML = (goalId ? '✏️ 编辑目标' : '🎯 新建打卡目标') + ' <button class="mclose" onclick="closeModal(\'ck-goal-modal\')">✕</button>';
  $i('ckg-title').value        = g?.title || '';
  $i('ckg-emoji').value        = g?.emoji || '🎯';
  $i('ckg-color').value        = g?.color || '#ff8fab';
  $i('ckg-duration').value     = g?.durationType || 'ongoing';
  $i('ckg-days').value         = g?.durationDays || 30;
  $i('ckg-ai').checked         = g?.aiEnabled ?? true;
  $i('ckg-encourage').checked  = g?.aiEncourageEnabled ?? true;
  $i('ckg-reminder').checked   = g?.reminderEnabled ?? false;
  // Backward-compat: old single string → array
  const scopes = g?.aiCommentScopes || (g?.aiCommentScope ? [g.aiCommentScope] : ['daily', 'notes']);
  $i('ckg-scope-daily').checked  = scopes.includes('daily');
  $i('ckg-scope-notes').checked  = scopes.includes('notes');
  $i('ckg-scope-items').checked  = scopes.includes('items');
  $i('ckg-scope-streak').checked = scopes.includes('streak');
  $i('ckg-scope-period').checked = scopes.includes('period');
  $i('ckg-prompt-mode').value  = g?.aiPromptMode || 'assistant';
  $i('ckg-custom-prompt').value= g?.customPrompt || '';
  $i('ckg-remind-count').value = g?.reminderCount || 1;

  // Show delete button only when editing
  $i('ckg-delete-btn').style.display = goalId ? 'inline-flex' : 'none';

  const typeEl = $i('ckg-goal-type');
  if (typeEl) typeEl.value = g?.goalType || 'count';
  const targetMinsEl = $i('ckg-target-mins');
  if (targetMinsEl) targetMinsEl.value = g?.targetMinutes || 30;

  ckRenderItems(g?.items || []);
  ckRenderTimes(g?.reminderTimes || ['20:00']);
  ckBuildContactSel(g?.contactId || '');
  ckPreviewContact(g?.contactId || '');
  ckToggleDuration();
  ckToggleGoalType();
  const schedEl = $i('ckg-schedule-type');
  if (schedEl) schedEl.value = g?.scheduleType || 'fixed';
  ckRenderWeekSchedule(g?.weeklySchedule || null);
  ckToggleScheduleType();
  ckToggleAiSection();
  ckToggleReminderSection();
  ckTogglePromptMode();

  $i('ck-goal-modal').classList.add('show');
}

function ckRenderItems(items) {
  const el = $i('ckg-items');
  el.innerHTML = '';
  items.forEach(item => ckAddItemRow(item.id, item.label));
}

function ckAddItemRow(id, val) {
  const el = $i('ckg-items');
  id = id || uid();
  const div = document.createElement('div');
  div.className = 'ckg-item-row';
  div.dataset.id = id;
  div.innerHTML = `
    <span class="ckg-drag-handle">⠿</span>
    <input type="text" value="${val || ''}" placeholder="每日分项目标…"
      style="flex:1;background:var(--input-bg);border:1.5px solid var(--border);
             border-radius:8px;padding:6px 10px;font-size:13px;color:var(--text);
             font-family:inherit;outline:none"/>
    <button class="btn-s" onclick="this.closest('.ckg-item-row').remove()" style="padding:5px 9px;flex-shrink:0">✕</button>`;
  el.appendChild(div);
}

function ckGetItems() {
  return Array.from($i('ckg-items').querySelectorAll('.ckg-item-row'))
    .map(r => ({ id: r.dataset.id, label: r.querySelector('input').value.trim() }))
    .filter(i => i.label);
}

function ckRenderTimes(times) {
  const el = $i('ckg-times');
  el.innerHTML = '';
  times.forEach(t => ckAddTimeRow(t));
}

function ckAddTimeRow(val) {
  const el = $i('ckg-times');
  const div = document.createElement('div');
  div.className = 'ckg-time-row';
  div.innerHTML = `
    <input type="time" value="${val || '20:00'}"
      style="background:var(--input-bg);border:1.5px solid var(--border);border-radius:8px;
             padding:6px 10px;font-size:13px;color:var(--text);font-family:inherit;outline:none"/>
    <button class="btn-s" onclick="this.closest('.ckg-time-row').remove()" style="padding:5px 9px">✕</button>`;
  el.appendChild(div);
}

function ckGetTimes() {
  return Array.from($i('ckg-times').querySelectorAll('input[type=time]'))
    .map(i => i.value).filter(Boolean);
}

function ckBuildContactSel(selId) {
  const sel = $i('ckg-contact');
  sel.innerHTML = '<option value="">（全局默认 AI）</option>';
  Object.values(S._contacts || {}).forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.id;
    opt.textContent = `${typeof c.avatar==='string'&&c.avatar.length<=4?c.avatar:'🤖'} ${c.name}`;
    if (c.id === selId) opt.selected = true;
    sel.appendChild(opt);
  });
}

function ckPreviewContact(contactId) {
  const el = $i('ckg-contact-preview');
  if (!el) return;
  if (!contactId) { el.style.display = 'none'; return; }
  const c = (S._contacts || {})[contactId];
  if (!c) { el.style.display = 'none'; return; }
  const avatar = typeof c.avatar === 'string' && c.avatar.length <= 4 ? c.avatar : '🤖';
  el.style.display = 'block';
  el.textContent = `${avatar} ${c.name}${c.desc ? ' · ' + c.desc : ''}`;
}

function ckToggleDuration() {
  $i('ckg-days-row').style.display = $i('ckg-duration').value === 'fixed' ? 'flex' : 'none';
}
function ckToggleGoalType() {
  const isTimer = ($i('ckg-goal-type')?.value || 'count') === 'timer';
  const schedRow = $i('ckg-schedule-type-row');
  if (schedRow) schedRow.style.display = isTimer ? 'flex' : 'none';
  ckToggleScheduleType();
}

function ckToggleScheduleType() {
  const isTimer = ($i('ckg-goal-type')?.value || 'count') === 'timer';
  const isWeekly = ($i('ckg-schedule-type')?.value || 'fixed') === 'weekly';
  const fixedRow = $i('ckg-target-mins-row');
  const weeklyWrap = $i('ckg-weekly-wrap');
  if (fixedRow) fixedRow.style.display = (isTimer && !isWeekly) ? 'flex' : 'none';
  if (weeklyWrap) weeklyWrap.style.display = (isTimer && isWeekly) ? 'flex' : 'none';
}

function ckRenderWeekSchedule(schedule) {
  const el = $i('ckg-week-grid');
  if (!el) return;
  el.innerHTML = '';
  const DAYS = ['周日','周一','周二','周三','周四','周五','周六'];
  DAYS.forEach((name, dow) => {
    const slot = schedule?.[dow];
    const mins = slot != null ? slot.minutes : (dow === 0 ? 0 : 30);
    const isActive = mins > 0;
    const div = document.createElement('div');
    div.className = 'ckg-week-row';
    div.dataset.dow = dow;
    div.innerHTML = `<span class="ckg-week-day-name">${name}</span>
      <label class="toggle" style="flex-shrink:0"><input type="checkbox" class="ckg-week-active" ${isActive ? 'checked' : ''} onchange="ckUpdateWeekRow(${dow})"><span class="tslider"></span></label>
      <div class="ckg-week-mins-wrap" style="${isActive ? '' : 'visibility:hidden'}"><input type="number" class="ckg-week-mins-input" value="${mins || 30}" min="1" max="1440"> 分钟</div>
      <span class="ckg-week-rest-label" style="${isActive ? 'display:none' : ''}">休息日</span>`;
    el.appendChild(div);
  });
}

function ckUpdateWeekRow(dow) {
  const row = $i('ckg-week-grid')?.querySelector(`[data-dow="${dow}"]`);
  if (!row) return;
  const active = row.querySelector('.ckg-week-active').checked;
  row.querySelector('.ckg-week-mins-wrap').style.visibility = active ? '' : 'hidden';
  row.querySelector('.ckg-week-rest-label').style.display = active ? 'none' : '';
}

function ckGetWeekSchedule() {
  return Array.from($i('ckg-week-grid')?.querySelectorAll('[data-dow]') || []).map(row => {
    const active = row.querySelector('.ckg-week-active').checked;
    const mins = active ? Math.max(1, parseInt(row.querySelector('.ckg-week-mins-input')?.value) || 30) : 0;
    return { minutes: mins };
  });
}
function ckToggleAiSection() {
  const enabled = $i('ckg-ai').checked;
  $i('ckg-ai-section').style.display = enabled ? 'flex' : 'none';
  if (enabled) $i('ckg-ai-details')?.setAttribute('open', '');
}
function ckToggleReminderSection() {
  $i('ckg-reminder-section').style.display = $i('ckg-reminder').checked ? 'block' : 'none';
}
function ckTogglePromptMode() {
  $i('ckg-custom-prompt-row').style.display = $i('ckg-prompt-mode').value === 'custom' ? 'flex' : 'none';
}

async function saveCkGoal() {
  try {
    const title = $i('ckg-title').value.trim();
    if (!title) { toast('请填写目标名称'); return; }

    const existing = CK._editingGoalId ? CK.goals.find(g => g.id === CK._editingGoalId) : null;
    const aiCommentScopes = ['daily','notes','items','streak','period']
      .filter(s => $i(`ckg-scope-${s}`)?.checked);
    const goal = {
      id:                 CK._editingGoalId || uid(),
      title,
      emoji:              $i('ckg-emoji').value || '🎯',
      color:              $i('ckg-color').value || '#ff8fab',
      items:              ckGetItems(),
      durationType:       $i('ckg-duration').value,
      durationDays:       parseInt($i('ckg-days').value || '30'),
      startDate:          existing?.startDate || ckTodayStr(),
      aiEnabled:          $i('ckg-ai').checked,
      aiEncourageEnabled: $i('ckg-encourage').checked,
      aiCommentScopes,
      aiPromptMode:       $i('ckg-prompt-mode').value,
      customPrompt:       $i('ckg-custom-prompt').value.trim(),
      contactId:          $i('ckg-contact').value,
      reminderEnabled:    $i('ckg-reminder').checked,
      reminderTimes:      ckGetTimes(),
      reminderCount:      parseInt($i('ckg-remind-count').value || '1'),
      goalType:           $i('ckg-goal-type')?.value || 'count',
      targetMinutes:      parseInt($i('ckg-target-mins')?.value || '30'),
      scheduleType:       $i('ckg-schedule-type')?.value || 'fixed',
      weeklySchedule:     $i('ckg-schedule-type')?.value === 'weekly' ? ckGetWeekSchedule() : (existing?.weeklySchedule || null),
      createdAt:          existing?.createdAt || new Date().toISOString(),
    };

    await dbPut('checkinGoals', goal);
    ckSyncGoalUp(goal); // cloud sync (non-blocking)

    const idx = CK.goals.findIndex(g => g.id === goal.id);
    if (idx >= 0) CK.goals[idx] = goal;
    else CK.goals.push(goal);

    if (!CK.activeGoalId) CK.activeGoalId = goal.id;

    closeModal('ck-goal-modal');
    setupCheckinReminders();
    if (goal.reminderEnabled) ckSubscribePush();
    await renderCheckinPage();
    toast('✨ 目标已保存！');
  } catch (e) {
    console.error('[saveCkGoal]', e);
    toast('保存失败：' + e.message);
  }
}

async function deleteCkGoal() {
  const gid = CK._editingGoalId;
  if (!gid) return;
  if (!confirm('确定删除这个目标及全部打卡记录？此操作不可撤销。')) return;

  await dbDel('checkinGoals', gid);
  const recs = await ckGetRecords(gid);
  for (const r of recs) await dbDel('checkinRecords', r.id);
  ckDeleteGoalFromCloud(gid); // cloud sync (non-blocking)

  CK.goals = CK.goals.filter(g => g.id !== gid);
  if (CK.activeGoalId === gid) CK.activeGoalId = CK.goals[0]?.id || null;

  closeModal('ck-goal-modal');
  await renderCheckinPage();
  toast('目标已删除');
}

// ── 更多操作菜单 ──
function openCkMoreMenu(event) {
  const items = [
    { label: '⚙️ 编辑目标', action: () => openCkGoalModal(CK.activeGoalId) },
    { label: '📤 导出记录', action: () => openCkExportModal() },
    { label: '📋 查看打卡历史', action: () => openCkViewModal(null, ckTodayStr()) },
  ];
  if (typeof openCtxMenuFromItems === 'function') {
    openCtxMenuFromItems(event, items);
  } else {
    // fallback: simple prompt
    const opts = items.map((it,i) => `${i+1}. ${it.label}`).join('\n');
    const choice = parseInt(window.prompt('选择操作：\n'+opts)) - 1;
    if (choice >= 0 && choice < items.length) items[choice].action();
  }
}

function openCkExportModal() {
  const goal = CK.goals.find(g => g.id === CK.activeGoalId);
  if (!goal) { if (typeof toast === 'function') toast('请先选择打卡目标'); return; }
  const nameEl = document.getElementById('ck-export-goal-name');
  if (nameEl) nameEl.textContent = `${goal.emoji || '🎯'} ${goal.title}`;
  document.getElementById('ck-export-modal')?.classList.add('show');
}

async function exportCkData(format) {
  const goal = CK.goals.find(g => g.id === CK.activeGoalId);
  if (!goal) return;
  const records = await ckGetRecords(CK.activeGoalId);
  records.sort((a, b) => a.date.localeCompare(b.date));
  if (typeof closeModal === 'function') closeModal('ck-export-modal');

  const totalDays = records.filter(r => r.completed).length;
  const streak    = ckStreakFromRecords(records);

  let content, mime, filename;
  const safeTitle = goal.title.replace(/[\\/:*?"<>|]/g, '_');

  if (format === 'json') {
    content  = JSON.stringify({ goal, records }, null, 2);
    mime     = 'application/json';
    filename = `打卡_${safeTitle}_${new Date().toISOString().slice(0,10)}.json`;
  } else if (format === 'csv') {
    const esc = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const rows = [['日期','是否完成','进度(%)','备注','打卡次数','AI点评']];
    records.forEach(r => rows.push([r.date, r.completed?'是':'否', r.progress??100, r.notes||'', r.submissions?.length||1, r.aiComment||'']));
    content  = '﻿' + rows.map(r => r.map(esc).join(',')).join('\r\n');
    mime     = 'text/csv;charset=utf-8';
    filename = `打卡_${safeTitle}_${new Date().toISOString().slice(0,10)}.csv`;
  } else if (format === 'markdown') {
    content  = `# ${goal.emoji||'🎯'} ${goal.title}\n\n`;
    content += `> 开始：${goal.startDate} | 累计 **${totalDays}** 天 | 连续 **${streak}** 天\n\n`;
    content += `## 打卡记录\n\n`;
    content += `| 日期 | 状态 | 进度 | 备注 |\n|------|------|------|------|\n`;
    records.forEach(r => {
      content += `| ${r.date} | ${r.completed?'✅ 完成':'🔲'} | ${r.progress??100}% | ${r.notes||''} |\n`;
    });
    mime     = 'text/markdown;charset=utf-8';
    filename = `打卡_${safeTitle}_${new Date().toISOString().slice(0,10)}.md`;
  } else if (format === 'html') {
    const rows = records.map(r => `
      <tr>
        <td>${r.date}</td><td class="${r.completed?'done':''}">${r.completed?'✅ 完成':'🔲'}</td>
        <td>${r.progress??100}%</td><td>${r.notes||''}</td>
        <td style="font-size:11px;color:#888">${r.aiComment||''}</td>
      </tr>`).join('');
    content = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${goal.title} 打卡记录</title>
<style>body{font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:820px;margin:0 auto;padding:24px;color:#333}
h1{color:#e91e63;margin-bottom:4px}.stats{background:#fdf0f5;padding:10px 16px;border-radius:8px;margin:12px 0;font-size:13px}
table{width:100%;border-collapse:collapse;margin-top:16px}th,td{padding:8px 10px;text-align:left;border-bottom:1px solid #eee;font-size:13px}
th{background:#fdf0f5;font-weight:600}.done{color:#27ae60}
.btn{background:#e91e63;color:#fff;border:none;padding:8px 18px;border-radius:8px;cursor:pointer;font-size:13px;margin:10px 4px 0 0}
@media print{.btn{display:none}}</style></head><body>
<h1>${goal.emoji||'🎯'} ${goal.title}</h1>
<div class="stats">开始日期：${goal.startDate} &nbsp;·&nbsp; 累计打卡 <strong>${totalDays}</strong> 天 &nbsp;·&nbsp; 当前连续 <strong>${streak}</strong> 天</div>
<button class="btn" onclick="window.print()">🖨️ 打印</button>
<table><tr><th>日期</th><th>状态</th><th>进度</th><th>备注</th><th>AI点评</th></tr>${rows}</table>
</body></html>`;
    mime     = 'text/html;charset=utf-8';
    filename = `打卡_${safeTitle}_${new Date().toISOString().slice(0,10)}.html`;
  }

  const blob = new Blob([content], { type: mime });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 8000);
  if (typeof toast === 'function') toast(`✅ 已导出 ${format.toUpperCase()}`);
}

// ── 陪伴计时自动打卡 ──
async function ckAddCompanionMinutes(goalId, minutes) {
  const goal = (await ckGetGoals()).find(g => g.id === goalId);
  if (!goal) return;
  const today = ckTodayStr();
  const existing = await ckGetRecordByDate(goalId, today);
  const prevMins = existing?.minutesLogged || 0;
  const newMins  = prevMins + minutes;
  const targetMins = goal.targetMinutes || 30;
  const wasCompleted = existing?.completed || false;
  const nowCompleted = newMins >= targetMins;
  const s = window.S;
  const aiName = (s?.settings?.companionContactId ? s?._contacts?.[s.settings.companionContactId]?.name : null) || s?.settings?.aiName || 'AI';
  const notesEntry = `在${aiName}的陪伴下${goal.title}了${minutes}分钟`;

  const rec = {
    id:          existing?.id || (typeof uid === 'function' ? uid() : Date.now().toString()),
    goalId,
    date:        today,
    items:       existing?.items || {},
    progress:    nowCompleted ? 100 : Math.round((newMins / targetMins) * 100),
    notes:       existing?.notes || notesEntry,
    submissions: [...(existing?.submissions || []), { ts: new Date().toISOString(), notes: notesEntry, progress: Math.round((newMins/targetMins)*100), minutesThisSession: minutes }],
    completed:   nowCompleted,
    minutesLogged: newMins,
    aiComment:   existing?.aiComment || '',
    completedAt: new Date().toISOString(),
  };

  if (typeof dbPut === 'function') await dbPut('checkinRecords', rec);
  if (typeof ckSyncRecordUp === 'function') ckSyncRecordUp(rec);

  if (typeof toast === 'function') {
    if (nowCompleted && !wasCompleted) {
      toast(`🎉 在${aiName}的陪伴下完成了「${goal.title}」${newMins}分钟目标！已自动打卡！`);
    } else {
      toast(`✅ 在${aiName}陪伴下${goal.title}了${minutes}分钟，进度：${newMins}/${targetMins}分钟`);
    }
  }

  if (typeof renderCkTodaySection === 'function' && document.getElementById('ck-today-section')) {
    CK.goals = await ckGetGoals();
    await renderCkTodaySection();
  }
}

// ══════════════════════════════
//  ANIMATION: STAMP + CONFETTI
// ══════════════════════════════
async function playCkStampAnim(goal) {
  return new Promise(resolve => {
    const overlay = $i('ck-anim-overlay');
    const stamp   = $i('ck-stamp');
    const canvas  = $i('ck-confetti');
    const color   = goal.color || '#ff8fab';

    stamp.style.setProperty('--stamp-color', color);
    stamp.innerHTML = `
      <div class="ck-stamp-ring"></div>
      <div class="ck-stamp-content">
        <div class="ck-stamp-check">✓</div>
        <div class="ck-stamp-text">打卡成功</div>
        <div class="ck-stamp-date">${ckTodayStr()}</div>
      </div>`;

    overlay.classList.add('show');
    stamp.classList.remove('stamp-in');
    void stamp.offsetWidth;
    stamp.classList.add('stamp-in');

    setTimeout(() => ckStartConfetti(canvas, color), 500);

    setTimeout(() => {
      overlay.classList.remove('show');
      stamp.classList.remove('stamp-in');
      ckStopConfetti();
      resolve();
    }, 3200);
  });
}

function ckStartConfetti(canvas, primaryColor) {
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
  const ctx = canvas.getContext('2d');
  const palette = [primaryColor, '#ff8fab', '#ffd700', '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7', '#dda0dd'];

  CK._confettiParticles = Array.from({ length: 140 }, (_, i) => ({
    x:    Math.random() * canvas.width,
    y:    -10 - Math.random() * 150,
    vx:   (Math.random() - 0.5) * 5,
    vy:   1.5 + Math.random() * 4,
    rot:  Math.random() * 360,
    rotV: (Math.random() - 0.5) * 10,
    w:    5 + Math.random() * 9,
    h:    3 + Math.random() * 5,
    color: palette[Math.floor(Math.random() * palette.length)],
    shape: i % 3 === 0 ? 'circle' : 'rect',
    alpha: 1,
  }));

  const draw = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    CK._confettiParticles.forEach(p => {
      p.x += p.vx; p.y += p.vy; p.vy += 0.06; p.rot += p.rotV;
      if (p.y > canvas.height * 0.85) p.alpha -= 0.03;
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.alpha);
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot * Math.PI / 180);
      ctx.fillStyle = p.color;
      if (p.shape === 'circle') {
        ctx.beginPath(); ctx.arc(0, 0, p.w / 2, 0, Math.PI * 2); ctx.fill();
      } else {
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      }
      ctx.restore();
    });
    CK._confettiParticles = CK._confettiParticles.filter(p => p.alpha > 0);
    if (CK._confettiParticles.length) CK._confettiRaf = requestAnimationFrame(draw);
  };
  CK._confettiRaf = requestAnimationFrame(draw);
}

function ckStopConfetti() {
  if (CK._confettiRaf) { cancelAnimationFrame(CK._confettiRaf); CK._confettiRaf = null; }
  const canvas = $i('ck-confetti');
  if (canvas) canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
  CK._confettiParticles = [];
}

// ── Badge Unlock ──
function ckShowBadgeUnlock(m) {
  const el = $i('ck-badge-unlock');
  el.innerHTML = `
    <div class="ck-badge-unlock-box">
      <div class="ck-bul-sparkle">✨</div>
      <div class="ck-bul-emoji">${m.emoji}</div>
      <div class="ck-bul-title">解锁成就！</div>
      <div class="ck-bul-name">${m.label}</div>
      <div class="ck-bul-days">坚持打卡 ${m.days} 天</div>
    </div>`;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 4500);
}

// ── AI Comment Toast ──
function ckShowCommentToast(comment, goal) {
  const el = $i('ck-ai-toast');
  if (!el) return;
  el.innerHTML = `
    <div class="ck-ai-toast-hdr">
      <span>🤖 AI 点评</span>
      <button onclick="$i('ck-ai-toast').classList.remove('show')">✕</button>
    </div>
    <div class="ck-ai-toast-body">${comment}</div>`;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 9000);
}

// ══════════════════════════════
//  AI COMMENT
// ══════════════════════════════
async function ckGenerateAiComment(goalId, date, rec) {
  const goal = CK.goals.find(g => g.id === goalId);
  if (!goal?.aiEnabled) return;

  const s = S.settings;
  const contact = goal.contactId ? (S._contacts || {})[goal.contactId] : null;
  const apiKey  = contact?.apiKey || s.apiKey;
  const apiUrl  = contact?.apiUrl || s.apiUrl || 'https://openrouter.ai/api/v1/chat/completions';
  const model   = contact?.model || s.model || 'openai/gpt-4o';
  if (!apiKey) return;

  if (!rec) rec = await ckGetRecordByDate(goalId, date);
  if (!rec) return;

  const total  = await ckGetTotalDays(goalId);
  const streak = await ckGetStreak(goalId);
  // Support both old single-string and new multi-scope array
  const scopes = goal.aiCommentScopes?.length
    ? goal.aiCommentScopes
    : [goal.aiCommentScope || 'daily'];

  const itemsSummary = (goal.items || []).map(it =>
    `${it.label}：${rec.items?.[it.id] ? '✅' : '❌'}`).join('，') || '';

  let prompt = '';
  if (goal.aiPromptMode === 'custom' && goal.customPrompt?.trim()) {
    prompt = goal.customPrompt
      .replace(/{goal}/g,     goal.title)
      .replace(/{date}/g,     date)
      .replace(/{streak}/g,   streak)
      .replace(/{total}/g,    total)
      .replace(/{progress}/g, rec.progress || 100)
      .replace(/{notes}/g,    rec.notes || '无')
      .replace(/{items}/g,    itemsSummary || '无');
  } else {
    const parts = [];

    // base context always included
    parts.push(`用户正在执行「${goal.title}」打卡目标。${date} 完成打卡，完成度 ${rec.progress||100}%，累计 ${total} 天，连续 ${streak} 天。`);

    if (scopes.includes('items') && itemsSummary) {
      parts.push(`分项完成情况：${itemsSummary}。`);
    }
    if (scopes.includes('notes') && rec.notes) {
      parts.push(`用户今日备注：「${rec.notes}」。`);
    }

    const instructions = [];
    if (scopes.includes('daily')) {
      instructions.push('给出今日简短鼓励点评');
    }
    if (scopes.includes('notes') && rec.notes) {
      instructions.push('对用户备注内容作简短回应');
    }
    if (scopes.includes('items') && itemsSummary) {
      instructions.push('对各分项完成情况逐一点评');
    }
    if (scopes.includes('streak') && CK_MILESTONES.some(m => m.days === streak)) {
      instructions.push(`庆祝连续 ${streak} 天里程碑，要有仪式感`);
    }
    if (scopes.includes('period') && total > 0 && total % 10 === 0) {
      instructions.push(`做第 ${total} 天的阶段性总结`);
    }

    if (!instructions.length) instructions.push('给出今日简短鼓励点评');

    parts.push(`请${instructions.join('，并')}，语气温暖活泼，总长度 80 字以内。`);
    prompt = parts.join('');
  }

  try {
    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://raimos.app',
        'X-Title': 'Raimos',
      },
      body: JSON.stringify({
        model,
        messages: [
          ...(contact?.system ? [{ role: 'system', content: contact.system }] : []),
          { role: 'user', content: prompt },
        ],
        temperature: 0.92,
        max_tokens: 300,
      }),
    });
    if (!res.ok) return;
    const data    = await res.json();
    const comment = data.choices?.[0]?.message?.content?.trim();
    if (!comment) return;

    const updated = await ckGetRecordByDate(goalId, date);
    if (updated) {
      updated.aiComment = comment;
      await dbPut('checkinRecords', updated);
    }
    ckShowCommentToast(comment, goal);
  } catch { /* silent */ }
}

async function ckShowAiComment(goalId, date) {
  const rec = await ckGetRecordByDate(goalId, date);
  const goal = CK.goals.find(g => g.id === goalId);
  if (!rec) return;

  if (rec.aiComment) {
    ckShowCommentToast(rec.aiComment, goal);
  } else {
    toast('AI 点评生成中…');
    await ckGenerateAiComment(goalId, date, rec);
  }
}

// ══════════════════════════════
//  REMINDERS
// ══════════════════════════════

// 1. in-page setTimeout (app open)
// 2. SW Periodic Background Sync (Android Chrome PWA, app closed)
// 3. catch-up on open (missed reminder detected on app launch)

function setupCheckinReminders() {
  // ── Clear existing timers ──
  CK.reminderTimers.forEach(t => clearTimeout(t));
  CK.reminderTimers = [];

  CK.goals.forEach(goal => {
    if (!goal.reminderEnabled || !goal.reminderTimes?.length) return;
    goal.reminderTimes.forEach(timeStr => {
      const [hh, mm] = timeStr.split(':').map(Number);
      const now    = new Date();
      const target = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hh, mm, 0);
      if (target <= now) target.setDate(target.getDate() + 1);
      const delay = target - now;
      const t = setTimeout(async () => {
        const today = ckTodayStr();
        const rec   = await ckGetRecordByDate(goal.id, today);
        if (!rec?.completed) ckFireReminder(goal);
        setupCheckinReminders();
      }, delay);
      CK.reminderTimers.push(t);
    });
  });

  // ── Sync reminder schedule to Service Worker ──
  ckSyncRemindersToSW();

  // ── Register Periodic Background Sync (Android Chrome PWA) ──
  ckRegisterPeriodicSync();
}

// Push the reminder list into the SW via postMessage
// The SW stores it in Cache Storage and uses it when periodicsync fires
function ckSyncRemindersToSW() {
  if (!navigator.serviceWorker?.controller) return;
  const reminders = CK.goals
    .filter(g => g.reminderEnabled && g.reminderTimes?.length)
    .map(g => ({ goalId: g.id, title: g.title, emoji: g.emoji, times: g.reminderTimes }));
  navigator.serviceWorker.controller.postMessage({ type: 'SET_CK_REMINDERS', reminders });
}

// Register periodicsync so SW can wake every ~hour when PWA is installed
async function ckRegisterPeriodicSync() {
  try {
    const reg = await navigator.serviceWorker?.ready;
    if (!reg?.periodicSync) return;
    const status = await navigator.permissions.query({ name: 'periodic-background-sync' });
    if (status.state !== 'granted') return;
    await reg.periodicSync.register('checkin-reminder', { minInterval: 60 * 60 * 1000 });
  } catch { /* not supported */ }
}

// On app open: check if any reminder time already passed today and goal not checked in
// This handles the case where the app was closed during reminder time
async function ckCatchUpReminders() {
  const now   = new Date();
  const hhmm  = now.getHours() * 60 + now.getMinutes();
  const today = ckTodayStr();

  for (const goal of CK.goals) {
    if (!goal.reminderEnabled || !goal.reminderTimes?.length) continue;
    const rec = await ckGetRecordByDate(goal.id, today);
    if (rec?.completed) continue;

    // Any reminder time that already passed today (within last 4 hours)?
    const fired = goal.reminderTimes.some(t => {
      const [hh, mm] = t.split(':').map(Number);
      const tMins = hh * 60 + mm;
      return tMins <= hhmm && hhmm - tMins <= 240;
    });
    if (fired) ckFireReminder(goal);
  }
}

function ckFireReminder(goal) {
  const ptostTxt = $i('ptost-txt');
  const ptost    = $i('ptost');
  if (ptostTxt && ptost) {
    ptostTxt.textContent = `⏰ 别忘了「${goal.title}」打卡！`;
    ptost.classList.add('show');
    setTimeout(() => ptost.classList.remove('show'), 6000);
  }
  if (Notification?.permission === 'granted') {
    try {
      self?.registration?.showNotification?.('Raimos 打卡提醒', {
        body: `「${goal.title}」今天还没打卡哦，加油坚持！`,
        icon: '/icon-192.png',
        tag:  'ck-reminder-' + goal.id,
      });
    } catch {}
    try {
      new Notification('Raimos 打卡提醒', {
        body: `「${goal.title}」今天还没打卡哦，加油坚持！`,
        icon: '/icon-192.png',
        tag:  'ck-reminder-' + goal.id,
      });
    } catch {}
  }
}

async function ckRequestNotifPerm() {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'default') await Notification.requestPermission();
}

// ══════════════════════════════
//  UTIL
// ══════════════════════════════
function ckTodayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function ckDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

// ══════════════════════════════
//  CLOUD SYNC (Firestore)
// ══════════════════════════════
// Only active when the user is logged in (_fbUser set by Firebase SDK in index.html)

function ckUid()       { return window._fbUser?.uid || null; }
function ckIsLoggedIn(){ return !!ckUid(); }

function ckFbDoc(path) {
  return window._fbLib.doc(window._fbDb, path);
}
function ckFbCol(path) {
  return window._fbLib.collection(window._fbDb, path);
}

// Upload one goal to Firestore
async function ckSyncGoalUp(goal) {
  if (!ckIsLoggedIn()) return;
  try {
    await window._fbLib.setDoc(ckFbDoc(`users/${ckUid()}/checkinGoals/${goal.id}`), goal);
  } catch(e) { console.warn('[CK] syncGoal failed', e.message); }
}

// Upload one record to Firestore
async function ckSyncRecordUp(record) {
  if (!ckIsLoggedIn()) return;
  try {
    await window._fbLib.setDoc(ckFbDoc(`users/${ckUid()}/checkinRecords/${record.id}`), record);
  } catch(e) { console.warn('[CK] syncRecord failed', e.message); }
}

// Delete goal + records from Firestore
async function ckDeleteGoalFromCloud(goalId) {
  if (!ckIsLoggedIn()) return;
  try {
    await window._fbLib.deleteDoc(ckFbDoc(`users/${ckUid()}/checkinGoals/${goalId}`));
    const snap = await window._fbLib.getDocs(
      window._fbLib.query(
        ckFbCol(`users/${ckUid()}/checkinRecords`),
        window._fbLib.where('goalId', '==', goalId)
      )
    );
    for (const d of snap.docs) {
      await window._fbLib.deleteDoc(d.ref);
    }
  } catch(e) { console.warn('[CK] deleteFromCloud failed', e.message); }
}

// Load goals + records from Firestore and merge into local IndexedDB
async function ckLoadFromCloud() {
  if (!ckIsLoggedIn()) return;
  try {
    // Goals
    const goalsSnap = await window._fbLib.getDocs(ckFbCol(`users/${ckUid()}/checkinGoals`));
    for (const d of goalsSnap.docs) {
      const goal = d.data();
      await dbPut('checkinGoals', goal);
      const idx = CK.goals.findIndex(g => g.id === goal.id);
      if (idx >= 0) CK.goals[idx] = goal;
      else CK.goals.push(goal);
    }

    // Records — last 120 days only to keep it fast
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 120);
    const cutoffStr = cutoff.toISOString().slice(0, 10);

    const recsSnap = await window._fbLib.getDocs(ckFbCol(`users/${ckUid()}/checkinRecords`));
    for (const d of recsSnap.docs) {
      const rec = d.data();
      if (rec.date >= cutoffStr) await dbPut('checkinRecords', rec);
    }

    if (CK.goals.length && !CK.activeGoalId) CK.activeGoalId = CK.goals[0].id;
  } catch(e) { console.warn('[CK] loadFromCloud failed', e.message); }
}

// ══════════════════════════════
//  WEB PUSH SUBSCRIPTION
// ══════════════════════════════

// Call this when the user enables reminders on any goal
async function ckSubscribePush() {
  if (!ckIsLoggedIn()) return;
  const backendUrl = (window.S?.settings?.backendUrl || '').trim();
  if (!backendUrl) return;

  try {
    // 1. Get VAPID public key from our backend
    const keyRes = await fetch(`${backendUrl}/vapid-public-key`);
    if (!keyRes.ok) return;
    const { publicKey } = await keyRes.json();
    if (!publicKey) return;

    // 2. Request notification permission
    if (Notification?.permission === 'default') {
      await Notification.requestPermission();
    }
    if (Notification?.permission !== 'granted') return;

    // 3. Subscribe via Service Worker
    const reg = await navigator.serviceWorker?.ready;
    if (!reg?.pushManager) return;

    const existing = await reg.pushManager.getSubscription();
    const sub = existing || await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: ckUrlBase64ToUint8Array(publicKey),
    });

    // 4. POST subscription to backend → saved in Firestore
    await fetch(`${backendUrl}/push/subscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid: ckUid(), subscription: sub.toJSON() }),
    });
  } catch(e) { console.warn('[CK] subscribePush failed', e.message); }
}

function ckUrlBase64ToUint8Array(b64) {
  const pad  = '='.repeat((4 - b64.length % 4) % 4);
  const raw  = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}
