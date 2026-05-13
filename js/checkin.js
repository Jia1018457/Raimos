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

// ══════════════════════════════
//  INIT
// ══════════════════════════════
async function initCheckin() {
  CK.goals = await ckGetGoals();
  if (CK.goals.length && !CK.activeGoalId) CK.activeGoalId = CK.goals[0].id;
  setupCheckinReminders();
  // Catch up any missed reminders from when the app was closed
  await ckCatchUpReminders();
}

// ══════════════════════════════
//  PAGE RENDER
// ══════════════════════════════
async function renderCheckinPage() {
  CK.goals = await ckGetGoals();
  if (CK.goals.length && !CK.activeGoalId) CK.activeGoalId = CK.goals[0].id;

  const editBtn = $i('ck-edit-goal-btn');
  if (editBtn) editBtn.style.display = CK.activeGoalId ? 'inline-flex' : 'none';

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
  const editBtn = $i('ck-edit-goal-btn');
  if (editBtn) editBtn.style.display = goalId ? 'inline-flex' : 'none';
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
  const streak       = ckStreakFromRecords(records);

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
    const done = !!rec?.completed;
    const isToday  = ds === today;
    const isFuture = ds > today;

    let cls = 'ck-cal-cell';
    if (isToday) cls += ' today';
    if (done)    cls += ' checked';
    if (isFuture)cls += ' future';

    const bgStyle = done ? `style="--cell-color:${color}"` : '';
    html += `<div class="${cls}" ${bgStyle} onclick="ckCellClick('${ds}')">
      <span class="ck-cell-day">${d}</span>
      ${done ? `<span class="ck-cell-mark">✓</span>` : ''}
      ${isToday && !done ? `<span class="ck-cell-today-dot"></span>` : ''}
    </div>`;
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

  let doneHtml = '';
  if (rec?.completed) {
    const itemsDone = (goal.items || []).filter(it => rec.items?.[it.id]).length;
    const itemsTotal = (goal.items || []).length;
    doneHtml = `
      <div class="ck-done-banner">
        <div class="ck-done-stamp" style="--stamp-color:${color}">✓</div>
        <div class="ck-done-text">
          <div class="ck-done-title">今日已打卡！</div>
          ${itemsTotal ? `<div class="ck-done-sub">${itemsDone}/${itemsTotal} 项完成 · ${rec.progress||100}%</div>` : `<div class="ck-done-sub">${rec.progress||100}% 完成</div>`}
          ${rec.notes ? `<div class="ck-done-notes">"${rec.notes}"</div>` : ''}
        </div>
      </div>
      <div class="ck-action-row">
        <button class="btn-s" onclick="openCkViewModal(null,'${today}')">📝 查看详情</button>
        ${goal.aiEnabled ? `<button class="btn-s" onclick="ckShowAiComment('${CK.activeGoalId}','${today}')">🤖 AI 点评</button>` : ''}
        <button class="btn-s" onclick="openCkGoalModal('${goal.id}')">⚙️ 目标设置</button>
      </div>`;
  } else {
    let itemsPreview = '';
    if (goal.items?.length) {
      itemsPreview = `<div class="ck-items-preview">${goal.items.map(it =>
        `<span class="ck-item-chip">${it.label}</span>`).join('')}</div>`;
    }
    doneHtml = `
      <div class="ck-checkin-cta" onclick="openCkCheckinModal('${today}')">
        <div class="ck-cta-left">
          <div class="ck-cta-icon" style="--goal-color:${color}">📝</div>
          <div>
            <div class="ck-cta-title">立即打卡</div>
            <div class="ck-cta-sub">今天还没打卡哦，坚持是最好的习惯</div>
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
  return ckStreakFromRecords(records);
}

function ckStreakFromRecords(records) {
  const doneSet = new Set(records.filter(r => r.completed).map(r => r.date));
  let streak = 0;
  const now = new Date();
  for (let i = 0; i < 366; i++) {
    const d = new Date(now); d.setDate(d.getDate() - i);
    const ds = d.toISOString().slice(0, 10);
    if (doneSet.has(ds)) { streak++; }
    else if (i > 0) break;
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

  const dateLabel = date === ckTodayStr() ? '今天' : date;
  const existingRec = await ckGetRecordByDate(CK.activeGoalId, date);

  let itemsHtml = '';
  if (goal.items?.length) {
    itemsHtml = `<div class="ck-modal-section">
      <div class="ck-modal-section-title">今日分项</div>
      <div class="ck-checkin-items">`;
    goal.items.forEach(item => {
      const checked = existingRec?.items?.[item.id] ?? false;
      itemsHtml += `<label class="ck-check-label">
        <input type="checkbox" id="cki-${item.id}" ${checked ? 'checked' : ''}>
        <span class="ck-check-box"></span>
        <span class="ck-check-text">${item.label}</span>
      </label>`;
    });
    itemsHtml += `</div></div>`;
  }

  const prevProgress = existingRec?.progress ?? 100;
  const prevNotes    = existingRec?.notes ?? '';

  $i('ck-checkin-modal-body').innerHTML = `
    <div class="ck-modal-goal-badge" style="--goal-color:${goal.color||'#ff8fab'}">
      <span>${goal.emoji||'🎯'}</span> ${goal.title}
      <span class="ck-modal-date-tag">${dateLabel}</span>
    </div>
    ${itemsHtml}
    <div class="ck-modal-section">
      <div class="ck-modal-section-title">完成进度</div>
      <div class="ck-progress-row">
        <input type="range" id="cki-progress" min="0" max="100" step="10" value="${prevProgress}"
          oninput="$i('cki-progress-v').textContent=this.value+'%'"
          style="flex:1;accent-color:${goal.color||'var(--accent)'}"/>
        <span id="cki-progress-v" class="ck-progress-val">${prevProgress}%</span>
      </div>
    </div>
    <div class="ck-modal-section">
      <div class="ck-modal-section-title">打卡备注 <span style="font-weight:400;opacity:.6">（选填）</span></div>
      <textarea id="cki-notes" placeholder="今天的感受、遇到的困难、小小成就…" rows="3"
        style="width:100%;resize:vertical;background:var(--input-bg);border:1.5px solid var(--border);
               border-radius:10px;padding:8px 10px;font-size:13px;color:var(--text);
               font-family:inherit;outline:none">${prevNotes}</textarea>
    </div>`;

  $i('ck-checkin-modal').classList.add('show');
}

async function doCkCheckin() {
  const goal = CK.goals.find(g => g.id === CK.activeGoalId);
  if (!goal || !CK._checkinDate) return;

  const items = {};
  let completedCount = 0;
  (goal.items || []).forEach(item => {
    const checked = $i(`cki-${item.id}`)?.checked ?? false;
    items[item.id] = checked;
    if (checked) completedCount++;
  });

  const progress = parseInt($i('cki-progress')?.value ?? '100');
  const notes    = $i('cki-notes')?.value.trim() || '';

  const existing = await ckGetRecordByDate(CK.activeGoalId, CK._checkinDate);
  const rec = {
    id:          existing?.id || uid(),
    goalId:      CK.activeGoalId,
    date:        CK._checkinDate,
    items,
    progress,
    notes,
    completed:   true,
    aiComment:   existing?.aiComment || '',
    completedAt: new Date().toISOString(),
  };

  await dbPut('checkinRecords', rec);
  closeModal('ck-checkin-modal');

  const today = ckTodayStr();
  if (CK._checkinDate === today) {
    await playCkStampAnim(goal);
  }

  await renderCheckinPage();

  const totalDays  = await ckGetTotalDays(CK.activeGoalId);
  const newBadge   = CK_MILESTONES.find(m => m.days === totalDays);
  if (newBadge) setTimeout(() => ckShowBadgeUnlock(newBadge), 1600);

  if (goal.aiEnabled && goal.aiEncourageEnabled && S.settings.apiKey) {
    setTimeout(() => ckGenerateAiComment(CK.activeGoalId, CK._checkinDate, rec), 2200);
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

  $i('ckg-modal-title').textContent = goalId ? '✏️ 编辑目标' : '🎯 新建打卡目标';
  $i('ckg-title').value        = g?.title || '';
  $i('ckg-emoji').value        = g?.emoji || '🎯';
  $i('ckg-color').value        = g?.color || '#ff8fab';
  $i('ckg-duration').value     = g?.durationType || 'ongoing';
  $i('ckg-days').value         = g?.durationDays || 30;
  $i('ckg-ai').checked         = g?.aiEnabled ?? true;
  $i('ckg-encourage').checked  = g?.aiEncourageEnabled ?? true;
  $i('ckg-reminder').checked   = g?.reminderEnabled ?? false;
  $i('ckg-scope').value        = g?.aiCommentScope || 'daily';
  $i('ckg-prompt-mode').value  = g?.aiPromptMode || 'assistant';
  $i('ckg-custom-prompt').value= g?.customPrompt || '';
  $i('ckg-remind-count').value = g?.reminderCount || 1;

  // Show delete button only when editing
  $i('ckg-delete-btn').style.display = goalId ? 'inline-flex' : 'none';

  ckRenderItems(g?.items || []);
  ckRenderTimes(g?.reminderTimes || ['20:00']);
  ckBuildContactSel(g?.contactId || '');
  ckToggleDuration();
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

function ckToggleDuration() {
  $i('ckg-days-row').style.display = $i('ckg-duration').value === 'fixed' ? 'flex' : 'none';
}
function ckToggleAiSection() {
  $i('ckg-ai-section').style.display = $i('ckg-ai').checked ? 'block' : 'none';
}
function ckToggleReminderSection() {
  $i('ckg-reminder-section').style.display = $i('ckg-reminder').checked ? 'block' : 'none';
}
function ckTogglePromptMode() {
  $i('ckg-custom-prompt-row').style.display = $i('ckg-prompt-mode').value === 'custom' ? 'flex' : 'none';
}

async function saveCkGoal() {
  const title = $i('ckg-title').value.trim();
  if (!title) { toast('请填写目标名称'); return; }

  const existing = CK._editingGoalId ? CK.goals.find(g => g.id === CK._editingGoalId) : null;
  const goal = {
    id:               CK._editingGoalId || uid(),
    title,
    emoji:            $i('ckg-emoji').value || '🎯',
    color:            $i('ckg-color').value || '#ff8fab',
    items:            ckGetItems(),
    durationType:     $i('ckg-duration').value,
    durationDays:     parseInt($i('ckg-days').value || '30'),
    startDate:        existing?.startDate || ckTodayStr(),
    aiEnabled:        $i('ckg-ai').checked,
    aiEncourageEnabled: $i('ckg-encourage').checked,
    aiCommentScope:   $i('ckg-scope').value,
    aiPromptMode:     $i('ckg-prompt-mode').value,
    customPrompt:     $i('ckg-custom-prompt').value.trim(),
    contactId:        $i('ckg-contact').value,
    reminderEnabled:  $i('ckg-reminder').checked,
    reminderTimes:    ckGetTimes(),
    reminderCount:    parseInt($i('ckg-remind-count').value || '1'),
    createdAt:        existing?.createdAt || new Date().toISOString(),
  };

  await dbPut('checkinGoals', goal);

  const idx = CK.goals.findIndex(g => g.id === goal.id);
  if (idx >= 0) CK.goals[idx] = goal;
  else CK.goals.push(goal);

  if (!CK.activeGoalId) CK.activeGoalId = goal.id;

  closeModal('ck-goal-modal');
  setupCheckinReminders();
  await renderCheckinPage();
  toast('✨ 目标已保存！');
}

async function deleteCkGoal() {
  const gid = CK._editingGoalId;
  if (!gid) return;
  if (!confirm('确定删除这个目标及全部打卡记录？此操作不可撤销。')) return;

  await dbDel('checkinGoals', gid);
  const recs = await ckGetRecords(gid);
  for (const r of recs) await dbDel('checkinRecords', r.id);

  CK.goals = CK.goals.filter(g => g.id !== gid);
  if (CK.activeGoalId === gid) CK.activeGoalId = CK.goals[0]?.id || null;

  closeModal('ck-goal-modal');
  await renderCheckinPage();
  toast('目标已删除');
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
  const scope  = goal.aiCommentScope || 'daily';

  let prompt = '';
  if (goal.aiPromptMode === 'custom' && goal.customPrompt?.trim()) {
    prompt = goal.customPrompt
      .replace('{goal}', goal.title)
      .replace('{date}', date)
      .replace('{streak}', streak)
      .replace('{total}', total)
      .replace('{progress}', rec.progress || 100)
      .replace('{notes}', rec.notes || '无');
  } else {
    const itemsSummary = (goal.items || []).map(it =>
      `${it.label}：${rec.items?.[it.id] ? '✅' : '❌'}`).join('，') || '';

    if (scope === 'daily') {
      prompt = `用户正在执行「${goal.title}」打卡目标。${date} 完成打卡，完成度 ${rec.progress||100}%。${itemsSummary ? '分项：' + itemsSummary + '。' : ''}${rec.notes ? '备注：' + rec.notes + '。' : ''}这是第 ${total} 天累计、连续第 ${streak} 天打卡。请用温暖、活泼的语气给出今日点评（50字以内），鼓励但不要太浮夸。`;
    } else if (scope === 'milestone') {
      prompt = `用户刚完成「${goal.title}」的第 ${total} 天打卡！请给出里程碑庆贺留言（60字以内），要有仪式感和激励感，可以加入一点幽默。`;
    } else {
      prompt = `用户坚持「${goal.title}」已 ${total} 天，连续 ${streak} 天。请做一段简短的阶段性总结留言（100字以内），肯定努力并给予鼓励和建议。`;
    }
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
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.92,
        max_tokens: 250,
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
  return new Date().toISOString().slice(0, 10);
}
