// ═══════════════════════════════════════════
//  RAIMOS v3 — Main App
// ═══════════════════════════════════════════
'use strict';

const $i = id => document.getElementById(id);

// ── GLOBAL STATE (runtime only, persisted via IndexedDB) ──
let S = {
  currentChat: null,
  currentContact: null,
  editingMsgId: null,
  editingContactId: null,
  replyTo: null,
  pendingFiles: [],
  isStreaming: false,
  isRecording: false,
  mediaRecorder: null,
  audioChunks: [],
  recSecs: 0, recTimer: null,
  onlineSearch: false, imgGenMode: false,
  proTimer: null, proCount: 0, proDate: '',
  kwAnimEnabled: true,
  kwAnims: [],
  myStatus: '😊 在线',
  // runtime caches
  _contacts: {}, _chats: {}, _memories: [], _stickers: [],
  settings: {
    apiKey:'', tavilyKey:'', unsplashKey:'',
    ttsMode:'browser', browserVoice:'', ttsUrl:'', ttsKey:'', ttsVoice:'cove',
    voiceReplyMode:'text', autoTts:false,
    stream:true, showToken:false, showThink:true,
    temp:0.85, ctx:20, imgSize:800, sumThresh:40,
    proactive:false, proMax:3, proStart:8, proEnd:22,
    imgGenModel:'openai/dall-e-3',
    city:'', momentUseMemory:true, momentUseRecentChats:false, momentRecentChatsCount:10,
    backendUrl:'',
    aiName:'小可', userName:'我', aiAvatar:'🐱', userAvatar:'😊',
    userBubble:'#ff8fab', aiBubble:'#ffffff',
    theme:'light', chatBg:'#fdf6f0', chatBgImg:'', bgOpacity:1, fontSize:14,
    welcomeIcon:'🐻', welcomeTitle:'你好呀！', welcomeSub:'点左上角 ＋ 新建对话，或先去⚙️设置里填 OpenRouter API Key 哦～',
  },
  _imgSearchTarget: 'compose',
  _imgSearchSelected: [],
  _composePics: [],
  _newGifData: null, _newAnimType: 'gif',
  _animTimeout: null, _animRaf: null,
  _statusTimers: {},
};

// ── MODELS ──
const MODELS = [
  {id:'openai/gpt-4o',name:'GPT-4o',desc:'OpenAI 最强多模态'},
  {id:'openai/gpt-4o-2024-11-20',name:'GPT-4o (2024-11-20)',desc:'最新版'},
  {id:'openai/gpt-4o-2024-08-06',name:'GPT-4o (2024-08-06)',desc:'结构化输出'},
  {id:'openai/gpt-4o-mini',name:'GPT-4o mini',desc:'快速便宜'},
  {id:'openai/gpt-4o-mini-2024-07-18',name:'GPT-4o mini (07-18)',desc:'固定版本'},
  {id:'openai/gpt-4o:online',name:'GPT-4o (联网)',desc:'原生联网'},
  {id:'openai/gpt-4o-mini:online',name:'GPT-4o mini (联网)',desc:'快速联网'},
  {id:'openai/o1',name:'o1',desc:'深度推理'},
  {id:'openai/o1-mini',name:'o1 mini',desc:'推理轻量版'},
  {id:'openai/o3-mini',name:'o3 mini',desc:'最新推理'},
  {id:'openai/o3-mini-high',name:'o3 mini (high)',desc:'高强度推理'},
  {id:'anthropic/claude-3.5-sonnet',name:'Claude 3.5 Sonnet',desc:'Anthropic 最强'},
  {id:'anthropic/claude-3.5-haiku',name:'Claude 3.5 Haiku',desc:'快速版'},
  {id:'anthropic/claude-3-opus',name:'Claude 3 Opus',desc:'旗舰'},
  {id:'anthropic/claude-3.7-sonnet',name:'Claude 3.7 Sonnet',desc:'最新'},
  {id:'anthropic/claude-3.7-sonnet:thinking',name:'Claude 3.7 Sonnet (思考)',desc:'含思考链'},
  {id:'google/gemini-2.0-flash-exp:free',name:'Gemini 2.0 Flash (免费)',desc:'免费快速'},
  {id:'google/gemini-2.0-flash-thinking-exp:free',name:'Gemini Flash 思考 (免费)',desc:'免费思考'},
  {id:'google/gemini-pro-1.5',name:'Gemini 1.5 Pro',desc:'长上下文'},
  {id:'google/gemini-flash-1.5',name:'Gemini 1.5 Flash',desc:'快速'},
  {id:'deepseek/deepseek-chat',name:'DeepSeek V3',desc:'国产优秀'},
  {id:'deepseek/deepseek-r1',name:'DeepSeek R1',desc:'推理模型'},
  {id:'deepseek/deepseek-r1:free',name:'DeepSeek R1 (免费)',desc:'免费推理'},
  {id:'meta-llama/llama-3.3-70b-instruct',name:'Llama 3.3 70B',desc:'Meta 开源'},
  {id:'meta-llama/llama-3.1-8b-instruct:free',name:'Llama 3.1 8B (免费)',desc:'小型免费'},
  {id:'qwen/qwen-2.5-72b-instruct',name:'Qwen 2.5 72B',desc:'阿里通义'},
  {id:'perplexity/sonar-pro',name:'Perplexity Sonar Pro (联网)',desc:'专业联网'},
  {id:'perplexity/sonar',name:'Perplexity Sonar (联网)',desc:'标准联网'},
  {id:'custom',name:'自定义…',desc:'手动输入模型名'},
];

// ══════════════════════════════
//  INIT
// ══════════════════════════════
async function init() {
  await loadAllData();
  applyTheme();
  applyBg();
  applyBubble();
  buildSettingsUI();
  renderChatList();
  renderContacts();
  renderMemories();
  renderMoments();
  initEmoji();
  initVoices();
  initScrollObs();
  initProactive();
  initStatusTimers();
  updateWelcome();
  if (S.currentChat && S._chats[S.currentChat]) openChat(S.currentChat);
  document.addEventListener('click', outsideClick);
  const rw = $i('rec-wave');
  for (let i = 0; i < 14; i++) {
    const b = document.createElement('div'); b.className = 'rec-wbar';
    b.style.animationDelay = i * 0.07 + 's'; rw.appendChild(b);
  }
  buildAvatarGrid();
  buildAnimTypeGrid();
  buildComposeEmojiGrid();
  updateStorageInfo();
}

// ══════════════════════════════
//  DATA LOAD / SAVE
// ══════════════════════════════
async function loadAllData() {
  const contacts = await dbGetAll('contacts');
  contacts.forEach(c => S._contacts[c.id] = c);
  const chats = await dbGetAll('chats');
  chats.forEach(c => S._chats[c.id] = c);
  S._memories = await dbGetAll('memories');
  S._stickers = await dbGetAll('stickers');
  S.kwAnims = await dbGetAll('kwAnims');
  const savedSettings = await getAllSettings();
  Object.assign(S.settings, savedSettings);
  S.kwAnimEnabled = savedSettings.kwAnimEnabled !== false;
  S.myStatus = savedSettings.myStatus || '😊 在线';
  S.currentChat = savedSettings.currentChat || null;
  S.currentContact = savedSettings.currentContact || null;
  S.proCount = savedSettings.proCount || 0;
  S.proDate = savedSettings.proDate || '';
}

async function saveSetting(key, value) {
  await setSetting(key, value);
}
async function saveSettings_() {
  for (const [k, v] of Object.entries(S.settings)) await setSetting(k, v);
  await setSetting('kwAnimEnabled', S.kwAnimEnabled);
  await setSetting('myStatus', S.myStatus);
  await setSetting('currentChat', S.currentChat);
  await setSetting('currentContact', S.currentContact);
}

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 5); }

// ══════════════════════════════
//  PAGE SWITCHING
// ══════════════════════════════
function switchPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
  // Hide fly overlays when navigating away
  ['fly-dice-overlay','fly-event-overlay','fly-result-overlay'].forEach(oid => {
    const el = document.getElementById(oid);
    if (el) el.style.display = 'none';
  });
  // Stop match game intervals when leaving
  if (typeof MATCH !== 'undefined' && id !== 'match-game-page') {
    if (MATCH.aiInterval) { clearInterval(MATCH.aiInterval); MATCH.aiInterval = null; }
    if (MATCH.timerInterval) { clearInterval(MATCH.timerInterval); MATCH.timerInterval = null; }
  }
  $i(id).classList.add('active');
  document.querySelector(`[data-page="${id}"]`)?.classList.add('active');
  if (id === 'memory-page') renderMemories();
  if (id === 'contacts-page') renderContacts();
  if (id === 'moments-page') renderMoments();
  if (id === 'settings-page') { buildSettingsUI(); updateStorageInfo(); }
  if (id === 'game-hub-page') initGameHubStars();
}

// ══════════════════════════════
//  CONTACTS
// ══════════════════════════════
function renderContacts() {
  const list = $i('contacts-list'); list.innerHTML = '';
  const cs = Object.values(S._contacts);
  if (!cs.length) { list.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text3);font-size:14px">还没有 AI 助手<br>点右上角新建一个吧！</div>'; return; }
  cs.forEach(c => {
    const div = document.createElement('div'); div.className = 'contact-card';
    const avHTML = c.avatar?.startsWith('data:') ? `<img src="${c.avatar}">` : c.avatar || '🤖';
    div.innerHTML = `
      <div class="contact-av" style="position:relative">${typeof avHTML === 'string' && avHTML.startsWith('<') ? avHTML : `<span>${avHTML}</span>`}
        <span class="contact-status-badge">${(c.status || '').split(' ')[0] || ''}</span>
      </div>
      <div class="contact-info">
        <div class="contact-name">${esc(c.name)}</div>
        <div class="contact-model">🤖 ${c.model || 'gpt-4o'}</div>
        <div class="contact-status-text">${esc(c.status || '')}</div>
        <div class="contact-desc">${esc(c.desc || '')}</div>
      </div>
      <div class="contact-actions">
        <button class="c-btn" onclick="startChatWith('${c.id}')">💬 聊天</button>
        <button class="c-btn" onclick="editContact('${c.id}')">✏️</button>
        <button class="c-btn" style="color:#e74c3c" onclick="delContact('${c.id}')">🗑️</button>
      </div>`;
    list.appendChild(div);
  });
}

function openContactModal(editId) {
  S.editingContactId = editId || null;
  const c = editId ? S._contacts[editId] : null;
  $i('contact-modal-h').innerHTML = (c ? '✏️ 编辑' : '✨ 新建') + ' AI 助手 <button class="mclose" onclick="closeModal(\'contact-modal\')">✕</button>';
  $i('cm-name').value = c?.name || '';
  $i('cm-av').value = c?.avatar || '🐱';
  $i('cm-av-preview').textContent = c?.avatar?.startsWith('data:') ? '' : (c?.avatar || '🐱');
  $i('cm-desc').value = c?.desc || '';
  $i('cm-system').value = c?.system || '你是一个可爱温柔的AI助手。';
  $i('cm-temp').value = c?.temp ?? 0.85;
  $i('cm-temp-v').textContent = c?.temp ?? 0.85;
  $i('cm-model').value = c?.model || 'openai/gpt-4o';
  $i('cm-status-freq').value = c?.statusFreq || 0;
  $i('cm-status').value = c?.status || '';
  $i('cm-apikey').value = c?.apiKey || '';
  $i('cm-apiurl').value = c?.apiUrl || '';
  $i('cm-av-picker').style.display = 'none';
  renderModelList('cm', c?.model || 'openai/gpt-4o');
  $i('contact-modal').classList.add('show');
}
function editContact(id) { openContactModal(id); }
function openInlineAvatarPicker(prefix) {
  const picker = $i(prefix + '-av-picker');
  picker.innerHTML = '';
  picker.style.display = picker.style.display === 'none' ? 'flex' : 'none';
  const emojis = ['🐱','🐶','🐻','🐼','🦊','🐰','🐯','🦁','🐸','🤖','🦄','🌸','⭐','🌙','🎀','🎵','🧙','🦋','🐺','🦜'];
  emojis.forEach(e => {
    const b = document.createElement('button');
    b.textContent = e; b.style.cssText = 'font-size:22px;padding:4px;border:1.5px solid var(--border);border-radius:8px;background:none;cursor:pointer;';
    b.onclick = () => { $i(prefix+'-av').value = e; $i(prefix+'-av-preview').textContent = e; picker.style.display='none'; };
    picker.appendChild(b);
  });
}
async function uploadCmAv(input) {
  const file = input.files[0]; if (!file) return;
  const compressed = await compressImg(file, 200);
  $i('cm-av').value = compressed;
  $i('cm-av-preview').innerHTML = `<img src="${compressed}" style="width:28px;height:28px;border-radius:50%;object-fit:cover">`;
  input.value = '';
}
async function saveContact() {
  const name = $i('cm-name').value.trim(); if (!name) { toast('请输入名称'); return; }
  const id = S.editingContactId || uid();
  const contact = { id, name, avatar: $i('cm-av').value, desc: $i('cm-desc').value.trim(), apiKey: $i('cm-apikey').value.trim(), apiUrl: $i('cm-apiurl').value.trim(), model: $i('cm-model').value, system: $i('cm-system').value, temp: parseFloat($i('cm-temp').value), statusFreq: parseInt($i('cm-status-freq').value) || 0, status: $i('cm-status').value || '😊 在线', updatedAt: Date.now() };
  await dbPut('contacts', contact);
  S._contacts[id] = contact;
  initStatusTimers();
  renderContacts(); closeModal('contact-modal'); toast('✅ 助手已保存');
}
async function delContact(id) {
  if (!confirm('删除这个助手？')) return;
  await dbDel('contacts', id); delete S._contacts[id]; renderContacts();
}
function startChatWith(contactId) {
  const c = S._contacts[contactId]; if (!c) return;
  const chatId = uid();
  const chat = { id: chatId, name: `与${c.name}的对话`, contactId, summary: null, archived: false, createdAt: Date.now(), updatedAt: Date.now() };
  dbPut('chats', chat); S._chats[chatId] = chat;
  S.currentChat = chatId; S.currentContact = contactId;
  saveSetting('currentChat', chatId); saveSetting('currentContact', contactId);
  switchPage('chat-page'); renderChatList(); openChat(chatId);
}

// ══════════════════════════════
//  STATUS SYSTEM
// ══════════════════════════════
const STATUS_POOL = ['😊 心情很好','😴 有点困','🌧 在下雨','☀️ 天气晴朗','🎵 在听歌','📚 在学习','☕ 喝咖啡','🌸 春天来了','🎮 在游戏','😌 很放松','🤔 在思考','✨ 充满活力','🌙 夜深了','😋 好饿哦','🐱 撸猫中'];

function initStatusTimers() {
  Object.values(S._statusTimers).forEach(t => clearInterval(t));
  S._statusTimers = {};
  Object.values(S._contacts).forEach(c => {
    if (!c.statusFreq || c.statusFreq <= 0) return;
    const ms = c.statusFreq * 60 * 1000;
    S._statusTimers[c.id] = setInterval(() => autoUpdateStatus(c.id), ms);
  });
}
async function autoUpdateStatus(contactId) {
  const c = S._contacts[contactId]; if (!c) return;
  const newStatus = STATUS_POOL[Math.floor(Math.random() * STATUS_POOL.length)];
  c.status = newStatus;
  await dbPut('contacts', c);
  renderContacts(); renderChatList();
  if (S.currentContact === contactId) updateHeaderStatus();
}
function updateHeaderStatus() {
  const c = S._contacts[S.currentContact];
  const status = c?.status || S.myStatus || '😊 在线';
  $i('hdr-status-emoji').textContent = status.split(' ')[0] || '';
  $i('hdr-status-text').textContent = status.split(' ').slice(1).join(' ') || '在线';
}
function openStatusModal() { $i('custom-status-inp').value = ''; $i('status-modal').classList.add('show'); closeCtxMenu(); }
async function setMyStatus(s) {
  if (!s) return; S.myStatus = s; await saveSetting('myStatus', s);
  updateHeaderStatus(); closeModal('status-modal'); toast('状态已更新');
}

// ══════════════════════════════
//  CHAT MANAGEMENT
// ══════════════════════════════
async function newChat() {
  const contactIds = Object.keys(S._contacts);
  const cid = contactIds[0] || null;
  const chatId = uid();
  const chat = { id: chatId, name: '新对话', contactId: cid, summary: null, archived: false, createdAt: Date.now(), updatedAt: Date.now() };
  await dbPut('chats', chat); S._chats[chatId] = chat;
  S.currentChat = chatId; S.currentContact = cid;
  await saveSetting('currentChat', chatId); await saveSetting('currentContact', cid);
  renderChatList(); openChat(chatId);
}

async function openChat(id) {
  const chat = S._chats[id]; if (!chat) return;
  S.currentChat = id; S.currentContact = chat.contactId || null;
  const contact = S.currentContact ? S._contacts[S.currentContact] : null;
  await saveSetting('currentChat', id); await saveSetting('currentContact', S.currentContact);
  $i('welcome')?.remove();
  $i('hdr-name').textContent = chat.name;
  const av = contact?.avatar || S.settings.aiAvatar;
  const hdrAv = $i('hdr-avatar');
  if (av?.startsWith('data:')) hdrAv.innerHTML = `<img src="${av}">`;
  else hdrAv.textContent = av || '🐱';
  $i('hint-model').textContent = contact?.model || '';
  updateHeaderStatus();
  await renderMsgs(); highlightChat(); scrollTo_(false, true);
}

async function deleteCurrentChat() {
  if (!S.currentChat) return; if (!confirm('删除此对话？')) return;
  await dbDel('chats', S.currentChat);
  const msgs = await dbGetAll('messages', 'chatId', S.currentChat);
  for (const m of msgs) await dbDel('messages', m.id);
  delete S._chats[S.currentChat]; S.currentChat = null;
  renderChatList(); showWelcome(); closeCtxMenu();
}
async function archiveChat() {
  if (!S.currentChat) return;
  S._chats[S.currentChat].archived = !S._chats[S.currentChat].archived;
  await dbPut('chats', S._chats[S.currentChat]);
  renderChatList(); closeCtxMenu(); toast(S._chats[S.currentChat].archived ? '已归档' : '已取消归档');
}
function renameChat() { if (!S.currentChat) return; $i('rename-inp').value = S._chats[S.currentChat].name; $i('rename-modal').classList.add('show'); closeCtxMenu(); }
async function doRename() {
  const v = $i('rename-inp').value.trim(); if (!v) return;
  S._chats[S.currentChat].name = v; await dbPut('chats', S._chats[S.currentChat]);
  $i('hdr-name').textContent = v; renderChatList(); closeModal('rename-modal');
}
function clearCtx() { if (!confirm('清空上下文（保留聊天记录）？')) return; S._chats[S.currentChat].summary = null; dbPut('chats', S._chats[S.currentChat]); toast('✅ 上下文已清空'); closeCtxMenu(); }
async function compressCtx() { if (!S.currentChat) return; await doSummary(S.currentChat, true); toast('✅ 已压缩'); closeCtxMenu(); }

function showWelcome() {
  const ca = $i('chat-area'); ca.innerHTML = '';
  const div = document.createElement('div'); div.id = 'welcome'; div.className = '';
  const s = S.settings;
  div.innerHTML = `<div class="w-icon" id="welcome-icon">${esc(s.welcomeIcon||'🐻')}</div><div class="w-title" id="welcome-title">${esc(s.welcomeTitle||'你好呀！')}</div><div class="w-sub" id="welcome-sub">${esc(s.welcomeSub||'')}</div>`;
  ca.appendChild(div);
  $i('hdr-name').textContent = '选择或新建对话';
}
function updateWelcome() {
  const s = S.settings;
  const ic = $i('welcome-icon'); const tl = $i('welcome-title'); const sb = $i('welcome-sub');
  if (ic) ic.textContent = s.welcomeIcon || '🐻';
  if (tl) tl.textContent = s.welcomeTitle || '你好呀！';
  if (sb) sb.textContent = s.welcomeSub || '';
}
function openWelcomeModal() {
  const s = S.settings;
  $i('wm-icon').value = s.welcomeIcon || '🐻';
  $i('wm-title').value = s.welcomeTitle || '你好呀！';
  $i('wm-sub').value = s.welcomeSub || '';
  $i('welcome-modal').classList.add('show'); closeCtxMenu();
}
async function saveWelcome() {
  S.settings.welcomeIcon = $i('wm-icon').value || '🐻';
  S.settings.welcomeTitle = $i('wm-title').value || '你好呀！';
  S.settings.welcomeSub = $i('wm-sub').value;
  await saveSetting('welcomeIcon', S.settings.welcomeIcon);
  await saveSetting('welcomeTitle', S.settings.welcomeTitle);
  await saveSetting('welcomeSub', S.settings.welcomeSub);
  updateWelcome(); closeModal('welcome-modal'); toast('✅ 欢迎页已更新');
}

function renderChatList(filter = '') {
  const list = $i('chat-list'); list.innerHTML = '';
  const all = Object.values(S._chats).sort((a, b) => (b.updatedAt||b.createdAt||0) - (a.updatedAt||a.createdAt||0));
  const active = all.filter(c => !c.archived);
  const archived = all.filter(c => c.archived);
  const render = (chats, label) => {
    if (label && chats.length) {
      const lel = document.createElement('div');
      lel.style.cssText = 'font-size:9.5px;font-weight:800;color:var(--text3);padding:4px 9px;text-transform:uppercase;letter-spacing:.08em;';
      lel.textContent = label; list.appendChild(lel);
    }
    chats.filter(c => !filter || c.name.toLowerCase().includes(filter.toLowerCase())).forEach(chat => {
      const contact = chat.contactId ? S._contacts[chat.contactId] : null;
      const av = contact?.avatar || '💬';
      const status = contact?.status || '';
      const div = document.createElement('div');
      div.className = 'chat-item' + (chat.id === S.currentChat ? ' active' : '');
      div.dataset.id = chat.id;
      const avInner = av.startsWith('data:') ? `<img src="${av}">` : av;
      div.innerHTML = `
        <div class="ci-avatar-wrap">
          <div class="ci-avatar">${av.startsWith('data:') ? avInner : `<span>${avInner}</span>`}</div>
          ${status ? `<div class="ci-status-dot" title="${esc(status)}">${status.split(' ')[0]||''}</div>` : ''}
        </div>
        <div class="ci-info">
          <div class="ci-name">${esc(chat.name)}</div>
          <div class="ci-preview" id="ci-prev-${chat.id}">加载中…</div>
        </div>
        <div class="ci-time">${fmtTime(chat.updatedAt||chat.createdAt)}</div>
        <button class="chat-item-menu" onclick="event.stopPropagation();S.currentChat='${chat.id}';openCtxMenu(event)">⋮</button>`;
      div.addEventListener('click', e => { if (e.target.classList.contains('chat-item-menu')) return; S.currentChat = chat.id; S.currentContact = chat.contactId || null; openChat(chat.id); });
      list.appendChild(div);
      dbGetAll('messages', 'chatId', chat.id).then(msgs => {
        const last = msgs[msgs.length - 1];
        const p = $i('ci-prev-' + chat.id);
        if (p) p.textContent = last ? (last.type === 'voice' ? '🎤 语音' : last.type === 'image' ? '🖼️ 图片' : last.type === 'sticker' ? '😄 表情包' : last.type === 'file' ? '📎 文件' : (last.content || '').slice(0, 24)) : '暂无消息';
      });
    });
  };
  render(active, ''); render(archived, '归档');
}
function highlightChat() { document.querySelectorAll('.chat-item').forEach(el => el.classList.toggle('active', el.dataset.id === S.currentChat)); }
function filterChats(v) { renderChatList(v); }

// ══════════════════════════════
//  MESSAGES
// ══════════════════════════════
async function addMsg(chatId, msg) {
  if (!S._chats[chatId]) return;
  msg.id = msg.id || uid(); msg.ts = msg.ts || Date.now();
  await dbPut('messages', { ...msg, chatId });
  S._chats[chatId].updatedAt = Date.now();
  await dbPut('chats', S._chats[chatId]);
  const msgs = await dbGetAll('messages', 'chatId', chatId);
  const userMsgs = msgs.filter(m => m.role === 'user');
  if (userMsgs.length === 1 && msg.role === 'user') {
    const name = (msg.content || msg.type || '对话').slice(0, 22);
    S._chats[chatId].name = name; await dbPut('chats', S._chats[chatId]);
    $i('hdr-name').textContent = name;
  }
  renderChatList();
  await checkSummary(chatId);
}

async function renderMsgs() {
  const chat = S._chats[S.currentChat]; if (!chat) return;
  const ca = $i('chat-area'); ca.innerHTML = '';
  const contact = S.currentContact ? S._contacts[S.currentContact] : null;
  const aiAv = contact?.avatar || S.settings.aiAvatar;
  const userAv = S.settings.userAvatar;
  const msgs = await dbGetAll('messages', 'chatId', S.currentChat);
  msgs.sort((a, b) => a.ts - b.ts);

  if (chat.summary) {
    const sd = document.createElement('div'); sd.className = 'sum-card';
    sd.innerHTML = `<div class="sum-badge">🗜️ 上下文摘要</div><div>${esc(chat.summary)}</div>`;
    ca.appendChild(sd);
  }

  let lastDate = '', lastRole = null, groupEl = null;
  for (const msg of msgs) {
    const md = fmtDate(msg.ts);
    if (md !== lastDate) {
      const dd = document.createElement('div'); dd.className = 'date-div';
      dd.innerHTML = `<span>${md}</span>`; ca.appendChild(dd);
      lastDate = md; lastRole = null; groupEl = null;
    }
    const isUser = msg.role === 'user';
    if (msg.role !== lastRole) {
      groupEl = document.createElement('div'); groupEl.className = 'msg-group ' + (isUser ? 'user' : 'ai');
      const gh = document.createElement('div'); gh.className = 'mg-header';
      const av = document.createElement('div'); av.className = 'msg-av ' + (isUser ? 'user-av' : 'ai-av');
      if (isUser) av.textContent = userAv;
      else if (aiAv?.startsWith('data:')) av.innerHTML = `<img src="${aiAv}">`;
      else av.textContent = aiAv || '🐱';
      const sn = document.createElement('span'); sn.className = 'msg-sender';
      sn.textContent = isUser ? (S.settings.userName || '我') : (contact?.name || S.settings.aiName || 'AI');
      if (isUser) { gh.appendChild(sn); gh.appendChild(av); } else { gh.appendChild(av); gh.appendChild(sn); }
      groupEl.appendChild(gh); ca.appendChild(groupEl); lastRole = msg.role;
    }
    appendBubble(groupEl, msg);
  }
}

function appendBubble(groupEl, msg) {
  const bw = document.createElement('div'); bw.className = 'bw';
  const bubble = makeBubble(msg); bw.appendChild(bubble);
  const bt = document.createElement('div'); bt.className = 'bub-time'; bt.textContent = fmtTimeFull(msg.ts);
  if (S.settings.showToken && msg.usage) {
    const ti = document.createElement('div'); ti.className = 'token-row';
    ti.innerHTML = `⚡ ${msg.usage.total} tokens · ${msg.elapsed||'?'}s ▼`;
    const td = document.createElement('div'); td.className = 'token-detail';
    td.textContent = `输入: ${msg.usage.prompt}  输出: ${msg.usage.completion}  总计: ${msg.usage.total}  耗时: ${msg.elapsed||'?'}s`;
    ti.onclick = () => td.classList.toggle('show');
    bw.appendChild(bt); bw.appendChild(ti); bw.appendChild(td);
  } else bw.appendChild(bt);
  groupEl.appendChild(bw);
}

function makeBubble(msg) {
  const b = document.createElement('div'); b.className = 'bubble'; b.dataset.id = msg.id;
  if (msg.type === 'voice') {
    b.innerHTML = makeVoiceHTML(msg);
    if (msg.transcript && S.settings.voiceReplyMode !== 'voice') {
      const tr = document.createElement('div'); tr.className = 'voice-trans'; tr.textContent = msg.transcript; b.appendChild(tr);
    }
  } else if (msg.type === 'image') {
    b.className = 'bubble img-bub';
    b.innerHTML = `<img src="${msg.url || ''}" alt="图片" onclick="openLB('${msg.url || ''}')" loading="lazy">`;
  } else if (msg.type === 'sticker') {
    if (msg.isImg) { b.className = 'bubble img-bub'; b.style.maxWidth = '110px'; b.innerHTML = `<img src="${msg.url}" alt="表情包" onclick="openLB('${msg.url}')" loading="lazy">`; }
    else { b.className = 'bubble emoji-only'; b.textContent = msg.content; }
  } else if (msg.type === 'file') {
    b.innerHTML = `<div class="file-bub"><span style="font-size:22px">📎</span><div><div style="font-weight:700;font-size:13px">${esc(msg.fileName||'文件')}</div><div style="font-size:11px;color:var(--text3)">${msg.fileSize||''}</div></div></div>`;
  } else if (msg.type === 'img_gen') {
    b.className = 'bubble img-bub'; b.innerHTML = `<img src="${msg.url}" alt="生成图片" onclick="openLB('${msg.url}')" loading="lazy">`;
  } else {
    let html = '';
    if (msg.replyTo) html += `<div class="reply-quote">${esc((msg.replyTo||'').slice(0,60))}</div>`;
    if (msg.thinking && S.settings.showThink) html += `<details class="thinking-block"><summary>思考过程</summary><div style="margin-top:5px;white-space:pre-wrap">${esc(msg.thinking)}</div></details>`;
    html += fmtText(msg.content || '');
    b.innerHTML = html;
  }
  if (!['image','sticker'].includes(msg.type)) {
    const acts = document.createElement('div'); acts.className = 'bub-actions';
    acts.innerHTML = `
      <button class="act-btn" onclick="copyMsg('${msg.id}')" title="复制">📋</button>
      <button class="act-btn" onclick="replyMsg('${msg.id}')" title="回复">↩️</button>
      <button class="act-btn" onclick="speakMsg('${msg.id}')" title="朗读">🔊</button>
      ${msg.role==='user'?`<button class="act-btn" onclick="editMsg('${msg.id}')" title="编辑">✏️</button>`:''}
      ${msg.role==='ai'?`<button class="act-btn" onclick="regenMsg('${msg.id}')" title="重新生成">🔄</button>`:''}`;
    b.appendChild(acts);
  }
  return b;
}
function makeVoiceHTML(msg) {
  const bars = Array(10).fill(0).map(() => `<div class="wbar" style="height:${6+Math.random()*14}px"></div>`).join('');
  return `<div class="voice-bub"><button class="play-btn" onclick="playVoice('${msg.id}')">▶</button><div class="waveform">${bars}</div><span class="voice-dur">${msg.dur||'0:00'}</span></div>`;
}

// ══════════════════════════════
//  SEND
// ══════════════════════════════
async function sendMsg() {
  const chat = S._chats[S.currentChat]; if (!chat) { toast('请先选择或新建对话'); return; }
  const text = $i('msg-input').value.trim();
  const files = [...S.pendingFiles];
  if (!text && !files.length) return;
  if (S.isStreaming) return;
  $i('msg-input').value = ''; autoH($i('msg-input'));

  if (S.editingMsgId) {
    const msgs = await dbGetAll('messages', 'chatId', S.currentChat);
    const idx = msgs.findIndex(m => m.id === S.editingMsgId);
    if (idx !== -1) {
      msgs[idx].content = text; await dbPut('messages', { ...msgs[idx], chatId: S.currentChat });
      for (let i = idx+1; i < msgs.length; i++) await dbDel('messages', msgs[i].id);
    }
    cancelEdit(); await renderMsgs(); scrollTo_(false); await callAI(S.currentChat); return;
  }

  if (S.imgGenMode && text) { await generateImage(text); $i('msg-input').value = ''; autoH($i('msg-input')); return; }

  for (const f of files) { await addMsg(S.currentChat, f); }
  S.pendingFiles = []; $i('img-preview-row').innerHTML = ''; $i('img-preview-row').classList.remove('show');

  if (text) {
    await addMsg(S.currentChat, { role:'user', type:'text', content:text, replyTo:S.replyTo?.content||null });
    cancelReply(); await renderMsgs(); scrollTo_(false);
    checkKwAnims(text, 'user');
    await callAI(S.currentChat);
  } else if (files.length) {
    await renderMsgs(); scrollTo_(false); await callAI(S.currentChat);
  }
}

// ══════════════════════════════
//  AI CALL
// ══════════════════════════════
async function callAI(chatId) {
  const chat = S._chats[chatId];
  const contact = S.currentContact ? S._contacts[S.currentContact] : null;
  const s = S.settings;
  const useKey = contact?.apiKey || s.apiKey;
const useUrl = contact?.apiUrl || 'https://openrouter.ai/api/v1/chat/completions';
if (!useKey) { toast('请先填写 API Key！'); return; }
S.isStreaming = true; showTyping();
const t0 = Date.now();
try {
    const mems = await getRelevantMems(chatId);
    const msgs = await buildMsgs(chat, contact, mems);
    const model = (contact?.model || 'openai/gpt-4o') + (S.onlineSearch && !contact?.model?.includes(':online') && !contact?.model?.includes('perplexity') ? ':online' : '');
    const body = { model, messages: msgs, temperature: contact?.temp ?? parseFloat(s.temp), stream: s.stream, max_tokens: 4096 };
    const res = await fetch(useUrl, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${useKey}`, 'Content-Type': 'application/json', 'HTTP-Referer': 'https://raimos.app', 'X-Title': 'Raimos' },
      body: JSON.stringify(body),
    });
    if (!res.ok) { const e = await res.json().catch(() => ({error:{message:'Error'}})); throw new Error(e.error?.message || res.statusText); }
    removeTyping();
    let content = '', thinking = '', usage = null;
    if (s.stream) { const r = await handleStream(res, chatId); content = r.content; thinking = r.thinking; usage = r.usage; }
    else { const d = await res.json(); content = d.choices?.[0]?.message?.content || ''; thinking = d.choices?.[0]?.message?.reasoning || ''; usage = d.usage; }
    const { text: cleanText, stickers: stkList } = parseStickerTags(content);
    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
   if (!s.stream) {
      const aiMsg = { role:'ai', type:'text', content:cleanText, thinking:thinking||null, elapsed, usage: usage ? {prompt:usage.prompt_tokens||0,completion:usage.completion_tokens||0,total:usage.total_tokens||0} : null };
      await addMsg(chatId, aiMsg);
    }
    for (const sk of stkList) await addMsg(chatId, { role:'ai', type:'sticker', content:sk.content, url:sk.url, isImg:sk.isImg });
    await renderMsgs(); scrollTo_(false);
    if (s.autoTts && cleanText) speakText(cleanText);
    checkKwAnims(cleanText, 'ai');
    autoMemCheck(chatId);
  } catch(e) {
    removeTyping();
    await addMsg(chatId, { role:'ai', type:'text', content:`❌ 出错了：${e.message}` });
    await renderMsgs(); scrollTo_(false);
  }
  S.isStreaming = false;
}

async function handleStream(res, chatId) {
  const reader = res.body.getReader(), dec = new TextDecoder();
  let content = '', thinking = '', usage = null;
  const tmpId = uid();
  await dbPut('messages', { id:tmpId, chatId, role:'ai', type:'text', content:'', ts:Date.now() });
  await renderMsgs();
  const getBub = () => document.querySelector(`.bubble[data-id="${tmpId}"]`);
  while (true) {
    const { done, value } = await reader.read(); if (done) break;
    const chunk = dec.decode(value);
    for (const line of chunk.split('\n')) {
      if (!line.startsWith('data: ')) continue;
      const d = line.slice(6).trim(); if (d === '[DONE]') break;
      try {
        const j = JSON.parse(d);
        const delta = j.choices?.[0]?.delta;
        if (delta?.content) content += delta.content;
        if (delta?.reasoning) thinking += delta.reasoning;
        if (j.usage) usage = j.usage;
        const b = getBub();
        if (b) {
          let html = '';
          if (thinking && S.settings.showThink) html += `<details class="thinking-block" open><summary>思考中…</summary><div style="margin-top:5px;font-size:10.5px;white-space:pre-wrap">${esc(thinking.slice(-300))}</div></details>`;
          html += fmtText(content) + '<span style="display:inline-block;width:6px;height:12px;background:var(--accent);border-radius:2px;margin-left:2px;animation:tb .5s infinite;vertical-align:middle"></span>';
          b.innerHTML = html; scrollTo_(false);
        }
      } catch(e) {}
    }
  }
  const tmpRow = await dbGet('messages', tmpId);
  if (tmpRow) { tmpRow.content = content; tmpRow.thinking = thinking||null; await dbPut('messages', tmpRow); }
  return { content, thinking, usage };
}

async function buildMsgs(chat, contact, mems) {
  const msgs = [];
  let sys = contact?.system || S.settings.systemPrompt || '你是一个可爱温柔的AI助手。';
  if (mems.length) sys += `\n\n[用户记忆]\n${mems.map(m=>`- ${m.text}`).join('\n')}`;
  if (S._stickers.length) {
    const slist = S._stickers.map(s => `${s.label||s.content||'表情'}`).join(', ');
    sys += `\n\n[表情包库] 可在回复中用 [sticker:标签名] 插入表情。可用: ${slist}`;
  }
  msgs.push({ role:'system', content:sys });
  if (chat.summary) msgs.push({ role:'system', content:`[历史摘要] ${chat.summary}` });
  const allMsgs = await dbGetAll('messages', 'chatId', chat.id);
  allMsgs.sort((a,b) => a.ts - b.ts);
  const recent = allMsgs.slice(-parseInt(S.settings.ctx)||20);
  for (const m of recent) {
    if (m.type === 'image' && m.imageData) msgs.push({ role: m.role==='user'?'user':'assistant', content: [{type:'image_url',image_url:{url:m.imageData}},{type:'text',text:'（图片）'}] });
    else if (m.type === 'voice' && m.transcript) msgs.push({ role: m.role==='user'?'user':'assistant', content:`[语音] ${m.transcript}` });
    else if (m.type === 'file') msgs.push({ role: m.role==='user'?'user':'assistant', content:`[文件: ${m.fileName}]` });
    else if (m.content) msgs.push({ role: m.role==='user'?'user':'assistant', content:m.content });
  }
  return msgs;
}

function parseStickerTags(text) {
  const stickers = [];
  const clean = text.replace(/\[sticker:([^\]]+)\]/g, (_, label) => {
    const sk = S._stickers.find(s => s.label===label || s.content===label);
    if (sk) stickers.push(sk);
    return '';
  });
  return { text:clean.trim(), stickers };
}

// ══════════════════════════════
//  GENERATE IMAGE
// ══════════════════════════════
async function generateImage(prompt) {
  if (!S.settings.apiKey) return; toast('🎨 生成图片中…'); showTyping();
  try {
    const res = await fetch('https://openrouter.ai/api/v1/images/generations', {
      method:'POST', headers:{'Authorization':`Bearer ${S.settings.apiKey}`,'Content-Type':'application/json'},
      body:JSON.stringify({ model:S.settings.imgGenModel||'openai/dall-e-3', prompt, n:1, size:'1024x1024' }),
    });
    const d = await res.json(); const url = d.data?.[0]?.url;
    if (url) { await addMsg(S.currentChat,{role:'ai',type:'img_gen',url,content:'[生成图片]'}); await renderMsgs(); scrollTo_(false); }
    else throw new Error(d.error?.message||'生成失败');
  } catch(e) { toast('❌ 图片生成失败：'+e.message); }
  removeTyping();
}

// ══════════════════════════════
//  MEMORY
// ══════════════════════════════
function renderMemories() {
  const list = $i('memory-list'); list.innerHTML = '';
  $i('memory-stats').textContent = `共 ${S._memories.length} 条记忆`;
  const catI = {健康:'🏥',个人:'👤',习惯:'🔄',事件:'📅',其他:'💡'};
  if (!S._memories.length) { list.innerHTML = '<div style="text-align:center;padding:30px;color:var(--text3);font-size:13px">记忆库是空的<br>聊天时AI会自动记住重要信息</div>'; return; }
  S._memories.forEach((m, i) => {
    const div = document.createElement('div'); div.className = 'memory-item';
    div.innerHTML = `<div class="mem-icon">${catI[m.cat]||'💡'}</div>
      <div class="mem-body"><div class="mem-text">${esc(m.text)}</div><div class="mem-meta"><span class="mem-tag">${m.cat||'其他'}</span>${fmtDate(m.ts)}</div></div>
      <button class="mem-del" onclick="delMem(${i})">🗑️</button>`;
    list.appendChild(div);
  });
}
function openAddMemModal() { $i('amm-text').value=''; $i('add-mem-modal').classList.add('show'); }
async function addMemManual() {
  const text=$i('amm-text').value.trim(); if(!text){toast('请输入内容');return;}
  const mem={id:uid(),text,cat:$i('amm-cat').value,ts:Date.now(),auto:false};
  await dbPut('memories',mem); S._memories.push(mem);
  renderMemories(); closeModal('add-mem-modal'); toast('✅ 记忆已添加');
}
async function delMem(i) { await dbDel('memories',S._memories[i].id); S._memories.splice(i,1); renderMemories(); }

async function getRelevantMems(chatId) {
  if (!S._memories.length) return [];
  const msgs = await dbGetAll('messages','chatId',chatId);
  const lastText = msgs.slice(-3).map(m=>m.content||'').join(' ');
  if (!lastText.trim()) return [];
  if (!S.settings.apiKey) return S._memories.slice(0,5);
  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions',{method:'POST',headers:{'Authorization':`Bearer ${S.settings.apiKey}`,'Content-Type':'application/json'},body:JSON.stringify({model:'openai/gpt-4o-mini',max_tokens:150,stream:false,messages:[{role:'system',content:'从记忆列表中找与当前对话相关的条目，返回JSON: {"relevant":[0,2]}，只返回JSON。'},{role:'user',content:`对话: ${lastText}\n记忆:\n${S._memories.map((m,i)=>`${i}: ${m.text}`).join('\n')}`}]})});
    const d = await res.json(); const raw = d.choices?.[0]?.message?.content||'{}';
    const j = JSON.parse(raw.replace(/```json|```/g,'').trim());
    return (j.relevant||[]).map(i=>S._memories[i]).filter(Boolean);
  } catch(e) { return S._memories.slice(0,3); }
}

async function autoMemCheck(chatId) {
  const msgs = await dbGetAll('messages','chatId',chatId);
  const lastText = msgs.slice(-4).map(m=>`${m.role==='user'?'用户':'AI'}: ${m.content||'[媒体]'}`).join('\n');
  if (!S.settings.apiKey) return;
  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions',{method:'POST',headers:{'Authorization':`Bearer ${S.settings.apiKey}`,'Content-Type':'application/json'},body:JSON.stringify({model:'openai/gpt-4o-mini',max_tokens:200,stream:false,messages:[{role:'system',content:'分析对话，判断是否有值得长期记忆的信息（个人信息/健康禁忌/长期习惯/重要事件），重要程度≥7才记录。返回JSON: {"shouldSave":true,"text":"内容","cat":"健康","score":8}，只返回JSON。'},{role:'user',content:lastText}]})});
    const d = await res.json(); const raw = d.choices?.[0]?.message?.content||'{}';
    const j = JSON.parse(raw.replace(/```json|```/g,'').trim());
    if (j.shouldSave && j.text && (j.score||0)>=7 && S._memories.length<50) {
      if (!S._memories.some(m=>m.text===j.text)) {
        const mem={id:uid(),text:j.text,cat:j.cat||'其他',ts:Date.now(),auto:true};
        await dbPut('memories',mem); S._memories.push(mem);
        const notif=document.createElement('div'); notif.className='mem-notif';
        notif.innerHTML=`🧠 <strong>已记住：</strong>${esc(j.text)}`;
        $i('chat-area').appendChild(notif); scrollTo_(false);
      }
    }
  } catch(e) {}
}

// ══════════════════════════════
//  CONTEXT SUMMARY
// ══════════════════════════════
async function checkSummary(chatId) {
  const chat = S._chats[chatId]; const th = parseInt(S.settings.sumThresh)||40;
  const msgs = await dbGetAll('messages','chatId',chatId);
  if (msgs.length < th) return;
  if (chat._lastSumLen && msgs.length - chat._lastSumLen < th) return;
  await doSummary(chatId, false);
}
async function doSummary(chatId, force) {
  const chat = S._chats[chatId]; if (!S.settings.apiKey) return;
  const msgs = await dbGetAll('messages','chatId',chatId);
  msgs.sort((a,b)=>a.ts-b.ts);
  const toSum = force ? msgs : msgs.slice(0, -Math.floor((parseInt(S.settings.sumThresh)||40)/3));
  if (toSum.length < 5) return;
  const hist = toSum.map(m=>`${m.role==='user'?'用户':'AI'}: ${m.content||'[媒体]'}`).join('\n');
  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions',{method:'POST',headers:{'Authorization':`Bearer ${S.settings.apiKey}`,'Content-Type':'application/json'},body:JSON.stringify({model:'openai/gpt-4o-mini',max_tokens:400,stream:false,messages:[{role:'system',content:'将对话压缩为简洁摘要（200字内），保留关键信息。'},{role:'user',content:hist}]})});
    const d = await res.json(); const sumText = d.choices?.[0]?.message?.content||'';
    if (sumText) {
      chat.summary = (chat.summary?chat.summary+'\n':'')+sumText;
      if (force) { for (const m of msgs) await dbDel('messages',m.id); }
      else { const keep=msgs.slice(-Math.floor((parseInt(S.settings.sumThresh)||40)/3)); const toDelete=msgs.slice(0,-keep.length); for(const m of toDelete) await dbDel('messages',m.id); }
      chat._lastSumLen = (await dbGetAll('messages','chatId',chatId)).length;
      await dbPut('chats',chat); await renderMsgs();
    }
  } catch(e) {}
}

// ══════════════════════════════
//  MOMENTS (朋友圈)
// ══════════════════════════════
async function renderMoments() {
  const feed = $i('moments-feed'); feed.innerHTML = '';
  const moments = await dbGetAll('moments');
  moments.sort((a,b)=>b.ts-a.ts);
  if (!moments.length) { feed.innerHTML='<div style="text-align:center;padding:40px;color:var(--text3);font-size:13.5px">朋友圈还是空的<br>发布第一条动态吧！🌸</div>'; return; }
  for (const m of moments) {
    const card = await makeMomentCard(m);
    feed.appendChild(card);
  }
}

async function makeMomentCard(m) {
  const comments = await dbGetAll('comments','momentId',m.id);
  comments.sort((a,b)=>a.ts-b.ts);
  const card = document.createElement('div'); card.className = 'moment-card'; card.id='mc-'+m.id;
  const avHTML = m.avatar?.startsWith('data:') ? `<img src="${m.avatar}">` : (m.avatar||'😊');
  const nImg = (m.images||[]).length;
  const imgGrid = nImg ? `<div class="moment-images n${Math.min(nImg,4)}">${(m.images||[]).slice(0,4).map(url=>`<div class="mi"><img src="${url}" loading="lazy" onclick="openLB('${url}')"></div>`).join('')}</div>` : '';
  const commHTML = comments.map(c => `
    <div class="comment-item" id="ci-${c.id}">
      <span class="comment-author">${esc(c.author)}</span>
      ${c.replyTo?`<span class="comment-reply-to">回复 ${esc(c.replyTo)}：</span>`:''}
      ${esc(c.text)}
      <span class="comment-actions">
        <button class="c-act" onclick="replyComment('${m.id}','${c.id}','${esc(c.author)}')">回复</button>
        <button class="c-act" onclick="delComment('${m.id}','${c.id}')">删除</button>
      </span>
    </div>`).join('');
  const tokenBadge = S.settings.showMomentTokens && m.tokens
    ? `<span style="font-size:10px;color:var(--text3);margin-left:6px" title="Token 消耗">🪙${m.tokens}</span>` : '';
  const backendBadge = m.byBackend
    ? `<span style="font-size:9.5px;color:var(--accent);margin-left:4px;opacity:.7">🤖后台</span>` : '';
  card.innerHTML = `
    <div class="moment-header">
      <div class="moment-av">${typeof avHTML==='string'&&avHTML.startsWith('<img')?avHTML:`<span>${avHTML}</span>`}</div>
      <div><div class="moment-author">${esc(m.author||S.settings.userName||'我')}${backendBadge}</div><div class="moment-time">${fmtTimeFull(m.ts)}${tokenBadge}</div></div>
      <button style="margin-left:auto;background:none;border:none;cursor:pointer;color:var(--text3);font-size:14px" onclick="delMoment('${m.id}')">✕</button>
    </div>
    <div class="moment-text">${fmtText(m.text||'')}</div>
    ${imgGrid}
    <div class="moment-footer">
      <div class="moment-actions">
        <button class="m-act-btn" onclick="likeMoment('${m.id}')">❤️ ${m.likes||0}</button>
        <button class="m-act-btn" onclick="toggleComments('${m.id}')">💬 ${comments.length} 评论</button>
        ${S.settings.apiKey?`<button class="m-act-btn" onclick="aiCommentMoment('${m.id}')">🤖 让AI评论</button>`:''}
      </div>
      <div class="comments-list" id="clist-${m.id}" style="display:none">${commHTML}</div>
      <div class="reply-input-wrap" id="ri-${m.id}" style="display:none">
        <input type="text" id="rinp-${m.id}" placeholder="写评论…" onkeydown="if(event.key==='Enter')submitComment('${m.id}')"/>
        <button class="reply-send" onclick="submitComment('${m.id}')">➤</button>
      </div>
    </div>`;
  return card;
}

async function postMoment() {
  const text = $i('compose-text').value.trim();
  const images = [...S._composePics].map(p=>p.dataUrl);
  if (!text && !images.length) { toast('请输入内容或添加图片'); return; }
  const m = { id:uid(), author:S.settings.userName||'我', avatar:S.settings.userAvatar||'😊', text, images, ts:Date.now(), likes:0 };
  await dbPut('moments', m);
  $i('compose-text').value=''; S._composePics=[];
  $i('compose-img-previews').innerHTML=''; $i('compose-emoji').style.display='none';
  // Sync to Firestore so backend can read moment context for comment replies
  syncMomentToFirestore(m);
  await renderMoments(); toast('✅ 发布成功！');
}

// Write a moment to Firestore (images kept as-is; large dataUrls are stored locally only).
// The backend only needs text + metadata for context, images are optional.
function syncMomentToFirestore(m) {
  if (!window._fbUser || !window._fbLib) return;
  const { doc, setDoc } = window._fbLib;
  const data = { ...m };
  // Strip local dataUrl images to avoid Firestore 1MB limit; storage URLs pass through
  if (data.images) {
    data.images = data.images.map(u => (u && u.startsWith('https://') ? u : '__local__'));
  }
  setDoc(doc(window._fbDb, 'users', window._fbUser.uid, 'moments', m.id), data).catch(() => {});
}

async function delMoment(id) {
  if (!confirm('删除这条动态？')) return;
  await dbDel('moments',id);
  const comments = await dbGetAll('comments','momentId',id);
  for (const c of comments) await dbDel('comments',c.id);
  await renderMoments();
}

async function likeMoment(id) {
  const m = await dbGet('moments',id); if(!m) return;
  m.likes = (m.likes||0)+1; await dbPut('moments',m);
  await renderMoments();
}

function toggleComments(momentId) {
  const cl = $i('clist-'+momentId), ri = $i('ri-'+momentId);
  const hidden = cl.style.display==='none';
  cl.style.display = hidden?'flex':'none'; cl.style.flexDirection='column'; cl.style.gap='5px';
  ri.style.display = hidden?'flex':'none';
}

let _replyingTo = {};
function replyComment(momentId, commentId, author) {
  _replyingTo[momentId] = {commentId, author};
  const inp = $i('rinp-'+momentId);
  if (inp) { inp.placeholder=`回复 ${author}…`; inp.focus(); }
  const cl = $i('clist-'+momentId), ri = $i('ri-'+momentId);
  if(cl) cl.style.display='flex';
  if(ri) ri.style.display='flex';
}
async function submitComment(momentId) {
  const inp=$i('rinp-'+momentId); if(!inp)return;
  const text=inp.value.trim(); if(!text)return;
  const rt=_replyingTo[momentId];
  const c={id:uid(),momentId,author:S.settings.userName||'我',text,replyTo:rt?.author||null,ts:Date.now()};
  await dbPut('comments',c); delete _replyingTo[momentId]; inp.value='';
  inp.placeholder='写评论…';
  // Write to Firestore so backend can auto-reply
  if (window._fbUser && window._fbLib && S.settings.commentAutoReply) {
    const { doc, setDoc } = window._fbLib;
    setDoc(doc(window._fbDb,'users',window._fbUser.uid,'comments',c.id),
      { ...c, needsAiReply: true, replied: false }
    ).catch(() => {});
  }
  const m = await dbGet('moments',momentId);
  if(m){const card=await makeMomentCard(m);const old=$i('mc-'+momentId);if(old)old.replaceWith(card);}
  const cl2=$i('clist-'+momentId),ri2=$i('ri-'+momentId);
  if(cl2){cl2.style.display='flex';cl2.style.flexDirection='column';}if(ri2)ri2.style.display='flex';
}
async function delComment(momentId, commentId) {
  await dbDel('comments',commentId);
  const m = await dbGet('moments',momentId);
  if(m){const card=await makeMomentCard(m);const old=$i('mc-'+momentId);if(old)old.replaceWith(card);}
}
async function aiCommentMoment(momentId) {
  const m = await dbGet('moments',momentId); if(!m||!S.settings.apiKey)return;
  const contact = S.currentContact?S._contacts[S.currentContact]:Object.values(S._contacts)[0];
  const aiName = contact?.name||S.settings.aiName||'AI';
  toast('🤖 AI 评论中…');
  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions',{method:'POST',headers:{'Authorization':`Bearer ${S.settings.apiKey}`,'Content-Type':'application/json'},body:JSON.stringify({model:contact?.model||'openai/gpt-4o-mini',max_tokens:80,stream:false,messages:[{role:'system',content:`你是${aiName}，${contact?.system||'可爱温柔的AI'}，用1-2句话自然地评论朋友圈，像真实朋友一样，不要过于正式。`},{role:'user',content:`朋友圈内容: ${m.text||'[图片]'}`}]})});
    const d=await res.json(); const comment=d.choices?.[0]?.message?.content||'';
    if(comment){
      const tokens=d.usage?.total_tokens||0;
      const c={id:uid(),momentId,author:aiName,text:comment,replyTo:null,ts:Date.now(),tokens,byBackend:false};
      await dbPut('comments',c);
      if(window._fbUser&&window._fbLib){
        const{doc,setDoc}=window._fbLib;
        setDoc(doc(window._fbDb,'users',window._fbUser.uid,'comments',c.id),
          {...c,needsAiReply:false,replied:true}).catch(()=>{});
      }
      const m2=await dbGet('moments',momentId);
      if(m2){const card=await makeMomentCard(m2);const old=$i('mc-'+momentId);if(old)old.replaceWith(card);}
      const cl2=$i('clist-'+momentId);if(cl2){cl2.style.display='flex';cl2.style.flexDirection='column';}
    }
  } catch(e){toast('AI评论失败');}
}

function composePicLocal() { $i('compose-pic-file').click(); }
async function handleComposePic(input) {
  for (const file of input.files) {
    const compressed = await compressImg(file, parseInt(S.settings.imgSize)||800);
    S._composePics.push({dataUrl:compressed});
    addComposePicPreview(compressed, S._composePics.length-1);
  }
  input.value='';
}
function addComposePicPreview(url, idx) {
  const wrap=$i('compose-img-previews');
  const div=document.createElement('div');div.className='cip';
  div.innerHTML=`<img src="${url}"><button class="cip-del" onclick="removeComposePic(${idx})">✕</button>`;
  wrap.appendChild(div);
}
function removeComposePic(idx) {
  S._composePics.splice(idx,1);
  const wrap=$i('compose-img-previews');wrap.innerHTML='';
  S._composePics.forEach((p,i)=>addComposePicPreview(p.dataUrl,i));
}
async function composeGenImg() {
  const p=prompt('描述要生成的图片:'); if(!p)return;
  if(!S.settings.apiKey){toast('需要API Key');return;}
  toast('🎨 生成中…');
  try {
    const res=await fetch('https://openrouter.ai/api/v1/images/generations',{method:'POST',headers:{'Authorization':`Bearer ${S.settings.apiKey}`,'Content-Type':'application/json'},body:JSON.stringify({model:S.settings.imgGenModel||'openai/dall-e-3',prompt:p,n:1,size:'1024x1024'})});
    const d=await res.json();const url=d.data?.[0]?.url;
    if(url){S._composePics.push({dataUrl:url});addComposePicPreview(url,S._composePics.length-1);}
    else throw new Error('生成失败');
  }catch(e){toast('❌ '+e.message);}
}
function toggleComposeEmoji() {
  const ce=$i('compose-emoji');
  ce.style.display=ce.style.display==='none'?'block':'none';
}
function buildComposeEmojiGrid() {
  const grid=$i('compose-emoji-grid');
  const emojis=['😊','😂','🥰','😍','😭','😤','😎','🥺','😅','🤔','🎉','✨','💕','🌸','🐱','🐻','🎵','🌈','⭐','🍕','☕','🌙'];
  emojis.forEach(e=>{const b=document.createElement('button');b.textContent=e;b.style.cssText='font-size:22px;padding:3px;border:none;background:none;cursor:pointer;border-radius:6px;';b.onclick=()=>{const ta=$i('compose-text');ta.value+=e;};grid.appendChild(b);});
}

function openImgSearchModal(target) {
  S._imgSearchTarget = target; S._imgSearchSelected = [];
  $i('img-search-inp').value=''; $i('img-search-results').innerHTML='';
  $i('img-search-modal').classList.add('show');
}
async function doImgSearch() {
  const q=$i('img-search-inp').value.trim();if(!q){toast('请输入关键词');return;}
  const key=S.settings.unsplashKey;
  const grid=$i('img-search-results');grid.innerHTML='<div style="text-align:center;padding:20px;color:var(--text3)">搜索中…</div>';
  try {
    let results=[];
    if(key){
      const res=await fetch(`https://api.unsplash.com/search/photos?query=${encodeURIComponent(q)}&per_page=12&client_id=${key}`);
      const d=await res.json();
      results=(d.results||[]).map(r=>({url:r.urls.small,full:r.urls.regular,thumb:r.urls.thumb}));
    } else {
      results=Array(9).fill(0).map((_,i)=>({url:`https://picsum.photos/seed/${q}${i}/300/300`,full:`https://picsum.photos/seed/${q}${i}/800/600`,thumb:`https://picsum.photos/seed/${q}${i}/100/100`}));
      toast('未填Unsplash Key，显示随机图片占位');
    }
    grid.innerHTML='';
    results.forEach(r=>{
      const div=document.createElement('div');div.className='isr-item';
      div.innerHTML=`<img src="${r.thumb||r.url}" loading="lazy" style="width:100%;height:100%;object-fit:cover">`;
      div.onclick=()=>{
        div.classList.toggle('sel');
        if(div.classList.contains('sel')) S._imgSearchSelected.push(r.full||r.url);
        else S._imgSearchSelected=S._imgSearchSelected.filter(u=>u!==r.full&&u!==r.url);
      };
      grid.appendChild(div);
    });
  }catch(e){grid.innerHTML='<div style="padding:20px;color:#e74c3c">搜索失败: '+e.message+'</div>';}
}
function confirmImgSearch() {
  if(!S._imgSearchSelected.length){toast('请选择图片');return;}
  if(S._imgSearchTarget==='compose'){
    S._imgSearchSelected.forEach(url=>{S._composePics.push({dataUrl:url});addComposePicPreview(url,S._composePics.length-1);});
  } else {
    S._imgSearchSelected.forEach(url=>{S.pendingFiles.push({role:'user',type:'image',url,imageData:url,content:'[图片]'});addImgPreview(url);});
  }
  closeModal('img-search-modal');
}

async function exportMoments() {
  const moments=await dbGetAll('moments');const comments=await dbGetAll('comments');
  const data=JSON.stringify({moments,comments},null,2);
  dl('raimos-moments.json',data,'application/json'); toast('✅ 朋友圈已导出');
}
async function archiveMoments() {
  if(!confirm('归档并清空全部朋友圈？（已导出的内容不会丢失）'))return;
  const moments=await dbGetAll('moments');const comments=await dbGetAll('comments');
  const data=JSON.stringify({moments,comments},null,2);
  dl('raimos-moments-archive-'+Date.now()+'.json',data,'application/json');
  await dbClear('moments');await dbClear('comments');
  await renderMoments();toast('✅ 已归档并清空');
}

// ══════════════════════════════
//  VOICE
// ══════════════════════════════
let recStream=null;
function startRec(e){if(e)e.preventDefault();if(S.isRecording)return;navigator.mediaDevices.getUserMedia({audio:true}).then(stream=>{recStream=stream;S.mediaRecorder=new MediaRecorder(stream);S.audioChunks=[];S.isRecording=true;S.recSecs=0;S.mediaRecorder.ondataavailable=e=>S.audioChunks.push(e.data);S.mediaRecorder.start();$i('btn-voice').classList.add('recording');$i('rec-bar').classList.add('show');S.recTimer=setInterval(()=>{S.recSecs++;const m=Math.floor(S.recSecs/60),s=S.recSecs%60;$i('rec-timer').textContent=`${m}:${s.toString().padStart(2,'0')}`;},1000);}).catch(e=>toast('无法访问麦克风: '+e.message));}
function stopRec(){if(!S.isRecording)return;S.isRecording=false;clearInterval(S.recTimer);$i('btn-voice').classList.remove('recording');$i('rec-bar').classList.remove('show');$i('rec-timer').textContent='0:00';S.mediaRecorder.stop();S.mediaRecorder.onstop=async()=>{const blob=new Blob(S.audioChunks,{type:'audio/webm'});recStream?.getTracks().forEach(t=>t.stop());const dur=`${Math.floor(S.recSecs/60)}:${(S.recSecs%60).toString().padStart(2,'0')}`;const url=URL.createObjectURL(blob);const transcript=await sttBrowser();const chat=S._chats[S.currentChat];if(!chat)return;const vmsg={role:'user',type:'voice',url,dur,transcript,content:transcript?`[语音] ${transcript}`:'[语音消息]'};await addMsg(S.currentChat,vmsg);await renderMsgs();scrollTo_(false);if(transcript)await callAI(S.currentChat);};}
function cancelRec(){if(!S.isRecording)return;S.isRecording=false;clearInterval(S.recTimer);S.mediaRecorder?.stop();recStream?.getTracks().forEach(t=>t.stop());$i('btn-voice').classList.remove('recording');$i('rec-bar').classList.remove('show');}
function sttBrowser(){return new Promise(resolve=>{if(!('webkitSpeechRecognition'in window||'SpeechRecognition'in window)){resolve('');return;}const SR=window.SpeechRecognition||window.webkitSpeechRecognition;const r=new SR();r.lang='zh-CN';r.interimResults=false;r.start();r.onresult=e=>resolve(e.results[0][0].transcript);r.onerror=()=>resolve('');r.onend=()=>resolve('');setTimeout(()=>{try{r.stop();}catch(e){}},5000);});}
async function playVoice(id){const msgs=await dbGetAll('messages','chatId',S.currentChat);const msg=msgs.find(m=>m.id===id);if(msg?.url)new Audio(msg.url).play();}

let curSpeech=null;
async function speakMsg(id){const msgs=await dbGetAll('messages','chatId',S.currentChat);const msg=msgs.find(m=>m.id===id);if(msg?.content)speakText(msg.content);}
function speakText(text){const s=S.settings;if(curSpeech){speechSynthesis.cancel();curSpeech=null;return;}if(s.ttsMode==='custom'&&s.ttsUrl){callCustomTTS(text);return;}const u=new SpeechSynthesisUtterance(text);if(s.browserVoice){const v=speechSynthesis.getVoices().find(v=>v.name===s.browserVoice);if(v)u.voice=v;}u.rate=1.05;curSpeech=u;u.onend=()=>curSpeech=null;speechSynthesis.speak(u);}
async function callCustomTTS(text){const s=S.settings;try{const res=await fetch(s.ttsUrl,{method:'POST',headers:{'Content-Type':'application/json',...(s.ttsKey?{'Authorization':`Bearer ${s.ttsKey}`}:{})},body:JSON.stringify({model:'tts-1',input:text,voice:s.ttsVoice||'cove'})});new Audio(URL.createObjectURL(await res.blob())).play();}catch(e){}}
function initVoices(){const load=()=>{const vs=speechSynthesis.getVoices();const sel=$i('s-bvoice');if(!sel||!vs.length)return;sel.innerHTML='';vs.forEach(v=>{const o=document.createElement('option');o.value=v.name;o.textContent=`${v.name} (${v.lang})`;if(v.name===S.settings.browserVoice)o.selected=true;sel.appendChild(o);});if(!S.settings.browserVoice){const zh=vs.find(v=>v.lang.startsWith('zh'));if(zh){S.settings.browserVoice=zh.name;sel.value=zh.name;}}};speechSynthesis.onvoiceschanged=load;load();}

// ══════════════════════════════
//  FILES
// ══════════════════════════════
function triggerFile(){$i('file-upload').click();}
async function handleFiles(input){for(const file of input.files){if(file.type.startsWith('image/')){const c=await compressImg(file,parseInt(S.settings.imgSize)||800);const url=URL.createObjectURL(file);S.pendingFiles.push({role:'user',type:'image',url,imageData:c,content:'[图片]'});addImgPreview(url);}else{const sz=file.size>1048576?`${(file.size/1048576).toFixed(1)}MB`:`${(file.size/1024).toFixed(0)}KB`;S.pendingFiles.push({role:'user',type:'file',fileName:file.name,fileSize:sz,content:`[文件: ${file.name}]`});toast(`📎 ${file.name}`);}}input.value='';}
function addImgPreview(url){const w=$i('img-preview-row');w.classList.add('show');const idx=S.pendingFiles.filter(f=>f.type==='image').length-1;const d=document.createElement('div');d.className='img-prev';d.innerHTML=`<img src="${url}"><button class="img-prev-del" onclick="rmImgPrev(${idx})">✕</button>`;w.appendChild(d);}
function rmImgPrev(idx){S.pendingFiles=S.pendingFiles.filter((f,i)=>f.type!=='image'||i!==idx);const w=$i('img-preview-row');w.innerHTML='';S.pendingFiles.filter(f=>f.type==='image').forEach((f,i)=>addImgPreview(f.url));if(!S.pendingFiles.some(f=>f.type==='image'))w.classList.remove('show');}
async function compressImg(file,max){return new Promise(r=>{const img=new Image();const fr=new FileReader();fr.onload=e=>{img.onload=()=>{const c=document.createElement('canvas');let w=img.width,h=img.height;if(w>h){if(w>max){h=h*max/w;w=max;}}else{if(h>max){w=w*max/h;h=max;}}c.width=w;c.height=h;c.getContext('2d').drawImage(img,0,0,w,h);r(c.toDataURL('image/jpeg',.82));};img.src=e.target.result;};fr.readAsDataURL(file);});}
function openLB(url){$i('lb-img').src=url;$i('lightbox').classList.add('show');}

// ══════════════════════════════
//  EMOJI / STICKERS
// ══════════════════════════════
const EMOJIS={'😊常用':['😊','😂','🥰','😍','🤣','😭','😤','😎','🥺','😏','😅','🤔','😴','🥳','😡','😢','🤩','😮','🙄','😜','🤗','😇','🥱','😈','👻','💀','🎉','✨','💯','🫶'],'🐱动物':['🐱','🐶','🐻','🐼','🦊','🐰','🐯','🦁','🐸','🐧','🦋','🐝','🦄','🐙','🦜','🐬','🐳','🦖','🐺','🦜'],'❤️爱心':['❤️','🧡','💛','💚','💙','💜','🖤','🤍','💕','💞','💓','💗','💖','💝','💘','💟','❣️','💔','🫶','🩷'],'🍕食物':['🍕','🍔','🍟','🌮','🍜','🍣','🍩','🎂','🧁','🍦','🍎','🍊','🍋','🍇','🍓','🥑','🧋','☕','🍵','🧃'],'🌸自然':['🌸','🌺','🌻','🌹','🌷','🌿','🍀','🌾','🌈','⭐','🌙','☀️','❄️','🌊','🔥','💫','🌠','🎋','🌵','🌴'],'🎵其他':['🎵','🎶','🎸','🎹','🎤','🎧','🎮','🎲','🎯','🏆','👑','💎','🔮','🪄','🎀','🎁','🛸','🚀','⚡','🌟']};
function initEmoji(){const tabs=$i('ep-tabs');tabs.innerHTML='';let first=true;for(const[cat,emojis]of Object.entries(EMOJIS)){const b=document.createElement('button');b.className='ep-tab'+(first?' active':'');b.textContent=cat;b.onclick=()=>{document.querySelectorAll('.ep-tab').forEach(t=>t.classList.remove('active'));b.classList.add('active');renderEmojiGrid(emojis);};tabs.appendChild(b);if(first)renderEmojiGrid(emojis);first=false;}const st=document.createElement('button');st.className='ep-tab';st.textContent='🎭表情包';st.onclick=()=>{document.querySelectorAll('.ep-tab').forEach(t=>t.classList.remove('active'));st.classList.add('active');renderStickerPicker();};tabs.appendChild(st);}
function renderEmojiGrid(emojis){const c=$i('ep-content');c.innerHTML='';const g=document.createElement('div');g.className='ep-grid';emojis.forEach(e=>{const b=document.createElement('button');b.className='ep-btn';b.textContent=e;b.onclick=()=>insertEmoji(e);g.appendChild(b);});c.appendChild(g);}
function renderStickerPicker(){const c=$i('ep-content');c.innerHTML='';if(!S._stickers.length){c.innerHTML='<div style="text-align:center;padding:18px;color:var(--text3);font-size:12px">还没有表情包</div>';return;}const g=document.createElement('div');g.className='ep-sticker-grid';S._stickers.forEach(s=>{const d=document.createElement('div');d.className='ep-sticker';if(s.isImg)d.innerHTML=`<img src="${s.url}">`;else d.innerHTML=`<span>${s.content}</span>`;d.onclick=()=>sendSticker(s);g.appendChild(d);});c.appendChild(g);}

// ★ 修复：toggleEmoji 不再直接 toggle，而是显式判断
function toggleEmoji(){
  const picker = $i('emoji-picker');
  picker.classList.toggle('show');
}

function insertEmoji(e){const i=$i('msg-input');const s=i.selectionStart,end=i.selectionEnd;i.value=i.value.slice(0,s)+e+i.value.slice(end);i.selectionStart=i.selectionEnd=s+e.length;i.focus();}
async function sendSticker(sk){const chat=S._chats[S.currentChat];if(!chat)return;await addMsg(S.currentChat,{role:'user',type:'sticker',content:sk.content||sk.label||'',url:sk.url,isImg:sk.isImg});await renderMsgs();scrollTo_(false);$i('emoji-picker').classList.remove('show');}
function openStickersModal(){
  renderStickerLib();
  const keyEl=$i('sticker-lib-key'),promptEl=$i('sticker-call-prompt');
  if(keyEl)keyEl.value=S.settings.stickerLibKey||'';
  if(promptEl)promptEl.value=S.settings.stickerCallPrompt||'';
  $i('sticker-modal').classList.add('show');
}
function renderStickerLib(){const lib=$i('sticker-lib');lib.innerHTML='';S._stickers.forEach((s,i)=>{const d=document.createElement('div');d.style.cssText='position:relative;border:1.5px solid var(--border);border-radius:9px;overflow:hidden;padding:5px;';if(s.isImg)d.innerHTML=`<img src="${s.url}" style="width:100%;border-radius:6px">`;else d.innerHTML=`<div style="font-size:34px;text-align:center;padding:3px">${s.content}</div>`;if(s.label)d.innerHTML+=`<div style="font-size:9.5px;text-align:center;color:var(--text3);margin-top:2px">${esc(s.label)}</div>`;const del=document.createElement('button');del.style.cssText='position:absolute;top:-4px;right:-4px;width:16px;height:16px;border-radius:50%;background:var(--accent);color:#fff;border:none;cursor:pointer;font-size:8px;display:flex;align-items:center;justify-content:center;';del.textContent='✕';del.onclick=async()=>{await dbDel('stickers',s.id);S._stickers.splice(i,1);renderStickerLib();};d.appendChild(del);lib.appendChild(d);});}
async function addStickerImgs(input){for(const file of input.files){const url=await new Promise(r=>{const fr=new FileReader();fr.onload=e=>r(e.target.result);fr.readAsDataURL(file);});const label=window.prompt(`给这个表情包起个标签（AI用来识别）:`)||file.name.replace(/\.\w+$/,'');const sk={id:uid(),isImg:true,url,label,content:label};await dbPut('stickers',sk);S._stickers.push(sk);}renderStickerLib();input.value='';}
async function addTextSticker(){const t=window.prompt('输入文字/emoji表情包:');if(!t)return;const label=window.prompt('标签（AI识别用）:')||t;const sk={id:uid(),isImg:false,content:t,label};await dbPut('stickers',sk);S._stickers.push(sk);renderStickerLib();}

// ══════════════════════════════
//  MSG ACTIONS
// ══════════════════════════════
async function copyMsg(id){const msgs=await dbGetAll('messages','chatId',S.currentChat);const msg=msgs.find(m=>m.id===id);if(msg?.content)navigator.clipboard.writeText(msg.content).then(()=>toast('✓ 已复制'));}
async function replyMsg(id){const msgs=await dbGetAll('messages','chatId',S.currentChat);const msg=msgs.find(m=>m.id===id);if(!msg)return;S.replyTo=msg;$i('reply-bar-txt').textContent=(msg.content||'[媒体]').slice(0,50);$i('reply-bar').classList.add('show');$i('msg-input').focus();}
function cancelReply(){S.replyTo=null;$i('reply-bar').classList.remove('show');}
async function editMsg(id){const msgs=await dbGetAll('messages','chatId',S.currentChat);const msg=msgs.find(m=>m.id===id);if(!msg)return;S.editingMsgId=id;$i('msg-input').value=msg.content||'';$i('edit-bar-txt').textContent=(msg.content||'').slice(0,40);$i('edit-bar').classList.add('show');autoH($i('msg-input'));$i('msg-input').focus();}
function cancelEdit(){S.editingMsgId=null;$i('edit-bar').classList.remove('show');}
async function regenMsg(id){const msgs=await dbGetAll('messages','chatId',S.currentChat);const idx=msgs.findIndex(m=>m.id===id);if(idx===-1)return;for(let i=idx;i<msgs.length;i++)await dbDel('messages',msgs[i].id);await renderMsgs();await callAI(S.currentChat);}

// ══════════════════════════════
//  ONLINE / IMGGEN
// ══════════════════════════════
function toggleOnline(){S.onlineSearch=!S.onlineSearch;$i('btn-online').classList.toggle('on',S.onlineSearch);$i('hint-online').style.display=S.onlineSearch?'inline':'none';toast(S.onlineSearch?'🌐 联网已开':'联网已关');}
function toggleImgGen(){S.imgGenMode=!S.imgGenMode;$i('btn-imggen').classList.toggle('on',S.imgGenMode);$i('hint-imggen').style.display=S.imgGenMode?'inline':'none';toast(S.imgGenMode?'🎨 图生成模式已开':'图生成已关');}

// ══════════════════════════════
//  PROACTIVE
// ══════════════════════════════
const PRO_MSGS=['最近有什么好玩的事情？','突然想到你，一切都好吗？','你知道吗，蜜蜂每天飞行距离可达800公里！','如果可以立刻学会一项技能，你会选什么？','今天有没有发现什么让你开心的小事？','分享一下你最近喜欢的歌曲或电影？','有没有什么最近在思考的事情？'];
function initProactive(){scheduleProactive();}
function scheduleProactive(){if(S.proTimer)clearTimeout(S.proTimer);if(!S.settings.proactive)return;const delay=30*60*1000+Math.random()*150*60*1000;S.proTimer=setTimeout(triggerProactive,delay);}
async function triggerProactive(){const s=S.settings;const now=new Date();const h=now.getHours();if(h<s.proStart||h>=s.proEnd){S.proTimer=setTimeout(triggerProactive,60*60*1000);return;}const today=now.toDateString();if(S.proDate!==today){S.proCount=0;S.proDate=today;await saveSetting('proDate',S.proDate);}if(S.proCount>=(parseInt(s.proMax)||3))return;const msg=PRO_MSGS[Math.floor(Math.random()*PRO_MSGS.length)];$i('ptost-txt').textContent=msg;$i('ptost').classList.add('show');if(S.currentChat){await addMsg(S.currentChat,{role:'ai',type:'text',content:msg});await renderMsgs();scrollTo_(false);}S.proCount++;await saveSetting('proCount',S.proCount);setTimeout(()=>$i('ptost').classList.remove('show'),6000);scheduleProactive();}

// ══════════════════════════════
//  SCROLL
// ══════════════════════════════
function initScrollObs(){const ca=$i('chat-area');ca.addEventListener('scroll',()=>{const atTop=ca.scrollTop<80;const atBot=ca.scrollTop+ca.clientHeight>ca.scrollHeight-80;$i('fab-top').classList.toggle('vis',!atTop);$i('fab-bottom').classList.toggle('vis',!atBot);});}
function scrollTo_(top,instant){const ca=$i('chat-area');ca.scrollTo({top:top?0:ca.scrollHeight,behavior:instant?'auto':'smooth'});}

// ══════════════════════════════
//  THEME & APPEARANCE
// ══════════════════════════════
function toggleTheme(){const d=document.documentElement.getAttribute('data-theme')==='dark';document.documentElement.setAttribute('data-theme',d?'light':'dark');S.settings.theme=d?'light':'dark';$i('theme-btn').textContent=d?'🌙':'☀️';saveSetting('theme',S.settings.theme);}
function applyTheme(){document.documentElement.setAttribute('data-theme',S.settings.theme||'light');const btn=$i('theme-btn');if(btn)btn.textContent=S.settings.theme==='dark'?'☀️':'🌙';}
function applyBg(){const ca=$i('chat-area');if(!ca)return;ca.style.background=S.settings.chatBg||'var(--bg)';ca.style.backgroundImage=S.settings.chatBgImg?`url(${S.settings.chatBgImg})`:'none';if(S.settings.chatBgImg){ca.style.backgroundSize='cover';ca.style.backgroundPosition='center';}}
function applyBubble(){document.documentElement.style.setProperty('--user-bubble',S.settings.userBubble||'#ff8fab');document.documentElement.style.setProperty('--ai-bubble',S.settings.aiBubble||'#ffffff');const lum=getLum(S.settings.userBubble||'#ff8fab');document.documentElement.style.setProperty('--user-text',lum>.55?'#3d2c35':'#fff');}
function getLum(hex){try{const r=parseInt(hex.slice(1,3),16)/255,g=parseInt(hex.slice(3,5),16)/255,b=parseInt(hex.slice(5,7),16)/255;return .299*r+.587*g+.114*b;}catch{return 0;}}

const BG_PRESETS=[{c:'#fdf6f0',l:'默认粉'},{c:'#fff0f3',l:'粉白'},{c:'#f0fff4',l:'薄荷'},{c:'#f0f8ff',l:'天蓝'},{c:'#f5f0ff',l:'薰衣草'},{c:'#fffde7',l:'奶油'},{c:'#1a1220',l:'深紫'},{c:'#0d1b2a',l:'深蓝'},{c:'#0d2818',l:'深绿'}];
function openBgModal(){const bg=$i('bg-grid');bg.innerHTML='';BG_PRESETS.forEach(p=>{const d=document.createElement('div');d.className='bg-tile'+(S.settings.chatBg===p.c?' sel':'');d.style.background=p.c;d.style.border='1.5px solid #ccc';d.title=p.l;d.onclick=()=>{S.settings.chatBg=p.c;S.settings.chatBgImg='';applyBg();saveSetting('chatBg',p.c);saveSetting('chatBgImg','');document.querySelectorAll('.bg-tile').forEach(t=>t.classList.remove('sel'));d.classList.add('sel');};bg.appendChild(d);});const cust=document.createElement('div');cust.className='bg-tile';cust.style.background='conic-gradient(red,yellow,lime,cyan,blue,magenta,red)';cust.style.position='relative';cust.innerHTML='<input type="color" style="opacity:0;position:absolute;inset:0;cursor:pointer;width:100%;height:100%" oninput="S.settings.chatBg=this.value;S.settings.chatBgImg=\'\';applyBg();saveSetting(\'chatBg\',this.value)">';bg.appendChild(cust);$i('bg-modal').classList.add('show');}
function setBgImg(input){const file=input.files[0];if(!file)return;const fr=new FileReader();fr.onload=e=>{S.settings.chatBgImg=e.target.result;applyBg();saveSetting('chatBgImg',e.target.result);};fr.readAsDataURL(file);}
function clearBgImg(){S.settings.chatBgImg='';applyBg();saveSetting('chatBgImg','');}

const USER_COLORS=['#ff8fab','#ff6b6b','#ffa94d','#51cf66','#339af0','#cc5de8','#f06595','#20c997','#ff4757'];
const AI_COLORS=['#ffffff','#f8f9fa','#e3fafc','#fff3bf','#d3f9d8','#e7f5ff','#f3d9fa','#ffecdb','#2a1f35'];
function renderColorPickers(wrapU,wrapA){wrapU.innerHTML='';wrapA.innerHTML='';USER_COLORS.forEach(c=>{const s=document.createElement('div');s.className='cswatch'+(S.settings.userBubble===c?' sel':'');s.style.background=c;s.onclick=()=>{S.settings.userBubble=c;applyBubble();saveSetting('userBubble',c);renderColorPickers(wrapU,wrapA);};wrapU.appendChild(s);});const u2=document.createElement('div');u2.className='cswatch cust';u2.innerHTML=`<input type="color" value="${S.settings.userBubble}" oninput="S.settings.userBubble=this.value;applyBubble();saveSetting('userBubble',this.value)">`;wrapU.appendChild(u2);AI_COLORS.forEach(c=>{const s=document.createElement('div');s.className='cswatch'+(S.settings.aiBubble===c?' sel':'');s.style.background=c;s.style.border='1.5px solid #ddd';s.onclick=()=>{S.settings.aiBubble=c;applyBubble();saveSetting('aiBubble',c);renderColorPickers(wrapU,wrapA);};wrapA.appendChild(s);});const a2=document.createElement('div');a2.className='cswatch cust';a2.innerHTML=`<input type="color" value="${S.settings.aiBubble}" oninput="S.settings.aiBubble=this.value;applyBubble();saveSetting('aiBubble',this.value)">`;wrapA.appendChild(a2);}

function openAvatarModal(){buildAvatarGrid();$i('avatar-modal').classList.add('show');}
function buildAvatarGrid(){const g=$i('avatar-grid');g.innerHTML='';['🐱','🐶','🐻','🐼','🦊','🐰','🐯','🦁','🐸','🤖','🦄','🌸','⭐','🌙','🎀','🎵'].forEach(e=>{const b=document.createElement('button');b.textContent=e;b.style.cssText='font-size:24px;padding:5px;border:2px solid var(--border);border-radius:9px;background:none;cursor:pointer';b.onclick=()=>{S.settings.aiAvatar=e;const h=$i('hdr-avatar');h.textContent=e;saveSetting('aiAvatar',e);};g.appendChild(b);});}
function uploadAvatar(input){const file=input.files[0];if(!file)return;const fr=new FileReader();fr.onload=e=>{S.settings.aiAvatar=e.target.result;const h=$i('hdr-avatar');h.innerHTML=`<img src="${e.target.result}">`;saveSetting('aiAvatar',e.target.result);};fr.readAsDataURL(file);}

// ══════════════════════════════
//  SETTINGS UI
// ══════════════════════════════
function buildSettingsUI() {
  const wrap = $i('settings-wrap'); if (!wrap) return;
  const s = S.settings;
  wrap.innerHTML = `
    <div class="s-section"><h3>🔑 API 配置</h3>
      <div class="s-row"><label>OpenRouter Key</label><input type="password" id="s-key" value="${s.apiKey||''}" placeholder="sk-or-…"/></div>
      <div class="s-row"><label>Tavily Key (搜索)</label><input type="password" id="s-tavily" value="${s.tavilyKey||''}" placeholder="可选，联网搜索"/></div>
      <div class="s-row"><label>Unsplash Key (图片)</label><input type="password" id="s-unsplash" value="${s.unsplashKey||''}" placeholder="可选，朋友圈搜图"/></div>
    </div>
    <div class="s-section"><h3>👤 个人信息</h3>
      <div class="s-row"><label>所在城市</label><input type="text" id="s-city" value="${s.city||''}" placeholder="例：上海、北京、广州"/></div>
      <div style="font-size:11px;color:var(--text3);margin-top:-4px;padding-bottom:10px">用于发朋友圈时附带当地天气，填城市名即可（支持中文）。若已填经纬度则优先使用经纬度。</div>
      <div class="s-row"><label>生成朋友圈时参考记忆库</label><label class="toggle"><input type="checkbox" id="s-moment-use-memory" ${s.momentUseMemory!==false?'checked':''}><span class="tslider"></span></label></div>
      <div class="s-row"><label>生成朋友圈时参考最近聊天</label><label class="toggle"><input type="checkbox" id="s-moment-use-chats" ${s.momentUseRecentChats?'checked':''}><span class="tslider"></span></label></div>
      <div class="s-row"><label>参考聊天条数</label><input type="number" id="s-moment-chat-count" value="${s.momentRecentChatsCount||10}" min="1" max="50" style="max-width:60px"/> 条</div>
    </div>
    <div class="s-section"><h3>☁️ 云同步</h3>
      <div style="padding:4px 0 10px;font-size:12px;color:var(--text3)">登录后可同步：助手、对话、记忆、朋友圈、评论、表情包、关键词动画、换装衣柜、陪伴设置。图片自动上传至 Firebase Storage。</div>
      <div style="display:flex;gap:7px;flex-wrap:wrap;">
        <button class="btn-p" onclick="openAuthModal()">🔐 登录 / 注册</button>
        <button class="btn-s" onclick="syncToCloud()">☁️ 上传同步</button>
        <button class="btn-s" onclick="restoreFromCloud()">⬇️ 从云端恢复</button>
      </div>
      <div id="auth-info" style="margin-top:8px;font-size:12px;color:var(--text3)"></div>
    </div>
    <div class="s-section"><h3>🖼️ 我的相册</h3>
      <div style="padding:4px 0 10px;font-size:12px;color:var(--text3)">上传照片后，AI 发朋友圈时会随机从这里取图。照片同步至 Firebase Storage。</div>
      <button class="btn-p" onclick="openAlbumModal()">📷 管理相册</button>
    </div>
    <div class="s-section"><h3>🗣️ 语音</h3>
      <div class="s-row"><label>TTS 模式</label><select id="s-tts-mode" onchange="onTtsModeChange()"><option value="browser">浏览器 TTS (免费)</option><option value="custom">自定义 TTS 接口</option></select></div>
      <div class="s-row" id="r-bvoice"><label>浏览器声音</label><select id="s-bvoice"></select></div>
      <div id="r-custom-tts" style="display:none">
        <div class="s-row"><label>TTS 接口</label><input type="text" id="s-tts-url" value="${s.ttsUrl||''}" placeholder="https://…"/></div>
        <div class="s-row"><label>TTS Key</label><input type="password" id="s-tts-key" value="${s.ttsKey||''}" placeholder="可选"/></div>
        <div class="s-row"><label>音色名</label><input type="text" id="s-tts-voice" value="${s.ttsVoice||'cove'}" placeholder="cove / alloy…"/></div>
      </div>
      <div class="s-row"><label>语音回复模式</label><select id="s-voice-reply"><option value="text">只显示文字</option><option value="both">文字+语音</option><option value="voice">只显示语音</option></select></div>
      <div class="s-row"><label>自动朗读回复</label><label class="toggle"><input type="checkbox" id="s-auto-tts" ${s.autoTts?'checked':''}><span class="tslider"></span></label></div>
    </div>
    <div class="s-section"><h3>🤖 对话参数</h3>
      <div class="s-row"><label>流式输出</label><label class="toggle"><input type="checkbox" id="s-stream" ${s.stream!==false?'checked':''}><span class="tslider"></span></label></div>
      <div class="s-row"><label>显示Token用量</label><label class="toggle"><input type="checkbox" id="s-show-token" ${s.showToken?'checked':''}><span class="tslider"></span></label></div>
      <div class="s-row"><label>显示思考过程</label><label class="toggle"><input type="checkbox" id="s-show-think" ${s.showThink!==false?'checked':''}><span class="tslider"></span></label></div>
      <div class="s-row"><label>Temperature</label><input type="range" id="s-temp" min="0" max="2" step="0.05" value="${s.temp||0.85}" oninput="$i('s-temp-v').textContent=this.value"><span class="rval" id="s-temp-v">${s.temp||0.85}</span></div>
      <div class="s-row"><label>上下文消息数</label><input type="number" id="s-ctx" value="${s.ctx||20}" min="2" max="1000" style="max-width:80px"/><span style="font-size:11px;color:var(--text3)">条 (最高1000)</span></div>
      <div class="s-row"><label>图片压缩尺寸</label><input type="range" id="s-imgsize" min="256" max="2048" step="128" value="${s.imgSize||800}" oninput="$i('s-imgsize-v').textContent=this.value+'px'"><span class="rval" id="s-imgsize-v">${s.imgSize||800}px</span></div>
      <div class="s-row"><label>摘要阈值</label><input type="number" id="s-sumthresh" value="${s.sumThresh||40}" min="10" max="200" style="max-width:80px"/><span style="font-size:11px;color:var(--text3)">条后自动摘要</span></div>
    </div>
    <div class="s-section"><h3>🎨 外观</h3>
      <div class="s-row"><label>字体大小</label><input type="range" id="s-fontsize" min="11" max="20" step="1" value="${s.fontSize||14}" oninput="$i('s-fontsize-v').textContent=this.value+'px';document.documentElement.style.setProperty('--font-size',this.value+'px')"><span class="rval" id="s-fontsize-v">${s.fontSize||14}px</span></div>
      <div class="s-row"><label>背景透明度</label><input type="range" id="s-bgopa" min="0" max="1" step="0.05" value="${s.bgOpacity??1}" oninput="$i('s-bgopa-v').textContent=Math.round(this.value*100)+'%';document.documentElement.style.setProperty('--bg-opacity',this.value)"><span class="rval" id="s-bgopa-v">${Math.round((s.bgOpacity??1)*100)}%</span></div>
      <div class="s-row"><label>用户气泡色</label><div class="color-row" id="cr-user"></div></div>
      <div class="s-row"><label>AI 气泡色</label><div class="color-row" id="cr-ai"></div></div>
      <div class="s-row"><label>我的名称</label><input type="text" id="s-username" value="${s.userName||'我'}"/></div>
    </div>
    <div class="s-section"><h3>🐾 主动消息（前端本地）</h3>
      <div style="font-size:12px;color:var(--text3);padding:0 0 8px">前端本地随机发送，无需后台服务。若部署了 Railway 后台，建议在下方「后台服务」里配置更稳定的版本。</div>
      <div class="s-row"><label>启用</label><label class="toggle"><input type="checkbox" id="s-proactive" ${s.proactive?'checked':''}><span class="tslider"></span></label></div>
      <div class="s-row"><label>每天最多</label><input type="number" id="s-pro-max" value="${s.proMax||3}" min="1" max="20" style="max-width:60px"/> 次</div>
      <div class="s-row"><label>活跃时段</label><input type="number" id="s-pro-start" value="${s.proStart??8}" min="0" max="23" style="max-width:55px"/><span style="color:var(--text3);font-size:11px">:00 ~</span><input type="number" id="s-pro-end" value="${s.proEnd??22}" min="0" max="23" style="max-width:55px"/><span style="color:var(--text3);font-size:11px">:00</span></div>
    </div>
    <div class="s-section"><h3>🚀 后台服务（Railway 部署）</h3>
      <div style="font-size:12px;color:var(--text3);padding:0 0 10px">配置后台服务的行为。后台需知道对应的「联系人ID」，在联系人列表里长按联系人可查看ID。</div>
      <div style="font-weight:700;font-size:11.5px;color:var(--accent);margin-bottom:6px">💌 AI 主动发消息</div>
      <div class="s-row"><label>启用（后台）</label><label class="toggle"><input type="checkbox" id="s-pro-backend" ${s.proBackend?'checked':''}><span class="tslider"></span></label></div>
      <div class="s-row"><label>每天最多</label><input type="number" id="s-pro-backend-max" value="${s.proBackendMax||2}" min="1" max="20" style="max-width:60px"/> 次</div>
      <div class="s-row"><label>发消息的助手ID</label><input type="text" id="s-pro-contact" value="${s.proContactId||''}" placeholder="联系人 ID（不是名字）"/></div>
      <div style="font-weight:700;font-size:11.5px;color:var(--accent);margin:10px 0 6px">🤖 AI 自动回复评论</div>
      <div class="s-row"><label>启用</label><label class="toggle"><input type="checkbox" id="s-comment-auto" ${s.commentAutoReply?'checked':''}><span class="tslider"></span></label></div>
      <div class="s-row"><label>回复评论的助手ID</label><input type="text" id="s-comment-contact" value="${s.commentContactId||''}" placeholder="联系人 ID"/></div>
      <div style="font-weight:700;font-size:11.5px;color:var(--accent);margin:10px 0 6px">📸 AI 自动发朋友圈</div>
      <div class="s-row"><label>启用</label><label class="toggle"><input type="checkbox" id="s-moment-auto" ${s.momentAutoPost?'checked':''}><span class="tslider"></span></label></div>
      <div class="s-row"><label>发圈的助手ID</label><input type="text" id="s-moment-contact" value="${s.momentContactId||''}" placeholder="联系人 ID"/></div>
      <div class="s-row"><label>频率模式</label>
        <select id="s-moment-freq-mode">
          <option value="perDay">每天 N 次</option>
          <option value="perWeek">每周 N 次</option>
        </select>
      </div>
      <div class="s-row"><label>N =</label><input type="number" id="s-moment-freq-count" value="${s.momentFreqCount||1}" min="1" max="10" style="max-width:60px"/> 次</div>
      <div class="s-row"><label>发圈时段</label>
        <input type="number" id="s-moment-start-h" value="${s.momentStartHour??s.proStart??8}" min="0" max="23" style="max-width:55px"/>
        <span style="color:var(--text3);font-size:11px">:00 ~</span>
        <input type="number" id="s-moment-end-h" value="${s.momentEndHour??s.proEnd??22}" min="0" max="23" style="max-width:55px"/>
        <span style="color:var(--text3);font-size:11px">:00</span>
      </div>
      <div style="font-weight:700;font-size:11.5px;color:var(--accent);margin:10px 0 6px">🌤️ 天气（Open-Meteo 免费）</div>
      <div class="s-row"><label>纬度</label><input type="number" id="s-weather-lat" value="${s.weatherLat||''}" placeholder="例 31.23" step="0.01"/></div>
      <div class="s-row"><label>经度</label><input type="number" id="s-weather-lon" value="${s.weatherLon||''}" placeholder="例 121.47" step="0.01"/></div>
      <div style="font-size:11px;color:var(--text3);margin-top:4px">不填则发圈时不附带天气信息。可在「高德地图」或「百度地图」右键→复制经纬度。</div>
    </div>
    <div class="s-section"><h3>🎲 图片生成</h3>
      <div class="s-row"><label>生图模型</label><select id="s-imggen-model"><option value="openai/dall-e-3">DALL-E 3</option><option value="stabilityai/stable-diffusion-xl-base-1.0">SDXL</option></select></div>
      <div class="s-row"><label>朋友圈显示Token消耗</label><label class="toggle"><input type="checkbox" id="s-show-moment-tokens" ${s.showMomentTokens?'checked':''}><span class="tslider"></span></label></div>
    </div>
    <div class="s-section"><h3>💾 数据管理</h3>
      <div style="display:flex;gap:7px;flex-wrap:wrap;margin-bottom:9px">
        <button class="btn-p" onclick="exportData('json')">📤 导出 JSON</button>
        <button class="btn-p" onclick="exportData('txt')">📄 导出 TXT</button>
        <button class="btn-s" onclick="$i('import-file').click()">📥 导入</button>
        <button class="btn-danger" onclick="clearAll()">🗑️ 清除全部</button>
      </div>
      <input type="file" id="import-file" accept=".json" style="display:none" onchange="importData(this)">
      <div id="storage-info" style="font-size:11px;color:var(--text3);margin-bottom:6px"></div>
      <div id="storage-bar-wrap" class="storage-bar-wrap"><div class="storage-bar" id="storage-bar" style="width:0%"></div></div>
    </div>
    <button class="btn-save" onclick="saveAllSettings()">💾 保存设置</button>`;
  setTimeout(() => {
    const tm = $i('s-tts-mode'); if(tm)tm.value=s.ttsMode||'browser';
    const vr = $i('s-voice-reply'); if(vr)vr.value=s.voiceReplyMode||'text';
    const ig = $i('s-imggen-model'); if(ig)ig.value=s.imgGenModel||'openai/dall-e-3';
    const mfm = $i('s-moment-freq-mode'); if(mfm)mfm.value=s.momentFreqMode||'perDay';
    onTtsModeChange(); initVoices();
    renderColorPickers($i('cr-user'),$i('cr-ai'));
    updateStorageInfo();
    // 更新登录状态显示
    const ai = $i('auth-info');
    if (ai) ai.textContent = window._fbUser ? ('已登录：' + window._fbUser.email) : '未登录';
  },0);
}
function onTtsModeChange(){const m=$i('s-tts-mode');if(!m)return;const v=m.value;const rb=$i('r-bvoice');const rc=$i('r-custom-tts');if(rb)rb.style.display=v==='browser'?'flex':'none';if(rc)rc.style.display=v==='custom'?'block':'none';}
async function saveAllSettings(){
  const s=S.settings;
  const get=(id,def='')=>{const el=$i(id);return el?el.value:def;};
  const getB=(id)=>{const el=$i(id);return el?el.checked:false;};
  s.apiKey=get('s-key');s.tavilyKey=get('s-tavily');s.unsplashKey=get('s-unsplash');
  s.ttsMode=get('s-tts-mode','browser');s.browserVoice=get('s-bvoice');
  s.ttsUrl=get('s-tts-url');s.ttsKey=get('s-tts-key');s.ttsVoice=get('s-tts-voice','cove');
  s.voiceReplyMode=get('s-voice-reply','text');s.autoTts=getB('s-auto-tts');
  s.stream=getB('s-stream');s.showToken=getB('s-show-token');s.showThink=getB('s-show-think');
  s.temp=parseFloat(get('s-temp','0.85'));s.ctx=parseInt(get('s-ctx','20'));
  s.imgSize=parseInt(get('s-imgsize','800'));s.sumThresh=parseInt(get('s-sumthresh','40'));
  s.proactive=getB('s-proactive');s.proMax=parseInt(get('s-pro-max','3'));
  s.proStart=parseInt(get('s-pro-start','8'));s.proEnd=parseInt(get('s-pro-end','22'));
  s.fontSize=parseInt(get('s-fontsize','14'));s.bgOpacity=parseFloat(get('s-bgopa','1'));
  s.imgGenModel=get('s-imggen-model','openai/dall-e-3');
  s.showMomentTokens=getB('s-show-moment-tokens');
  s.userName=get('s-username','我');
  // Backend service settings
  s.proBackend=getB('s-pro-backend');
  s.proBackendMax=parseInt(get('s-pro-backend-max','2'));
  s.proContactId=get('s-pro-contact');
  s.commentAutoReply=getB('s-comment-auto');
  s.commentContactId=get('s-comment-contact');
  s.momentAutoPost=getB('s-moment-auto');
  s.momentContactId=get('s-moment-contact');
  s.momentFreqMode=get('s-moment-freq-mode','perDay');
  s.momentFreqCount=parseInt(get('s-moment-freq-count','1'));
  s.momentStartHour=parseInt(get('s-moment-start-h','8'));
  s.momentEndHour=parseInt(get('s-moment-end-h','22'));
  s.weatherLat=get('s-weather-lat');
  s.weatherLon=get('s-weather-lon');
  // sticker lib config is saved separately via saveStickerLibConfig()
  document.documentElement.style.setProperty('--font-size',s.fontSize+'px');
  applyBubble();scheduleProactive();await saveSettings_();toast('✅ 设置已保存');
}

async function testBackendUrl(){
  const url=($i('s-backend-url')?.value||'').trim();
  if(!url){toast('请先填写后台服务地址');return;}
  try{
    const res=await fetch(url,{signal:AbortSignal.timeout(8000)});
    const d=await res.json();
    if(d.status==='ok')toast(`✅ 连接成功！UID: ${d.uid||'未知'}`);
    else toast('⚠️ 服务返回异常');
  }catch(e){toast('❌ 无法连接：'+e.message);}
}
async function updateStorageInfo(){
  const est=await estimateUsage();
  const si=$i('storage-info');const sb=$i('storage-bar');
  if(est&&si){si.textContent=`存储: ${(est.usage/1024/1024).toFixed(1)} MB / ${(est.quota/1024/1024).toFixed(0)} MB (${est.pct}%)`;if(sb)sb.style.width=est.pct+'%';}
}

function renderModelList(prefix, selected){const list=$i(prefix+'-model-list');if(!list)return;list.innerHTML='';const q=$i(prefix+'-model-search')?.value?.toLowerCase()||'';MODELS.filter(m=>!q||m.name.toLowerCase().includes(q)||m.id.toLowerCase().includes(q)||m.desc.toLowerCase().includes(q)).forEach(m=>{const d=document.createElement('div');d.className='model-opt'+(m.id===selected?' sel':'');d.innerHTML=`<div class="model-opt-name">${esc(m.name)}</div><div class="model-opt-desc">${esc(m.desc)}</div>`;d.onclick=()=>{$i(prefix+'-model').value=m.id;document.querySelectorAll('.model-opt').forEach(o=>o.classList.remove('sel'));d.classList.add('sel');if(m.id==='custom'){const v=window.prompt('输入模型名:');if(v)$i(prefix+'-model').value=v;}};list.appendChild(d);});}
function filterModels(prefix){renderModelList(prefix,$i(prefix+'-model').value);}

// ══════════════════════════════
//  IMPORT / EXPORT
// ══════════════════════════════
async function exportData(fmt){
  const chats=await dbGetAll('chats');const contacts=await dbGetAll('contacts');const memories=await dbGetAll('memories');const stickers=await dbGetAll('stickers');const moments=await dbGetAll('moments');const comments=await dbGetAll('comments');
  if(fmt==='json'){dl('raimos-backup.json',JSON.stringify({chats,contacts,memories,stickers,moments,comments},null,2),'application/json');}
  else{let txt='';chats.forEach(async chat=>{const msgs=await dbGetAll('messages','chatId',chat.id);txt+=`\n${'='.repeat(36)}\n${chat.name}\n${'='.repeat(36)}\n`;msgs.forEach(m=>{txt+=`[${m.role==='user'?S.settings.userName:'AI'}] ${fmtTimeFull(m.ts)}\n${m.content||'[媒体]'}\n\n`;});});setTimeout(()=>dl('raimos-chats.txt',txt,'text/plain'),500);}
}
async function importData(input){const file=input.files[0];if(!file)return;const fr=new FileReader();fr.onload=async e=>{try{const d=JSON.parse(e.target.result);if(d.chats)for(const c of d.chats){await dbPut('chats',c);S._chats[c.id]=c;}if(d.contacts)for(const c of d.contacts){await dbPut('contacts',c);S._contacts[c.id]=c;}if(d.memories)for(const m of d.memories){await dbPut('memories',m);if(!S._memories.find(x=>x.id===m.id))S._memories.push(m);}if(d.stickers)for(const s of d.stickers){await dbPut('stickers',s);if(!S._stickers.find(x=>x.id===s.id))S._stickers.push(s);}if(d.moments)for(const m of d.moments)await dbPut('moments',m);if(d.comments)for(const c of d.comments)await dbPut('comments',c);renderChatList();renderContacts();renderMemories();renderMoments();toast('✅ 导入成功');}catch(e){toast('❌ 文件格式有误');}};fr.readAsText(file);input.value='';}
async function clearAll(){if(!confirm('清除全部数据？'))return;const db=await dbOpen();const stores=Object.keys(STORES);for(const s of stores)await dbClear(s);location.reload();}
function openIEModal(){$i('ie-modal').classList.add('show');}
function dl(name,content,type){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([content],{type}));a.download=name;a.click();}

// ══════════════════════════════
//  CONTEXT MENU
// ══════════════════════════════
function openCtxMenu(e){const m=$i('ctx-menu');m.style.top=Math.min(e.clientY||100,window.innerHeight-200)+'px';m.style.left=Math.min(e.clientX||100,window.innerWidth-170)+'px';m.classList.add('show');e.stopPropagation();}
function closeCtxMenu(){$i('ctx-menu').classList.remove('show');}

// ══════════════════════════════
//  KEYWORD ANIMATIONS
// ══════════════════════════════
const ANIM_TYPES=[{id:'gif',icon:'🖼️',label:'上传GIF'},{id:'confetti',icon:'🎊',label:'彩纸'},{id:'fireworks',icon:'🎆',label:'烟花'},{id:'snow',icon:'❄️',label:'下雪'},{id:'petals',icon:'🌸',label:'樱花'},{id:'hearts',icon:'💖',label:'爱心'},{id:'stars',icon:'⭐',label:'星星'},{id:'meteors',icon:'🌠',label:'流星雨'},{id:'birthday',icon:'🎂',label:'生日'},{id:'lightning',icon:'⚡',label:'闪电'},{id:'cats',icon:'🐱',label:'小猫跑'},{id:'bubbles',icon:'🫧',label:'泡泡'}];
function buildAnimTypeGrid(){const g=$i('anim-type-grid');if(!g)return;g.innerHTML='';ANIM_TYPES.forEach(t=>{const b=document.createElement('button');b.className='atyp'+(t.id==='gif'?' sel':'');b.dataset.type=t.id;b.innerHTML=`<span class="atyp-icon">${t.icon}</span>${t.label}`;b.onclick=()=>{S._newAnimType=t.id;document.querySelectorAll('.atyp').forEach(x=>x.classList.remove('sel'));b.classList.add('sel');$i('kw-gif-zone').style.display=t.id==='gif'?'block':'none';};g.appendChild(b);});}

async function openKwAnimModal(){
  $i('kw-master').checked=S.kwAnimEnabled;
  S.kwAnims=await dbGetAll('kwAnims');
  renderKwList();$i('kwanim-modal').classList.add('show');
}
function renderKwList(){const list=$i('kw-list');list.innerHTML='';if(!S.kwAnims.length){list.innerHTML='<div style="text-align:center;padding:16px;color:var(--text3);font-size:12px">还没有关键词动画，在下方添加！</div>';return;}const ICONS={gif:'🖼️',confetti:'🎊',fireworks:'🎆',snow:'❄️',petals:'🌸',hearts:'💖',stars:'⭐',meteors:'🌠',birthday:'🎂',lightning:'⚡',cats:'🐱',bubbles:'🫧'};S.kwAnims.forEach((item,i)=>{const div=document.createElement('div');div.className='kw-item';const prev=item.type==='gif'&&item.gifData?`<img class="kw-preview" src="${item.gifData}">`:`<div class="kw-preview-ic">${ICONS[item.type]||'✨'}</div>`;div.innerHTML=`${prev}<div class="kw-info"><div class="kw-keyword">"${esc(item.keyword)}"</div><div class="kw-meta">${ICONS[item.type]||'✨'} ${item.type==='gif'?'自定义GIF':item.type} · ${({both:'双向',user:'我发',ai:'AI发'})[item.triggerBy]||'双向'} · ${item.duration||3}s</div></div><div class="kw-btns"><button class="kw-btn" onclick="previewKwAnim(${i})">▶</button><button class="kw-btn" style="color:#e74c3c" onclick="delKwAnim(${i})">✕</button></div>`;list.appendChild(div);});}
function handleGifUpload(input){const file=input.files[0];if(!file)return;const fr=new FileReader();fr.onload=e=>{S._newGifData=e.target.result;$i('kw-gif-preview').innerHTML=`<img src="${S._newGifData}" style="max-height:90px;max-width:100%;border-radius:8px"><br><small style="color:var(--accent)">✓ ${file.name}</small>`;};fr.readAsDataURL(file);input.value='';}
function dropGif(e){e.preventDefault();const file=e.dataTransfer?.files?.[0];if(!file)return;const obj={files:[file]};handleGifUpload(obj);}
async function addKwAnim(){const word=$i('kw-word').value.trim();if(!word){toast('请输入关键词');return;}if(S._newAnimType==='gif'&&!S._newGifData){toast('请上传GIF或选择其他动画类型');return;}const item={id:uid(),keyword:word,type:S._newAnimType,gifData:S._newAnimType==='gif'?S._newGifData:null,triggerBy:$i('kw-trigger').value,duration:parseFloat($i('kw-dur').value)||3};await dbPut('kwAnims',item);S.kwAnims.push(item);$i('kw-word').value='';S._newGifData=null;$i('kw-gif-preview').innerHTML='📁 点击上传 GIF / 图片<br><small>支持 GIF、PNG、JPG</small>';renderKwList();toast('✅ 已添加');}
async function delKwAnim(i){await dbDel('kwAnims',S.kwAnims[i].id);S.kwAnims.splice(i,1);renderKwList();}
function previewKwAnim(i){if(i===-1){const w=$i('kw-word').value.trim()||'预览';playAnim({keyword:w,type:S._newAnimType,gifData:S._newGifData,duration:parseFloat($i('kw-dur').value)||3});}else playAnim(S.kwAnims[i]);}
function checkKwAnims(text,role){if(!S.kwAnimEnabled||!S.kwAnims.length)return;for(const item of S.kwAnims){const tb=item.triggerBy||'both';if(tb==='user'&&role!=='user')continue;if(tb==='ai'&&role!=='ai')continue;if(text.includes(item.keyword)){setTimeout(()=>playAnim(item),350);break;}}}
function playAnim(item){if(!item)return;stopAnim();const overlay=$i('anim-overlay'),canvas=$i('anim-canvas'),gifWrap=$i('anim-gif-wrap');const dur=(item.duration||3)*1000;overlay.classList.add('active');gifWrap.innerHTML='';canvas.width=window.innerWidth;canvas.height=window.innerHeight;if(item.type==='gif'&&item.gifData){overlay.classList.add('has-bd');const img=document.createElement('img');img.src=item.gifData;img.style.cssText='max-width:80vw;max-height:70vh;border-radius:16px;box-shadow:0 20px 60px rgba(0,0,0,.45)';gifWrap.appendChild(img);}else{overlay.classList.remove('has-bd');startParticle(item.type,canvas,dur);}S._animTimeout=setTimeout(()=>stopAnim(),dur+400);}
function stopAnim(){if(S._animTimeout){clearTimeout(S._animTimeout);S._animTimeout=null;}if(S._animRaf){cancelAnimationFrame(S._animRaf);S._animRaf=null;}const o=$i('anim-overlay');o.classList.remove('active','has-bd');$i('anim-gif-wrap').innerHTML='';document.querySelectorAll('.cfp,.snf,.ptl,.hrtf,.strf,.mtrf,.ckb,.catr').forEach(el=>el.remove());const c=$i('anim-canvas');c.getContext('2d').clearRect(0,0,c.width,c.height);}
function startParticle(type,canvas,dur){const ctx=canvas.getContext('2d');if(type==='confetti')spawnConfetti(dur);else if(type==='fireworks')animFW(ctx,canvas,dur);else if(type==='snow')spawnSnow(dur);else if(type==='petals')spawnPetals(dur);else if(type==='hearts')spawnHearts(dur);else if(type==='stars')spawnStars(dur);else if(type==='meteors')spawnMeteors(dur);else if(type==='birthday'){spawnConfetti(dur);spawnBirthday(dur);}else if(type==='lightning')animLightning(canvas,ctx,dur);else if(type==='cats')spawnCats(dur);else if(type==='bubbles')animBubbles(ctx,canvas,dur);}
function spawnEl(cls,style,text,lifeMs){const el=document.createElement('div');el.className=cls;el.style.cssText=style+'position:fixed;z-index:9001;pointer-events:none;';if(text)el.textContent=text;document.body.appendChild(el);setTimeout(()=>el.remove(),lifeMs);}
const CCOLORS=['#ff8fab','#ffb3c6','#ffd6e0','#ff6b6b','#ffa94d','#51cf66','#339af0','#cc5de8','#ffe066','#74c0fc'];
const CSHAPES=['■','●','▲','◆','★'];
function spawnConfetti(dur){for(let i=0;i<120;i++)setTimeout(()=>spawnEl('cfp',`left:${Math.random()*100}vw;top:-20px;color:${CCOLORS[~~(Math.random()*CCOLORS.length)]};font-size:${8+Math.random()*12}px;animation:cff ${1.5+Math.random()*2}s linear forwards;`,CSHAPES[~~(Math.random()*CSHAPES.length)],3500),Math.random()*dur*.6);}
function spawnSnow(dur){for(let i=0;i<80;i++)setTimeout(()=>spawnEl('snf',`left:${Math.random()*100}vw;top:-30px;font-size:${10+Math.random()*18}px;animation:snfall ${2+Math.random()*3}s linear forwards;opacity:${.5+Math.random()*.5};`,['❄','❅','❆','✦'][~~(Math.random()*4)],5000),Math.random()*dur*.7);}
function spawnPetals(dur){for(let i=0;i<60;i++)setTimeout(()=>spawnEl('ptl',`left:${Math.random()*100}vw;top:-20px;font-size:${14+Math.random()*14}px;animation:ptlfall ${2.5+Math.random()*2.5}s linear forwards;`,['🌸','🌺','🌹','🌷','💮'][~~(Math.random()*5)],6000),Math.random()*dur*.6);}
function spawnHearts(dur){for(let i=0;i<50;i++)setTimeout(()=>spawnEl('hrtf',`left:${10+Math.random()*80}vw;bottom:${Math.random()*20}vh;font-size:${18+Math.random()*20}px;animation:hrtfly ${1.5+Math.random()*2}s ease-out forwards;`,['💖','💗','💕','💓','❤️'][~~(Math.random()*5)],4000),Math.random()*dur*.7);}
function spawnStars(dur){for(let i=0;i<70;i++)setTimeout(()=>spawnEl('strf',`left:${Math.random()*100}vw;top:${Math.random()*100}vh;font-size:${12+Math.random()*20}px;animation:strfly ${1+Math.random()*2}s ease-out forwards;`,['⭐','🌟','✨','💫','★'][~~(Math.random()*5)],3500),Math.random()*dur*.6);}
function spawnMeteors(dur){for(let i=0;i<20;i++)setTimeout(()=>spawnEl('mtrf',`left:${Math.random()*80}vw;top:${Math.random()*40}vh;width:2px;height:${60+Math.random()*120}px;animation:mtrfall ${.6+Math.random()*.8}s linear forwards;background:linear-gradient(to bottom,#fff,transparent);border-radius:99px;`,null,2000),i*200+Math.random()*300);}
function spawnBirthday(dur){const its=['🎂','🎉','🎊','🎈','🎁','🥳','🍰'];for(let i=0;i<12;i++)setTimeout(()=>spawnEl('ckb',`left:${5+Math.random()*90}vw;bottom:${10+Math.random()*30}vh;font-size:${28+Math.random()*24}px;animation:ckbounce 1s ease-out forwards;`,its[~~(Math.random()*its.length)],dur+500),i*150);}
function spawnCats(dur){const its=['🐱','🐈','🐾'];for(let i=0;i<6;i++)setTimeout(()=>{const el=document.createElement('div');el.className='catr';const fr=Math.random()>.5;const ad=1.5+Math.random();el.style.cssText=`position:fixed;top:${20+Math.random()*60}vh;font-size:${28+Math.random()*20}px;z-index:9001;pointer-events:none;transition:left ${ad}s linear,right ${ad}s linear;${fr?'right:-60px':'left:-60px'};`;el.textContent=its[~~(Math.random()*its.length)];if(fr)el.style.transform='scaleX(-1)';document.body.appendChild(el);requestAnimationFrame(()=>{el.style[fr?'right':'left']='110vw';});setTimeout(()=>el.remove(),ad*1000+200);},i*300+Math.random()*400);}
function animFW(ctx,canvas,dur){const fw=[],pf=[];const cols=['#ff8fab','#ffd700','#ff6b6b','#51cf66','#339af0','#cc5de8','#fff'];function nfw(){return{x:Math.random()*canvas.width,y:Math.random()*canvas.height*.6,vx:(Math.random()-.5)*2,vy:-8-Math.random()*6,life:1,col:cols[~~(Math.random()*cols.length)],exploded:false};}function expl(f){for(let i=0;i<80;i++){const a=Math.random()*Math.PI*2,sp=2+Math.random()*6;pf.push({x:f.x,y:f.y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,life:1,col:f.col,sz:2+Math.random()*2});}}let n=0;const loop=()=>{ctx.fillStyle='rgba(0,0,0,.18)';ctx.fillRect(0,0,canvas.width,canvas.height);if(n<8&&Math.random()<.08){fw.push(nfw());n++;}for(let i=fw.length-1;i>=0;i--){const f=fw[i];f.x+=f.vx;f.y+=f.vy;f.vy+=.25;f.life-=.02;if(!f.exploded&&f.vy>=0){expl(f);f.exploded=true;}if(f.life<=0||f.exploded){fw.splice(i,1);continue;}ctx.beginPath();ctx.arc(f.x,f.y,3,0,Math.PI*2);ctx.fillStyle=f.col;ctx.fill();}for(let i=pf.length-1;i>=0;i--){const p=pf[i];p.x+=p.vx;p.y+=p.vy;p.vy+=.12;p.vx*=.97;p.life-=.018;if(p.life<=0){pf.splice(i,1);continue;}ctx.globalAlpha=p.life;ctx.beginPath();ctx.arc(p.x,p.y,p.sz,0,Math.PI*2);ctx.fillStyle=p.col;ctx.fill();ctx.globalAlpha=1;}if(fw.length||pf.length)S._animRaf=requestAnimationFrame(loop);else ctx.clearRect(0,0,canvas.width,canvas.height);};S._animRaf=requestAnimationFrame(loop);}
function animLightning(canvas,ctx,dur){let f=0;function bolt(x1,y1,x2,y2,sp){if(sp<3){ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();return;}const mx=(x1+x2)/2+(Math.random()-.5)*sp,my=(y1+y2)/2+(Math.random()-.5)*sp;bolt(x1,y1,mx,my,sp/2);bolt(mx,my,x2,y2,sp/2);}const loop=()=>{ctx.clearRect(0,0,canvas.width,canvas.height);if(Math.random()<.3){ctx.strokeStyle=`rgba(200,220,255,${.6+Math.random()*.4})`;ctx.lineWidth=2+Math.random()*3;ctx.shadowColor='#aaf';ctx.shadowBlur=20;const sx=Math.random()*canvas.width;bolt(sx,0,sx+(Math.random()-.5)*200,canvas.height*.7,canvas.width*.15);ctx.shadowBlur=0;ctx.fillStyle=`rgba(150,180,255,${Math.random()*.12})`;ctx.fillRect(0,0,canvas.width,canvas.height);}f++;if(f<dur/16)S._animRaf=requestAnimationFrame(loop);else ctx.clearRect(0,0,canvas.width,canvas.height);};S._animRaf=requestAnimationFrame(loop);}
function animBubbles(ctx,canvas,dur){const bs=[];const bcols=['rgba(255,143,171,.6)','rgba(150,200,255,.5)','rgba(200,255,200,.5)','rgba(255,220,150,.5)','rgba(220,150,255,.5)'];for(let i=0;i<40;i++)bs.push({x:Math.random()*canvas.width,y:canvas.height+Math.random()*200,r:10+Math.random()*40,vy:-.5-Math.random()*1.5,vx:(Math.random()-.5)*.5,life:1,col:bcols[~~(Math.random()*bcols.length)]});let fr=0;const loop=()=>{ctx.clearRect(0,0,canvas.width,canvas.height);bs.forEach(b=>{b.x+=b.vx;b.y+=b.vy;b.life-=.005;ctx.globalAlpha=b.life;ctx.beginPath();ctx.arc(b.x,b.y,b.r,0,Math.PI*2);ctx.strokeStyle=b.col;ctx.lineWidth=2;ctx.stroke();ctx.beginPath();ctx.arc(b.x-b.r*.3,b.y-b.r*.3,b.r*.2,0,Math.PI*2);ctx.fillStyle='rgba(255,255,255,.4)';ctx.fill();ctx.globalAlpha=1;});fr++;if(fr<dur/16&&bs.some(b=>b.life>0))S._animRaf=requestAnimationFrame(loop);else ctx.clearRect(0,0,canvas.width,canvas.height);};S._animRaf=requestAnimationFrame(loop);}

// ══════════════════════════════
//  TYPING INDICATOR
// ══════════════════════════════
function showTyping(){const ca=$i('chat-area');const d=document.createElement('div');d.id='typing';d.className='msg-group ai';d.innerHTML='<div class="bubble"><div class="typing-dots"><div class="tdot"></div><div class="tdot"></div><div class="tdot"></div></div></div>';ca.appendChild(d);scrollTo_(false);}
function removeTyping(){$i('typing')?.remove();}

// ══════════════════════════════
//  HELPERS
// ══════════════════════════════
function esc(s){return(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function fmtDate(ts){if(!ts)return'今天';const d=new Date(ts),n=new Date();if(d.toDateString()===n.toDateString())return'今天';const y=new Date(n);y.setDate(y.getDate()-1);if(d.toDateString()===y.toDateString())return'昨天';return`${d.getMonth()+1}月${d.getDate()}日`;}
function fmtTime(ts){if(!ts)return'';const d=new Date(ts);return`${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;}
function fmtTimeFull(ts){return ts?`${fmtDate(ts)} ${fmtTime(ts)}`:''}
function fmtText(t){return esc(t).replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>').replace(/\*(.*?)\*/g,'<em>$1</em>').replace(/`([^`]+)`/g,'<code style="background:rgba(0,0,0,.08);padding:1px 5px;border-radius:4px;font-family:monospace">$1</code>').replace(/\n/g,'<br>');}
function onKey(e){if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendMsg();}}
function autoH(el){el.style.height='auto';el.style.height=Math.min(el.scrollHeight,100)+'px';}
function toast(msg,dur=2000){const t=$i('toast');t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),dur);}
function closeModal(id){$i(id).classList.remove('show');}

// ★ 修复表情按钮：outsideClick 不干扰 btn-emoji 本身的点击
function outsideClick(e) {
  const emojiBtn = $i('btn-emoji');
  const emojiPicker = $i('emoji-picker');
  if (emojiBtn && (emojiBtn === e.target || emojiBtn.contains(e.target))) return;
  if (emojiPicker && emojiPicker.contains(e.target)) return;
  if (emojiPicker) emojiPicker.classList.remove('show');
  if (!$i('ctx-menu').contains(e.target)) closeCtxMenu();
}

// ══════════════════════════════
//  BOOT
// ══════════════════════════════
$i('btn-new-chat').addEventListener('click', newChat);
window.addEventListener('DOMContentLoaded', init);

if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {});

// ══════════════════════════════
//  MOBILE SIDEBAR
// ══════════════════════════════
function openSidebar() {
  document.getElementById('sidebar').classList.add('open');
  document.getElementById('sidebar-overlay').classList.add('show');
}
function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebar-overlay').classList.remove('show');
}
function isMobile() { return window.innerWidth <= 768; }

function applyMobileUI() {
  const mobile = isMobile();
  const ham = document.getElementById('btn-hamburger');
  const closeBtn = document.getElementById('btn-sidebar-close');
  if (ham) ham.style.display = mobile ? 'flex' : 'none';
  if (closeBtn) closeBtn.style.display = mobile ? 'flex' : 'none';
}
window.addEventListener('resize', applyMobileUI);
document.addEventListener('DOMContentLoaded', applyMobileUI);
window.addEventListener('load', () => { applyMobileUI(); });

document.addEventListener('click', e => {
  if (isMobile() && e.target.closest('.chat-item')) {
    setTimeout(closeSidebar, 100);
  }
});

// ══════════════════════════════
//  FIREBASE AUTH & CLOUD SYNC
// ══════════════════════════════
let _authMode = 'login';

function openAuthModal() {
  switchAuthTab('login');
  $i('auth-error').style.display = 'none';
  $i('auth-email').value = '';
  $i('auth-password').value = '';
  if (window._fbUser) {
    $i('auth-logout-btn').style.display = 'block';
    $i('auth-submit-btn').style.display = 'none';
  } else {
    $i('auth-logout-btn').style.display = 'none';
    $i('auth-submit-btn').style.display = 'block';
  }
  $i('auth-modal').classList.add('show');
}

function switchAuthTab(mode) {
  _authMode = mode;
  const isLogin = mode === 'login';
  $i('auth-tab-login').style.background  = isLogin ? 'var(--accent)' : 'var(--hover)';
  $i('auth-tab-login').style.color       = isLogin ? '#fff' : 'var(--text2)';
  $i('auth-tab-register').style.background = !isLogin ? 'var(--accent)' : 'var(--hover)';
  $i('auth-tab-register').style.color      = !isLogin ? '#fff' : 'var(--text2)';
  $i('auth-submit-btn').textContent = isLogin ? '登录' : '注册';
}

async function doAuth() {
  const email    = $i('auth-email').value.trim();
  const password = $i('auth-password').value;
  const errEl    = $i('auth-error');
  errEl.style.display = 'none';
  if (!email || !password) { errEl.textContent = '请填写邮箱和密码'; errEl.style.display='block'; return; }
  const { createUserWithEmailAndPassword, signInWithEmailAndPassword } = window._fbLib;
  const auth = window._fbAuth;
  try {
    if (_authMode === 'register') {
      await createUserWithEmailAndPassword(auth, email, password);
      toast('✅ 注册成功！');
    } else {
      await signInWithEmailAndPassword(auth, email, password);
      toast('✅ 登录成功！');
    }
    closeModal('auth-modal');
    updateAuthUI(window._fbUser);
  } catch(e) {
    const msgs = {
      'auth/email-already-in-use': '该邮箱已注册',
      'auth/invalid-email': '邮箱格式有误',
      'auth/weak-password': '密码至少6位',
      'auth/user-not-found': '账号不存在',
      'auth/wrong-password': '密码错误',
      'auth/invalid-credential': '邮箱或密码错误',
    };
    errEl.textContent = msgs[e.code] || e.message;
    errEl.style.display = 'block';
  }
}

async function doLogout() {
  await window._fbLib.signOut(window._fbAuth);
  toast('已退出登录');
  closeModal('auth-modal');
  updateAuthUI(null);
}

async function resetPassword() {
  const email = $i('auth-email').value.trim();
  if (!email) { $i('auth-error').textContent='请先填写邮箱'; $i('auth-error').style.display='block'; return; }
  try {
    await window._fbLib.sendPasswordResetEmail(window._fbAuth, email);
    toast('✅ 重置邮件已发送，请检查邮箱');
    closeModal('auth-modal');
  } catch(e) {
    $i('auth-error').textContent='发送失败：' + e.message;
    $i('auth-error').style.display='block';
  }
}

function updateAuthUI(user) {
  const txt = $i('auth-status-txt');
  const btn = $i('auth-action-btn');
  const ai  = $i('auth-info');
  if (txt) txt.textContent = user ? ('☁️ ' + user.email) : '未登录';
  if (btn) {
    btn.textContent = user ? '云同步' : '登录 / 注册';
    btn.onclick = user ? () => syncToCloud() : () => openAuthModal();
  }
  if (ai) ai.textContent = user ? ('已登录：' + user.email) : '未登录';
  if (user) startBackendListeners(user.uid);
  else stopBackendListeners();
}

// ─── Backend Firestore listeners ───────────────────────────────────────────────
let _backendUnsubs = [];

function stopBackendListeners() {
  _backendUnsubs.forEach(u => u());
  _backendUnsubs = [];
}

function startBackendListeners(uid) {
  stopBackendListeners(); // clear any existing
  if (!window._fbLib || !window._fbDb) return;
  const { onSnapshot, query, where, collection } = window._fbLib;
  const fsDb = window._fbDb;
  const startTs = Date.now();

  // 1. Listen for backend-generated comments (AI replies to moments)
  const commentsUnsub = onSnapshot(
    query(
      collection(fsDb, 'users', uid, 'comments'),
      where('byBackend', '==', true),
      where('ts', '>', startTs)
    ),
    async snapshot => {
      for (const change of snapshot.docChanges()) {
        if (change.type !== 'added') continue;
        const c = { id: change.doc.id, ...change.doc.data() };
        await dbPut('comments', c);
        // Re-render the moment card if visible
        const m = await dbGet('moments', c.momentId);
        if (m) {
          const old = $i('mc-' + c.momentId);
          if (old) { const card = await makeMomentCard(m); old.replaceWith(card); }
        }
        toast(`💬 ${c.author} 回复了朋友圈`);
      }
    },
    err => console.warn('[BackendListener] comments:', err.message)
  );
  _backendUnsubs.push(commentsUnsub);

  // 2. Listen for backend-generated Moments (AI auto-posts)
  const momentsUnsub = onSnapshot(
    query(
      collection(fsDb, 'users', uid, 'moments'),
      where('byBackend', '==', true),
      where('ts', '>', startTs)
    ),
    async snapshot => {
      for (const change of snapshot.docChanges()) {
        if (change.type !== 'added') continue;
        const m = { id: change.doc.id, ...change.doc.data() };
        await dbPut('moments', m);
        // Refresh moments page if currently open
        if ($i('moments-page')?.classList.contains('active')) renderMoments();
        toast(`✨ ${m.author} 发了一条朋友圈`);
      }
    },
    err => console.warn('[BackendListener] moments:', err.message)
  );
  _backendUnsubs.push(momentsUnsub);

  // 3. Listen for proactive messages from backend
  const proMsgUnsub = onSnapshot(
    query(
      collection(fsDb, 'users', uid, 'proactiveMsgs'),
      where('read', '==', false)
    ),
    async snapshot => {
      for (const change of snapshot.docChanges()) {
        if (change.type !== 'added') continue;
        const msg = { id: change.doc.id, ...change.doc.data() };
        if (msg.ts <= startTs - 60_000) continue; // skip messages older than 1 min at startup

        // Mark as read in Firestore
        change.doc.ref.update({ read: true }).catch(() => {});

        // Find or infer the chat for this contact
        const chatId = Object.values(S._chats).find(c => c.contactId === msg.contactId)?.id;
        if (chatId) {
          await addMsg(chatId, { role: 'ai', type: 'text', content: msg.text });
          if (S.currentChat === chatId) { await renderMsgs(); scrollTo_(false); }
        }

        // Show toast notification
        toast(`💌 ${msg.contactName || 'AI'}: ${msg.text.slice(0, 40)}`);
      }
    },
    err => console.warn('[BackendListener] proactiveMsgs:', err.message)
  );
  _backendUnsubs.push(proMsgUnsub);
}

// ── 上传 dataUrl 到 Firebase Storage，返回下载 URL ──
async function uploadDataUrlToStorage(userId, path, dataUrl) {
  const { ref, uploadString, getDownloadURL } = window._fbStorageLib;
  const storageRef = ref(window._fbStorage, `users/${userId}/${path}`);
  await uploadString(storageRef, dataUrl, 'data_url');
  return await getDownloadURL(storageRef);
}

async function syncToCloud() {
  if (!window._fbUser) { toast('请先登录'); openAuthModal(); return; }
  if (!window._fbStorage || !window._fbStorageLib) { toast('❌ Storage 未初始化'); return; }
  const userId = window._fbUser.uid;
  const { doc, setDoc } = window._fbLib;
  const fsDb = window._fbDb;
  toast('☁️ 同步中，图片较多时请稍候…');

  try {
    // 1. 设置
    const settingsData = {};
    for (const [k,v] of Object.entries(S.settings)) settingsData[k] = v ?? null;
    await setDoc(doc(fsDb, 'users', userId, 'meta', 'settings'), settingsData);

    // 2. 联系人（头像图片 → Storage）
    const contacts = await dbGetAll('contacts');
    for (const c of contacts) {
      const data = { ...c };
      if (data.avatar && data.avatar.startsWith('data:')) {
        try { data.avatar = await uploadDataUrlToStorage(userId, `avatars/${c.id}`, data.avatar); }
        catch(e) { data.avatar = '__local__'; }
      }
      await setDoc(doc(fsDb, 'users', userId, 'contacts', c.id), data);
    }

    // 3. 对话
    const chats = await dbGetAll('chats');
    for (const c of chats) await setDoc(doc(fsDb, 'users', userId, 'chats', c.id), c);

    // 4. 记忆
    const memories = await dbGetAll('memories');
    for (const m of memories) await setDoc(doc(fsDb, 'users', userId, 'memories', m.id), m);

    // 5. 朋友圈（图片 → Storage）
    const moments = await dbGetAll('moments');
    for (const m of moments) {
      const data = { ...m };
      if (data.images && data.images.length) {
        const uploaded = [];
        for (let i = 0; i < data.images.length; i++) {
          const imgUrl = data.images[i];
          if (imgUrl && imgUrl.startsWith('data:')) {
            try { uploaded.push(await uploadDataUrlToStorage(userId, `moments/${m.id}/img_${i}`, imgUrl)); }
            catch(e) { uploaded.push(''); }
          } else {
            uploaded.push(imgUrl || '');
          }
        }
        data.images = uploaded;
      }
      await setDoc(doc(fsDb, 'users', userId, 'moments', m.id), data);
    }

    // 6. 评论
    const comments = await dbGetAll('comments');
    for (const c of comments) await setDoc(doc(fsDb, 'users', userId, 'comments', c.id), c);

    // 7. 表情包（图片 → Storage）
    const stickers = await dbGetAll('stickers');
    for (const s of stickers) {
      const data = { ...s };
      if (data.isImg && data.url && data.url.startsWith('data:')) {
        try { data.url = await uploadDataUrlToStorage(userId, `stickers/${s.id}`, data.url); }
        catch(e) {}
      }
      await setDoc(doc(fsDb, 'users', userId, 'stickers', s.id), data);
    }

    // 8. 关键词动画（GIF → Storage）
    const kwAnims = await dbGetAll('kwAnims');
    for (const item of kwAnims) {
      const data = { ...item };
      if (data.type === 'gif' && data.gifData && data.gifData.startsWith('data:')) {
        try { data.gifData = await uploadDataUrlToStorage(userId, `kwanims/${item.id}`, data.gifData); }
        catch(e) {}
      }
      await setDoc(doc(fsDb, 'users', userId, 'kwanims', item.id), data);
    }

    // 9. 换装衣柜（图片 → Storage）
    const wardrobeItems = await dbGetAll('wardrobeItems');
    for (const item of wardrobeItems) {
      const data = { ...item };
      if (data.dataUrl && data.dataUrl.startsWith('data:')) {
        try {
          data.storageUrl = await uploadDataUrlToStorage(userId, `wardrobe/${item.id}`, data.dataUrl);
          data.dataUrl = '';
        } catch(e) {}
      }
      await setDoc(doc(fsDb, 'users', userId, 'wardrobe', item.id), data);
    }

    // 10. 我的相册（图片 → Storage）
    const albumPhotos = await dbGetAll('album');
    for (const p of albumPhotos) {
      const data = { ...p };
      if (data.dataUrl && data.dataUrl.startsWith('data:')) {
        try {
          data.storageUrl = await uploadDataUrlToStorage(userId, `album/${p.id}`, data.dataUrl);
          data.dataUrl = '';
          await dbPut('album', { ...data });
        } catch(e) {}
      }
      await setDoc(doc(fsDb, 'users', userId, 'album', p.id), {
        id: data.id, storageUrl: data.storageUrl || data.url || '', ts: data.ts
      });
    }

    // 11. 陪伴设置
    const companionCfg = readCompanionSettings();
    if (companionCfg) await setDoc(doc(fsDb, 'users', userId, 'meta', 'companion'), companionCfg);

    toast(`✅ 同步完成！联系人${contacts.length} 对话${chats.length} 动态${moments.length} 表情包${stickers.length} 动画${kwAnims.length} 换装${wardrobeItems.length} 相册${albumPhotos.length}`);
  } catch(e) {
    toast('❌ 同步失败：' + e.message);
    console.error(e);
  }
}

async function restoreFromCloud() {
  if (!window._fbUser) { toast('请先登录'); openAuthModal(); return; }
  if (!confirm('从云端恢复数据？会覆盖本地同名数据。')) return;
  const userId = window._fbUser.uid;
  const { collection, getDocs, doc, getDoc } = window._fbLib;
  const fsDb = window._fbDb;
  toast('⬇️ 恢复中…');
  try {
    // 联系人
    const contactsSnap = await getDocs(collection(fsDb, 'users', userId, 'contacts'));
    for (const d of contactsSnap.docs) {
      const data = d.data(); await dbPut('contacts', data); S._contacts[data.id] = data;
    }
    // 对话
    const chatsSnap = await getDocs(collection(fsDb, 'users', userId, 'chats'));
    for (const d of chatsSnap.docs) {
      const data = d.data(); await dbPut('chats', data); S._chats[data.id] = data;
    }
    // 记忆
    const memsSnap = await getDocs(collection(fsDb, 'users', userId, 'memories'));
    for (const d of memsSnap.docs) {
      const data = d.data(); await dbPut('memories', data);
      if (!S._memories.find(m => m.id === data.id)) S._memories.push(data);
    }
    // 朋友圈
    const momentsSnap = await getDocs(collection(fsDb, 'users', userId, 'moments'));
    for (const d of momentsSnap.docs) await dbPut('moments', d.data());
    // 评论
    const commentsSnap = await getDocs(collection(fsDb, 'users', userId, 'comments'));
    for (const d of commentsSnap.docs) await dbPut('comments', d.data());
    // 表情包
    S._stickers = [];
    const stickersSnap = await getDocs(collection(fsDb, 'users', userId, 'stickers'));
    for (const d of stickersSnap.docs) {
      const data = d.data();
      await dbPut('stickers', data);
      S._stickers.push(data);
    }
    // 关键词动画
    S.kwAnims = [];
    const kwAnimsSnap = await getDocs(collection(fsDb, 'users', userId, 'kwanims'));
    for (const d of kwAnimsSnap.docs) {
      const data = d.data();
      await dbPut('kwAnims', data);
      S.kwAnims.push(data);
    }
    // 换装衣柜
    const wardrobeItems = [];
    const wardrobeSnap = await getDocs(collection(fsDb, 'users', userId, 'wardrobe'));
    for (const d of wardrobeSnap.docs) {
      const data = d.data();
      if (data.storageUrl && !data.dataUrl) data.dataUrl = data.storageUrl;
      await dbPut('wardrobeItems', data);
      wardrobeItems.push(data);
    }
    // 将换装数据发送给 iframe
    const wframe = document.getElementById('wardrobe-iframe');
    if (wframe && wframe.contentWindow) {
      wframe.contentWindow.postMessage({ type: 'SET_WARDROBE', items: wardrobeItems }, '*');
    }
    // 我的相册
    const albumSnap = await getDocs(collection(fsDb, 'users', userId, 'album'));
    for (const d of albumSnap.docs) {
      const data = d.data();
      await dbPut('album', { id: data.id, url: data.storageUrl || '', ts: data.ts || Date.now() });
    }
    // 陪伴设置
    const compDoc = await getDoc(doc(fsDb, 'users', userId, 'meta', 'companion'));
    if (compDoc.exists()) applyCompanionSettings(compDoc.data());

    renderChatList(); renderContacts(); renderMemories(); renderMoments();
    toast('✅ 恢复完成！');
  } catch(e) {
    toast('❌ 恢复失败：' + e.message);
    console.error(e);
  }
}

// ── 读取陪伴设置（从 DOM 元素） ──
function readCompanionSettings() {
  const get = id => { const el = document.getElementById(id); return el ? el.value : null; };
  const getB = id => { const el = document.getElementById(id); return el ? el.checked : false; };
  return {
    scene: get('comp-scene'), sceneCustom: get('comp-scene-custom'),
    contact: get('comp-contact'), freq: get('comp-freq'),
    charType: get('comp-char-type'), charBuiltin: get('comp-char-builtin'), charSize: get('comp-char-size'),
    bgType: get('comp-bg-type'), bgBuiltin: get('comp-bg-builtin'), bgFit: get('comp-bg-fit'),
    musicLoop: getB('comp-music-loop'), musicVol: get('comp-music-vol'),
    timerMode: get('comp-timer-mode'), countdownMin: get('comp-countdown-min'),
    pomoFocus: get('comp-pomo-focus'), pomoBreak: get('comp-pomo-break'),
  };
}

// ── 应用陪伴设置到 DOM ──
function applyCompanionSettings(cfg) {
  if (!cfg) return;
  const set = (id, val) => { const el = document.getElementById(id); if (el && val != null) el.value = val; };
  const setB = (id, val) => { const el = document.getElementById(id); if (el && val != null) el.checked = !!val; };
  set('comp-scene', cfg.scene); set('comp-scene-custom', cfg.sceneCustom);
  set('comp-freq', cfg.freq);
  set('comp-char-type', cfg.charType); set('comp-char-builtin', cfg.charBuiltin); set('comp-char-size', cfg.charSize);
  set('comp-bg-type', cfg.bgType); set('comp-bg-builtin', cfg.bgBuiltin); set('comp-bg-fit', cfg.bgFit);
  setB('comp-music-loop', cfg.musicLoop); set('comp-music-vol', cfg.musicVol);
  set('comp-timer-mode', cfg.timerMode); set('comp-countdown-min', cfg.countdownMin);
  set('comp-pomo-focus', cfg.pomoFocus); set('comp-pomo-break', cfg.pomoBreak);
}

// ══════════════════════════════════════════
//  我的相册
// ══════════════════════════════════════════

async function openAlbumModal() {
  await renderAlbumGrid();
  document.getElementById('album-modal').classList.add('show');
}

async function renderAlbumGrid() {
  const photos = await dbGetAll('album');
  photos.sort((a, b) => b.ts - a.ts);
  const grid = document.getElementById('album-grid');
  const countEl = document.getElementById('album-count');
  if (countEl) countEl.textContent = `共 ${photos.length} 张`;
  if (!grid) return;
  grid.innerHTML = '';
  for (const p of photos) {
    const imgSrc = p.url || p.storageUrl || p.dataUrl || '';
    const div = document.createElement('div');
    div.style.cssText = 'position:relative;border-radius:9px;overflow:hidden;aspect-ratio:1;background:var(--bg2);';
    div.innerHTML = `<img src="${imgSrc}" style="width:100%;height:100%;object-fit:cover;" loading="lazy">
      <button onclick="deleteAlbumPhoto('${p.id}')" style="position:absolute;top:4px;right:4px;width:20px;height:20px;border-radius:50%;background:rgba(0,0,0,.55);color:#fff;border:none;cursor:pointer;font-size:10px;display:flex;align-items:center;justify-content:center;">✕</button>`;
    grid.appendChild(div);
  }
}

async function uploadAlbumPhotos(input) {
  if (!input.files.length) return;
  toast('上传中…');
  for (const file of input.files) {
    const dataUrl = await new Promise(r => { const fr = new FileReader(); fr.onload = e => r(e.target.result); fr.readAsDataURL(file); });
    const photoId = uid();
    let url = dataUrl;
    if (window._fbUser && window._fbStorage && window._fbStorageLib) {
      try {
        url = await uploadDataUrlToStorage(window._fbUser.uid, `album/${photoId}`, dataUrl);
        const { doc, setDoc } = window._fbLib;
        await setDoc(doc(window._fbDb, 'users', window._fbUser.uid, 'album', photoId), { id: photoId, storageUrl: url, ts: Date.now() });
      } catch(e) { url = dataUrl; }
    }
    await dbPut('album', { id: photoId, url, ts: Date.now() });
  }
  input.value = '';
  toast('✅ 照片已上传到相册');
  await renderAlbumGrid();
}

async function deleteAlbumPhoto(id) {
  await dbDel('album', id);
  await renderAlbumGrid();
}

// 供 AI 发朋友圈时随机取图
async function getRandomAlbumPhoto() {
  const photos = await dbGetAll('album');
  if (!photos.length) return null;
  const p = photos[Math.floor(Math.random() * photos.length)];
  return p.url || p.storageUrl || p.dataUrl || null;
}

// ══════════════════════════════════════════
//  表情包库配置
// ══════════════════════════════════════════

async function saveStickerLibConfig() {
  S.settings.stickerLibKey = document.getElementById('sticker-lib-key')?.value?.trim() || '';
  S.settings.stickerCallPrompt = document.getElementById('sticker-call-prompt')?.value?.trim() || '';
  await saveSettings_();
  toast('✅ 表情包库配置已保存');
}

// ══════════════════════════════════════════
//  换装 ↔ 主窗口 postMessage 桥
// ══════════════════════════════════════════

window.addEventListener('message', async (e) => {
  if (!e.data || e.data.type !== 'WARDROBE_DATA') return;
  const items = e.data.items || [];
  await dbClear('wardrobeItems');
  for (const item of items) await dbPut('wardrobeItems', item);
});

// ══════════════════════════════════════════
//  MINI GAMES
// ══════════════════════════════════════════

// ── Game Hub: Floating Stars ──
function initGameHubStars() {
  const el = $i('game-hub-stars');
  if (!el || el.children.length > 0) return;
  for (let i = 0; i < 90; i++) {
    const s = document.createElement('div');
    const sz = Math.random() * 2.5 + 0.5;
    s.style.cssText = `position:absolute;width:${sz}px;height:${sz}px;border-radius:50%;background:#fff;`
      + `opacity:${(Math.random() * 0.6 + 0.15).toFixed(2)};`
      + `left:${(Math.random() * 100).toFixed(1)}%;top:${(Math.random() * 100).toFixed(1)}%;`
      + `animation:star-twinkle ${(2 + Math.random() * 3).toFixed(1)}s ease-in-out infinite ${(Math.random() * 4).toFixed(1)}s`;
    el.appendChild(s);
  }
}

// ══ Gomoku (五子棋) ══════════════════════
const PIECE_OPTIONS = [
  { key: 'classic', label: '⚫经典', emoji: null },
  { key: 'bear',    label: '🐻', emoji: '🐻' },
  { key: 'panda',   label: '🐼', emoji: '🐼' },
  { key: 'cat',     label: '🐱', emoji: '🐱' },
  { key: 'smile-cat', label: '😺', emoji: '😺' },
  { key: 'fox',     label: '🦊', emoji: '🦊' },
  { key: 'raccoon', label: '🦝', emoji: '🦝' },
  { key: 'rabbit',  label: '🐰', emoji: '🐰' },
  { key: 'bunny',   label: '🐇', emoji: '🐇' },
  { key: 'dog',     label: '🐶', emoji: '🐶' },
  { key: 'star',    label: '⭐', emoji: '⭐' },
  { key: 'heart',   label: '💗', emoji: '💗' },
  { key: 'moon',    label: '🌙', emoji: '🌙' },
  { key: 'flower',  label: '🌸', emoji: '🌸' },
];
// Legacy mapping for backward compat
const PIECE_STYLES = {
  classic: { p: null,   ai: null },
  bear:    { p: '🐻',  ai: '🐼' },
  cat:     { p: '🐱',  ai: '😺' },
  fox:     { p: '🦊',  ai: '🦝' },
  rabbit:  { p: '🐰',  ai: '🐇' },
  dog:     { p: '🐶',  ai: '🐕' },
  wolf:    { p: '🐺',  ai: '🦴' },
};
const BOARD_COLORS = {
  wood:'gmk-board-wood', pink:'gmk-board-pink', purple:'gmk-board-purple',
  blue:'gmk-board-blue', green:'gmk-board-green', dark:'gmk-board-dark',
};

const GOMOKU = {
  board: null,
  turn: 'player',
  over: false,
  lastMove: null,
  thinking: false,
  moveCount: 0,
  startTime: 0,
  contactId: null,   // currently selected AI contact id; 'none' = no AI
  _history: [],      // conversation history for multi-turn context
  prefs: { boardColor:'wood', playerPiece:'classic', aiPiece:'panda', commentary:true, difficulty:'normal', commentFreq:'normal' },
};

// ── Prefs load/save ──
async function loadGomokuPrefs() {
  const saved = await getSetting('gomokuPrefs');
  if (saved) {
    Object.assign(GOMOKU.prefs, saved);
    // Migrate old pieceStyle to new separate player/AI pieces
    if (saved.pieceStyle && !saved.playerPiece) {
      const old = PIECE_STYLES[saved.pieceStyle];
      GOMOKU.prefs.playerPiece = old?.p ? saved.pieceStyle : 'classic';
      // Map old ai piece to nearest PIECE_OPTIONS key
      const aiEmoji = old?.ai;
      const found = PIECE_OPTIONS.find(o => o.emoji === aiEmoji);
      GOMOKU.prefs.aiPiece = found ? found.key : 'panda';
      delete GOMOKU.prefs.pieceStyle;
    }
  }
  // Apply UI state
  const ct = $i('gmk-commentary-toggle');
  if (ct) ct.checked = GOMOKU.prefs.commentary;
  // board color swatch
  document.querySelectorAll('#gmk-color-row .gmk-color-swatch').forEach(el => {
    el.classList.toggle('active', el.dataset.color === GOMOKU.prefs.boardColor);
  });
  // difficulty buttons
  document.querySelectorAll('#gomoku-settings .gmk-diff-btn').forEach(el => {
    el.classList.toggle('active', el.dataset.diff === GOMOKU.prefs.difficulty);
  });
  // comment freq
  const cf = $i('gmk-comment-freq');
  if (cf) cf.value = GOMOKU.prefs.commentFreq || 'normal';
  // piece option buttons
  document.querySelectorAll('#gmk-player-piece-row .gmk-piece-opt').forEach(el => {
    el.classList.toggle('active', el.dataset.key === GOMOKU.prefs.playerPiece);
  });
  document.querySelectorAll('#gmk-ai-piece-row .gmk-piece-opt').forEach(el => {
    el.classList.toggle('active', el.dataset.key === GOMOKU.prefs.aiPiece);
  });
}
async function saveGomokuPrefs() { await saveSetting('gomokuPrefs', GOMOKU.prefs); }

function setGomokuBoard(color, el) {
  GOMOKU.prefs.boardColor = color;
  document.querySelectorAll('.gmk-color-swatch').forEach(s => s.classList.remove('active'));
  el.classList.add('active');
  const board = $i('gomoku-board');
  if (board) { board.className = 'gomoku-board ' + (BOARD_COLORS[color] || 'gmk-board-wood'); }
  saveGomokuPrefs();
}
function setGomokuPiece(style, el) {
  GOMOKU.prefs.pieceStyle = style;
  document.querySelectorAll('.gmk-piece-btn').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  gmkUpdatePlayerIndicators();
  saveGomokuPrefs();
}
function setGomokuPlayerPiece(key, el) {
  GOMOKU.prefs.playerPiece = key;
  document.querySelectorAll('#gmk-player-piece-row .gmk-piece-opt').forEach(b => b.classList.remove('active'));
  if (el) el.classList.add('active');
  gmkUpdatePlayerIndicators();
  saveGomokuPrefs();
}
function setGomokuAiPiece(key, el) {
  GOMOKU.prefs.aiPiece = key;
  document.querySelectorAll('#gmk-ai-piece-row .gmk-piece-opt').forEach(b => b.classList.remove('active'));
  if (el) el.classList.add('active');
  gmkUpdatePlayerIndicators();
  saveGomokuPrefs();
}
function setGomokuDiff(diff, el) {
  GOMOKU.prefs.difficulty = diff;
  document.querySelectorAll('#gomoku-settings .gmk-diff-btn').forEach(b => b.classList.remove('active'));
  if (el) el.classList.add('active');
  saveGomokuPrefs();
}
function setGomokuCommentFreq(val) {
  GOMOKU.prefs.commentFreq = val;
  saveGomokuPrefs();
}
function toggleGomokuCommentary(val) {
  GOMOKU.prefs.commentary = val;
  saveGomokuPrefs();
}

function gmkGetPieceEmoji(key) {
  const opt = PIECE_OPTIONS.find(o => o.key === key);
  return opt ? opt.emoji : null;
}
function gmkUpdatePlayerIndicators() {
  const playerEmoji = gmkGetPieceEmoji(GOMOKU.prefs.playerPiece);
  const aiEmoji = gmkGetPieceEmoji(GOMOKU.prefs.aiPiece);
  const pEl = $i('gmk-player-piece'), aEl = $i('gmk-ai-piece');
  if (playerEmoji) {
    if (pEl) { pEl.className='gmk-stone-indicator'; pEl.textContent=playerEmoji; pEl.style.fontSize='18px'; pEl.style.background='none'; pEl.style.boxShadow='none'; }
  } else {
    if (pEl) { pEl.className='gmk-stone-indicator black'; pEl.textContent=''; pEl.style=''; }
  }
  if (aiEmoji) {
    if (aEl) { aEl.className='gmk-stone-indicator'; aEl.textContent=aiEmoji; aEl.style.fontSize='18px'; aEl.style.background='none'; aEl.style.boxShadow='none'; }
  } else {
    if (aEl) { aEl.className='gmk-stone-indicator white'; aEl.textContent=''; aEl.style=''; }
  }
}

// ── AI Selector ──
function renderGomokuAiSelector() {
  const el = $i('gmk-ai-selector');
  if (!el) return;
  el.innerHTML = '';
  const noBtn = document.createElement('button');
  noBtn.className = 'gmk-ai-btn' + (GOMOKU.contactId === 'none' ? ' active' : '');
  noBtn.innerHTML = '<span>🎮</span><span>不用助手</span>';
  noBtn.onclick = () => { GOMOKU.contactId = 'none'; renderGomokuAiSelector(); updateGomokuAiDisplay(); };
  el.appendChild(noBtn);
  const contacts = Object.values(S._contacts);
  contacts.forEach(c => {
    const btn = document.createElement('button');
    btn.className = 'gmk-ai-btn' + (GOMOKU.contactId === c.id ? ' active' : '');
    const av = c.avatar?.startsWith('data:') ? `<img src="${c.avatar}" style="width:18px;height:18px;border-radius:50%;object-fit:cover">` : `<span>${c.avatar || '🤖'}</span>`;
    btn.innerHTML = `${av}<span>${esc(c.name)}</span>`;
    btn.onclick = () => { GOMOKU.contactId = c.id; renderGomokuAiSelector(); updateGomokuAiDisplay(); };
    el.appendChild(btn);
  });
}

function updateGomokuAiDisplay() {
  const el = $i('gomoku-ai-name');
  if (GOMOKU.contactId === 'none') {
    if (el) el.textContent = '本地AI（白子）';
    return;
  }
  const contact = GOMOKU.contactId ? S._contacts[GOMOKU.contactId] : (S.currentContact ? S._contacts[S.currentContact] : Object.values(S._contacts)[0]);
  const aiName = contact?.name || 'AI';
  if (el) el.textContent = `${aiName}（白子）`;
}

function toggleGomokuSettings() {
  const panel = $i('gomoku-settings');
  if (!panel) return;
  const show = panel.style.display === 'none';
  panel.style.display = show ? '' : 'none';
  if (show) {
    renderGomokuAiSelector();
    loadGomokuPrefs();
  }
}

function initGomoku() {
  GOMOKU.board = Array.from({ length: 15 }, () => Array(15).fill(0));
  GOMOKU.turn = 'player';
  GOMOKU.over = false;
  GOMOKU.lastMove = null;
  GOMOKU.thinking = false;
  GOMOKU.moveCount = 0;
  GOMOKU.startTime = Date.now();
  GOMOKU._history = [];
  // pick contact (don't override explicit 'none' choice)
  if (!GOMOKU.contactId) {
    GOMOKU.contactId = S.currentContact || Object.keys(S._contacts)[0] || null;
  }
  loadGomokuPrefs().then(() => {
    gmkUpdatePlayerIndicators();
    // apply board color
    const board = $i('gomoku-board');
    if (board) board.className = 'gomoku-board ' + (BOARD_COLORS[GOMOKU.prefs.boardColor] || 'gmk-board-wood');
  });
  updateGomokuAiDisplay();
  renderGomokuBoard();
  gomokuSetStatus('你先行棋，落下黑子！');
  const contact = GOMOKU.contactId !== 'none' ? (GOMOKU.contactId ? S._contacts[GOMOKU.contactId] : null) : null;
  const aiName = contact?.name || 'AI';
  const greeting = GOMOKU.contactId === 'none'
    ? '纯本地模式，AI将使用内置算法对战，没有对话！'
    : contact
      ? `你好呀！我是${aiName}，我们来下五子棋吧，看谁先赢～`
      : '游戏开始！请在设置里选一个AI助手一起玩哦～';
  gomokuSay(greeting);
  // close settings if open
  const panel = $i('gomoku-settings');
  if (panel) panel.style.display = 'none';
}

function renderGomokuBoard() {
  const el = $i('gomoku-board');
  if (!el) return;
  el.innerHTML = '';
  const playerEmoji = gmkGetPieceEmoji(GOMOKU.prefs.playerPiece);
  const aiEmoji = gmkGetPieceEmoji(GOMOKU.prefs.aiPiece);
  for (let r = 0; r < 15; r++) {
    for (let c = 0; c < 15; c++) {
      const cell = document.createElement('div');
      cell.className = 'gmk-cell';
      if (GOMOKU.lastMove && GOMOKU.lastMove[0] === r && GOMOKU.lastMove[1] === c) {
        cell.classList.add('last-move');
      }
      const v = GOMOKU.board[r][c];
      if (v !== 0) {
        const emoji = v === 1 ? playerEmoji : aiEmoji;
        if (emoji) {
          cell.classList.add('emoji-piece');
          cell.textContent = emoji;
        } else {
          const stone = document.createElement('div');
          stone.className = `gmk-stone-piece ${v === 1 ? 'black' : 'white'}`;
          cell.appendChild(stone);
        }
      } else if (!GOMOKU.over && GOMOKU.turn === 'player' && !GOMOKU.thinking) {
        cell.classList.add('clickable');
        cell.addEventListener('click', () => gomokuPlayerMove(r, c));
      }
      el.appendChild(cell);
    }
  }
}

function gomokuSetStatus(msg) {
  const el = $i('gomoku-status');
  if (el) el.textContent = msg;
}

function gomokuSay(text) {
  const el = $i('gomoku-comment');
  if (!el || !text) return;
  el.textContent = text;
  el.style.opacity = '1';
  clearTimeout(el._t);
  el._t = setTimeout(() => { if (el) el.style.opacity = '0'; }, 5500);
}

async function gomokuPlayerMove(r, c) {
  if (GOMOKU.over || GOMOKU.turn !== 'player' || GOMOKU.thinking) return;
  if (GOMOKU.board[r][c] !== 0) return;
  GOMOKU.board[r][c] = 1;
  GOMOKU.lastMove = [r, c];
  GOMOKU.turn = 'ai';
  GOMOKU.moveCount++;
  renderGomokuBoard();
  if (gomokuCheckWin(r, c, 1)) {
    GOMOKU.over = true;
    gomokuSetStatus('🎉 你赢了！');
    await gomokuFinish('player_win');
    return;
  }
  if (gomokuBoardFull()) {
    GOMOKU.over = true;
    gomokuSetStatus('平局！势均力敌～');
    await gomokuFinish('draw');
    return;
  }
  gomokuSetStatus('AI思考中…');
  GOMOKU.thinking = true;
  renderGomokuBoard();
  await gomokuAiMove();
}

function gomokuCheckWin(r, c, player) {
  const dirs = [[0,1],[1,0],[1,1],[1,-1]];
  for (const [dr, dc] of dirs) {
    let cnt = 1;
    for (let i = 1; i < 5; i++) {
      const nr = r + dr*i, nc = c + dc*i;
      if (nr < 0 || nr >= 15 || nc < 0 || nc >= 15 || GOMOKU.board[nr][nc] !== player) break;
      cnt++;
    }
    for (let i = 1; i < 5; i++) {
      const nr = r - dr*i, nc = c - dc*i;
      if (nr < 0 || nr >= 15 || nc < 0 || nc >= 15 || GOMOKU.board[nr][nc] !== player) break;
      cnt++;
    }
    if (cnt >= 5) return true;
  }
  return false;
}

function gomokuBoardFull() {
  return GOMOKU.board.every(row => row.every(v => v !== 0));
}

// ── Threat detection: how many in a row for player after placing at (r,c) ──
function gomokuMaxLine(r, c, player) {
  let max = 0;
  const dirs = [[0,1],[1,0],[1,1],[1,-1]];
  for (const [dr,dc] of dirs) {
    let cnt = 1;
    for (let i=1;i<5;i++){const nr=r+dr*i,nc=c+dc*i;if(nr<0||nr>=15||nc<0||nc>=15||GOMOKU.board[nr][nc]!==player)break;cnt++;}
    for (let i=1;i<5;i++){const nr=r-dr*i,nc=c-dc*i;if(nr<0||nr>=15||nc<0||nc>=15||GOMOKU.board[nr][nc]!==player)break;cnt++;}
    max = Math.max(max, cnt);
  }
  return max;
}

function gomokuGetContact() {
  if (GOMOKU.contactId === 'none') return null;
  return (GOMOKU.contactId ? S._contacts[GOMOKU.contactId] : null)
    || (S.currentContact ? S._contacts[S.currentContact] : null)
    || Object.values(S._contacts)[0] || null;
}

async function gomokuAiMove() {
  const contact = gomokuGetContact();
  const useKey = contact?.apiKey || S.settings.apiKey;
  const useUrl = contact?.apiUrl || 'https://openrouter.ai/api/v1/chat/completions';
  let row, col, comment;
  GOMOKU.moveCount++;

  const difficulty = GOMOKU.prefs.difficulty || 'normal';

  // Determine game phase
  const phase = GOMOKU.moveCount <= 6 ? 'early' : GOMOKU.moveCount <= 20 ? 'mid' : 'late';
  const phaseHint = phase==='early'?'开局阶段，可以随意发挥':phase==='mid'?'中局关键期，要认真思考':'终局阶段，胜负即将揭晓';

  // Check if player has a threatening line (for commentary)
  const playerLastR = GOMOKU.lastMove?.[0], playerLastC = GOMOKU.lastMove?.[1];
  const playerThreat = (playerLastR!=null) ? gomokuMaxLine(playerLastR, playerLastC, 1) : 0;

  // Comment frequency
  const freqMap = { off: 0, low: 5, normal: 3, high: 1 };
  const freq = freqMap[GOMOKU.prefs.commentFreq ?? 'normal'] ?? 3;
  const shouldComment = freq > 0 && GOMOKU.moveCount % freq === 0;

  // No AI mode: use heuristic only, no commentary
  if (GOMOKU.contactId === 'none') {
    const h = gomokuHeuristic();
    row = h.r; col = h.c;
    comment = '';
  // Beginner: skip LLM, use simple heuristic with 40% random nearby move
  } else if (difficulty === 'beginner') {
    const h = gomokuHeuristic();
    if (Math.random() < 0.4 && GOMOKU.moveCount > 1) {
      const candidates = [];
      for (let r=0;r<15;r++) for (let c=0;c<15;c++) {
        if (GOMOKU.board[r][c]!==0) continue;
        for (let dr=-1;dr<=1;dr++) for (let dc=-1;dc<=1;dc++) {
          const nr=r+dr,nc=c+dc;
          if (nr>=0&&nr<15&&nc>=0&&nc<15&&GOMOKU.board[nr][nc]!==0) { candidates.push({r,c}); break; }
        }
      }
      if (candidates.length) { const pick=candidates[Math.floor(Math.random()*candidates.length)]; row=pick.r; col=pick.c; }
    }
    if (typeof row!=='number') { row=h.r; col=h.c; }
    comment = shouldComment ? '嘻嘻，我随便下～' : '';
  } else if (useKey) {
    const blacks = [], whites = [];
    for (let r=0;r<15;r++) for (let c=0;c<15;c++) {
      if (GOMOKU.board[r][c]===1) blacks.push(`(${r},${c})`);
      else if (GOMOKU.board[r][c]===2) whites.push(`(${r},${c})`);
    }
    const boardTxt = `黑子(对手)：${blacks.join('')||'无'}  白子(你)：${whites.join('')||'无'}`;
    const aiName = contact?.name || 'AI';
    const personality = contact?.system || '';
    const model = contact?.model || 'openai/gpt-4o-mini';
    const commentHint = playerThreat >= 4
      ? '对手刚连了4子，需要应对！'
      : playerThreat >= 3
      ? '对手有威胁，注意防守'
      : shouldComment
      ? '可以聊聊棋局感受或调侃对手'
      : '';
    const hardHint = difficulty === 'hard' ? '你是高水平棋手，必须尽全力争胜。' : '';
    const sysPrompt = `你是${aiName}，正在和用户下五子棋。你执白子，用户执黑子，棋盘15×15（行列0-14）。${personality ? `你的性格：${personality}。` : ''}${hardHint}每次收到棋盘状态后，选择一个空位落子，并用符合你个性的话自然回应（不必局限于"一句话"，语气要真实，有情绪变化）。返回JSON：{"row":数字,"col":数字,"comment":"你的回应"}`;
    const userMsg = `当前棋盘：${boardTxt}\n第${GOMOKU.moveCount}步，${phaseHint}。${commentHint ? '（'+commentHint+'）' : ''}`;
    const history = GOMOKU._history.slice(-20);
    try {
      const res = await fetch(useUrl, {
        method:'POST',
        headers:{'Authorization':`Bearer ${useKey}`,'Content-Type':'application/json','HTTP-Referer':'https://raimos.app','X-Title':'Raimos'},
        body:JSON.stringify({model,max_tokens:150,stream:false,temperature:difficulty==='hard'?0.5:0.8,messages:[{role:'system',content:sysPrompt},...history,{role:'user',content:userMsg}]}),
      });
      const data = await res.json();
      const txt = data.choices?.[0]?.message?.content || '';
      const m = txt.match(/\{[\s\S]*?\}/);
      if (m) {
        const p = JSON.parse(m[0]); row=p.row; col=p.col; comment=p.comment;
        GOMOKU._history.push({role:'user', content:userMsg});
        GOMOKU._history.push({role:'assistant', content:txt});
      }
    } catch(e) {}
  }

  // Validate / heuristic fallback
  if (typeof row!=='number'||typeof col!=='number'||row<0||row>=15||col<0||col>=15||GOMOKU.board[row][col]!==0) {
    const h = gomokuHeuristic();
    row=h.r; col=h.c;
    if (!comment) comment = playerThreat>=4 ? '好险，我得拦住你！' : '嗯，就这里！';
  }

  GOMOKU.board[row][col] = 2;
  GOMOKU.lastMove = [row, col];
  GOMOKU.turn = 'player';
  GOMOKU.thinking = false;
  renderGomokuBoard();
  const showComment = freq > 0 || playerThreat >= 4;
  if (comment && showComment) gomokuSay(comment);

  if (gomokuCheckWin(row, col, 2)) {
    GOMOKU.over = true;
    gomokuSetStatus('AI赢了！再来一局？');
    await gomokuFinish('ai_win');
    return;
  }
  if (gomokuBoardFull()) {
    GOMOKU.over = true;
    gomokuSetStatus('平局！势均力敌～');
    await gomokuFinish('draw');
    return;
  }
  gomokuSetStatus('轮到你了！');
}

// Heuristic: score-based evaluation with win/block priority
function gomokuHeuristic() {
  function scorePos(r, c, player) {
    let score = 0;
    const dirs = [[0,1],[1,0],[1,1],[1,-1]];
    for (const [dr,dc] of dirs) {
      let cnt = 1, open = 0;
      for (let i=1;i<6;i++){const nr=r+dr*i,nc=c+dc*i;if(nr<0||nr>=15||nc<0||nc>=15)break;if(GOMOKU.board[nr][nc]===player)cnt++;else{if(GOMOKU.board[nr][nc]===0)open++;break;}}
      for (let i=1;i<6;i++){const nr=r-dr*i,nc=c-dc*i;if(nr<0||nr>=15||nc<0||nc>=15)break;if(GOMOKU.board[nr][nc]===player)cnt++;else{if(GOMOKU.board[nr][nc]===0)open++;break;}}
      if(cnt>=5)score+=100000;
      else if(cnt===4&&open>0)score+=10000;
      else if(cnt===4)score+=1000;
      else if(cnt===3&&open>=2)score+=500;
      else if(cnt===3&&open===1)score+=100;
      else if(cnt===2&&open>=2)score+=50;
      else if(cnt===2&&open===1)score+=10;
    }
    return score;
  }
  // Priority 1: AI wins
  for(let r=0;r<15;r++)for(let c=0;c<15;c++){
    if(GOMOKU.board[r][c]!==0)continue;
    GOMOKU.board[r][c]=2;const w=gomokuCheckWin(r,c,2);GOMOKU.board[r][c]=0;
    if(w)return{r,c};
  }
  // Priority 2: Block player win
  for(let r=0;r<15;r++)for(let c=0;c<15;c++){
    if(GOMOKU.board[r][c]!==0)continue;
    GOMOKU.board[r][c]=1;const w=gomokuCheckWin(r,c,1);GOMOKU.board[r][c]=0;
    if(w)return{r,c};
  }
  // Priority 3: Best scored position
  let best=null,bestScore=-1;
  for(let r=0;r<15;r++)for(let c=0;c<15;c++){
    if(GOMOKU.board[r][c]!==0)continue;
    let hasNeighbor=false;
    for(let dr=-2;dr<=2&&!hasNeighbor;dr++)for(let dc=-2;dc<=2&&!hasNeighbor;dc++){
      const nr=r+dr,nc=c+dc;
      if(nr>=0&&nr<15&&nc>=0&&nc<15&&GOMOKU.board[nr][nc]!==0)hasNeighbor=true;
    }
    if(!hasNeighbor&&GOMOKU.moveCount>0)continue;
    const aiScore=scorePos(r,c,2)*2;
    const blockScore=scorePos(r,c,1)*1.8;
    const centerBonus=8/(1+Math.abs(r-7)+Math.abs(c-7));
    const total=aiScore+blockScore+centerBonus;
    if(total>bestScore){bestScore=total;best={r,c};}
  }
  return best||{r:7,c:7};
}

// ── Game End ──
async function gomokuFinish(result) {
  const contact = gomokuGetContact();
  const elapsed = Math.round((Date.now() - GOMOKU.startTime) / 1000);
  const aiName = GOMOKU.contactId === 'none' ? '本地AI' : (contact?.name || 'AI');
  await saveGomokuRecord({ result, moves: GOMOKU.moveCount, elapsed, aiName, aiContactId: GOMOKU.contactId, date: Date.now() });
  let aiComment = '';
  const useKey = GOMOKU.contactId !== 'none' && (contact?.apiKey || S.settings.apiKey);
  if (useKey) {
    try {
      const personality = contact?.system || '';
      const resultDesc = result==='player_win'?'用户赢了，你输了':result==='ai_win'?'你赢了，用户输了':'平局';
      const sysPrompt = `你是${contact?.name||'AI'}。${personality ? `性格：${personality}。` : ''}`;
      const userMsg = `对局结束，${resultDesc}，请自然地说几句话。`;
      const history = GOMOKU._history.slice(-10);
      const res = await fetch(contact?.apiUrl||'https://openrouter.ai/api/v1/chat/completions',{method:'POST',headers:{'Authorization':`Bearer ${useKey}`,'Content-Type':'application/json','HTTP-Referer':'https://raimos.app','X-Title':'Raimos'},body:JSON.stringify({model:contact?.model||'openai/gpt-4o-mini',max_tokens:120,stream:false,messages:[{role:'system',content:sysPrompt},...history,{role:'user',content:userMsg}]})});
      const data=await res.json();
      const txt=data.choices?.[0]?.message?.content||'';
      const m=txt.match(/\{[\s\S]*?\}/);
      aiComment = m ? (JSON.parse(m[0]).comment||'') : txt.trim();
    } catch(e){}
  }
  if (!aiComment) aiComment = result==='player_win'?'你赢了！再来一局吧～':result==='ai_win'?'哈哈，我赢了！再来？':'平局！旗鼓相当呢～';
  gomokuSay(aiComment);
  setTimeout(() => showGomokuResult(result, elapsed, aiComment, contact), 800);
}

function showGomokuResult(result, elapsed, aiComment, contact) {
  const overlay = $i('gomoku-result-overlay');
  if (!overlay) return;
  overlay.classList.add('show');

  // Title
  const titleEl = $i('gmk-result-title');
  if (titleEl) {
    const titles = { player_win:'🎉 你赢了！', ai_win:'💫 AI赢了！', draw:'🤝 平局！' };
    titleEl.textContent = titles[result] || '游戏结束';
    titleEl.className = `gmk-result-title ${result==='player_win'?'win':result==='draw'?'draw':''}`;
  }

  // Badges
  const badges = { player_win:['🏆','💔'], ai_win:['💔','🏆'], draw:['🤝','🤝'] };
  const [pb, ab] = badges[result] || ['',''];
  const pbEl=$i('gmk-result-player-badge'), abEl=$i('gmk-result-ai-badge');
  if (pbEl) pbEl.textContent=pb;
  if (abEl) abEl.textContent=ab;

  // Avatars
  const userAv = S.settings.userAvatar || S.settings.avatar || '😊';
  const pAvEl = $i('gmk-result-player-av');
  if (pAvEl) { if (userAv.startsWith('data:')) pAvEl.innerHTML=`<img src="${userAv}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`; else pAvEl.textContent=userAv; }
  const aiAv = contact?.avatar || '🤖';
  const aAvEl = $i('gmk-result-ai-av');
  if (aAvEl) { if (aiAv.startsWith('data:')) aAvEl.innerHTML=`<img src="${aiAv}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`; else aAvEl.textContent=aiAv; }
  const aiNameEl=$i('gmk-result-ai-name'); if (aiNameEl) aiNameEl.textContent=contact?.name||'AI';

  // Stats
  const mm=Math.floor(elapsed/60), ss=elapsed%60;
  const statsEl=$i('gmk-result-stats');
  if (statsEl) statsEl.textContent=`本局用时 ${mm>0?mm+'分':''} ${ss}秒  ·  共落子 ${GOMOKU.moveCount} 步\n"${aiComment}"`;

  // Cat SVG animation
  const catEl = $i('gmk-result-cat');
  if (catEl) {
    if (result === 'player_win') {
      catEl.innerHTML = gomokuWinCatSVG();
    } else if (result === 'ai_win') {
      catEl.innerHTML = gomokuLoseCatSVG();
    } else {
      catEl.innerHTML = '<div style="font-size:60px;animation:cat-bounce .8s ease-in-out infinite">🐱</div>';
    }
  }

  // Confetti on win
  const confEl = $i('gmk-confetti');
  if (confEl) {
    confEl.innerHTML = '';
    if (result === 'player_win') {
      const cols = ['#ff8fab','#a78bfa','#fcd34d','#6ee7b7','#67e8f9','#f472b6','#fb923c'];
      for (let i=0;i<36;i++) {
        const el=document.createElement('div');
        el.className='gmk-confetti-piece';
        const sz=6+Math.random()*7;
        el.style.cssText=`left:${Math.random()*100}%;width:${sz}px;height:${sz}px;background:${cols[i%cols.length]};border-radius:${Math.random()>.5?'50%':'3px'};animation:confetti-fall ${1.2+Math.random()*0.8}s ease-in ${Math.random()*0.5}s forwards`;
        confEl.appendChild(el);
      }
    }
  }
}

function gomokuWinCatSVG() {
  return `<svg class="gmk-cat-win" viewBox="0 0 100 110" xmlns="http://www.w3.org/2000/svg">
    <path d="M26,18 L38,32 L60,10" stroke="#a78bfa" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
    <path d="M22,50 L15,30 L34,46" fill="#fce4f3" stroke="#d48cb8" stroke-width="2" stroke-linejoin="round"/>
    <path d="M78,50 L85,30 L66,46" fill="#fce4f3" stroke="#d48cb8" stroke-width="2" stroke-linejoin="round"/>
    <circle cx="50" cy="62" r="24" fill="#fff5f8" stroke="#d48cb8" stroke-width="2.5"/>
    <path d="M38,57 Q41,53 44,57" fill="none" stroke="#333" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M56,57 Q59,53 62,57" fill="none" stroke="#333" stroke-width="2.5" stroke-linecap="round"/>
    <ellipse cx="50" cy="64" rx="2.5" ry="1.8" fill="#ffb3c1"/>
    <path d="M45,69 Q50,75 55,69" fill="none" stroke="#d48cb8" stroke-width="2" stroke-linecap="round"/>
    <ellipse cx="36" cy="65" rx="5" ry="3" fill="#ffb3c1" opacity="0.45"/>
    <ellipse cx="64" cy="65" rx="5" ry="3" fill="#ffb3c1" opacity="0.45"/>
    <rect x="34" y="84" width="32" height="22" rx="11" fill="#fff5f8" stroke="#d48cb8" stroke-width="2.5"/>
    <path d="M34,92 L16,72" stroke="#d48cb8" stroke-width="3" stroke-linecap="round"/>
    <circle cx="14" cy="70" r="5" fill="#fff5f8" stroke="#d48cb8" stroke-width="2"/>
    <path d="M66,92 L84,72" stroke="#d48cb8" stroke-width="3" stroke-linecap="round"/>
    <circle cx="86" cy="70" r="5" fill="#fff5f8" stroke="#d48cb8" stroke-width="2"/>
  </svg>`;
}

function gomokuLoseCatSVG() {
  return `<svg class="gmk-cat-lose" viewBox="0 0 130 80" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="82" cy="56" rx="36" ry="17" fill="#fff5f8" stroke="#d48cb8" stroke-width="2.5"/>
    <circle cx="30" cy="44" r="21" fill="#fff5f8" stroke="#d48cb8" stroke-width="2.5"/>
    <path d="M14,27 L8,12 L24,24" fill="#fce4f3" stroke="#d48cb8" stroke-width="2" stroke-linejoin="round"/>
    <path d="M42,25 L48,11 L44,24" fill="#fce4f3" stroke="#d48cb8" stroke-width="2" stroke-linejoin="round"/>
    <path d="M19,40 Q22,44 25,40" fill="none" stroke="#888" stroke-width="2" stroke-linecap="round"/>
    <path d="M29,40 Q32,44 35,40" fill="none" stroke="#888" stroke-width="2" stroke-linecap="round"/>
    <ellipse cx="19" cy="47" rx="2" ry="3.5" fill="#90cdf4" opacity="0.75"/>
    <ellipse cx="36" cy="50" rx="2.5" ry="1.8" fill="#ffb3c1"/>
    <path d="M28,56 Q32,51 36,56" fill="none" stroke="#d48cb8" stroke-width="2" stroke-linecap="round"/>
    <ellipse cx="17" cy="50" rx="4" ry="2.5" fill="#ffb3c1" opacity="0.4"/>
    <path d="M51,63 L66,71" stroke="#d48cb8" stroke-width="3" stroke-linecap="round"/>
    <path d="M92,70 L107,64" stroke="#d48cb8" stroke-width="3" stroke-linecap="round"/>
    <path d="M118,54 C127,43 129,30 119,22" stroke="#d48cb8" stroke-width="2.5" stroke-linecap="round" fill="none"/>
  </svg>`;
}

function closeGomokuResult() {
  closeModal('gomoku-result-overlay');
}

// ── Records ──
async function saveGomokuRecord(rec) {
  let records = (await getSetting('gomokuRecords')) || [];
  records.unshift({ ...rec, id: uid() });
  if (records.length > 60) records = records.slice(0, 60);
  await saveSetting('gomokuRecords', records);
}

async function openGomokuRecords() {
  const records = (await getSetting('gomokuRecords')) || [];
  const overlay = $i('gomoku-records-modal');
  if (!overlay) return;
  overlay.classList.add('show');

  // Summary
  const wins = records.filter(r=>r.result==='player_win').length;
  const losses = records.filter(r=>r.result==='ai_win').length;
  const draws = records.filter(r=>r.result==='draw').length;
  const sumEl = $i('gmk-records-summary');
  if (sumEl) sumEl.innerHTML = `
    <div style="flex:1"><div style="font-size:22px;font-weight:900;color:#4ade80">${wins}</div><div style="font-size:11px;color:var(--text3)">胜</div></div>
    <div style="flex:1"><div style="font-size:22px;font-weight:900;color:#f87171">${losses}</div><div style="font-size:11px;color:var(--text3)">负</div></div>
    <div style="flex:1"><div style="font-size:22px;font-weight:900;color:var(--text2)">${draws}</div><div style="font-size:11px;color:var(--text3)">平</div></div>
    <div style="flex:1"><div style="font-size:22px;font-weight:900;color:var(--accent)">${records.length}</div><div style="font-size:11px;color:var(--text3)">总局</div></div>`;

  // List
  const listEl = $i('gmk-records-list');
  if (!listEl) return;
  if (!records.length) { listEl.innerHTML = '<div style="text-align:center;padding:30px;color:var(--text3);font-size:13px">还没有对战记录，快去下一局吧！</div>'; return; }
  listEl.innerHTML = '';
  records.forEach(r => {
    const icons = { player_win:'🏆', ai_win:'💔', draw:'🤝' };
    const labels = { player_win:'胜利', ai_win:'败北', draw:'平局' };
    const mm=Math.floor((r.elapsed||0)/60), ss=(r.elapsed||0)%60;
    const date=r.date?new Date(r.date).toLocaleDateString('zh-CN',{month:'numeric',day:'numeric'}):'';
    const el=document.createElement('div');
    el.className='gmk-record-item';
    el.innerHTML=`<div class="gmk-record-result">${icons[r.result]||'🎮'}</div><div class="gmk-record-info"><div style="font-weight:700;color:var(--text)">${labels[r.result]||'未知'} · vs ${esc(r.aiName||'AI')}</div><div class="gmk-record-meta">${date} · ${mm>0?mm+'分':''} ${ss}秒 · ${r.moves||0}步</div></div>`;
    listEl.appendChild(el);
  });
}

async function clearGomokuRecords() {
  if (!confirm('确认清空所有五子棋战绩？')) return;
  await saveSetting('gomokuRecords', []);
  openGomokuRecords();
}

// ══════════════════════════════════════════
// GO GAME (围棋 13×13)
// ══════════════════════════════════════════

const GO = {
  SIZE: 13,
  board: null,
  turn: 'player',
  over: false,
  lastMove: null,
  thinking: false,
  passCount: 0,
  captures: { player: 0, ai: 0 },
  koPoint: null,
  prevBoardState: null,
  startTime: 0,
  contactId: null,   // 'none' = no AI
  _history: [],      // conversation history for multi-turn context
  prefs: { boardColor: 'wood', playerPiece: 'classic', aiPiece: 'panda', commentary: true, difficulty: 'normal', commentFreq: 'normal' },
};

// ── Prefs ──
async function loadGoPrefs() {
  const saved = await getSetting('goPrefs');
  if (saved) {
    Object.assign(GO.prefs, saved);
    // Migrate old pieceStyle
    if (saved.pieceStyle && !saved.playerPiece) {
      const old = PIECE_STYLES[saved.pieceStyle];
      GO.prefs.playerPiece = old?.p ? saved.pieceStyle : 'classic';
      const aiEmoji = old?.ai;
      const found = PIECE_OPTIONS.find(o => o.emoji === aiEmoji);
      GO.prefs.aiPiece = found ? found.key : 'panda';
      delete GO.prefs.pieceStyle;
    }
  }
  const ct = $i('go-commentary-toggle');
  if (ct) ct.checked = GO.prefs.commentary;
  document.querySelectorAll('#go-color-row .gmk-color-swatch').forEach(el => {
    el.classList.toggle('active', el.dataset.color === GO.prefs.boardColor);
  });
  document.querySelectorAll('#go-settings .gmk-diff-btn').forEach(el => {
    el.classList.toggle('active', el.dataset.diff === GO.prefs.difficulty);
  });
  const cf = $i('go-comment-freq');
  if (cf) cf.value = GO.prefs.commentFreq || 'normal';
  document.querySelectorAll('#go-player-piece-row .gmk-piece-opt').forEach(el => {
    el.classList.toggle('active', el.dataset.key === GO.prefs.playerPiece);
  });
  document.querySelectorAll('#go-ai-piece-row .gmk-piece-opt').forEach(el => {
    el.classList.toggle('active', el.dataset.key === GO.prefs.aiPiece);
  });
}
async function saveGoPrefs() { await saveSetting('goPrefs', GO.prefs); }

function setGoBoard(color, el) {
  GO.prefs.boardColor = color;
  const board = $i('go-board');
  if (board) board.className = 'go-board ' + (BOARD_COLORS[color] || 'gmk-board-wood');
  document.querySelectorAll('#go-color-row .gmk-color-swatch').forEach(e => e.classList.toggle('active', e === el));
  saveGoPrefs();
}
function setGoPiece(style, el) {
  GO.prefs.playerPiece = style;
  renderGoBoard();
  saveGoPrefs();
}
function setGoPlayerPiece(key, el) {
  GO.prefs.playerPiece = key;
  document.querySelectorAll('#go-player-piece-row .gmk-piece-opt').forEach(b => b.classList.remove('active'));
  if (el) el.classList.add('active');
  goUpdateAiPieceDisplay();
  renderGoBoard();
  saveGoPrefs();
}
function setGoAiPiece(key, el) {
  GO.prefs.aiPiece = key;
  document.querySelectorAll('#go-ai-piece-row .gmk-piece-opt').forEach(b => b.classList.remove('active'));
  if (el) el.classList.add('active');
  goUpdateAiPieceDisplay();
  renderGoBoard();
  saveGoPrefs();
}
function setGoDiff(diff, el) {
  GO.prefs.difficulty = diff;
  document.querySelectorAll('#go-settings .gmk-diff-btn').forEach(b => b.classList.remove('active'));
  if (el) el.classList.add('active');
  saveGoPrefs();
}
function setGoCommentFreq(val) { GO.prefs.commentFreq = val; saveGoPrefs(); }
function toggleGoCommentary(val) { GO.prefs.commentary = val; saveGoPrefs(); }
function toggleGoSettings() {
  const s = $i('go-settings');
  if (!s) return;
  const show = s.style.display === 'none';
  s.style.display = show ? '' : 'none';
  if (show) { renderGoAiSelector(); loadGoPrefs(); }
}

// ── AI Selector ──
function renderGoAiSelector() {
  const el = $i('go-ai-selector');
  if (!el) return;
  el.innerHTML = '';
  const noBtn = document.createElement('button');
  noBtn.className = 'gmk-ai-btn' + (GO.contactId === 'none' ? ' active' : '');
  noBtn.innerHTML = '<span style="font-size:16px">🎮</span><span style="font-size:11px;font-weight:700">不用助手</span>';
  noBtn.onclick = () => { GO.contactId = 'none'; renderGoAiSelector(); updateGoAiDisplay(); };
  el.appendChild(noBtn);
  const contacts = Object.values(S._contacts || {});
  contacts.forEach(c => {
    const btn = document.createElement('button');
    btn.className = 'gmk-ai-btn' + (GO.contactId === c.id ? ' active' : '');
    const av = c.avatar || '🤖';
    btn.innerHTML = `<span style="font-size:16px">${av.startsWith('data:')?`<img src="${av}" style="width:20px;height:20px;border-radius:50%;object-fit:cover">`:av}</span><span style="font-size:11px;font-weight:700">${esc(c.name)}</span>`;
    btn.onclick = () => { GO.contactId = c.id; renderGoAiSelector(); updateGoAiDisplay(); };
    el.appendChild(btn);
  });
}
function goGetContact() {
  if (GO.contactId === 'none') return null;
  return GO.contactId ? S._contacts[GO.contactId]
    : (S.currentContact ? S._contacts[S.currentContact] : Object.values(S._contacts||{})[0]);
}
function goUpdateAiPieceDisplay() {
  const aiEmoji = gmkGetPieceEmoji(GO.prefs.aiPiece);
  const playerEmoji = gmkGetPieceEmoji(GO.prefs.playerPiece);
  const pEl = $i('go-player-piece'), aEl = $i('go-ai-piece');
  if (playerEmoji) {
    if (pEl) { pEl.className='gmk-stone-indicator'; pEl.textContent=playerEmoji; pEl.style.fontSize='18px'; pEl.style.background='none'; pEl.style.boxShadow='none'; }
  } else {
    if (pEl) { pEl.className='gmk-stone-indicator black'; pEl.textContent=''; pEl.style=''; }
  }
  if (aiEmoji) {
    if (aEl) { aEl.className='gmk-stone-indicator'; aEl.textContent=aiEmoji; aEl.style.fontSize='18px'; aEl.style.background='none'; aEl.style.boxShadow='none'; }
  } else {
    if (aEl) { aEl.className='gmk-stone-indicator white'; aEl.textContent=''; aEl.style=''; }
  }
}
function updateGoAiDisplay() {
  const contact = goGetContact();
  const aiNameEl = $i('go-ai-name');
  if (aiNameEl) aiNameEl.textContent = GO.contactId === 'none' ? '本地AI（白子）' : (contact?.name || 'AI（白子）');
  goUpdateAiPieceDisplay();
}

// ── Init ──
async function initGo() {
  const N = GO.SIZE;
  GO.board = Array.from({ length: N }, () => Array(N).fill(0));
  GO.turn = 'player';
  GO.over = false;
  GO.lastMove = null;
  GO.thinking = false;
  GO.passCount = 0;
  GO.captures = { player: 0, ai: 0 };
  GO.koPoint = null;
  GO.prevBoardState = null;
  GO.startTime = Date.now();
  GO._history = [];

  if (!GO.contactId) {
    GO.contactId = S.currentContact || Object.keys(S._contacts || {})[0] || null;
  }

  await loadGoPrefs();
  const board = $i('go-board');
  if (board) board.className = 'go-board ' + (BOARD_COLORS[GO.prefs.boardColor] || 'gmk-board-wood');

  renderGoAiSelector();
  updateGoAiDisplay();
  renderGoBoard();

  const statusEl = $i('go-status');
  if (statusEl) statusEl.textContent = '你先行（黑子）';
  const commentEl = $i('go-comment');
  if (commentEl) commentEl.textContent = '';
  goUpdateCaptures();
}

function goUpdateCaptures() {
  const pc = $i('go-player-caps');
  const ac = $i('go-ai-caps');
  if (pc) pc.textContent = `提${GO.captures.player}子`;
  if (ac) ac.textContent = `提${GO.captures.ai}子`;
}

function goSay(msg) {
  const el = $i('go-comment');
  if (el) { el.textContent = msg; el.style.display = msg ? '' : 'none'; }
}

// ── Board Render ──
function renderGoBoard() {
  const boardEl = $i('go-board');
  if (!boardEl) return;
  boardEl.innerHTML = '';
  const N = GO.SIZE;
  const playerEmoji = gmkGetPieceEmoji(GO.prefs.playerPiece);
  const aiEmoji = gmkGetPieceEmoji(GO.prefs.aiPiece);

  // Star points (hoshi) for 13x13: 0-indexed
  const starSet = new Set([
    '2,2','2,6','2,10',
    '6,2','6,6','6,10',
    '10,2','10,6','10,10',
  ]);

  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      const cell = document.createElement('div');
      cell.className = 'go-cell';
      cell.id = `go-cell-${r}-${c}`;

      // Star point
      if (starSet.has(`${r},${c}`)) {
        const star = document.createElement('div');
        star.className = 'go-star';
        cell.appendChild(star);
      }

      const v = GO.board[r][c];
      if (v !== 0) {
        // last move indicator
        if (GO.lastMove && GO.lastMove[0] === r && GO.lastMove[1] === c) {
          cell.classList.add('last-move');
        }
        const stone = document.createElement('div');
        const emoji = v === 1 ? playerEmoji : aiEmoji;
        if (emoji) {
          stone.className = 'go-stone emoji';
          stone.textContent = emoji;
        } else {
          stone.className = 'go-stone ' + (v === 1 ? 'black' : 'white');
        }
        cell.appendChild(stone);
      } else if (!GO.over && GO.turn === 'player' && !GO.thinking) {
        cell.onclick = () => goPlayerMove(r, c);
      }

      boardEl.appendChild(cell);
    }
  }
}

// ── Move Logic ──
function goBoardToString() {
  return GO.board.map(row => row.join('')).join('|');
}

function goCountLiberties(r, c) {
  const N = GO.SIZE;
  const color = GO.board[r][c];
  if (color === 0) return { liberties: new Set(), group: new Set() };
  const group = new Set();
  const liberties = new Set();
  const queue = [[r, c]];
  group.add(`${r},${c}`);
  while (queue.length) {
    const [cr, cc] = queue.shift();
    for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]]) {
      const nr = cr + dr, nc = cc + dc;
      if (nr < 0 || nr >= N || nc < 0 || nc >= N) continue;
      const key = `${nr},${nc}`;
      if (GO.board[nr][nc] === 0) {
        liberties.add(key);
      } else if (GO.board[nr][nc] === color && !group.has(key)) {
        group.add(key);
        queue.push([nr, nc]);
      }
    }
  }
  return { liberties, group };
}

function goCapture(color) {
  const N = GO.SIZE;
  let captured = 0;
  const visited = new Set();
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      if (GO.board[r][c] !== color) continue;
      const key = `${r},${c}`;
      if (visited.has(key)) continue;
      const { liberties, group } = goCountLiberties(r, c);
      group.forEach(k => visited.add(k));
      if (liberties.size === 0) {
        group.forEach(k => {
          const [gr, gc] = k.split(',').map(Number);
          GO.board[gr][gc] = 0;
          captured++;
        });
      }
    }
  }
  return captured;
}

function goPlayerMove(r, c) {
  if (GO.over || GO.turn !== 'player' || GO.thinking) return;
  if (GO.board[r][c] !== 0) return;

  // Ko check
  if (GO.koPoint && GO.koPoint[0] === r && GO.koPoint[1] === c) {
    toast('劫争！不能在此处落子');
    return;
  }

  // Place stone temporarily
  GO.board[r][c] = 1;

  // Capture enemy groups
  const capturedAI = goCapture(2);

  // Check suicide: own group has no liberties and we captured nothing
  const { liberties: ownLibs } = goCountLiberties(r, c);
  if (ownLibs.size === 0 && capturedAI === 0) {
    GO.board[r][c] = 0;
    toast('不合法落子（自杀）');
    return;
  }

  // Ko rule: if captured exactly 1 and board returns to previous state
  const newState = goBoardToString();
  if (GO.prevBoardState && newState === GO.prevBoardState && capturedAI === 1) {
    GO.board[r][c] = 0;
    // Undo captures by re-running without the move
    toast('劫争！此落子违反劫争规则');
    return;
  }

  GO.prevBoardState = newState;
  GO.koPoint = capturedAI === 1 ? [r, c] : null;
  GO.captures.player += capturedAI;
  GO.passCount = 0;
  GO.lastMove = [r, c];
  GO.turn = 'ai';

  renderGoBoard();
  goUpdateCaptures();

  const statusEl = $i('go-status');
  if (statusEl) statusEl.textContent = 'AI思考中…';

  setTimeout(goAiMove, 400);
}

function goPass() {
  if (GO.over || GO.turn !== 'player' || GO.thinking) return;
  GO.passCount++;
  GO.lastMove = null;
  goSay('你选择虚手');
  if (GO.passCount >= 2) {
    goFinish('double_pass');
    return;
  }
  GO.turn = 'ai';
  const statusEl = $i('go-status');
  if (statusEl) statusEl.textContent = 'AI思考中…';
  setTimeout(goAiMove, 600);
}

// ── AI Move ──
async function goAiMove() {
  GO.thinking = true;
  const statusEl = $i('go-status');
  if (statusEl) statusEl.textContent = 'AI思考中…';

  let move = null;
  const contact = goGetContact();
  const useKey = contact?.apiKey || S.settings.apiKey;
  const difficulty = GO.prefs.difficulty || 'normal';

  // No AI mode: heuristic only, no commentary
  if (GO.contactId === 'none') {
    move = goHeuristic();
    if (move) move.comment = '';
  // Beginner: always use heuristic (with 40% random)
  } else if (difficulty === 'beginner') {
    move = goHeuristic();
    if (move && Math.random() < 0.4) {
      const N = GO.SIZE;
      const candidates = [];
      for (let r=0;r<N;r++) for (let c=0;c<N;c++) {
        if (GO.board[r][c] !== 0) continue;
        if (GO.koPoint && GO.koPoint[0]===r && GO.koPoint[1]===c) continue;
        for (const [dr,dc] of [[-1,0],[1,0],[0,-1],[0,1]]) {
          const nr=r+dr,nc=c+dc;
          if (nr>=0&&nr<N&&nc>=0&&nc<N&&GO.board[nr][nc]!==0) { candidates.push({row:r,col:c,comment:'嘻嘻随便下～'}); break; }
        }
      }
      if (candidates.length) move = candidates[Math.floor(Math.random()*candidates.length)];
    }
  } else if (useKey) {
    try { move = await goCallAI(contact, useKey); } catch(e) {}
  }

  if (!move) move = goHeuristic();

  GO.thinking = false;

  if (!move) {
    // AI passes
    GO.passCount++;
    goSay('AI选择虚手');
    if (GO.passCount >= 2) { goFinish('double_pass'); return; }
    GO.turn = 'player';
    if (statusEl) statusEl.textContent = '你的回合（黑子）';
    renderGoBoard();
    return;
  }

  const { row, col, comment, pass } = move;
  if (pass) {
    GO.passCount++;
    goSay(comment || 'AI选择虚手');
    if (GO.passCount >= 2) { goFinish('double_pass'); return; }
    GO.turn = 'player';
    if (statusEl) statusEl.textContent = '你的回合（黑子）';
    renderGoBoard();
    return;
  }

  if (typeof row !== 'number' || row < 0 || row >= GO.SIZE || GO.board[row][col] !== 0) {
    // Fallback heuristic
    const fallback = goHeuristic();
    if (!fallback) {
      GO.passCount++;
      if (GO.passCount >= 2) { goFinish('double_pass'); return; }
      GO.turn = 'player';
      if (statusEl) statusEl.textContent = '你的回合（黑子）';
      renderGoBoard();
      return;
    }
    move = fallback;
  }

  const mr = move.row ?? row, mc = move.col ?? col;

  GO.board[mr][mc] = 2;
  const capturedPlayer = goCapture(1);
  GO.captures.ai += capturedPlayer;
  GO.passCount = 0;
  GO.prevBoardState = goBoardToString();
  GO.lastMove = [mr, mc];
  GO.turn = 'player';

  const goFreqMap = { off: 0, low: 5, normal: 3, high: 1 };
  const goFreq = goFreqMap[GO.prefs.commentFreq ?? 'normal'] ?? 3;
  const goMoveNum = GO.captures.ai + GO.captures.player + 1;
  const goShouldComment = goFreq > 0 && goMoveNum % goFreq === 0;
  if (comment && goShouldComment) goSay(comment);

  renderGoBoard();
  goUpdateCaptures();
  if (statusEl) statusEl.textContent = '你的回合（黑子）';
}

async function goCallAI(contact, apiKey) {
  const N = GO.SIZE;
  const lines = [];
  const cols = '０１２３４５６７８９ＡＢＣ'.slice(0, N);
  lines.push('  ' + [...cols].join(' '));
  for (let r = 0; r < N; r++) {
    const rowStr = String(r).padStart(2, ' ') + ' ' + GO.board[r].map(v => v===1?'B':v===2?'W':'.').join(' ');
    lines.push(rowStr);
  }
  const boardTxt = lines.join('\n');
  const aiName = contact?.name || 'AI';
  const personality = contact?.system || '';
  const sysPrompt = `你是${aiName}，正在和用户下围棋13×13。你执白子(W)，用户执黑子(B)，.表示空格。${personality ? `你的性格：${personality}。` : ''}每次收到棋盘后，找出最佳落子或选择虚手，并用符合你个性的话自然回应（不必局限于"一句话"）。返回JSON：{"row":数字,"col":数字,"comment":"你的回应"} 或 {"pass":true,"comment":"你的回应"}`;
  const userMsg = `当前棋盘：\n${boardTxt}`;
  const history = GO._history.slice(-20);

  const res = await fetch(contact?.apiUrl || 'https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://raimos.app',
      'X-Title': 'Raimos',
    },
    body: JSON.stringify({
      model: contact?.model || S.settings.model || 'openai/gpt-4o-mini',
      max_tokens: 150,
      stream: false,
      messages: [{role:'system', content:sysPrompt}, ...history, {role:'user', content:userMsg}],
    }),
  });
  const data = await res.json();
  const txt = data.choices?.[0]?.message?.content || '';
  const m = txt.match(/\{[\s\S]*?\}/);
  if (!m) return null;
  const result = JSON.parse(m[0]);
  GO._history.push({role:'user', content:userMsg});
  GO._history.push({role:'assistant', content:txt});
  return result;
}

function goHeuristic() {
  const N = GO.SIZE;
  const center = Math.floor(N / 2);
  let bestScore = -Infinity, best = null;

  // First: check immediate capture moves (AI captures player's group)
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      if (GO.board[r][c] !== 0) continue;
      GO.board[r][c] = 2;
      const caps = goCapture(1);
      if (caps > 0) {
        GO.board[r][c] = 0;
        // Undo captures
        renderGoBoard(); // will be re-rendered
        return { row: r, col: c, comment: null };
      }
      GO.board[r][c] = 0;
    }
  }

  // Score each empty cell
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      if (GO.board[r][c] !== 0) continue;

      // Ko restriction
      if (GO.koPoint && GO.koPoint[0] === r && GO.koPoint[1] === c) continue;

      // Suicide check
      GO.board[r][c] = 2;
      const capTest = goCapture(1);
      const { liberties: ownLibs } = goCountLiberties(r, c);
      const suicide = ownLibs.size === 0 && capTest === 0;
      // Restore
      GO.board[r][c] = 0;
      if (suicide) continue;

      let score = 0;
      // Capture threat
      for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]]) {
        const nr = r + dr, nc = c + dc;
        if (nr < 0 || nr >= N || nc < 0 || nc >= N) continue;
        if (GO.board[nr][nc] === 1) {
          GO.board[r][c] = 2;
          const { liberties: enemyLibs } = goCountLiberties(nr, nc);
          GO.board[r][c] = 0;
          if (enemyLibs.size <= 1) score += 500; // atari / capture
        }
        if (GO.board[nr][nc] === 2) score += 10; // extend own
        if (GO.board[nr][nc] === 1) score -= 3; // near enemy
      }
      // Centrality
      score += 8 / (1 + Math.abs(r - center) + Math.abs(c - center));
      // Slight randomness
      score += Math.random() * 2;

      if (score > bestScore) { bestScore = score; best = { row: r, col: c, comment: null }; }
    }
  }
  return best;
}

// ── Scoring ──
function goScore() {
  const N = GO.SIZE;
  const visited = new Set();
  let playerTerritory = 0, aiTerritory = 0;

  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      if (GO.board[r][c] !== 0 || visited.has(`${r},${c}`)) continue;
      // Flood fill empty region
      const region = [];
      const queue = [[r, c]];
      visited.add(`${r},${c}`);
      let touchesPlayer = false, touchesAI = false;
      while (queue.length) {
        const [cr, cc] = queue.shift();
        region.push([cr, cc]);
        for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]]) {
          const nr = cr + dr, nc = cc + dc;
          if (nr < 0 || nr >= N || nc < 0 || nc >= N) continue;
          const v = GO.board[nr][nc];
          if (v === 1) touchesPlayer = true;
          else if (v === 2) touchesAI = true;
          else if (!visited.has(`${nr},${nc}`)) {
            visited.add(`${nr},${nc}`);
            queue.push([nr, nc]);
          }
        }
      }
      if (touchesPlayer && !touchesAI) playerTerritory += region.length;
      else if (touchesAI && !touchesPlayer) aiTerritory += region.length;
    }
  }

  const playerScore = playerTerritory + GO.captures.player;
  const aiScore = aiTerritory + GO.captures.ai + 6.5; // komi
  return { playerScore, aiScore, playerTerritory, aiTerritory };
}

// ── Finish ──
async function goFinish(reason) {
  GO.over = true;
  const { playerScore, aiScore, playerTerritory, aiTerritory } = goScore();
  const contact = goGetContact();
  const elapsed = Math.round((Date.now() - GO.startTime) / 1000);
  const result = playerScore > aiScore ? 'player_win' : 'ai_win';

  await saveGoRecord({ result, playerScore, aiScore, elapsed, aiName: contact?.name || 'AI', aiContactId: GO.contactId, date: Date.now() });

  setTimeout(() => showGoResult(playerScore, aiScore, reason, elapsed, contact), 600);
}

function showGoResult(playerScore, aiScore, reason, elapsed, contact) {
  const overlay = $i('go-result-overlay');
  if (!overlay) return;
  overlay.classList.add('show');

  const win = playerScore > aiScore;
  const titleEl = $i('go-result-title');
  if (titleEl) {
    titleEl.textContent = win ? '🎉 你赢了！' : '💫 AI赢了！';
    titleEl.className = `gmk-result-title${win ? ' win' : ''}`;
  }

  const pb = win ? '🏆' : '💔', ab = win ? '💔' : '🏆';
  const pbEl = $i('go-result-player-badge'), abEl = $i('go-result-ai-badge');
  if (pbEl) pbEl.textContent = pb;
  if (abEl) abEl.textContent = ab;

  const userAv = S.settings.userAvatar || S.settings.avatar || '😊';
  const pAvEl = $i('go-result-player-av');
  if (pAvEl) { if (userAv.startsWith('data:')) pAvEl.innerHTML = `<img src="${userAv}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`; else pAvEl.textContent = userAv; }
  const aiAv = contact?.avatar || '🤖';
  const aAvEl = $i('go-result-ai-av');
  if (aAvEl) { if (aiAv.startsWith('data:')) aAvEl.innerHTML = `<img src="${aiAv}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`; else aAvEl.textContent = aiAv; }
  const aiNameEl = $i('go-result-ai-name');
  if (aiNameEl) aiNameEl.textContent = contact?.name || 'AI';

  const mm = Math.floor(elapsed / 60), ss = elapsed % 60;
  const reasonTxt = reason === 'double_pass' ? '双方虚手结束' : '游戏结束';
  const statsEl = $i('go-result-stats');
  if (statsEl) statsEl.textContent = `${reasonTxt} · 用时 ${mm > 0 ? mm + '分' : ''}${ss}秒\n你：${playerScore.toFixed(1)}目  AI：${aiScore.toFixed(1)}目（含贴目6.5）`;

  // Cat
  const catEl = $i('go-result-cat');
  if (catEl) catEl.innerHTML = win ? gomokuWinCatSVG() : gomokuLoseCatSVG();

  // Confetti
  const confEl = $i('go-confetti');
  if (confEl) {
    confEl.innerHTML = '';
    if (win) {
      const cols = ['#ff8fab','#a78bfa','#fcd34d','#6ee7b7','#67e8f9','#f472b6'];
      for (let i = 0; i < 32; i++) {
        const el = document.createElement('div');
        el.className = 'gmk-confetti-piece';
        const sz = 6 + Math.random() * 7;
        el.style.cssText = `left:${Math.random()*100}%;width:${sz}px;height:${sz}px;background:${cols[i%cols.length]};border-radius:${Math.random()>.5?'50%':'3px'};animation:confetti-fall ${1.2+Math.random()*.8}s ease-in ${Math.random()*.5}s forwards`;
        confEl.appendChild(el);
      }
    }
  }
}

function closeGoResult() { closeModal('go-result-overlay'); }

// ── Records ──
async function saveGoRecord(rec) {
  let records = (await getSetting('goRecords')) || [];
  records.unshift({ ...rec, id: uid() });
  if (records.length > 60) records = records.slice(0, 60);
  await saveSetting('goRecords', records);
}

async function openGoRecords() {
  const records = (await getSetting('goRecords')) || [];
  const overlay = $i('go-records-modal');
  if (!overlay) return;
  overlay.classList.add('show');

  const wins = records.filter(r => r.result === 'player_win').length;
  const losses = records.filter(r => r.result === 'ai_win').length;
  const sumEl = $i('go-records-summary');
  if (sumEl) sumEl.innerHTML = `
    <div style="flex:1"><div style="font-size:22px;font-weight:900;color:#4ade80">${wins}</div><div style="font-size:11px;color:var(--text3)">胜</div></div>
    <div style="flex:1"><div style="font-size:22px;font-weight:900;color:#f87171">${losses}</div><div style="font-size:11px;color:var(--text3)">负</div></div>
    <div style="flex:1"><div style="font-size:22px;font-weight:900;color:var(--accent)">${records.length}</div><div style="font-size:11px;color:var(--text3)">总局</div></div>`;

  const listEl = $i('go-records-list');
  if (!listEl) return;
  if (!records.length) { listEl.innerHTML = '<div style="text-align:center;padding:30px;color:var(--text3);font-size:13px">还没有对战记录，快去下一局吧！</div>'; return; }
  listEl.innerHTML = '';
  records.forEach(r => {
    const icon = r.result === 'player_win' ? '🏆' : '💔';
    const label = r.result === 'player_win' ? '胜利' : '败北';
    const mm = Math.floor((r.elapsed || 0) / 60), ss = (r.elapsed || 0) % 60;
    const date = r.date ? new Date(r.date).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' }) : '';
    const el = document.createElement('div');
    el.className = 'gmk-record-item';
    el.innerHTML = `<div class="gmk-record-result">${icon}</div><div class="gmk-record-info"><div style="font-weight:700;color:var(--text)">${label} · vs ${esc(r.aiName || 'AI')}</div><div class="gmk-record-meta">${date} · ${mm > 0 ? mm + '分' : ''}${ss}秒 · 你${(r.playerScore||0).toFixed(1)}目 AI${(r.aiScore||0).toFixed(1)}目</div></div>`;
    listEl.appendChild(el);
  });
}

async function clearGoRecords() {
  if (!confirm('确认清空所有围棋战绩？')) return;
  await saveSetting('goRecords', []);
  openGoRecords();
}

// ══════════════════════════════════════════
// FLYING CHESS (飞行棋)
// ══════════════════════════════════════════

const FLY_PLAYER_COLORS = ['#ff6b6b', '#4d9fff', '#ffd93d', '#6bcb77'];
const FLY_PLAYER_EMOJIS = ['🔴', '🔵', '🟡', '🟢'];
const DICE_FACES = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

const FLY_SPACE_LAYOUT = [
  'start',                                           // 1
  'normal','back3','normal','event',                 // 2-5
  'skip','normal','normal','heart','checkpoint',     // 6-10
  'normal','forward3','event','normal','back3',      // 11-15
  'normal','heart','again','normal','checkpoint',    // 16-20
  'event','normal','normal','back3','forward3',      // 21-25
  'normal','heart','event','normal','checkpoint',    // 26-30
  'normal','forward5','event','skip','normal',       // 31-35
  'back3','normal','heart','event','checkpoint',     // 36-40
  'normal','forward3','event','normal','back3',      // 41-45
  'skip','heart','normal','event','checkpoint',      // 46-50
  'normal','forward5','event','normal','heart',      // 51-55
  'back3','normal','again','event','checkpoint',     // 56-60
  'normal','forward3','heart','event','normal',      // 61-65
  'back3','normal','event','skip','checkpoint',      // 66-70
  'forward5','normal','heart','event','normal',      // 71-75
  'normal','event','heart','normal','finish'         // 76-80
];

const FLY_SPACE_ICONS = {
  start: '🚀', finish: '🏆', normal: '', event: '⭐', heart: '💗',
  forward3: '↑+3', forward5: '↑+5', back3: '↓-3', skip: '💤',
  again: '🎲', checkpoint: '⭕',
};

const FLY_ROMANCE_EVENTS = [
  '说出你觉得最浪漫的表白方式，然后前进3格🌹',
  '描述你梦想中完美的约会场景，越详细越好💑',
  '如果要给暗恋的人发一条消息，你会写什么？💌',
  '说一句能让旁边的人脸红的情话，前进2格😊',
  '你相信一见钟情吗？说说你的看法和理由✨',
  '描述你理想伴侣的三个最重要特质💫',
  '如果可以和喜欢的人共度一天，你会怎么安排？☀️',
  '说出你认为最重要的爱情品质，前进2格💝',
  '你会用什么方式庆祝恋爱100天纪念日？🎂',
  '说一个你觉得很甜很甜的浪漫故事或情节💕',
  '如果制作一个"我的理想恋人"简历，第一条写什么？📝',
  '你觉得异地恋可行吗？你会为爱情付出多少距离？🌍',
  '描述你心目中最甜蜜最浪漫的接吻场景💋',
  '如果今晚可以和任何人约会，你会选谁，去哪里？🌙',
  '用三个词形容你理想中的爱情关系，并解释🌸',
  '你觉得爱情中最重要的是什么：陪伴、理解还是激情？💞',
  '说出一件你愿意为爱情做但平时不会做的事💪',
  '如果用一首歌形容你的爱情观，你会选哪首？🎵',
  '描述你心目中最完美的求婚场景，越浪漫越好💍',
  '你有没有因为一个眼神而心动的经历？分享一下👀',
  '如果可以让对方知道你最深的秘密，你会说什么？🤫',
  '说出你认为最能打动人心的爱意表达方式💓',
  '如果你们要一起旅行，你最想去哪里，做什么？✈️',
  '什么样的小细节会让你对一个人产生好感？🌷',
  '你相信缘分吗？说说你对缘分最深的理解🌈',
  '如果用食物比喻爱情，你会比喻成什么？🍰',
  '描述你最希望在恋爱中体验到的幸福瞬间💖',
  '你觉得什么行为最能展示一个人真心爱你？❤️',
  '如果写一封情书给未来的另一半，第一句话是？💌',
  '说出一个你认为比告白更勇敢的爱情行为🦋',
  '你觉得接受还是拒绝一段感情，哪个需要更大的勇气？🫧',
  '描述一个让你觉得"这就是爱情"的电影或故事场景🎬',
];

const FLY_DEEP_EVENTS = [
  '你最害怕失去什么？认真思考一下再诚实回答💭',
  '如果只剩一年的时间，你最想完成哪三件事？⏰',
  '你觉得真正的幸福是什么样子的？🌟',
  '你有没有因为在乎别人而改变过自己？分享一下💝',
  '你最深的遗憾是什么？如果能回头，你会改变吗？',
  '如果可以给10年前的自己一句话，你会说什么？⏳',
  '你觉得友情和爱情的界限在哪里？🤔',
  '最近一次让你感到特别感动的事是什么？💫',
  '你觉得孤独对人来说是好事还是坏事？🌙',
  '人生中什么样的体验让你觉得"活着真好"？🌈',
  '如果你的人生是一部电影，现在是哪个章节？🎬',
  '你最欣赏自己的一个品质是什么？为什么？🌺',
  '你觉得真正的朋友应该是什么样的？👫',
  '你有什么一直想做但还没有勇气做的事？💪',
  '你认为人生中最重要的三个价值观是什么？🎯',
  '如果可以和历史上任何一个人共进晚餐，你会选谁？🍽️',
  '你觉得什么是真正的成长？你什么时候感觉到自己成长了？🌱',
  '你有没有一个一直藏在心里却没说出口的话？说出来吧🤍',
  '如果明天是世界末日，你今天会怎么度过？🌅',
  '你觉得自己人生中做过最勇敢的事是什么？🦁',
  '你最感激生命中的哪个人？为什么不直接告诉他们？💛',
  '你觉得什么样的人生才算没有遗憾地活过？🌠',
  '如果可以改变自己一个性格特点，你会改变什么？🦋',
  '你什么时候感觉最接近真实的自己？🪞',
  '你觉得人与人之间最重要的连接是什么？🤝',
  '如果可以让所有人知道一件事，你会选择什么？📣',
  '你是否曾经后悔没有更早做某件事？是什么？⌛',
  '你觉得爱自己和爱别人，哪个更难？为什么？💗',
  '你最近一次真正开怀大笑是什么时候，因为什么？😂',
  '你觉得什么是你生命中最不可替代的体验？✨',
  '如果你的人生只能传递一个信息给下一代，是什么？📚',
  '你有没有感受过被命运安排的时刻？分享一下🌌',
];

const FLY_DAILY_EVENTS = [
  '站起来伸个懒腰，做5个深蹲，完成后前进3格！🏃',
  '给手机充个电，如果电量低于50%前进2格⚡',
  '对着镜子或摄像头笑一笑，说"我今天很棒！"前进2格😊',
  '给家人或好友发一条温馨问候消息，前进4格💌',
  '整理一下你面前的桌面或手机桌面，前进2格✨',
  '喝一大杯水，补充水分！前进2格💧',
  '深呼吸5次，放空杂念，前进3格🌬️',
  '拍一张你现在所处环境的照片，前进2格📸',
  '说一件最近让你开心的小事，前进3格😄',
  '做5个俯卧撑或仰卧起坐，完成前进4格💪',
  '唱一首你喜欢的歌的第一句，前进2格🎵',
  '用手机查一下今天的天气，大声说出来，前进2格☀️',
  '做一个最喜欢的食物图片搜索，看看哪个最诱人，前进2格🍜',
  '整理一下手机里最久没清理的照片文件夹，前进3格📱',
  '给最近联系最少的朋友发条消息问候，前进3格👋',
  '打开最喜欢的播放列表，选一首歌播放，前进2格🎶',
  '做5分钟冥想或安静坐着，清空杂念，前进3格🧘',
  '回顾一下今天做过的三件好事，说出来，前进2格🌟',
  '检查一下今天的待办事项，完成了吗？前进2格📋',
  '打开窗户透透气，深呼吸新鲜空气，前进2格🌿',
  '写下今天你最感谢的一件事，前进3格🙏',
  '做10个开合跳，动动身体！前进3格🕺',
  '找一首你最近喜欢的歌，放给大家听，前进2格🎧',
  '整理一下随身包包或钱包，前进2格👜',
  '喝杯热茶或热水，暖暖胃，前进2格☕',
  '把最近收到的消息都回复完，前进3格💬',
  '做几个颈部拉伸运动，放松一下，前进2格🤸',
  '拍一张今天心情最好的自拍，前进2格🤳',
  '浏览一下今天的新闻，说一条有趣的，前进2格📰',
  '给植物或桌面小物件浇浇水或擦擦灰，前进2格🌱',
  '做5分钟眼部按摩放松，前进2格👁️',
  '想一个让你心情变好的小仪式，说出来，前进2格🌸',
];

const FLY_CHALLENGE_EVENTS = [
  '绕口令挑战：说3遍"南边来了个喇嘛"，不出错前进4格！🗣️',
  '用5个字描述你现在的心情，前进2格💭',
  '做一个能让旁边的人笑的表情或动作，前进3格😂',
  '30秒内说出10种你喜欢的食物，完成前进3格🍜',
  '背诵一首你会的古诗或歌词，前进5格📚',
  '倒着说三个词（比如"猫咪"→"咪猫"），前进2格🔄',
  '用身体语言表演一个动物，让别人猜，前进3格🐾',
  '和旁边的人猜拳，赢了前进3格，输了退2格✊',
  '30秒内憋住不说话也不笑，成功前进4格🤐',
  '用一句话讲完一个完整的故事，前进3格📖',
  '闭上眼睛，说出桌上三件物品的位置，前进3格👁️',
  '用左手（非惯用手）写下你的名字，前进2格✍️',
  '连续说5个带"心"字的成语，前进4格❤️',
  '模仿一位名人或卡通人物说一句话，前进3格🎭',
  '用10秒内想出5种粉色的东西，前进3格🌸',
  '说出5个你最喜欢的地方（城市、景点都行），前进2格🗺️',
  '不停地转圈5圈再走直线，完成前进3格💫',
  '说出今年你学到的最有用的一件事，前进2格📖',
  '用表情包里的台词说一句话，让别人猜出哪个表情包，前进3格🐸',
  '30秒内说出10个国家的名字，前进4格🌍',
  '背出乘法表任意一行（7以上），前进3格🔢',
  '做一个瑜伽或舒展动作保持10秒，前进2格🧘',
  '连续说出5个同一类别的东西（如5种花、5种鱼），前进3格🌺',
];

const FLY = {
  playerCount: 2,
  players: [],
  currentPlayer: 0,
  rolling: false,
  over: false,
  lastDice: 0,
  spaceTypes: [],
};

// ── Setup ──
function initFlySetup() {
  FLY.playerCount = 2;
  FLY.over = false;
  FLY.rolling = false;
  renderFlyPlayerInputs();
  // reset button highlights
  document.querySelectorAll('.fly-count-btn').forEach((btn, i) => {
    btn.classList.toggle('active', i === 0); // 2人 is index 0
  });
}

function setFlyPlayerCount(n, el) {
  FLY.playerCount = n;
  document.querySelectorAll('.fly-count-btn').forEach(b => b.classList.remove('active'));
  if (el) el.classList.add('active');
  renderFlyPlayerInputs();
}

function renderFlyPlayerInputs() {
  const container = $i('fly-setup-players');
  if (!container) return;
  container.innerHTML = '';
  for (let i = 0; i < FLY.playerCount; i++) {
    const row = document.createElement('div');
    row.className = 'fly-player-input-row';
    row.innerHTML = `
      <span class="fly-player-emoji">${FLY_PLAYER_EMOJIS[i]}</span>
      <span class="fly-player-color-dot" style="background:${FLY_PLAYER_COLORS[i]}"></span>
      <input class="fly-player-input" id="fly-player-name-${i}" type="text" placeholder="玩家${i + 1}" value="玩家${i + 1}" maxlength="8">
    `;
    container.appendChild(row);
  }
}

function startFlyGame() {
  const players = [];
  for (let i = 0; i < FLY.playerCount; i++) {
    const nameEl = $i(`fly-player-name-${i}`);
    players.push({
      name: nameEl?.value.trim() || `玩家${i + 1}`,
      emoji: FLY_PLAYER_EMOJIS[i],
      color: FLY_PLAYER_COLORS[i],
      pos: 0,  // 0 = not yet on board, 1-80 = space number
      status: 'active',  // 'active', 'finished', 'skipped'
      skipped: false,
      finishRank: 0,
    });
  }
  FLY.players = players;
  FLY.currentPlayer = 0;
  FLY.rolling = false;
  FLY.over = false;
  FLY.lastDice = 0;
  FLY.spaceTypes = FLY_SPACE_LAYOUT.slice();
  FLY._finishCount = 0;

  switchPage('fly-page');
  renderFlyMap();
  renderFlyPlayerBar();
  flyUpdateTurnInfo();
  flyEnableDice(true);
}

// ── Map ──
function renderFlyMap() {
  const mapEl = $i('fly-map');
  if (!mapEl) return;
  mapEl.innerHTML = '';

  // 8 rows of 10 spaces each
  // Row 1: spaces 1-10 (left to right)
  // Row 2: spaces 11-20 (right to left, reversed)
  // ...
  for (let row = 0; row < 8; row++) {
    const startSpace = row * 10 + 1;
    const spaces = [];
    for (let i = 0; i < 10; i++) {
      spaces.push(startSpace + i);
    }

    const rowEl = document.createElement('div');
    rowEl.className = 'fly-map-row' + (row % 2 === 1 ? ' reverse' : '');

    spaces.forEach(spaceNum => {
      const type = FLY_SPACE_LAYOUT[spaceNum - 1] || 'normal';
      const icon = FLY_SPACE_ICONS[type] || '';
      const cell = document.createElement('div');
      cell.className = `fly-space ${type}`;
      cell.id = `fly-space-${spaceNum}`;
      cell.innerHTML = `<span class="fly-space-num">${spaceNum}</span><span class="fly-space-icon">${icon}</span><div class="fly-tokens-wrap" id="fly-tokens-${spaceNum}"></div>`;
      rowEl.appendChild(cell);
    });

    mapEl.appendChild(rowEl);

    // Add connector arrow between rows (except last)
    if (row < 7) {
      const connector = document.createElement('div');
      connector.className = 'fly-map-connector' + (row % 2 === 0 ? '' : ' left');
      connector.textContent = '↓';
      mapEl.appendChild(connector);
    }
  }

  flyUpdateMapTokens();
}

function flyUpdateMapTokens() {
  // Clear all token containers
  document.querySelectorAll('[id^="fly-tokens-"]').forEach(el => el.innerHTML = '');
  FLY.players.forEach((p, idx) => {
    if (p.pos > 0) {
      const container = $i(`fly-tokens-${p.pos}`);
      if (container) {
        const token = document.createElement('div');
        token.className = 'fly-token';
        token.style.background = p.color;
        token.title = p.name;
        container.appendChild(token);
      }
    }
  });
}

// ── Player Bar ──
function renderFlyPlayerBar() {
  const bar = $i('fly-player-bar');
  if (!bar) return;
  bar.innerHTML = '';
  FLY.players.forEach((p, idx) => {
    const card = document.createElement('div');
    const isActive = idx === FLY.currentPlayer && !FLY.over;
    card.className = 'fly-player-card' + (isActive ? ' active' : '') + (p.status === 'finished' ? ' finished' : '') + (p.skipped ? ' skipped' : '');
    const posText = p.status === 'finished' ? `🏆第${p.finishRank}名` : p.skipped ? '💤跳过' : p.pos === 0 ? '未出发' : `第${p.pos}格`;
    card.innerHTML = `<div class="fly-player-card-emoji">${p.emoji}</div><div class="fly-player-card-name">${esc(p.name)}</div><div class="fly-player-card-pos">${posText}</div>`;
    bar.appendChild(card);
  });
}

function flyUpdateTurnInfo() {
  const el = $i('fly-turn-info');
  if (!el) return;
  if (FLY.over) { el.textContent = '游戏结束！'; return; }
  const p = FLY.players[FLY.currentPlayer];
  if (!p) return;
  el.innerHTML = `${p.emoji} <strong>${esc(p.name)}</strong> 的回合`;
}

function flyEnableDice(enabled) {
  const btn = $i('fly-dice-btn');
  if (btn) btn.disabled = !enabled;
}

// ── Dice Roll ──
function flyRollDice() {
  if (FLY.rolling || FLY.over) return;
  const p = FLY.players[FLY.currentPlayer];
  if (!p || p.status === 'finished') { flyNextTurn(); return; }

  if (p.skipped) {
    p.skipped = false;
    toast(`${p.emoji} ${p.name} 跳过本回合`);
    renderFlyPlayerBar();
    setTimeout(flyNextTurn, 1200);
    return;
  }

  FLY.rolling = true;
  flyEnableDice(false);

  const result = Math.floor(Math.random() * 6) + 1;
  FLY.lastDice = result;

  flyShowDiceAnimation(result, () => {
    FLY.rolling = false;
    flyMovePlayer(FLY.currentPlayer, result);
  });
}

function flyShowDiceAnimation(result, callback) {
  const overlay = $i('fly-dice-overlay');
  const animEl = $i('fly-dice-anim');
  if (!overlay || !animEl) { callback(); return; }

  overlay.style.display = 'flex';
  animEl.className = 'fly-dice-anim';
  animEl.textContent = DICE_FACES[0];

  let elapsed = 0;
  const interval = setInterval(() => {
    elapsed += 80;
    animEl.textContent = DICE_FACES[Math.floor(Math.random() * 6)];
    if (elapsed >= 800) {
      clearInterval(interval);
      animEl.textContent = DICE_FACES[result - 1];
      animEl.className = 'fly-dice-anim settled';
      setTimeout(() => {
        overlay.style.display = 'none';
        animEl.className = 'fly-dice-anim';
        callback();
      }, 400);
    }
  }, 80);
}

// ── Move ──
async function flyMovePlayer(playerIdx, steps) {
  const p = FLY.players[playerIdx];
  if (!p) return;

  const oldPos = p.pos;
  let newPos = oldPos + steps;

  if (newPos <= 0) newPos = 1;
  if (newPos >= 80) {
    newPos = 80;
  }

  // Animate step by step
  for (let pos = oldPos + 1; pos <= newPos; pos++) {
    p.pos = pos;
    flyUpdateMapTokens();
    await flyDelay(120);
    // Highlight current space
    const spaceEl = $i(`fly-space-${pos}`);
    if (spaceEl) {
      spaceEl.classList.add('highlight');
      await flyDelay(100);
      spaceEl.classList.remove('highlight');
    }
  }

  renderFlyPlayerBar();

  if (newPos >= 80) {
    flyWin(playerIdx);
    return;
  }

  flyTriggerSpace(playerIdx);
}

function flyDelay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function flyTriggerSpace(playerIdx) {
  const p = FLY.players[playerIdx];
  if (!p) return;
  const type = FLY_SPACE_LAYOUT[p.pos - 1] || 'normal';

  switch (type) {
    case 'event': {
      const allEvents = [...FLY_ROMANCE_EVENTS, ...FLY_DEEP_EVENTS, ...FLY_DAILY_EVENTS, ...FLY_CHALLENGE_EVENTS];
      const ev = allEvents[Math.floor(Math.random() * allEvents.length)];
      const evType = FLY_ROMANCE_EVENTS.includes(ev) ? 'romance' : FLY_DEEP_EVENTS.includes(ev) ? 'deep' : FLY_DAILY_EVENTS.includes(ev) ? 'daily' : 'challenge';
      flyShowEvent(ev, evType, playerIdx);
      break;
    }
    case 'heart': {
      const ev = FLY_ROMANCE_EVENTS[Math.floor(Math.random() * FLY_ROMANCE_EVENTS.length)];
      flyShowEvent(ev, 'romance', playerIdx);
      break;
    }
    case 'forward3':
      toast(`${p.emoji} ${p.name} 前进3格！`);
      setTimeout(() => flyMovePlayer(playerIdx, 3), 700);
      break;
    case 'forward5':
      toast(`${p.emoji} ${p.name} 前进5格！`);
      setTimeout(() => flyMovePlayer(playerIdx, 5), 700);
      break;
    case 'back3':
      toast(`${p.emoji} ${p.name} 后退3格！`);
      setTimeout(() => flyMovePlayer(playerIdx, -3), 700);
      break;
    case 'skip':
      toast(`${p.emoji} ${p.name} 下次跳过一回合！💤`);
      p.skipped = true;
      renderFlyPlayerBar();
      setTimeout(flyNextTurn, 1200);
      break;
    case 'again':
      toast(`${p.emoji} ${p.name} 幸运！再掷一次！🎲`);
      setTimeout(flyRollDice, 1000);
      break;
    case 'checkpoint':
      toast(`${p.emoji} ${p.name} 踩到安全格！⭕`);
      setTimeout(flyNextTurn, 800);
      break;
    default:
      setTimeout(flyNextTurn, 400);
      break;
  }
}

function flyShowEvent(eventText, type, playerIdx) {
  const overlay = $i('fly-event-overlay');
  const card = $i('fly-event-card');
  const typeEl = $i('fly-event-type');
  const playerEl = $i('fly-event-player');
  const textEl = $i('fly-event-text');
  if (!overlay || !card) return;

  const typeInfo = {
    romance: { label: '💗 浪漫事件', class: 'romance' },
    deep:    { label: '💭 深度问答', class: 'deep' },
    daily:   { label: '☀️ 日常挑战', class: 'daily' },
    challenge: { label: '🎯 趣味挑战', class: 'challenge' },
  };
  const info = typeInfo[type] || typeInfo.romance;

  card.className = 'fly-event-card ' + info.class;
  if (typeEl) typeEl.textContent = info.label;

  const p = FLY.players[playerIdx];
  if (playerEl) playerEl.textContent = `${p?.emoji || ''} ${p?.name || '玩家'} 触发`;
  if (textEl) textEl.textContent = eventText;

  overlay.style.display = 'flex';

  // Store current player for when done
  FLY._pendingEventPlayer = playerIdx;
}

function flyEventDone() {
  const overlay = $i('fly-event-overlay');
  if (overlay) overlay.style.display = 'none';
  setTimeout(flyNextTurn, 300);
}

function flyNextTurn() {
  if (FLY.over) return;

  // Find next active player
  let next = (FLY.currentPlayer + 1) % FLY.playerCount;
  let attempts = 0;
  while (FLY.players[next]?.status === 'finished' && attempts < FLY.playerCount) {
    next = (next + 1) % FLY.playerCount;
    attempts++;
  }

  // If all are finished
  if (attempts >= FLY.playerCount) { FLY.over = true; return; }

  FLY.currentPlayer = next;
  renderFlyPlayerBar();
  flyUpdateTurnInfo();
  flyEnableDice(true);
}

function flyWin(playerIdx) {
  const p = FLY.players[playerIdx];
  if (!p) return;
  FLY._finishCount = (FLY._finishCount || 0) + 1;
  p.status = 'finished';
  p.finishRank = FLY._finishCount;
  renderFlyPlayerBar();

  const activePlayers = FLY.players.filter(pl => pl.status === 'active');
  if (activePlayers.length === 0 || FLY.playerCount <= 2) {
    // Game over - show result
    FLY.over = true;
    // Assign remaining ranks
    let rank = FLY._finishCount + 1;
    FLY.players.forEach(pl => { if (pl.status === 'active') { pl.finishRank = rank++; pl.status = 'finished'; } });
    setTimeout(flyShowResult, 800);
  } else {
    toast(`🎉 ${p.emoji} ${p.name} 到达终点！第${p.finishRank}名！`);
    setTimeout(flyNextTurn, 1500);
  }
}

function flyShowResult() {
  const overlay = $i('fly-result-overlay');
  if (!overlay) return;
  overlay.style.display = 'flex';

  const sorted = [...FLY.players].sort((a, b) => a.finishRank - b.finishRank);
  const winner = sorted[0];

  const titleEl = $i('fly-result-title');
  if (titleEl) titleEl.textContent = '🎉 游戏结束！';
  const winnerEl = $i('fly-result-winner');
  if (winnerEl) winnerEl.innerHTML = `${winner.emoji} <strong>${esc(winner.name)}</strong> 获得第一名！`;

  // Podium
  const podiumEl = $i('fly-result-podium');
  if (podiumEl) {
    podiumEl.innerHTML = '';
    const podiumOrder = [1, 0, 2, 3]; // 2nd, 1st, 3rd, 4th in display
    podiumOrder.forEach((rankIdx, displayPos) => {
      if (rankIdx >= sorted.length) return;
      const pl = sorted[rankIdx];
      const barClasses = ['p2', 'p1', 'p3', 'p4'];
      const item = document.createElement('div');
      item.className = 'fly-podium-item';
      item.innerHTML = `<div class="fly-podium-emoji">${pl.emoji}</div><div class="fly-podium-name">${esc(pl.name)}</div><div class="fly-podium-bar ${barClasses[displayPos]}">${rankIdx + 1}</div>`;
      podiumEl.appendChild(item);
    });
  }

  // Confetti
  const confEl = $i('fly-confetti');
  if (confEl) {
    confEl.innerHTML = '';
    const cols = ['#ff8fab','#a78bfa','#fcd34d','#6ee7b7','#f472b6','#fb923c'];
    for (let i = 0; i < 40; i++) {
      const el = document.createElement('div');
      el.className = 'gmk-confetti-piece';
      const sz = 6 + Math.random() * 8;
      el.style.cssText = `left:${Math.random()*100}%;width:${sz}px;height:${sz}px;background:${cols[i%cols.length]};border-radius:${Math.random()>.5?'50%':'3px'};animation:confetti-fall ${1.2+Math.random()*.8}s ease-in ${Math.random()*.6}s forwards`;
      confEl.appendChild(el);
    }
  }
}

function confirmFlyQuit() {
  if (FLY.over) { switchPage('chess-page'); return; }
  if (confirm('确定要放弃游戏吗？')) switchPage('chess-page');
}

// ── Share to Moments ──
async function gomokuShareToMoments() {
  const records = (await getSetting('gomokuRecords')) || [];
  const last = records[0];
  const contact = gomokuGetContact();
  const aiName = contact?.name || 'AI';
  const labels = { player_win:'赢了🏆', ai_win:'输了💔', draw:'平局🤝' };
  const mm=Math.floor((last?.elapsed||0)/60), ss=(last?.elapsed||0)%60;
  const text = last
    ? `刚刚和 ${aiName} 下了一局五子棋，${labels[last.result]||'结束'}！共走了 ${last.moves} 步，用时 ${mm>0?mm+'分':''}${ss}秒～ #五子棋 #和AI下棋`
    : `和 ${aiName} 下了一局五子棋，好好玩！ #五子棋 #和AI下棋`;
  closeGomokuResult();
  // Navigate to moments and pre-fill the compose text area
  switchPage('moments-page');
  await new Promise(r => setTimeout(r, 200));
  const ta = $i('compose-text');
  if (ta) { ta.value = text; ta.dispatchEvent(new Event('input')); }
  // Open modal on mobile
  const modal = $i('compose-moment-modal');
  if (modal && window.innerWidth <= 768) {
    const taM = modal.querySelector('textarea');
    if (taM) taM.value = text;
    openModal('compose-moment-modal');
  }
  toast('已跳转到朋友圈，发送即可～');
}

// ══════════════════════════════════════════
// XIANGQI (中国象棋)
// ══════════════════════════════════════════

const XQ = {
  board: null,      // 10 rows × 9 cols, null or {type, color}
  turn: 'red',      // 'red' | 'black'
  over: false,
  selected: null,   // {r, c}
  validMoves: [],
  thinking: false,
  contactId: null,  // 'none' = no AI
  _history: [],     // conversation history for multi-turn context
  commentary: true,
  difficulty: 'normal',
  moveCount: 0,
};

// Piece values for evaluation
const XQ_VAL = { k:10000, a:200, b:200, n:300, r:900, c:450, p:100,
                  K:10000, A:200, B:200, N:300, R:900, C:450, P:100 };

// Initial board layout
function xqInitialBoard() {
  const b = Array.from({length:10}, () => Array(9).fill(null));
  // Black (top, rows 0-9)
  const blackRow = ['R','N','B','A','K','A','B','N','R'];
  for (let c=0;c<9;c++) b[0][c] = {t:blackRow[c], red:false};
  b[2][1] = {t:'C', red:false}; b[2][7] = {t:'C', red:false};
  for (let c=0;c<9;c+=2) b[3][c] = {t:'P', red:false};
  // Red (bottom)
  const redRow = ['r','n','b','a','k','a','b','n','r'];
  for (let c=0;c<9;c++) b[9][c] = {t:redRow[c], red:true};
  b[7][1] = {t:'c', red:true}; b[7][7] = {t:'c', red:true};
  for (let c=0;c<9;c+=2) b[6][c] = {t:'p', red:true};
  return b;
}

function xqPieceLabel(piece) {
  if (!piece) return '';
  const labels = {
    k:'帅', a:'仕', b:'相', n:'马', r:'车', c:'炮', p:'兵',
    K:'将', A:'士', B:'象', N:'馬', R:'車', C:'砲', P:'卒',
  };
  return labels[piece.t] || piece.t;
}

function xqIsRed(piece) { return piece && piece.red; }

function xqFindKing(red) {
  for (let r=0;r<10;r++) for (let c=0;c<9;c++) {
    const p = XQ.board[r][c];
    if (p && (p.t === (red?'k':'K'))) return {r,c};
  }
  return null;
}

function xqKingsFacingEachOther() {
  const redK = xqFindKing(true), blkK = xqFindKing(false);
  if (!redK||!blkK) return false;
  if (redK.c !== blkK.c) return false;
  for (let r=blkK.r+1;r<redK.r;r++) {
    if (XQ.board[r][redK.c]) return false;
  }
  return true;
}

function xqGetRawMoves(r, c) {
  const piece = XQ.board[r][c];
  if (!piece) return [];
  const moves = [];
  const t = piece.t.toLowerCase();
  const isRed = piece.red;

  if (t === 'r') { // rook/car
    for (const [dr,dc] of [[0,1],[0,-1],[1,0],[-1,0]]) {
      for (let i=1;i<10;i++) {
        const nr=r+dr*i, nc=c+dc*i;
        if (nr<0||nr>=10||nc<0||nc>=9) break;
        if (!XQ.board[nr][nc]) { moves.push({r:nr,c:nc}); }
        else { if (xqIsRed(XQ.board[nr][nc])!==isRed) moves.push({r:nr,c:nc}); break; }
      }
    }
  } else if (t === 'n') { // knight/horse
    const knightMoves = [[2,1],[2,-1],[-2,1],[-2,-1],[1,2],[1,-2],[-1,2],[-1,-2]];
    for (const [dr,dc] of knightMoves) {
      const nr=r+dr, nc=c+dc;
      if (nr<0||nr>=10||nc<0||nc>=9) continue;
      // Check leg blocking
      const legR=r+(dr>0?1:dr<0?-1:0), legC=c+(dc>0?1:dc<0?-1:0);
      if (Math.abs(dr)===2) { if (XQ.board[legR][c]) continue; }
      else { if (XQ.board[r][legC]) continue; }
      if (!XQ.board[nr][nc]||xqIsRed(XQ.board[nr][nc])!==isRed) moves.push({r:nr,c:nc});
    }
  } else if (t === 'b') { // elephant/bishop - can't cross river
    for (const [dr,dc] of [[2,2],[2,-2],[-2,2],[-2,-2]]) {
      const nr=r+dr, nc=c+dc;
      if (nr<0||nr>=10||nc<0||nc>=9) continue;
      if (isRed && nr<5) continue; // red stays below river
      if (!isRed && nr>4) continue; // black stays above river
      if (XQ.board[r+dr/2][c+dc/2]) continue; // blocked
      if (!XQ.board[nr][nc]||xqIsRed(XQ.board[nr][nc])!==isRed) moves.push({r:nr,c:nc});
    }
  } else if (t === 'a') { // advisor/guard - stays in palace
    for (const [dr,dc] of [[1,1],[1,-1],[-1,1],[-1,-1]]) {
      const nr=r+dr, nc=c+dc;
      if (nc<3||nc>5) continue;
      if (isRed && (nr<7||nr>9)) continue;
      if (!isRed && (nr<0||nr>2)) continue;
      if (!XQ.board[nr][nc]||xqIsRed(XQ.board[nr][nc])!==isRed) moves.push({r:nr,c:nc});
    }
  } else if (t === 'k') { // king - stays in palace
    for (const [dr,dc] of [[0,1],[0,-1],[1,0],[-1,0]]) {
      const nr=r+dr, nc=c+dc;
      if (nc<3||nc>5) continue;
      if (isRed && (nr<7||nr>9)) continue;
      if (!isRed && (nr<0||nr>2)) continue;
      if (!XQ.board[nr][nc]||xqIsRed(XQ.board[nr][nc])!==isRed) moves.push({r:nr,c:nc});
    }
  } else if (t === 'c') { // cannon - moves like rook, captures by jumping over one
    for (const [dr,dc] of [[0,1],[0,-1],[1,0],[-1,0]]) {
      let jumped = false;
      for (let i=1;i<10;i++) {
        const nr=r+dr*i, nc=c+dc*i;
        if (nr<0||nr>=10||nc<0||nc>=9) break;
        if (!jumped) {
          if (!XQ.board[nr][nc]) moves.push({r:nr,c:nc});
          else jumped=true;
        } else {
          if (XQ.board[nr][nc]) {
            if (xqIsRed(XQ.board[nr][nc])!==isRed) moves.push({r:nr,c:nc});
            break;
          }
        }
      }
    }
  } else if (t === 'p') { // pawn
    const forward = isRed ? -1 : 1;
    const crossedRiver = isRed ? r<=4 : r>=5;
    // Forward
    const nr=r+forward, nc=c;
    if (nr>=0&&nr<10&&(!XQ.board[nr][nc]||xqIsRed(XQ.board[nr][nc])!==isRed)) moves.push({r:nr,c:nc});
    // Sideways (only after crossing river)
    if (crossedRiver) {
      for (const dc of [-1,1]) {
        const nc2=c+dc;
        if (nc2>=0&&nc2<9&&(!XQ.board[r][nc2]||xqIsRed(XQ.board[r][nc2])!==isRed)) moves.push({r:r,c:nc2});
      }
    }
  }
  return moves;
}

function xqIsInCheck(isRed) {
  const kingPos = xqFindKing(isRed);
  if (!kingPos) return true;
  for (let r=0;r<10;r++) for (let c=0;c<9;c++) {
    const p = XQ.board[r][c];
    if (!p||xqIsRed(p)===isRed) continue;
    const moves = xqGetRawMoves(r,c);
    if (moves.some(m=>m.r===kingPos.r&&m.c===kingPos.c)) return true;
  }
  if (xqKingsFacingEachOther()) return true;
  return false;
}

function xqGetMoves(r, c) {
  const piece = XQ.board[r][c];
  if (!piece) return [];
  const raw = xqGetRawMoves(r, c);
  // Filter moves that leave own king in check
  return raw.filter(mv => {
    const orig = XQ.board[mv.r][mv.c];
    XQ.board[mv.r][mv.c] = piece;
    XQ.board[r][c] = null;
    const inCheck = xqIsInCheck(piece.red);
    XQ.board[r][c] = piece;
    XQ.board[mv.r][mv.c] = orig;
    return !inCheck;
  });
}

function initXiangqi() {
  XQ.board = xqInitialBoard();
  XQ.turn = 'red';
  XQ.over = false;
  XQ.selected = null;
  XQ.validMoves = [];
  XQ.thinking = false;
  XQ.moveCount = 0;
  XQ._history = [];
  if (!XQ.contactId) {
    XQ.contactId = S.currentContact || Object.keys(S._contacts||{})[0] || null;
  }
  renderXiangqiAiSelector();
  updateXiangqiAiDisplay();
  xqSetStatus('你先行（红方）');
  renderXiangqiBoard();
  xqSay(XQ.contactId === 'none' ? '棋盘就绪！红方先行，开始对局～' : '棋盘就绪！红方先行，开始对局～');
  const p = $i('xiangqi-settings');
  if (p) p.style.display = 'none';
}

function xqSetStatus(msg) { const el=$i('xq-status'); if(el) el.textContent=msg; }
function xqSay(msg) {
  const el=$i('xq-comment');
  if(!el||!msg) return;
  el.textContent=msg; el.style.opacity='1';
  clearTimeout(el._t);
  el._t=setTimeout(()=>{if(el)el.style.opacity='0';},5500);
}

function renderXiangqiAiSelector() {
  const el=$i('xq-ai-selector'); if(!el) return; el.innerHTML='';
  const noBtn=document.createElement('button');
  noBtn.className='gmk-ai-btn'+(XQ.contactId==='none'?' active':'');
  noBtn.innerHTML='<span>🎮</span><span>不用助手</span>';
  noBtn.onclick=()=>{XQ.contactId='none';renderXiangqiAiSelector();updateXiangqiAiDisplay();};
  el.appendChild(noBtn);
  const contacts=Object.values(S._contacts||{});
  contacts.forEach(c=>{
    const btn=document.createElement('button');
    btn.className='gmk-ai-btn'+(XQ.contactId===c.id?' active':'');
    const av=c.avatar?.startsWith('data:')?`<img src="${c.avatar}" style="width:18px;height:18px;border-radius:50%;object-fit:cover">`:`<span>${c.avatar||'🤖'}</span>`;
    btn.innerHTML=`${av}<span>${esc(c.name)}</span>`;
    btn.onclick=()=>{XQ.contactId=c.id;renderXiangqiAiSelector();updateXiangqiAiDisplay();};
    el.appendChild(btn);
  });
}
function updateXiangqiAiDisplay() {
  const el=$i('xq-ai-name'); if(!el) return;
  if(XQ.contactId==='none'){el.textContent='本地AI（黑方）';return;}
  const contact=XQ.contactId?S._contacts[XQ.contactId]:Object.values(S._contacts||{})[0];
  el.textContent=(contact?.name||'AI')+'（黑方）';
}
function toggleXiangqiSettings() {
  const p=$i('xiangqi-settings'); if(!p) return;
  const show=p.style.display==='none'; p.style.display=show?'':'none';
  if(show){renderXiangqiAiSelector();}
}
function setXiangqiDiff(diff, el) {
  XQ.difficulty=diff;
  document.querySelectorAll('#xiangqi-settings .gmk-diff-btn').forEach(b=>b.classList.remove('active'));
  if(el) el.classList.add('active');
}

function renderXiangqiBoard() {
  const boardEl=$i('xq-board'); if(!boardEl) return;
  boardEl.innerHTML='';
  for (let r=0;r<10;r++) {
    for (let c=0;c<9;c++) {
      const cell=document.createElement('div');
      cell.className='xq-cell';
      // Mark valid moves
      if (XQ.validMoves.some(m=>m.r===r&&m.c===c)) cell.classList.add('valid-move');
      const piece=XQ.board[r][c];
      if (piece) {
        const pd=document.createElement('div');
        pd.className='xq-piece '+(piece.red?'red':'black');
        if(XQ.selected&&XQ.selected.r===r&&XQ.selected.c===c) pd.classList.add('selected');
        pd.textContent=xqPieceLabel(piece);
        cell.appendChild(pd);
      }
      cell.onclick=()=>xqPlayerClick(r,c);
      boardEl.appendChild(cell);
    }
  }
}

function xqPlayerClick(r, c) {
  if (XQ.over||XQ.turn!=='red'||XQ.thinking) return;
  const piece=XQ.board[r][c];
  // If clicked a valid move destination
  if (XQ.selected && XQ.validMoves.some(m=>m.r===r&&m.c===c)) {
    xqMakeMove(XQ.selected.r, XQ.selected.c, r, c);
    XQ.selected=null; XQ.validMoves=[];
    renderXiangqiBoard();
    if (XQ.over) return;
    // Check if black is in checkmate
    if (xqHasNoMoves(false)) {
      XQ.over=true; xqSetStatus('红方胜！将死！'); xqSay('你赢啦！将死！🎉'); return;
    }
    xqSetStatus('AI思考中…'); XQ.thinking=true; renderXiangqiBoard();
    setTimeout(()=>xqAiMove(), 400);
    return;
  }
  // Select own piece
  if (piece && piece.red) {
    XQ.selected={r,c};
    XQ.validMoves=xqGetMoves(r,c);
    renderXiangqiBoard();
  } else {
    XQ.selected=null; XQ.validMoves=[];
    renderXiangqiBoard();
  }
}

function xqMakeMove(fr, fc, tr, tc) {
  XQ.board[tr][tc]=XQ.board[fr][fc];
  XQ.board[fr][fc]=null;
  XQ.turn = XQ.turn==='red'?'black':'red';
  XQ.moveCount++;
}

function xqHasNoMoves(isRed) {
  for (let r=0;r<10;r++) for (let c=0;c<9;c++) {
    const p=XQ.board[r][c];
    if(!p||xqIsRed(p)!==isRed) continue;
    if(xqGetMoves(r,c).length>0) return false;
  }
  return true;
}

function xqEvaluate() {
  let score=0;
  for (let r=0;r<10;r++) for (let c=0;c<9;c++) {
    const p=XQ.board[r][c]; if(!p) continue;
    const v=XQ_VAL[p.t]||0;
    score+=(p.red?1:-1)*v;
  }
  return score; // positive = red advantage
}

function xqGetAllMoves(isRed) {
  const moves=[];
  for (let r=0;r<10;r++) for (let c=0;c<9;c++) {
    const p=XQ.board[r][c];
    if(!p||xqIsRed(p)!==isRed) continue;
    const ms=xqGetMoves(r,c);
    ms.forEach(m=>moves.push({fr:r,fc:c,tr:m.r,tc:m.c}));
  }
  return moves;
}

function xqAiHeuristic() {
  const difficulty=XQ.difficulty||'normal';
  const allMoves=xqGetAllMoves(false);
  if(!allMoves.length) return null;
  if(difficulty==='beginner') {
    return allMoves[Math.floor(Math.random()*allMoves.length)];
  }
  // Score each move (material eval)
  let best=null, bestScore=-Infinity;
  for (const mv of allMoves) {
    const orig=XQ.board[mv.tr][mv.tc];
    XQ.board[mv.tr][mv.tc]=XQ.board[mv.fr][mv.fc];
    XQ.board[mv.fr][mv.fc]=null;
    let score=-xqEvaluate(); // negative because we want black to minimize red
    if(difficulty==='hard') {
      // Depth 2: look at opponent's best response
      const redMoves=xqGetAllMoves(true);
      let minOpp=Infinity;
      for(const rm of redMoves.slice(0,15)) {
        const orig2=XQ.board[rm.tr][rm.tc];
        XQ.board[rm.tr][rm.tc]=XQ.board[rm.fr][rm.fc];
        XQ.board[rm.fr][rm.fc]=null;
        const s2=-xqEvaluate();
        XQ.board[rm.fr][rm.fc]=XQ.board[rm.tr][rm.tc];
        XQ.board[rm.tr][rm.tc]=orig2;
        if(s2<minOpp) minOpp=s2;
      }
      score=minOpp;
    }
    XQ.board[mv.fr][mv.fc]=XQ.board[mv.tr][mv.tc];
    XQ.board[mv.tr][mv.tc]=orig;
    if(score>bestScore){bestScore=score;best=mv;}
  }
  return best;
}

async function xqAiMove() {
  const contact=XQ.contactId==='none'?null:(XQ.contactId?S._contacts[XQ.contactId]:Object.values(S._contacts||{})[0]);
  const useKey=XQ.contactId!=='none'&&(contact?.apiKey||S.settings.apiKey);
  let mv=null, comment='';

  if(useKey && XQ.difficulty!=='beginner') {
    try {
      const lines=[];
      for(let r=0;r<10;r++){
        let row='';
        for(let c=0;c<9;c++){const p=XQ.board[r][c];row+=p?xqPieceLabel(p)+'('+(p.red?'红':'黑')+')'+'  ':'空   ';}
        lines.push(`Row${r}: ${row}`);
      }
      const boardTxt=lines.join('\n');
      const aiName=contact?.name||'AI';
      const personality=contact?.system||'';
      const model=contact?.model||S.settings.model||'openai/gpt-4o-mini';
      const sysPrompt=`你是${aiName}，正在和用户下中国象棋。你执黑方，用户执红方，棋盘10行9列（0-9行，0-8列）。${personality?`你的性格：${personality}。`:''}每次收到棋盘后选择最佳落子，并用符合你个性的话自然回应（不必局限于"一句话"）。返回JSON：{"fr":起始行,"fc":起始列,"tr":目标行,"tc":目标列,"comment":"你的回应"}`;
      const userMsg=`当前棋盘：\n${boardTxt}`;
      const history=XQ._history.slice(-20);
      const res=await fetch(contact?.apiUrl||'https://openrouter.ai/api/v1/chat/completions',{
        method:'POST',
        headers:{'Authorization':`Bearer ${useKey}`,'Content-Type':'application/json','HTTP-Referer':'https://raimos.app','X-Title':'Raimos'},
        body:JSON.stringify({model,max_tokens:150,stream:false,messages:[{role:'system',content:sysPrompt},...history,{role:'user',content:userMsg}]}),
      });
      const data=await res.json();
      const txt=data.choices?.[0]?.message?.content||'';
      const m=txt.match(/\{[\s\S]*?\}/);
      if(m){const p=JSON.parse(m[0]);mv={fr:p.fr,fc:p.fc,tr:p.tr,tc:p.tc};comment=p.comment||'';XQ._history.push({role:'user',content:userMsg});XQ._history.push({role:'assistant',content:txt});}
    } catch(e){}
  }

  // Validate AI move
  if(!mv||mv.fr==null||mv.tr==null||!XQ.board[mv.fr]?.[mv.fc]||xqIsRed(XQ.board[mv.fr][mv.fc])||
     !xqGetMoves(mv.fr,mv.fc).some(m=>m.r===mv.tr&&m.c===mv.tc)) {
    mv=xqAiHeuristic();
  }
  if(!mv){XQ.over=true;xqSetStatus('红方胜！');XQ.thinking=false;return;}

  // Check if capturing the red king
  const target=XQ.board[mv.tr][mv.tc];
  xqMakeMove(mv.fr,mv.fc,mv.tr,mv.tc);
  XQ.thinking=false;
  renderXiangqiBoard();
  if(comment&&XQ.commentary) xqSay(comment);
  if(target&&(target.t==='k')) {
    XQ.over=true; xqSetStatus('黑方胜！将帅被捉！'); xqSay('哈哈，你的帅被我抓住了！'); return;
  }
  if(xqIsInCheck(true)) xqSetStatus('红方被将军！');
  else if(xqHasNoMoves(true)){XQ.over=true;xqSetStatus('黑方胜！红方无路可走！');return;}
  else xqSetStatus('轮到你了（红方）');
  XQ.turn='red';
}


// ══════════════════════════════════════════
// INTERNATIONAL CHESS (国际象棋)
// ══════════════════════════════════════════

const IC = {
  board: null,      // 8×8, null or {t, white}
  turn: 'white',
  over: false,
  selected: null,
  validMoves: [],
  thinking: false,
  contactId: null,  // 'none' = no AI
  _history: [],     // conversation history for multi-turn context
  commentary: true,
  difficulty: 'normal',
  boardColor: 'classic',
  moveCount: 0,
  enPassant: null,   // {r,c} target square for en passant
  castling: { wK:true, wQR:true, wKR:true, bK:true, bQR:true, bKR:true },
  promotionPending: null,
};

const IC_VAL = { k:10000, q:900, r:500, b:300, n:300, p:100 };
// Unicode chess pieces
const IC_GLYPHS = {
  wk:'♔', wq:'♕', wr:'♖', wb:'♗', wn:'♘', wp:'♙',
  bk:'♚', bq:'♛', br:'♜', bb:'♝', bn:'♞', bp:'♟',
};

function icInitialBoard() {
  const b = Array.from({length:8},()=>Array(8).fill(null));
  const backRank = ['r','n','b','q','k','b','n','r'];
  for(let c=0;c<8;c++){
    b[0][c]={t:backRank[c],white:false};
    b[1][c]={t:'p',white:false};
    b[6][c]={t:'p',white:true};
    b[7][c]={t:backRank[c],white:true};
  }
  return b;
}

function icGlyph(piece) {
  if(!piece) return '';
  return IC_GLYPHS[(piece.white?'w':'b')+piece.t]||piece.t;
}

function icFindKing(white) {
  for(let r=0;r<8;r++) for(let c=0;c<8;c++){
    const p=IC.board[r][c];
    if(p&&p.t==='k'&&p.white===white) return {r,c};
  }
  return null;
}

function icGetRawMoves(r, c, board, enPassant, castling) {
  board=board||IC.board;
  enPassant=enPassant!==undefined?enPassant:IC.enPassant;
  castling=castling||IC.castling;
  const piece=board[r][c];
  if(!piece) return [];
  const moves=[];
  const {t,white}=piece;
  const opp=p=>p&&p.white!==white;
  const empty=p=>!p;
  const ok=(r,c)=>r>=0&&r<8&&c>=0&&c<8;

  if(t==='r'||t==='q') { // rook/queen straight
    for(const [dr,dc] of [[0,1],[0,-1],[1,0],[-1,0]]){
      for(let i=1;i<8;i++){
        const nr=r+dr*i,nc=c+dc*i;
        if(!ok(nr,nc)) break;
        if(empty(board[nr][nc])){moves.push({r:nr,c:nc});}
        else{if(opp(board[nr][nc]))moves.push({r:nr,c:nc});break;}
      }
    }
  }
  if(t==='b'||t==='q') { // bishop/queen diagonal
    for(const [dr,dc] of [[1,1],[1,-1],[-1,1],[-1,-1]]){
      for(let i=1;i<8;i++){
        const nr=r+dr*i,nc=c+dc*i;
        if(!ok(nr,nc)) break;
        if(empty(board[nr][nc])){moves.push({r:nr,c:nc});}
        else{if(opp(board[nr][nc]))moves.push({r:nr,c:nc});break;}
      }
    }
  }
  if(t==='n') {
    for(const [dr,dc] of [[2,1],[2,-1],[-2,1],[-2,-1],[1,2],[1,-2],[-1,2],[-1,-2]]){
      const nr=r+dr,nc=c+dc;
      if(ok(nr,nc)&&(empty(board[nr][nc])||opp(board[nr][nc])))moves.push({r:nr,c:nc});
    }
  }
  if(t==='k') {
    for(const [dr,dc] of [[0,1],[0,-1],[1,0],[-1,0],[1,1],[1,-1],[-1,1],[-1,-1]]){
      const nr=r+dr,nc=c+dc;
      if(ok(nr,nc)&&(empty(board[nr][nc])||opp(board[nr][nc])))moves.push({r:nr,c:nc});
    }
    // Castling
    if(white&&castling.wK&&r===7&&c===4){
      if(castling.wKR&&!board[7][5]&&!board[7][6])moves.push({r:7,c:6,castleK:true});
      if(castling.wQR&&!board[7][3]&&!board[7][2]&&!board[7][1])moves.push({r:7,c:2,castleQ:true});
    }
    if(!white&&castling.bK&&r===0&&c===4){
      if(castling.bKR&&!board[0][5]&&!board[0][6])moves.push({r:0,c:6,castleK:true});
      if(castling.bQR&&!board[0][3]&&!board[0][2]&&!board[0][1])moves.push({r:0,c:2,castleQ:true});
    }
  }
  if(t==='p') {
    const dir=white?-1:1;
    const startRow=white?6:1;
    // Forward
    if(ok(r+dir,c)&&empty(board[r+dir][c])){
      moves.push({r:r+dir,c});
      if(r===startRow&&empty(board[r+dir*2][c]))moves.push({r:r+dir*2,c,doublePawn:true});
    }
    // Captures
    for(const dc of [-1,1]){
      const nr=r+dir,nc=c+dc;
      if(!ok(nr,nc)) continue;
      if(opp(board[nr][nc]))moves.push({r:nr,c:nc});
      // En passant
      if(enPassant&&enPassant.r===nr&&enPassant.c===nc)moves.push({r:nr,c:nc,ep:true});
    }
  }
  return moves;
}

function icIsInCheck(white, board, enPassant) {
  board=board||IC.board;
  enPassant=enPassant!==undefined?enPassant:IC.enPassant;
  let kr=-1,kc=-1;
  for(let r=0;r<8;r++) for(let c=0;c<8;c++){
    const p=board[r][c];
    if(p&&p.t==='k'&&p.white===white){kr=r;kc=c;}
  }
  if(kr<0) return true;
  for(let r=0;r<8;r++) for(let c=0;c<8;c++){
    const p=board[r][c];
    if(!p||p.white===white) continue;
    const ms=icGetRawMoves(r,c,board,enPassant,{wK:false,bK:false,wQR:false,wKR:false,bQR:false,bKR:false});
    if(ms.some(m=>m.r===kr&&m.c===kc)) return true;
  }
  return false;
}

function icGetMoves(r, c) {
  const piece=IC.board[r][c];
  if(!piece) return [];
  const raw=icGetRawMoves(r,c);
  return raw.filter(mv=>{
    // Simulate move
    const nb=IC.board.map(row=>[...row]);
    const nep=mv.doublePawn?{r:r+(piece.white?-1:1),c}:null;
    nb[mv.r][mv.c]=nb[r][c];
    nb[r][c]=null;
    if(mv.ep){nb[r][mv.c]=null;}
    if(mv.castleK){nb[mv.r][mv.c-1]=nb[mv.r][mv.c+1];nb[mv.r][mv.c+1]=null;}
    if(mv.castleQ){nb[mv.r][mv.c+1]=nb[mv.r][mv.c-2];nb[mv.r][mv.c-2]=null;}
    return !icIsInCheck(piece.white,nb,nep);
  });
}

function initIntChess() {
  IC.board=icInitialBoard();
  IC.turn='white';
  IC.over=false;
  IC.selected=null;
  IC.validMoves=[];
  IC.thinking=false;
  IC.moveCount=0;
  IC.enPassant=null;
  IC.castling={wK:true,wQR:true,wKR:true,bK:true,bQR:true,bKR:true};
  IC.promotionPending=null;
  IC._history=[];
  if(!IC.contactId){
    IC.contactId=S.currentContact||Object.keys(S._contacts||{})[0]||null;
  }
  renderIntChessAiSelector();
  updateIntChessAiDisplay();
  icSetStatus('白方先行（你）');
  renderIntChessBoard();
  icSay('国际象棋对局开始！白方先行～');
  const p=$i('intchess-settings'); if(p) p.style.display='none';
  const boardEl=$i('ic-board');
  if(boardEl){boardEl.className='ic-board'+(IC.boardColor!=='classic'?' ic-'+IC.boardColor:'');}
}

function icSetStatus(msg){const el=$i('ic-status');if(el)el.textContent=msg;}
function icSay(msg){
  const el=$i('ic-comment');
  if(!el||!msg) return;
  el.textContent=msg;el.style.opacity='1';
  clearTimeout(el._t);
  el._t=setTimeout(()=>{if(el)el.style.opacity='0';},5500);
}

function renderIntChessAiSelector(){
  const el=$i('ic-ai-selector');if(!el)return;el.innerHTML='';
  const noBtn=document.createElement('button');
  noBtn.className='gmk-ai-btn'+(IC.contactId==='none'?' active':'');
  noBtn.innerHTML='<span>🎮</span><span>不用助手</span>';
  noBtn.onclick=()=>{IC.contactId='none';renderIntChessAiSelector();updateIntChessAiDisplay();};
  el.appendChild(noBtn);
  const contacts=Object.values(S._contacts||{});
  contacts.forEach(c=>{
    const btn=document.createElement('button');
    btn.className='gmk-ai-btn'+(IC.contactId===c.id?' active':'');
    const av=c.avatar?.startsWith('data:')?`<img src="${c.avatar}" style="width:18px;height:18px;border-radius:50%;object-fit:cover">`:`<span>${c.avatar||'🤖'}</span>`;
    btn.innerHTML=`${av}<span>${esc(c.name)}</span>`;
    btn.onclick=()=>{IC.contactId=c.id;renderIntChessAiSelector();updateIntChessAiDisplay();};
    el.appendChild(btn);
  });
}
function updateIntChessAiDisplay(){
  const el=$i('ic-ai-name');if(!el)return;
  if(IC.contactId==='none'){el.textContent='本地AI（黑方）';return;}
  const contact=IC.contactId?S._contacts[IC.contactId]:Object.values(S._contacts||{})[0];
  el.textContent=(contact?.name||'AI')+'（黑方）';
}
function toggleIntChessSettings(){
  const p=$i('intchess-settings');if(!p)return;
  const show=p.style.display==='none';p.style.display=show?'':'none';
  if(show)renderIntChessAiSelector();
}
function setIntChessDiff(diff,el){
  IC.difficulty=diff;
  document.querySelectorAll('#intchess-settings .gmk-diff-btn').forEach(b=>b.classList.remove('active'));
  if(el)el.classList.add('active');
}
function setIntChessColor(color,el){
  IC.boardColor=color;
  document.querySelectorAll('#ic-color-row .ic-color-swatch').forEach(s=>s.classList.remove('active'));
  if(el)el.classList.add('active');
  const boardEl=$i('ic-board');
  if(boardEl)boardEl.className='ic-board'+(color!=='classic'?' ic-'+color:'');
}

function renderIntChessBoard(){
  const boardEl=$i('ic-board');if(!boardEl)return;
  boardEl.innerHTML='';
  for(let r=0;r<8;r++){
    for(let c=0;c<8;c++){
      const cell=document.createElement('div');
      const isLight=(r+c)%2===0;
      cell.className='ic-cell '+(isLight?'light':'dark');
      if(IC.selected&&IC.selected.r===r&&IC.selected.c===c)cell.classList.add('selected');
      if(IC.validMoves.some(m=>m.r===r&&m.c===c)){
        const target=IC.board[r][c];
        if(target)cell.classList.add('capture-move');
        else cell.classList.add('valid-move');
      }
      const piece=IC.board[r][c];
      if(piece) cell.textContent=icGlyph(piece);
      cell.onclick=()=>icPlayerClick(r,c);
      boardEl.appendChild(cell);
    }
  }
}

function icPlayerClick(r,c){
  if(IC.over||IC.turn!=='white'||IC.thinking) return;
  const piece=IC.board[r][c];
  if(IC.selected&&IC.validMoves.some(m=>m.r===r&&m.c===c)){
    const mv=IC.validMoves.find(m=>m.r===r&&m.c===c);
    icMakeMove(IC.selected.r,IC.selected.c,r,c,mv);
    IC.selected=null;IC.validMoves=[];
    renderIntChessBoard();
    if(IC.over) return;
    // Check AI turn
    if(icHasNoMoves(false)){
      IC.over=true;
      icSetStatus(icIsInCheck(false)?'白方胜！将死！':'平局（逼和）');
      icSay(icIsInCheck(false)?'你赢了！将死AI！🎉':'平局！势均力敌！');
      return;
    }
    icSetStatus('AI思考中…');IC.thinking=true;renderIntChessBoard();
    setTimeout(()=>icAiMove(),400);
    return;
  }
  if(piece&&piece.white){
    IC.selected={r,c};
    IC.validMoves=icGetMoves(r,c);
    renderIntChessBoard();
  } else {
    IC.selected=null;IC.validMoves=[];
    renderIntChessBoard();
  }
}

function icMakeMove(fr,fc,tr,tc,mv){
  const piece=IC.board[fr][fc];
  IC.board[tr][tc]=piece;
  IC.board[fr][fc]=null;
  IC.enPassant=mv?.doublePawn?{r:fr+(piece.white?-1:1),c:fc}:null;
  // En passant capture
  if(mv?.ep) IC.board[fr][tc]=null;
  // Castling rook
  if(mv?.castleK){IC.board[tr][tc-1]=IC.board[tr][tc+1];IC.board[tr][tc+1]=null;}
  if(mv?.castleQ){IC.board[tr][tc+1]=IC.board[tr][tc-2];IC.board[tr][tc-2]=null;}
  // Update castling rights
  if(piece.t==='k'){if(piece.white){IC.castling.wK=false;IC.castling.wQR=false;IC.castling.wKR=false;}else{IC.castling.bK=false;IC.castling.bQR=false;IC.castling.bKR=false;}}
  if(piece.t==='r'){if(fr===7&&fc===0)IC.castling.wQR=false;if(fr===7&&fc===7)IC.castling.wKR=false;if(fr===0&&fc===0)IC.castling.bQR=false;if(fr===0&&fc===7)IC.castling.bKR=false;}
  IC.moveCount++;
  // Pawn promotion
  if(piece.t==='p'&&(tr===0||tr===7)){
    IC.board[tr][tc]={t:'q',white:piece.white}; // auto-promote to queen
  }
  IC.turn=IC.turn==='white'?'black':'white';
  // Check game state for moving player's opponent
  const oppWhite=!piece.white;
  if(icIsInCheck(oppWhite)){
    if(icHasNoMoves(oppWhite)){IC.over=true;icSetStatus(piece.white?'白方胜！将死！':'黑方胜！将死！');return;}
    icSetStatus(oppWhite?'黑方被将军！':'白方被将军！');
  } else {
    if(icHasNoMoves(oppWhite)){IC.over=true;icSetStatus('平局（逼和）');return;}
    icSetStatus(oppWhite?'AI回合（黑方）':'轮到你了（白方）');
  }
}

function icHasNoMoves(white){
  for(let r=0;r<8;r++) for(let c=0;c<8;c++){
    const p=IC.board[r][c];
    if(!p||p.white!==white) continue;
    if(icGetMoves(r,c).length>0) return false;
  }
  return true;
}

function icEvaluate(board){
  board=board||IC.board;
  let score=0;
  for(let r=0;r<8;r++) for(let c=0;c<8;c++){
    const p=board[r][c];if(!p)continue;
    const v=IC_VAL[p.t]||0;
    score+=(p.white?1:-1)*v;
  }
  return score;
}

function icNegamax(board,depth,alpha,beta,white,enPassant,castling){
  if(depth===0) return (white?1:-1)*icEvaluate(board);
  let best=-Infinity;
  for(let r=0;r<8;r++) for(let c=0;c<8;c++){
    const p=board[r][c];if(!p||p.white!==white)continue;
    const moves=icGetRawMoves(r,c,board,enPassant,castling).filter(mv=>{
      const nb=board.map(row=>[...row]);
      nb[mv.r][mv.c]=nb[r][c];nb[r][c]=null;
      if(mv.ep)nb[r][mv.c]=null;
      return !icIsInCheck(white,nb,mv.doublePawn?{r:r+(white?-1:1),c}:null);
    });
    for(const mv of moves){
      const nb=board.map(row=>[...row]);
      const nep=mv.doublePawn?{r:r+(white?-1:1),c}:null;
      nb[mv.r][mv.c]=nb[r][c];nb[r][c]=null;
      if(mv.ep)nb[r][mv.c]=null;
      if(nb[mv.r][mv.c]&&nb[mv.r][mv.c].t==='p'&&(mv.r===0||mv.r===7))nb[mv.r][mv.c]={t:'q',white};
      const v=-icNegamax(nb,depth-1,-beta,-alpha,!white,nep,castling);
      if(v>best)best=v;
      if(v>alpha)alpha=v;
      if(alpha>=beta)return best;
    }
  }
  return best===Infinity?10000:best;
}

function icAiHeuristic(){
  const difficulty=IC.difficulty||'normal';
  const depth=difficulty==='beginner'?1:difficulty==='hard'?3:2;
  let best=null,bestScore=-Infinity;
  for(let r=0;r<8;r++) for(let c=0;c<8;c++){
    const p=IC.board[r][c];if(!p||p.white)continue;
    const moves=icGetMoves(r,c);
    for(const mv of moves){
      // Random move for beginner 30% of time
      if(difficulty==='beginner'&&Math.random()<0.3){
        return {fr:r,fc:c,mv};
      }
      const nb=IC.board.map(row=>[...row]);
      const nep=mv.doublePawn?{r:r+1,c}:null;
      nb[mv.r][mv.c]=nb[r][c];nb[r][c]=null;
      if(mv.ep)nb[r][mv.c]=null;
      if(nb[mv.r][mv.c]&&nb[mv.r][mv.c].t==='p'&&(mv.r===0||mv.r===7))nb[mv.r][mv.c]={t:'q',white:false};
      const score=-icNegamax(nb,depth-1,-Infinity,Infinity,true,nep,IC.castling);
      if(score>bestScore){bestScore=score;best={fr:r,fc:c,mv};}
    }
  }
  return best;
}

async function icAiMove(){
  const contact=IC.contactId==='none'?null:(IC.contactId?S._contacts[IC.contactId]:Object.values(S._contacts||{})[0]);
  const useKey=IC.contactId!=='none'&&(contact?.apiKey||S.settings.apiKey);
  let chosen=null;

  if(useKey&&IC.difficulty!=='beginner'){
    try{
      const rows='ABCDEFGH';
      const aiName=contact?.name||'AI';
      const personality=contact?.system||'';
      const model=contact?.model||S.settings.model||'openai/gpt-4o-mini';
      let boardTxt='';
      for(let r=0;r<8;r++){
        boardTxt+=`${8-r} `;
        for(let c=0;c<8;c++){const p=IC.board[r][c];boardTxt+=(p?icGlyph(p):'.')+ ' ';}
        boardTxt+='\n';
      }
      boardTxt+='  A B C D E F G H';
      const sysPrompt=`你是${aiName}，正在和用户下国际象棋，你执黑方，白方是用户。${personality?`你的性格：${personality}。`:''}每次收到棋盘后，选择一步合法的落子，并用符合你个性的话自然回应（不必局限于"一句话"）。返回JSON：{"from":"A1","to":"A2","comment":"你的回应"}（列A-H，行1-8）`;
      const userMsg=`当前棋盘：\n${boardTxt}`;
      const history=IC._history.slice(-20);
      const res=await fetch(contact?.apiUrl||'https://openrouter.ai/api/v1/chat/completions',{
        method:'POST',
        headers:{'Authorization':`Bearer ${useKey}`,'Content-Type':'application/json','HTTP-Referer':'https://raimos.app','X-Title':'Raimos'},
        body:JSON.stringify({model,max_tokens:150,stream:false,messages:[{role:'system',content:sysPrompt},...history,{role:'user',content:userMsg}]}),
      });
      const data=await res.json();
      const txt=data.choices?.[0]?.message?.content||'';
      const m=txt.match(/\{[\s\S]*?\}/);
      if(m){
        const p=JSON.parse(m[0]);
        const fc=rows.indexOf(p.from?.[0]?.toUpperCase());
        const fr=8-parseInt(p.from?.[1]);
        const tc=rows.indexOf(p.to?.[0]?.toUpperCase());
        const tr=8-parseInt(p.to?.[1]);
        if(fc>=0&&fr>=0&&tc>=0&&tr>=0){
          const legalMoves=icGetMoves(fr,fc);
          const lm=legalMoves.find(mv=>mv.r===tr&&mv.c===tc);
          if(lm){chosen={fr,fc,mv:lm,comment:p.comment};IC._history.push({role:'user',content:userMsg});IC._history.push({role:'assistant',content:txt});}
        }
      }
    }catch(e){}
  }

  if(!chosen) chosen=icAiHeuristic();
  if(!chosen){IC.over=true;icSetStatus('白方胜！');IC.thinking=false;renderIntChessBoard();return;}

  icMakeMove(chosen.fr,chosen.fc,chosen.mv.r,chosen.mv.c,chosen.mv);
  IC.thinking=false;
  renderIntChessBoard();
  if(chosen.comment&&IC.commentary) icSay(chosen.comment);
  if(IC.over) return;
  // Final check for white player
  if(icIsInCheck(true)){
    if(icHasNoMoves(true)){IC.over=true;icSetStatus('黑方胜！将死！');icSay('哈哈，将死你了！');return;}
    icSetStatus('白方被将军！轮到你了～');
  } else if(icHasNoMoves(true)){
    IC.over=true;icSetStatus('平局（逼和）');icSay('平局了～');
  } else {
    icSetStatus('轮到你了（白方）');
  }
}

// ══════════════════════════════════════════
// 🎲 幸运大冒险 (Lucky Adventure Board Game)
// ══════════════════════════════════════════

const BOARD_PLAYER_COLORS = ['#ff6b6b', '#4d9fff', '#ffd93d', '#6bcb77'];
const BOARD_PLAYER_EMOJIS = ['🔴', '🔵', '🟡', '🟢'];

const BOARD_PROPERTIES = [
  { id:0,  name:'粉红小屋', group:0, price:60,  rent:[2,10,30,90,160,250],  houseCost:50  },
  { id:1,  name:'玫瑰庄园', group:0, price:60,  rent:[4,20,60,180,320,450], houseCost:50  },
  { id:2,  name:'蓝湾别墅', group:1, price:100, rent:[6,30,90,270,400,550], houseCost:50  },
  { id:3,  name:'海风公寓', group:1, price:120, rent:[8,40,100,300,450,600], houseCost:50  },
  { id:4,  name:'樱花小院', group:2, price:140, rent:[10,50,150,450,625,750], houseCost:100 },
  { id:5,  name:'蜜桃庭苑', group:2, price:160, rent:[12,60,180,500,700,900], houseCost:100 },
  { id:6,  name:'夕阳花园', group:3, price:180, rent:[14,70,200,550,750,950], houseCost:100 },
  { id:7,  name:'琥珀小筑', group:3, price:200, rent:[16,80,220,600,800,1000],houseCost:100 },
  { id:8,  name:'红枫山庄', group:4, price:220, rent:[18,90,250,700,875,1050],houseCost:150 },
  { id:9,  name:'绛红公馆', group:4, price:240, rent:[20,100,300,750,925,1100],houseCost:150 },
  { id:10, name:'金色庄园', group:5, price:260, rent:[22,110,330,800,975,1150],houseCost:150 },
  { id:11, name:'阳光别苑', group:5, price:280, rent:[24,120,360,850,1025,1200],houseCost:150 },
  { id:12, name:'翠竹山庄', group:6, price:300, rent:[26,130,390,900,1100,1275],houseCost:200 },
  { id:13, name:'碧波庄院', group:6, price:320, rent:[28,150,450,1000,1200,1400],houseCost:200 },
  { id:14, name:'星钻宫殿', group:7, price:350, rent:[35,175,500,1100,1300,1500],houseCost:200 },
  { id:15, name:'皇冠御苑', group:7, price:400, rent:[50,200,600,1400,1700,2000],houseCost:200 },
];

const BOARD_PROP_COLORS = ['#e879f9','#38bdf8','#f472b6','#fb923c','#ef4444','#fbbf24','#22c55e','#1d4ed8'];

const BOARD_SPACE_LAYOUT = [
  {type:'start',    name:'出发点',   icon:'🏠'},
  {type:'land',     name:'粉红小屋', icon:'🏡', propId:0,  color:'#e879f9'},
  {type:'chance',   name:'机会',     icon:'🎰'},
  {type:'land',     name:'玫瑰庄园', icon:'🏡', propId:1,  color:'#e879f9'},
  {type:'tax',      name:'所得税',   icon:'💰'},
  {type:'shop',     name:'道具商店', icon:'🛒'},
  {type:'land',     name:'蓝湾别墅', icon:'🏡', propId:2,  color:'#38bdf8'},
  {type:'community',name:'公共基金', icon:'📦'},
  {type:'land',     name:'海风公寓', icon:'🏡', propId:3,  color:'#38bdf8'},
  {type:'warmup',   name:'情侣升温', icon:'🔥'},
  {type:'jail',     name:'休息一下', icon:'⛓️'},
  {type:'land',     name:'樱花小院', icon:'🏡', propId:4,  color:'#f472b6'},
  {type:'couple_challenge',name:'情侣挑战',icon:'💑'},
  {type:'land',     name:'蜜桃庭苑', icon:'🏡', propId:5,  color:'#f472b6'},
  {type:'land',     name:'夕阳花园', icon:'🏡', propId:6,  color:'#fb923c'},
  {type:'truth_dare',name:'真心话大冒险',icon:'🎭'},
  {type:'land',     name:'琥珀小筑', icon:'🏡', propId:7,  color:'#fb923c'},
  {type:'chance',   name:'机会',     icon:'🎰'},
  {type:'land',     name:'红枫山庄', icon:'🏡', propId:8,  color:'#ef4444'},
  {type:'warmup',   name:'情侣升温', icon:'🔥'},
  {type:'free',     name:'免费停车', icon:'🅿️'},
  {type:'land',     name:'绛红公馆', icon:'🏡', propId:9,  color:'#ef4444'},
  {type:'couple_challenge',name:'情侣挑战',icon:'💑'},
  {type:'land',     name:'金色庄园', icon:'🏡', propId:10, color:'#fbbf24'},
  {type:'community',name:'公共基金', icon:'📦'},
  {type:'land',     name:'阳光别苑', icon:'🏡', propId:11, color:'#fbbf24'},
  {type:'back3',    name:'后退3格',  icon:'⬅️'},
  {type:'land',     name:'翠竹山庄', icon:'🏡', propId:12, color:'#22c55e'},
  {type:'truth_dare',name:'真心话大冒险',icon:'🎭'},
  {type:'land',     name:'碧波庄院', icon:'🏡', propId:13, color:'#22c55e'},
  {type:'forward3', name:'前进3格',  icon:'➡️'},
  {type:'land',     name:'星钻宫殿', icon:'🏡', propId:14, color:'#1d4ed8'},
  {type:'chance',   name:'机会',     icon:'🎰'},
  {type:'land',     name:'皇冠御苑', icon:'🏡', propId:15, color:'#1d4ed8'},
  {type:'couple_challenge',name:'情侣挑战',icon:'💑'},
  {type:'shop',     name:'道具商店', icon:'🛒'},
  {type:'community',name:'公共基金', icon:'📦'},
  {type:'warmup',   name:'情侣升温', icon:'🔥'},
  {type:'tax',      name:'奢侈税',   icon:'💰'},
  {type:'jail',     name:'休息一下', icon:'⛓️'},
];

const BOARD_ITEM_CARDS = [
  { id:'pass',     name:'免费通行证', icon:'🛡️', desc:'免除一次租金支付' },
  { id:'lucky',    name:'幸运骰子',   icon:'🎲', desc:'掷两次取最大值' },
  { id:'bomb',     name:'炸弹卡',     icon:'💣', desc:'对手后退5格' },
  { id:'teleport', name:'传送卡',     icon:'🔮', desc:'传送到任意已拥有地产' },
  { id:'build',    name:'建设卡',     icon:'🏗️', desc:'免费建一栋房子' },
  { id:'freeze',   name:'冻结卡',     icon:'❄️', desc:'冻结对手，跳过他们下一回合' },
];

const BOARD_COUPLE_TASKS = [
  '给对方一个温暖的拥抱，并持续10秒',
  '看着对方的眼睛，说一句真心话',
  '用最甜蜜的方式说"我爱你"',
  '为对方轻轻捏肩膀1分钟',
  '说出对方三个让你最欣赏的优点',
  '互换手机，各自看对方最近发的一条朋友圈',
  '用歌声表达你对对方的感情',
  '两人手牵手，说说第一次见面的感受',
  '给对方一个额头吻',
  '说出你们在一起以来最难忘的一个瞬间',
  '为对方写一句诗或情话',
  '模仿对方最常说的口头禅，让对方猜',
  '两人一起做同一个傻动作并拍下来',
  '告诉对方你最喜欢他/她哪个部位',
  '说出一件你因为对方而改变的习惯',
  '给对方一个"意外"的小礼物或零食',
  '假装是第一次见面，重新自我介绍',
  '两人互拍一张满意的自拍',
  '说出你觉得你们最般配的地方',
  '一起规划一次未来的约会',
];

const BOARD_TRUTH_DARE = [
  '说出你对现在这段关系最满意的一点',
  '说出你认为两人之间最需要改进的地方',
  '你有没有对对方说过善意的谎言？说说是什么',
  '你最希望对方改变的一个习惯是什么？',
  '你第一次意识到喜欢对方是什么时候？',
  '你觉得对方最让你感动的一件事是什么？',
  '如果可以带对方去任何地方，你会选哪里？',
  '你最大的梦想是什么？有想过和对方一起实现吗？',
  '用三个词形容你眼中的对方',
  '说出一件你从未告诉过对方的小秘密',
  '大声唱出你们最有意义的一首歌的副歌',
  '做10个深蹲，同时每蹲一下说一句情话',
  '用舞蹈动作描述你们相遇的故事',
  '模仿你心目中对方最可爱的表情动作',
  '闭上眼睛，凭感觉描述对方今天穿的衣服',
  '用婴儿语气向对方撒娇30秒',
  '说出5件你比对方做得更好的事（不允许谦虚）',
  '表演一段你们第一次约会的场景',
  '用最动听的声音给对方读一段文字',
  '向对方告白，好像这是你们第一次',
];

const BOARD_WARMUP_TASKS = [
  '分享一段你们最美好的共同记忆，说出细节',
  '说出一件对方做过的、让你最感动的事',
  '告诉对方你最担心失去他/她的原因',
  '说说你觉得你们最像的一个地方',
  '分享一个只有你们两人才懂的私密笑话或暗号',
  '说出你希望未来五年两人一起完成的一件事',
  '告诉对方你最欣赏他/她待人的方式是什么',
  '说出对方对你人生影响最大的一句话',
  '分享你第一次带对方见家人时心里在想什么',
  '说出你觉得两人感情最深厚的一个时刻',
  '告诉对方你最感激他/她为你做的一件小事',
  '说说如果生命中没有对方，你的生活会有什么不同',
  '为对方创作一首即兴"迷你情歌"（至少4句）',
  '说出一件你一直想对对方说但没说出口的话',
  '两人各说三件希望对方记住的事',
];

const BOARD_CHANCE_CARDS = [
  { text:'你发现了一笔宝藏！获得200金币', effect:'coins', value:200 },
  { text:'股市大涨！获得150金币红利', effect:'coins', value:150 },
  { text:'意外收到礼物！获得100金币', effect:'coins', value:100 },
  { text:'收到神秘礼包！获得一张随机道具卡', effect:'item', value:1 },
  { text:'前进到最近的道具商店', effect:'move_to', value:'shop' },
  { text:'比赛获奖！每位玩家向你支付50金币', effect:'collect_all', value:50 },
  { text:'银行失误多转给你100金币（不退还）', effect:'coins', value:100 },
  { text:'被小偷光顾！损失80金币', effect:'coins', value:-80 },
  { text:'税务稽查！缴纳当前金币的10%', effect:'percent_tax', value:0.1 },
  { text:'时光倒流！后退6格', effect:'move', value:-6 },
  { text:'获得免费通行证！', effect:'get_item', value:'pass' },
  { text:'中了彩票！获得300金币', effect:'coins', value:300 },
  { text:'汽车维修费用！损失50金币', effect:'coins', value:-50 },
  { text:'朋友生日请吃饭！损失100金币', effect:'coins', value:-100 },
  { text:'旅行计划受阻，损失所有临时收入（损失30金币）', effect:'coins', value:-30 },
  { text:'获得幸运骰子！', effect:'get_item', value:'lucky' },
  { text:'幸运！直接前进5格', effect:'move', value:5 },
  { text:'获得炸弹卡！', effect:'get_item', value:'bomb' },
  { text:'好运连连！额外获得一次掷骰机会', effect:'extra_roll', value:1 },
  { text:'获得传送卡！', effect:'get_item', value:'teleport' },
];

const BOARD_COMMUNITY_CARDS = [
  { text:'社区筹款成功！获得100金币', effect:'coins', value:100 },
  { text:'街道改造补贴！获得80金币', effect:'coins', value:80 },
  { text:'生日快乐！每位玩家送你30金币', effect:'collect_all', value:30 },
  { text:'慈善捐款！你捐出50金币', effect:'coins', value:-50 },
  { text:'节日红包！获得120金币', effect:'coins', value:120 },
  { text:'医疗费用报销！获得60金币', effect:'coins', value:60 },
  { text:'年终奖金！获得200金币', effect:'coins', value:200 },
  { text:'社区表彰！获得建设卡一张', effect:'get_item', value:'build' },
  { text:'水电费账单！缴纳40金币', effect:'coins', value:-40 },
  { text:'环保奖励！获得冻结卡一张', effect:'get_item', value:'freeze' },
  { text:'中秋节礼金！获得150金币', effect:'coins', value:150 },
  { text:'街坊互助！向最近玩家支付60金币', effect:'pay_leader', value:60 },
  { text:'社区共建基金！获得90金币', effect:'coins', value:90 },
  { text:'节日聚餐费！支付70金币', effect:'coins', value:-70 },
  { text:'社区彩票中奖！获得250金币', effect:'coins', value:250 },
];

const BOARD = {
  playerCount: 2,
  players: [],
  currentPlayer: 0,
  rolling: false,
  over: false,
  round: 1,
  maxRounds: 20,
  contactId: 'none',
  showToken: false,
  _history: [],
  // property ownership: { propId -> playerIndex }
  ownership: {},
  // houses per property: { propId -> count }
  houses: {},
  // frozen players: set of player indices
  frozen: new Set(),
  _pendingAction: null,
};

// ── Setup ──
function initBoardSetup() {
  BOARD.playerCount = 2;
  BOARD.contactId = 'none';
  renderBoardPlayerInputs();
  buildBoardAiSelector();
  const tog = $i('board-show-token-toggle');
  if (tog) tog.checked = !!S.settings.showGameToken;
  document.querySelectorAll('#board-setup-page .fly-count-btn').forEach((btn, i) => {
    btn.classList.toggle('active', i === 0);
  });
}

function setBoardPlayerCount(n, el) {
  BOARD.playerCount = n;
  document.querySelectorAll('#board-setup-page .fly-count-btn').forEach(b => b.classList.remove('active'));
  if (el) el.classList.add('active');
  renderBoardPlayerInputs();
}

function renderBoardPlayerInputs() {
  const container = $i('board-setup-players');
  if (!container) return;
  container.innerHTML = '';
  for (let i = 0; i < BOARD.playerCount; i++) {
    const row = document.createElement('div');
    row.className = 'fly-player-input-row';
    row.innerHTML = `<span class="fly-player-emoji">${BOARD_PLAYER_EMOJIS[i]}</span>
      <span class="fly-player-color-dot" style="background:${BOARD_PLAYER_COLORS[i]}"></span>
      <input class="fly-player-input" id="board-player-name-${i}" type="text" placeholder="玩家${i+1}" value="玩家${i+1}" maxlength="8">`;
    container.appendChild(row);
  }
}

function buildBoardAiSelector() {
  const el = $i('board-ai-selector');
  if (!el) return;
  el.innerHTML = '';
  const contacts = Object.values(S._contacts || {});
  const noBtn = document.createElement('button');
  noBtn.className = 'gmk-ai-btn' + (BOARD.contactId === 'none' ? ' active' : '');
  noBtn.textContent = '🚫 无助手';
  noBtn.onclick = () => { BOARD.contactId = 'none'; buildBoardAiSelector(); };
  el.appendChild(noBtn);
  contacts.forEach(c => {
    const btn = document.createElement('button');
    btn.className = 'gmk-ai-btn' + (BOARD.contactId === c.id ? ' active' : '');
    btn.textContent = (c.avatar || '🤖') + ' ' + c.name;
    btn.onclick = () => { BOARD.contactId = c.id; buildBoardAiSelector(); };
    el.appendChild(btn);
  });
}

function startBoardGame() {
  const players = [];
  for (let i = 0; i < BOARD.playerCount; i++) {
    const nameEl = $i(`board-player-name-${i}`);
    players.push({
      name: nameEl?.value.trim() || `玩家${i+1}`,
      emoji: BOARD_PLAYER_EMOJIS[i],
      color: BOARD_PLAYER_COLORS[i],
      pos: 0,
      coins: 1500,
      items: [],
      active: true,
      skipped: false,
    });
  }
  const tog = $i('board-show-token-toggle');
  BOARD.showToken = tog ? tog.checked : false;
  BOARD.players = players;
  BOARD.currentPlayer = 0;
  BOARD.rolling = false;
  BOARD.over = false;
  BOARD.round = 1;
  BOARD.ownership = {};
  BOARD.houses = {};
  BOARD.frozen = new Set();
  BOARD._history = [];
  BOARD._pendingAction = null;

  switchPage('board-game-page');
  renderBoardMap();
  renderBoardPlayerBar();
  boardUpdateTurnInfo();
  boardEnableDice(true);
  boardLog(`🎲 游戏开始！每人各有1500金币，祝大家好运！`);
}

// ── Board Rendering ──
function renderBoardMap() {
  const mapEl = $i('board-map');
  if (!mapEl) return;
  mapEl.innerHTML = '';

  // Create 40 cells arranged in a monopoly-style loop
  // We'll show them as a 4-row grid representation
  // Bottom row (0-9): spaces 0-9 L->R
  // Left col (10-19): spaces 10-19 bottom->top
  // Top row (20-29): spaces 20-29 L->R
  // Right col (30-39): spaces 30-39 top->bottom

  const grid = document.createElement('div');
  grid.className = 'board-grid';

  function makeCell(idx) {
    const sp = BOARD_SPACE_LAYOUT[idx];
    const cell = document.createElement('div');
    cell.className = `board-cell board-cell-${sp.type}`;
    cell.id = `board-cell-${idx}`;
    let colorBar = '';
    if (sp.type === 'land' && sp.color) {
      colorBar = `<div class="board-cell-color" style="background:${sp.color}"></div>`;
    }
    // Show owner indicator
    const ownerIdx = BOARD.ownership[sp.propId];
    const ownerDot = (ownerIdx !== undefined) ?
      `<div class="board-cell-owner" style="background:${BOARD_PLAYER_COLORS[ownerIdx]}"></div>` : '';
    // Houses
    const houseCount = BOARD.houses[sp.propId] || 0;
    const houseDots = houseCount > 0 ? `<div class="board-cell-houses">${'🏠'.repeat(Math.min(houseCount,4))}</div>` : '';
    cell.innerHTML = `${colorBar}<div class="board-cell-icon">${sp.icon}</div><div class="board-cell-name">${sp.name}</div>${ownerDot}${houseDots}<div class="board-cell-tokens" id="board-tokens-${idx}"></div>`;
    return cell;
  }

  // Build 11x11 grid layout
  // Corner cells: 0(BR), 10(BL), 20(TL), 30(TR) => we use a simpler linear display
  // For mobile: vertical scroll list
  const listWrap = document.createElement('div');
  listWrap.className = 'board-space-list';
  for (let i = 0; i < 40; i++) {
    listWrap.appendChild(makeCell(i));
  }
  mapEl.appendChild(listWrap);
  boardUpdateMapTokens();
}

function boardUpdateMapTokens() {
  document.querySelectorAll('[id^="board-tokens-"]').forEach(el => el.innerHTML = '');
  BOARD.players.forEach((p, idx) => {
    if (!p.active) return;
    const container = $i(`board-tokens-${p.pos}`);
    if (container) {
      const token = document.createElement('div');
      token.className = 'board-token';
      token.style.background = p.color;
      token.title = p.name;
      token.textContent = p.emoji;
      container.appendChild(token);
    }
  });
}

function renderBoardPlayerBar() {
  const bar = $i('board-player-bar');
  if (!bar) return;
  bar.innerHTML = '';
  BOARD.players.forEach((p, idx) => {
    const card = document.createElement('div');
    const isActive = idx === BOARD.currentPlayer && !BOARD.over;
    card.className = 'board-player-card' + (isActive ? ' active' : '') + (!p.active ? ' bankrupt' : '');
    const propCount = Object.values(BOARD.ownership).filter(o => o === idx).length;
    card.innerHTML = `<div class="board-player-card-emoji">${p.emoji}</div>
      <div class="board-player-card-info">
        <div class="board-player-card-name">${esc(p.name)}</div>
        <div class="board-player-card-coins">💰${p.coins}</div>
        <div class="board-player-card-props">${propCount > 0 ? `🏡×${propCount}` : ''}${p.items.length > 0 ? ` 🎒×${p.items.length}` : ''}</div>
      </div>`;
    bar.appendChild(card);
  });
  // update round label
  const rl = $i('board-round-label');
  if (rl) rl.textContent = `第${BOARD.round}回合`;
}

function boardUpdateTurnInfo() {
  const el = $i('board-turn-info');
  if (!el) return;
  if (BOARD.over) { el.textContent = '游戏结束！'; return; }
  const p = BOARD.players[BOARD.currentPlayer];
  if (!p) return;
  el.innerHTML = `${p.emoji} <strong>${esc(p.name)}</strong> 的回合`;
}

function boardEnableDice(enabled) {
  const btn = $i('board-dice-btn');
  if (btn) btn.disabled = !enabled;
}

// ── Log ──
function boardLog(msg) {
  const log = $i('board-log');
  if (!log) return;
  const div = document.createElement('div');
  div.className = 'board-log-entry';
  div.textContent = msg;
  log.prepend(div);
  if (log.children.length > 30) log.removeChild(log.lastChild);
}

// ── Dice ──
function boardRollDice() {
  if (BOARD.rolling || BOARD.over) return;
  const p = BOARD.players[BOARD.currentPlayer];
  if (!p || !p.active) return;

  BOARD.rolling = true;
  boardEnableDice(false);

  // Check if player has lucky dice item
  const hasLucky = p.items.includes('lucky');
  let result;
  if (hasLucky) {
    const r1 = Math.floor(Math.random() * 6) + 1;
    const r2 = Math.floor(Math.random() * 6) + 1;
    result = Math.max(r1, r2);
    p.items.splice(p.items.indexOf('lucky'), 1);
    toast(`🎲 幸运骰子！掷出 ${r1} 和 ${r2}，取最大值 ${result}`);
  } else {
    result = Math.floor(Math.random() * 6) + 1;
  }

  // Animate dice
  const btn = $i('board-dice-btn');
  if (btn) btn.textContent = DICE_FACES[result-1] + ' ' + result;
  boardLog(`${p.emoji} ${p.name} 掷出了 ${result} 点`);

  setTimeout(() => {
    if (btn) btn.textContent = '🎲 掷骰子';
    BOARD.rolling = false;
    boardMovePlayer(BOARD.currentPlayer, result);
  }, 600);
}

async function boardMovePlayer(playerIdx, steps) {
  const p = BOARD.players[playerIdx];
  if (!p) return;

  const oldPos = p.pos;
  let newPos = (p.pos + steps) % 40;
  // check if passed start (space 0)
  if (newPos < oldPos && steps > 0) {
    // passed start - collect 200
    p.coins += 200;
    boardLog(`🏠 ${p.name} 经过出发点，获得200金币！`);
    toast(`🏠 ${p.name} 经过出发点，获得 200金币！`);
  }
  p.pos = newPos;

  renderBoardPlayerBar();
  boardUpdateMapTokens();

  const sp = BOARD_SPACE_LAYOUT[newPos];
  boardLog(`${p.emoji} ${p.name} 移动到 ${sp.icon} ${sp.name}（第${newPos+1}格）`);

  await boardDelay(400);
  await boardTriggerSpace(playerIdx);
}

function boardDelay(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function boardTriggerSpace(playerIdx) {
  const p = BOARD.players[playerIdx];
  const sp = BOARD_SPACE_LAYOUT[p.pos];

  switch (sp.type) {
    case 'start':
      p.coins += 200;
      boardLog(`🏠 ${p.name} 停在出发点，额外获得200金币！`);
      renderBoardPlayerBar();
      boardNextTurn();
      break;

    case 'land': {
      const prop = BOARD_PROPERTIES.find(pr => pr.id === sp.propId);
      if (!prop) { boardNextTurn(); return; }
      const ownerIdx = BOARD.ownership[sp.propId];
      if (ownerIdx === undefined) {
        // unowned - offer to buy
        if (p.coins >= prop.price) {
          boardShowBuyOverlay(playerIdx, prop);
        } else {
          boardLog(`${p.name} 金币不足，无法购买 ${prop.name}`);
          boardNextTurn();
        }
      } else if (ownerIdx === playerIdx) {
        boardLog(`🏡 ${p.name} 停在自己的 ${prop.name}，无事发生`);
        boardNextTurn();
      } else {
        // pay rent
        const houseCount = BOARD.houses[prop.id] || 0;
        const rent = prop.rent[houseCount];
        // Check if current player has pass card
        if (p.items.includes('pass')) {
          p.items.splice(p.items.indexOf('pass'), 1);
          boardLog(`🛡️ ${p.name} 使用免费通行证，免付租金！`);
          boardNextTurn();
        } else {
          const owner = BOARD.players[ownerIdx];
          const actualRent = Math.min(rent, p.coins + 10); // prevent going too negative
          p.coins -= actualRent;
          owner.coins += actualRent;
          boardLog(`💸 ${p.name} 向 ${owner.name} 支付租金 ${actualRent}金币（${prop.name}）`);
          toast(`💸 租金 ${actualRent}金币 → ${owner.name}`);
          renderBoardPlayerBar();
          await boardCheckBankruptcy(playerIdx);
        }
      }
      break;
    }

    case 'chance': {
      const card = BOARD_CHANCE_CARDS[Math.floor(Math.random() * BOARD_CHANCE_CARDS.length)];
      await boardApplyCard(playerIdx, card, '🎰 机会');
      break;
    }

    case 'community': {
      const card = BOARD_COMMUNITY_CARDS[Math.floor(Math.random() * BOARD_COMMUNITY_CARDS.length)];
      await boardApplyCard(playerIdx, card, '📦 公共基金');
      break;
    }

    case 'couple_challenge': {
      const task = BOARD_COUPLE_TASKS[Math.floor(Math.random() * BOARD_COUPLE_TASKS.length)];
      await boardShowEventOverlay('💑 情侣挑战', p.emoji + ' ' + p.name + ' 触发', task, 'couple_challenge', playerIdx);
      break;
    }

    case 'truth_dare': {
      const task = BOARD_TRUTH_DARE[Math.floor(Math.random() * BOARD_TRUTH_DARE.length)];
      await boardShowEventOverlay('🎭 真心话大冒险', p.emoji + ' ' + p.name + ' 触发', task, 'truth_dare', playerIdx);
      break;
    }

    case 'warmup': {
      const task = BOARD_WARMUP_TASKS[Math.floor(Math.random() * BOARD_WARMUP_TASKS.length)];
      await boardShowEventOverlay('🔥 情侣升温', p.emoji + ' ' + p.name + ' 触发', task, 'warmup', playerIdx);
      break;
    }

    case 'tax': {
      const amount = sp.name === '奢侈税' ? 100 : 50;
      p.coins -= amount;
      boardLog(`💰 ${p.name} 缴纳税款 ${amount}金币`);
      toast(`💰 税款 ${amount}金币`);
      renderBoardPlayerBar();
      await boardCheckBankruptcy(playerIdx);
      break;
    }

    case 'jail':
      p.skipped = true;
      boardLog(`⛓️ ${p.name} 需要休息，跳过下一回合`);
      toast(`⛓️ ${p.name} 跳过下一回合`);
      boardNextTurn();
      break;

    case 'free':
      boardLog(`🅿️ ${p.name} 停在免费停车场，无事发生`);
      boardNextTurn();
      break;

    case 'back3': {
      const newP = (p.pos - 3 + 40) % 40;
      p.pos = newP;
      boardLog(`⬅️ ${p.name} 后退3格到 ${BOARD_SPACE_LAYOUT[newP].name}`);
      boardUpdateMapTokens();
      await boardDelay(300);
      await boardTriggerSpace(playerIdx);
      break;
    }

    case 'forward3': {
      const newP = (p.pos + 3) % 40;
      p.pos = newP;
      boardLog(`➡️ ${p.name} 前进3格到 ${BOARD_SPACE_LAYOUT[newP].name}`);
      boardUpdateMapTokens();
      await boardDelay(300);
      await boardTriggerSpace(playerIdx);
      break;
    }

    case 'shop':
      boardShowShop(playerIdx);
      break;

    default:
      boardNextTurn();
  }
}

async function boardApplyCard(playerIdx, card, label) {
  const p = BOARD.players[playerIdx];
  boardLog(`${label}: ${card.text}`);
  toast(card.text);

  switch (card.effect) {
    case 'coins':
      p.coins += card.value;
      renderBoardPlayerBar();
      if (card.value < 0) await boardCheckBankruptcy(playerIdx);
      else boardNextTurn();
      break;
    case 'item':
    case 'get_item': {
      const itemId = card.value === 1 ?
        BOARD_ITEM_CARDS[Math.floor(Math.random() * BOARD_ITEM_CARDS.length)].id :
        card.value;
      p.items.push(itemId);
      const item = BOARD_ITEM_CARDS.find(it => it.id === itemId);
      boardLog(`${p.name} 获得道具：${item?.icon||''} ${item?.name||itemId}`);
      renderBoardPlayerBar();
      boardNextTurn();
      break;
    }
    case 'collect_all': {
      let total = 0;
      BOARD.players.forEach((other, idx) => {
        if (idx !== playerIdx && other.active) {
          const pay = Math.min(card.value, other.coins + 10);
          other.coins -= pay;
          p.coins += pay;
          total += pay;
        }
      });
      boardLog(`${p.name} 向所有玩家收取各 ${card.value}金币，共 ${total}金币`);
      renderBoardPlayerBar();
      boardNextTurn();
      break;
    }
    case 'pay_leader': {
      // pay richest player
      const richest = BOARD.players.reduce((best, pl, idx) => {
        if (idx === playerIdx || !pl.active) return best;
        return (!best || pl.coins > BOARD.players[best].coins) ? idx : best;
      }, -1);
      if (richest >= 0) {
        const pay = Math.min(card.value, p.coins + 10);
        p.coins -= pay;
        BOARD.players[richest].coins += pay;
        boardLog(`${p.name} 向 ${BOARD.players[richest].name} 支付 ${pay}金币`);
      }
      renderBoardPlayerBar();
      if (p.coins < 0) await boardCheckBankruptcy(playerIdx);
      else boardNextTurn();
      break;
    }
    case 'percent_tax': {
      const tax = Math.floor(p.coins * card.value);
      p.coins -= tax;
      boardLog(`${p.name} 缴纳 ${tax}金币（10%税）`);
      renderBoardPlayerBar();
      if (p.coins < 0) await boardCheckBankruptcy(playerIdx);
      else boardNextTurn();
      break;
    }
    case 'move':
      await boardMovePlayer(playerIdx, card.value);
      break;
    case 'move_to': {
      // move to next shop
      let nextPos = (p.pos + 1) % 40;
      for (let i = 0; i < 40; i++) {
        if (BOARD_SPACE_LAYOUT[nextPos].type === card.value) break;
        nextPos = (nextPos + 1) % 40;
      }
      const steps = (nextPos - p.pos + 40) % 40;
      await boardMovePlayer(playerIdx, steps || 40);
      break;
    }
    case 'extra_roll':
      boardLog(`🎲 ${p.name} 获得额外掷骰机会！`);
      boardEnableDice(true);
      BOARD.rolling = false;
      break;
    default:
      boardNextTurn();
  }
}

// ── Buy Overlay ──
function boardShowBuyOverlay(playerIdx, prop) {
  const p = BOARD.players[playerIdx];
  const nameEl = $i('board-buy-name');
  const infoEl = $i('board-buy-info');
  if (nameEl) nameEl.textContent = `${p.emoji} ${p.name} 停在 ${prop.name}`;
  if (infoEl) infoEl.innerHTML = `💰 购买价格：<strong>${prop.price}</strong> 金币<br>🏠 基础租金：${prop.rent[0]} 金币<br>💎 当前余额：${p.coins} 金币`;
  BOARD._pendingAction = { type: 'buy', playerIdx, propId: prop.id };
  const ov = $i('board-buy-overlay');
  if (ov) ov.style.display = 'flex';
}

function boardConfirmBuy() {
  const ov = $i('board-buy-overlay');
  if (ov) ov.style.display = 'none';
  const action = BOARD._pendingAction;
  if (!action || action.type !== 'buy') return;
  const p = BOARD.players[action.playerIdx];
  const prop = BOARD_PROPERTIES.find(pr => pr.id === action.propId);
  if (!prop || p.coins < prop.price) { toast('金币不足！'); boardNextTurn(); return; }
  p.coins -= prop.price;
  BOARD.ownership[prop.id] = action.playerIdx;
  BOARD.houses[prop.id] = 0;
  boardLog(`🏡 ${p.name} 购买了 ${prop.name}（-${prop.price}金币）`);
  toast(`🏡 ${p.name} 购买 ${prop.name} 成功！`);
  renderBoardPlayerBar();
  renderBoardMap();
  boardNextTurn();
}

function boardDeclineBuy() {
  const ov = $i('board-buy-overlay');
  if (ov) ov.style.display = 'none';
  boardLog(`${BOARD.players[BOARD.currentPlayer]?.name} 放弃购买`);
  boardNextTurn();
}

// ── Shop ──
function boardShowShop(playerIdx) {
  const p = BOARD.players[playerIdx];
  const listEl = $i('board-shop-list');
  if (!listEl) { boardNextTurn(); return; }
  listEl.innerHTML = '';
  BOARD_ITEM_CARDS.forEach(item => {
    const btn = document.createElement('button');
    btn.className = 'board-shop-item';
    btn.disabled = p.coins < 50;
    btn.innerHTML = `<span class="board-shop-icon">${item.icon}</span>
      <div class="board-shop-info">
        <div class="board-shop-name">${item.name}</div>
        <div class="board-shop-desc">${item.desc}</div>
      </div>
      <span class="board-shop-price">50金币</span>`;
    btn.onclick = () => {
      if (p.coins < 50) { toast('金币不足！'); return; }
      p.coins -= 50;
      p.items.push(item.id);
      boardLog(`🛒 ${p.name} 购买了 ${item.icon} ${item.name}`);
      toast(`🛒 购买 ${item.name} 成功！`);
      renderBoardPlayerBar();
      BOARD._pendingAction = null;
      const ov = $i('board-item-overlay');
      if (ov) ov.style.display = 'none';
      boardNextTurn();
    };
    listEl.appendChild(btn);
  });
  BOARD._pendingAction = { type: 'shop' };
  const ov = $i('board-item-overlay');
  if (ov) ov.style.display = 'flex';
}

function boardCloseShop() {
  const ov = $i('board-item-overlay');
  if (ov) ov.style.display = 'none';
  const wasShop = BOARD._pendingAction?.type === 'shop';
  BOARD._pendingAction = null;
  if (wasShop) boardNextTurn();
}

// ── Use Item ──
function boardUseItem() {
  const p = BOARD.players[BOARD.currentPlayer];
  if (!p || BOARD.over) return;
  if (p.items.length === 0) { toast('你没有道具卡！'); return; }
  const listEl = $i('board-use-item-list');
  if (!listEl) return;
  listEl.innerHTML = '';
  p.items.forEach((itemId, idx) => {
    const item = BOARD_ITEM_CARDS.find(it => it.id === itemId);
    if (!item) return;
    const btn = document.createElement('button');
    btn.className = 'board-shop-item';
    btn.innerHTML = `<span class="board-shop-icon">${item.icon}</span>
      <div class="board-shop-info">
        <div class="board-shop-name">${item.name}</div>
        <div class="board-shop-desc">${item.desc}</div>
      </div>`;
    btn.onclick = () => {
      boardCloseUseItem();
      boardActivateItem(BOARD.currentPlayer, itemId, idx);
    };
    listEl.appendChild(btn);
  });
  const ov = $i('board-use-item-overlay');
  if (ov) ov.style.display = 'flex';
}

function boardCloseUseItem() {
  const ov = $i('board-use-item-overlay');
  if (ov) ov.style.display = 'none';
}

function boardActivateItem(playerIdx, itemId, itemIdx) {
  const p = BOARD.players[playerIdx];
  p.items.splice(itemIdx, 1);
  const item = BOARD_ITEM_CARDS.find(it => it.id === itemId);
  boardLog(`${p.emoji} ${p.name} 使用了 ${item?.icon||''} ${item?.name||itemId}`);

  switch (itemId) {
    case 'bomb': {
      // find next active opponent
      const opponents = BOARD.players.map((pl, idx) => ({pl, idx})).filter(({pl, idx}) => idx !== playerIdx && pl.active);
      if (opponents.length === 0) { toast('没有对手！'); return; }
      // pick random opponent
      const target = opponents[Math.floor(Math.random() * opponents.length)];
      target.pl.pos = Math.max(0, (target.pl.pos - 5 + 40) % 40);
      boardLog(`💣 炸弹！${target.pl.name} 后退5格`);
      toast(`💣 ${target.pl.name} 被炸弹击中，后退5格！`);
      boardUpdateMapTokens();
      break;
    }
    case 'teleport': {
      const ownedProps = Object.entries(BOARD.ownership).filter(([propId, ownerIdx]) => ownerIdx === playerIdx);
      if (ownedProps.length === 0) { toast('你没有地产！'); p.items.splice(0, 0, itemId); return; }
      const propId = parseInt(ownedProps[Math.floor(Math.random() * ownedProps.length)][0]);
      const spaceIdx = BOARD_SPACE_LAYOUT.findIndex(sp => sp.propId === propId);
      if (spaceIdx >= 0) {
        p.pos = spaceIdx;
        boardLog(`🔮 ${p.name} 传送到 ${BOARD_SPACE_LAYOUT[spaceIdx].name}`);
        toast(`🔮 传送到 ${BOARD_SPACE_LAYOUT[spaceIdx].name}！`);
        boardUpdateMapTokens();
      }
      break;
    }
    case 'build': {
      const ownedProps = Object.entries(BOARD.ownership).filter(([propId, ownerIdx]) => ownerIdx === playerIdx);
      if (ownedProps.length === 0) { toast('你没有地产！'); return; }
      const propId = parseInt(ownedProps[0][0]);
      BOARD.houses[propId] = Math.min(4, (BOARD.houses[propId] || 0) + 1);
      const prop = BOARD_PROPERTIES.find(pr => pr.id === propId);
      boardLog(`🏗️ ${p.name} 在 ${prop?.name||''} 建造了一栋房子`);
      toast(`🏗️ 建造成功！`);
      renderBoardMap();
      break;
    }
    case 'freeze': {
      const opponents2 = BOARD.players.map((pl, idx) => ({pl, idx})).filter(({pl, idx}) => idx !== playerIdx && pl.active);
      if (opponents2.length === 0) { toast('没有对手！'); return; }
      const target2 = opponents2[Math.floor(Math.random() * opponents2.length)];
      target2.pl.skipped = true;
      boardLog(`❄️ ${target2.pl.name} 被冻结，跳过下一回合`);
      toast(`❄️ ${target2.pl.name} 被冻结！`);
      break;
    }
    case 'lucky':
    case 'pass':
      // These are used automatically during gameplay
      p.items.push(itemId); // put it back
      toast(`${item?.name} 会在适当时机自动生效！`);
      break;
    default:
      break;
  }
  renderBoardPlayerBar();
}

// ── Event Overlay (couple/truth/warmup) ──
function boardShowEventOverlay(title, player, text, type, playerIdx) {
  return new Promise(resolve => {
    const ov = $i('board-action-overlay');
    const typeEl = $i('board-event-type');
    const playerEl = $i('board-event-player');
    const textEl = $i('board-event-text');
    const aiEl = $i('board-ai-response');

    if (typeEl) typeEl.textContent = title;
    if (playerEl) playerEl.textContent = player;
    if (textEl) textEl.textContent = text;
    if (aiEl) { aiEl.innerHTML = ''; aiEl.style.display = 'none'; }
    if (ov) ov.style.display = 'flex';

    BOARD._pendingAction = { type: 'event', resolve };

    // Call AI if configured
    if (BOARD.contactId !== 'none') {
      boardCallAIForEvent(type, text, playerIdx).then(aiText => {
        if (aiText && aiEl) {
          aiEl.innerHTML = `<div class="fly-ai-response-label">🤖 AI回应：</div><div>${esc(aiText)}</div>`;
          aiEl.style.display = 'block';
        }
      });
    }
  });
}

function boardEventDone() {
  const ov = $i('board-action-overlay');
  if (ov) ov.style.display = 'none';
  const action = BOARD._pendingAction;
  BOARD._pendingAction = null;
  if (action?.resolve) action.resolve();
  boardNextTurn();
}

async function boardCallAIForEvent(type, taskText, playerIdx) {
  const contact = BOARD.contactId !== 'none' ? S._contacts[BOARD.contactId] : null;
  const apiKey = contact?.apiKey || S.settings.apiKey;
  if (!apiKey) return null;

  const p = BOARD.players[playerIdx];
  const gameContext = `当前游戏状态：${BOARD.players.map(pl => `${pl.name}(${pl.coins}金币,${Object.values(BOARD.ownership).filter(o=>o===BOARD.players.indexOf(pl)).length}处地产)`).join('，')}。第${BOARD.round}回合。`;
  const typeLabel = { couple_challenge:'情侣挑战', truth_dare:'真心话大冒险', warmup:'情侣升温' }[type] || '游戏事件';
  const systemPrompt = contact?.system
    ? `${contact.system}\n你现在在陪伴玩家进行"幸运大冒险"桌游。请用角色口吻对当前的${typeLabel}任务发表评论，风格温柔有趣，不超过60字。`
    : `你是游戏主持人，正在主持"幸运大冒险"桌游。请对当前${typeLabel}任务发表简短有趣的评论，不超过60字。`;
  const userMsg = `${gameContext}\n${p.name}触发了${typeLabel}：${taskText}`;

  try {
    const history = BOARD._history.slice(-18);
    const res = await fetch(contact?.apiUrl || 'https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'HTTP-Referer': 'https://raimos.app', 'X-Title': 'Raimos' },
      body: JSON.stringify({ model: contact?.model || S.settings.model || 'openai/gpt-4o-mini', max_tokens: 100, stream: false, messages: [{ role: 'system', content: systemPrompt }, ...history, { role: 'user', content: userMsg }] })
    });
    const data = await res.json();
    const txt = data.choices?.[0]?.message?.content?.trim() || '';
    if (txt) {
      BOARD._history.push({ role: 'user', content: userMsg });
      BOARD._history.push({ role: 'assistant', content: txt });
      if (BOARD._history.length > 20) BOARD._history = BOARD._history.slice(-20);
      // Show token badge
      if (BOARD.showToken && data.usage) {
        const aiEl = $i('board-ai-response');
        if (aiEl) {
          const badge = document.createElement('div');
          badge.style.cssText = 'font-size:10px;color:var(--text3);margin-top:4px;text-align:right';
          badge.textContent = `⚡ ${data.usage.total_tokens || 0} tokens`;
          aiEl.appendChild(badge);
        }
      }
    }
    return txt;
  } catch (e) { return null; }
}

// ── Bankruptcy ──
async function boardCheckBankruptcy(playerIdx) {
  const p = BOARD.players[playerIdx];
  if (p.coins < 0) {
    p.active = false;
    boardLog(`💔 ${p.name} 破产出局！（${p.coins}金币）`);
    toast(`💔 ${p.name} 破产淘汰！`);
    // Remove their properties
    Object.keys(BOARD.ownership).forEach(propId => {
      if (BOARD.ownership[propId] === playerIdx) delete BOARD.ownership[propId];
    });
    renderBoardPlayerBar();
    renderBoardMap();
    const activePlayers = BOARD.players.filter(pl => pl.active);
    if (activePlayers.length <= 1) {
      BOARD.over = true;
      setTimeout(boardShowResult, 800);
      return;
    }
  }
  boardNextTurn();
}

// ── Turn Management ──
function boardNextTurn() {
  if (BOARD.over) return;

  // Check if all 40 turns passed (1 round = all players move once)
  let next = (BOARD.currentPlayer + 1) % BOARD.playerCount;
  let loops = 0;
  while (!BOARD.players[next]?.active && loops < BOARD.playerCount) {
    next = (next + 1) % BOARD.playerCount;
    loops++;
  }

  // If we've gone past all players, increment round
  if (next <= BOARD.currentPlayer || BOARD.players.filter(p => p.active).length < 2) {
    BOARD.round++;
    if (BOARD.round > BOARD.maxRounds) {
      BOARD.over = true;
      setTimeout(boardShowResult, 500);
      return;
    }
    boardLog(`━━ 第 ${BOARD.round} 回合开始 ━━`);
  }

  BOARD.currentPlayer = next;
  const p = BOARD.players[next];

  // Handle frozen/skipped
  if (p && p.skipped) {
    p.skipped = false;
    boardLog(`💤 ${p.name} 跳过本回合`);
    toast(`💤 ${p.name} 跳过本回合`);
    setTimeout(boardNextTurn, 800);
    return;
  }

  renderBoardPlayerBar();
  boardUpdateTurnInfo();
  boardEnableDice(true);
}

// ── Result ──
function boardShowResult() {
  BOARD.over = true;
  boardEnableDice(false);

  const rankEl = $i('board-result-rankings');
  if (!rankEl) return;

  // Calculate total wealth (coins + property values)
  const ranked = BOARD.players.map((p, idx) => {
    const propValue = Object.entries(BOARD.ownership)
      .filter(([, ownerIdx]) => ownerIdx === idx)
      .reduce((sum, [propId]) => {
        const prop = BOARD_PROPERTIES.find(pr => pr.id === parseInt(propId));
        return sum + (prop?.price || 0);
      }, 0);
    return { ...p, propValue, totalWealth: p.coins + propValue };
  }).sort((a, b) => {
    if (!a.active && b.active) return 1;
    if (a.active && !b.active) return -1;
    return b.totalWealth - a.totalWealth;
  });

  const medals = ['🥇', '🥈', '🥉', '4️⃣'];
  rankEl.innerHTML = ranked.map((p, i) => `
    <div style="display:flex;align-items:center;gap:10px;padding:8px;border-radius:10px;background:${i===0?'rgba(255,215,0,0.15)':'var(--hover)'};margin-bottom:6px">
      <span style="font-size:20px">${medals[i]||''}</span>
      <span style="font-size:18px">${p.emoji}</span>
      <div style="flex:1">
        <div style="font-weight:700">${esc(p.name)}</div>
        <div style="font-size:12px;color:var(--text3)">💰${p.coins} + 🏡${p.propValue} = ${p.totalWealth}</div>
      </div>
      ${!p.active ? '<span style="font-size:11px;color:#e74c3c">破产</span>' : ''}
    </div>`).join('');

  const ov = $i('board-result-overlay');
  if (ov) ov.style.display = 'flex';
}

function confirmBoardQuit() {
  if (BOARD.over) { switchPage('game-hub-page'); return; }
  if (confirm('确定要退出游戏吗？')) switchPage('game-hub-page');
}

// ══════════════════════════════════════════
// 🎓 博学知识家 (Scholar Quiz Game)
// ══════════════════════════════════════════

const QUIZ_PRESET_CATEGORIES = [
  { name:'水果', icon:'🍎', words:['苹果','香蕉','橙子','草莓','西瓜','葡萄','芒果','菠萝','桃子','梨','樱桃','柠檬','蓝莓','火龙果','荔枝','龙眼','榴莲','木瓜','枇杷','山楂','柿子','椰子','无花果','猕猴桃','番石榴'] },
  { name:'动物', icon:'🐾', words:['狗','猫','狮子','老虎','大象','熊猫','猴子','兔子','马','牛','羊','猪','鸡','鸭','鱼','蛇','青蛙','乌龟','鳄鱼','老鹰','企鹅','海豚','鲸鱼','熊','狐狸','狼','鹿','长颈鹿','斑马','北极熊'] },
  { name:'国家首都', icon:'🌍', words:['北京','东京','巴黎','伦敦','柏林','华盛顿','莫斯科','渥太华','堪培拉','首尔','曼谷','新德里','雅加达','马尼拉','河内','吉隆坡','新加坡','开罗','内罗毕','利马','布宜诺斯艾利斯','巴西利亚','墨西哥城','渥太华','惠灵顿'] },
  { name:'歌手', icon:'🎵', words:['周杰伦','邓紫棋','林俊杰','薛之谦','华晨宇','王力宏','周笔畅','张杰','汪峰','鹿晗','蔡依林','张韶涵','孙燕姿','梁静茹','陈奕迅','刘若英','五月天','苏打绿','Beyond','周华健'] },
  { name:'电影', icon:'🎬', words:['哪吒','流浪地球','战狼','你好李焕英','唐人街探案','长津湖','满江红','消失的她','封神','奥本海默','芭比','蜘蛛侠','复仇者联盟','阿凡达','狮子王','冰雪奇缘','疯狂原始人','美丽心灵','泰坦尼克号','肖申克的救赎'] },
  { name:'食物', icon:'🍜', words:['米饭','面条','饺子','包子','馒头','炒饭','火锅','披萨','汉堡','寿司','拉面','烤鸭','红烧肉','麻婆豆腐','宫保鸡丁','鱼香肉丝','回锅肉','糖醋里脊','清蒸鱼','蛋炒饭','螺蛳粉','臭豆腐','章鱼小丸子','煎饼果子'] },
  { name:'品牌', icon:'👟', words:['耐克','阿迪达斯','苹果','华为','小米','特斯拉','奔驰','宝马','奥迪','可口可乐','百事','麦当劳','肯德基','海底捞','联合利华','宝洁','路易威登','古驰','香奈儿','爱马仕','星巴克','优衣库','H&M','ZARA'] },
  { name:'颜色', icon:'🎨', words:['红色','橙色','黄色','绿色','蓝色','紫色','粉色','白色','黑色','灰色','棕色','金色','银色','青色','靛色','玫红','天蓝','草绿','深红','米白','象牙白','橄榄绿','宝蓝','紫罗兰','珊瑚红'] },
  { name:'职业', icon:'👩‍⚕️', words:['医生','护士','教师','律师','工程师','程序员','设计师','厨师','警察','消防员','记者','会计','建筑师','飞行员','翻译','心理咨询师','科学家','艺术家','运动员','企业家','销售员','快递员','外卖员','农民','渔民'] },
  { name:'运动', icon:'⚽', words:['足球','篮球','排球','乒乓球','羽毛球','网球','游泳','跑步','跳绳','体操','瑜伽','拳击','自行车','滑雪','攀岩','射箭','马术','冲浪','滑板','击剑','摔跤','柔道','跆拳道','高尔夫','棒球'] },
];

const QUIZ_PUNISHMENT_LIST = [
  '说出你最尴尬的一次经历',
  '模仿一个动物叫声10秒',
  '说出你对身边人最想说却不敢说的话',
  '做5个深蹲',
  '用唱歌的方式说出你的名字',
  '分享一个你从未告诉别人的秘密',
  '说出你最大的弱点',
  '连续说10个以"爱"开头的句子',
  '闭眼用手指指向你认为最帅/漂亮的人',
  '表演一段舞蹈10秒',
  '用颤抖的声音说一段心动告白',
  '说出你觉得最难启齿的一件事',
  '向旁边的人真诚地说一句赞美',
  '做鬼脸坚持30秒不能笑',
  '用婴儿语气说话1分钟',
  '用最搞笑的声音背一首古诗',
  '把你的手机壁纸展示给所有人看',
  '说出你今天做的最蠢的一件事',
  '用夸张的动作表演"我很帅/漂亮"',
  '向最近的人行一个搞笑的特殊礼',
];

const QUIZ = {
  playerCount: 1,
  players: [],
  contactId: 'none',
  showToken: false,
  category: '',
  wordList: [],
  usedAnswers: [],
  currentPlayer: 0,
  timer: null,
  timerSeconds: 10,
  over: false,
  _history: [],
  selectedPreset: null,
  maxRounds: 20,
  roundCount: 0,
};

// ── Setup ──
function initQuizSetup() {
  QUIZ.playerCount = 1;
  QUIZ.contactId = 'none';
  QUIZ.selectedPreset = null;
  QUIZ.maxRounds = 20;
  renderQuizPlayerInputs();
  buildQuizAiSelector();
  renderQuizPresets();
  const tog = $i('quiz-show-token-toggle');
  if (tog) tog.checked = !!S.settings.showGameToken;
  const ci = $i('quiz-custom-category');
  if (ci) ci.value = '';
  document.querySelectorAll('#quiz-setup-page .fly-count-btn').forEach((btn, i) => {
    btn.classList.toggle('active', i === 0);
  });
  const roundBtns = document.querySelectorAll('#quiz-rounds-row .fly-count-btn');
  roundBtns.forEach((btn, i) => btn.classList.toggle('active', i === 0));
}

function setQuizMaxRounds(n, el) {
  QUIZ.maxRounds = n;
  document.querySelectorAll('#quiz-rounds-row .fly-count-btn').forEach(b => b.classList.remove('active'));
  if (el) el.classList.add('active');
}

function setQuizPlayerCount(n, el) {
  QUIZ.playerCount = n;
  document.querySelectorAll('#quiz-setup-page .fly-count-btn').forEach(b => b.classList.remove('active'));
  if (el) el.classList.add('active');
  renderQuizPlayerInputs();
}

function renderQuizPlayerInputs() {
  const container = $i('quiz-setup-players');
  if (!container) return;
  container.innerHTML = '';
  for (let i = 0; i < QUIZ.playerCount; i++) {
    const row = document.createElement('div');
    row.className = 'fly-player-input-row';
    row.innerHTML = `<span class="fly-player-emoji">${BOARD_PLAYER_EMOJIS[i]}</span>
      <span class="fly-player-color-dot" style="background:${BOARD_PLAYER_COLORS[i]}"></span>
      <input class="fly-player-input" id="quiz-player-name-${i}" type="text" placeholder="${i===0?'你的名字':'AI玩家'+(i)}" value="${i===0?'玩家1':'AI玩家'+i}" maxlength="8">`;
    container.appendChild(row);
  }
}

function buildQuizAiSelector() {
  const el = $i('quiz-ai-selector');
  if (!el) return;
  el.innerHTML = '';
  const contacts = Object.values(S._contacts || {});
  const noBtn = document.createElement('button');
  noBtn.className = 'gmk-ai-btn' + (QUIZ.contactId === 'none' ? ' active' : '');
  noBtn.textContent = '🚫 无助手（系统出题）';
  noBtn.onclick = () => { QUIZ.contactId = 'none'; buildQuizAiSelector(); };
  el.appendChild(noBtn);
  contacts.forEach(c => {
    const btn = document.createElement('button');
    btn.className = 'gmk-ai-btn' + (QUIZ.contactId === c.id ? ' active' : '');
    btn.textContent = (c.avatar || '🤖') + ' ' + c.name;
    btn.onclick = () => { QUIZ.contactId = c.id; buildQuizAiSelector(); };
    el.appendChild(btn);
  });
}

function renderQuizPresets() {
  const container = $i('quiz-presets');
  if (!container) return;
  container.innerHTML = '';
  QUIZ_PRESET_CATEGORIES.forEach((cat, i) => {
    const btn = document.createElement('button');
    btn.className = 'quiz-preset-btn' + (QUIZ.selectedPreset === i ? ' active' : '');
    btn.textContent = cat.icon + ' ' + cat.name;
    btn.onclick = () => {
      QUIZ.selectedPreset = i;
      const ci = $i('quiz-custom-category');
      if (ci) ci.value = '';
      renderQuizPresets();
    };
    container.appendChild(btn);
  });
}

function startQuizGame() {
  // Determine category
  const customCat = $i('quiz-custom-category')?.value.trim();
  if (customCat) {
    QUIZ.category = customCat;
    QUIZ.wordList = [];
    QUIZ.selectedPreset = null;
  } else if (QUIZ.selectedPreset !== null) {
    const preset = QUIZ_PRESET_CATEGORIES[QUIZ.selectedPreset];
    QUIZ.category = preset.name;
    QUIZ.wordList = [...preset.words];
  } else {
    toast('请选择或输入一个主题！');
    return;
  }

  const players = [];
  for (let i = 0; i < QUIZ.playerCount; i++) {
    const nameEl = $i(`quiz-player-name-${i}`);
    players.push({
      name: nameEl?.value.trim() || (i === 0 ? '玩家1' : `AI玩家${i}`),
      emoji: BOARD_PLAYER_EMOJIS[i],
      color: BOARD_PLAYER_COLORS[i],
      lives: 3,
      isHuman: i === 0,
      active: true,
    });
  }

  const tog = $i('quiz-show-token-toggle');
  QUIZ.showToken = tog ? tog.checked : false;
  QUIZ.players = players;
  QUIZ.currentPlayer = 0;
  QUIZ.usedAnswers = [];
  QUIZ.over = false;
  QUIZ._history = [];
  QUIZ.roundCount = 0;
  if (QUIZ.timer) clearInterval(QUIZ.timer);

  switchPage('quiz-game-page');
  renderQuizPlayerBar();
  quizUpdateCategoryDisplay();
  quizStartTurn();

  // Enter key support
  const inp = $i('quiz-answer-input');
  if (inp) {
    inp.onkeydown = e => { if (e.key === 'Enter') quizSubmitAnswer(); };
  }
}

function quizUpdateCategoryDisplay() {
  const lbl = $i('quiz-category-label');
  if (lbl) lbl.textContent = QUIZ.category;
  const counter = $i('quiz-round-counter');
  if (counter) counter.textContent = `${QUIZ.roundCount} / ${QUIZ.maxRounds} 轮`;
}

// ── Player Bar ──
function renderQuizPlayerBar() {
  const bar = $i('quiz-player-bar');
  if (!bar) return;
  bar.innerHTML = '';
  QUIZ.players.forEach((p, idx) => {
    const card = document.createElement('div');
    card.className = 'quiz-player-card' + (idx === QUIZ.currentPlayer && !QUIZ.over ? ' active' : '') + (!p.active ? ' eliminated' : '');
    const hearts = '💗'.repeat(p.lives) + '🖤'.repeat(Math.max(0, 3 - p.lives));
    card.innerHTML = `<div class="quiz-player-emoji">${p.emoji}</div>
      <div class="quiz-player-info">
        <div class="quiz-player-name">${esc(p.name)}</div>
        <div class="quiz-player-lives">${hearts}</div>
      </div>`;
    bar.appendChild(card);
  });
}

function quizUpdateTurnInfo() {
  const el = $i('quiz-turn-info');
  if (!el) return;
  if (QUIZ.over) { el.textContent = '游戏结束！'; return; }
  const p = QUIZ.players[QUIZ.currentPlayer];
  el.innerHTML = `${p.emoji} <strong>${esc(p.name)}</strong> 的回合`;
}

// ── Turn ──
function quizStartTurn() {
  if (QUIZ.over) return;

  // Find next active player
  let attempts = 0;
  while (!QUIZ.players[QUIZ.currentPlayer]?.active && attempts < QUIZ.playerCount) {
    QUIZ.currentPlayer = (QUIZ.currentPlayer + 1) % QUIZ.playerCount;
    attempts++;
  }
  if (attempts >= QUIZ.playerCount) { quizEndGame(); return; }

  const p = QUIZ.players[QUIZ.currentPlayer];
  renderQuizPlayerBar();
  quizUpdateTurnInfo();

  if (p.isHuman) {
    // Show input
    const inputArea = $i('quiz-input-area');
    if (inputArea) inputArea.style.display = 'flex';
    const aiThink = $i('quiz-ai-thinking');
    if (aiThink) aiThink.style.display = 'none';
    const inp = $i('quiz-answer-input');
    if (inp) { inp.value = ''; inp.focus(); }
    quizStartTimer();
  } else {
    // AI player
    const inputArea = $i('quiz-input-area');
    if (inputArea) inputArea.style.display = 'none';
    const aiThink = $i('quiz-ai-thinking');
    if (aiThink) aiThink.style.display = 'block';
    quizStartTimer();
    const thinkTime = 1000 + Math.random() * 2000;
    setTimeout(() => quizAiAnswer(), thinkTime);
  }
}

function quizStartTimer() {
  if (QUIZ.timer) clearInterval(QUIZ.timer);
  QUIZ.timerSeconds = 10;
  quizUpdateTimerDisplay();

  QUIZ.timer = setInterval(() => {
    QUIZ.timerSeconds--;
    quizUpdateTimerDisplay();
    if (QUIZ.timerSeconds <= 0) {
      clearInterval(QUIZ.timer);
      QUIZ.timer = null;
      quizTimeout();
    }
  }, 1000);
}

function quizStopTimer() {
  if (QUIZ.timer) { clearInterval(QUIZ.timer); QUIZ.timer = null; }
  const bar = $i('quiz-timer-bar');
  if (bar) bar.style.width = '100%';
  const txt = $i('quiz-timer-text');
  if (txt) txt.textContent = '10';
}

function quizUpdateTimerDisplay() {
  const bar = $i('quiz-timer-bar');
  const txt = $i('quiz-timer-text');
  const pct = (QUIZ.timerSeconds / 10) * 100;
  if (bar) {
    bar.style.width = pct + '%';
    bar.className = 'quiz-timer-bar' + (QUIZ.timerSeconds <= 3 ? ' danger' : QUIZ.timerSeconds <= 6 ? ' warning' : '');
  }
  if (txt) txt.textContent = QUIZ.timerSeconds;
}

function quizTimeout() {
  const p = QUIZ.players[QUIZ.currentPlayer];
  quizAddToLog(p.name, '(超时)', false);
  quizLoseLife(QUIZ.currentPlayer, '超时');
}

function quizSubmitAnswer() {
  const inp = $i('quiz-answer-input');
  const answer = inp?.value.trim();
  if (!answer) { toast('请输入答案！'); return; }
  quizStopTimer();
  const inputArea = $i('quiz-input-area');
  if (inputArea) inputArea.style.display = 'none';
  quizProcessAnswer(QUIZ.currentPlayer, answer, true);
}

async function quizAiAnswer() {
  if (QUIZ.over) return;
  const p = QUIZ.players[QUIZ.currentPlayer];

  // Try to get AI answer if assistant configured
  let answer = null;
  if (QUIZ.contactId !== 'none') {
    answer = await quizCallAI(p);
  }

  // Fallback to word list
  if (!answer && QUIZ.wordList.length > 0) {
    const available = QUIZ.wordList.filter(w => !QUIZ.usedAnswers.map(a => a.toLowerCase()).includes(w.toLowerCase()));
    if (available.length > 0) {
      answer = available[Math.floor(Math.random() * available.length)];
    }
  }

  const aiThink = $i('quiz-ai-thinking');
  if (aiThink) aiThink.style.display = 'none';

  quizStopTimer();

  if (!answer) {
    quizAddToLog(p.name, '(想不出来了)', false);
    quizLoseLife(QUIZ.currentPlayer, 'AI无法作答');
  } else {
    quizProcessAnswer(QUIZ.currentPlayer, answer, false);
  }
}

async function quizCallAI(player) {
  const contact = QUIZ.contactId !== 'none' ? S._contacts[QUIZ.contactId] : null;
  const apiKey = contact?.apiKey || S.settings.apiKey;
  if (!apiKey) return null;

  // Pool exhaustion: as used answers accumulate, AI has increasing chance to fail
  // After using ~70% of known words, AI starts "blanking" like a real person
  const poolSize = QUIZ.wordList.length > 0 ? QUIZ.wordList.length : 40;
  const exhaustion = QUIZ.usedAnswers.length / poolSize;
  if (exhaustion > 0.5 && Math.random() < Math.min(0.85, (exhaustion - 0.5) * 2.2)) {
    return null; // AI blanks out
  }

  const aiName = contact?.name || 'AI助手';
  const personality = contact?.system || '聪明博学';
  // AI only "remembers" the last 10 answers — simulates natural human memory limits
  // Older answers may be forgotten, causing accidental repeats and fair gameplay
  const recentAnswers = QUIZ.usedAnswers.slice(-10);
  const usedStr = recentAnswers.join('、') + (QUIZ.usedAnswers.length > 10 ? '……（更早的已记不清了）' : '');
  const systemPrompt = `你是${aiName}，正在和玩家玩"博学知识家"游戏。当前主题是"${QUIZ.category}"。你只能记住最近说过的答案，早些时候说过的可能已经忘了。你的答案必须简洁（1-3字为主）。${personality}`;
  const userMsg = QUIZ.usedAnswers.length > 0
    ? `主题：${QUIZ.category}。最近说过的答案：${usedStr}。请说出一个${QUIZ.category}，只需回答答案本身，不需要解释。`
    : `主题：${QUIZ.category}。请说出一个${QUIZ.category}，只需回答答案本身，不需要解释。`;

  try {
    const history = QUIZ._history.slice(-18);
    const res = await fetch(contact?.apiUrl || 'https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'HTTP-Referer': 'https://raimos.app', 'X-Title': 'Raimos' },
      body: JSON.stringify({ model: contact?.model || S.settings.model || 'openai/gpt-4o-mini', max_tokens: 30, stream: false, messages: [{ role: 'system', content: systemPrompt }, ...history, { role: 'user', content: userMsg }] })
    });
    const data = await res.json();
    let txt = data.choices?.[0]?.message?.content?.trim() || '';
    // Extract just the answer (first 1-5 chars if longer)
    txt = txt.replace(/[。，！？,.!?]/g, '').split(/[\s\n]/)[0].substring(0, 10);

    if (txt) {
      QUIZ._history.push({ role: 'user', content: userMsg });
      QUIZ._history.push({ role: 'assistant', content: txt });
      if (QUIZ._history.length > 20) QUIZ._history = QUIZ._history.slice(-20);

      if (QUIZ.showToken && data.usage) {
        const log = $i('quiz-answer-log');
        if (log) {
          const badge = document.createElement('div');
          badge.style.cssText = 'font-size:10px;color:var(--text3);text-align:right;padding:2px 4px';
          badge.textContent = `⚡ ${data.usage.total_tokens || 0} tokens`;
          log.prepend(badge);
        }
      }
    }
    return txt || null;
  } catch (e) { return null; }
}

function quizProcessAnswer(playerIdx, answer, isHuman) {
  const p = QUIZ.players[playerIdx];
  // Check duplicate
  const isDuplicate = QUIZ.usedAnswers.some(a => a.toLowerCase() === answer.toLowerCase());
  if (isDuplicate) {
    quizAddToLog(p.name, answer, false, '重复！');
    quizLoseLife(playerIdx, '重复答案');
    return;
  }

  // Valid answer
  QUIZ.usedAnswers.push(answer);
  QUIZ.roundCount++;
  quizUpdateCategoryDisplay();

  // Add to AI history
  if (isHuman) {
    QUIZ._history.push({ role: 'user', content: answer });
  }

  quizAddToLog(p.name, answer, true);

  // Check if max rounds reached
  if (QUIZ.roundCount >= QUIZ.maxRounds) {
    setTimeout(quizEndByRounds, 600);
    return;
  }

  setTimeout(() => quizNextTurn(), 600);
}

function quizEndByRounds() {
  QUIZ.over = true;
  quizStopTimer();
  const inputArea = $i('quiz-input-area');
  if (inputArea) inputArea.style.display = 'none';
  const aiThink = $i('quiz-ai-thinking');
  if (aiThink) aiThink.style.display = 'none';

  // Sort by lives descending
  const ranked = [...QUIZ.players].sort((a, b) => b.lives - a.lives);
  const winner = ranked[0];
  const loser = ranked[ranked.length - 1];

  const resultEl = $i('quiz-result-content');
  if (resultEl) {
    let html = `<div style="font-size:14px;margin-bottom:8px">🏁 已完成 ${QUIZ.maxRounds} 轮！</div>`;
    ranked.forEach((p, i) => {
      const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i+1}.`;
      html += `<div style="margin:4px 0">${medal} ${p.emoji} ${esc(p.name)} — ${'💗'.repeat(p.lives)}${'🖤'.repeat(Math.max(0,3-p.lives))}</div>`;
    });
    resultEl.innerHTML = html;
  }

  // Show punishment for loser (if more than 1 player)
  if (QUIZ.players.length > 1) {
    const punishArea = $i('quiz-punishment-area');
    const punishText = $i('quiz-punishment-text');
    if (punishArea && punishText) {
      const punishment = QUIZ_PUNISHMENT_LIST[Math.floor(Math.random() * QUIZ_PUNISHMENT_LIST.length)];
      punishText.textContent = `${loser.emoji} ${loser.name}：${punishment}`;
      punishArea.style.display = 'block';
    }
  }

  const overlay = $i('quiz-result-overlay');
  if (overlay) overlay.style.display = 'flex';
}

function quizAddToLog(playerName, answer, correct, note = '') {
  const logEl = $i('quiz-answer-log');
  if (!logEl) return;
  const p = QUIZ.players.find(pl => pl.name === playerName);
  const entry = document.createElement('div');
  entry.className = 'quiz-answer-entry' + (correct ? '' : ' wrong');
  entry.innerHTML = `<span class="quiz-answer-player">${p?.emoji || ''} ${esc(playerName)}</span>
    <span class="quiz-answer-word${correct ? '' : ' wrong'}">${esc(answer)}</span>
    ${note ? `<span class="quiz-answer-note">${esc(note)}</span>` : ''}`;
  logEl.prepend(entry);
}

function quizLoseLife(playerIdx, reason) {
  const p = QUIZ.players[playerIdx];
  p.lives--;
  toast(`💔 ${p.name} 失去一条命！（${reason}）`);
  renderQuizPlayerBar();

  if (p.lives <= 0) {
    p.active = false;
    toast(`☠️ ${p.name} 被淘汰！`);
    const activePlayers = QUIZ.players.filter(pl => pl.active);
    if (activePlayers.length <= 1) {
      setTimeout(quizEndGame, 800);
      return;
    }
  }
  setTimeout(quizNextTurn, 800);
}

function quizNextTurn() {
  if (QUIZ.over) return;
  let next = (QUIZ.currentPlayer + 1) % QUIZ.playerCount;
  let attempts = 0;
  while (!QUIZ.players[next]?.active && attempts < QUIZ.playerCount) {
    next = (next + 1) % QUIZ.playerCount;
    attempts++;
  }
  if (attempts >= QUIZ.playerCount) { quizEndGame(); return; }
  QUIZ.currentPlayer = next;
  quizStartTurn();
}

function quizEndGame() {
  QUIZ.over = true;
  quizStopTimer();
  const inputArea = $i('quiz-input-area');
  if (inputArea) inputArea.style.display = 'none';
  const aiThink = $i('quiz-ai-thinking');
  if (aiThink) aiThink.style.display = 'none';

  const resultEl = $i('quiz-result-content');
  const punishArea = $i('quiz-punishment-area');
  const punishText = $i('quiz-punishment-text');

  const activePlayers = QUIZ.players.filter(pl => pl.active);
  const winner = activePlayers[0];
  const losers = QUIZ.players.filter(pl => !pl.active);

  if (resultEl) {
    let html = winner
      ? `<div style="font-size:24px;text-align:center;margin-bottom:8px">${winner.emoji}</div>
         <div style="text-align:center;font-weight:700;font-size:16px">🏆 ${esc(winner.name)} 获胜！</div>
         <div style="text-align:center;color:var(--text3);font-size:13px;margin-top:4px">共答出 ${QUIZ.usedAnswers.length} 个${QUIZ.category}</div>`
      : '<div style="text-align:center">平局！</div>';
    html += `<div style="margin-top:12px;font-size:13px;color:var(--text2)">所有答案：${QUIZ.usedAnswers.join('、') || '无'}</div>`;
    resultEl.innerHTML = html;
  }

  // Show punishment for losers
  if (losers.length > 0 && punishArea && punishText) {
    const loser = losers[losers.length - 1];
    const punishment = QUIZ_PUNISHMENT_LIST[Math.floor(Math.random() * QUIZ_PUNISHMENT_LIST.length)];
    punishText.textContent = `${loser.emoji} ${loser.name}：${punishment}`;
    punishArea.style.display = 'block';

    // AI generates punishment if assistant configured
    if (QUIZ.contactId !== 'none') {
      quizAiPunishment(loser, punishment);
    }
  } else if (punishArea) {
    punishArea.style.display = 'none';
  }

  const ov = $i('quiz-result-overlay');
  if (ov) ov.style.display = 'flex';
}

async function quizAiPunishment(loser, punishment) {
  const contact = QUIZ.contactId !== 'none' ? S._contacts[QUIZ.contactId] : null;
  const apiKey = contact?.apiKey || S.settings.apiKey;
  if (!apiKey) return;

  const aiEl = $i('quiz-punishment-ai');
  if (!aiEl) return;

  const systemPrompt = contact?.system
    ? `${contact.system}\n你在帮助主持"博学知识家"游戏，一个玩家输了，需要接受惩罚。请用有趣活泼的语气给予鼓励和调侃，不超过50字。`
    : `你是游戏主持人，请用幽默语气评论失败玩家的惩罚，不超过50字。`;
  const userMsg = `${loser.name}在"${QUIZ.category}"主题中落败，惩罚是："${punishment}"。请评论。`;

  try {
    const res = await fetch(contact?.apiUrl || 'https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'HTTP-Referer': 'https://raimos.app', 'X-Title': 'Raimos' },
      body: JSON.stringify({ model: contact?.model || S.settings.model || 'openai/gpt-4o-mini', max_tokens: 80, stream: false, messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userMsg }] })
    });
    const data = await res.json();
    const txt = data.choices?.[0]?.message?.content?.trim() || '';
    if (txt) {
      aiEl.innerHTML = `<div class="fly-ai-response-label">🤖 AI点评：</div><div>${esc(txt)}</div>`;
      aiEl.style.display = 'block';
      if (QUIZ.showToken && data.usage) {
        const badge = document.createElement('div');
        badge.style.cssText = 'font-size:10px;color:var(--text3);margin-top:4px;text-align:right';
        badge.textContent = `⚡ ${data.usage.total_tokens || 0} tokens`;
        aiEl.appendChild(badge);
      }
    }
  } catch (e) {}
}

function confirmQuizQuit() {
  if (QUIZ.over) { switchPage('game-hub-page'); return; }
  quizStopTimer();
  if (confirm('确定要退出游戏吗？')) switchPage('game-hub-page');
}
