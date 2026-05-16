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
  contactId: null,   // currently selected AI contact id
  prefs: { boardColor:'wood', pieceStyle:'classic', commentary:true },
};

// ── Prefs load/save ──
async function loadGomokuPrefs() {
  const saved = await getSetting('gomokuPrefs');
  if (saved) Object.assign(GOMOKU.prefs, saved);
  // Apply UI state
  const ct = $i('gmk-commentary-toggle');
  if (ct) ct.checked = GOMOKU.prefs.commentary;
  // board color swatch
  document.querySelectorAll('.gmk-color-swatch').forEach(el => {
    el.classList.toggle('active', el.dataset.color === GOMOKU.prefs.boardColor);
  });
  // piece btn
  document.querySelectorAll('.gmk-piece-btn').forEach(el => {
    el.classList.toggle('active', el.dataset.style === GOMOKU.prefs.pieceStyle);
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
  // Update indicator circles in info bar
  gmkUpdatePlayerIndicators();
  saveGomokuPrefs();
}
function toggleGomokuCommentary(val) {
  GOMOKU.prefs.commentary = val;
  saveGomokuPrefs();
}

function gmkUpdatePlayerIndicators() {
  const ps = GOMOKU.prefs.pieceStyle;
  const pInfo = PIECE_STYLES[ps] || PIECE_STYLES.classic;
  const pEl = $i('gmk-player-piece'), aEl = $i('gmk-ai-piece');
  if (pInfo.p) {
    if (pEl) { pEl.className='gmk-stone-indicator'; pEl.textContent=pInfo.p; pEl.style.fontSize='18px'; pEl.style.background='none'; pEl.style.boxShadow='none'; }
    if (aEl) { aEl.className='gmk-stone-indicator'; aEl.textContent=pInfo.ai; aEl.style.fontSize='18px'; aEl.style.background='none'; aEl.style.boxShadow='none'; }
  } else {
    if (pEl) { pEl.className='gmk-stone-indicator black'; pEl.textContent=''; pEl.style=''; }
    if (aEl) { aEl.className='gmk-stone-indicator white'; aEl.textContent=''; aEl.style=''; }
  }
}

// ── AI Selector ──
function renderGomokuAiSelector() {
  const el = $i('gmk-ai-selector');
  if (!el) return;
  el.innerHTML = '';
  const contacts = Object.values(S._contacts);
  if (!contacts.length) { el.innerHTML = '<span style="font-size:12px;color:var(--text3)">还没有AI助手，先去添加～</span>'; return; }
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
  const contact = GOMOKU.contactId ? S._contacts[GOMOKU.contactId] : (S.currentContact ? S._contacts[S.currentContact] : Object.values(S._contacts)[0]);
  const aiName = contact?.name || 'AI';
  const el = $i('gomoku-ai-name');
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
  // pick contact
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
  const contact = GOMOKU.contactId ? S._contacts[GOMOKU.contactId] : null;
  const aiName = contact?.name || 'AI';
  const greeting = contact
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
  const ps = GOMOKU.prefs.pieceStyle;
  const pInfo = PIECE_STYLES[ps] || PIECE_STYLES.classic;
  for (let r = 0; r < 15; r++) {
    for (let c = 0; c < 15; c++) {
      const cell = document.createElement('div');
      cell.className = 'gmk-cell';
      if (GOMOKU.lastMove && GOMOKU.lastMove[0] === r && GOMOKU.lastMove[1] === c) {
        cell.classList.add('last-move');
      }
      const v = GOMOKU.board[r][c];
      if (v !== 0) {
        if (pInfo.p) {
          // Emoji piece
          cell.classList.add('emoji-piece');
          cell.textContent = v === 1 ? pInfo.p : pInfo.ai;
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

  // Determine game phase
  const phase = GOMOKU.moveCount <= 6 ? 'early' : GOMOKU.moveCount <= 20 ? 'mid' : 'late';
  const phaseHint = phase==='early'?'开局阶段，可以随意发挥':phase==='mid'?'中局关键期，要认真思考':'终局阶段，胜负即将揭晓';

  // Check if player has a threatening line (for commentary)
  const playerLastR = GOMOKU.lastMove?.[0], playerLastC = GOMOKU.lastMove?.[1];
  const playerThreat = (playerLastR!=null) ? gomokuMaxLine(playerLastR, playerLastC, 1) : 0;

  if (useKey) {
    const blacks = [], whites = [];
    for (let r=0;r<15;r++) for (let c=0;c<15;c++) {
      if (GOMOKU.board[r][c]===1) blacks.push(`(${r},${c})`);
      else if (GOMOKU.board[r][c]===2) whites.push(`(${r},${c})`);
    }
    const boardTxt = `黑子(对手)：${blacks.join('')||'无'}  白子(你)：${whites.join('')||'无'}`;
    const aiName = contact?.name || 'AI';
    const personality = (contact?.system || '你是可爱温柔的AI助手').slice(0, 130);
    const model = contact?.model || 'openai/gpt-4o-mini';
    // Commentary hint: if player is threatening, AI may warn/tease; if early game, be casual
    const commentHint = playerThreat >= 4
      ? '对手刚连了4子，你需要反应！评论可以紧张/惊讶/挑衅'
      : playerThreat >= 3
      ? '对手有威胁，评论可以提示/安慰/警告'
      : GOMOKU.prefs.commentary && GOMOKU.moveCount%4===0
      ? '过程评论，可以说游戏感受/小技巧/鼓励/调侃'
      : '';
    const prompt = `你是${aiName}，和用户下五子棋。你执白子，用户执黑子，棋盘15×15（行列0-14）。\n${boardTxt}\n性格：${personality}\n阶段：第${GOMOKU.moveCount}步，${phaseHint}。\n策略要求：根据性格和阶段灵活决策。温柔性格不代表一直让，可能开始认真、局势好时才礼让一步；强势性格会全力争胜；总之要有真实的游戏节奏感，避免机械。${commentHint ? '\n评论方向：'+commentHint : ''}\n在空位落子并用1句符合性格的话回应（${commentHint?'按方向':'可以是棋局感受'}）。\n只返回JSON：{"row":数字,"col":数字,"comment":"一句话"}`;
    try {
      const res = await fetch(useUrl, {
        method:'POST',
        headers:{'Authorization':`Bearer ${useKey}`,'Content-Type':'application/json','HTTP-Referer':'https://raimos.app','X-Title':'Raimos'},
        body:JSON.stringify({model,max_tokens:90,stream:false,temperature:0.8,messages:[{role:'user',content:prompt}]}),
      });
      const data = await res.json();
      const txt = data.choices?.[0]?.message?.content || '';
      const m = txt.match(/\{[\s\S]*?\}/);
      if (m) { const p = JSON.parse(m[0]); row=p.row; col=p.col; comment=p.comment; }
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
  if (comment && GOMOKU.prefs.commentary) gomokuSay(comment);

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

// Heuristic: win > block > weighted proximity + center bias
function gomokuHeuristic() {
  for (let r=0;r<15;r++) for (let c=0;c<15;c++) {
    if (GOMOKU.board[r][c]!==0) continue;
    GOMOKU.board[r][c]=2; const w=gomokuCheckWin(r,c,2); GOMOKU.board[r][c]=0;
    if (w) return {r,c};
  }
  for (let r=0;r<15;r++) for (let c=0;c<15;c++) {
    if (GOMOKU.board[r][c]!==0) continue;
    GOMOKU.board[r][c]=1; const w=gomokuCheckWin(r,c,1); GOMOKU.board[r][c]=0;
    if (w) return {r,c};
  }
  let best=null, bestScore=-1;
  for (let r=0;r<15;r++) for (let c=0;c<15;c++) {
    if (GOMOKU.board[r][c]!==0) continue;
    let score=0;
    for (let dr=-2;dr<=2;dr++) for (let dc=-2;dc<=2;dc++) {
      const nr=r+dr,nc=c+dc;
      if (nr>=0&&nr<15&&nc>=0&&nc<15&&GOMOKU.board[nr][nc]!==0) score+=2;
    }
    score += 8/(1+Math.abs(r-7)+Math.abs(c-7));
    if (score>bestScore){bestScore=score;best={r,c};}
  }
  return best||{r:7,c:7};
}

// ── Game End ──
async function gomokuFinish(result) {
  const contact = gomokuGetContact();
  const elapsed = Math.round((Date.now() - GOMOKU.startTime) / 1000);
  // save record
  await saveGomokuRecord({ result, moves: GOMOKU.moveCount, elapsed, aiName: contact?.name||'AI', aiContactId: GOMOKU.contactId, date: Date.now() });
  // get AI comment
  let aiComment = '';
  const useKey = contact?.apiKey || S.settings.apiKey;
  if (useKey) {
    try {
      const aiName = contact?.name||'AI', personality=(contact?.system||'').slice(0,100);
      const resultDesc = result==='player_win'?'你输了':result==='ai_win'?'你赢了':'平局';
      const prompt = `你是${aiName}，性格：${personality||'可爱温柔'}。五子棋结束，${resultDesc}。用1句符合性格的话回应。只返回JSON：{"comment":"话"}`;
      const res = await fetch(contact?.apiUrl||'https://openrouter.ai/api/v1/chat/completions',{method:'POST',headers:{'Authorization':`Bearer ${useKey}`,'Content-Type':'application/json','HTTP-Referer':'https://raimos.app','X-Title':'Raimos'},body:JSON.stringify({model:contact?.model||'openai/gpt-4o-mini',max_tokens:60,stream:false,messages:[{role:'user',content:prompt}]})});
      const data=await res.json();const txt=data.choices?.[0]?.message?.content||'';const m=txt.match(/\{[\s\S]*?\}/);
      if (m) aiComment=JSON.parse(m[0]).comment||'';
    } catch(e){}
  }
  if (!aiComment) aiComment = result==='player_win'?'你赢了！再来一局吧～':result==='ai_win'?'哈哈，我赢了！再来？':'平局！旗鼓相当呢～';
  gomokuSay(aiComment);
  // Show result modal after brief delay
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
