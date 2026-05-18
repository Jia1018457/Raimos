// ═══════════════════════════════════════════
//  RAIMOS v3 — Main App
// ═══════════════════════════════════════════
'use strict';

const $i = id => document.getElementById(id);
const _msgTextCache = new Map();

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
  chatListContactFilter: null,
  myStatus: '😊 在线',
  // runtime caches
  _contacts: {}, _chats: {}, _memories: [], _stickers: [],
  settings: {
    apiKey:'', apiUrl:'', tavilyKey:'', unsplashKey:'',
    model:'', systemPrompt:'',
    ttsMode:'browser', browserVoice:'', ttsUrl:'', ttsKey:'', ttsVoice:'cove',
    voiceReplyMode:'text', autoTts:false,
    stream:true, showToken:false, showGameToken:false, showThink:true,
    temp:0.85, ctx:20, imgSize:800, sumThresh:40,
    proactive:false, proMax:3, proStart:8, proEnd:22,
    momentsEnabled:false, autoPost:false, momentFreqMode:'perWeek', momentFreqCount:3,
    autoComment:false, commentFreqMins:360,
    replyMomentComments:false, replyDelay:120, autoLike:false, likeProb:60,
    maxComments:1,
    postImages:false, imageFreq:50, imageSources:'album', momentImgPrompt:'',
    imgGenModel:'openai/dall-e-3',
    aiName:'小可', userName:'我', aiAvatar:'🐱', userAvatar:'😊',
    showUserAvatar:true, showAiAvatar:true, showBubble:true, showUserBubble:true, showAiBubble:true,
    userBubble:'#ff8fab', aiBubble:'#ffffff',
    userTextColor:'', aiTextColor:'', fontColor:'',
    theme:'light', chatBg:'#fdf6f0', chatBgImg:'', bgOpacity:1, fontSize:14,
    userBubbleGradient:false, userBubbleGradientColor:'#ff4a7d', bubbleGlow:false, bubbleGlowStrength:8, bubbleOpacity:1,
    autoMemEnabled:true, autoMemInterval:5,
    welcomeIcon:'🐻', welcomeTitle:'你好呀！', welcomeSub:'点左上角 ＋ 新建对话，或先去⚙️设置里填 OpenRouter API Key 哦～',

    // ── 陪伴系统 ──
    companionScene:'学习',
    companionSceneCustom:'',
    companionContactId:'',
    companionFreqMin:10,
    companionCharType:'builtin',
    companionCharBuiltin:'😊',
    companionCharMediaId:'',
    companionBgType:'builtin',
    companionBgBuiltin:'bg1',
    companionBgMediaId:'',
    companionBgFit:'cover',
    companionMusicMediaId:'',
    companionMusicLoop:true,
    companionMusicVol:0.6,
    companionTimerMode:'pomodoro',
    companionCountdownMin:25,
    companionPomoFocus:25,
    companionPomoBreak:5,
    companionCharLeft:3,    // % from left edge of stage
    companionCharBottom:4,  // % from bottom edge of stage
    companionCharUrl:'', companionBgUrl:'',

    // ── Cloudinary 图床 ──
    cloudinaryCloud:'', cloudinaryPreset:'',

    // ── 个人信息 ──
    city:'', backendUrl:'',
    refChatEnabled:false, refChatCount:5, refMemEnabled:true,
    // 后台任务使用的助手 ID
    proContactId:'',      // 主动消息用哪个助手
    momentContactId:'',   // 朋友圈用哪个助手
    commentContactId:'',  // 评论回复用哪个助手（fallback）

    // ── 表情包库 ──
    stickerLibKey:'', stickerCallPrompt:'',

    // ── 朋友圈专属提示词 ──
    momentPrompt:'',          // Extra/override prompt for all moments actions
    momentPromptMode:'add',   // 'add' = append to system, 'replace' = replace system

    // ── 显示设置 ──
    showMomentToken:false,    // Show token usage on AI moment posts

    // ── 推送通知 ──
    pushEnabled:false,

    // ── AI 聊天发图 ──
    aiChatImages: false,
    aiChatImageFreq: 20,   // % probability per reply
    aiChatImageSources: 'album', // album,stickers,search,generate

    // ── 开屏动画 ──
    splashEnabled: false,
    splashMediaId: '',
    splashDuration: 4,   // seconds, for image splash
    splashType: '',      // 'image' | 'video' | ''

    // ── 触感反馈 ──
    hapticEnabled: true,
    hapticOnAiReply: false,

    // ── 正在输入动画 ──
    typingAnimEnabled: true,
    typingAnimShape: 'heart',  // 'heart' | 'star' | 'sparkle' | 'dot'
  },
  _momentTimers: {},
  _imgSearchTarget: 'compose',
  _imgSearchSelected: [],
  _composePics: [],
  _newGifData: null, _newAnimType: 'gif', _editingKwAnimId: null,
  _animTimeout: null, _animRaf: null,
  _statusTimers: {},

  // Companion runtime (not persisted to storage)
  _companion: {
    running:false,
    mode:'pomodoro',
    phase:'focus',
    elapsedSec:0,
    remainingSec:0,
    tickTimer:null,
    speechTimer:null,
    isSpeaking:false,
    bubbleTimer:null,
    bgObjUrl:null,
    charObjUrl:null,
    musicObjUrl:null,
    uploadTarget:null,
    immersive:false,
  },
};

// ── MODELS ──
const MODELS = [
  {id:'anthropic/claude-opus-4.6',name:'Claude Opus 4.6',desc:'Anthropic 旗舰，最强编程推理'},
  {id:'anthropic/claude-sonnet-4.6',name:'Claude Sonnet 4.6',desc:'高性能均衡'},
  {id:'anthropic/claude-haiku-4.5',name:'Claude Haiku 4.5',desc:'快速轻量'},
  {id:'openai/gpt-4.1',name:'GPT-4.1',desc:'OpenAI 旗舰'},
  {id:'openai/gpt-4.1-mini',name:'GPT-4.1 Mini',desc:'快速便宜'},
  {id:'openai/o3',name:'o3',desc:'顶级推理模型'},
  {id:'openai/o4-mini',name:'o4 mini',desc:'轻量推理'},
  {id:'openai/o4-mini:online',name:'o4 mini (联网)',desc:'联网推理'},
  {id:'google/gemini-2.5-pro',name:'Gemini 2.5 Pro',desc:'Google 旗舰，超长上下文'},
  {id:'google/gemini-2.5-flash',name:'Gemini 2.5 Flash',desc:'快速多模态'},
  {id:'google/gemini-2.5-flash-lite',name:'Gemini 2.5 Flash Lite',desc:'极速轻量'},
  {id:'deepseek/deepseek-v3-0324',name:'DeepSeek V3',desc:'国产顶级'},
  {id:'deepseek/deepseek-r1',name:'DeepSeek R1',desc:'推理模型'},
  {id:'deepseek/deepseek-r1:free',name:'DeepSeek R1 (免费)',desc:'免费推理'},
  {id:'meta-llama/llama-4-maverick',name:'Llama 4 Maverick',desc:'Meta 最新旗舰'},
  {id:'meta-llama/llama-4-scout:free',name:'Llama 4 Scout (免费)',desc:'免费开源'},
  {id:'qwen/qwen3-235b-a22b',name:'Qwen3 235B',desc:'阿里通义最强'},
  {id:'qwen/qwen3-32b',name:'Qwen3 32B',desc:'通义中型'},
  {id:'perplexity/sonar-pro',name:'Perplexity Sonar Pro (联网)',desc:'专业联网搜索'},
  {id:'perplexity/sonar',name:'Perplexity Sonar (联网)',desc:'标准联网搜索'},
  {id:'custom',name:'自定义…',desc:'手动输入模型名'},
];

// ── 自动从 OpenRouter 获取最新模型列表 ──
async function fetchOpenRouterModels() {
  try {
    const cacheKey = 'or_models_v3';
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const { ts, data } = JSON.parse(cached);
      if (Date.now() - ts < 6 * 3600 * 1000 && data?.length > 10) {
        _applyFetchedModels(data); return;
      }
    }
    const res = await fetch('https://openrouter.ai/api/v1/models');
    if (!res.ok) return;
    const json = await res.json();
    const models = (json.data || [])
      .filter(m => m.id && !m.id.startsWith('openrouter/'))
      .map(m => ({ id: m.id, name: m.name || m.id, desc: (m.description || m.id.split('/')[0] || '').slice(0, 60) }));
    if (models.length > 10) {
      localStorage.setItem(cacheKey, JSON.stringify({ ts: Date.now(), data: models }));
      _applyFetchedModels(models);
    }
  } catch(e) { /* 静默失败，使用内置列表 */ }
}
function _applyFetchedModels(models) {
  MODELS.length = 0;
  models.forEach(m => MODELS.push(m));
  MODELS.push({id:'custom', name:'自定义…', desc:'手动输入模型名'});
  document.querySelectorAll('.model-list').forEach(el => {
    const prefix = el.id.replace('-model-list','');
    const sel = el.closest('.s-row, .cm-section')?.querySelector(`#${prefix}-model`)?.value;
    if (sel !== undefined) renderModelList(prefix, sel);
  });
}

// ══════════════════════════════
//  INIT
// ══════════════════════════════
async function init() {
  // Request persistent storage so browser won't evict IndexedDB under quota pressure
  if (navigator.storage?.persist) navigator.storage.persist().catch(() => {});

  await loadAllData();
  applyTheme();
  applyBg();
  applyBubble();
  applyBubbleSetting();
  buildSettingsUI();
  fetchOpenRouterModels();
  renderChatList();
  renderContacts();
  renderMemories();
  renderMoments();
  initCompanion();
  initEmoji();
  initVoices();
  initScrollObs();
  initMinimap();
  initProactive();
  initStatusTimers();
  initMomentTimers();
  updateWelcome();
  if (S.currentChat && S._chats[S.currentChat]) openChat(S.currentChat);
  // Restore mini companion window if it was open
  if (S.settings.companionMiniOpen) setTimeout(() => companionShowMini(), 500);
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
  updateNavUserAv();
  updateStatusNoteBadge();
  initSplashScreen();
  if (typeof initCheckin === 'function') initCheckin();
  if (S._dbError) setTimeout(() => toast('⚠️ 数据库加载异常，部分数据可能丢失：' + S._dbError), 800);
  // Mobile: shorter placeholder text, fix emoji button alias
  if (isMobile()) {
    const inp = $i('msg-input');
    if (inp) inp.placeholder = '发消息…';
  }
}

// ══════════════════════════════
//  DATA LOAD / SAVE
// ══════════════════════════════
async function loadAllData() {
  try {
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
    S._minimapOn = savedSettings.minimapOn === true;
  } catch(e) {
    console.error('[loadAllData] DB error:', e);
    S._dbError = e.message;
  }
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
function cs(cv, gv) { return (cv === null || cv === undefined) ? gv : cv; }

// ══════════════════════════════
//  PAGE SWITCHING
// ══════════════════════════════
function switchPage(id) {
  if (isMobile()) haptic(10);
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
  const pageEl = $i(id);
  if (!pageEl) return;
  pageEl.classList.add('active');
  document.querySelector(`[data-page="${id}"]`)?.classList.add('active');
  if (id === 'memory-page') renderMemories();
  if (id === 'contacts-page') renderContacts();
  if (id === 'moments-page') { renderMoments(); saveSetting('lastMomentsVisit', Date.now()); }
  if (id === 'companion-page') { renderCompanionPage(); if (window._refreshLinkedTaskSelect) window._refreshLinkedTaskSelect(); }
  if (id === 'settings-page') { buildSettingsUI(); updateStorageInfo(); }
  if (id === 'checkin-page' && typeof renderCheckinPage === 'function') renderCheckinPage();
  if (id === 'explore-page') renderExplorePage();
  if (id === 'my-page') renderMyPage();
}

// ══════════════════════════════
//  EXPLORE PAGE
// ══════════════════════════════
function renderExplorePage() {
  // Cards are static in HTML; nothing dynamic needed
}

// ══════════════════════════════
//  MY PAGE
// ══════════════════════════════
function renderMyPage() {
  const av = S.settings.userAvatar || '😊';
  const avEl = $i('my-page-avatar');
  if (avEl) {
    if (av.startsWith('data:')) { avEl.innerHTML = `<img src="${av}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`; }
    else { avEl.textContent = av; }
  }
  const nameEl = $i('my-page-name');
  if (nameEl) nameEl.textContent = S.settings.userName || '我的';
  const subEl = $i('my-tile-auth-sub');
  if (subEl) subEl.textContent = window._fbUser ? ('已登录：' + window._fbUser.email) : '未登录';
}

function openMyOrModal() {
  if (window.innerWidth <= 768) {
    switchPage('my-page');
  } else {
    openUserModal();
  }
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
      <div class="contact-av">${typeof avHTML === 'string' && avHTML.startsWith('<') ? avHTML : `<span>${avHTML}</span>`}</div>
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
  const hasSysCustom = c !== null && c?.system !== null && c?.system !== undefined;
  const sysCb = $i('cm-system-inherit');
  if (sysCb) { sysCb.checked = !hasSysCustom; $i('cm-system-row').style.display = hasSysCustom ? '' : 'none'; }
  $i('cm-system').value = hasSysCustom ? (c?.system||'') : '';
  const hasTempOverride = c !== null && c?.temp !== null && c?.temp !== undefined;
  $i('cm-use-global-temp').checked = !hasTempOverride;
  $i('cm-temp-row').style.display = hasTempOverride ? 'flex' : 'none';
  $i('cm-temp').value = hasTempOverride ? c.temp : (S.settings.temp || 0.85);
  $i('cm-temp-v').textContent = hasTempOverride ? c.temp : (S.settings.temp || 0.85);
  $i('cm-model').value = c?.model || '';
  $i('cm-status-freq').value = c?.statusFreq || 0;
  $i('cm-status').value = c?.status || '';
  $i('cm-apikey').value = c?.apiKey || '';
  $i('cm-apiurl').value = c?.apiUrl || '';
  $i('cm-av-picker').style.display = 'none';
  renderModelList('cm', c?.model || 'openai/gpt-4o');
  // Extended sections — null stored = inherit global (checkbox checked by default)
  setCmSection('voice', c, ['xTtsMode','xBrowserVoice','xTtsUrl','xTtsKey','xTtsVoice','xAutoTts','xVoiceReplyMode']);
  if (c?.xTtsMode !== null && c?.xTtsMode !== undefined) { const el=$i('cm-x-tts-mode'); if(el)el.value=c.xTtsMode||'browser'; }
  if (c?.xAutoTts !== null && c?.xAutoTts !== undefined) { const el=$i('cm-x-auto-tts'); if(el)el.checked=!!c.xAutoTts; }
  if (c?.xVoiceReplyMode !== null && c?.xVoiceReplyMode !== undefined) { const el=$i('cm-x-voice-reply'); if(el)el.value=c.xVoiceReplyMode||'text'; }
  if (c?.xBrowserVoice !== null && c?.xBrowserVoice !== undefined) { const el=$i('cm-x-bvoice'); if(el)el.value=c.xBrowserVoice||''; }
  setCmSection('params', c, ['xStream','xShowToken','xShowThink','xCtx','xSumThresh']);
  if (c?.xStream !== null && c?.xStream !== undefined) { const el=$i('cm-x-stream'); if(el)el.checked=c.xStream!==false; }
  if (c?.xShowToken !== null && c?.xShowToken !== undefined) { const el=$i('cm-x-show-token'); if(el)el.checked=!!c.xShowToken; }
  if (c?.xShowThink !== null && c?.xShowThink !== undefined) { const el=$i('cm-x-show-think'); if(el)el.checked=c.xShowThink!==false; }
  if (c?.xCtx !== null && c?.xCtx !== undefined) { const el=$i('cm-x-ctx'); if(el)el.value=c.xCtx||20; }
  if (c?.xSumThresh !== null && c?.xSumThresh !== undefined) { const el=$i('cm-x-sumthresh'); if(el)el.value=c.xSumThresh||40; }
  setCmSection('appear', c, ['xAiBubble','xChatBg','xShowUserBubble','xShowAiBubble']);
  if (c?.xAiBubble !== null && c?.xAiBubble !== undefined) { const el=$i('cm-x-ai-bubble'); if(el)el.value=c.xAiBubble||'#ffffff'; }
  if (c?.xChatBg !== null && c?.xChatBg !== undefined) { const el=$i('cm-x-chat-bg'); if(el)el.value=c.xChatBg||'#fdf6f0'; }
  if (c?.xShowUserBubble !== null && c?.xShowUserBubble !== undefined) { const el=$i('cm-x-show-user-bubble'); if(el)el.checked=c.xShowUserBubble!==false; }
  if (c?.xShowAiBubble !== null && c?.xShowAiBubble !== undefined) { const el=$i('cm-x-show-ai-bubble'); if(el)el.checked=c.xShowAiBubble!==false; }
  setCmSection('imggen', c, ['xImgGenModel','xImgGenCustomModel','xImgGenApiUrl','xImgGenApiKey']);
  if (c?.xImgGenModel !== null && c?.xImgGenModel !== undefined) {
    const el=$i('cm-imggen-model');
    if(el){
      const knownModels=['openai/dall-e-3','stabilityai/stable-diffusion-xl-base-1.0'];
      el.value=knownModels.includes(c.xImgGenModel)?c.xImgGenModel:'custom';
    }
  }
  const cmm=$i('cm-x-imggen-custom-model'); if(cmm)cmm.value=c?.xImgGenCustomModel||'';
  const cmu=$i('cm-x-imggen-api-url'); if(cmu)cmu.value=c?.xImgGenApiUrl||'';
  const cmk=$i('cm-x-imggen-api-key'); if(cmk)cmk.value=c?.xImgGenApiKey||'';
  onImgGenChange('cm');
  // Proactive section
  setCmSection('proactive', c, ['xProactive','xProMax','xProStart','xProEnd']);
  if (c?.xProactive !== null && c?.xProactive !== undefined) { const el=$i('cm-x-proactive'); if(el)el.checked=!!c.xProactive; }
  if (c?.xProMax !== null && c?.xProMax !== undefined) { const el=$i('cm-x-pro-max'); if(el)el.value=c.xProMax||3; }
  if (c?.xProStart !== null && c?.xProStart !== undefined) { const el=$i('cm-x-pro-start'); if(el)el.value=c.xProStart??8; }
  if (c?.xProEnd !== null && c?.xProEnd !== undefined) { const el=$i('cm-x-pro-end'); if(el)el.value=c.xProEnd??22; }
  // Moments section
  setCmSection('moments', c, ['xMomentsEnabled','xAutoPost','xMomentFreqMode','xMomentFreqCount','xMomentPromptMode','xMomentPrompt','xAutoComment','xCommentFreqMins','xReplyMomentComments','xReplyDelay','xAutoLike','xLikeProb','xMaxComments','xPostImages','xImageFreq','xImageSources','xMomentImgPrompt']);
  if (c?.xMomentsEnabled !== null && c?.xMomentsEnabled !== undefined) { const el=$i('cm-x-moments-enabled'); if(el)el.checked=!!c.xMomentsEnabled; }
  if (c?.xAutoPost !== null && c?.xAutoPost !== undefined) { const el=$i('cm-x-auto-post'); if(el)el.checked=!!c.xAutoPost; }
  if (c?.xMomentFreqMode !== null && c?.xMomentFreqMode !== undefined) { const el=$i('cm-x-moment-freq-mode'); if(el)el.value=c.xMomentFreqMode||'perWeek'; }
  if (c?.xMomentFreqCount !== null && c?.xMomentFreqCount !== undefined) { const el=$i('cm-x-moment-freq-count'); if(el)el.value=c.xMomentFreqCount||3; }
  if (c?.xMomentPromptMode !== null && c?.xMomentPromptMode !== undefined) { const el=$i('cm-x-moment-prompt-mode'); if(el)el.value=c.xMomentPromptMode||'add'; }
  if (c?.xMomentPrompt !== null && c?.xMomentPrompt !== undefined) { const el=$i('cm-x-moment-prompt'); if(el)el.value=c.xMomentPrompt||''; }
  if (c?.xAutoComment !== null && c?.xAutoComment !== undefined) { const el=$i('cm-x-auto-comment'); if(el)el.checked=!!c.xAutoComment; }
  if (c?.xCommentFreqMins !== null && c?.xCommentFreqMins !== undefined) { const el=$i('cm-x-comment-freq'); if(el)el.value=c.xCommentFreqMins||360; }
  if (c?.xMaxComments !== null && c?.xMaxComments !== undefined) { const el=$i('cm-x-max-comments'); if(el)el.value=c.xMaxComments||1; }
  if (c?.xReplyMomentComments !== null && c?.xReplyMomentComments !== undefined) { const el=$i('cm-x-reply-comments'); if(el)el.checked=!!c.xReplyMomentComments; }
  if (c?.xReplyDelay !== null && c?.xReplyDelay !== undefined) { const el=$i('cm-x-reply-delay'); if(el)el.value=c.xReplyDelay||120; }
  if (c?.xAutoLike !== null && c?.xAutoLike !== undefined) { const el=$i('cm-x-auto-like'); if(el)el.checked=!!c.xAutoLike; }
  if (c?.xLikeProb !== null && c?.xLikeProb !== undefined) { const el=$i('cm-x-like-prob'); if(el){ el.value=c.xLikeProb||60; const v=$i('cm-x-like-prob-v'); if(v)v.textContent=(c.xLikeProb||60)+'%'; } }
  if (c?.xPostImages !== null && c?.xPostImages !== undefined) { const el=$i('cm-x-post-images'); if(el)el.checked=!!c.xPostImages; }
  if (c?.xImageFreq !== null && c?.xImageFreq !== undefined) { const el=$i('cm-x-image-freq'); if(el)el.value=c.xImageFreq||50; }
  if (c?.xImageSources !== null && c?.xImageSources !== undefined) {
    const srcs = (c.xImageSources||'album').split(',');
    ['album','search','generate'].forEach(s => { const el=$i(`cm-x-imgsrc-${s}`); if(el)el.checked=srcs.includes(s); });
  }
  if (c?.xMomentImgPrompt !== null && c?.xMomentImgPrompt !== undefined) { const el=$i('cm-x-moment-img-prompt'); if(el)el.value=c.xMomentImgPrompt||''; }
  // AI chat images section
  setCmSection('aichat', c, ['xAiChatImages','xAiChatImageFreq','xAiChatImageSources']);
  if (c?.xAiChatImages !== null && c?.xAiChatImages !== undefined) { const el=$i('cm-x-ai-chat-images'); if(el)el.checked=!!c.xAiChatImages; }
  if (c?.xAiChatImageFreq !== null && c?.xAiChatImageFreq !== undefined) { const el=$i('cm-x-ai-chat-freq'); if(el){ el.value=c.xAiChatImageFreq||20; const v=$i('cm-x-ai-chat-freq-v'); if(v)v.textContent=(c.xAiChatImageFreq||20)+'%'; } }
  if (c?.xAiChatImageSources !== null && c?.xAiChatImageSources !== undefined) {
    const srcs2 = (c.xAiChatImageSources||'album').split(',');
    ['album','search','generate'].forEach(s => { const el=$i(`cm-x-aichat-src-${s}`); if(el)el.checked=srcs2.includes(s); });
  }
  $i('contact-modal').classList.add('show');
  setTimeout(addExpandBtns, 50);
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
  toast('上传头像中…');
  let url = await uploadToCloudinary(compressed, 'raimos/avatars').catch(()=>null);
  url = url || compressed;
  $i('cm-av').value = url;
  $i('cm-av-preview').innerHTML = `<img src="${url}" style="width:28px;height:28px;border-radius:50%;object-fit:cover">`;
  input.value = '';
}
function setCmSection(name, c, fields) {
  const hasCustom = c !== null && fields.some(f => c?.[f] !== null && c?.[f] !== undefined);
  const cb = $i(`cm-${name}-inherit`); const body = $i(`cm-${name}-body`);
  if (cb) cb.checked = !hasCustom;  // checked = inherit global
  if (body) body.style.display = hasCustom ? '' : 'none';
}
function toggleCmSection(name) {
  const inherit = $i(`cm-${name}-inherit`)?.checked;
  const body = $i(`cm-${name}-body`);
  if (body) body.style.display = inherit ? 'none' : '';
}
function getCmSection(name) { return !$i(`cm-${name}-inherit`)?.checked; }
function getV(id,def=''){const el=$i(id);return el?el.value:def;}
function getB2(id,def=false){const el=$i(id);return el?el.checked:def;}
async function saveContact() {
  const name = $i('cm-name').value.trim(); if (!name) { toast('请输入名称'); return; }
  const id = S.editingContactId || uid();
  const contact = {
    id, name, avatar: $i('cm-av').value, desc: $i('cm-desc').value.trim(),
    apiKey: $i('cm-apikey').value.trim(), apiUrl: $i('cm-apiurl').value.trim(),
    model: $i('cm-model').value.trim(),
    system: $i('cm-system-inherit')?.checked ? null : $i('cm-system').value.trim(),
    temp: $i('cm-use-global-temp').checked ? null : parseFloat($i('cm-temp').value),
    statusFreq: parseInt($i('cm-status-freq').value) || 0,
    status: $i('cm-status').value || '😊 在线', updatedAt: Date.now(),
    // Voice section
    xTtsMode: getCmSection('voice') ? getV('cm-x-tts-mode','browser') : null,
    xBrowserVoice: getCmSection('voice') ? getV('cm-x-bvoice') : null,
    xTtsUrl: getCmSection('voice') ? getV('cm-x-tts-url') : null,
    xTtsKey: getCmSection('voice') ? getV('cm-x-tts-key') : null,
    xTtsVoice: getCmSection('voice') ? getV('cm-x-tts-voice') : null,
    xAutoTts: getCmSection('voice') ? getB2('cm-x-auto-tts') : null,
    xVoiceReplyMode: getCmSection('voice') ? getV('cm-x-voice-reply','text') : null,
    // Params section
    xStream: getCmSection('params') ? getB2('cm-x-stream',true) : null,
    xShowToken: getCmSection('params') ? getB2('cm-x-show-token') : null,
    xShowThink: getCmSection('params') ? getB2('cm-x-show-think',true) : null,
    xCtx: getCmSection('params') ? parseInt(getV('cm-x-ctx','20')) : null,
    xSumThresh: getCmSection('params') ? parseInt(getV('cm-x-sumthresh','40')) : null,
    // Appearance section
    xAiBubble: getCmSection('appear') ? getV('cm-x-ai-bubble','#ffffff') : null,
    xChatBg: getCmSection('appear') ? getV('cm-x-chat-bg','#fdf6f0') : null,
    xShowUserBubble: getCmSection('appear') ? getB2('cm-x-show-user-bubble',true) : null,
    xShowAiBubble: getCmSection('appear') ? getB2('cm-x-show-ai-bubble',true) : null,
    // Image gen section
    xImgGenModel: getCmSection('imggen') ? (()=>{ const v=getV('cm-imggen-model'); return v==='custom'?(getV('cm-x-imggen-custom-model')||'openai/dall-e-3'):v; })() : null,
    xImgGenCustomModel: getCmSection('imggen') ? getV('cm-x-imggen-custom-model') : null,
    xImgGenApiUrl: getCmSection('imggen') ? getV('cm-x-imggen-api-url') : null,
    xImgGenApiKey: getCmSection('imggen') ? getV('cm-x-imggen-api-key') : null,
    // Proactive section
    xProactive: getCmSection('proactive') ? getB2('cm-x-proactive') : null,
    xProMax: getCmSection('proactive') ? parseInt(getV('cm-x-pro-max','3')) : null,
    xProStart: getCmSection('proactive') ? parseInt(getV('cm-x-pro-start','8')) : null,
    xProEnd: getCmSection('proactive') ? parseInt(getV('cm-x-pro-end','22')) : null,
    // Moments section
    xMomentsEnabled: getCmSection('moments') ? getB2('cm-x-moments-enabled') : null,
    xAutoPost: getCmSection('moments') ? getB2('cm-x-auto-post') : null,
    xMomentFreqMode: getCmSection('moments') ? getV('cm-x-moment-freq-mode','perWeek') : null,
    xMomentFreqCount: getCmSection('moments') ? parseInt(getV('cm-x-moment-freq-count','3')) : null,
    xMomentPromptMode: getCmSection('moments') ? getV('cm-x-moment-prompt-mode','add') : null,
    xMomentPrompt: getCmSection('moments') ? getV('cm-x-moment-prompt','').trim() : null,
    xAutoComment: getCmSection('moments') ? getB2('cm-x-auto-comment') : null,
    xCommentFreqMins: getCmSection('moments') ? parseInt(getV('cm-x-comment-freq','360')) : null,
    xMaxComments: getCmSection('moments') ? parseInt(getV('cm-x-max-comments','1')) : null,
    xReplyMomentComments: getCmSection('moments') ? getB2('cm-x-reply-comments') : null,
    xReplyDelay: getCmSection('moments') ? parseInt(getV('cm-x-reply-delay','120')) : null,
    xAutoLike: getCmSection('moments') ? getB2('cm-x-auto-like') : null,
    xLikeProb: getCmSection('moments') ? parseInt(getV('cm-x-like-prob','60')) : null,
    xPostImages: getCmSection('moments') ? getB2('cm-x-post-images') : null,
    xImageFreq: getCmSection('moments') ? parseInt(getV('cm-x-image-freq','50')) : null,
    xImageSources: getCmSection('moments') ? ['album','search','generate'].filter(s=>$i(`cm-x-imgsrc-${s}`)?.checked).join(',') || 'album' : null,
    xMomentImgPrompt: getCmSection('moments') ? getV('cm-x-moment-img-prompt','').trim() : null,
    // AI chat images
    xAiChatImages: getCmSection('aichat') ? getB2('cm-x-ai-chat-images') : null,
    xAiChatImageFreq: getCmSection('aichat') ? parseInt(getV('cm-x-ai-chat-freq','20')) : null,
    xAiChatImageSources: getCmSection('aichat') ? ['album','search','generate'].filter(s=>$i(`cm-x-aichat-src-${s}`)?.checked).join(',') || 'album' : null,
  };
  try {
    await dbPut('contacts', contact);
  } catch(e) {
    toast('❌ 保存失败：' + e.message);
    console.error('[saveContact]', e);
    return;
  }
  S._contacts[id] = contact;
  initStatusTimers();
  initMomentTimers();
  renderContacts(); closeModal('contact-modal'); toast('✅ 助手已保存');
}
async function delContact(id) {
  if (!confirm('删除这个助手？')) return;
  await dbDel('contacts', id); delete S._contacts[id];
  fbDel('contacts', id);
  renderContacts();
}
function toggleContactSystem() {
  const inherit = $i('cm-system-inherit').checked;
  $i('cm-system-row').style.display = inherit ? 'none' : '';
}
function toggleContactTemp() {
  const useGlobal = $i('cm-use-global-temp').checked;
  $i('cm-temp-row').style.display = useGlobal ? 'none' : 'flex';
}
async function startChatWith(contactId) {
  const c = S._contacts[contactId]; if (!c) return;
  S.chatListContactFilter = contactId;
  const chatId = uid();
  const chat = { id: chatId, name: `与${c.name}的对话`, contactId, summary: null, archived: false, createdAt: Date.now(), updatedAt: Date.now() };
  dbPut('chats', chat); S._chats[chatId] = chat;
  S.currentChat = chatId; S.currentContact = contactId;
  saveSetting('currentChat', chatId); saveSetting('currentContact', contactId);
  switchPage('chat-page'); renderChatList(); await openChat(chatId);
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
async function setMyStatus(s) {
  if (!s) return; S.myStatus = s; await saveSetting('myStatus', s);
  updateHeaderStatus(); toast('状态已更新');
}

// ══════════════════════════════
//  CHAT MANAGEMENT
// ══════════════════════════════
async function newChat() {
  const contacts = Object.values(S._contacts);
  if (!contacts.length) { switchPage('contacts-page'); toast('👆 先添加一个 AI 助手吧！'); return; }
  openNewChatModal();
}
function openNewChatModal() {
  const list = $i('ncm-list'); list.innerHTML = '';
  Object.values(S._contacts).forEach(c => {
    const div = document.createElement('div'); div.className = 'ncm-item';
    const av = c.avatar?.startsWith('data:') ? `<img src="${c.avatar}">` : `<span>${c.avatar||'🤖'}</span>`;
    div.innerHTML = `<div class="ncm-av">${av}</div><div class="ncm-info"><div class="ncm-name">${esc(c.name)}</div><div class="ncm-desc">${esc(c.model||S.settings.model||'gpt-4o')}</div></div>`;
    div.onclick = () => { closeModal('new-chat-modal'); createChatWith(c.id); };
    list.appendChild(div);
  });
  $i('new-chat-modal').classList.add('show');
}
async function createChatWith(contactId) {
  const c = contactId ? S._contacts[contactId] : null;
  const chatId = uid();
  const chat = { id: chatId, name: c ? `与${c.name}的对话` : '新对话', contactId: contactId||null, summary: null, archived: false, createdAt: Date.now(), updatedAt: Date.now() };
  await dbPut('chats', chat); S._chats[chatId] = chat;
  S.currentChat = chatId; S.currentContact = contactId||null;
  S.chatListContactFilter = contactId || null;
  await saveSetting('currentChat', chatId); await saveSetting('currentContact', contactId||null);
  switchPage('chat-page'); renderChatList(); await openChat(chatId);
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
  $i('hint-model').textContent = contact?.model || S.settings.model || '';
  updateHeaderStatus();
  // Apply contact-specific appearance overrides
  const effAiBubble = cs(contact?.xAiBubble, S.settings.aiBubble) || '#ffffff';
  const effChatBg = cs(contact?.xChatBg, S.settings.chatBg) || '#fdf6f0';
  document.documentElement.style.setProperty('--ai-bubble', effAiBubble);
  const ca2 = $i('chat-area'); if (ca2) ca2.style.background = effChatBg;
  await renderMsgs(); highlightChat(); scrollTo_(false, true);
}

async function deleteCurrentChat() {
  if (!S.currentChat) return; if (!confirm('删除此对话？')) return;
  const chatId = S.currentChat;
  await dbDel('chats', chatId);
  fbDel('chats', chatId);
  const msgs = await dbGetAll('messages', 'chatId', chatId);
  for (const m of msgs) { await dbDel('messages', m.id); fbDel('messages', m.id); }
  delete S._chats[chatId]; S.currentChat = null;
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
  div.innerHTML = `<div class="w-icon" id="welcome-icon">${esc(s.welcomeIcon||'🐻')}</div><div class="w-title" id="welcome-title">${esc(s.welcomeTitle||'你好呀！')}</div><div class="w-sub" id="welcome-sub">${esc(s.welcomeSub||'')}</div><button class="welcome-action" onclick="openNewChatModal()">选择 AI 助手开始聊天</button>`;
  ca.appendChild(div);
  $i('hdr-name').textContent = '选择或新建对话';
}

function openWelcomeFromLogo(){
  S.currentChat = null;
  S.currentContact = null;
  S.chatListContactFilter = null;
  switchPage('chat-page');
  showWelcome();
  renderChatList();
  if (typeof closeSidebar === 'function') closeSidebar();
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
  try {
    S.settings.welcomeIcon = $i('wm-icon').value || '🐻';
    S.settings.welcomeTitle = $i('wm-title').value || '你好呀！';
    S.settings.welcomeSub = $i('wm-sub').value;
    await saveSetting('welcomeIcon', S.settings.welcomeIcon);
    await saveSetting('welcomeTitle', S.settings.welcomeTitle);
    await saveSetting('welcomeSub', S.settings.welcomeSub);
    updateWelcome(); closeModal('welcome-modal'); toast('✅ 欢迎页已更新');
  } catch(e) {
    toast('❌ 保存失败：' + e.message);
    console.error('[saveWelcome]', e);
  }
}

function renderChatList(filter = '') {
  const list = $i('chat-list'); list.innerHTML = '';
  const scopedContact = S.chatListContactFilter;
  let all = Object.values(S._chats).sort((a, b) => (b.updatedAt||b.createdAt||0) - (a.updatedAt||a.createdAt||0));
  if (scopedContact) all = all.filter(c => c.contactId === scopedContact);
  if (scopedContact) {
    const c = S._contacts[scopedContact];
    const scope = document.createElement('div');
    scope.className = 'chat-scope-banner';
    scope.innerHTML = `<span>只显示：${esc(c?.name || '当前助手')}</span><button onclick="S.chatListContactFilter=null;renderChatList()">显示全部</button>`;
    list.appendChild(scope);
  }
  const activeAll = all.filter(c => !c.archived);
  const pinned = activeAll.filter(c => c.pinned);
  const unpinned = activeAll.filter(c => !c.pinned);
  const archived = all.filter(c => c.archived);

  const renderItem = (chat) => {
    const contact = chat.contactId ? S._contacts[chat.contactId] : null;
    const av = contact?.avatar || '💬';
    const status = contact?.status || '';
    const div = document.createElement('div');
    div.className = 'chat-item' + (chat.id === S.currentChat ? ' active' : '') + (chat.pinned ? ' pinned' : '');
    div.dataset.id = chat.id;
    const avInner = av.startsWith('data:') ? `<img src="${av}">` : av;
    div.innerHTML = `
      <div class="ci-avatar-wrap">
        <div class="ci-avatar">${av.startsWith('data:') ? avInner : `<span>${avInner}</span>`}</div>
        </div>
      <div class="ci-info">
        <div class="ci-name">${esc(chat.name)}</div>
        <div class="ci-preview" id="ci-prev-${chat.id}">加载中…</div>
      </div>
      <div class="ci-time">${fmtTime(chat.updatedAt||chat.createdAt)}</div>
      <button class="chat-item-menu" onclick="event.stopPropagation();openChatItemMenu(event,'${chat.id}')">⋮</button>`;
    div.addEventListener('click', e => { if (e.target.classList.contains('chat-item-menu')) return; S.currentChat = chat.id; S.currentContact = chat.contactId || null; switchPage('chat-page'); openChat(chat.id); });
    list.appendChild(div);
    dbGetAll('messages', 'chatId', chat.id).then(msgs => {
      const last = msgs[msgs.length - 1];
      const p = $i('ci-prev-' + chat.id);
      if (p) p.textContent = last ? (last.type === 'voice' ? '🎤 语音' : last.type === 'image' ? '🖼️ 图片' : last.type === 'sticker' ? '😄 表情包' : last.type === 'file' ? '📎 文件' : (last.content || '').slice(0, 24)) : '暂无消息';
    });
  };

  const render = (chats, label) => {
    const filtered = chats.filter(c => !filter || c.name.toLowerCase().includes(filter.toLowerCase()));
    if (!filtered.length) return;
    if (label) {
      const lel = document.createElement('div');
      lel.style.cssText = 'font-size:9.5px;font-weight:800;color:var(--text3);padding:4px 9px;text-transform:uppercase;letter-spacing:.08em;';
      lel.textContent = label; list.appendChild(lel);
    }
    filtered.forEach(renderItem);
  };

  if (pinned.length) {
    const pd = document.createElement('div');
    pd.className = 'pinned-divider';
    pd.textContent = '📌 置顶';
    list.appendChild(pd);
    render(pinned, '');
    if (unpinned.length || archived.length) {
      const sep = document.createElement('div');
      sep.style.cssText = 'font-size:9.5px;font-weight:800;color:var(--text3);padding:4px 9px;text-transform:uppercase;letter-spacing:.08em;';
      sep.textContent = '全部对话';
      list.appendChild(sep);
    }
  }
  render(unpinned, '');
  render(archived, '归档');

  if (!activeAll.length && !archived.length) {
    const empty = document.createElement('div');
    empty.style.cssText = 'text-align:center;padding:24px 10px;color:var(--text3);font-size:12px;line-height:1.7';
    empty.innerHTML = scopedContact ? '这个助手还没有对话<br><button class="btn-p" onclick="createChatWith(S.chatListContactFilter)">新建与 TA 的对话</button>' : '还没有对话';
    list.appendChild(empty);
  }
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
      if (isUser) {
        if (userAv?.startsWith('data:')) av.innerHTML = `<img src="${userAv}">`;
        else av.textContent = userAv;
      } else if (aiAv?.startsWith('data:')) av.innerHTML = `<img src="${aiAv}">`;
      else av.textContent = aiAv || '🐱';
      if (isUser && S.settings.showUserAvatar === false) av.style.display = 'none';
      if (!isUser && S.settings.showAiAvatar === false) av.style.display = 'none';
      const sn = document.createElement('span'); sn.className = 'msg-sender';
      sn.textContent = isUser ? (S.settings.userName || '我') : (contact?.name || S.settings.aiName || 'AI');
      if (isUser) { gh.appendChild(sn); gh.appendChild(av); } else { gh.appendChild(av); gh.appendChild(sn); }
      groupEl.appendChild(gh); ca.appendChild(groupEl); lastRole = msg.role;
    }
    appendBubble(groupEl, msg);
  }
  requestAnimationFrame(renderMinimap);
}

function appendBubble(groupEl, msg) {
  const bw = document.createElement('div'); bw.className = 'bw';
  const bubble = makeBubble(msg); bw.appendChild(bubble);
  // Actions and version-nav go outside the bubble, below it
  if (bubble._actions) bw.appendChild(bubble._actions);
  if (bubble._vnav) bw.appendChild(bubble._vnav);
  const bt = document.createElement('div'); bt.className = 'bub-time'; bt.textContent = fmtTimeFull(msg.ts);
  const contact_ = S.currentContact ? S._contacts[S.currentContact] : null;
  if (cs(contact_?.xShowToken, S.settings.showToken) && msg.usage) {
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
  const contact_ = S.currentContact ? S._contacts[S.currentContact] : null;
  const showingAlt = msg.altVersions?.length && msg.altIdx != null;
  const displayContent = showingAlt ? (msg.altVersions[msg.altIdx]?.content ?? msg.content) : msg.content;
  const displayThinking = showingAlt ? (msg.altVersions[msg.altIdx]?.thinking ?? null) : msg.thinking;
  if (msg.id) _msgTextCache.set(msg.id, displayContent || msg.content || '');
  if (msg.type === 'voice') {
    b.innerHTML = makeVoiceHTML(msg);
    if (msg.transcript && S.settings.voiceReplyMode !== 'voice') {
      const tr = document.createElement('div'); tr.className = 'voice-trans'; tr.textContent = msg.transcript; b.appendChild(tr);
    }
  } else if (msg.type === 'image') {
    b.className = 'bubble img-bub';
    const _imgSrc = msg.imageData || msg.url || '';
    b.innerHTML = `<img src="${_imgSrc}" alt="图片" onclick="openLB('${_imgSrc}')" loading="lazy">`;
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
    if (displayThinking && cs(contact_?.xShowThink, S.settings.showThink)) html += `<details class="thinking-block"><summary>思考过程</summary><div style="margin-top:5px;white-space:pre-wrap">${esc(displayThinking)}</div></details>`;
    html += fmtText(displayContent || '');
    b.innerHTML = html;
  }
  if (!['image','sticker'].includes(msg.type)) {
    const acts = document.createElement('div'); acts.className = 'bub-actions';
    acts.innerHTML = `
      <button class="act-btn" onclick="copyMsg('${msg.id}')" title="复制">📋</button>
      <button class="act-btn" onclick="replyMsg('${msg.id}')" title="回复">↩️</button>
      <button class="act-btn" onclick="speakMsg('${msg.id}')" title="朗读">🔊</button>
      ${msg.role==='user'?`<button class="act-btn" onclick="editMsg('${msg.id}')" title="编辑">✏️</button>`:''}
      ${msg.role==='ai'?`<button class="act-btn" onclick="regenMsg('${msg.id}')" title="重新生成">🔄</button>`:''}
      <button class="act-btn" style="color:#e05a7a" onclick="deleteMsg('${msg.id}')" title="删除此条">🗑️</button>`;
    b._actions = acts;
    if (msg.role === 'ai' && msg.altVersions?.length) {
      const total = msg.altVersions.length + 1;
      const curPos = msg.altIdx != null ? msg.altIdx + 1 : total;
      const atOldest = msg.altIdx === 0;
      const atNewest = msg.altIdx == null;
      const vnav = document.createElement('div'); vnav.className = 'version-nav';
      vnav.innerHTML = `<button class="ver-btn" onclick="switchMsgVersion('${msg.id}',-1)" ${atOldest?'disabled':''}>‹</button><span class="ver-label">${curPos}/${total}</span><button class="ver-btn" onclick="switchMsgVersion('${msg.id}',1)" ${atNewest?'disabled':''}>›</button>`;
      b._vnav = vnav;
    }
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
  // If currently recording on mobile, stop recording and send as voice
  if (S.isRecording && _voiceIsTouch) {
    stopRec(); return;
  }
  const chat = S._chats[S.currentChat]; if (!chat) { toast('请先选择或新建对话'); return; }
  haptic(8);
  const text = $i('msg-input').value.trim();
  const files = [...S.pendingFiles];
  if (!text && !files.length) return;
  if (S.isStreaming) return;
  $i('msg-input').value = ''; autoH($i('msg-input')); onInputTyping();

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
    void _updateCompanionStats({ msgDelta:1, charDelta:text.length, contactId: S._chats[S.currentChat]?.contactId || null });
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
  const useUrl = contact?.apiUrl || s.apiUrl || 'https://openrouter.ai/api/v1/chat/completions';
  if (!useKey) { toast('请先填写 API Key！'); return; }
  S._abortCtrl = new AbortController();
  S.isStreaming = true; S._lockScroll = false; showTyping(); startHapticStream(); showStopBtn();
const t0 = Date.now();
try {
    const mems = await getRelevantMems(chatId, contact?.id || null);
    const msgs = await buildMsgs(chat, contact, mems);
    const baseModel = contact?.model || s.model || 'openai/gpt-4o';
    const model = baseModel + (S.onlineSearch && !baseModel.includes(':online') && !baseModel.includes('perplexity') ? ':online' : '');
    const useStream = cs(contact?.xStream, s.stream);
    const body = { model, messages: msgs, temperature: contact?.temp ?? parseFloat(s.temp), stream: useStream, max_tokens: 4096 };
    const res = await fetch(useUrl, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${useKey}`, 'Content-Type': 'application/json', 'HTTP-Referer': 'https://raimos.app', 'X-Title': 'Raimos' },
      body: JSON.stringify(body),
      signal: S._abortCtrl.signal,
    });
    if (!res.ok) { const e = await res.json().catch(() => ({error:{message:'Error'}})); throw new Error(e.error?.message || res.statusText); }
    removeTyping();
    let content = '', thinking = '', usage = null, streamTmpId = null;
    if (useStream) { const r = await handleStream(res, chatId); content = r.content; thinking = r.thinking; usage = r.usage; streamTmpId = r.tmpId; }
    else { const d = await res.json(); content = d.choices?.[0]?.message?.content || ''; thinking = d.choices?.[0]?.message?.reasoning || ''; usage = d.usage; }
    const { text: cleanText, stickers: stkList } = parseStickerTags(content);
    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
    const usageObj = usage ? {prompt:usage.prompt_tokens||0,completion:usage.completion_tokens||0,total:usage.total_tokens||0} : null;
    if (useStream && streamTmpId) {
      const tmpRow = await dbGet('messages', streamTmpId);
      if (tmpRow) { tmpRow.content = cleanText; tmpRow.thinking = thinking||null; tmpRow.elapsed = elapsed; tmpRow.usage = usageObj; await dbPut('messages', tmpRow); }
    } else {
      await addMsg(chatId, { role:'ai', type:'text', content:cleanText, thinking:thinking||null, elapsed, usage: usageObj });
    }
    for (const sk of stkList) await addMsg(chatId, { role:'ai', type:'sticker', content:sk.content, url:sk.url, isImg:sk.isImg });
    await maybeAiSendImage(chatId, contact, cleanText);
    await renderMsgs(); scrollTo_(false);
    if (cs(contact?.xAutoTts, s.autoTts) && cleanText) speakText(cleanText);
    checkKwAnims(cleanText, 'ai');
    if (cleanText) void _updateCompanionStats({ msgDelta:1, charDelta:cleanText.length, contactId: contact?.id || null });
    autoMemCheck(chatId, contact?.id || null);
  } catch(e) {
    removeTyping();
    if (e.name !== 'AbortError') {
      await addMsg(chatId, { role:'ai', type:'text', content:`❌ 出错了：${e.message}` });
      await renderMsgs(); scrollTo_(false);
    }
  }
  S.isStreaming = false; S._lockScroll = false; S._abortCtrl = null; stopHapticStream(); hideStopBtn();
}

function stopGeneration() {
  if (S._abortCtrl) { S._abortCtrl.abort(); removeTyping(); }
}
function showStopBtn() {
  const b = $i('btn-stop'); if (b) b.style.display = 'flex';
  const v = $i('btn-voice'); if (v) v.style.display = 'none';
  const s = $i('btn-send'); if (s) s.style.display = 'none';
}
function hideStopBtn() {
  const b = $i('btn-stop'); if (b) b.style.display = 'none';
  const v = $i('btn-voice'); if (v) v.style.display = '';
  const s = $i('btn-send'); if (s) s.style.display = '';
}

async function maybeAiSendImage(chatId, contact, context) {
  const s = S.settings;
  if (!cs(contact?.xAiChatImages, s.aiChatImages)) return;
  const freq = cs(contact?.xAiChatImageFreq, s.aiChatImageFreq) || 20;
  if (Math.random() * 100 > freq) return;
  const sources = (cs(contact?.xAiChatImageSources, s.aiChatImageSources) || 'album').split(',').map(x => x.trim()).filter(Boolean);
  const pick = sources[Math.floor(Math.random() * sources.length)];
  try {
    if (pick === 'album') {
      // 我的相册 = 照片 + 表情包合并，先找相册照片，没有再找表情包
      const albumUrl = await pickAlbumPhoto(context);
      if (albumUrl) { await addMsg(chatId, { role:'ai', type:'image', imageData:albumUrl, content:'[图片]' }); return; }
      const stk = await pickSticker(context);
      if (stk) await addMsg(chatId, { role:'ai', type:'sticker', content:stk.label||stk.content, url:stk.url, isImg:stk.isImg });
    } else if (pick === 'search') {
      const key = s.unsplashKey?.trim(); if (!key) return;
      const kw = encodeURIComponent(context.slice(0, 30) || 'cute');
      const r = await fetch(`https://api.unsplash.com/photos/random?query=${kw}&client_id=${key}`);
      const d = await r.json();
      const url = d?.urls?.regular;
      if (url) await addMsg(chatId, { role:'ai', type:'image', imageData:url, content:'[图片]' });
    } else if (pick === 'generate') {
      const apiKey = contact?.apiKey || s.apiKey; if (!apiKey) return;
      const url = await generateMomentImage(context, contact);
      if (url) await addMsg(chatId, { role:'ai', type:'img_gen', url, content:'[生成图片]' });
    }
  } catch(e) { /* silent fail */ }
}

async function handleStream(res, chatId, updateMsgId=null) {
  const reader = res.body.getReader(), dec = new TextDecoder();
  let content = '', thinking = '', usage = null;
  const tmpId = updateMsgId || uid();
  if (!updateMsgId) {
    await dbPut('messages', { id:tmpId, chatId, role:'ai', type:'text', content:'', ts:Date.now() });
    await renderMsgs();
  }
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
  return { content, thinking, usage, tmpId };
}

async function buildMsgs(chat, contact, mems) {
  const msgs = [];
  let sys = cs(contact?.system, S.settings.systemPrompt) || '你是一个可爱温柔的AI助手。';
  if (mems.length) sys += `\n\n[用户记忆]\n${mems.map(m=>`- ${m.text}`).join('\n')}`;
  if (S._stickers.length) {
    const slist = S._stickers.map(s => `${s.label||s.content||'表情'}`).join(', ');
    const stickerHint = S.settings.stickerCallPrompt ? `\n${S.settings.stickerCallPrompt}` : '';
    sys += `\n\n[表情包库] 可在回复中用 [sticker:标签名] 插入表情。可用: ${slist}${stickerHint}`;
  }
  // Inject current date/time/season so AI knows the time context naturally
  sys += `\n\n[背景参考] ${buildDatetimeCtx()}，请自然融入此背景，不要主动播报时间或日期。`;
  msgs.push({ role:'system', content:sys });
  if (chat.summary) msgs.push({ role:'system', content:`[历史摘要] ${chat.summary}` });
  const allMsgs = await dbGetAll('messages', 'chatId', chat.id);
  allMsgs.sort((a,b) => a.ts - b.ts);
  const recent = allMsgs.slice(-parseInt(cs(contact?.xCtx, S.settings.ctx))||20);
  for (const m of recent) {
    if (m.type === 'image' && m.imageData && m.role === 'user') msgs.push({ role:'user', content: [{type:'image_url',image_url:{url:m.imageData}},{type:'text',text:'（图片）'}] });
    else if (m.type === 'image' && m.role !== 'user') msgs.push({ role:'assistant', content: m.content || '[图片]' });
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
  const contact = S.currentContact ? S._contacts[S.currentContact] : null;
  const apiKey = contact?.apiKey || S.settings.apiKey;
  if (!apiKey) return;
  const apiUrl = contact?.apiUrl || S.settings.apiUrl || 'https://openrouter.ai';
  toast('🎨 生成图片中…'); showTyping();
  try {
    const res = await fetch(apiUrl + '/api/v1/images/generations', {
      method:'POST', headers:{'Authorization':`Bearer ${apiKey}`,'Content-Type':'application/json'},
      body:JSON.stringify({ model:cs(contact?.xImgGenModel, S.settings.imgGenModel)||'openai/dall-e-3', prompt, n:1, size:'1024x1024' }),
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
let _memFilter = null; // null = global (no contactId), 'all' = all, or contactId string
function renderMemories(filter) {
  if (filter !== undefined) _memFilter = filter;
  const list = $i('memory-list'); if (!list) return;
  // Build filter tabs
  const tabBar = $i('memory-tabs');
  if (tabBar) {
    const contacts = Object.values(S._contacts);
    tabBar.innerHTML = [
      {id:'all', label:'全部'},
      {id:null, label:'🌐 全局'},
      ...contacts.map(c => ({id: c.id, label: c.avatar?.startsWith('data:')?`🤖 ${c.name}`:`${c.avatar||'🤖'} ${c.name}`}))
    ].map(t => `<button class="mem-tab${_memFilter===t.id?' active':''}" onclick="renderMemories('${t.id === null ? '__null__' : t.id}')">${esc(t.label)}</button>`).join('');
  }
  const curFilter = _memFilter === '__null__' ? null : _memFilter;
  const shown = curFilter === 'all' ? S._memories :
                curFilter === null ? S._memories.filter(m => !m.contactId) :
                S._memories.filter(m => !m.contactId || m.contactId === curFilter);
  $i('memory-stats').textContent = `共 ${S._memories.length} 条记忆（显示 ${shown.length} 条）`;
  const catI = {健康:'🏥',个人:'👤',习惯:'🔄',事件:'📅',其他:'💡'};
  if (!shown.length) { list.innerHTML = '<div style="text-align:center;padding:30px;color:var(--text3);font-size:13px">这里还没有记忆<br>聊天时AI会自动记住重要信息</div>'; return; }
  list.innerHTML = '';
  shown.forEach(m => {
    const i = S._memories.indexOf(m);
    const ctName = m.contactId ? (S._contacts[m.contactId]?.name || '?') : '全局';
    const div = document.createElement('div'); div.className = 'memory-item';
    div.innerHTML = `<div class="mem-icon">${catI[m.cat]||'💡'}</div>
      <div class="mem-body"><div class="mem-text">${esc(m.text)}</div><div class="mem-meta"><span class="mem-tag">${m.cat||'其他'}</span><span class="mem-tag" style="background:var(--hover)">${ctName}</span>${fmtDate(m.ts)}</div></div>
      <button class="mem-del" onclick="delMem(${i})">🗑️</button>`;
    list.appendChild(div);
  });
}
function openAddMemModal() {
  $i('amm-text').value='';
  const sel = $i('amm-contact');
  if (sel) { sel.innerHTML = '<option value="">🌐 全局（所有助手）</option>' + Object.values(S._contacts).map(c=>`<option value="${c.id}">${esc(c.name)}</option>`).join(''); }
  $i('add-mem-modal').classList.add('show');
}
async function addMemManual() {
  const text=$i('amm-text').value.trim(); if(!text){toast('请输入内容');return;}
  const contactId = $i('amm-contact')?.value || null;
  const mem={id:uid(),text,cat:$i('amm-cat').value,ts:Date.now(),auto:false,contactId:contactId||null};
  await dbPut('memories',mem); S._memories.push(mem);
  renderMemories(); closeModal('add-mem-modal'); toast('✅ 记忆已添加');
}
async function delMem(i) { const id=S._memories[i].id; await dbDel('memories',id); fbDel('memories',id); S._memories.splice(i,1); renderMemories(); }

async function getRelevantMems(chatId, contactId) {
  const pool = S._memories.filter(m => !m.contactId || m.contactId === contactId);
  if (!pool.length) return [];
  const msgs = await dbGetAll('messages','chatId',chatId);
  const lastText = msgs.slice(-3).map(m=>m.content||'').join(' ');
  if (!lastText.trim()) return [];
  const rKey = (contactId && S._contacts[contactId]?.apiKey) || S.settings.apiKey;
  if (!rKey) return pool.slice(0,5);
  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions',{method:'POST',headers:{'Authorization':`Bearer ${rKey}`,'Content-Type':'application/json'},body:JSON.stringify({model:'openai/gpt-4o-mini',max_tokens:150,stream:false,messages:[{role:'system',content:'从记忆列表中找与当前对话相关的条目，返回JSON: {"relevant":[0,2]}，只返回JSON。'},{role:'user',content:`对话: ${lastText}\n记忆:\n${pool.map((m,i)=>`${i}: ${m.text}`).join('\n')}`}]})});
    const d = await res.json(); const raw = d.choices?.[0]?.message?.content||'{}';
    const j = JSON.parse(raw.replace(/```json|```/g,'').trim());
    return (j.relevant||[]).map(i=>pool[i]).filter(Boolean);
  } catch(e) { return pool.slice(0,3); }
}

async function autoMemCheck(chatId, contactId) {
  if (!S.settings.autoMemEnabled) return;
  const msgs = await dbGetAll('messages','chatId',chatId);
  const interval = Math.max(1, parseInt(S.settings.autoMemInterval)||5);
  const aiMsgCount = msgs.filter(m=>m.role==='ai').length;
  if (aiMsgCount % interval !== 0) return;
  const lastText = msgs.slice(-4).map(m=>`${m.role==='user'?'用户':'AI'}: ${m.content||'[媒体]'}`).join('\n');
  const mKey = (contactId && S._contacts[contactId]?.apiKey) || S.settings.apiKey;
  if (!mKey) return;
  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions',{method:'POST',headers:{'Authorization':`Bearer ${mKey}`,'Content-Type':'application/json'},body:JSON.stringify({model:'openai/gpt-4o-mini',max_tokens:200,stream:false,messages:[{role:'system',content:'分析对话，判断是否有值得长期记忆的信息（个人信息/健康禁忌/长期习惌/重要事件），重要程度≥7才记录。返回JSON: {"shouldSave":true,"text":"内容","cat":"健康","score":8}，只返回JSON。'},{role:'user',content:lastText}]})});
    const d = await res.json(); const raw = d.choices?.[0]?.message?.content||'{}';
    const j = JSON.parse(raw.replace(/```json|```/g,'').trim());
    if (j.shouldSave && j.text && (j.score||0)>=7 && S._memories.length<50) {
      if (!S._memories.some(m=>m.text===j.text)) {
        const mem={id:uid(),text:j.text,cat:j.cat||'其他',ts:Date.now(),auto:true,contactId:contactId||null};
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
  const chat = S._chats[chatId]; const contact = chat.contactId ? S._contacts[chat.contactId] : null;
  const th = parseInt(cs(contact?.xSumThresh, S.settings.sumThresh))||40;
  const msgs = await dbGetAll('messages','chatId',chatId);
  if (msgs.length < th) return;
  if (chat._lastSumLen && msgs.length - chat._lastSumLen < th) return;
  await doSummary(chatId, false);
}
async function doSummary(chatId, force) {
  const chat = S._chats[chatId]; if (!chat) return;
  const sumContact = chat.contactId ? S._contacts[chat.contactId] : null;
  const sumKey = sumContact?.apiKey || S.settings.apiKey; if (!sumKey) return;
  const cSumThresh = parseInt(cs((chat.contactId?S._contacts[chat.contactId]:null)?.xSumThresh, S.settings.sumThresh))||40;
  const msgs = await dbGetAll('messages','chatId',chatId);
  msgs.sort((a,b)=>a.ts-b.ts);
  const toSum = force ? msgs : msgs.slice(0, -Math.floor(cSumThresh/3));
  if (toSum.length < 5) return;
  const hist = toSum.map(m=>`${m.role==='user'?'用户':'AI'}: ${m.content||'[媒体]'}`).join('\n');
  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions',{method:'POST',headers:{'Authorization':`Bearer ${sumKey}`,'Content-Type':'application/json'},body:JSON.stringify({model:'openai/gpt-4o-mini',max_tokens:400,stream:false,messages:[{role:'system',content:'将对话压缩为简洁摘要（200字内），保留关键信息。'},{role:'user',content:hist}]})});
    const d = await res.json(); const sumText = d.choices?.[0]?.message?.content||'';
    if (sumText) {
      chat.summary = (chat.summary?chat.summary+'\n':'')+sumText;
      if (force) { for (const m of msgs) await dbDel('messages',m.id); }
      else { const keep=msgs.slice(-Math.floor(cSumThresh/3)); const toDelete=msgs.slice(0,-keep.length); for(const m of toDelete) await dbDel('messages',m.id); }
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
  if (!moments.length) { feed.innerHTML='<div style="text-align:center;padding:40px;color:var(--text3);font-size:13.5px">朋友圈还是空的<br>发布第一条动态吧！🌸</div>'; _renderMomentsNotif([]); return; }
  for (const m of moments) {
    const card = await makeMomentCard(m);
    feed.appendChild(card);
  }
  _renderMomentsNotif(moments);
}

async function _renderMomentsNotif(moments) {
  const notifEl = $i('moments-notif'); if (!notifEl) return;
  const lastVisit = S.settings.lastMomentsVisit || 0;
  const myName = S.settings.userName || '我';
  const allComments = await dbGetAll('comments');
  const newComments = allComments.filter(c => c.ts > lastVisit && c.author !== myName && c.replyTo === myName);
  const newLikes = moments.filter(m => m.author === myName && m.ts < lastVisit && (m.lastLikeTs||0) > lastVisit);
  const msgs = [];
  if (newComments.length) {
    const names = [...new Set(newComments.map(c=>c.author))];
    msgs.push(`💬 ${names.slice(0,3).join('、')}${names.length>3?'等':''}评论了你`);
  }
  if (msgs.length) {
    notifEl.textContent = msgs.join('　') + '　点击查看 →';
    notifEl.style.display = 'block';
    const firstNewComment = newComments[0];
    notifEl.onclick = () => {
      notifEl.style.display='none';
      saveSetting('lastMomentsVisit', Date.now());
      if (firstNewComment) {
        const card = $i('mc-'+firstNewComment.momentId);
        if (card) {
          card.scrollIntoView({behavior:'smooth', block:'center'});
          // Expand comments and highlight
          const cl = $i('clist-'+firstNewComment.momentId), ri = $i('ri-'+firstNewComment.momentId);
          if (cl) { cl.style.display='flex'; cl.style.flexDirection='column'; cl.style.gap='5px'; }
          if (ri) ri.style.display='flex';
          setTimeout(() => {
            const ci = $i('ci-'+firstNewComment.id);
            if (ci) { ci.style.background='color-mix(in srgb,var(--accent) 15%,transparent)'; ci.style.borderRadius='8px'; setTimeout(()=>ci.style.background='',2000); }
          }, 400);
        }
      }
    };
  } else {
    notifEl.style.display = 'none';
  }
}

async function makeMomentCard(m) {
  const comments = await dbGetAll('comments','momentId',m.id);
  comments.sort((a,b)=>a.ts-b.ts);
  const card = document.createElement('div'); card.className = 'moment-card' + (!(m.images||[]).length ? ' moment-card-text-only' : ''); card.id='mc-'+m.id;
  const avHTML = m.avatar?.startsWith('data:') ? `<img src="${m.avatar}">` : (m.avatar||'😊');
  const nImg = (m.images||[]).length;
  const imgGrid = nImg ? `<div class="moment-images n${Math.min(nImg,4)}">${(m.images||[]).slice(0,4).map(url=>`<div class="mi"><img src="${url}" loading="lazy" onclick="openLB('${url}')"></div>`).join('')}</div>` : '';
  const aiNames = new Set(Object.values(S._contacts).map(ct => ct.name));
  const commHTML = comments.map(c => {
    const isAiCmt = aiNames.has(c.author);
    return `
    <div class="comment-item" id="ci-${c.id}">
      <span class="comment-author">${esc(c.author)}</span>
      ${c.replyTo?`<span class="comment-reply-to">回复 ${esc(c.replyTo)}：</span>`:''}
      ${esc(c.text)}
      <span class="comment-actions">
        <button class="c-act" onclick="replyComment('${m.id}','${c.id}','${esc(c.author)}')">回复</button>
        ${isAiCmt?`<button class="c-act" title="重新生成" onclick="regenComment('${m.id}','${c.id}')">🔄</button>`:''}
        <button class="c-act" onclick="delComment('${m.id}','${c.id}')">删除</button>
      </span>
    </div>`;
  }).join('');
  card.innerHTML = `
    <div class="moment-header">
      <div class="moment-av">${typeof avHTML==='string'&&avHTML.startsWith('<img')?avHTML:`<span>${avHTML}</span>`}</div>
      <div><div class="moment-author">${esc(m.author||S.settings.userName||'我')}</div><div class="moment-time">${fmtTimeFull(m.ts)}</div></div>
      <button style="margin-left:auto;background:none;border:none;cursor:pointer;color:var(--text3);font-size:14px" onclick="delMoment('${m.id}')">✕</button>
    </div>
    <div class="moment-text">${fmtText(m.text||'')}</div>
    ${S.settings.showMomentToken && m.usage && m.byAi ? `<div style="font-size:10px;color:var(--text3);margin:2px 0 4px">🪙 ${m.usage.total} tokens (提示:${m.usage.prompt} 回复:${m.usage.completion})</div>` : ''}
    ${imgGrid}
    <div class="moment-footer">
      <div class="moment-actions">
        <button class="m-act-btn${_hasLiked(m)?` liked`:``}" onclick="likeMoment('${m.id}')">❤️ ${m.likes||0}</button>
        <button class="m-act-btn" onclick="toggleComments('${m.id}')">💬 ${comments.length} 评论</button>
        ${(S.settings.apiKey||Object.values(S._contacts).some(c=>c.apiKey))?`<button class="m-act-btn" onclick="openAiCommentModal('${m.id}')">🤖 让AI评论</button>`:''}
      </div>
      <div class="comments-list" id="clist-${m.id}" style="display:none">${commHTML}</div>
      <div class="reply-input-wrap" id="ri-${m.id}" style="display:none">
        <textarea id="rinp-${m.id}" placeholder="写评论…" rows="1" onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();submitComment('${m.id}')}else{setTimeout(()=>{this.style.height='auto';this.style.height=Math.min(this.scrollHeight,120)+'px'},0)}"></textarea>
        <button class="reply-send" onclick="submitComment('${m.id}')">➤</button>
      </div>
    </div>`;
  return card;
}

async function postMoment(src) {
  const isModal = src === 'modal';
  const textEl = isModal ? $i('compose-modal-text') : $i('compose-text');
  const text = textEl?.value?.trim() || '';
  const pics = isModal ? (S._composeModalPics||[]) : (S._composePics||[]);
  const images = pics.map(p=>p.dataUrl);
  if (!text && !images.length) { toast('请输入内容或添加图片'); return; }
  const m = { id:uid(), author:S.settings.userName||'我', avatar:S.settings.userAvatar||'😊', text, images, ts:Date.now(), likes:0 };
  await dbPut('moments', m);
  if (isModal) {
    if (textEl) textEl.value='';
    S._composeModalPics=[];
    const prev=$i('compose-modal-img-previews'); if(prev) prev.innerHTML='';
    const em=$i('compose-modal-emoji'); if(em) em.style.display='none';
    closeModal('compose-moment-modal');
  } else {
    if (textEl) textEl.value='';
    S._composePics=[];
    const prev=$i('compose-img-previews'); if(prev) prev.innerHTML='';
    const em=$i('compose-emoji'); if(em) em.style.display='none';
  }
  await renderMoments(); toast('✅ 发布成功！');
}

function openComposeMomentModal() {
  S._composeModalPics = [];
  const prev = $i('compose-modal-img-previews'); if(prev) prev.innerHTML='';
  const ta = $i('compose-modal-text'); if(ta) ta.value='';
  const em = $i('compose-modal-emoji'); if(em) em.style.display='none';
  buildComposeModalEmojiGrid();
  $i('compose-moment-modal').classList.add('show');
}

function buildComposeModalEmojiGrid() {
  const grid=$i('compose-modal-emoji-grid'); if(!grid||grid.children.length) return;
  const emojis=['😊','😂','🥰','😍','😭','😤','😎','🥺','😅','🤔','🎉','✨','💕','🌸','🐱','🐻','🎵','🌈','⭐','🍕','☕','🌙'];
  emojis.forEach(e=>{const b=document.createElement('button');b.textContent=e;b.style.cssText='font-size:22px;padding:3px;border:none;background:none;cursor:pointer;border-radius:6px;';b.onclick=()=>{const ta=$i('compose-modal-text');if(ta)ta.value+=e;};grid.appendChild(b);});
}

function toggleComposeModalEmoji() {
  const ce=$i('compose-modal-emoji'); if(!ce) return;
  ce.style.display=ce.style.display==='none'?'block':'none';
}

function toggleMomentsManageMenu(e) {
  e.stopPropagation();
  closeMomentsNewMenu();  // close the other menu first
  const menu=$i('moments-manage-menu'); if(!menu) return;
  const show=menu.style.display==='none';
  menu.style.display=show?'flex':'none';
  if(show) setTimeout(()=>document.addEventListener('click',closeMomentsManageMenu,{once:true}),0);
}
function closeMomentsManageMenu() { const m=$i('moments-manage-menu');if(m)m.style.display='none'; }

function toggleMomentsNewMenu(e) {
  e.stopPropagation();
  closeMomentsManageMenu();  // close the other menu first
  const menu=$i('moments-new-menu'); if(!menu) return;
  const show=menu.style.display==='none';
  menu.style.display=show?'flex':'none';
  if(show) setTimeout(()=>document.addEventListener('click',closeMomentsNewMenu,{once:true}),0);
}
function closeMomentsNewMenu() { const m=$i('moments-new-menu');if(m)m.style.display='none'; }

function importMomentsFile() { $i('moments-import-file')?.click(); }
async function doImportMoments(input) {
  const file=input.files[0];if(!file)return;
  const fr=new FileReader();
  fr.onload=async e=>{
    try{
      const d=JSON.parse(e.target.result);
      if(d.moments)for(const m of d.moments)await dbPut('moments',m);
      if(d.comments)for(const c of d.comments)await dbPut('comments',c);
      await renderMoments();toast('✅ 朋友圈导入成功');
    }catch(err){toast('❌ 文件格式有误');}
  };
  fr.readAsText(file);input.value='';
}

async function fbDel(collection, docId) {
  if (!window._fbUser || !window._fbDb || !window._fbLib) return;
  try {
    const { doc, deleteDoc } = window._fbLib;
    await deleteDoc(doc(window._fbDb, 'users', window._fbUser.uid, collection, docId));
  } catch(e) { console.warn('fbDel error', e); }
}

async function delMoment(id) {
  if (!confirm('删除这条动态？')) return;
  await dbDel('moments',id);
  fbDel('moments', id);
  const comments = await dbGetAll('comments','momentId',id);
  for (const c of comments) { await dbDel('comments',c.id); fbDel('comments', c.id); }
  await renderMoments();
}

function _hasLiked(m) {
  const liked = JSON.parse(localStorage.getItem('raimosMomentLikes')||'{}');
  return !!liked[m.id];
}
async function likeMoment(id) {
  const m = await dbGet('moments',id); if(!m) return;
  const liked = JSON.parse(localStorage.getItem('raimosMomentLikes')||'{}');
  if (liked[id]) { toast('已经点过赞了 ❤️'); return; }
  m.likes = (m.likes||0)+1;
  m.lastLikeTs = Date.now();
  await dbPut('moments',m);
  liked[id] = true;
  localStorage.setItem('raimosMomentLikes', JSON.stringify(liked));
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
  if (inp) { inp.placeholder=`回复 ${author}…`; inp.focus(); inp.style.height='auto'; }
  const cl = $i('clist-'+momentId), ri = $i('ri-'+momentId);
  if(cl) cl.style.display='flex';
  if(ri) ri.style.display='flex';
}
async function submitComment(momentId) {
  const inp=$i('rinp-'+momentId); if(!inp)return;
  const text=inp.value.trim(); if(!text)return;
  const rt=_replyingTo[momentId];
  const c={id:uid(),momentId,author:S.settings.userName||'我',text,replyTo:rt?.author||null,ts:Date.now()};
  await dbPut('comments',c); delete _replyingTo[momentId]; inp.value=''; inp.style.height='auto';
  // Write to Firestore so backend can trigger AI reply
  if (window._fbUser && window._fbDb && window._fbLib) {
    try {
      const m = await dbGet('moments', momentId);
      const contactId = m?.contactId;
      const needsReply = !!contactId;
      const { doc, setDoc } = window._fbLib;
      await setDoc(doc(window._fbDb,'users',window._fbUser.uid,'comments',c.id),
        {...c, needsAiReply: needsReply, replied: false, contactId: contactId||null});
    } catch(e) { console.warn('comment sync error', e); }
  }
  inp.placeholder='写评论…';
  const m = await dbGet('moments',momentId);
  if(m){const card=await makeMomentCard(m);const old=$i('mc-'+momentId);if(old)old.replaceWith(card);}
  const cl2=$i('clist-'+momentId),ri2=$i('ri-'+momentId);
  if(cl2){cl2.style.display='flex';cl2.style.flexDirection='column';}if(ri2)ri2.style.display='flex';
  // Case 1: replying to an AI's comment on any post — trigger that AI to reply back
  if (rt?.commentId) {
    const allComments2 = await dbGetAll('comments');
    const original = allComments2.find(x => x.id === rt.commentId);
    if (original) {
      const aiContact = Object.values(S._contacts).find(ct => ct.name === original.author);
      if (aiContact && cs(aiContact?.xReplyMomentComments, S.settings.replyMomentComments)) {
        const delayMs = (cs(aiContact?.xReplyDelay, S.settings.replyDelay) || 120) * 1000 * (0.4 + Math.random()*0.8);
        setTimeout(() => aiReplyComment(momentId, c, aiContact.id), delayMs);
      }
    }
  }
  // Case 2: commenting on an AI's own post (not a reply) — trigger AI reply
  if (!rt && m?.contactId) {
    const contact = S._contacts[m.contactId];
    if (contact && cs(contact?.xReplyMomentComments, S.settings.replyMomentComments)) {
      const delayMs = (cs(contact?.xReplyDelay, S.settings.replyDelay) || 120) * 1000 * (0.4 + Math.random()*0.8);
      setTimeout(() => aiReplyComment(momentId, c, m.contactId), delayMs);
    }
  }
}
async function delComment(momentId, commentId) {
  await dbDel('comments',commentId);
  fbDel('comments', commentId);
  const m = await dbGet('moments',momentId);
  if(m){const card=await makeMomentCard(m);const old=$i('mc-'+momentId);if(old)old.replaceWith(card);}
}
async function regenComment(momentId, commentId) {
  const comment = await dbGet('comments', commentId); if (!comment) return;
  const contact = Object.values(S._contacts).find(ct => ct.name === comment.author);
  if (!contact) { toast('找不到对应助手'); return; }
  const wasReplyTo = comment.replyTo;  // preserve original replyTo info
  await dbDel('comments', commentId);
  const m = await dbGet('moments', momentId);
  if (m) { const card = await makeMomentCard(m); const old = $i('mc-'+momentId); if(old) old.replaceWith(card); }
  const cl = $i('clist-'+momentId); if(cl) { cl.style.display='flex'; cl.style.flexDirection='column'; }
  if (wasReplyTo) {
    // It was a reply — find the comment being replied to and re-generate a reply
    const allComments = await dbGetAll('comments', 'momentId', momentId);
    const targetComment = allComments.find(c => c.author === wasReplyTo && !c.replyTo);
    if (targetComment) { await aiReplyComment(momentId, targetComment, contact.id); return; }
  }
  await aiCommentMoment(momentId, contact.id);
}
function openAiPostModal() {
  const sel = $i('apm-contact');
  const contacts = Object.values(S._contacts);
  if (!contacts.length) { toast('请先添加 AI 助手'); return; }
  sel.innerHTML = contacts.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('');
  $i('ai-post-modal').classList.add('show');
}
function openAiCommentModal(momentId) {
  const contacts = Object.values(S._contacts);
  if (!contacts.length) { aiCommentMoment(momentId, null); return; }
  const sel = $i('acm-contact');
  if (sel) sel.innerHTML = contacts.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('');
  const modal = $i('ai-comment-modal');
  if (modal) { modal.dataset.momentId = momentId; modal.classList.add('show'); }
  else aiCommentMoment(momentId, null);
}
function doAiComment() {
  const modal = $i('ai-comment-modal'); if (!modal) return;
  const momentId = modal.dataset.momentId;
  const contactId = $i('acm-contact')?.value || null;
  closeModal('ai-comment-modal');
  aiCommentMoment(momentId, contactId);
}
async function doAiPost() {
  const contactId = $i('apm-contact')?.value;
  const imgPrompt = $i('apm-img-prompt')?.value?.trim() || '';
  closeModal('ai-post-modal');
  await aiPostMoment(contactId, imgPrompt || null);
}
async function fetchUnsplashImage(query) {
  const key = S.settings.unsplashKey; if (!key) return null;
  try {
    const res = await fetch(`https://api.unsplash.com/photos/random?query=${encodeURIComponent(query.slice(0,40))}&orientation=squarish&client_id=${key}`);
    const d = await res.json();
    return d?.urls?.small || d?.urls?.regular || null;
  } catch(e) { return null; }
}
async function generateMomentImage(prompt, contact) {
  const model = cs(contact?.xImgGenModel, S.settings.imgGenModel) || 'openai/dall-e-3';
  const apiKey = contact?.apiKey || S.settings.apiKey;
  const apiUrl = (contact?.apiUrl || S.settings.apiUrl || 'https://openrouter.ai');
  try {
    const res = await fetch(apiUrl + '/api/v1/images/generations', {
      method:'POST', headers:{'Authorization':`Bearer ${apiKey}`,'Content-Type':'application/json'},
      body: JSON.stringify({ model, prompt: `朋友圈配图：${prompt.slice(0,60)}，自然真实温馨风格`, n:1, size:'1024x1024' })
    });
    const d = await res.json(); return d.data?.[0]?.url || null;
  } catch(e) { return null; }
}
function buildMomentSysPrompt(contact) {
  const s = S.settings;
  const base = cs(contact?.system, s.systemPrompt) || '可爱温柔的AI';
  const extra = cs(contact?.xMomentPrompt, s.momentPrompt) || '';
  const mode = cs(contact?.xMomentPromptMode, s.momentPromptMode) || 'add';
  if (mode === 'replace' && extra) return extra;
  return extra ? `${base}\n\n[朋友圈指令] ${extra}` : base;
}

// Weather context cache (30-min TTL). Calls Open-Meteo (free, no key).
const _wxCache = { ts: 0, city: '', text: '' };
async function fetchWeatherCtx() {
  const city = S.settings.city?.trim();
  if (!city) return '';
  const now = Date.now();
  if (_wxCache.city === city && now - _wxCache.ts < 30 * 60 * 1000) return _wxCache.text;
  try {
    const geoRes = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=zh&format=json`,
      { signal: AbortSignal.timeout(5000) }
    );
    if (!geoRes.ok) return '';
    const geo = (await geoRes.json()).results?.[0];
    if (!geo) return '';
    const wRes = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${geo.latitude}&longitude=${geo.longitude}` +
      `&current=temperature_2m,apparent_temperature,weather_code&timezone=auto&forecast_days=1`,
      { signal: AbortSignal.timeout(6000) }
    );
    if (!wRes.ok) return '';
    const c = (await wRes.json()).current;
    const WMO = {0:'晴天',1:'基本晴朗',2:'局部多云',3:'阴天',45:'有雾',48:'冻雾',
      51:'小毛毛雨',53:'毛毛雨',55:'浓密毛毛雨',61:'小雨',63:'中雨',65:'大雨',
      80:'阵雨',81:'中阵雨',82:'强阵雨',95:'雷暴',96:'冰雹雷暴',99:'强冰雹雷暴'};
    const text = `${city}当前天气：${WMO[c.weather_code]??'未知'}，${Math.round(c.temperature_2m)}℃（体感${Math.round(c.apparent_temperature)}℃）`;
    Object.assign(_wxCache, { ts: now, city, text });
    return text;
  } catch { return ''; }
}

// Build a date/time context string using the browser's local clock.
function buildDatetimeCtx() {
  const now = new Date();
  const dateStr = now.toLocaleDateString('zh-CN', { year:'numeric', month:'long', day:'numeric', weekday:'long' });
  const h = now.getHours();
  const partOfDay = h < 6 ? '深夜' : h < 9 ? '清晨' : h < 12 ? '上午' : h < 14 ? '中午' : h < 18 ? '下午' : h < 21 ? '傍晚' : '晚上';
  const timeStr = `${String(h).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
  return `现在是${dateStr} ${partOfDay}${timeStr}`;
}

async function aiPostMoment(contactId, extraImgPromptOverride) {
  const contact = contactId ? S._contacts[contactId] : Object.values(S._contacts)[0];
  if (!contact || !(contact.apiKey || S.settings.apiKey)) { toast('需要配置助手和 API Key'); return; }
  const aiName = contact.name || S.settings.aiName || 'AI';
  const aiAvatar = contact.avatar || S.settings.aiAvatar || '🤖';
  const apiKey = contact.apiKey || S.settings.apiKey;
  const apiUrl = (contact.apiUrl || S.settings.apiUrl || 'https://openrouter.ai');
  toast('🌸 AI 正在发朋友圈…');
  try {
    const useImages = cs(contact?.xPostImages, S.settings.postImages);
    const imageFreq = cs(contact?.xImageFreq, S.settings.imageFreq) || 50;
    const imageSources = (cs(contact?.xImageSources, S.settings.imageSources) || 'album').split(',').filter(Boolean);

    // Resolve image prompt: per-contact > global setting > one-off modal override
    const settingsImgPrompt = cs(contact?.xMomentImgPrompt, S.settings.momentImgPrompt) || null;
    const extraImgPrompt = extraImgPromptOverride || settingsImgPrompt;

    // Build real date/time + weather context as background reference only
    const datetimeCtx = buildDatetimeCtx();
    const weatherCtx  = await fetchWeatherCtx();
    const envCtx = [datetimeCtx, weatherCtx ? `（参考背景：${weatherCtx}，仅供参考，不要主动播报天气）` : ''].filter(Boolean).join('。') + '。';

    // Generate text
    const res = await fetch(apiUrl + '/api/v1/chat/completions', {
      method:'POST', headers:{'Authorization':`Bearer ${apiKey}`,'Content-Type':'application/json'},
      body: JSON.stringify({ model: contact.model||S.settings.model||'openai/gpt-4o-mini', max_tokens:120, stream:false,
        messages:[{role:'system',content:`你是${aiName}，${buildMomentSysPrompt(contact)}。写一条自然、真实的朋友圈动态，50字以内，不要用"AI"或"助手"自称，像真人朋友一样分享日常/心情/想法，可带emoji。不要写成天气预报或天气播报。`},{role:'user',content:`${envCtx}\n写一条今天的朋友圈动态。`}]
      })
    });
    const d = await res.json(); const text = d.choices?.[0]?.message?.content?.trim();
    const postUsage = d.usage ? {prompt:d.usage.prompt_tokens||0,completion:d.usage.completion_tokens||0,total:d.usage.total_tokens||0} : null;
    if (!text) { toast('AI 生成失败'); return; }
    let images = [];
    if (useImages && Math.random()*100 < imageFreq && imageSources.length) {
      // Shuffle sources and try each until one succeeds
      const shuffled = [...imageSources].sort(() => Math.random()-0.5);
      for (const src of shuffled) {
        if (src === 'album') {
          // 我的相册 = 照片 + 表情包，先找标签匹配的照片，没有再找表情包
          const albumUrl = await pickAlbumPhoto(text);
          if (albumUrl) { images.push(albumUrl); break; }
          const imgStickers = S._stickers.filter(s => s.isImg);
          if (imgStickers.length) { const sk = imgStickers[Math.floor(Math.random()*imgStickers.length)]; if (sk?.url||sk?.dataUrl) { images.push(sk.url||sk.dataUrl); break; } }
        }
        if (src === 'search' && S.settings.unsplashKey) {
          const imgUrl = await fetchUnsplashImage(extraImgPrompt || text);
          if (imgUrl) { images.push(imgUrl); break; }
        }
        if (src === 'generate' && apiKey) {
          toast('🎨 生成配图中…');
          const imgUrl = await generateMomentImage(extraImgPrompt || text, contact);
          if (imgUrl) { images.push(imgUrl); break; }
        }
      }
    }
    const m = { id:uid(), author:aiName, avatar:aiAvatar, text, images, ts:Date.now(), likes:0, byAi:true, contactId:contact.id, usage:postUsage };
    await dbPut('moments', m);
    await renderMoments(); toast(`✅ ${aiName} 发了朋友圈！`);
  } catch(e) { toast('❌ AI 发朋友圈失败：'+e.message); }
}

// ── MOMENTS AUTO-SCHEDULING ──
function initMomentTimers() {
  Object.values(S._momentTimers).forEach(t => { clearTimeout(t.post); clearTimeout(t.comment); });
  S._momentTimers = {};
  Object.values(S._contacts).forEach(c => {
    const momentsOn = cs(c?.xMomentsEnabled, S.settings.momentsEnabled);
    if (!momentsOn) return;
    if (cs(c?.xAutoPost, S.settings.autoPost)) scheduleMomentPost(c.id);
    if (cs(c?.xAutoComment, S.settings.autoComment)) scheduleMomentComment(c.id);
  });
}
function scheduleMomentPost(contactId) {
  const c = S._contacts[contactId]; if (!c) return;
  const mode = cs(c?.xMomentFreqMode, S.settings.momentFreqMode) || 'perWeek';
  const count = Math.max(1, parseInt(cs(c?.xMomentFreqCount, S.settings.momentFreqCount)) || 3);
  const periodHrs = mode === 'perDay' ? 24 : 168;
  const avgDelay = periodHrs / count;
  const delay = avgDelay * (0.5 + Math.random()) * 3600 * 1000;
  if (!S._momentTimers[contactId]) S._momentTimers[contactId] = {};
  S._momentTimers[contactId].post = setTimeout(() => triggerMomentPost(contactId), delay);
}
async function triggerMomentPost(contactId) {
  await aiPostMoment(contactId);
  scheduleMomentPost(contactId);
}
function scheduleMomentComment(contactId) {
  const c = S._contacts[contactId]; if (!c) return;
  const freqMins = cs(c?.xCommentFreqMins, S.settings.commentFreqMins) || 360;
  const delay = freqMins * 60 * 1000 * (0.5 + Math.random()*1);
  if (!S._momentTimers[contactId]) S._momentTimers[contactId] = {};
  S._momentTimers[contactId].comment = setTimeout(() => triggerMomentComment(contactId), delay);
}
async function triggerMomentComment(contactId) {
  const contact = S._contacts[contactId]; if (!contact || !(contact.apiKey || S.settings.apiKey)) return;
  const myName = contact.name;
  const moments = await dbGetAll('moments');
  const allComments = await dbGetAll('comments');
  // Only comment on posts from others that this AI has NOT yet commented on
  const targets = moments.filter(m =>
    m.author !== myName &&
    !allComments.some(c => c.momentId === m.id && c.author === myName)
  ).sort((a,b) => b.ts - a.ts);
  if (targets.length) {
    const target = targets[Math.floor(Math.random() * Math.min(3, targets.length))];
    await aiCommentMoment(target.id, contactId);
  }
  // Auto-like uncommented posts
  if (cs(contact?.xAutoLike, S.settings.autoLike)) {
    const prob = cs(contact?.xLikeProb, S.settings.likeProb) || 60;
    const tolike = moments.filter(m => m.author !== myName).slice(0,5);
    let liked = false;
    for (const m of tolike) {
      if (Math.random()*100 < prob) {
        const mo = await dbGet('moments', m.id); if (mo) { mo.likes=(mo.likes||0)+1; await dbPut('moments',mo); liked=true; }
      }
    }
    if (liked && $i('moments-page')?.classList.contains('active')) await renderMoments();
  }
  scheduleMomentComment(contactId);
}
async function aiCommentMoment(momentId, contactId) {
  const m = await dbGet('moments',momentId); if(!m)return;
  const contact = contactId ? S._contacts[contactId] : (S.currentContact?S._contacts[S.currentContact]:Object.values(S._contacts)[0]);
  if (!contact) return;
  const aiName = contact?.name||S.settings.aiName||'AI';
  const apiKey = contact?.apiKey||S.settings.apiKey;
  if (!apiKey) { toast('需要配置 API Key'); return; }
  const apiUrl = (contact?.apiUrl||S.settings.apiUrl||'https://openrouter.ai');
  const maxC = cs(contact?.xMaxComments, S.settings.maxComments) || 1;
  const count = Math.max(1, Math.ceil(Math.random() * maxC));
  toast('🤖 AI 评论中…');
  const prevTexts = [];
  try {
    for (let i = 0; i < count; i++) {
      if (i > 0) await new Promise(r => setTimeout(r, 1500 + Math.random()*3000));
      const prevCtx = prevTexts.length ? `\n你刚才说了：${prevTexts.join('；')}。再补充一句不同的话，自然衔接但不重复。` : '';
      const res = await fetch(apiUrl+'/api/v1/chat/completions',{method:'POST',headers:{'Authorization':`Bearer ${apiKey}`,'Content-Type':'application/json'},body:JSON.stringify({model:contact?.model||'openai/gpt-4o-mini',max_tokens:80,stream:false,messages:[{role:'system',content:`你是${aiName}，${buildMomentSysPrompt(contact)}，用1句话自然地评论朋友圈，像真实朋友一样。直接输出评论内容，不要加任何名字前缀或冒号。${prevCtx}`},{role:'user',content:`朋友圈内容: ${m.text||'[图片]'}`}]})});
      const d=await res.json(); const comment=(d.choices?.[0]?.message?.content?.trim()||'').replace(/^[\w\s一-龥]{1,15}[：:]\s*/u,'').trim();
      if(comment){
        prevTexts.push(comment);
        const c={id:uid(),momentId,author:aiName,text:comment,replyTo:null,ts:Date.now()};
        await dbPut('comments',c);
        const m2=await dbGet('moments',momentId);
        if(m2){const card=await makeMomentCard(m2);const old=$i('mc-'+momentId);if(old)old.replaceWith(card);}
        const cl2=$i('clist-'+momentId);if(cl2){cl2.style.display='flex';cl2.style.flexDirection='column';}
      }
    }
  } catch(e){toast('AI评论失败');}
}
async function aiReplyComment(momentId, commentObj, contactId) {
  const contact = contactId ? S._contacts[contactId] : null; if (!contact || !(contact.apiKey || S.settings.apiKey)) return;
  const aiName = contact.name || 'AI';
  try {
    const moment = await dbGet('moments', momentId);
    const allComments = await dbGetAll('comments', 'momentId', momentId);
    allComments.sort((a, b) => a.ts - b.ts);
    const threadCtx = allComments.length > 1
      ? '\n\n评论区已有内容：\n' + allComments.slice(-6).map(c => `${c.author}：${c.text}`).join('\n')
      : '';
    const postText = moment?.text ? `朋友圈内容：${moment.text}\n\n` : '';
    const res = await fetch((contact.apiUrl||S.settings.apiUrl||'https://openrouter.ai')+'/api/v1/chat/completions',{method:'POST',headers:{'Authorization':`Bearer ${contact.apiKey||S.settings.apiKey}`,'Content-Type':'application/json'},body:JSON.stringify({model:contact.model||'openai/gpt-4o-mini',max_tokens:60,stream:false,messages:[{role:'system',content:`你是${aiName}，${buildMomentSysPrompt(contact)}，简短自然地回复朋友圈评论，1句话，像真实朋友一样。直接输出回复内容，不要加任何名字前缀或冒号。`},{role:'user',content:`${postText}朋友"${commentObj.author}"说：${commentObj.text}${threadCtx}`}]})});
    const d=await res.json(); let reply=d.choices?.[0]?.message?.content||'';
    reply = reply.replace(/^[\w\s一-龥]{1,15}[：:]\s*/u, '').trim();
    if(reply){
      const c={id:uid(),momentId,author:aiName,text:reply,replyTo:commentObj.author,ts:Date.now()};
      await dbPut('comments',c);
      commentObj._replied = true; await dbPut('comments', commentObj);
      const m=await dbGet('moments',momentId);
      if(m){const card=await makeMomentCard(m);const old=$i('mc-'+momentId);if(old)old.replaceWith(card);}
    }
  } catch(e){}
}

function composePicLocal(src) {
  if (src === 'modal') { $i('compose-pic-modal-file')?.click(); return; }
  $i('compose-pic-file').click();
}

async function composeFromAlbum(src) {
  const isModal = src === 'modal';
  const photos = await dbGetAll('album');
  if (!photos.length) { toast('相册为空，请先在相册管理中上传照片'); return; }
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9999;display:flex;align-items:center;justify-content:center;';
  const box = document.createElement('div');
  box.style.cssText = 'background:var(--bg3);border-radius:16px;padding:16px;width:min(360px,92vw);max-height:80vh;display:flex;flex-direction:column;gap:10px;';
  box.innerHTML = `<div style="display:flex;align-items:center;justify-content:space-between;"><span style="font-weight:800;font-size:14px">📷 从相册选图</span><button style="background:none;border:none;cursor:pointer;font-size:18px;color:var(--text3)" id="_alb-close">✕</button></div>
  <div style="overflow-y:auto;display:grid;grid-template-columns:repeat(3,1fr);gap:6px;" id="_alb-grid"></div>
  <div style="font-size:11px;color:var(--text3);text-align:center">点击图片选择，可多选</div>
  <div style="display:flex;gap:8px;justify-content:flex-end;"><button class="btn-s" id="_alb-cancel">取消</button><button class="btn-p" id="_alb-ok">确定</button></div>`;
  overlay.appendChild(box);
  document.body.appendChild(overlay);
  const grid = box.querySelector('#_alb-grid');
  const selected = new Set();
  photos.forEach(p => {
    const div = document.createElement('div');
    div.style.cssText = 'position:relative;border-radius:8px;overflow:hidden;cursor:pointer;border:2.5px solid transparent;transition:border-color .15s;';
    div.innerHTML = `<img src="${p.url}" style="width:100%;aspect-ratio:1;object-fit:cover;display:block"><div style="position:absolute;top:2px;right:2px;width:18px;height:18px;border-radius:50%;background:var(--accent);color:#fff;font-size:11px;display:none;align-items:center;justify-content:center;" class="_alb-check">✓</div>`;
    div.onclick = () => {
      if (selected.has(p.id)) { selected.delete(p.id); div.style.borderColor='transparent'; div.querySelector('._alb-check').style.display='none'; }
      else { selected.add(p.id); div.style.borderColor='var(--accent)'; div.querySelector('._alb-check').style.display='flex'; }
    };
    grid.appendChild(div);
  });
  const close = () => { overlay.remove(); };
  box.querySelector('#_alb-close').onclick = close;
  box.querySelector('#_alb-cancel').onclick = close;
  box.querySelector('#_alb-ok').onclick = () => {
    close();
    const picked = photos.filter(p => selected.has(p.id));
    if (!picked.length) return;
    if (isModal) {
      if (!S._composeModalPics) S._composeModalPics = [];
      picked.forEach(p => { S._composeModalPics.push({dataUrl:p.url}); addComposePicPreview(p.url, S._composeModalPics.length-1, 'modal'); });
    } else {
      picked.forEach(p => { S._composePics.push({dataUrl:p.url}); addComposePicPreview(p.url, S._composePics.length-1); });
    }
  };
}
async function handleComposePic(input, src) {
  const isModal = src === 'modal';
  if (!S._composeModalPics) S._composeModalPics = [];
  for (const file of input.files) {
    const compressed = await compressImg(file, parseInt(S.settings.imgSize)||800);
    toast('上传图片中…');
    let url = await uploadToCloudinary(compressed, 'raimos/moments').catch(()=>null);
    url = url || compressed;
    if (isModal) { S._composeModalPics.push({dataUrl:url}); addComposePicPreview(url, S._composeModalPics.length-1, 'modal'); }
    else { S._composePics.push({dataUrl:url}); addComposePicPreview(url, S._composePics.length-1); }
  }
  input.value='';
}
function addComposePicPreview(url, idx, src) {
  const isModal = src === 'modal';
  const wrap=$i(isModal?'compose-modal-img-previews':'compose-img-previews');
  if (!wrap) return;
  const div=document.createElement('div');div.className='cip';
  div.innerHTML=`<img src="${url}"><button class="cip-del" onclick="removeComposePic(${idx},'${src||''}')">✕</button>`;
  wrap.appendChild(div);
}
function removeComposePic(idx, src) {
  const isModal = src === 'modal';
  if (isModal) {
    S._composeModalPics.splice(idx,1);
    const wrap=$i('compose-modal-img-previews');wrap.innerHTML='';
    S._composeModalPics.forEach((p,i)=>addComposePicPreview(p.dataUrl,i,'modal'));
  } else {
    S._composePics.splice(idx,1);
    const wrap=$i('compose-img-previews');wrap.innerHTML='';
    S._composePics.forEach((p,i)=>addComposePicPreview(p.dataUrl,i));
  }
}
async function composeGenImg(src) {
  const p=prompt('描述要生成的图片（可留空自动生成）:');
  if(p===null)return;
  const genKey=Object.values(S._contacts).find(c=>c.apiKey)?.apiKey||S.settings.apiKey;
  if(!genKey){toast('需要API Key');return;}
  toast('🎨 生成中…');
  try {
    const prompt_=p||'a beautiful lifestyle photo';
    const res=await fetch('https://openrouter.ai/api/v1/images/generations',{method:'POST',headers:{'Authorization':`Bearer ${genKey}`,'Content-Type':'application/json'},body:JSON.stringify({model:S.settings.imgGenModel||'openai/dall-e-3',prompt:prompt_,n:1,size:'1024x1024'})});
    const d=await res.json();const url=d.data?.[0]?.url;
    if(url){
      const isModal = src === 'modal' || src === 'compose-modal';
      if (isModal) { if(!S._composeModalPics)S._composeModalPics=[]; S._composeModalPics.push({dataUrl:url}); addComposePicPreview(url,S._composeModalPics.length-1,'modal'); }
      else { S._composePics.push({dataUrl:url}); addComposePicPreview(url,S._composePics.length-1); }
    } else throw new Error('生成失败');
  }catch(e){toast('❌ '+e.message);}
}
function toggleComposeEmoji() {
  const ce=$i('compose-emoji');
  ce.style.display=ce.style.display==='none'?'block':'none';
}
function toggleComposeMoment() {
  const el=$i('compose-moment'); if(!el)return;
  const collapsed=el.classList.toggle('collapsed');
  const btn=el.querySelector('.compose-moment-toggle'); if(btn)btn.textContent=collapsed?'▸':'▾';
}
function toggleInputCollapse() {
  const wrap=$i('input-wrap'); if(!wrap)return;
  const collapsed=wrap.classList.toggle('collapsed');
  const btn=$i('input-collapse-btn'); if(btn)btn.textContent=collapsed?'▸':'▾';
}
function toggleExpandInput() {
  const inp=$i('msg-input'); if(!inp)return;
  const btn=$i('input-expand-btn');
  const expanded=inp.classList.toggle('input-expanded');
  if(btn)btn.textContent=expanded?'⤡':'⤢';
  if(!expanded){inp.style.height='auto';autoH(inp);}
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
  } else if(S._imgSearchTarget==='compose-modal'){
    if(!S._composeModalPics)S._composeModalPics=[];
    S._imgSearchSelected.forEach(url=>{S._composeModalPics.push({dataUrl:url});addComposePicPreview(url,S._composeModalPics.length-1,'modal');});
  } else {
    S._imgSearchSelected.forEach(url=>{S.pendingFiles.push({role:'user',type:'image',url,imageData:url,content:'[图片]'});addImgPreview(url);});
  }
  closeModal('img-search-modal');
}

function exportMoments() { $i('export-moments-modal').classList.add('show'); }
async function doExportMoments(fmt) {
  closeModal('export-moments-modal');
  const moments=await dbGetAll('moments'); moments.sort((a,b)=>a.ts-b.ts);
  const comments=await dbGetAll('comments');
  if (fmt==='json') {
    dl('raimos-moments.json',JSON.stringify({moments,comments},null,2),'application/json');
  } else if (fmt==='txt') {
    let txt='';
    for (const m of moments) {
      const cs2=comments.filter(c=>c.momentId===m.id).sort((a,b)=>a.ts-b.ts);
      txt+=`【${m.author}】${fmtTimeFull(m.ts)}\n${m.text||'[图片]'}\n`;
      if(m.images?.length)txt+=`[${m.images.length}张图片]\n`;
      if(cs2.length){txt+=`  评论:\n`;cs2.forEach(c=>{txt+=`  ${c.author}${c.replyTo?` 回复${c.replyTo}`:''}：${c.text}\n`;});}
      txt+='\n';
    }
    dl('raimos-moments.txt',txt,'text/plain');
  } else if (fmt==='html') {
    let cards='';
    for (const m of moments) {
      const cs2=comments.filter(c=>c.momentId===m.id).sort((a,b)=>a.ts-b.ts);
      const av=m.avatar?.startsWith('data:')?`<img src="${m.avatar}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`:`<span style="font-size:24px">${m.avatar||'😊'}</span>`;
      const imgs=m.images?.length?`<div style="display:flex;gap:6px;flex-wrap:wrap;margin:8px 0">${m.images.map(u=>`<img src="${u}" style="width:120px;height:120px;object-fit:cover;border-radius:8px">`).join('')}</div>`:'';
      const cmts=cs2.map(c=>`<div style="padding:3px 0;font-size:13px"><b>${esc(c.author)}</b>${c.replyTo?` 回复 <b>${esc(c.replyTo)}</b>`:''}：${esc(c.text)}</div>`).join('');
      cards+=`<div style="background:#fff;border-radius:14px;padding:14px 16px;margin-bottom:14px;box-shadow:0 2px 10px rgba(0,0,0,.08)">
        <div style="display:flex;gap:10px;align-items:center;margin-bottom:8px">
          <div style="width:40px;height:40px;border-radius:50%;overflow:hidden;display:flex;align-items:center;justify-content:center;background:#f5f5f5;flex-shrink:0">${av}</div>
          <div><div style="font-weight:700;font-size:14px">${esc(m.author)}</div><div style="font-size:11px;color:#999">${fmtTimeFull(m.ts)}  ❤️ ${m.likes||0}</div></div>
        </div>
        <div style="font-size:14px;line-height:1.6;white-space:pre-wrap">${esc(m.text||'')}</div>
        ${imgs}
        ${cs2.length?`<div style="margin-top:8px;padding:8px;background:#f5f5f5;border-radius:8px">${cmts}</div>`:''}
      </div>`;
    }
    const html=`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Raimos 朋友圈</title><style>body{font-family:-apple-system,sans-serif;background:#fdf6f0;padding:20px;max-width:500px;margin:0 auto}</style></head><body><h2 style="text-align:center;color:#e91e63">🌸 朋友圈回忆</h2>${cards}</body></html>`;
    dl('raimos-moments.html',html,'text/html');
  } else if (fmt==='csv') {
    let csv='时间,作者,内容,图片数,点赞,评论数\n';
    for (const m of moments) {
      const cc=comments.filter(c=>c.momentId===m.id).length;
      csv+=`"${fmtTimeFull(m.ts)}","${m.author}","${(m.text||'').replace(/"/g,'""')}",${m.images?.length||0},${m.likes||0},${cc}\n`;
    }
    dl('raimos-moments.csv',csv,'text/csv');
  }
  toast('✅ 导出完成');
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
function startRec(e){if(e)e.preventDefault();if(S.isRecording)return;haptic([10,5,10]);navigator.mediaDevices.getUserMedia({audio:true}).then(stream=>{recStream=stream;S.mediaRecorder=new MediaRecorder(stream);S.audioChunks=[];S.isRecording=true;S.recSecs=0;S.mediaRecorder.ondataavailable=e=>S.audioChunks.push(e.data);S.mediaRecorder.start();$i('btn-voice').classList.add('recording');$i('rec-bar').classList.add('show');const fb=$i('btn-file');if(fb){fb.innerHTML='⏹';fb.title='停止录音';}S.recTimer=setInterval(()=>{S.recSecs++;const m=Math.floor(S.recSecs/60),s=S.recSecs%60;$i('rec-timer').textContent=`${m}:${s.toString().padStart(2,'0')}`;},1000);}).catch(e=>toast('无法访问麦克风: '+e.message));}
function stopRec(){if(!S.isRecording)return;haptic([8,4,8]);S.isRecording=false;clearInterval(S.recTimer);$i('btn-voice').classList.remove('recording');$i('rec-bar').classList.remove('show');$i('rec-timer').textContent='0:00';const fb=$i('btn-file');if(fb){fb.innerHTML='📎';fb.title='发文件/图片';}S.mediaRecorder.stop();S.mediaRecorder.onstop=async()=>{const blob=new Blob(S.audioChunks,{type:'audio/webm'});recStream?.getTracks().forEach(t=>t.stop());const dur=`${Math.floor(S.recSecs/60)}:${(S.recSecs%60).toString().padStart(2,'0')}`;const url=URL.createObjectURL(blob);const transcript=await sttBrowser();const chat=S._chats[S.currentChat];if(!chat)return;const vmsg={role:'user',type:'voice',url,dur,transcript,content:transcript?`[语音] ${transcript}`:'[语音消息]'};await addMsg(S.currentChat,vmsg);await renderMsgs();scrollTo_(false);if(transcript)await callAI(S.currentChat);};}
function cancelRec(){if(!S.isRecording)return;S.isRecording=false;clearInterval(S.recTimer);S.mediaRecorder?.stop();recStream?.getTracks().forEach(t=>t.stop());$i('btn-voice').classList.remove('recording');$i('rec-bar').classList.remove('show');const fb=$i('btn-file');if(fb){fb.innerHTML='📎';fb.title='发文件/图片';}}
function sttBrowser(){return new Promise(resolve=>{if(!('webkitSpeechRecognition'in window||'SpeechRecognition'in window)){resolve('');return;}const SR=window.SpeechRecognition||window.webkitSpeechRecognition;const r=new SR();r.lang='zh-CN';r.interimResults=false;r.start();r.onresult=e=>resolve(e.results[0][0].transcript);r.onerror=()=>resolve('');r.onend=()=>resolve('');setTimeout(()=>{try{r.stop();}catch(e){}},5000);});}
async function playVoice(id){const msgs=await dbGetAll('messages','chatId',S.currentChat);const msg=msgs.find(m=>m.id===id);if(msg?.url)new Audio(msg.url).play();}

let curSpeech=null;
async function speakMsg(id){const msgs=await dbGetAll('messages','chatId',S.currentChat);const msg=msgs.find(m=>m.id===id);if(!msg)return;const txt=(msg.altVersions?.length&&msg.altIdx!=null)?msg.altVersions[msg.altIdx]?.content:msg.content;if(txt)speakText(txt);}
function speakText(text){
  const s=S.settings; const ct=S.currentContact?S._contacts[S.currentContact]:null;
  const ttsMode=cs(ct?.xTtsMode,s.ttsMode); const ttsUrl=cs(ct?.xTtsUrl,s.ttsUrl);
  const ttsKey=cs(ct?.xTtsKey,s.ttsKey); const ttsVoice=cs(ct?.xTtsVoice,s.ttsVoice);
  const browserVoice=cs(ct?.xBrowserVoice,s.browserVoice);
  if(curSpeech){speechSynthesis.cancel();curSpeech=null;return;}
  if(ttsMode==='custom'&&ttsUrl){callCustomTTS(text,ttsUrl,ttsKey,ttsVoice);return;}
  const u=new SpeechSynthesisUtterance(text);
  if(browserVoice){const v=speechSynthesis.getVoices().find(v=>v.name===browserVoice);if(v)u.voice=v;}
  u.rate=1.05;curSpeech=u;u.onend=()=>curSpeech=null;speechSynthesis.speak(u);
}
async function callCustomTTS(text,url,key,voice){url=url||S.settings.ttsUrl;key=key||S.settings.ttsKey;voice=voice||S.settings.ttsVoice||'cove';try{const res=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json',...(key?{'Authorization':`Bearer ${key}`}:{})},body:JSON.stringify({model:'tts-1',input:text,voice})});new Audio(URL.createObjectURL(await res.blob())).play();}catch(e){}}
function initVoices(){const load=()=>{const vs=speechSynthesis.getVoices();const sel=$i('s-bvoice');if(!sel||!vs.length)return;sel.innerHTML='';vs.forEach(v=>{const o=document.createElement('option');o.value=v.name;o.textContent=`${v.name} (${v.lang})`;if(v.name===S.settings.browserVoice)o.selected=true;sel.appendChild(o);});if(!S.settings.browserVoice){const zh=vs.find(v=>v.lang.startsWith('zh'));if(zh){S.settings.browserVoice=zh.name;sel.value=zh.name;}}};speechSynthesis.onvoiceschanged=load;load();}

// ══════════════════════════════
//  CLOUDINARY
// ══════════════════════════════
async function uploadToCloudinary(fileOrDataUrl, folder='raimos') {
  const cloud = S.settings.cloudinaryCloud?.trim();
  const preset = S.settings.cloudinaryPreset?.trim();
  if (!cloud || !preset) return null;
  const fd = new FormData();
  fd.append('file', fileOrDataUrl);
  fd.append('upload_preset', preset);
  fd.append('folder', folder);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/auto/upload`, {method:'POST', body:fd});
  const d = await res.json();
  if (d.secure_url) return d.secure_url;
  throw new Error(d.error?.message || 'Cloudinary 上传失败');
}

// ══════════════════════════════
//  FILES
// ══════════════════════════════
function triggerFile(){haptic(8);$i('file-upload').click();}
function triggerChatPhoto(){haptic(8);$i('chat-photo-upload').click();}
function triggerFileOrStopRec() {
  if (S.isRecording) { stopRecToInput(); }
  else { triggerFile(); }
}

// ── Voice: unified desktop (hold) / mobile (tap-toggle) ──
let _voiceIsTouch = false, _voiceTouchHeld = false;
function onVoiceClick(e) {
  // click fires after mousedown+mouseup on desktop; on touch devices we handle separately
  if (_voiceIsTouch) return;
}
function onVoiceMouseDown(e) {
  if (_voiceIsTouch) return;
  e.preventDefault();
  startRec();
}
function onVoiceMouseUp(e) {
  if (_voiceIsTouch) return;
  if (S.isRecording) stopRec();
}
function onVoiceTouchStart(e) {
  _voiceIsTouch = true;
  _voiceTouchHeld = false;
  e.preventDefault();
}
function onVoiceTouchEnd(e) {
  e.preventDefault();
  if (!S.isRecording) {
    startRecMobile();
  } else {
    stopRecToInput();
  }
}
function startRecMobile() {
  haptic([10,5,10]);
  navigator.mediaDevices.getUserMedia({audio:true}).then(stream => {
    recStream = stream;
    S.mediaRecorder = new MediaRecorder(stream);
    S.audioChunks = [];
    S.isRecording = true; S.recSecs = 0;
    S.mediaRecorder.ondataavailable = e => S.audioChunks.push(e.data);
    S.mediaRecorder.start();
    $i('btn-voice').classList.add('recording');
    $i('rec-bar').classList.add('show');
    // Change file button to stop icon
    const fb = $i('btn-file');
    if (fb) { fb.innerHTML = '⏹'; fb.title = '停止录音'; }
    S.recTimer = setInterval(() => {
      S.recSecs++;
      const m = Math.floor(S.recSecs/60), s = S.recSecs%60;
      $i('rec-timer').textContent = `${m}:${s.toString().padStart(2,'0')}`;
    }, 1000);
  }).catch(e => toast('无法访问麦克风: ' + e.message));
}
function stopRecToInput() {
  if (!S.isRecording) return;
  haptic([8,4,8]);
  S.isRecording = false;
  clearInterval(S.recTimer);
  $i('btn-voice').classList.remove('recording');
  $i('rec-bar').classList.remove('show');
  $i('rec-timer').textContent = '0:00';
  // Restore file button
  const fb = $i('btn-file');
  if (fb) { fb.innerHTML = '📎'; fb.title = '发文件/图片'; }
  S.mediaRecorder.stop();
  S.mediaRecorder.onstop = async () => {
    const blob = new Blob(S.audioChunks, {type:'audio/webm'});
    recStream?.getTracks().forEach(t => t.stop());
    const transcript = await sttBrowser();
    if (transcript) {
      const inp = $i('msg-input');
      inp.value = transcript;
      autoH(inp);
      onInputTyping();
    }
  };
}
async function handleFiles(input){for(const file of input.files){if(file.type.startsWith('image/')){const c=await compressImg(file,parseInt(S.settings.imgSize)||800);const url=URL.createObjectURL(file);S.pendingFiles.push({role:'user',type:'image',url,imageData:c,content:'[图片]'});addImgPreview(url);}else{const sz=file.size>1048576?`${(file.size/1048576).toFixed(1)}MB`:`${(file.size/1024).toFixed(0)}KB`;S.pendingFiles.push({role:'user',type:'file',fileName:file.name,fileSize:sz,content:`[文件: ${file.name}]`});toast(`📎 ${file.name}`);}}input.value='';}
function addImgPreview(url){const w=$i('img-preview-row');w.classList.add('show');const idx=S.pendingFiles.filter(f=>f.type==='image').length-1;const d=document.createElement('div');d.className='img-prev';d.innerHTML=`<img src="${url}"><button class="img-prev-del" onclick="rmImgPrev(${idx})">✕</button>`;w.appendChild(d);}
function rmImgPrev(idx){S.pendingFiles=S.pendingFiles.filter((f,i)=>f.type!=='image'||i!==idx);const w=$i('img-preview-row');w.innerHTML='';S.pendingFiles.filter(f=>f.type==='image').forEach((f,i)=>addImgPreview(f.url));if(!S.pendingFiles.some(f=>f.type==='image'))w.classList.remove('show');}
async function compressImg(file,max){return new Promise(r=>{const img=new Image();const fr=new FileReader();fr.onload=e=>{img.onload=()=>{const c=document.createElement('canvas');let w=img.width,h=img.height;if(w>h){if(w>max){h=h*max/w;w=max;}}else{if(h>max){w=w*max/h;h=max;}}c.width=w;c.height=h;c.getContext('2d').drawImage(img,0,0,w,h);r(c.toDataURL('image/jpeg',.82));};img.src=e.target.result;};fr.readAsDataURL(file);});}
function openLB(url){$i('lb-img').src=url;$i('lightbox').classList.add('show');}

// ══════════════════════════════
//  EMOJI / STICKERS
// ══════════════════════════════
const EMOJIS={'😊常用':['😊','😂','🥰','😍','🤣','😭','😤','😎','🥺','😏','😅','🤔','😴','🥳','😡','😢','🤩','😮','🙄','😜','🤗','😇','🥱','😈','👻','💀','🎉','✨','💯','🫶'],'🐱动物':['🐱','🐶','🐻','🐼','🦊','🐰','🐯','🦁','🐸','🐧','🦋','🐝','🦄','🐙','🦜','🐬','🐳','🦖','🐺','🦜'],'❤️爱心':['❤️','🧡','💛','💚','💙','💜','🖤','🤍','💕','💞','💓','💗','💖','💝','💘','💟','❣️','💔','🫶','🩷'],'🍕食物':['🍕','🍔','🍟','🌮','🍜','🍣','🍩','🎂','🧁','🍦','🍎','🍊','🍋','🍇','🍓','🥑','🧋','☕','🍵','🧃'],'🌸自然':['🌸','🌺','🌻','🌹','🌷','🌿','🍀','🌾','🌈','⭐','🌙','☀️','❄️','🌊','🔥','💫','🌠','🎋','🌵','🌴'],'🎵其他':['🎵','🎶','🎸','🎹','🎤','🎧','🎮','🎲','🎯','🏆','👑','💎','🔮','🪄','🎀','🎁','🛸','🚀','⚡','🌟']};
function initEmoji(){const tabs=$i('ep-tabs');tabs.innerHTML='';let first=true;for(const[cat,emojis]of Object.entries(EMOJIS)){const b=document.createElement('button');b.className='ep-tab'+(first?' active':'');b.textContent=cat;b.onclick=()=>{document.querySelectorAll('.ep-tab').forEach(t=>t.classList.remove('active'));b.classList.add('active');renderEmojiGrid(emojis);};tabs.appendChild(b);if(first)renderEmojiGrid(emojis);first=false;}const st=document.createElement('button');st.className='ep-tab';st.textContent='🎭表情包';st.onclick=()=>{document.querySelectorAll('.ep-tab').forEach(t=>t.classList.remove('active'));st.classList.add('active');renderStickerPicker();};tabs.appendChild(st);const ab=document.createElement('button');ab.className='ep-tab';ab.textContent='📷相册';ab.onclick=()=>{document.querySelectorAll('.ep-tab').forEach(t=>t.classList.remove('active'));ab.classList.add('active');renderAlbumPicker();};tabs.appendChild(ab);}
function renderEmojiGrid(emojis){const c=$i('ep-content');c.innerHTML='';const g=document.createElement('div');g.className='ep-grid';emojis.forEach(e=>{const b=document.createElement('button');b.className='ep-btn';b.textContent=e;b.onclick=()=>insertEmoji(e);g.appendChild(b);});c.appendChild(g);}
function renderStickerPicker(){const c=$i('ep-content');c.innerHTML='';if(!S._stickers.length){c.innerHTML='<div style="text-align:center;padding:18px;color:var(--text3);font-size:12px">还没有表情包</div>';return;}const g=document.createElement('div');g.className='ep-sticker-grid';S._stickers.forEach(s=>{const d=document.createElement('div');d.className='ep-sticker';if(s.isImg)d.innerHTML=`<img src="${s.url}">`;else d.innerHTML=`<span>${s.content}</span>`;d.onclick=()=>sendSticker(s);g.appendChild(d);});c.appendChild(g);}
async function renderAlbumPicker(){const c=$i('ep-content');c.innerHTML='';const photos=await dbGetAll('album');if(!photos.length){c.innerHTML='<div style="text-align:center;padding:18px;color:var(--text3);font-size:12px">相册为空<br>在相册管理中上传图片并添加标签</div>';return;}const g=document.createElement('div');g.className='ep-sticker-grid';photos.forEach(p=>{const d=document.createElement('div');d.className='ep-sticker';d.style.flexDirection='column';d.innerHTML=`<img src="${p.url}" title="${p.label||'无标签'}"><div style="font-size:9px;color:var(--text3);margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:60px;text-align:center">${esc(p.label||'无标签')}</div>`;d.onclick=()=>sendSticker({url:p.url,content:p.label||'[图片]',isImg:true});g.appendChild(d);});c.appendChild(g);}

function toggleEmoji(e){
  if(e){e.preventDefault();e.stopPropagation();}
  const picker=$i('emoji-picker');
  if(!picker)return;
  const willShow = !picker.classList.contains('show');
  picker.classList.toggle('show');
  // 手机上收起键盘，避免遮挡表情面板
  if(willShow){
    const focused=document.activeElement;
    if(focused&&(focused.tagName==='INPUT'||focused.tagName==='TEXTAREA'))focused.blur();
  }
}

function insertEmoji(e){const i=$i('msg-input');if(!i)return;const s=i.selectionStart||0,end=i.selectionEnd||0;i.value=i.value.slice(0,s)+e+i.value.slice(end);i.selectionStart=i.selectionEnd=s+[...e].reduce((n,c)=>n+c.length,0);}
async function sendSticker(sk){
  const chat=S._chats[S.currentChat];if(!chat)return;
  $i('emoji-picker').classList.remove('show');
  const stickerModal=$i('sticker-modal');if(stickerModal)stickerModal.classList.remove('show');
  if(sk.isImg){
    // Send as sticker so AI only sees the label name, not the actual image data
    await addMsg(S.currentChat,{role:'user',type:'sticker',content:sk.content||sk.label||'[图片]',url:sk.url,isImg:true});
    await renderMsgs();scrollTo_(false);
    await callAI(S.currentChat);
  } else {
    await addMsg(S.currentChat,{role:'user',type:'sticker',content:sk.content||sk.label||'',url:sk.url,isImg:false});
    await renderMsgs();scrollTo_(false);
  }
}
// ══════════════════════════════════════════════════════
//  相册（照片 + 表情包合并管理）
// ══════════════════════════════════════════════════════
let _albumCurrentTab = 'photos';

function switchAlbumTab(tab) {
  _albumCurrentTab = tab;
  const tabs = ['photos','stickers'];
  tabs.forEach(t => {
    const btn = $i(`album-tab-${t}`); const panel = $i(`album-panel-${t}`);
    if (!btn || !panel) return;
    const active = t === tab;
    btn.style.background = active ? 'var(--accent)' : 'none';
    btn.style.color = active ? '#fff' : 'var(--text2)';
    panel.style.display = active ? '' : 'none';
  });
  if (tab === 'photos') renderAlbum();
  if (tab === 'stickers') renderStickerLib();
}

function openStickersModal(tab) {
  const keyEl=$i('sticker-lib-key'); const promptEl=$i('sticker-call-prompt');
  if(keyEl) keyEl.value = S.settings.stickerLibKey||'';
  if(promptEl) promptEl.value = S.settings.stickerCallPrompt||'';
  $i('sticker-modal').classList.add('show');
  switchAlbumTab(tab || 'photos');
}
function openAlbumModal() { openStickersModal('photos'); }
// Mobile: open sticker/album modal from chat input bar
function openChatAlbum() { openStickersModal('photos'); }

async function saveStickerLibConfig(){
  S.settings.stickerLibKey=($i('sticker-lib-key')?.value||'').trim();
  S.settings.stickerCallPrompt=($i('sticker-call-prompt')?.value||'').trim();
  await saveSetting('stickerLibKey',S.settings.stickerLibKey);
  await saveSetting('stickerCallPrompt',S.settings.stickerCallPrompt);
  toast('✅ 配置已保存');
}

async function uploadAlbumPhotos(input) {
  for (const file of input.files) {
    const label = window.prompt(`给这张照片起个标签（AI 按标签检索，不填则用文件名）：`) || file.name.replace(/\.\w+$/,'');
    const compressed = await compressImg(file, parseInt(S.settings.imgSize)||800);
    toast('上传照片中…');
    let url = await uploadToCloudinary(compressed, 'raimos/album').catch(()=>null);
    url = url || compressed;
    const photo = {id:uid(), url, label: label.trim(), ts:Date.now()};
    await dbPut('album', photo);
    // Auto-save URL to Firestore if we have a cloud URL
    if (url && url.startsWith('https://') && window._fbUser && window._fbLib && window._fbDb) {
      const { doc, setDoc } = window._fbLib;
      setDoc(doc(window._fbDb, 'users', window._fbUser.uid, 'album', photo.id),
        { id: photo.id, url, label: photo.label, ts: photo.ts }).catch(() => {});
    }
  }
  input.value='';
  renderAlbum();
}

async function renderAlbum() {
  const grid = $i('album-grid'); if (!grid) return;
  const photos = await dbGetAll('album');
  const countEl = $i('album-count');
  if (countEl) countEl.textContent = `共 ${photos.length} 张`;
  grid.innerHTML = '';
  if (!photos.length) {
    grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:30px;color:var(--text3);font-size:12px">还没有照片，点「上传照片」添加<br>AI 会按标签检索这些图片</div>';
    return;
  }
  photos.forEach(p => {
    const div = document.createElement('div');
    div.style.cssText = 'position:relative;border-radius:8px;overflow:hidden;background:var(--bg2);';
    div.innerHTML = `
      <img src="${p.url}" style="width:100%;aspect-ratio:1;object-fit:cover;display:block">
      <div style="padding:4px 6px;font-size:10px;color:var(--text3);background:var(--bg2);display:flex;align-items:center;gap:4px">
        <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(p.label||'无标签')}</span>
        <button onclick="editAlbumLabel('${p.id}')" style="background:none;border:none;cursor:pointer;font-size:10px;color:var(--accent);padding:0">✏️</button>
      </div>`;
    const del = document.createElement('button');
    del.style.cssText = 'position:absolute;top:3px;right:3px;width:18px;height:18px;border-radius:50%;background:rgba(0,0,0,.55);color:#fff;border:none;cursor:pointer;font-size:10px;';
    del.textContent = '✕';
    del.onclick = async () => { await dbDel('album', p.id); renderAlbum(); };
    div.appendChild(del);
    grid.appendChild(div);
  });
}

async function editAlbumLabel(photoId) {
  const p = await dbGet('album', photoId); if (!p) return;
  const label = window.prompt('修改照片标签：', p.label||'');
  if (label === null) return;
  p.label = label.trim();
  await dbPut('album', p);
  renderAlbum();
}

/** Pick best-matching album photo by keyword/context label matching — only returns if a label actually matches */
async function pickAlbumPhoto(keywords) {
  const photos = await dbGetAll('album');
  if (!photos.length) return null;
  const kws = (keywords||'').toLowerCase().split(/[\s,，]+/).filter(Boolean);
  if (!kws.length) return null;
  const scored = photos.map(p => {
    const lbl = (p.label||'').toLowerCase();
    const score = kws.reduce((s,k) => s + (lbl.includes(k)?1:0), 0);
    return {p, score};
  });
  scored.sort((a,b) => b.score - a.score);
  if (!scored[0] || scored[0].score === 0) return null;
  return scored[0].p.url || null;
}

/** Pick best-matching sticker by label — only returns if a label actually matches */
function pickSticker(keywords) {
  if (!S._stickers?.length) return null;
  const kws = (keywords||'').toLowerCase().split(/[\s,，]+/).filter(Boolean);
  if (!kws.length) return null;
  const scored = S._stickers.filter(s=>s.isImg).map(s => {
    const lbl = (s.label||s.content||'').toLowerCase();
    const score = kws.reduce((acc,k)=>acc+(lbl.includes(k)?1:0),0);
    return {s, score};
  });
  scored.sort((a,b) => b.score - a.score);
  if (!scored[0] || scored[0].score === 0) return null;
  return scored[0].s || null;
}

// ══════════════════════════════════════════════════════
//  WEB PUSH 消息推送
// ══════════════════════════════════════════════════════
function urlBase64ToUint8Array(b64) {
  const pad = '='.repeat((4 - b64.length % 4) % 4);
  const raw = atob((b64 + pad).replace(/-/g,'+').replace(/_/g,'/'));
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}

async function initPushNotifications() {
  if (!S.settings.pushEnabled) return;
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
  const backendUrl = S.settings.backendUrl?.trim();
  if (!backendUrl) return;
  try {
    const sw = await navigator.serviceWorker.ready;
    const existing = await sw.pushManager.getSubscription();
    if (existing) { await savePushSubscription(existing); return; }
    const res = await fetch(`${backendUrl}/vapid-public-key`);
    if (!res.ok) return;
    const { publicKey } = await res.json();
    if (!publicKey) return;
    const sub = await sw.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(publicKey) });
    await savePushSubscription(sub);
    toast('✅ 推送通知已开启');
  } catch(e) { console.warn('[Push] init failed', e.message); }
}

async function savePushSubscription(sub) {
  if (!window._fbUser || !window._fbDb || !window._fbLib) return;
  try {
    const { doc, setDoc } = window._fbLib;
    await setDoc(doc(window._fbDb, 'users', window._fbUser.uid, 'pushSubscriptions', 'web'), sub.toJSON());
  } catch(e) { console.warn('[Push] save failed', e); }
}

async function unsubscribePush() {
  if (!('serviceWorker' in navigator)) return;
  const sw = await navigator.serviceWorker.ready;
  const sub = await sw.pushManager.getSubscription();
  if (sub) { await sub.unsubscribe(); }
  if (window._fbUser && window._fbDb && window._fbLib) {
    try {
      const { doc, deleteDoc } = window._fbLib;
      await deleteDoc(doc(window._fbDb, 'users', window._fbUser.uid, 'pushSubscriptions', 'web'));
    } catch(e) {}
  }
  toast('推送通知已关闭');
}

// ══════════════════════════════════════════════════════
//  SPLASH SCREEN (开屏动画)
// ══════════════════════════════════════════════════════
async function initSplashScreen() {
  if (!S.settings.splashEnabled) return;
  const mediaId = S.settings.splashMediaId;
  const type = S.settings.splashType;
  const dur = (S.settings.splashDuration || 4) * 1000;
  const el = $i('splash-screen'); if (!el) return;

  if (mediaId) {
    const blob = await loadMediaBlob(mediaId);
    const url = blob ? URL.createObjectURL(blob) : null;
    if (url && type === 'video') {
      const v = $i('splash-video'); v.src = url; v.style.display = '';
      $i('splash-default').style.display = 'none';
    } else if (url && type === 'image') {
      const img = $i('splash-img'); img.src = url; img.style.display = '';
      $i('splash-default').style.display = 'none';
      setTimeout(dismissSplash, dur);
    } else {
      $i('splash-default').style.display = '';
      setTimeout(dismissSplash, dur);
    }
  } else {
    $i('splash-default').style.display = '';
    setTimeout(dismissSplash, dur);
  }
  el.classList.remove('hidden');
}
function dismissSplash() {
  const el = $i('splash-screen'); if (!el) return;
  el.style.opacity = '0'; el.style.transition = 'opacity .4s';
  setTimeout(() => el.classList.add('hidden'), 420);
}
async function handleSplashMedia(input) {
  const file = input.files[0]; if (!file) return;
  const id = `splash_${uid()}`;
  const type = file.type.startsWith('video/') ? 'video' : 'image';
  await saveMediaBlob(id, file, { name: file.name, mime: file.type, kind: 'splash' });
  // Delete previous
  if (S.settings.splashMediaId) {
    await dbDel('files', S.settings.splashMediaId).catch(()=>{});
  }
  S.settings.splashMediaId = id;
  S.settings.splashType = type;
  S.settings.splashEnabled = true;
  await saveSetting('splashMediaId', id);
  await saveSetting('splashType', type);
  await saveSetting('splashEnabled', true);
  toast(`✅ ${type === 'video' ? '视频' : '图片'}已设为开屏动画`);
  const label = $i('splash-file-label');
  if (label) label.textContent = file.name;
  input.value = '';
}
async function clearSplashMedia() {
  if (S.settings.splashMediaId) await dbDel('files', S.settings.splashMediaId).catch(()=>{});
  S.settings.splashMediaId = '';
  S.settings.splashType = '';
  await saveSetting('splashMediaId', '');
  await saveSetting('splashType', '');
  toast('已清除开屏素材（使用默认动画）');
  const label = $i('splash-file-label');
  if (label) label.textContent = '未选择文件';
}

// ══════════════════════════════════════════════════════
//  STATUS NOTES (便签)
// ══════════════════════════════════════════════════════
async function openStatusNotes() {
  const drawer = $i('status-notes-drawer');
  drawer.classList.remove('hidden');
  await renderStatusNotes();
  // Mark all as read
  const notes = await dbGetAll('statusNotes');
  for (const n of notes) {
    if (!n.read) { n.read = true; await dbPut('statusNotes', n); }
  }
  updateStatusNoteBadge();
}
function closeStatusNotes() {
  $i('status-notes-drawer').classList.add('hidden');
}
async function renderStatusNotes() {
  const list = $i('status-notes-list'); if (!list) return;
  const notes = await dbGetAll('statusNotes');
  notes.sort((a, b) => b.ts - a.ts);
  if (!notes.length) {
    list.innerHTML = '<div style="text-align:center;padding:40px 20px;color:var(--text3);font-size:13px">还没有留言<br><span style="font-size:28px">📭</span><br>设置状态后让 AI 助手留言吧～</div>';
    return;
  }
  list.innerHTML = '';
  for (const n of notes) {
    const card = document.createElement('div');
    card.className = 'status-note-card' + (n.read ? '' : ' unread');
    const avHtml = n.aiAvatar?.startsWith('http') || n.aiAvatar?.startsWith('data:')
      ? `<img src="${esc(n.aiAvatar)}">`
      : `<span>${n.aiAvatar || '🤖'}</span>`;
    card.innerHTML = `
      <div class="status-note-meta">
        <div class="status-note-avatar">${avHtml}</div>
        <div class="status-note-name">${esc(n.aiName || 'AI')}</div>
        <div class="status-note-time">${fmtTimeFull ? fmtTimeFull(n.ts) : new Date(n.ts).toLocaleString()}</div>
      </div>
      <div class="status-note-trigger">💬 你的状态：<b>${esc(n.status)}</b></div>
      <div class="status-note-content">${esc(n.content)}</div>
    `;
    const del = document.createElement('button');
    del.style.cssText = 'float:right;margin:-2px -4px 0 0;background:none;border:none;color:var(--text3);cursor:pointer;font-size:12px;';
    del.textContent = '✕';
    del.onclick = async () => { await dbDel('statusNotes', n.id); card.remove(); updateStatusNoteBadge(); };
    card.querySelector('.status-note-meta').prepend(del);
    list.appendChild(card);
  }
}
async function updateStatusNoteBadge() {
  const notes = await dbGetAll('statusNotes');
  const unread = notes.filter(n => !n.read).length;
  const badge = $i('status-note-badge');
  if (badge) badge.style.display = unread > 0 ? '' : 'none';
}

function renderStickerLib(){const lib=$i('sticker-lib');lib.innerHTML='';S._stickers.forEach((s,i)=>{const d=document.createElement('div');d.style.cssText='position:relative;border:1.5px solid var(--border);border-radius:9px;overflow:hidden;padding:5px;';if(s.isImg)d.innerHTML=`<img src="${s.url}" style="width:100%;border-radius:6px">`;else d.innerHTML=`<div style="font-size:34px;text-align:center;padding:3px">${s.content}</div>`;if(s.label)d.innerHTML+=`<div style="font-size:9.5px;text-align:center;color:var(--text3);margin-top:2px">${esc(s.label)}</div>`;const del=document.createElement('button');del.style.cssText='position:absolute;top:-4px;right:-4px;width:16px;height:16px;border-radius:50%;background:var(--accent);color:#fff;border:none;cursor:pointer;font-size:8px;display:flex;align-items:center;justify-content:center;';del.textContent='✕';del.onclick=async()=>{await dbDel('stickers',s.id);S._stickers.splice(i,1);renderStickerLib();};d.appendChild(del);lib.appendChild(d);});}
async function addStickerImgs(input){
  for(const file of input.files){
    const dataUrl=await new Promise(r=>{const fr=new FileReader();fr.onload=e=>r(e.target.result);fr.readAsDataURL(file);});
    const label=window.prompt(`给这个表情包起个标签（AI用来识别）:`)||file.name.replace(/\.\w+$/,'');
    toast('上传表情包中…');
    let url=await uploadToCloudinary(dataUrl,'raimos/stickers').catch(()=>null);
    url=url||dataUrl;
    const sk={id:uid(),isImg:true,url,label,content:label};
    await dbPut('stickers',sk);S._stickers.push(sk);
  }
  renderStickerLib();input.value='';
}
async function addTextSticker(){const t=window.prompt('输入文字/emoji表情包:');if(!t)return;const label=window.prompt('标签（AI识别用）:')||t;const sk={id:uid(),isImg:false,content:t,label};await dbPut('stickers',sk);S._stickers.push(sk);renderStickerLib();}

// ══════════════════════════════
//  MSG ACTIONS
// ══════════════════════════════
function copyMsg(id) {
  const txt = _msgTextCache.get(id);
  if (!txt) { toast('复制失败，请长按手动复制'); return; }
  // Must be fully synchronous to preserve user-gesture context on iOS
  const ta = document.createElement('textarea');
  ta.value = txt;
  ta.style.cssText = 'position:fixed;top:-9999px;left:-9999px;opacity:0.01;font-size:16px';
  document.body.appendChild(ta);
  ta.focus(); ta.select(); ta.setSelectionRange(0, txt.length);
  let ok = false;
  try { ok = document.execCommand('copy'); } catch(_) {}
  document.body.removeChild(ta);
  if (ok) { haptic([5,3,5]); toast('✓ 已复制'); return; }
  // Modern async clipboard as last resort (may fail on iOS if gesture context is stale)
  navigator.clipboard?.writeText(txt).then(() => { haptic([5,3,5]); toast('✓ 已复制'); }).catch(() => toast('复制失败，请长按手动复制'));
}
async function deleteMsg(id){if(!confirm('删除这条消息？（不影响上下文其他内容）'))return;await dbDel('messages',id);fbDel('messages',id);haptic(15);await renderMsgs();}
async function replyMsg(id){const msgs=await dbGetAll('messages','chatId',S.currentChat);const msg=msgs.find(m=>m.id===id);if(!msg)return;S.replyTo=msg;$i('reply-bar-txt').textContent=(msg.content||'[媒体]').slice(0,50);$i('reply-bar').classList.add('show');$i('msg-input').focus();}
function cancelReply(){S.replyTo=null;$i('reply-bar').classList.remove('show');}
async function editMsg(id){const msgs=await dbGetAll('messages','chatId',S.currentChat);const msg=msgs.find(m=>m.id===id);if(!msg)return;S.editingMsgId=id;$i('msg-input').value=msg.content||'';$i('edit-bar-txt').textContent=(msg.content||'').slice(0,40);$i('edit-bar').classList.add('show');autoH($i('msg-input'));$i('msg-input').focus();}
function cancelEdit(){S.editingMsgId=null;$i('edit-bar').classList.remove('show');}
async function regenMsg(id) {
  haptic([8,4,8]);
  const msgs = await dbGetAll('messages','chatId',S.currentChat);
  msgs.sort((a,b) => a.ts - b.ts);
  const idx = msgs.findIndex(m => m.id === id);
  if (idx === -1) return;
  const msg = msgs[idx];
  const altVersions = msg.altVersions ? [...msg.altVersions] : [];
  altVersions.push({ content: msg.content, thinking: msg.thinking || null });
  await dbPut('messages', { ...msg, chatId: S.currentChat, content: '', thinking: null, altVersions, altIdx: null });
  await renderMsgs(); scrollTo_(false);
  await callAIForRegenAt(S.currentChat, id);
}

async function callAIForRegenAt(chatId, targetMsgId) {
  const chat = S._chats[chatId];
  const contact = S.currentContact ? S._contacts[S.currentContact] : null;
  const s = S.settings;
  const useKey = contact?.apiKey || s.apiKey;
  const useUrl = contact?.apiUrl || s.apiUrl || 'https://openrouter.ai/api/v1/chat/completions';
  if (!useKey) { toast('请先填写 API Key！'); return; }
  S.isStreaming = true; showTyping(); startHapticStream();
  const t0 = Date.now();
  try {
    const mems = await getRelevantMems(chatId, contact?.id || null);
    const msgs = await buildMsgsUpTo(chat, contact, mems, targetMsgId);
    const baseModel = contact?.model || s.model || 'openai/gpt-4o';
    const model = baseModel + (S.onlineSearch && !baseModel.includes(':online') && !baseModel.includes('perplexity') ? ':online' : '');
    const useStream = cs(contact?.xStream, s.stream);
    const body = { model, messages: msgs, temperature: contact?.temp ?? parseFloat(s.temp), stream: useStream, max_tokens: 4096 };
    const res = await fetch(useUrl, { method:'POST', headers:{'Authorization':`Bearer ${useKey}`,'Content-Type':'application/json','HTTP-Referer':'https://raimos.app','X-Title':'Raimos'}, body:JSON.stringify(body) });
    if (!res.ok) { const e = await res.json().catch(()=>({error:{message:'Error'}})); throw new Error(e.error?.message||res.statusText); }
    removeTyping();
    let content = '', thinking = '', usage = null;
    if (useStream) { const r = await handleStream(res, chatId, targetMsgId); content=r.content; thinking=r.thinking; usage=r.usage; }
    else { const d=await res.json(); content=d.choices?.[0]?.message?.content||''; thinking=d.choices?.[0]?.message?.reasoning||''; usage=d.usage; }
    const { text: cleanText } = parseStickerTags(content);
    const elapsed = ((Date.now()-t0)/1000).toFixed(1);
    const usageObj = usage ? {prompt:usage.prompt_tokens||0,completion:usage.completion_tokens||0,total:usage.total_tokens||0} : null;
    const finalMsg = await dbGet('messages', targetMsgId);
    if (finalMsg) await dbPut('messages', { ...finalMsg, content: cleanText, thinking: thinking||null, elapsed, usage: usageObj });
    await renderMsgs(); scrollTo_(false);
    if (cs(contact?.xAutoTts, s.autoTts) && cleanText) speakText(cleanText);
    checkKwAnims(cleanText, 'ai');
  } catch(e) {
    removeTyping();
    const targetMsg = await dbGet('messages', targetMsgId);
    if (targetMsg) await dbPut('messages', { ...targetMsg, content: `❌ 出错了：${e.message}` });
    await renderMsgs(); scrollTo_(false);
  }
  S.isStreaming = false; stopHapticStream();
}

async function buildMsgsUpTo(chat, contact, mems, beforeMsgId) {
  const msgs = [];
  let sys = cs(contact?.system, S.settings.systemPrompt) || '你是一个可爱温柔的AI助手。';
  if (mems.length) sys += `\n\n[用户记忆]\n${mems.map(m=>`- ${m.text}`).join('\n')}`;
  if (S._stickers.length) {
    const slist = S._stickers.map(s=>`${s.label||s.content||'表情'}`).join(', ');
    const stickerHint = S.settings.stickerCallPrompt ? `\n${S.settings.stickerCallPrompt}` : '';
    sys += `\n\n[表情包库] 可在回复中用 [sticker:标签名] 插入表情。可用: ${slist}${stickerHint}`;
  }
  msgs.push({ role:'system', content:sys });
  if (chat.summary) msgs.push({ role:'system', content:`[历史摘要] ${chat.summary}` });
  const allMsgs = await dbGetAll('messages', 'chatId', chat.id);
  allMsgs.sort((a,b) => a.ts - b.ts);
  const cutIdx = allMsgs.findIndex(m => m.id === beforeMsgId);
  const contextMsgs = cutIdx > 0 ? allMsgs.slice(0, cutIdx) : allMsgs.slice(0, -1);
  const recent = contextMsgs.slice(-parseInt(cs(contact?.xCtx, S.settings.ctx))||20);
  for (const m of recent) {
    if (m.type==='image' && m.imageData && m.role==='user') msgs.push({role:'user',content:[{type:'image_url',image_url:{url:m.imageData}},{type:'text',text:'（图片）'}]});
    else if (m.type==='image' && m.role!=='user') msgs.push({role:'assistant',content:m.content||'[图片]'});
    else if (m.type==='voice' && m.transcript) msgs.push({role:m.role==='user'?'user':'assistant',content:`[语音] ${m.transcript}`});
    else if (m.type==='file') msgs.push({role:m.role==='user'?'user':'assistant',content:`[文件: ${m.fileName}]`});
    else if (m.content) msgs.push({role:m.role==='user'?'user':'assistant',content:m.content});
  }
  return msgs;
}

async function switchMsgVersion(msgId, dir) {
  const msgs = await dbGetAll('messages','chatId',S.currentChat);
  const msg = msgs.find(m => m.id === msgId);
  if (!msg?.altVersions?.length) return;
  const curIdx = msg.altIdx ?? null;
  let newIdx;
  if (dir === -1) {
    if (curIdx === null) newIdx = msg.altVersions.length - 1;
    else if (curIdx > 0) newIdx = curIdx - 1;
    else return;
  } else {
    if (curIdx === null) return;
    else if (curIdx < msg.altVersions.length - 1) newIdx = curIdx + 1;
    else newIdx = null;
  }
  await dbPut('messages', { ...msg, chatId: S.currentChat, altIdx: newIdx });
  await renderMsgs();
}

// ══════════════════════════════
//  ONLINE / IMGGEN
// ══════════════════════════════
function toggleOnline(){S.onlineSearch=!S.onlineSearch;$i('hint-online').style.display=S.onlineSearch?'inline':'none';toast(S.onlineSearch?'🌐 联网已开':'联网已关');closeCtxMenu();}
function toggleImgGen(){S.imgGenMode=!S.imgGenMode;$i('hint-imggen').style.display=S.imgGenMode?'inline':'none';toast(S.imgGenMode?'🎨 图生成模式已开':'图生成已关');closeCtxMenu();}

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
function initScrollObs(){
  const ca=$i('chat-area');
  ca.addEventListener('scroll',()=>{
    const atTop=ca.scrollTop<80;
    const atBot=ca.scrollTop+ca.clientHeight>ca.scrollHeight-80;
    $i('fab-top').classList.toggle('vis',!atTop);
    $i('fab-bottom').classList.toggle('vis',!atBot);
    updateMinimapViewport();
    if (S.isStreaming && !atBot) S._lockScroll = true;
    if (atBot) S._lockScroll = false;
  });
}
function scrollTo_(top,instant){if(!top && S._lockScroll)return;const ca=$i('chat-area');ca.scrollTo({top:top?0:ca.scrollHeight,behavior:instant?'auto':'smooth'});}

// ══════════════════════════════
//  MINIMAP
// ══════════════════════════════
function toggleMinimap(){
  const mm=$i('chat-minimap');
  const body=$i('chat-body');
  const on=mm.classList.toggle('show');
  body.classList.toggle('minimap-on',on);
  saveSetting('minimapOn',on);
  closeCtxMenu();
  if(on)renderMinimap();
}

function renderMinimap(){
  const ca=$i('chat-area');
  const mm=$i('chat-minimap');
  const mc=$i('minimap-content');
  if(!mm||!mc||!mm.classList.contains('show'))return;
  mc.innerHTML='';
  const totalH=ca.scrollHeight;
  const mmH=mm.clientHeight;
  if(totalH<=0||mmH<=0)return;
  const scale=mmH/totalH;
  const children=Array.from(ca.children);
  for(const child of children){
    const blockTop=Math.round(child.offsetTop*scale);
    const blockH=Math.max(2,Math.round(child.offsetHeight*scale));
    const block=document.createElement('div');
    block.className='mm-block';
    block.style.top=blockTop+'px';
    block.style.height=blockH+'px';
    if(child.classList.contains('msg-group')){
      block.classList.add(child.classList.contains('user')?'user':'ai');
    } else if(child.classList.contains('date-div')){
      block.classList.add('date');
    } else if(child.classList.contains('sum-card')){
      block.classList.add('summary');
    } else {
      block.classList.add('other');
    }
    mc.appendChild(block);
  }
  updateMinimapViewport();
}

function updateMinimapViewport(){
  const ca=$i('chat-area');
  const mm=$i('chat-minimap');
  const mv=$i('minimap-viewport');
  if(!mm||!mv||!mm.classList.contains('show'))return;
  const totalH=ca.scrollHeight;
  const mmH=mm.clientHeight;
  if(totalH<=0)return;
  const scale=mmH/totalH;
  const vpTop=Math.round(ca.scrollTop*scale);
  const vpH=Math.max(16,Math.round(ca.clientHeight*scale));
  mv.style.top=vpTop+'px';
  mv.style.height=vpH+'px';
}

function initMinimap(){
  const mm=$i('chat-minimap');
  const ca=$i('chat-area');
  if(!mm||!ca)return;
  mm.addEventListener('click',e=>{
    const rect=mm.getBoundingClientRect();
    const ratio=(e.clientY-rect.top)/mm.clientHeight;
    ca.scrollTo({top:ratio*ca.scrollHeight,behavior:'smooth'});
  });
  // Restore saved state
  const on=S._minimapOn===true;
  if(on){
    mm.classList.add('show');
    $i('chat-body').classList.add('minimap-on');
  }
}

// ══════════════════════════════
//  THEME & APPEARANCE
// ══════════════════════════════
function toggleTheme(){const d=document.documentElement.getAttribute('data-theme')==='dark';document.documentElement.setAttribute('data-theme',d?'light':'dark');S.settings.theme=d?'light':'dark';$i('theme-btn').textContent=d?'🌙':'☀️';saveSetting('theme',S.settings.theme);}
function applyTheme(){document.documentElement.setAttribute('data-theme',S.settings.theme||'light');const btn=$i('theme-btn');if(btn)btn.textContent=S.settings.theme==='dark'?'☀️':'🌙';}
function applyBg(){const ca=$i('chat-area');if(!ca)return;ca.style.background=S.settings.chatBg||'var(--bg)';ca.style.backgroundImage=S.settings.chatBgImg?`url(${S.settings.chatBgImg})`:'none';if(S.settings.chatBgImg){ca.style.backgroundSize='cover';ca.style.backgroundPosition='center';}}
function hexToRgba(hex,a){try{const r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16);return `rgba(${r},${g},${b},${a})`;}catch{return hex;}}
function applyBubble(){
  const s=S.settings;
  const bOpa=s.bubbleOpacity??1;
  const root=document.documentElement;
  root.style.setProperty('--user-bubble',s.userBubble||'#ff8fab');
  root.style.setProperty('--ai-bubble',s.aiBubble||'#ffffff');
  const userC=hexToRgba(s.userBubble||'#ff8fab',bOpa);
  const aiC=hexToRgba(s.aiBubble||'#ffffff',bOpa);
  if(s.userBubbleGradient){
    const c2=hexToRgba(s.userBubbleGradientColor||'#ff4a7d',bOpa);
    root.style.setProperty('--user-bubble-bg',`linear-gradient(135deg,${userC},${c2})`);
  }else{
    root.style.setProperty('--user-bubble-bg',userC);
  }
  root.style.setProperty('--ai-bubble-bg',aiC);
  if(s.bubbleGlow){
    const gs=s.bubbleGlowStrength??8;
    root.style.setProperty('--user-bubble-glow',`0 0 ${gs}px ${s.userBubble||'#ff8fab'},inset 0 0 ${Math.round(gs*.6)}px rgba(255,255,255,0.35)`);
  }else{
    root.style.setProperty('--user-bubble-glow','0 0 0 transparent');
  }
  const lum=getLum(s.userBubble||'#ff8fab');
  const autoUserText=lum>.55?'#3d2c35':'#fff';
  root.style.setProperty('--user-text',s.userTextColor||autoUserText);
  if(s.aiTextColor) root.style.setProperty('--ai-text',s.aiTextColor);
  if(s.fontColor) root.style.setProperty('--text',s.fontColor);
}
function getLum(hex){try{const r=parseInt(hex.slice(1,3),16)/255,g=parseInt(hex.slice(3,5),16)/255,b=parseInt(hex.slice(5,7),16)/255;return .299*r+.587*g+.114*b;}catch{return 0;}}
function applyBubbleSetting(){
  const ca=$i('chat-area');if(!ca)return;
  const contact = S.currentContact ? S._contacts[S.currentContact] : null;
  const showUser = cs(contact?.xShowUserBubble, S.settings.showUserBubble);
  const showAi = cs(contact?.xShowAiBubble, S.settings.showAiBubble);
  ca.classList.toggle('chat-no-user-bubble', showUser===false);
  ca.classList.toggle('chat-no-ai-bubble', showAi===false);
}

const BG_PRESETS=[{c:'#fdf6f0',l:'默认粉'},{c:'#fff0f3',l:'粉白'},{c:'#f0fff4',l:'薄荷'},{c:'#f0f8ff',l:'天蓝'},{c:'#f5f0ff',l:'薰衣草'},{c:'#fffde7',l:'奶油'},{c:'#1a1220',l:'深紫'},{c:'#0d1b2a',l:'深蓝'},{c:'#0d2818',l:'深绿'}];
function openBgModal(){const bg=$i('bg-grid');bg.innerHTML='';BG_PRESETS.forEach(p=>{const d=document.createElement('div');d.className='bg-tile'+(S.settings.chatBg===p.c?' sel':'');d.style.background=p.c;d.style.border='1.5px solid #ccc';d.title=p.l;d.onclick=()=>{S.settings.chatBg=p.c;S.settings.chatBgImg='';applyBg();saveSetting('chatBg',p.c);saveSetting('chatBgImg','');document.querySelectorAll('.bg-tile').forEach(t=>t.classList.remove('sel'));d.classList.add('sel');};bg.appendChild(d);});const cust=document.createElement('div');cust.className='bg-tile';cust.style.background='conic-gradient(red,yellow,lime,cyan,blue,magenta,red)';cust.style.position='relative';cust.innerHTML='<input type="color" style="opacity:0;position:absolute;inset:0;cursor:pointer;width:100%;height:100%" oninput="S.settings.chatBg=this.value;S.settings.chatBgImg=\'\';applyBg();saveSetting(\'chatBg\',this.value)">';bg.appendChild(cust);$i('bg-modal').classList.add('show');}
async function setBgImg(input){
  const file=input.files[0]; if(!file)return;
  const dataUrl=await new Promise(r=>{const fr=new FileReader();fr.onload=e=>r(e.target.result);fr.readAsDataURL(file);});
  toast('上传背景图中…');
  let url=await uploadToCloudinary(dataUrl,'raimos/bg').catch(()=>null);
  url=url||dataUrl;
  S.settings.chatBgImg=url; applyBg(); saveSetting('chatBgImg',url);
}
function clearBgImg(){S.settings.chatBgImg='';applyBg();saveSetting('chatBgImg','');}

const USER_COLORS=['#ff8fab','#ff6b6b','#ffa94d','#51cf66','#339af0','#cc5de8','#f06595','#20c997','#ff4757'];
const AI_COLORS=['#ffffff','#f8f9fa','#e3fafc','#fff3bf','#d3f9d8','#e7f5ff','#f3d9fa','#ffecdb','#2a1f35'];
function renderColorPickers(wrapU,wrapA){wrapU.innerHTML='';wrapA.innerHTML='';USER_COLORS.forEach(c=>{const s=document.createElement('div');s.className='cswatch'+(S.settings.userBubble===c?' sel':'');s.style.background=c;s.onclick=()=>{S.settings.userBubble=c;applyBubble();saveSetting('userBubble',c);renderColorPickers(wrapU,wrapA);};wrapU.appendChild(s);});const u2=document.createElement('div');u2.className='cswatch cust';u2.innerHTML=`<input type="color" value="${S.settings.userBubble}" oninput="S.settings.userBubble=this.value;applyBubble();saveSetting('userBubble',this.value)">`;wrapU.appendChild(u2);AI_COLORS.forEach(c=>{const s=document.createElement('div');s.className='cswatch'+(S.settings.aiBubble===c?' sel':'');s.style.background=c;s.style.border='1.5px solid #ddd';s.onclick=()=>{S.settings.aiBubble=c;applyBubble();saveSetting('aiBubble',c);renderColorPickers(wrapU,wrapA);};wrapA.appendChild(s);});const a2=document.createElement('div');a2.className='cswatch cust';a2.innerHTML=`<input type="color" value="${S.settings.aiBubble}" oninput="S.settings.aiBubble=this.value;applyBubble();saveSetting('aiBubble',this.value)">`;wrapA.appendChild(a2);}

function openAvatarModal(){buildAvatarGrid();$i('avatar-modal').classList.add('show');}

function updateNavUserAv() {
  const btn = $i('nav-user-av'); if (!btn) return;
  const av = S.settings.userAvatar || '😊';
  const iconSpan = btn.querySelector('.nav-me-icon');
  if (iconSpan) {
    if (av.startsWith('data:')) {
      iconSpan.innerHTML = `<img src="${av}" style="width:28px;height:28px;border-radius:50%;object-fit:cover">`;
    } else if (av === '😊') {
      iconSpan.innerHTML = `<svg class="nav-svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="9" cy="10" r="1.3" fill="currentColor" stroke="none"/><circle cx="15" cy="10" r="1.3" fill="currentColor" stroke="none"/><path d="M7.5 14.5 Q9.5 17.5 12 17.5 Q14.5 17.5 16.5 14.5"/><circle cx="7.5" cy="13.5" r="1.5" fill="currentColor" stroke="none" opacity="0.12"/><circle cx="16.5" cy="13.5" r="1.5" fill="currentColor" stroke="none" opacity="0.12"/></svg>`;
    } else {
      iconSpan.innerHTML = `<span style="font-size:20px;line-height:1">${av}</span>`;
    }
  } else {
    // Fallback for old structure
    if (av.startsWith('data:')) btn.innerHTML = `<img src="${av}" style="width:28px;height:28px;border-radius:50%;object-fit:cover">`;
    else btn.textContent = av;
  }
}
function openUserModal() {
  const s = S.settings;
  const av = s.userAvatar || '😊';
  const prev = $i('um-av-preview');
  if (av.startsWith('data:')) prev.innerHTML = `<img src="${av}" style="width:44px;height:44px;border-radius:50%;object-fit:cover">`;
  else prev.textContent = av;
  $i('um-av-val').value = av;
  $i('um-username').value = s.userName || '我';
  $i('um-show-user-av').checked = s.showUserAvatar !== false;
  $i('um-show-ai-av').checked = s.showAiAvatar !== false;
  // 加载我的状态
  const statusInp = $i('um-my-status');
  if (statusInp) statusInp.value = S.myStatus || '';
  // 填充 AI 联系人选择器
  const sel = $i('um-ai-contact');
  if (sel) {
    sel.innerHTML = '<option value="">— 选择助手 —</option>';
    Object.values(S._contacts).forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.id;
      const av2 = c.avatar?.startsWith('data:') ? '🤖' : (c.avatar || '🤖');
      opt.textContent = av2 + ' ' + (c.name || '助手');
      sel.appendChild(opt);
    });
  }
  const info = $i('um-auth-info');
  const logoutBtn = $i('um-logout-btn');
  if (window._fbUser) { info.textContent = '已登录：' + window._fbUser.email; logoutBtn.style.display = ''; }
  else { info.textContent = '未登录'; logoutBtn.style.display = 'none'; }
  $i('user-modal').classList.add('show');
}
async function saveUserProfile() {
  const s = S.settings;
  s.userAvatar = $i('um-av-val').value || '😊';
  s.userName = $i('um-username').value.trim() || '我';
  s.showUserAvatar = $i('um-show-user-av').checked;
  s.showAiAvatar = $i('um-show-ai-av').checked;
  const newStatus = ($i('um-my-status')?.value || '').trim();
  if (newStatus) S.myStatus = newStatus;
  await saveSetting('userAvatar', s.userAvatar);
  await saveSetting('userName', s.userName);
  await saveSetting('showUserAvatar', s.showUserAvatar);
  await saveSetting('showAiAvatar', s.showAiAvatar);
  if (newStatus) await saveSetting('myStatus', S.myStatus);
  updateNavUserAv();
  if (S.currentChat) await renderMsgs();
  closeModal('user-modal'); toast('✅ 已保存');
}

async function doAiMessage() {
  const status = ($i('um-my-status')?.value || '').trim();
  const contactId = $i('um-ai-contact')?.value;
  if (!status) { toast('请先写上你的状态'); return; }
  if (!contactId) { toast('请选择一个助手'); return; }
  S.myStatus = status;
  await saveSetting('myStatus', status);
  updateHeaderStatus();
  closeModal('user-modal');
  toast('AI 正在写便签…');

  const contact = S._contacts[contactId];
  const s = S.settings;
  const useKey = contact?.apiKey || s.apiKey;
  const useUrl = contact?.apiUrl || s.apiUrl || 'https://openrouter.ai/api/v1/chat/completions';
  if (!useKey) { toast('请先填写 API Key'); return; }

  try {
    const res = await fetch(useUrl, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${useKey}`, 'Content-Type': 'application/json', 'HTTP-Referer': 'https://raimos.app', 'X-Title': 'Raimos' },
      body: JSON.stringify({
        model: contact?.model || s.model || 'openai/gpt-4o-mini',
        messages: [
          { role: 'system', content: contact?.system || `你是${contact?.name || 'AI'}，温柔体贴。` },
          { role: 'user', content: `我现在的状态是：${status}。请给我写一条温暖的便签留言（不超过60字，像朋友写的便利贴，不加引号）：` }
        ],
        temperature: contact?.temp ?? parseFloat(s.temp ?? 0.85),
        stream: false,
        max_tokens: 120,
      }),
    });
    const d = await res.json();
    const content = (d.choices?.[0]?.message?.content || '').trim();
    if (!content) throw new Error('AI 没有回复');

    const note = {
      id: uid(), status, contactId,
      aiName: contact?.name || 'AI',
      aiAvatar: contact?.avatar || '🤖',
      content, ts: Date.now(), read: false,
    };
    await dbPut('statusNotes', note);
    updateStatusNoteBadge();
    toast(`📝 ${contact?.name || 'AI'} 给你留了一张便签！`);
  } catch (e) {
    toast('❌ 留言失败：' + e.message);
  }
}
async function uploadUserAv(input) {
  const file = input.files[0]; if (!file) return;
  const compressed = await compressImg(file, 200);
  toast('上传头像中…');
  let url = await uploadToCloudinary(compressed, 'raimos/avatars').catch(()=>null);
  url = url || compressed;
  $i('um-av-val').value = url;
  const prev = $i('um-av-preview');
  prev.innerHTML = `<img src="${url}" style="width:44px;height:44px;border-radius:50%;object-fit:cover">`;
  input.value = '';
}
function openInlineUserAvPicker() {
  const picker = $i('user-av-picker');
  picker.innerHTML = '';
  picker.style.display = picker.style.display === 'none' ? 'flex' : 'none';
  const emojis = ['😊','😎','🥰','🤩','😈','👻','🐱','🐶','🐻','🐼','🦊','🤖','🌸','⭐','🌙','🎀'];
  emojis.forEach(e => {
    const b = document.createElement('button');
    b.textContent = e; b.style.cssText = 'font-size:22px;padding:4px;border:1.5px solid var(--border);border-radius:8px;background:none;cursor:pointer;';
    b.onclick = () => {
      $i('um-av-val').value = e;
      const prev = $i('um-av-preview'); prev.innerHTML = ''; prev.textContent = e;
      picker.style.display = 'none';
    };
    picker.appendChild(b);
  });
}
function buildAvatarGrid(){const g=$i('avatar-grid');g.innerHTML='';['🐱','🐶','🐻','🐼','🦊','🐰','🐯','🦁','🐸','🤖','🦄','🌸','⭐','🌙','🎀','🎵'].forEach(e=>{const b=document.createElement('button');b.textContent=e;b.style.cssText='font-size:24px;padding:5px;border:2px solid var(--border);border-radius:9px;background:none;cursor:pointer';b.onclick=()=>{S.settings.aiAvatar=e;const h=$i('hdr-avatar');h.textContent=e;saveSetting('aiAvatar',e);};g.appendChild(b);});}
async function uploadAvatar(input){
  const file=input.files[0]; if(!file)return;
  const compressed=await compressImg(file,200);
  toast('上传头像中…');
  let url=await uploadToCloudinary(compressed,'raimos/avatars').catch(()=>null);
  url=url||compressed;
  S.settings.aiAvatar=url;
  const h=$i('hdr-avatar');
  h.innerHTML=`<img src="${url}">`;
  saveSetting('aiAvatar',url);
}

// ══════════════════════════════
//  SETTINGS UI
// ══════════════════════════════
function buildSettingsUI() {
  const pageEl=$i('settings-page'); if(pageEl)pageEl.classList.remove('settings-subpage-open');
  const wrap = $i('settings-wrap'); if (!wrap) return;
  const s = S.settings;
  wrap.innerHTML = `
    <div class="s-section" hidden><h3>🔑 API 配置（全局默认）</h3>
      <div class="s-row"><label>API Key</label><input type="password" id="s-key" value="${s.apiKey||''}" placeholder="sk-or-… 助手未填时使用此Key"/></div>
      <div class="s-row"><label>API 地址</label><input type="text" id="s-apiurl" value="${s.apiUrl||''}" placeholder="留空用 OpenRouter，助手未填时使用"/></div>
      <div class="s-row"><label>默认模型</label>
        <div style="flex:1">
          <input class="model-search-inp" id="s-model-search" placeholder="搜索模型… 助手未设时使用，留空则自动" oninput="filterModels('s')"/>
          <div class="model-list" id="s-model-list"></div>
          <input type="hidden" id="s-model" value="${s.model||''}"/>
        </div>
      </div>
      <div class="s-row"><label>默认系统提示词</label><textarea id="s-systemprompt" placeholder="助手未设提示词时使用…" style="min-height:56px" data-expandable="true" data-expand-title="全局系统提示词">${s.systemPrompt||''}</textarea></div>
      <div class="s-row"><label>Tavily Key (搜索)</label><input type="password" id="s-tavily" value="${s.tavilyKey||''}" placeholder="可选，联网搜索"/></div>
      <div class="s-row"><label>Unsplash Key (图片)</label><input type="password" id="s-unsplash" value="${s.unsplashKey||''}" placeholder="可选，朋友圈搜图"/></div>
    </div>
    <div class="s-section" hidden><h3>👤 个人信息</h3>
      <div style="font-size:12px;color:var(--text3);margin-bottom:8px">基本信息用于AI天气查询等功能</div>
      <div class="s-row"><label>所在城市</label><input type="text" id="s-city" value="${s.city||''}" placeholder="如：北京、上海（用于查天气）"/></div>
      <div style="font-size:11px;color:var(--text3);margin-top:6px;padding:6px 8px;background:var(--hover);border-radius:8px">💡 我的名称、头像在 🎨 外观 中设置；记忆与参考设置请到 ⭐ 记忆设置</div>
    </div>
    <div class="s-section" hidden><h3>⭐ 记忆设置</h3>
      <div style="font-size:12px;color:var(--text3);margin-bottom:8px">控制 AI 发朋友圈/陪伴/聊天 等功能如何参考历史和记忆库</div>
      <div class="s-row"><label>AI发圈参考最近聊天</label><label class="toggle"><input type="checkbox" id="s-ref-chat" ${s.refChatEnabled?'checked':''}><span class="tslider"></span></label></div>
      <div class="s-row"><label>参考聊天条数</label><input type="number" id="s-ref-chat-count" value="${s.refChatCount||5}" min="1" max="50" style="max-width:70px"/> 条<span style="font-size:11px;color:var(--text3)">（最近N条对话）</span></div>
      <div class="s-row"><label>AI发圈参考记忆库</label><label class="toggle"><input type="checkbox" id="s-ref-mem" ${s.refMemEnabled!==false?'checked':''}><span class="tslider"></span></label></div>
      <div class="s-row"><label>AI 自动记忆</label><label class="toggle"><input type="checkbox" id="s-auto-mem" ${s.autoMemEnabled!==false?'checked':''}><span class="tslider"></span></label><span style="font-size:11px;color:var(--text3)"> 聊天时自动提取重要信息</span></div>
      <div class="s-row"><label>记忆检查频率</label><input type="number" id="s-auto-mem-interval" value="${s.autoMemInterval||5}" min="1" max="50" style="max-width:70px"/><span style="font-size:11px;color:var(--text3)"> 条AI回复检查一次</span></div>
    </div>
    <div class="s-section" hidden><h3>🖼️ Cloudinary 图床</h3>
      <div style="font-size:12px;color:var(--text3);margin-bottom:8px">用于图片云端存储（头像、表情包、相册等）。<a href="https://cloudinary.com" target="_blank" style="color:var(--accent)">免费注册</a>后填入下方信息。Upload preset 选 unsigned 模式。</div>
      <div class="s-row"><label>Cloud Name</label><input type="text" id="s-cld-cloud" value="${s.cloudinaryCloud||''}" placeholder="your-cloud-name"/></div>
      <div class="s-row"><label>Upload Preset</label><input type="text" id="s-cld-preset" value="${s.cloudinaryPreset||''}" placeholder="unsigned preset 名称"/></div>
    </div>
    <div class="s-section" hidden><h3>🚂 后台服务</h3>
      <div style="font-size:12px;color:var(--text3);margin-bottom:8px">部署后台服务（Railway）后，把访问地址填入下方，前端将对接 AI 主动行为功能。</div>
      <div class="s-row"><label>后台服务地址</label><input type="text" id="s-backend-url" value="${s.backendUrl||''}" placeholder="https://xxx.railway.app"/></div>
      <div class="s-row"><label>消息推送通知</label>
        <div style="display:flex;flex-direction:column;gap:5px">
          <label class="toggle"><input type="checkbox" id="s-push-enabled" ${s.pushEnabled?'checked':''}><span class="tslider"></span></label>
          <div style="font-size:11px;color:var(--text3)">开启后AI主动消息和朋友圈会在后台推送通知到浏览器（需要后台服务支持，且后台配置 VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY）</div>
          <button class="btn-s" onclick="initPushNotifications()" style="width:fit-content">🔔 立即订阅</button>
          <button class="btn-s" onclick="unsubscribePush()" style="width:fit-content">🔕 取消订阅</button>
        </div>
      </div>
      <div style="font-size:11px;color:var(--text3)">💡 部署说明见 <code>backend/README.md</code></div>
    </div>
    <div class="s-section" hidden><h3>🎬 开屏动画</h3>
      <div style="font-size:12px;color:var(--text3);margin-bottom:10px">每次打开 App 时播放一段动画，支持上传视频或图片，留空则显示默认脉冲动画。</div>
      <div class="s-row"><label>启用开屏</label><label class="toggle"><input type="checkbox" id="s-splash-enabled" ${s.splashEnabled?'checked':''}><span class="tslider"></span></label></div>
      <div class="s-row"><label>播放时长（图片）</label><input type="number" id="s-splash-dur" value="${s.splashDuration||4}" min="1" max="30" style="max-width:70px"/> 秒</div>
      <div class="s-row"><label>开屏素材</label>
        <div style="display:flex;gap:7px;align-items:center;flex-wrap:wrap">
          <button class="btn-s" onclick="$i('splash-media-file').click()">📁 选择文件</button>
          <span id="splash-file-label" style="font-size:11px;color:var(--text3)">${s.splashMediaId?'已有素材':'未选择文件'}</span>
          ${s.splashMediaId?`<button class="btn-s" onclick="clearSplashMedia()" style="color:#e74c3c">✕ 清除</button>`:''}
        </div>
      </div>
      <div style="font-size:11px;color:var(--text3)">支持 mp4/webm 视频（视频播放完自动跳过）或 jpg/png 图片（按时长自动跳过），点击画面可随时跳过。</div>
      <div style="margin-top:10px"><button class="btn-s" onclick="initSplashScreen()">▶ 预览开屏效果</button></div>
    </div>
    <div class="s-section" hidden><h3>☁️ 云同步</h3>
      <div style="padding:4px 0 10px;font-size:12px;color:var(--text3)">登录后可同步助手、对话、记忆、朋友圈、相册、表情包、关键词动画到云端。</div>
      <div style="display:flex;gap:7px;flex-wrap:wrap;">
        <button class="btn-p" onclick="openAuthModal()">🔐 登录 / 注册</button>
        <button class="btn-s" onclick="syncToCloud()">☁️ 上传同步</button>
        <button class="btn-s" onclick="restoreFromCloud()">⬇️ 从云端恢复</button>
      </div>
      <div id="auth-info" style="margin-top:8px;font-size:12px;color:var(--text3)"></div>
      <div id="pwa-install-section" style="margin-top:14px;padding-top:12px;border-top:1.5px solid var(--border)">
        <div style="font-size:13px;font-weight:800;color:var(--text);margin-bottom:6px">📱 安装到桌面</div>
        <div id="pwa-install-hint" style="font-size:12px;color:var(--text3);line-height:1.6;margin-bottom:8px"></div>
        <button id="pwa-install-btn" class="btn-p" style="display:none" onclick="triggerPwaInstall()">⬇️ 安装 App</button>
      </div>
    </div>
    <div class="s-section" hidden><h3>🗣️ 语音</h3>
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
    <div class="s-section" hidden><h3>🤖 对话参数</h3>
      <div class="s-row"><label>流式输出</label><label class="toggle"><input type="checkbox" id="s-stream" ${s.stream!==false?'checked':''}><span class="tslider"></span></label></div>
      <div class="s-row"><label>显示Token用量</label><label class="toggle"><input type="checkbox" id="s-show-token" ${s.showToken?'checked':''}><span class="tslider"></span></label></div>
      <div class="s-row"><label>游戏AI Token用量</label><label class="toggle"><input type="checkbox" id="s-show-game-token" ${s.showGameToken?'checked':''}><span class="tslider"></span></label></div>
      <div class="s-row"><label>显示思考过程</label><label class="toggle"><input type="checkbox" id="s-show-think" ${s.showThink!==false?'checked':''}><span class="tslider"></span></label></div>
      <div class="s-row"><label>Temperature</label><input type="range" id="s-temp" min="0" max="2" step="0.05" value="${s.temp||0.85}" oninput="$i('s-temp-v').textContent=this.value"><span class="rval" id="s-temp-v">${s.temp||0.85}</span></div>
      <div class="s-row"><label>上下文消息数</label><input type="number" id="s-ctx" value="${s.ctx||20}" min="2" max="1000" style="max-width:80px"/><span style="font-size:11px;color:var(--text3)">条 (最高1000)</span></div>
      <div class="s-row"><label>图片压缩尺寸</label><input type="range" id="s-imgsize" min="256" max="2048" step="128" value="${s.imgSize||800}" oninput="$i('s-imgsize-v').textContent=this.value+'px'"><span class="rval" id="s-imgsize-v">${s.imgSize||800}px</span></div>
      <div class="s-row"><label>摘要阈值</label><input type="number" id="s-sumthresh" value="${s.sumThresh||40}" min="10" max="200" style="max-width:80px"/><span style="font-size:11px;color:var(--text3)">条后自动摘要</span></div>
      <div class="s-row"><label>AI回复触感反馈（打字感）</label><label class="toggle"><input type="checkbox" id="s-haptic-ai-reply" ${s.hapticOnAiReply?'checked':''}><span class="tslider"></span></label><span style="font-size:11px;color:var(--text3)">流式输出时微弱震动</span></div>
      <div class="s-row"><label>正在输入动画形状</label>
        <select id="s-typing-shape">
          <option value="heart" ${(s.typingAnimShape||'heart')==='heart'?'selected':''}>♥ 心形（粉色ECG）</option>
          <option value="star" ${s.typingAnimShape==='star'?'selected':''}>★ 星星</option>
          <option value="sparkle" ${s.typingAnimShape==='sparkle'?'selected':''}>✦ 光点</option>
          <option value="bear" ${s.typingAnimShape==='bear'?'selected':''}>🐻 小熊</option>
          <option value="cat" ${s.typingAnimShape==='cat'?'selected':''}>🐱 小猫</option>
          <option value="dot" ${s.typingAnimShape==='dot'?'selected':''}>••• 圆点（经典）</option>
        </select>
      </div>
      <div class="s-row"><label>开启正在输入动画</label><label class="toggle"><input type="checkbox" id="s-typing-anim" ${s.typingAnimEnabled!==false?'checked':''}><span class="tslider"></span></label></div>
    </div>
    <div class="s-section" hidden><h3>📳 触感与动效</h3>
      <div style="font-size:12px;color:var(--text3);margin-bottom:8px">⚠️ iOS Safari 不支持网页振动 API，触感反馈仅 Android 有效</div>
      <div class="s-row"><label>开启触感反馈</label><label class="toggle"><input type="checkbox" id="s-haptic-enabled" ${s.hapticEnabled!==false?'checked':''}><span class="tslider"></span></label></div>
    </div>
    <div class="s-section" hidden><h3>🎨 外观</h3>
      <div class="s-row"><label>主题</label>
        <select id="s-theme" onchange="S.settings.theme=this.value;applyTheme();saveSetting('theme',this.value)">
          <option value="light">☀️ 明亮</option>
          <option value="dark">🌙 深色</option>
        </select>
      </div>
      <div class="s-row"><label>聊天背景</label><button class="btn-s" onclick="openBgModal()">🖼️ 选择背景</button></div>
      <div class="s-row"><label>字体大小</label><input type="range" id="s-fontsize" min="11" max="20" step="1" value="${s.fontSize||14}" oninput="$i('s-fontsize-v').textContent=this.value+'px';document.documentElement.style.setProperty('--font-size',this.value+'px')"><span class="rval" id="s-fontsize-v">${s.fontSize||14}px</span></div>
      <div class="s-row"><label>背景透明度</label><input type="range" id="s-bgopa" min="0" max="1" step="0.05" value="${s.bgOpacity??1}" oninput="$i('s-bgopa-v').textContent=Math.round(this.value*100)+'%';document.documentElement.style.setProperty('--bg-opacity',this.value)"><span class="rval" id="s-bgopa-v">${Math.round((s.bgOpacity??1)*100)}%</span></div>
      <div class="s-row"><label>用户气泡色</label><div class="color-row" id="cr-user"></div></div>
      <div class="s-row"><label>AI 气泡色</label><div class="color-row" id="cr-ai"></div></div>
      <div class="s-row"><label>我的气泡文字色</label><div style="display:flex;align-items:center;gap:6px"><input type="color" id="s-user-text-color" value="${s.userTextColor||'#ffffff'}" oninput="S.settings.userTextColor=this.value;applyBubble();saveSetting('userTextColor',this.value)"><button class="btn-s" style="font-size:11px;padding:2px 7px" onclick="S.settings.userTextColor='';applyBubble();saveSetting('userTextColor','');$i('s-user-text-color').value='#ffffff'">自动</button></div></div>
      <div class="s-row"><label>AI 气泡文字色</label><div style="display:flex;align-items:center;gap:6px"><input type="color" id="s-ai-text-color" value="${s.aiTextColor||'#3d2c35'}" oninput="S.settings.aiTextColor=this.value;applyBubble();saveSetting('aiTextColor',this.value)"><button class="btn-s" style="font-size:11px;padding:2px 7px" onclick="S.settings.aiTextColor='';applyBubble();saveSetting('aiTextColor','');$i('s-ai-text-color').value='#3d2c35'">自动</button></div></div>
      <div class="s-row"><label>全局字体颜色</label><div style="display:flex;align-items:center;gap:6px"><input type="color" id="s-font-color" value="${s.fontColor||'#3d2c35'}" oninput="S.settings.fontColor=this.value;applyBubble();saveSetting('fontColor',this.value)"><button class="btn-s" style="font-size:11px;padding:2px 7px" onclick="S.settings.fontColor='';applyBubble();saveSetting('fontColor','');$i('s-font-color').value='#3d2c35'">自动</button></div></div>
      <div class="s-row"><label>我的名称</label><input type="text" id="s-username" value="${s.userName||'我'}"/></div>
      <div class="s-row"><label>显示我的头像</label><label class="toggle"><input type="checkbox" id="s-show-user-av" ${s.showUserAvatar!==false?'checked':''}><span class="tslider"></span></label></div>
      <div class="s-row"><label>显示 AI 头像</label><label class="toggle"><input type="checkbox" id="s-show-ai-av" ${s.showAiAvatar!==false?'checked':''}><span class="tslider"></span></label></div>
      <div class="s-row"><label>显示我的聊天气泡</label><label class="toggle"><input type="checkbox" id="s-show-user-bubble" ${s.showUserBubble!==false?'checked':''}><span class="tslider"></span></label></div>
      <div class="s-row"><label>显示 AI 聊天气泡</label><label class="toggle"><input type="checkbox" id="s-show-ai-bubble" ${s.showAiBubble!==false?'checked':''}><span class="tslider"></span></label></div>
      <div class="s-row"><label>气泡透明度</label><input type="range" id="s-bubble-opacity" min="0.1" max="1" step="0.05" value="${s.bubbleOpacity??1}" oninput="$i('s-bubble-opacity-v').textContent=Math.round(this.value*100)+'%';S.settings.bubbleOpacity=parseFloat(this.value);applyBubble();saveSetting('bubbleOpacity',parseFloat(this.value))"><span class="rval" id="s-bubble-opacity-v">${Math.round((s.bubbleOpacity??1)*100)}%</span></div>
      <div class="s-row"><label>用户气泡渐变色</label><label class="toggle"><input type="checkbox" id="s-bubble-gradient" ${s.userBubbleGradient?'checked':''} onchange="S.settings.userBubbleGradient=this.checked;applyBubble();saveSetting('userBubbleGradient',this.checked);$i('s-bubble-gradient-extra').style.display=this.checked?'':'none'"><span class="tslider"></span></label></div>
      <div id="s-bubble-gradient-extra" style="${s.userBubbleGradient?'':'display:none'}">
        <div class="s-row"><label>渐变终止色</label><input type="color" id="s-bubble-gradient-color" value="${s.userBubbleGradientColor||'#ff4a7d'}" oninput="S.settings.userBubbleGradientColor=this.value;applyBubble();saveSetting('userBubbleGradientColor',this.value)"/><span style="font-size:11px;color:var(--text3);margin-left:6px">与用户气泡色形成渐变</span></div>
      </div>
      <div class="s-row"><label>气泡边缘发光</label><label class="toggle"><input type="checkbox" id="s-bubble-glow" ${s.bubbleGlow?'checked':''} onchange="S.settings.bubbleGlow=this.checked;applyBubble();saveSetting('bubbleGlow',this.checked);$i('s-bubble-glow-extra').style.display=this.checked?'':'none'"><span class="tslider"></span></label></div>
      <div id="s-bubble-glow-extra" style="${s.bubbleGlow?'':'display:none'}">
        <div class="s-row"><label>发光范围</label><input type="range" id="s-bubble-glow-strength" min="2" max="30" step="1" value="${s.bubbleGlowStrength??8}" oninput="$i('s-bubble-glow-strength-v').textContent=this.value+'px';S.settings.bubbleGlowStrength=parseInt(this.value);applyBubble();saveSetting('bubbleGlowStrength',parseInt(this.value))"><span class="rval" id="s-bubble-glow-strength-v">${s.bubbleGlowStrength??8}px</span></div>
      </div>
    </div>
    <div class="s-section" hidden><h3>🐾 主动消息</h3>
      <div style="font-size:11px;color:var(--text3);margin-bottom:8px">需要部署后台服务（Railway）才能离线触发</div>
      <div class="s-row"><label>启用</label><label class="toggle"><input type="checkbox" id="s-proactive" ${s.proactive?'checked':''}><span class="tslider"></span></label></div>
      <div class="s-row"><label>发消息的助手</label>
        <select id="s-pro-contact" style="flex:1">
          <option value="">-- 请选择 --</option>
          ${Object.values(S._contacts).map(c=>`<option value="${c.id}" ${s.proContactId===c.id?'selected':''}>${esc(c.name)}</option>`).join('')}
        </select>
      </div>
      <div class="s-row"><label>每天最多</label><input type="number" id="s-pro-max" value="${s.proMax||3}" min="1" max="20" style="max-width:60px"/> 次</div>
      <div class="s-row"><label>活跃时段</label><input type="number" id="s-pro-start" value="${s.proStart??8}" min="0" max="23" style="max-width:55px"/><span style="color:var(--text3);font-size:11px">:00 ~</span><input type="number" id="s-pro-end" value="${s.proEnd??22}" min="0" max="23" style="max-width:55px"/><span style="color:var(--text3);font-size:11px">:00</span></div>
    </div>
    <div class="s-section" hidden><h3>🌸 朋友圈（全局默认）</h3>
      <div style="font-size:11px;color:var(--text3);margin-bottom:8px">各助手可在扩展设置中单独覆盖</div>
      <div class="s-row"><label>我的相册</label><button class="btn-s" onclick="openAlbumModal()">🖼️ 管理相册（AI发圈用图）</button></div>
      <div class="s-row"><label>启用朋友圈</label><label class="toggle"><input type="checkbox" id="s-moments-enabled" ${s.momentsEnabled?'checked':''}><span class="tslider"></span></label></div>
      <div class="s-row"><label>AI 自动发圈</label><label class="toggle"><input type="checkbox" id="s-auto-post" ${s.autoPost?'checked':''}><span class="tslider"></span></label></div>
      <div class="s-row"><label>发圈频率</label>
        <select id="s-moment-freq-mode" style="max-width:90px">
          <option value="perDay" ${(s.momentFreqMode||'perWeek')==='perDay'?'selected':''}>每天</option>
          <option value="perWeek" ${(s.momentFreqMode||'perWeek')==='perWeek'?'selected':''}>每周</option>
        </select>
        <input type="number" id="s-moment-freq-count" value="${s.momentFreqCount||3}" min="1" max="30" style="max-width:55px"/>
        <span style="font-size:11px;color:var(--text3)">次（随机分布）</span>
      </div>
      <div class="s-row"><label>朋友圈专属提示词</label>
        <div style="flex:1">
          <div style="display:flex;gap:6px;margin-bottom:4px">
            <select id="s-moment-prompt-mode" style="max-width:100px">
              <option value="add" ${(s.momentPromptMode||'add')==='add'?'selected':''}>追加到系统词</option>
              <option value="replace" ${s.momentPromptMode==='replace'?'selected':''}>替换系统词</option>
            </select>
          </div>
          <textarea id="s-moment-prompt" rows="3" placeholder="留空则使用系统提示词。填写后AI发圈/评论时使用此词。" style="width:100%;font-size:12px;resize:vertical" data-expandable="true" data-expand-title="朋友圈专属提示词">${esc(s.momentPrompt||'')}</textarea>
          <div style="font-size:11px;color:var(--text3);margin-top:3px">💡 如某助手在扩展设置→朋友圈中有单独配置，则优先使用助手的设置而非此处全局设置。</div>
        </div>
      </div>
      <div class="s-row"><label>朋友圈Token显示</label><label class="toggle"><input type="checkbox" id="s-show-moment-token" ${s.showMomentToken?'checked':''}><span class="tslider"></span></label></div>
      <div class="s-row"><label>AI 自动评论</label><label class="toggle"><input type="checkbox" id="s-auto-comment" ${s.autoComment?'checked':''}><span class="tslider"></span></label></div>
      <div class="s-row"><label>评论检查间隔</label><input type="number" id="s-comment-freq" value="${s.commentFreqMins||360}" min="1" max="10000" style="max-width:80px"/> 分钟 <span style="font-size:11px;color:var(--text3)">（只评论未评论过的新帖）</span></div>
      <div class="s-row"><label>单帖最多评论句数</label><input type="number" id="s-max-comments" value="${s.maxComments||1}" min="1" max="5" style="max-width:60px"/> <span style="font-size:11px;color:var(--text3)">句（随机 1~N）</span></div>
      <div class="s-row"><label>自动回复评论</label><label class="toggle"><input type="checkbox" id="s-reply-comments" ${s.replyMomentComments?'checked':''}><span class="tslider"></span></label></div>
      <div class="s-row"><label>回复延迟</label><input type="number" id="s-reply-delay" value="${s.replyDelay||120}" min="10" max="3600" style="max-width:80px"/> 秒 <span style="font-size:11px;color:var(--text3)">（±40%随机，也回复自己评论的回复）</span></div>
      <div class="s-row"><label>AI 自动点赞</label><label class="toggle"><input type="checkbox" id="s-auto-like" ${s.autoLike?'checked':''}><span class="tslider"></span></label></div>
      <div class="s-row"><label>点赞概率</label><input type="range" id="s-like-prob" min="0" max="100" step="10" value="${s.likeProb||60}" oninput="$i('s-like-prob-v').textContent=this.value+'%'"><span class="rval" id="s-like-prob-v">${s.likeProb||60}%</span></div>
      <div style="font-size:11px;color:var(--text3);margin:4px 0 8px;padding:6px 8px;background:var(--hover);border-radius:8px">💡 图片来源说明：<b>联网搜索</b>需在上方填 Unsplash Key；<b>生成图片</b>使用助手的 API Key（即上方 API Key）</div>
      <div class="s-row"><label>发圈带图片</label><label class="toggle"><input type="checkbox" id="s-post-images" ${s.postImages?'checked':''}><span class="tslider"></span></label></div>
      <div class="s-row"><label>带图概率</label><input type="range" id="s-image-freq" min="0" max="100" step="10" value="${s.imageFreq||50}" oninput="$i('s-image-freq-v').textContent=this.value+'%'"><span class="rval" id="s-image-freq-v">${s.imageFreq||50}%</span></div>
      <div class="s-row"><label>图片来源</label><div style="display:flex;gap:10px;flex-wrap:wrap;font-size:12px">
        <label><input type="checkbox" id="s-imgsrc-album" ${(s.imageSources||'album').includes('album')?'checked':''}> 我的相册</label>
        <label><input type="checkbox" id="s-imgsrc-search" ${(s.imageSources||'').includes('search')?'checked':''}> 联网搜索</label>
        <label><input type="checkbox" id="s-imgsrc-generate" ${(s.imageSources||'').includes('generate')?'checked':''}> 生成图片</label>
      </div></div>
      <div class="s-row" style="align-items:flex-start"><label style="padding-top:6px">配图提示词</label>
        <textarea id="s-moment-img-prompt" rows="2" placeholder="可选：描述想要什么样的配图（如"唯美风景"），留空则 AI 自动判断" style="flex:1;font-size:12px;resize:vertical">${esc(s.momentImgPrompt||'')}</textarea>
      </div>
    </div>
    <div class="s-section" hidden><h3>📨 AI聊天发图</h3>
      <div style="font-size:11px;color:var(--text3);margin-bottom:8px">各助手可在扩展设置中单独覆盖</div>
      <div class="s-row"><label>AI 发图功能</label><label class="toggle"><input type="checkbox" id="s-ai-chat-images" ${s.aiChatImages?'checked':''}><span class="tslider"></span></label></div>
      <div class="s-row"><label>发图概率</label><input type="range" id="s-ai-chat-image-freq" min="0" max="100" step="5" value="${s.aiChatImageFreq||20}" oninput="$i('s-ai-chat-image-freq-v').textContent=this.value+'%'"><span class="rval" id="s-ai-chat-image-freq-v">${s.aiChatImageFreq||20}%</span></div>
      <div class="s-row"><label>图片来源</label><div style="display:flex;gap:10px;flex-wrap:wrap;font-size:12px">
        <label><input type="checkbox" id="s-aichat-src-album" ${(s.aiChatImageSources||'album').includes('album')?'checked':''}> 我的相册</label>
        <label><input type="checkbox" id="s-aichat-src-search" ${(s.aiChatImageSources||'').includes('search')?'checked':''}> 联网搜索</label>
        <label><input type="checkbox" id="s-aichat-src-generate" ${(s.aiChatImageSources||'').includes('generate')?'checked':''}> 生成图片</label>
      </div></div>
    </div>
    <div class="s-section" hidden><h3>🎲 图片生成</h3>
      <div class="s-row"><label>生图模型</label>
        <select id="s-imggen-model" onchange="onImgGenChange('s')">
          <option value="openai/dall-e-3">DALL-E 3</option>
          <option value="stabilityai/stable-diffusion-xl-base-1.0">SDXL</option>
          <option value="custom">🔧 自定义…</option>
        </select>
      </div>
      <div id="s-imggen-custom-wrap" style="display:none">
        <div class="s-row"><label>模型名称</label><input type="text" id="s-imggen-custom-model" value="${s.imgGenCustomModel||''}" placeholder="例: black-forest-labs/FLUX.1-schnell"/></div>
        <div class="s-row"><label>API URL</label><input type="text" id="s-imggen-api-url" value="${s.imgGenApiUrl||''}" placeholder="留空继承全局"/></div>
        <div class="s-row"><label>API Key</label><input type="password" id="s-imggen-api-key" value="${s.imgGenApiKey||''}" placeholder="留空继承全局"/></div>
      </div>
    </div>
    <div class="s-section" hidden><h3>💾 数据管理</h3>
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
    const ig = $i('s-imggen-model');
    if(ig){ const v=s.imgGenModel||'openai/dall-e-3'; ig.value=v; onImgGenChange('s'); }
    const th = $i('s-theme'); if(th)th.value=s.theme||'light';
    onTtsModeChange(); initVoices();
    renderColorPickers($i('cr-user'),$i('cr-ai'));
    renderModelList('s', s.model||'');
    updateStorageInfo();
    const ai = $i('auth-info');
    if (ai) ai.textContent = window._fbUser ? ('已登录：' + window._fbUser.email) : '未登录';
    updatePwaInstallUI();
    initSettingsSubpages();
    addExpandBtns();
  },0);
}

function initSettingsSubpages(){
  const wrap=$i('settings-wrap'); if(!wrap)return;
  const sections=Array.from(wrap.querySelectorAll('.s-section'));
  if(!sections.length)return;
  wrap.dataset.subpages='1';
  const home=document.createElement('div'); home.className='settings-home';
  home.innerHTML='<div class="settings-home-tip">点击大标题进入对应设置，每个页面都有独立保存按钮。</div>';
  sections.forEach((section,idx)=>{
    const title=section.querySelector('h3')?.textContent?.trim()||`设置 ${idx+1}`;
    const tile=document.createElement('button'); tile.type='button'; tile.className='settings-tile';
    // Extract leading emoji for the icon badge
    const chars=[...title]; const hasEmoji=chars[0]&&chars[0].codePointAt(0)>127;
    const iconEmoji=hasEmoji?chars[0]:'⚙'; const titleText=(hasEmoji?chars.slice(1).join(''):title).trim();
    tile.innerHTML=`<div class="s-tile-icon-wrap"><span>${iconEmoji}</span></div><div class="s-tile-info"><span class="s-tile-name">${esc(titleText)}</span><small>进入设置 ›</small></div>`;
    tile.onclick=()=>openSettingsSection(section,title,home);
    home.appendChild(tile); section.hidden=true;
  });
  wrap.prepend(home);
}
function openSettingsSection(section,title,home){
  const wrap=$i('settings-wrap'); if(!wrap)return;
  // Remove any previous subpage header
  wrap.querySelectorAll('.s-subpage-header').forEach(h=>h.remove());
  $i('settings-page')?.classList.add('settings-subpage-open');
  home.style.display='none';
  section.hidden=false;
  const header=document.createElement('div'); header.className='settings-subpage-header s-subpage-header';
  header.innerHTML=`<button type="button" class="btn-s">‹ 返回</button><h3>${esc(title)}</h3><button type="button" class="btn-p">保存本页</button>`;
  header.querySelector('.btn-s').onclick=()=>{
    header.remove(); section.hidden=true;
    home.style.display=''; $i('settings-page')?.classList.remove('settings-subpage-open');
    wrap.scrollTo(0,0);
  };
  header.querySelector('.btn-p').onclick=()=>saveAllSettings();
  wrap.prepend(header);
  wrap.scrollTo(0,0);
}

function onTtsModeChange(){const m=$i('s-tts-mode');if(!m)return;const v=m.value;const rb=$i('r-bvoice');const rc=$i('r-custom-tts');if(rb)rb.style.display=v==='browser'?'flex':'none';if(rc)rc.style.display=v==='custom'?'block':'none';}
function onImgGenChange(prefix){const m=$i(prefix+'-imggen-model');if(!m)return;const wrap=$i(prefix+'-imggen-custom-wrap');if(wrap)wrap.style.display=m.value==='custom'?'block':'none';}
async function saveAllSettings(){
  const s=S.settings;
  const get=(id,def='')=>{const el=$i(id);return el?el.value:def;};
  const getB=(id)=>{const el=$i(id);return el?el.checked:false;};
  s.apiKey=get('s-key');s.apiUrl=get('s-apiurl');s.model=get('s-model','');s.systemPrompt=get('s-systemprompt');s.tavilyKey=get('s-tavily');s.unsplashKey=get('s-unsplash');
  s.ttsMode=get('s-tts-mode','browser');s.browserVoice=get('s-bvoice');
  s.ttsUrl=get('s-tts-url');s.ttsKey=get('s-tts-key');s.ttsVoice=get('s-tts-voice','cove');
  s.voiceReplyMode=get('s-voice-reply','text');s.autoTts=getB('s-auto-tts');
  s.stream=getB('s-stream');s.showToken=getB('s-show-token');s.showGameToken=getB('s-show-game-token');s.showThink=getB('s-show-think');
  s.hapticEnabled=getB('s-haptic-enabled');
  s.hapticOnAiReply=getB('s-haptic-ai-reply');
  s.typingAnimEnabled=getB('s-typing-anim');
  s.typingAnimShape=get('s-typing-shape','heart');
  s.temp=parseFloat(get('s-temp','0.85'));s.ctx=parseInt(get('s-ctx','20'));
  s.imgSize=parseInt(get('s-imgsize','800'));s.sumThresh=parseInt(get('s-sumthresh','40'));
  s.proactive=getB('s-proactive');s.proMax=parseInt(get('s-pro-max','3'));
  s.proStart=parseInt(get('s-pro-start','8'));s.proEnd=parseInt(get('s-pro-end','22'));
  s.proContactId=get('s-pro-contact','');
  s.momentsEnabled=getB('s-moments-enabled');s.autoPost=getB('s-auto-post');
  s.momentFreqMode=get('s-moment-freq-mode','perWeek');s.momentFreqCount=parseInt(get('s-moment-freq-count','3'));
  s.momentPromptMode=get('s-moment-prompt-mode','add');s.momentPrompt=get('s-moment-prompt','').trim();
  s.showMomentToken=getB('s-show-moment-token');
  s.autoComment=getB('s-auto-comment');s.commentFreqMins=parseInt(get('s-comment-freq','360'));
  s.maxComments=parseInt(get('s-max-comments','1'));
  s.replyMomentComments=getB('s-reply-comments');s.replyDelay=parseInt(get('s-reply-delay','120'));
  s.autoLike=getB('s-auto-like');s.likeProb=parseInt(get('s-like-prob','60'));
  s.postImages=getB('s-post-images');s.imageFreq=parseInt(get('s-image-freq','50'));
  s.imageSources=['album','search','generate'].filter(x=>getB(`s-imgsrc-${x}`)).join(',') || 'album';
  s.momentImgPrompt=get('s-moment-img-prompt','').trim();
  s.fontSize=parseInt(get('s-fontsize','14'));s.bgOpacity=parseFloat(get('s-bgopa','1'));
  s.userTextColor=get('s-user-text-color','');s.aiTextColor=get('s-ai-text-color','');s.fontColor=get('s-font-color','');
  s.bubbleOpacity=parseFloat(get('s-bubble-opacity','1'));
  s.userBubbleGradient=getB('s-bubble-gradient');
  s.userBubbleGradientColor=get('s-bubble-gradient-color','#ff4a7d');
  s.bubbleGlow=getB('s-bubble-glow');
  s.bubbleGlowStrength=parseInt(get('s-bubble-glow-strength','8'));
  applyBubble();
  const igm=get('s-imggen-model','openai/dall-e-3');
  s.imgGenModel=igm==='custom'?(get('s-imggen-custom-model')||'openai/dall-e-3'):igm;
  s.imgGenCustomModel=get('s-imggen-custom-model');
  s.imgGenApiUrl=get('s-imggen-api-url');
  s.imgGenApiKey=get('s-imggen-api-key');
  s.userName=get('s-username','我');
  s.showUserAvatar=getB('s-show-user-av'); s.showAiAvatar=getB('s-show-ai-av');
  s.showUserBubble=getB('s-show-user-bubble'); s.showAiBubble=getB('s-show-ai-bubble');
  s.showBubble=true; // legacy, individual settings take precedence
  applyBubbleSetting();
  // 个人信息
  s.city=get('s-city','').trim();
  s.refChatEnabled=getB('s-ref-chat');
  s.refChatCount=parseInt(get('s-ref-chat-count','5'));
  s.refMemEnabled=getB('s-ref-mem');
  s.autoMemEnabled=getB('s-auto-mem');
  s.autoMemInterval=parseInt(get('s-auto-mem-interval','5'));
  // Cloudinary
  s.cloudinaryCloud=get('s-cld-cloud','').trim();
  s.cloudinaryPreset=get('s-cld-preset','').trim();
  // 后台服务
  s.backendUrl=get('s-backend-url','').trim();
  s.pushEnabled=getB('s-push-enabled');
  // AI 聊天发图
  s.aiChatImages=getB('s-ai-chat-images');
  s.aiChatImageFreq=parseInt(get('s-ai-chat-image-freq','20'));
  s.aiChatImageSources=['album','search','generate'].filter(x=>getB(`s-aichat-src-${x}`)).join(',') || 'album';
  // 开屏动画
  s.splashEnabled=getB('s-splash-enabled');
  s.splashDuration=parseInt(get('s-splash-dur','4'));
  document.documentElement.style.setProperty('--font-size',s.fontSize+'px');
  applyBubble();scheduleProactive();initMomentTimers();
  try { await saveSettings_(); toast('✅ 设置已保存'); } catch(e) { toast('❌ 设置保存失败：' + e.message); console.error('[saveAllSettings]', e); }
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
function openCtxMenu(e){
  const m=$i('ctx-menu');
  const pinItem=$i('ctx-pin-item');
  if(pinItem&&S.currentChat){pinItem.textContent=S._chats[S.currentChat]?.pinned?'📌 取消置顶':'📌 置顶';}
  const onlineItem=$i('ctx-online-item');
  if(onlineItem)onlineItem.textContent=(S.onlineSearch?'🌐 联网 ✓':'🌐 联网搜索');
  const imggenItem=$i('ctx-imggen-item');
  if(imggenItem)imggenItem.textContent=(S.imgGenMode?'🎨 图片生成 ✓':'🎨 图片生成');
  const mmItem=$i('ctx-minimap-item');
  if(mmItem)mmItem.textContent=($i('chat-minimap')?.classList.contains('show')?'🗺️ 迷你地图 ✓':'🗺️ 迷你地图');
  positionMenu(m, e.clientX||100, e.clientY||100);
  m.classList.add('show'); e.stopPropagation();
}
function closeCtxMenu(){$i('ctx-menu').classList.remove('show');}

function openCtxMenuFromItems(event, items) {
  const existing = document.getElementById('dynamic-ctx-menu');
  if (existing) existing.remove();
  const m = document.createElement('div');
  m.id = 'dynamic-ctx-menu';
  m.style.cssText = 'display:block;position:fixed;background:var(--bg3);border:1.5px solid var(--border);border-radius:11px;padding:4px;box-shadow:0 8px 24px var(--shadow2);z-index:400;min-width:170px;';
  items.forEach(item => {
    const btn = document.createElement('button');
    btn.className = 'ctx-item';
    btn.textContent = item.label;
    btn.onclick = () => { m.remove(); document.removeEventListener('click', closeHandler); item.action(); };
    m.appendChild(btn);
  });
  document.body.appendChild(m);
  positionMenu(m, event.clientX || 100, event.clientY || 100);
  event.stopPropagation();
  const closeHandler = (e) => { if (!m.contains(e.target)) { m.remove(); document.removeEventListener('click', closeHandler); } };
  setTimeout(() => document.addEventListener('click', closeHandler), 0);
}

function positionMenu(m, x, y) {
  const mw = 175; // estimated menu width
  const mh = m.id === 'ctx-menu' ? 260 : 170; // estimated height
  const lx = Math.min(x, window.innerWidth - mw - 8);
  const ty = y + mh + 8 > window.innerHeight ? Math.max(5, y - mh) : y;
  m.style.left = Math.max(5, lx) + 'px';
  m.style.top = ty + 'px';
}

let _chatItemMenuId = null;
function openChatItemMenu(e, chatId) {
  _chatItemMenuId = chatId;
  S.currentChat = chatId;
  const m = $i('chat-item-menu');
  const pi = $i('cim-pin-item');
  if (pi) pi.textContent = S._chats[chatId]?.pinned ? '📌 取消置顶' : '📌 置顶';
  positionMenu(m, e.clientX || 100, e.clientY || 100);
  m.classList.add('show'); e.stopPropagation();
}
function closeChatItemMenu() { $i('chat-item-menu')?.classList.remove('show'); }
function pinChatItemMenu() { closeChatItemMenu(); pinChat(); }
function archiveChatItemMenu() { closeChatItemMenu(); archiveChat(); }
function renameChatItemMenu() { closeChatItemMenu(); renameChat(); }
function deleteChatItemMenu() { closeChatItemMenu(); deleteCurrentChat(); }

async function pinChat(){
  if(!S.currentChat)return;
  const chat=S._chats[S.currentChat];
  chat.pinned=!chat.pinned;
  await dbPut('chats',chat);
  renderChatList();closeCtxMenu();
  toast(chat.pinned?'📌 已置顶':'已取消置顶');
}

// ══════════════════════════════
//  KEYWORD ANIMATIONS
// ══════════════════════════════
const ANIM_TYPES=[{id:'gif',icon:'🖼️',label:'上传GIF'},{id:'confetti',icon:'🎊',label:'彩纸'},{id:'fireworks',icon:'🎆',label:'烟花'},{id:'snow',icon:'❄️',label:'下雪'},{id:'petals',icon:'🌸',label:'樱花'},{id:'hearts',icon:'💖',label:'爱心'},{id:'stars',icon:'⭐',label:'星星'},{id:'meteors',icon:'🌠',label:'流星雨'},{id:'birthday',icon:'🎂',label:'生日'},{id:'lightning',icon:'⚡',label:'闪电'},{id:'cats',icon:'🐱',label:'小猫跑'},{id:'bubbles',icon:'🫧',label:'泡泡'}];
function buildAnimTypeGrid(){const g=$i('anim-type-grid');if(!g)return;g.innerHTML='';ANIM_TYPES.forEach(t=>{const b=document.createElement('button');b.className='atyp'+(t.id==='gif'?' sel':'');b.dataset.type=t.id;b.innerHTML=`<span class="atyp-icon">${t.icon}</span>${t.label}`;b.onclick=()=>{S._newAnimType=t.id;document.querySelectorAll('.atyp').forEach(x=>x.classList.remove('sel'));b.classList.add('sel');$i('kw-gif-zone').style.display=t.id==='gif'?'block':'none';};g.appendChild(b);});}

async function openKwAnimModal(){
  $i('kw-master').checked=S.kwAnimEnabled;
  S.kwAnims=await dbGetAll('kwAnims');
  resetKwForm();
  renderKwList();$i('kwanim-modal').classList.add('show');
}
function normalizeKwAnim(item={}){
  return {
    id:item.id||uid(), keyword:item.keyword||'', type:item.type||'gif', gifData:item.gifData||null,
    triggerBy:item.triggerBy||'both', duration:parseFloat(item.duration)||3,
    emoji:item.emoji||'✨', layerMode:item.layerMode || (item.showEmoji?'both':'custom'),
    mask:item.mask||'soft', width:parseInt(item.width||180), height:parseInt(item.height||180)
  };
}
function renderKwList(){
  const list=$i('kw-list');list.innerHTML='';
  if(!S.kwAnims.length){list.innerHTML='<div style="text-align:center;padding:16px;color:var(--text3);font-size:12px">还没有关键词动画，在下方添加！</div>';return;}
  const ICONS={gif:'🖼️',confetti:'🎊',fireworks:'🎆',snow:'❄️',petals:'🌸',hearts:'💖',stars:'⭐',meteors:'🌠',birthday:'🎂',lightning:'⚡',cats:'🐱',bubbles:'🫧'};
  S.kwAnims.forEach((raw,i)=>{const item=normalizeKwAnim(raw);const div=document.createElement('div');div.className='kw-item';
    const prev=item.type==='gif'&&item.gifData?`<img class="kw-preview kw-mask-${item.mask}" src="${item.gifData}">`:`<div class="kw-preview-ic">${ICONS[item.type]||'✨'}</div>`;
    const layerText=({custom:'上传动画',emoji:'Emoji',both:'上传+Emoji'})[item.layerMode]||'上传动画';
    div.innerHTML=`${prev}<div class="kw-info"><div class="kw-keyword">"${esc(item.keyword)}"</div><div class="kw-meta">${ICONS[item.type]||'✨'} ${item.type==='gif'?'自定义GIF':item.type} · ${({both:'双向',user:'我发',ai:'AI发'})[item.triggerBy]||'双向'} · ${item.duration}s · ${layerText} · ${item.width}×${item.height}</div></div><div class="kw-btns"><button class="kw-btn" onclick="previewKwAnim(${i})">▶</button><button class="kw-btn" onclick="editKwAnim(${i})">编辑</button><button class="kw-btn" style="color:#e74c3c" onclick="delKwAnim(${i})">✕</button></div>`;
    list.appendChild(div);});
}
function resetKwForm(){
  S._editingKwAnimId=null; S._newGifData=null; S._newAnimType='gif';
  $i('kw-word').value=''; $i('kw-trigger').value='both'; $i('kw-dur').value=3; $i('kw-dur-v').textContent='3s';
  if($i('kw-emoji'))$i('kw-emoji').value='✨'; if($i('kw-layer-mode'))$i('kw-layer-mode').value='custom'; if($i('kw-mask'))$i('kw-mask').value='soft';
  if($i('kw-width'))$i('kw-width').value=180; if($i('kw-height'))$i('kw-height').value=180;
  $i('kw-gif-preview').innerHTML='📁 点击上传 GIF / 图片<br><small>支持 GIF、PNG、JPG</small>';
  $i('kw-form-title').textContent='➕ 添加'; $i('kw-save-btn').textContent='➕ 添加';
  buildAnimTypeGrid(); updateKwResizePreview();
}
function editKwAnim(i){
  const item=normalizeKwAnim(S.kwAnims[i]); S._editingKwAnimId=item.id; S._newGifData=item.gifData; S._newAnimType=item.type;
  $i('kw-word').value=item.keyword; $i('kw-trigger').value=item.triggerBy; $i('kw-dur').value=item.duration; $i('kw-dur-v').textContent=item.duration+'s';
  if($i('kw-emoji'))$i('kw-emoji').value=item.emoji; if($i('kw-layer-mode'))$i('kw-layer-mode').value=item.layerMode; if($i('kw-mask'))$i('kw-mask').value=item.mask;
  if($i('kw-width'))$i('kw-width').value=item.width; if($i('kw-height'))$i('kw-height').value=item.height;
  buildAnimTypeGrid(); document.querySelectorAll('.atyp').forEach(b=>b.classList.toggle('sel',b.dataset.type===item.type));
  $i('kw-gif-zone').style.display=item.type==='gif'?'block':'none';
  $i('kw-gif-preview').innerHTML=item.gifData?`<div class="kw-resize-box kw-mask-${item.mask}" style="width:${item.width}px;height:${item.height}px"><img src="${item.gifData}"></div><small style="color:var(--accent)">拖拽右下角可调整尺寸</small>`:'📁 点击上传 GIF / 图片<br><small>支持 GIF、PNG、JPG</small>';
  $i('kw-form-title').textContent='✏️ 编辑动画'; $i('kw-save-btn').textContent='💾 保存修改';
}
function updateKwResizePreview(){
  const box=document.querySelector('#kw-gif-preview .kw-resize-box'); if(!box)return;
  const w=parseInt($i('kw-width')?.value||box.offsetWidth||180), h=parseInt($i('kw-height')?.value||box.offsetHeight||180), mask=$i('kw-mask')?.value||'soft';
  box.style.width=w+'px'; box.style.height=h+'px'; box.className='kw-resize-box kw-mask-'+mask;
}
function syncKwResizeInputs(){
  const box=document.querySelector('#kw-gif-preview .kw-resize-box'); if(!box)return;
  if($i('kw-width'))$i('kw-width').value=Math.round(box.offsetWidth); if($i('kw-height'))$i('kw-height').value=Math.round(box.offsetHeight);
}
async function handleGifUpload(input){
  const file=input.files[0]; if(!file)return;
  const dataUrl=await new Promise(r=>{const fr=new FileReader();fr.onload=e=>r(e.target.result);fr.readAsDataURL(file);});
  toast('上传动图中…');
  let url=await uploadToCloudinary(dataUrl,'raimos/anims').catch(()=>null);
  url=url||dataUrl;
  S._newGifData=url;
  $i('kw-gif-preview').innerHTML=`<div class="kw-resize-box kw-mask-${$i('kw-mask')?.value||'soft'}" style="width:${$i('kw-width')?.value||180}px;height:${$i('kw-height')?.value||180}px"><img src="${url}"></div><small style="color:var(--accent)">✓ ${esc(file.name)} · 拖拽右下角可调整尺寸</small>`;
  input.value='';
}
function dropGif(e){e.preventDefault();const file=e.dataTransfer?.files?.[0];if(!file)return;const obj={files:[file]};handleGifUpload(obj);}
async function addKwAnim(){
  syncKwResizeInputs(); const word=$i('kw-word').value.trim();if(!word){toast('请输入关键词');return;}if(S._newAnimType==='gif'&&!S._newGifData){toast('请上传GIF或选择其他动画类型');return;}
  const item=normalizeKwAnim({id:S._editingKwAnimId||uid(),keyword:word,type:S._newAnimType,gifData:S._newAnimType==='gif'?S._newGifData:null,triggerBy:$i('kw-trigger').value,duration:parseFloat($i('kw-dur').value)||3,emoji:$i('kw-emoji')?.value||'✨',layerMode:$i('kw-layer-mode')?.value||'custom',mask:$i('kw-mask')?.value||'soft',width:$i('kw-width')?.value||180,height:$i('kw-height')?.value||180});
  const wasEditing=Boolean(S._editingKwAnimId);
  await dbPut('kwAnims',item); const idx=S.kwAnims.findIndex(x=>x.id===item.id); if(idx>=0)S.kwAnims[idx]=item; else S.kwAnims.push(item);
  resetKwForm(); renderKwList(); toast(wasEditing?'✅ 已保存':'✅ 已添加');
}
async function delKwAnim(i){await dbDel('kwAnims',S.kwAnims[i].id);S.kwAnims.splice(i,1);renderKwList();}
function previewKwAnim(i){if(i===-1){syncKwResizeInputs();const w=$i('kw-word').value.trim()||'预览';playAnim(normalizeKwAnim({keyword:w,type:S._newAnimType,gifData:S._newGifData,duration:parseFloat($i('kw-dur').value)||3,emoji:$i('kw-emoji')?.value||'✨',layerMode:$i('kw-layer-mode')?.value||'custom',mask:$i('kw-mask')?.value||'soft',width:$i('kw-width')?.value||180,height:$i('kw-height')?.value||180}));}else playAnim(S.kwAnims[i]);}
function checkKwAnims(text,role){if(!S.kwAnimEnabled||!S.kwAnims.length)return;for(const raw of S.kwAnims){const item=normalizeKwAnim(raw);const tb=item.triggerBy||'both';if(tb==='user'&&role!=='user')continue;if(tb==='ai'&&role!=='ai')continue;if(item.keyword&&text.includes(item.keyword))setTimeout(()=>playAnim(item),350);}}
function playAnim(raw){
  if(!raw)return;const item=normalizeKwAnim(raw),overlay=$i('anim-overlay'),canvas=$i('anim-canvas'),gifWrap=$i('anim-gif-wrap'),dur=item.duration*1000;
  overlay.classList.add('active'); canvas.width=window.innerWidth;canvas.height=window.innerHeight;
  if(item.type==='gif'&&item.gifData&&(item.layerMode==='custom'||item.layerMode==='both')){overlay.classList.add('has-bd');const layer=document.createElement('div');layer.className=`anim-media-layer kw-mask-${item.mask}`;layer.style.cssText=`width:${item.width}px;height:${item.height}px;animation-duration:${item.duration}s`;layer.innerHTML=`<img src="${item.gifData}" alt="关键词动画">`;gifWrap.appendChild(layer);setTimeout(()=>layer.remove(),dur+450);}else if(item.type!=='gif'){startParticle(item.type,canvas,dur);}
  if(item.layerMode==='emoji'||item.layerMode==='both') spawnEmojiRain(item.emoji||'✨',dur,item.width);
  clearTimeout(S._animTimeout);S._animTimeout=setTimeout(()=>{if(!gifWrap.children.length)stopAnim();},dur+700);
}
function spawnEmojiRain(emoji,dur,width=180){
  const chars=Array.from(String(emoji||'✨').trim()||'✨');
  const count=Math.min(90,Math.max(26,Math.round((dur/1000)*12)));
  for(let i=0;i<count;i++){
    setTimeout(()=>{
      const el=document.createElement('div');
      el.className='anim-emoji-rain';
      el.textContent=chars[i%chars.length]||'✨';
      const size=Math.max(22,Math.min(54,Number(width)*(.14+Math.random()*.12)));
      el.style.cssText=`left:${Math.random()*100}vw;font-size:${size}px;animation-duration:${1.8+Math.random()*1.8}s;animation-delay:${Math.random()*.12}s;`;
      document.body.appendChild(el);
      setTimeout(()=>el.remove(),4200);
    },Math.random()*Math.max(300,dur*.72));
  }
}
function stopAnim(){
  if(S._animTimeout){clearTimeout(S._animTimeout);S._animTimeout=null;}
  if(S._animRaf){cancelAnimationFrame(S._animRaf);S._animRaf=null;}
  const o=$i('anim-overlay'); if(o)o.classList.remove('active','has-bd');
  const wrap=$i('anim-gif-wrap'); if(wrap)wrap.innerHTML='';
  document.querySelectorAll('.cfp,.snf,.ptl,.hrtf,.strf,.mtrf,.ckb,.catr,.anim-emoji-rain').forEach(el=>el.remove());
  const c=$i('anim-canvas'); if(c)c.getContext('2d').clearRect(0,0,c.width,c.height);
}
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
//  PROMPT EXPAND
// ══════════════════════════════
let _expandTargetEl = null;
function openPromptExpand(taId, title) {
  _expandTargetEl = $i(taId);
  if (!_expandTargetEl) return;
  $i('prompt-expand-title').innerHTML = `📝 ${title || '编辑提示词'} <button class="mclose" onclick="closePromptExpand()">✕</button>`;
  $i('prompt-expand-ta').value = _expandTargetEl.value;
  $i('prompt-expand-modal').classList.add('show');
  setTimeout(() => $i('prompt-expand-ta').focus(), 100);
}
function closePromptExpand() { $i('prompt-expand-modal').classList.remove('show'); _expandTargetEl = null; }
function confirmPromptExpand() {
  if (_expandTargetEl) {
    _expandTargetEl.value = $i('prompt-expand-ta').value;
    _expandTargetEl.dispatchEvent(new Event('input'));
  }
  closePromptExpand();
}
function addExpandBtns() {
  document.querySelectorAll('textarea[data-expandable]').forEach(ta => {
    if (ta.dataset.expandAdded) return;
    ta.dataset.expandAdded = '1';
    const btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'expand-btn'; btn.title = '全屏编辑';
    btn.innerHTML = '⛶';
    btn.onclick = () => openPromptExpand(ta.id, ta.dataset.expandTitle || '提示词编辑');
    ta.insertAdjacentElement('afterend', btn);
  });
}

// ══════════════════════════════
//  TYPING INDICATOR
// ══════════════════════════════
function showTyping(isError){
  const ca=$i('chat-area');
  const d=document.createElement('div');d.id='typing';d.className='msg-group ai';
  let inner;
  if (isError) {
    inner = '<div class="typing-anim"><span class="typing-error-icon">⁉</span></div>';
  } else if (S.settings.typingAnimEnabled !== false) {
    const shape = S.settings.typingAnimShape || 'heart';
    if (shape === 'dot') {
      inner = '<div class="typing-dots"><div class="tdot"></div><div class="tdot"></div><div class="tdot"></div></div>';
    } else {
      inner = `<div class="typing-anim typing-${shape}"></div>`;
    }
  } else {
    inner = '<div class="typing-dots"><div class="tdot"></div><div class="tdot"></div><div class="tdot"></div></div>';
  }
  d.innerHTML=`<div class="bubble typing-bubble">${inner}</div>`;
  ca.appendChild(d);scrollTo_(false);
  _showHdrTyping(isError);
}
function removeTyping(){$i('typing')?.remove();_hideHdrTyping();}

function _showHdrTyping(isError) {
  if (S.settings.typingAnimEnabled === false) return;
  const hdr = $i('hdr-status'); if (!hdr) return;
  hdr.classList.add('ai-typing');
  const ind = $i('hdr-typing-indicator'); if (!ind) return;
  const shape = isError ? 'error' : (S.settings.typingAnimShape || 'heart');
  const shapeMap = { heart:'♥', star:'★', sparkle:'✦', bear:'🐻', cat:'🐱', error:'⁉' };
  const ch = shapeMap[shape] || '♥';
  // Build ECG-like scrolling string: flat line · shape · flat line · shape
  const ecgStr = isError
    ? '⁉ ⁉ ⁉ ⁉ ⁉ ⁉ ⁉ ⁉'
    : `${ch}·——·——${ch}·——·——${ch}·——·——${ch}·——·——`;
  const inner = $i('hdr-ecg-inner');
  if (inner) inner.textContent = ecgStr;
  ind.style.display = '';
}
function _hideHdrTyping() {
  const hdr = $i('hdr-status'); if (!hdr) return;
  hdr.classList.remove('ai-typing');
  const ind = $i('hdr-typing-indicator'); if (!ind) return;
  ind.style.display = 'none';
}

// ══════════════════════════════
//  HELPERS
// ══════════════════════════════
function esc(s){return(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function fmtDate(ts){if(!ts)return'今天';const d=new Date(ts),n=new Date();if(d.toDateString()===n.toDateString())return'今天';const y=new Date(n);y.setDate(y.getDate()-1);if(d.toDateString()===y.toDateString())return'昨天';return`${d.getMonth()+1}月${d.getDate()}日`;}
function fmtTime(ts){if(!ts)return'';const d=new Date(ts);return`${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;}
function fmtTimeFull(ts){return ts?`${fmtDate(ts)} ${fmtTime(ts)}`:''}
function fmtText(t){return esc(t).replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>').replace(/\*(.*?)\*/g,'<em>$1</em>').replace(/`([^`]+)`/g,'<code style="background:rgba(0,0,0,.08);padding:1px 5px;border-radius:4px;font-family:monospace">$1</code>').replace(/\n/g,'<br>');}
function onKey(e){if(e.key==='Enter'&&(e.ctrlKey||e.metaKey)){e.preventDefault();sendMsg();}}
function autoH(el){
  el.style.height='auto';
  el.style.height=Math.min(el.scrollHeight,100)+'px';
  // Show desktop expand button when textarea is tall (>50px)
  const deskBtn = $i('input-expand-btn-desk');
  if (deskBtn) deskBtn.style.display = el.offsetHeight > 50 ? '' : 'none';
}
function onInputTyping() {
  const inp = $i('msg-input');
  const wrap = inp?.parentElement;
  if (!wrap) return;
  if (inp.value.trim().length > 0) {
    wrap.classList.add('is-typing');
  } else {
    wrap.classList.remove('is-typing');
  }
}
function toast(msg,dur=2000){const t=$i('toast');t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),dur);}
function closeModal(id){$i(id).classList.remove('show');}
function openModal(id){$i(id).classList.add('show');}

// ★ 修复表情按钮：outsideClick 不干扰 btn-emoji 本身的点击
function outsideClick(e) {
  const emojiPicker = $i('emoji-picker');
  // Don't close if clicking on any emoji button
  for (const id of ['btn-emoji','btn-emoji-desk']) {
    const btn = $i(id);
    if (btn && (btn === e.target || btn.contains(e.target))) return;
  }
  if (emojiPicker && emojiPicker.contains(e.target)) return;
  if (emojiPicker) emojiPicker.classList.remove('show');
  if (!$i('ctx-menu').contains(e.target)) closeCtxMenu();
  const cim = $i('chat-item-menu');
  if (cim && !cim.contains(e.target)) closeChatItemMenu();
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

// 移动端键盘弹出时隐藏底部导航栏，避免被推到键盘上方占用空间
(function setupKeyboardNavHide() {
  let _navHidden = false;
  function setNavHidden(hide) {
    if (hide === _navHidden) return;
    _navHidden = hide;
    const nav = document.getElementById('nav-tabs');
    if (nav) nav.style.display = hide ? 'none' : '';
  }
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', () => {
      if (!isMobile()) return;
      setNavHidden(window.innerHeight - window.visualViewport.height > 150);
    });
  }
  // Also hide nav on any input/textarea focus (covers all pages and input types)
  document.addEventListener('focusin', e => {
    if (!isMobile()) return;
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
      setTimeout(() => setNavHidden(true), 80);
    }
  });
  document.addEventListener('focusout', e => {
    if (!isMobile()) return;
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
      setTimeout(() => setNavHidden(false), 200);
    }
  });
})();

document.addEventListener('click', e => {
  if (isMobile() && e.target.closest('.chat-item')) {
    setTimeout(closeSidebar, 100);
  }
});

// ══════════════════════════════
//  HAPTIC FEEDBACK
// ══════════════════════════════
function haptic(pattern) {
  if (!S.settings.hapticEnabled) return;
  if ('vibrate' in navigator) navigator.vibrate(pattern || 8);
}

// ── AI reply typing haptic (while streaming) ──
let _hapticStreamTimer = null;
function startHapticStream() {
  if (!S.settings.hapticEnabled || !S.settings.hapticOnAiReply) return;
  _hapticStreamTimer = setInterval(() => { if ('vibrate' in navigator) navigator.vibrate(3); }, 280);
}
function stopHapticStream() {
  if (_hapticStreamTimer) { clearInterval(_hapticStreamTimer); _hapticStreamTimer = null; }
}

// ══════════════════════════════
//  SWIPE RIGHT TO OPEN SIDEBAR
// ══════════════════════════════
(function initSwipeGesture() {
  let startX = 0, startY = 0, tracking = false;
  const target = document.getElementById('pages') || document.body;
  target.addEventListener('touchstart', e => {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    tracking = startX < 44;
  }, { passive: true });
  target.addEventListener('touchmove', e => {
    if (!tracking) return;
    const dx = e.touches[0].clientX - startX;
    const dy = Math.abs(e.touches[0].clientY - startY);
    if (dx > 60 && dy < 80 && isMobile() && !document.getElementById('sidebar').classList.contains('open')) {
      openSidebar();
      haptic([6, 4, 6]);
      tracking = false;
    }
  }, { passive: true });
  target.addEventListener('touchend', () => { tracking = false; }, { passive: true });
})();

// ══════════════════════════════
//  FIREBASE AUTH & CLOUD SYNC
// ══════════════════════════════
let _authMode = 'login';

function openAuthModal() {
  closeModal('user-modal');
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

// Returns true when running as installed standalone PWA (iOS or Android)
function isPwaStandalone() {
  return window.navigator.standalone === true ||
         window.matchMedia('(display-mode: standalone)').matches;
}

// Returns true on iOS (iPhone/iPad) regardless of browser
function isIos() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
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

  // Show sync hint banner when running as standalone PWA and not logged in
  const hint = $i('pwa-sync-hint');
  if (hint) hint.style.display = (!user && isPwaStandalone()) ? 'flex' : 'none';

  if (user && sessionStorage.getItem('raimosWelcomeShownAfterLogin') !== user.uid) {
    sessionStorage.setItem('raimosWelcomeShownAfterLogin', user.uid);
    S.currentChat = null; S.chatListContactFilter = null;
    switchPage('chat-page'); showWelcome(); renderChatList();
    toast('欢迎回来，先选择一个聊天吧');
  }
}

// ── PWA Install ──
let _pwaInstallPrompt = null;

window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  _pwaInstallPrompt = e;
  updatePwaInstallUI();
});

window.addEventListener('appinstalled', () => {
  _pwaInstallPrompt = null;
  updatePwaInstallUI();
  toast('✅ App 已安装到桌面！');
});

function updatePwaInstallUI() {
  const hint = $i('pwa-install-hint');
  const btn  = $i('pwa-install-btn');
  if (!hint) return;

  if (isPwaStandalone()) {
    hint.textContent = '✅ 已作为独立 App 运行。注意：手机端 App 的数据存储与浏览器相互独立，需要重新登录才能同步云端数据。';
    if (btn) btn.style.display = 'none';
  } else if (_pwaInstallPrompt) {
    hint.textContent = '点击下方按钮可将 Raimos 安装到桌面，获得类似原生 App 的体验（隐藏网址栏）。';
    if (btn) btn.style.display = '';
  } else if (isIos()) {
    const isSafari = /safari/i.test(navigator.userAgent) && !/crios|fxios|opios/i.test(navigator.userAgent);
    if (isSafari) {
      hint.innerHTML = '在 Safari 中点击底部分享按钮 <strong>「分享」→「添加到主屏幕」</strong> 即可安装。<br><br>⚠️ <strong>安装后首次打开需要重新登录</strong>，因为 iOS 系统对桌面 App 的数据存储是独立的。';
    } else {
      hint.innerHTML = '⚠️ iOS 上只有 <strong>Safari</strong> 支持「添加到主屏幕」安装。<br>请用 Safari 打开本页面，然后点击底部分享按钮 →「添加到主屏幕」。';
    }
    if (btn) btn.style.display = 'none';
  } else {
    hint.textContent = '在支持 PWA 的浏览器（Chrome、Edge 等）中，安装提示会在地址栏右侧或菜单中出现。';
    if (btn) btn.style.display = 'none';
  }
}

async function triggerPwaInstall() {
  if (!_pwaInstallPrompt) return;
  _pwaInstallPrompt.prompt();
  const { outcome } = await _pwaInstallPrompt.userChoice;
  if (outcome === 'accepted') _pwaInstallPrompt = null;
  updatePwaInstallUI();
}

async function syncToCloud() {
  if (!window._fbUser) { toast('请先登录'); openAuthModal(); return; }
  if (!window._fbLib || !window._fbDb) { toast('⚠️ Firebase 尚未就绪，请稍后再试'); return; }
  const uid = window._fbUser.uid;
  const hasCloudinary = S.settings.cloudinaryCloud && S.settings.cloudinaryPreset;
  toast('☁️ 同步中…');
  try {
    const { doc, setDoc } = window._fbLib;
    const fsDb = window._fbDb;
    const settingsData = {};
    const SKIP_AVATAR_KEYS = new Set(['aiAvatar', 'userAvatar']);
    for (const [k,v] of Object.entries(S.settings)) {
      if (SKIP_AVATAR_KEYS.has(k)) continue; // avatars are device-local only
      settingsData[k] = v ?? null;
    }
    await setDoc(doc(fsDb, 'users', uid, 'meta', 'settings'), settingsData);

    const contacts = await dbGetAll('contacts');
    for (const c of contacts) {
      const data = { ...c };
      if (data.avatar && data.avatar.startsWith('data:')) data.avatar = '__local__';
      await setDoc(doc(fsDb, 'users', uid, 'contacts', c.id), data);
    }

    const chats = await dbGetAll('chats');
    let totalMsgs = 0;
    for (const c of chats) {
      await setDoc(doc(fsDb, 'users', uid, 'chats', c.id), c);
      // sync last 80 messages per chat
      const msgs = await dbGetAll('messages', 'chatId', c.id);
      const recent = msgs.slice(-80);
      for (const m of recent) {
        const mData = {...m};
        if (mData.imageData && mData.imageData.startsWith('data:')) delete mData.imageData;
        if (mData.url && mData.url.startsWith('data:')) delete mData.url;
        await setDoc(doc(fsDb, 'users', uid, 'messages', m.id), mData);
        totalMsgs++;
      }
    }

    const memories = await dbGetAll('memories');
    for (const m of memories) {
      await setDoc(doc(fsDb, 'users', uid, 'memories', m.id), m);
    }

    const moments = await dbGetAll('moments');
    for (const m of moments) {
      const data = {...m};
      if (Array.isArray(data.images)) data.images = data.images.filter(u => u && u.startsWith('http'));
      await setDoc(doc(fsDb, 'users', uid, 'moments', m.id), data);
    }

    const comments = await dbGetAll('comments');
    for (const c of comments) {
      await setDoc(doc(fsDb, 'users', uid, 'comments', c.id), c);
    }

    const stickers = await dbGetAll('stickers');
    for (const s of stickers) {
      const data = {...s};
      if (data.url && data.url.startsWith('data:')) data.url = '__local__';
      await setDoc(doc(fsDb, 'users', uid, 'stickers', s.id), data);
    }

    const kwAnims = await dbGetAll('kwAnims');
    for (const a of kwAnims) {
      const data = {...a};
      if (data.gifData && data.gifData.startsWith('data:')) data.gifData = '__local__';
      await setDoc(doc(fsDb, 'users', uid, 'kwAnims', a.id), data);
    }

    const album = await dbGetAll('album');
    let localPhotos = 0;
    for (const p of album) {
      const data = {...p};
      if (data.url && data.url.startsWith('data:')) { data.url = '__local__'; localPhotos++; }
      await setDoc(doc(fsDb, 'users', uid, 'album', p.id), data);
    }

    // 打卡目标 & 记录
    const ckGoals = await dbGetAll('checkinGoals');
    for (const g of ckGoals) await setDoc(doc(fsDb, 'users', uid, 'checkinGoals', g.id), g);
    const ckRecs = await dbGetAll('checkinRecords');
    // 只同步近 120 天
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 120);
    const cutoffStr = cutoff.toISOString().slice(0,10);
    let ckRecCount = 0;
    for (const r of ckRecs) {
      if (r.date >= cutoffStr) { await setDoc(doc(fsDb, 'users', uid, 'checkinRecords', r.id), r); ckRecCount++; }
    }

    // 陪伴统计（近 60 天）
    const compStats = await dbGetAll('companionStats');
    const compCutoff = new Date(); compCutoff.setDate(compCutoff.getDate() - 60);
    const compCutoffStr = compCutoff.toISOString().slice(0,10);
    let compStatCount = 0;
    for (const s of compStats) {
      if (s.date >= compCutoffStr) { await setDoc(doc(fsDb, 'users', uid, 'companionStats', s.date), s); compStatCount++; }
    }

    let msg = `✅ 同步完成！${contacts.length}个助手，${chats.length}个对话（${totalMsgs}条消息），${memories.length}条记忆，${moments.length}条朋友圈，${album.length}张相册，${ckGoals.length}个打卡目标（${ckRecCount}条记录），${compStatCount}条陪伴记录`;
    if (localPhotos > 0 && !hasCloudinary) msg += `\n⚠️ ${localPhotos}张照片是本地上传的，未配置Cloudinary故无法跨设备同步`;
    toast(msg);
  } catch(e) {
    toast('❌ 同步失败：' + e.message);
    console.error(e);
  }
}

async function restoreFromCloud() {
  if (!window._fbUser) { toast('请先登录'); openAuthModal(); return; }
  if (!window._fbLib || !window._fbDb) { toast('⚠️ Firebase 尚未就绪，请稍后再试'); return; }
  if (!confirm('从云端恢复数据？会覆盖本地同名数据。')) return;
  const uid = window._fbUser.uid;
  toast('⬇️ 恢复中…');
  try {
    const { collection, getDocs, doc, getDoc } = window._fbLib;
    const fsDb = window._fbDb;
    // 1. 设置（API Key、主题等，头像设备本地保留不覆盖）
    const SKIP_AVATAR_KEYS = new Set(['aiAvatar', 'userAvatar']);
    const settingsDoc = await getDoc(doc(fsDb, 'users', uid, 'meta', 'settings'));
    if (settingsDoc.exists()) {
      const settingsData = settingsDoc.data();
      for (const [k, v] of Object.entries(settingsData)) {
        if (SKIP_AVATAR_KEYS.has(k)) continue;
        if (v !== null && v !== undefined) {
          await setSetting(k, v);
          S.settings[k] = v;
        }
      }
      applyTheme(); applyBg(); applyBubble(); buildSettingsUI();
    }

    // 2. 联系人（头像为 __local__ 则保留本地）
    const contactsSnap = await getDocs(collection(fsDb, 'users', uid, 'contacts'));
    for (const d of contactsSnap.docs) {
      const data = d.data();
      if (data.avatar === '__local__') {
        const existing = await dbGet('contacts', data.id);
        if (existing?.avatar) data.avatar = existing.avatar;
        else delete data.avatar;
      }
      await dbPut('contacts', data); S._contacts[data.id] = data;
    }

    // 3. 对话
    const chatsSnap = await getDocs(collection(fsDb, 'users', uid, 'chats'));
    for (const d of chatsSnap.docs) {
      const data = d.data(); await dbPut('chats', data); S._chats[data.id] = data;
    }
    // 消息
    const msgsSnap = await getDocs(collection(fsDb, 'users', uid, 'messages'));
    for (const d of msgsSnap.docs) { await dbPut('messages', d.data()); }

    // 4. 记忆
    const memsSnap = await getDocs(collection(fsDb, 'users', uid, 'memories'));
    for (const d of memsSnap.docs) {
      const data = d.data(); await dbPut('memories', data);
      if (!S._memories.find(m => m.id === data.id)) S._memories.push(data);
    }

    // 5. 朋友圈 & 评论
    const momentsSnap = await getDocs(collection(fsDb, 'users', uid, 'moments'));
    for (const d of momentsSnap.docs) { await dbPut('moments', d.data()); }
    const commentsSnap = await getDocs(collection(fsDb, 'users', uid, 'comments'));
    for (const d of commentsSnap.docs) { await dbPut('comments', d.data()); }

    // 6. 表情包
    const stickersSnap = await getDocs(collection(fsDb, 'users', uid, 'stickers'));
    for (const d of stickersSnap.docs) {
      const data = d.data();
      if (data.url !== '__local__') { await dbPut('stickers', data); if (!S._stickers.find(s=>s.id===data.id)) S._stickers.push(data); }
    }

    // 7. 关键词动画
    const kwAnimsSnap = await getDocs(collection(fsDb, 'users', uid, 'kwAnims'));
    for (const d of kwAnimsSnap.docs) {
      const data = d.data();
      if (data.gifData !== '__local__') await dbPut('kwAnims', data);
    }

    // 8. 相册
    const albumSnap = await getDocs(collection(fsDb, 'users', uid, 'album'));
    for (const d of albumSnap.docs) {
      const data = d.data();
      if (data.url !== '__local__') await dbPut('album', data);
    }

    // 9. 打卡目标 & 记录
    const ckGoalsSnap = await getDocs(collection(fsDb, 'users', uid, 'checkinGoals'));
    for (const d of ckGoalsSnap.docs) { await dbPut('checkinGoals', d.data()); }
    const ckRecsSnap = await getDocs(collection(fsDb, 'users', uid, 'checkinRecords'));
    for (const d of ckRecsSnap.docs) { await dbPut('checkinRecords', d.data()); }

    // 10. 陪伴统计
    const compStatsSnap = await getDocs(collection(fsDb, 'users', uid, 'companionStats'));
    for (const d of compStatsSnap.docs) { await dbPut('companionStats', d.data()); }

    S.kwAnims = await dbGetAll('kwAnims');
    renderChatList(); renderContacts(); renderMemories(); renderMoments();
    // 刷新打卡页面
    if (typeof renderCheckinPage === 'function') {
      if (typeof initCheckin === 'function') await initCheckin();
      else await renderCheckinPage();
    }
    // 刷新陪伴页面（若已打开）
    if ($i('companion-page')?.classList.contains('active')) renderCompanionPage();
    toast('✅ 恢复完成！设置、联系人、对话、打卡、陪伴记录已全部恢复');
  } catch(e) {
    toast('❌ 恢复失败：' + e.message);
    console.error(e);
  }
}

// ══════════════════════════════════════════════════════
//  COMPANION / 陪伴系统
// ══════════════════════════════════════════════════════

function initCompanion() {
  if (!$i('companion-page')) return;

  if (!$i('comp-audio')) {
    const a = document.createElement('audio');
    a.id = 'comp-audio'; a.preload = 'auto'; a.style.display = 'none';
    document.body.appendChild(a);
  }

  const bind = (id, key, parser) => {
    const el = $i(id); if (!el) return;
    const apply = async () => {
      const v = parser ? parser(el) : el.value;
      S.settings[key] = v;
      await saveSetting(key, v);
      if (key === 'companionFreqMin' && S._companion.running) companionSetupSpeechTimer();
      if (key === 'companionMusicLoop' || key === 'companionMusicVol') applyCompanionMusicSettings();
      if (key === 'companionBgFit') applyCompanionBgFit();
      if (key === 'companionCharType' || key === 'companionBgType') syncCompanionUIFromSettings();
      if (key !== 'companionMusicLoop' && key !== 'companionMusicVol' && key !== 'companionBgFit') void renderCompanionStage();
    };
    el.addEventListener('change', apply);
    el.addEventListener('input', () => { if (el.type === 'range' || el.type === 'number') apply(); });
  };

  bind('comp-scene', 'companionScene');
  bind('comp-scene-custom', 'companionSceneCustom', el => (el.value || '').trim());
  bind('comp-contact', 'companionContactId');
  bind('comp-freq', 'companionFreqMin', el => Math.max(0, parseInt(el.value || '0', 10) || 0));
  bind('comp-char-type', 'companionCharType');
  bind('comp-char-builtin', 'companionCharBuiltin');
  bind('comp-bg-type', 'companionBgType');
  bind('comp-bg-builtin', 'companionBgBuiltin');
  bind('comp-bg-fit', 'companionBgFit');
  bind('comp-music-loop', 'companionMusicLoop', el => !!el.checked);
  bind('comp-music-vol', 'companionMusicVol', el => Math.max(0, Math.min(1, parseFloat(el.value || '0.6'))));
  bind('comp-timer-mode', 'companionTimerMode');
  bind('comp-countdown-min', 'companionCountdownMin', el => Math.max(1, parseInt(el.value || '25', 10) || 25));
  bind('comp-pomo-focus', 'companionPomoFocus', el => Math.max(1, parseInt(el.value || '25', 10) || 25));
  bind('comp-pomo-break', 'companionPomoBreak', el => Math.max(1, parseInt(el.value || '5', 10) || 5));

  renderCompanionContactOptions();
  syncCompanionUIFromSettings();
  renderCompanionPage();
  companionInitDrag();

  // Populate linked task select
  async function refreshLinkedTaskSelect() {
    const sel = $i('comp-linked-task'); if (!sel) return;
    sel.innerHTML = '<option value="">-- 不关联 --</option>';
    if (typeof ckGetGoals === 'function') {
      const goals = await ckGetGoals();
      goals.filter(g => g.goalType === 'timer').forEach(g => {
        const opt = document.createElement('option');
        opt.value = g.id;
        opt.textContent = `${g.emoji||'🎯'} ${g.title} (${g.targetMinutes||30}分钟/天)`;
        if (g.id === S.settings.companionLinkedGoalId) opt.selected = true;
        sel.appendChild(opt);
      });
    }
  }
  window._refreshLinkedTaskSelect = refreshLinkedTaskSelect;
  refreshLinkedTaskSelect();
  const linkedSel = $i('comp-linked-task');
  if (linkedSel) linkedSel.addEventListener('change', async () => {
    S.settings.companionLinkedGoalId = linkedSel.value;
    await saveSetting('companionLinkedGoalId', linkedSel.value);
  });
}

function renderCompanionPage() {
  if (!$i('companion-page')) return;
  renderCompanionContactOptions();
  syncCompanionUIFromSettings();
  updateCompanionTimerModeUI();
  updateCompanionStartBtn();
  updateCompanionTimerText();
  void renderCompanionStage();
  applyCompanionMusicSettings();
  void applyCompanionMusicSrc();
  if (typeof renderCompanionPhraseSettings === 'function') renderCompanionPhraseSettings();
}

function renderCompanionContactOptions() {
  const sel = $i('comp-contact'); if (!sel) return;
  const cur = sel.value || S.settings.companionContactId || '';
  sel.innerHTML = '';
  const o0 = document.createElement('option'); o0.value = ''; o0.textContent = '（使用全局模型）'; sel.appendChild(o0);
  Object.values(S._contacts || {}).forEach(c => {
    const o = document.createElement('option'); o.value = c.id;
    // Only show emoji avatar in text; skip data: and http: URLs to avoid showing raw base64
    const av = c.avatar && !c.avatar.startsWith('data:') && !c.avatar.startsWith('http') ? c.avatar : '🤖';
    o.textContent = `${av} ${c.name || 'AI 助手'}`; sel.appendChild(o);
  });
  sel.value = cur;
}

function syncCompanionUIFromSettings() {
  const s = S.settings;
  const setV = (id, v) => { const el = $i(id); if (el && el.value !== String(v ?? '')) el.value = String(v ?? ''); };
  setV('comp-scene', s.companionScene || '学习');
  setV('comp-scene-custom', s.companionSceneCustom || '');
  setV('comp-contact', s.companionContactId || '');
  setV('comp-freq', s.companionFreqMin ?? 10);
  setV('comp-char-type', s.companionCharType || 'builtin');
  setV('comp-char-builtin', s.companionCharBuiltin || '😊');
  const charIsUpload = (s.companionCharType || 'builtin') === 'upload';
  $i('comp-char-builtin-row') && ($i('comp-char-builtin-row').style.display = charIsUpload ? 'none' : '');
  $i('comp-char-upload-row') && ($i('comp-char-upload-row').style.display = charIsUpload ? '' : 'none');
  if (charIsUpload && $i('comp-char-gallery') && !$i('comp-char-gallery').children.length) renderCompMediaGallery('char');
  // Size slider
  const szSlider = $i('comp-char-size');
  const szVal = Math.max(20, Math.min(100, parseInt(s.companionCharSize ?? 40, 10) || 40));
  if (szSlider) szSlider.value = String(szVal);
  const szLabel = $i('comp-char-size-val'); if (szLabel) szLabel.textContent = szVal + '%';
  const char = $i('comp-char'); if (char) char.style.width = szVal + '%';
  setV('comp-bg-type', s.companionBgType || 'builtin');
  setV('comp-bg-builtin', s.companionBgBuiltin || 'bg1');
  const bgIsUpload = (s.companionBgType || 'builtin') === 'upload';
  $i('comp-bg-builtin-row') && ($i('comp-bg-builtin-row').style.display = bgIsUpload ? 'none' : '');
  $i('comp-bg-upload-row') && ($i('comp-bg-upload-row').style.display = bgIsUpload ? '' : 'none');
  if (bgIsUpload && $i('comp-bg-gallery') && !$i('comp-bg-gallery').children.length) renderCompMediaGallery('bg');
  setV('comp-bg-fit', s.companionBgFit || 'cover');
  const loop = $i('comp-music-loop'); if (loop) loop.checked = !!s.companionMusicLoop;
  const vol = $i('comp-music-vol'); if (vol) vol.value = String(cs(s.companionMusicVol, 0.6));
  setV('comp-timer-mode', s.companionTimerMode || 'pomodoro');
  setV('comp-countdown-min', s.companionCountdownMin ?? 25);
  setV('comp-pomo-focus', s.companionPomoFocus ?? 25);
  setV('comp-pomo-break', s.companionPomoBreak ?? 5);
}

function updateCompanionTimerModeUI() {
  const mode = S.settings.companionTimerMode || 'pomodoro';
  const cd = $i('comp-countdown-row'), pr = $i('comp-pomo-row');
  if (cd) cd.style.display = (mode === 'countdown') ? 'flex' : 'none';
  if (pr) pr.style.display = (mode === 'pomodoro') ? 'flex' : 'none';
}

async function renderCompanionStage() {
  await applyCompanionBackground();
  await applyCompanionCharacter();
  applyCompanionCharPosition();
  applyCompanionBgFit();
}

async function applyCompanionBackground() {
  const wrap = $i('comp-bg'); if (!wrap) return;
  const s = S.settings;
  if (S._companion.bgObjUrl) { try { URL.revokeObjectURL(S._companion.bgObjUrl); } catch(e) {} S._companion.bgObjUrl = null; }
  wrap.innerHTML = '';
  if ((s.companionBgType || 'builtin') === 'upload' && s.companionBgMediaId) {
    let url = await loadMediaUrl(s.companionBgMediaId);
    if (!url && s.companionBgUrl) {
      const img = document.createElement('img'); img.src = s.companionBgUrl;
      img.style.cssText = 'width:100%;height:100%;object-fit:cover;position:absolute;inset:0;';
      wrap.appendChild(img); wrap.style.background = 'none'; return;
    }
    if (!url) { wrap.style.background = 'linear-gradient(135deg,#ffe6ef,#fff4ea)'; return; }
    S._companion.bgObjUrl = url;
    const blob = await loadMediaBlob(s.companionBgMediaId);
    const isVideo = blob?.type?.startsWith('video/');
    const el = isVideo ? document.createElement('video') : document.createElement('img');
    el.src = url;
    if (isVideo) { el.autoplay = true; el.loop = true; el.muted = true; el.playsInline = true; }
    wrap.appendChild(el);
    wrap.style.background = 'none';
    return;
  }
  const map = {
    bg1:'linear-gradient(135deg,#ffe6ef,#fff4ea)',
    bg2:'linear-gradient(135deg,#d7f3ff,#fff4ea)',
    bg3:'linear-gradient(135deg,#d6fff0,#fff4ea)',
    bg4:'linear-gradient(135deg,#2a1f35,#1a1220)',
    bg5:'linear-gradient(135deg,#ffe8cc,#fff4ea)',
  };
  wrap.style.background = map[s.companionBgBuiltin || 'bg1'] || map.bg1;
}

function applyCompanionBgFit() {
  const wrap = $i('comp-bg'); if (!wrap) return;
  const fit = S.settings.companionBgFit || 'cover';
  wrap.classList.toggle('fit-contain', fit === 'contain');
  wrap.classList.toggle('fit-cover', fit === 'cover');
}

async function applyCompanionCharacter() {
  const wrap = $i('comp-char'); if (!wrap) return;
  const s = S.settings;
  if (S._companion.charObjUrl) { try { URL.revokeObjectURL(S._companion.charObjUrl); } catch(e) {} S._companion.charObjUrl = null; }
  wrap.innerHTML = '';
  if ((s.companionCharType || 'builtin') === 'upload' && s.companionCharMediaId) {
    let url = await loadMediaUrl(s.companionCharMediaId);
    if (!url && s.companionCharUrl) {
      const img = document.createElement('img'); img.src = s.companionCharUrl;
      img.style.cssText = 'width:100%;height:100%;object-fit:contain;';
      wrap.appendChild(img); return;
    }
    if (!url) { wrap.innerHTML = '<div class="comp-emoji">😊</div>'; return; }
    S._companion.charObjUrl = url;
    const blob = await loadMediaBlob(s.companionCharMediaId);
    const isVideo = blob?.type?.startsWith('video/');
    const el = isVideo ? document.createElement('video') : document.createElement('img');
    el.src = url;
    if (isVideo) { el.autoplay = true; el.loop = true; el.muted = true; el.playsInline = true; }
    wrap.appendChild(el);
    return;
  }
  const span = document.createElement('div'); span.className = 'comp-emoji';
  span.textContent = s.companionCharBuiltin || '😊'; wrap.appendChild(span);
}

function applyCompanionCharPosition() {
  const wrap = $i('comp-char'); if (!wrap) return;
  const left = cs(S.settings.companionCharLeft, 3);
  const bottom = cs(S.settings.companionCharBottom, 4);
  wrap.style.left = left + '%';
  wrap.style.bottom = bottom + '%';
}

function companionInitDrag() {
  const char = $i('comp-char'); if (!char) return;
  let dragging = false, startX = 0, startY = 0, origLeft = 0, origBottom = 0;

  const getStageRect = () => ($i('comp-stage') || char.parentElement).getBoundingClientRect();

  const onDown = e => {
    dragging = true;
    char.classList.add('dragging');
    const touch = e.touches?.[0] || e;
    startX = touch.clientX; startY = touch.clientY;
    const r = getStageRect();
    origLeft = (parseFloat(char.style.left) || cs(S.settings.companionCharLeft, 3)) / 100 * r.width;
    origBottom = (parseFloat(char.style.bottom) || cs(S.settings.companionCharBottom, 4)) / 100 * r.height;
    e.preventDefault();
  };
  const onMove = e => {
    if (!dragging) return;
    const touch = e.touches?.[0] || e;
    const dx = touch.clientX - startX, dy = touch.clientY - startY;
    const r = getStageRect();
    const newLeft = Math.max(0, Math.min(80, (origLeft + dx) / r.width * 100));
    const newBottom = Math.max(0, Math.min(80, (origBottom - dy) / r.height * 100));
    char.style.left = newLeft + '%';
    char.style.bottom = newBottom + '%';
    e.preventDefault();
  };
  const onUp = async () => {
    if (!dragging) return;
    dragging = false;
    char.classList.remove('dragging');
    const left = parseFloat(char.style.left) || 3;
    const bottom = parseFloat(char.style.bottom) || 4;
    S.settings.companionCharLeft = left;
    S.settings.companionCharBottom = bottom;
    await saveSetting('companionCharLeft', left);
    await saveSetting('companionCharBottom', bottom);
  };

  char.addEventListener('mousedown', onDown);
  char.addEventListener('touchstart', onDown, { passive:false });
  document.addEventListener('mousemove', onMove);
  document.addEventListener('touchmove', onMove, { passive:false });
  document.addEventListener('mouseup', onUp);
  document.addEventListener('touchend', onUp);
}

function applyCompanionMusicSettings() {
  const a = $i('comp-audio'); if (!a) return;
  a.loop = !!S.settings.companionMusicLoop;
  a.volume = Math.max(0, Math.min(1, parseFloat(cs(S.settings.companionMusicVol, 0.6))));
}

async function applyCompanionMusicSrc() {
  const a = $i('comp-audio'); if (!a) return;
  if (S._companion.musicObjUrl) { try { URL.revokeObjectURL(S._companion.musicObjUrl); } catch(e) {} S._companion.musicObjUrl = null; }
  const id = S.settings.companionMusicMediaId;
  if (!id) { a.pause(); a.removeAttribute('src'); a.load(); return; }
  const url = await loadMediaUrl(id); if (!url) return;
  S._companion.musicObjUrl = url;
  a.src = url; a.load();
  if (S._companion.running) { try { await a.play(); } catch(e) {} }
}

function companionPickMedia(target) {
  S._companion.uploadTarget = target;
  const input = $i('companion-media-file'); if (!input) return;
  input.accept = target === 'music' ? 'audio/*' : 'image/*,video/*';
  input.value = ''; input.click();
}

async function handleCompanionMedia(input) {
  const file = input?.files?.[0]; if (!file) return;
  const target = S._companion.uploadTarget; if (!target) return;
  const id = `comp_${target}_${uid()}`;
  await saveMediaBlob(id, file, { name:file.name, mime:file.type, kind:target });
  // Upload image to Cloudinary for cloud sync
  if ((target === 'char' || target === 'bg') && file.type.startsWith('image/')) {
    toast('上传图片到云端中…');
    const dataUrl = await new Promise(r=>{const fr=new FileReader();fr.onload=e=>r(e.target.result);fr.readAsDataURL(file);});
    const folder = target === 'char' ? 'raimos/companion' : 'raimos/companion-bg';
    const url = await uploadToCloudinary(dataUrl, folder).catch(()=>null);
    if (target === 'char' && url) { S.settings.companionCharUrl = url; await saveSetting('companionCharUrl', url); }
    if (target === 'bg' && url) { S.settings.companionBgUrl = url; await saveSetting('companionBgUrl', url); }
  }
  if (target === 'char') {
    S.settings.companionCharType = 'upload'; S.settings.companionCharMediaId = id;
    await saveSetting('companionCharType', 'upload'); await saveSetting('companionCharMediaId', id);
  } else if (target === 'bg') {
    S.settings.companionBgType = 'upload'; S.settings.companionBgMediaId = id;
    await saveSetting('companionBgType', 'upload'); await saveSetting('companionBgMediaId', id);
  } else if (target === 'music') {
    S.settings.companionMusicMediaId = id; await saveSetting('companionMusicMediaId', id);
  }
  toast('✅ 已保存素材');
  renderCompanionPage();
  if (target === 'char' || target === 'bg') renderCompMediaGallery(target);
  if (target === 'music') await applyCompanionMusicSrc();
}

async function renderCompMediaGallery(target) {
  const el = $i(`comp-${target}-gallery`); if (!el) return;
  const kind = target; // 'char' or 'bg'
  const allFiles = await dbGetAll('files');
  const files = allFiles.filter(f => f.kind === kind).sort((a,b) => (b.ts||0)-(a.ts||0));
  const activeId = target === 'char' ? S.settings.companionCharMediaId : S.settings.companionBgMediaId;
  el.innerHTML = '';

  const uploadBtn = document.createElement('button');
  uploadBtn.className = 'btn-s comp-media-upload-btn';
  uploadBtn.textContent = '＋ 上传新素材';
  uploadBtn.onclick = () => {
    S._companion.uploadTarget = target;
    const inp = $i('companion-media-file');
    inp.accept = 'image/*,video/*'; inp.value = ''; inp.click();
  };
  el.appendChild(uploadBtn);

  if (!files.length) {
    const h = document.createElement('div');
    h.style.cssText = 'font-size:11px;color:var(--text3);padding:4px 0';
    h.textContent = '还没有素材，点上方上传';
    el.appendChild(h); return;
  }

  const grid = document.createElement('div');
  grid.className = 'comp-media-grid';

  for (const f of files) {
    const isActive = f.id === activeId;
    const card = document.createElement('div');
    card.className = 'comp-media-card' + (isActive ? ' active' : '');

    const thumb = document.createElement('div');
    thumb.className = 'comp-media-thumb';
    const url = await loadMediaUrl(f.id);
    if (url) {
      const isVid = f.mime?.startsWith('video/');
      const media = isVid ? document.createElement('video') : document.createElement('img');
      media.src = url;
      if (isVid) { media.muted = true; media.playsInline = true; media.loop = true; }
      thumb.appendChild(media);
    } else {
      thumb.textContent = '📷';
    }
    if (isActive) {
      const badge = document.createElement('div');
      badge.className = 'comp-media-active-badge';
      badge.textContent = '使用中';
      thumb.appendChild(badge);
    }
    card.appendChild(thumb);

    const acts = document.createElement('div');
    acts.className = 'comp-media-actions';
    const useBtn = document.createElement('button');
    useBtn.className = 'btn-s'; useBtn.textContent = isActive ? '✓' : '使用';
    if (!isActive) useBtn.onclick = () => compMediaSelect(target, f.id);
    const delBtn = document.createElement('button');
    delBtn.className = 'btn-s'; delBtn.style.color = '#e74c3c'; delBtn.textContent = '✕';
    delBtn.onclick = () => compMediaDelete(target, f.id);
    acts.appendChild(useBtn); acts.appendChild(delBtn);
    card.appendChild(acts);
    grid.appendChild(card);
  }
  el.appendChild(grid);
}

async function compMediaSelect(target, fileId) {
  if (target === 'char') {
    S.settings.companionCharType = 'upload'; S.settings.companionCharMediaId = fileId;
    await saveSetting('companionCharType', 'upload'); await saveSetting('companionCharMediaId', fileId);
    const sel = $i('comp-char-type'); if (sel) sel.value = 'upload';
  } else {
    S.settings.companionBgType = 'upload'; S.settings.companionBgMediaId = fileId;
    await saveSetting('companionBgType', 'upload'); await saveSetting('companionBgMediaId', fileId);
    const sel = $i('comp-bg-type'); if (sel) sel.value = 'upload';
  }
  syncCompanionUIFromSettings();
  void renderCompanionStage();
  renderCompMediaGallery(target);
}

async function compMediaDelete(target, fileId) {
  if (!confirm('删除这个素材？')) return;
  await dbDel('files', fileId);
  const activeKey = target === 'char' ? 'companionCharMediaId' : 'companionBgMediaId';
  const typeKey   = target === 'char' ? 'companionCharType'    : 'companionBgType';
  if (S.settings[activeKey] === fileId) {
    S.settings[activeKey] = ''; S.settings[typeKey] = 'builtin';
    await saveSetting(activeKey, ''); await saveSetting(typeKey, 'builtin');
    syncCompanionUIFromSettings();
    void renderCompanionStage();
  }
  renderCompMediaGallery(target);
}

function fmtSec(sec) {
  sec = Math.max(0, Math.floor(sec || 0));
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  if (h > 0) return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

function updateCompanionTimerText() {
  const el = $i('comp-timer'); if (!el) return;
  const mode = S.settings.companionTimerMode || 'pomodoro';
  const icon = '<span style="margin-right:5px;opacity:.7">⏰</span>';
  if (mode === 'countup') {
    el.innerHTML = icon + fmtSec(S._companion.elapsedSec);
  } else {
    const preview = mode === 'countdown'
      ? (parseInt(S.settings.companionCountdownMin || 25, 10) || 25) * 60
      : (parseInt(S._companion.phase === 'break' ? S.settings.companionPomoBreak : S.settings.companionPomoFocus, 10) || 25) * 60;
    el.innerHTML = icon + fmtSec(S._companion.remainingSec || (S._companion.running ? 0 : preview));
  }
  const ph = $i('comp-phase'); if (!ph) return;
  if (mode === 'pomodoro') {
    ph.style.display = '';
    ph.textContent = S._companion.phase === 'break' ? '☕ 休息中' : '🎯 专注中';
  } else {
    ph.style.display = 'none';
  }
}

function updateCompanionStartBtn() {
  const running = S._companion.running;
  const b = $i('comp-btn-start'); if (b) b.textContent = running ? '⏸ 暂停' : '▶︎ 开始';
  const b2 = $i('comp-imm-start'); if (b2) b2.textContent = running ? '⏸' : '▶︎';
}

// ── COMPANION STATS (daily history) ──
function _todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
async function _updateCompanionStats({ msgDelta=0, charDelta=0, sessDelta=0, contactId=null }={}) {
  const date = _todayStr();
  const existing = (await dbGet('companionStats', date)) || { date, msgCount:0, charCount:0, sessSec:0, companions:[] };
  existing.msgCount += msgDelta;
  existing.charCount += charDelta;
  existing.sessSec += sessDelta;
  if (contactId && !existing.companions.includes(contactId)) existing.companions.push(contactId);
  await dbPut('companionStats', existing);
}
// ── DAY COUNTERS (纪念日) ──
function _loadDayCounters() { try { return JSON.parse(localStorage.getItem('raimosDayCounters')||'[]'); } catch { return []; } }
function _saveDayCounters(arr) { localStorage.setItem('raimosDayCounters', JSON.stringify(arr)); }
function renderDayCounters() {
  const list = $i('ch-counters-list'); if (!list) return;
  const counters = _loadDayCounters();
  if (!counters.length) {
    list.innerHTML = '<div style="font-size:12px;color:var(--text3);text-align:center;padding:6px">暂无纪念日，点击「+」添加</div>';
    return;
  }
  const today = new Date(); today.setHours(0,0,0,0);
  list.innerHTML = counters.map((c, i) => {
    const d = new Date(c.date); d.setHours(0,0,0,0);
    const days = Math.round((today - d) / 86400000);
    const result = days > 0 ? `已过 <b>${days}</b> 天` : days === 0 ? '<b>就是今天 🎉</b>' : `还有 <b>${-days}</b> 天`;
    return `<div style="display:flex;align-items:center;gap:8px;padding:8px 10px;background:var(--hover);border-radius:10px;font-size:13px;margin-bottom:6px">
      <div style="flex:1"><div style="font-weight:700;color:var(--text)">${esc(c.label)}</div><div style="color:var(--text3);font-size:11px;margin-top:2px">${c.date} · ${result}</div></div>
      <button style="background:none;border:none;cursor:pointer;color:var(--text3);font-size:13px;padding:2px 5px" onclick="delDayCounter(${i})">✕</button>
    </div>`;
  }).join('');
}
function addDayCounter() {
  const form = $i('ch-add-counter-form');
  if (form) { form.style.display = form.style.display==='none'?'flex':'none'; return; }
}
function _submitDayCounter() {
  const label = ($i('ch-cnt-label')?.value||'').trim();
  const date = $i('ch-cnt-date')?.value||'';
  if (!label) { toast('请输入纪念日名称'); return; }
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) { toast('请选择日期'); return; }
  const counters = _loadDayCounters();
  counters.push({ id: uid(), label, date });
  _saveDayCounters(counters);
  const form = $i('ch-add-counter-form');
  if (form) { $i('ch-cnt-label').value=''; form.style.display='none'; }
  renderDayCounters();
}
function delDayCounter(i) {
  const counters = _loadDayCounters();
  counters.splice(i, 1);
  _saveDayCounters(counters);
  renderDayCounters();
}

async function openCompanionHistory() {
  const all = (await dbGetAll('companionStats')).sort((a,b)=>b.date.localeCompare(a.date));
  const modal = $i('companion-history-modal');
  if (!modal) return;
  // Summary
  const totalDays = all.length;
  const totalMsgs = all.reduce((s,r)=>s+r.msgCount,0);
  const totalChars = all.reduce((s,r)=>s+r.charCount,0);
  const totalSecs = all.reduce((s,r)=>s+r.sessSec,0);
  const fmt = s => s>=3600 ? `${Math.floor(s/3600)}h${Math.floor((s%3600)/60)}m` : s>=60 ? `${Math.floor(s/60)}m` : `${s}s`;
  const sumEl = $i('ch-summary');
  if (sumEl) sumEl.innerHTML = `共 <b>${totalDays}</b> 天记录 &nbsp;·&nbsp; 消息 <b>${totalMsgs}</b> 条 &nbsp;·&nbsp; 文字 <b>${totalChars}</b> 字 &nbsp;·&nbsp; 陪伴 <b>${fmt(totalSecs)}</b>`;
  // List
  const listEl = $i('ch-list');
  if (listEl) {
    if (!all.length) { listEl.innerHTML = '<div style="text-align:center;color:var(--text3);padding:24px">暂无记录，开始聊天吧 💗</div>'; }
    else {
      listEl.innerHTML = all.map(r => {
        const names = r.companions.map(id => S._contacts[id]?.name || id).join('、') || '—';
        return `<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 12px;border-bottom:1px solid var(--border);font-size:13px">
          <div>
            <div style="font-weight:600">${r.date}</div>
            <div style="color:var(--text3);font-size:11px;margin-top:2px">与 ${names}</div>
          </div>
          <div style="text-align:right;color:var(--text2)">
            <div>${r.msgCount} 条消息 / ${r.charCount} 字</div>
            <div style="font-size:11px;color:var(--text3)">${r.sessSec ? '陪伴 '+fmt(r.sessSec) : ''}</div>
          </div>
        </div>`;
      }).join('');
    }
  }
  renderDayCounters();
  modal.classList.add('show');
}

function companionToggleRun() {
  if (S._companion.running) companionPause(); else companionStart();
  updateCompanionStartBtn();
}

function companionStart() {
  haptic([10,5,10,5,10]);
  const s = S.settings, mode = s.companionTimerMode || 'pomodoro';
  S._companion.mode = mode; S._companion.running = true;
  S._companion.sessionStartSec = S._companion.elapsedSec || 0;
  S._companion.sessionRealStart = Date.now(); // track real time for all modes
  S._companion._ckMinutesLogged = S._companion._ckMinutesLogged || 0; // accumulated since last pause
  if (mode === 'countup') {
    if (!S._companion.elapsedSec) S._companion.elapsedSec = 0;
  } else if (mode === 'countdown') {
    if (!S._companion.remainingSec) S._companion.remainingSec = (parseInt(s.companionCountdownMin || 25, 10) || 25) * 60;
  } else {
    if (!S._companion.phase) S._companion.phase = 'focus';
    if (!S._companion.remainingSec) {
      const mins = S._companion.phase === 'break' ? (s.companionPomoBreak || 5) : (s.companionPomoFocus || 25);
      S._companion.remainingSec = (parseInt(mins, 10) || 1) * 60;
    }
  }
  if (S._companion.tickTimer) clearInterval(S._companion.tickTimer);
  S._companion.tickTimer = setInterval(() => {
    const m = S.settings.companionTimerMode || 'pomodoro';
    if (m === 'countup') {
      S._companion.elapsedSec++;
    } else {
      S._companion.remainingSec = Math.max(0, (S._companion.remainingSec || 0) - 1);
      if (S._companion.remainingSec <= 0) {
        if (m === 'pomodoro') {
          S._companion.phase = S._companion.phase === 'break' ? 'focus' : 'break';
          const mins = S._companion.phase === 'break' ? (S.settings.companionPomoBreak || 5) : (S.settings.companionPomoFocus || 25);
          S._companion.remainingSec = (parseInt(mins, 10) || 1) * 60;
          companionShowBubble(S._companion.phase === 'break' ? '到点啦，起来休息一下～' : '休息结束，我们继续专注吧～');
        } else {
          companionPause(); companionShowBubble('时间到啦！辛苦了～');
        }
      }
    }
    updateCompanionTimerText();
    // Mirror timer to PiP window if open
    if (_pipWin && !_pipWin.closed) {
      try {
        const pipTimer = _pipWin.document.getElementById('comp-timer');
        if (pipTimer) {
          const pm = S.settings.companionTimerMode || 'pomodoro';
          const psec = pm === 'countup' ? S._companion.elapsedSec : (S._companion.remainingSec || 0);
          pipTimer.innerHTML = fmtSec(psec);
        }
      } catch(e) {}
    }
    // Record 1 second of companion time every 60 ticks to avoid excessive DB writes
    if (!S._companion._statTick) S._companion._statTick = 0;
    S._companion._statTick++;
    if (S._companion._statTick >= 60) {
      S._companion._statTick = 0;
      const cid = S.currentChat ? S._chats[S.currentChat]?.contactId : null;
      void _updateCompanionStats({ sessDelta: 60, contactId: cid });
    }
  }, 1000);
  companionSetupSpeechTimer();
  applyCompanionMusicSettings();
  void applyCompanionMusicSrc();
}

async function companionPause() {
  S._companion.running = false;
  if (S._companion.tickTimer) { clearInterval(S._companion.tickTimer); S._companion.tickTimer = null; }
  if (S._companion.speechTimer) { clearInterval(S._companion.speechTimer); S._companion.speechTimer = null; }
  const a = $i('comp-audio'); if (a) a.pause();
  updateCompanionStartBtn();
  // Log time to linked checkin goal (all timer modes, using real time)
  const linkedId = S.settings.companionLinkedGoalId;
  if (linkedId && S._companion.sessionRealStart) {
    const totalElapsed = Math.floor((Date.now() - S._companion.sessionRealStart) / 1000);
    const totalMins = Math.floor(totalElapsed / 60);
    const newMins = totalMins - (S._companion._ckMinutesLogged || 0);
    S._companion.sessionRealStart = null;
    S._companion._ckMinutesLogged = 0;
    if (newMins > 0 && typeof ckAddCompanionMinutes === 'function') {
      await ckAddCompanionMinutes(linkedId, newMins);
    }
  }
}

function companionReset() {
  companionPause();
  S._companion.phase = 'focus'; S._companion.elapsedSec = 0; S._companion.remainingSec = 0;
  S._companion.sessionRealStart = null; S._companion._ckMinutesLogged = 0;
  updateCompanionTimerText(); companionHideBubble();
}

function companionSetupSpeechTimer() {
  if (S._companion.speechTimer) { clearInterval(S._companion.speechTimer); S._companion.speechTimer = null; }
  const freq = Math.max(0, parseInt(S.settings.companionFreqMin || 0, 10) || 0);
  if (!freq) return;
  S._companion.speechTimer = setInterval(() => {
    if (S._companion.running) companionSpeakNow();
  }, freq * 60 * 1000);
}

function companionShowBubble(text) {
  const b = $i('comp-bubble'); if (!b) return;
  b.textContent = text || ''; b.style.display = text ? '' : 'none';
  if (S._companion.bubbleTimer) clearTimeout(S._companion.bubbleTimer);
  if (text) S._companion.bubbleTimer = setTimeout(() => companionHideBubble(), 9000);
}
function companionHideBubble() {
  const b = $i('comp-bubble'); if (!b) return;
  b.style.display = 'none'; b.textContent = '';
}

async function companionSpeakNow() {
  if (S._companion.isSpeaking) return;
  S._companion.isSpeaking = true;
  try {
    const text = await callCompanionAI();
    if (text) { companionShowBubble(text); if (S.settings.autoTts) speakText(text); }
  } finally { S._companion.isSpeaking = false; }
}

async function callCompanionAI(phrase = '') {
  const s = S.settings;
  const contact = s.companionContactId ? S._contacts[s.companionContactId] : null;
  const useKey = contact?.apiKey || s.apiKey;
  const useUrl = contact?.apiUrl || s.apiUrl || 'https://openrouter.ai/api/v1/chat/completions';
  if (!useKey) { toast('请先在设置里填写 API Key！'); return ''; }
  const aiName = cs(contact?.name, s.aiName) || '小可';
  const scene = (s.companionSceneCustom || '').trim() || s.companionScene || '陪伴';
  const mode = s.companionTimerMode || 'pomodoro';
  const status = mode === 'countup'
    ? `已用时 ${fmtSec(S._companion.elapsedSec)}`
    : mode === 'countdown'
      ? `剩余 ${fmtSec(S._companion.remainingSec)}`
      : `${S._companion.phase === 'break' ? '休息' : '专注'}剩余 ${fmtSec(S._companion.remainingSec)}`;

  // Task context for linked checkin goal
  let taskCtx = '';
  const linkedId = s.companionLinkedGoalId;
  if (linkedId && typeof ckGetGoals === 'function') {
    try {
      const goals = await ckGetGoals();
      const linkedGoal = goals.find(g => g.id === linkedId);
      if (linkedGoal) {
        const today = typeof ckTodayStr === 'function' ? ckTodayStr() : new Date().toISOString().slice(0,10);
        const rec = typeof ckGetRecordByDate === 'function' ? await ckGetRecordByDate(linkedId, today) : null;
        const done = rec?.minutesLogged || 0;
        const target = linkedGoal.targetMinutes || 30;
        taskCtx = `\n用户正在用陪伴时间完成打卡目标「${linkedGoal.title}」，今日进度：${done}/${target}分钟。`;
      }
    } catch(e) {}
  }

  const sys = `你是${aiName}，${cs(contact?.system, s.systemPrompt) || '可爱温柔的AI助手'}。你正在以"陪伴模式"陪用户进行：${scene}。请用中文输出1-2句简短自然的话（不要列点、不超过40字/句），像真实朋友一样。${taskCtx}`;
  const phraseCtx = phrase ? `\n用户说：「${phrase}」，请针对此做出自然回应。` : '';
  const userMsg = `当前状态：${status}。${phraseCtx || '请给用户一句陪伴/鼓励/提醒。'}`;
  try {
    const res = await fetch(useUrl, {
      method:'POST',
      headers:{'Authorization':`Bearer ${useKey}`,'Content-Type':'application/json','HTTP-Referer':'https://raimos.app','X-Title':'Raimos'},
      body:JSON.stringify({ model:contact?.model || s.model || 'openai/gpt-4o-mini', messages:[{role:'system',content:sys},{role:'user',content:userMsg}], temperature:contact?.temp ?? parseFloat(s.temp ?? 0.85), stream:false, max_tokens:120 }),
    });
    if (!res.ok) { const e = await res.json().catch(() => ({error:{message:'Error'}})); throw new Error(e.error?.message || res.statusText); }
    const d = await res.json();
    return (d.choices?.[0]?.message?.content || '').trim();
  } catch(e) { toast(`❌ 陪伴说话失败：${e.message}`); return ''; }
}

// ── Quick Phrases for Companion ──
const DEFAULT_PHRASES = ['摸摸头', '要求夸奖', '我想放弃了', '帮我打气', '快夸夸我'];

let _speakBtnLastClick = 0;
let _phrasePanelOpen = false;

function companionSpeakClick(event) {
  const now = Date.now();
  const isDouble = (now - _speakBtnLastClick) < 380;
  _speakBtnLastClick = now;
  if (isDouble) {
    companionClosePhrasePanel();
    companionSpeakNow();
  } else {
    companionTogglePhrasePanel();
  }
}

function companionTogglePhrasePanel() {
  _phrasePanelOpen = !_phrasePanelOpen;
  companionRenderPhrasePanel();
  const panels = ['comp-phrase-panel', 'comp-mini-phrase-panel', 'comp-imm-phrase-panel'];
  panels.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = _phrasePanelOpen ? '' : 'none';
  });
}

function companionClosePhrasePanel() {
  _phrasePanelOpen = false;
  ['comp-phrase-panel','comp-mini-phrase-panel','comp-imm-phrase-panel'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });
}

function companionRenderPhrasePanel() {
  const phrases = S.settings.companionPhrases || DEFAULT_PHRASES;
  ['comp-phrase-list','comp-mini-phrase-list','comp-imm-phrase-list'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = '';
    phrases.forEach(p => {
      const btn = document.createElement('button');
      btn.className = 'comp-phrase-btn';
      btn.textContent = p;
      btn.onclick = () => { companionClosePhrasePanel(); companionSpeakWithPhrase(p); };
      el.appendChild(btn);
    });
  });
  // Also render settings list
  renderCompanionPhraseSettings();
}

async function companionSpeakWithPhrase(phrase) {
  if (S._companion.isSpeaking) return;
  S._companion.isSpeaking = true;
  try {
    const text = await callCompanionAI(phrase);
    if (text) { companionShowBubble(text); if (S.settings.autoTts) speakText(text); }
  } finally { S._companion.isSpeaking = false; }
}

function renderCompanionPhraseSettings() {
  const container = document.getElementById('comp-phrases-list');
  if (!container) return;
  const phrases = S.settings.companionPhrases || DEFAULT_PHRASES;
  container.innerHTML = '';
  phrases.forEach((p, i) => {
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;gap:6px;align-items:center;margin-bottom:4px';
    const inp = document.createElement('input');
    inp.value = p; inp.style.cssText = 'flex:1;background:var(--input-bg);border:1.5px solid var(--border);border-radius:8px;padding:5px 8px;font-size:12px;color:var(--text);font-family:inherit;outline:none';
    inp.onchange = () => { const arr = [...(S.settings.companionPhrases||DEFAULT_PHRASES)]; arr[i] = inp.value.trim()||p; S.settings.companionPhrases = arr; saveSetting('companionPhrases', arr); };
    const del = document.createElement('button');
    del.textContent = '✕'; del.className = 'btn-s'; del.style.cssText = 'padding:3px 7px;font-size:11px;color:#e05a7a';
    del.onclick = () => { const arr = [...(S.settings.companionPhrases||DEFAULT_PHRASES)]; arr.splice(i,1); S.settings.companionPhrases = arr; saveSetting('companionPhrases', arr); renderCompanionPhraseSettings(); };
    row.appendChild(inp); row.appendChild(del);
    container.appendChild(row);
  });
}

function ckAddPhraseRow() {
  const arr = [...(S.settings.companionPhrases || DEFAULT_PHRASES)];
  arr.push('新短语');
  S.settings.companionPhrases = arr;
  saveSetting('companionPhrases', arr);
  renderCompanionPhraseSettings();
}
// alias used in HTML
function compAddPhrase() { ckAddPhraseRow(); }

// Close phrase panel when clicking outside
document.addEventListener('click', e => {
  if (_phrasePanelOpen && !e.target.closest('.comp-speak-wrap') && !e.target.closest('#comp-mini-phrase-panel') && !e.target.closest('#comp-mini-speak')) {
    companionClosePhrasePanel();
  }
});

// ── Character Size ──
function companionApplyCharSize(val) {
  const char = $i('comp-char'); if (!char) return;
  const pct = Math.max(20, Math.min(100, +val));
  char.style.width = pct + '%';
  const lv = $i('comp-char-size-val'); if (lv) lv.textContent = pct + '%';
  S.settings.companionCharSize = pct;
  saveSetting('companionCharSize', pct);
}

// ── Fullscreen Immersive Mode ──
function companionEnterImmersive() {
  S._companion.immersive = true;
  document.body.classList.add('comp-immersive');
  updateCompanionStartBtn();
  // Request true fullscreen (covers browser UI)
  const el = $i('companion-page') || document.documentElement;
  const fsPromise = el.requestFullscreen ? el.requestFullscreen() : (el.webkitRequestFullscreen ? Promise.resolve(el.webkitRequestFullscreen()) : Promise.resolve());
  fsPromise.catch(() => {}).then(() => {
    // Lock to portrait on mobile so fullscreen fills the screen vertically
    if (isMobile() && screen.orientation?.lock) {
      screen.orientation.lock('portrait').catch(() => {});
    }
  });
  // Listen for exit via Escape
  document.addEventListener('fullscreenchange', _companionFsChange);
  document.addEventListener('webkitfullscreenchange', _companionFsChange);
}
function companionExitImmersiveOrientation() {
  if (screen.orientation?.unlock) { try { screen.orientation.unlock(); } catch(e) {} }
}
function _companionFsChange() {
  if (!document.fullscreenElement && !document.webkitFullscreenElement) {
    if (S._companion.immersive) companionExitImmersive();
  }
}
function companionExitImmersive() {
  S._companion.immersive = false;
  document.body.classList.remove('comp-immersive');
  const bar = $i('comp-imm-bar'); if (bar) bar.classList.remove('imm-hidden');
  updateCompanionStartBtn();
  companionExitImmersiveOrientation();
  if (document.exitFullscreen && document.fullscreenElement) document.exitFullscreen();
  else if (document.webkitExitFullscreen && document.webkitFullscreenElement) document.webkitExitFullscreen();
  document.removeEventListener('fullscreenchange', _companionFsChange);
  document.removeEventListener('webkitfullscreenchange', _companionFsChange);
}
function toggleImmBar() {
  const bar = $i('comp-imm-bar'); if (!bar) return;
  const hidden = bar.classList.toggle('imm-hidden');
  const btn = $i('comp-imm-toggle'); if (btn) btn.textContent = hidden ? '⋯' : '✕';
}

// ── Picture-in-Picture (Document PiP) ──
let _pipWin = null;
async function companionEnterPiP() {
  // Try Document Picture-in-Picture API (Chrome 116+)
  if (window.documentPictureInPicture) {
    try {
      if (_pipWin) { try { _pipWin.close(); } catch(e) {} _pipWin = null; }
      const pipWin = await window.documentPictureInPicture.requestWindow({ width: 340, height: 280 });
      _pipWin = pipWin;
      // Copy styles
      [...document.styleSheets].forEach(ss => {
        try {
          const link = pipWin.document.createElement('link');
          link.rel = 'stylesheet'; link.href = ss.href || '';
          if (ss.href) pipWin.document.head.appendChild(link);
        } catch(e) {}
      });
      pipWin.document.body.style.cssText = 'margin:0;padding:0;overflow:hidden;background:#ffe6ef;font-family:inherit;';
      // Move comp-stage into pip window
      const stage = $i('comp-stage');
      if (stage) {
        pipWin.document.body.appendChild(stage);
        stage.style.cssText = 'position:absolute;inset:0;border-radius:0;border:none;';
      }
      pipWin.addEventListener('pagehide', () => {
        // Stage is currently in pipWin.document, not main document
        const orig = pipWin.document.getElementById('comp-stage') || $i('comp-stage');
        const wrap = $i('comp-wrap');
        if (orig && wrap) wrap.insertBefore(orig, wrap.firstChild);
        if (orig) orig.style.cssText = '';
        // Null cached URLs so renderCompanionStage creates fresh blob URLs in main window
        S._companion.bgObjUrl = null;
        S._companion.charObjUrl = null;
        _pipWin = null;
        void renderCompanionStage();
      });
      toast('✅ 画中画已开启，可置顶在所有窗口前');
      return;
    } catch(e) { /* fall through to popup */ }
  }
  // Fallback: open a small popup window
  _companionOpenPopup();
}
function _companionOpenPopup() {
  const w = 340, h = 300;
  const left = window.screen.width - w - 20;
  const top = window.screen.height - h - 80;
  const popup = window.open('', '_companion_pip',
    `width=${w},height=${h},left=${left},top=${top},resizable=yes,scrollbars=no,toolbar=no,menubar=no,location=no,status=no,alwaysOnTop=yes`);
  if (!popup) { toast('请允许弹出窗口以使用小窗功能'); return; }
  const char = S.settings.companionCharBuiltin || '😊';
  const bg = S.settings.companionBgBuiltin || 'bg1';
  const bgMap = { bg1:'#FCE4EC,#F8BBD0', bg2:'#E3F2FD,#BBDEFB', bg3:'#E8F5E9,#C8E6C9', bg4:'#EDE7F6,#D1C4E9', bg5:'FFF8E1,#FFECB3' };
  const grad = bgMap[bg] || '#FCE4EC,#F8BBD0';
  popup.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>💗 陪伴</title>
    <style>*{margin:0;padding:0;box-sizing:border-box;}body{background:linear-gradient(135deg,${grad});height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;font-family:sans-serif;overflow:hidden;}
    .ch{font-size:72px;margin-bottom:10%;filter:drop-shadow(0 6px 12px rgba(0,0,0,.15));}
    .tm{position:fixed;top:10px;right:10px;font-size:13px;font-weight:900;background:rgba(255,255,255,.8);padding:4px 8px;border-radius:8px;}
    </style></head><body>
    <div class="tm" id="tm">00:00</div>
    <div class="ch">${char}</div>
    </body></html>`);
  popup.document.close();
  toast('✅ 小窗已打开（部分浏览器不支持置顶）');
}

// ── Mini Float Window (within app, for mobile) ──
let _miniDragging = false, _miniDragX = 0, _miniDragY = 0, _miniInitX = 0, _miniInitY = 0;
let _miniTimerInt = null;
let _miniOnDown = null, _miniOnMove = null, _miniOnUp = null;  // keep refs to remove listeners

function companionToggleMini() {
  const win = $i('comp-mini-win'); if (!win) return;
  if (win.style.display === 'none' || !win.style.display) {
    companionShowMini();
  } else {
    companionHideMini();
  }
}
function companionShowMini() {
  const win = $i('comp-mini-win'); if (!win) return;
  win.style.display = 'flex';
  S._companion.mini = true;
  saveSetting('companionMiniOpen', true);
  // Render mini content
  _miniRender();
  // Remove any previously registered listeners before adding new ones
  _miniRemoveDragListeners();
  // Start drag — but don't intercept clicks on buttons
  const header = $i('comp-mini-header'); if (!header) return;
  _miniOnDown = e => {
    if (e.target.tagName === 'BUTTON') return;
    _miniDragging = false;
    const t = e.touches?.[0] || e;
    const r = win.getBoundingClientRect();
    _miniDragX = t.clientX - r.left; _miniDragY = t.clientY - r.top;
  };
  _miniOnMove = e => {
    const t = e.touches?.[0] || e;
    const r = win.getBoundingClientRect();
    if (!_miniDragging && (Math.abs(t.clientX - (r.left + _miniDragX)) > 4 || Math.abs(t.clientY - (r.top + _miniDragY)) > 4)) {
      _miniDragging = true;
    }
    if (!_miniDragging) return;
    const nx = t.clientX - _miniDragX, ny = t.clientY - _miniDragY;
    win.style.left = Math.max(0, Math.min(window.innerWidth - win.offsetWidth, nx)) + 'px';
    win.style.top = Math.max(0, Math.min(window.innerHeight - win.offsetHeight, ny)) + 'px';
    win.style.bottom = 'auto'; win.style.right = 'auto';
    e.preventDefault();
  };
  _miniOnUp = () => { _miniDragging = false; };
  header.addEventListener('mousedown', _miniOnDown);
  header.addEventListener('touchstart', _miniOnDown, { passive: true });
  document.addEventListener('mousemove', _miniOnMove);
  document.addEventListener('touchmove', _miniOnMove, { passive: false });
  document.addEventListener('mouseup', _miniOnUp);
  document.addEventListener('touchend', _miniOnUp);
  // Update mini timer
  if (_miniTimerInt) clearInterval(_miniTimerInt);
  _miniTimerInt = setInterval(_miniUpdateTimer, 1000);
}
function _miniRemoveDragListeners() {
  const header = $i('comp-mini-header');
  if (_miniOnDown && header) { header.removeEventListener('mousedown', _miniOnDown); header.removeEventListener('touchstart', _miniOnDown); }
  if (_miniOnMove) { document.removeEventListener('mousemove', _miniOnMove); document.removeEventListener('touchmove', _miniOnMove); }
  if (_miniOnUp) { document.removeEventListener('mouseup', _miniOnUp); document.removeEventListener('touchend', _miniOnUp); }
  _miniOnDown = null; _miniOnMove = null; _miniOnUp = null;
}
function companionHideMini() {
  const win = $i('comp-mini-win'); if (!win) return;
  win.style.display = 'none';
  S._companion.mini = false;
  saveSetting('companionMiniOpen', false);
  if (_miniTimerInt) { clearInterval(_miniTimerInt); _miniTimerInt = null; }
  _miniRemoveDragListeners();
}
async function _miniRender() {
  const stage = $i('comp-mini-stage'); if (!stage) return;
  const s = S.settings;
  const charType = s.companionCharType || 'builtin';
  const bgType = s.companionBgType || 'builtin';
  const bgColors = { bg1:'linear-gradient(135deg,#FCE4EC,#F8BBD0)', bg2:'linear-gradient(135deg,#E3F2FD,#BBDEFB)', bg3:'linear-gradient(135deg,#E8F5E9,#C8E6C9)', bg4:'linear-gradient(135deg,#EDE7F6,#D1C4E9)', bg5:'linear-gradient(135deg,#FFF8E1,#FFECB3)' };

  // Determine background
  let bgStyle = bgColors[s.companionBgBuiltin || 'bg1'] || bgColors.bg1;
  let bgImgEl = '';
  if (bgType === 'upload' && s.companionBgMediaId) {
    const url = await loadMediaUrl(s.companionBgMediaId).catch(()=>null) || s.companionBgUrl || '';
    if (url) bgImgEl = `<img src="${url}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;pointer-events:none;">`;
    bgStyle = 'transparent';
  }

  // Determine character
  let charEl = '';
  if (charType === 'builtin') {
    charEl = `<div class="mini-char">${s.companionCharBuiltin || '😊'}</div>`;
  } else if (charType === 'upload' && s.companionCharMediaId) {
    const url = await loadMediaUrl(s.companionCharMediaId).catch(()=>null) || s.companionCharUrl || '';
    charEl = url
      ? `<div class="mini-char"><img src="${url}" style="width:100%;height:100%;object-fit:contain;max-width:80px;max-height:80px;filter:drop-shadow(0 6px 10px rgba(0,0,0,.15))"></div>`
      : `<div class="mini-char">😊</div>`;
  } else {
    charEl = `<div class="mini-char">😊</div>`;
  }

  stage.innerHTML = `
    <div id="comp-mini-bg" style="position:absolute;inset:0;background:${bgStyle}">${bgImgEl}</div>
    ${charEl}
    <div class="mini-bubble" id="comp-mini-bubble"></div>
    <div class="mini-timer" id="comp-mini-timer">00:00</div>
  `;
  _miniUpdateTimer();
}
function _miniUpdateTimer() {
  const el = $i('comp-mini-timer'); if (!el) return;
  // Calculate directly from state so it works even when companion page is hidden or in PiP
  const mode = S.settings.companionTimerMode || 'pomodoro';
  const sec = mode === 'countup' ? (S._companion.elapsedSec || 0) : (S._companion.remainingSec || 0);
  el.textContent = fmtSec(sec);
  const mb = $i('comp-mini-start'); if (mb) mb.textContent = S._companion.running ? '⏸' : '▶︎';
  // Mirror speech bubble
  const b = $i('comp-bubble'); const mb2 = $i('comp-mini-bubble');
  if (b && mb2) {
    mb2.textContent = b.textContent || '';
    mb2.classList.toggle('on', b.style.display !== 'none' && !!b.textContent);
  }
  // Show linked task progress
  const taskEl = $i('comp-mini-task');
  if (taskEl) {
    const linkedId = S.settings.companionLinkedGoalId;
    if (linkedId && typeof ckGetGoals === 'function') {
      const goal = (window.CK?.goals || []).find(g => g.id === linkedId);
      if (goal) {
        taskEl.style.display = '';
        // Try to get today's record from CK cache (synchronous check)
        taskEl.textContent = `${goal.emoji||'🎯'} ${goal.title}`;
      } else { taskEl.style.display = 'none'; }
    } else { taskEl.style.display = 'none'; }
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
  contactId: null,   // currently selected AI contact id
  prefs: { boardColor:'wood', pieceStyle:'classic', playerPiece:'classic', aiPiece:'panda', commentary:true, difficulty:'normal', commentFreq:'normal' },
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
  // Update indicator circles in info bar
  gmkUpdatePlayerIndicators();
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

function showGameTokenBadge(badgeId, usage) {
  const badge = $i(badgeId);
  if (!badge) return;
  if (S.settings.showGameToken && usage) {
    const t = usage.total_tokens || 0, p = usage.prompt_tokens || 0, c = usage.completion_tokens || 0;
    badge.textContent = `⚡ ${t} tokens (↑${p} ↓${c})`;
    badge.style.display = '';
  } else {
    badge.style.display = 'none';
  }
}

function gomokuSay(text) {
  const el = $i('gomoku-comment');
  if (!el || !text) return;
  el.textContent = text;
  el.style.opacity = '1';
  showGameTokenBadge('gomoku-token-badge', GOMOKU._lastUsage || null);
  GOMOKU._lastUsage = null;
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
  const diff = GOMOKU.prefs.difficulty || 'normal';
  GOMOKU.moveCount++;

  // Algorithm always finds the best move first
  let { r: row, c: col } = gomokuHeuristic();
  let comment = '';

  // Check if the best move is an immediate win
  GOMOKU.board[row][col] = 2;
  const wouldWin = gomokuCheckWin(row, col, 2);
  GOMOKU.board[row][col] = 0;

  // ── Decisive moment: LLM decides whether to take the win ──
  // Only triggers when AI can win, has a key, and difficulty is not easy
  if (wouldWin && useKey && diff !== 'easy') {
    const aiName = contact?.name || 'AI';
    const personality = (contact?.system || '你是可爱温柔的AI助手').slice(0, 150);
    const model = contact?.model || 'openai/gpt-4o-mini';
    const moveLabel = diff === 'hard' ? '专业难度，你一直认真博弈' : '普通难度，你时而认真时而温柔';
    const prompt = `你是${aiName}，性格：${personality}。你在和用户下五子棋（${moveLabel}，第${GOMOKU.moveCount}步）。现在你可以立刻落子赢棋了。根据你此刻的性格、心情和对用户的感情，你要赢下这局吗？还是故意让一步让对方多玩一会儿？自由决定，用1句符合性格的话表达你的决定。只返回JSON：{"take_win":true或false,"comment":"一句话"}`;
    try {
      const res = await fetch(useUrl, {
        method:'POST',
        headers:{'Authorization':`Bearer ${useKey}`,'Content-Type':'application/json','HTTP-Referer':'https://raimos.app','X-Title':'Raimos'},
        body:JSON.stringify({model,max_tokens:80,stream:false,temperature:0.9,messages:[{role:'user',content:prompt}]}),
      });
      const data = await res.json();
      GOMOKU._lastUsage = data.usage || null;
      const txt = data.choices?.[0]?.message?.content || '';
      const m = txt.match(/\{[\s\S]*?\}/);
      if (m) {
        const p = JSON.parse(m[0]);
        comment = p.comment || '';
        if (p.take_win === false) {
          // LLM chose to yield — find best non-winning move
          const alt = gomokuYieldMove();
          row = alt.r; col = alt.c;
        }
      }
    } catch(e) {}
    if (!comment) comment = wouldWin ? '就决定是你了！' : '';
  }

  // Regular commentary (only when no decisive-moment comment)
  if (!comment && useKey && GOMOKU.prefs.commentary) {
    const playerLastR = GOMOKU.lastMove?.[0], playerLastC = GOMOKU.lastMove?.[1];
    const playerThreat = (playerLastR != null) ? gomokuMaxLine(playerLastR, playerLastC, 1) : 0;
    const commentHint = playerThreat >= 4
      ? '对手刚连了4子被你拦住，可以紧张/得意/挑衅'
      : playerThreat >= 3 ? '对手有威胁，可以警惕/调侃'
      : GOMOKU.moveCount % 4 === 0 ? '聊聊游戏感受/鼓励/调侃'
      : '';
    if (commentHint) {
      const phase = GOMOKU.moveCount <= 6 ? '开局' : GOMOKU.moveCount <= 20 ? '中局' : '终局';
      const aiName = contact?.name || 'AI';
      const personality = (contact?.system || '你是可爱温柔的AI助手').slice(0, 130);
      const model = contact?.model || 'openai/gpt-4o-mini';
      const prompt = `你是${aiName}，性格：${personality}。正在和用户下五子棋${phase}第${GOMOKU.moveCount}步。${commentHint}。用1句符合性格的话回应。只返回JSON：{"comment":"一句话"}`;
      try {
        const res = await fetch(useUrl, {
          method:'POST',
          headers:{'Authorization':`Bearer ${useKey}`,'Content-Type':'application/json','HTTP-Referer':'https://raimos.app','X-Title':'Raimos'},
          body:JSON.stringify({model,max_tokens:60,stream:false,temperature:0.8,messages:[{role:'user',content:prompt}]}),
        });
        const data = await res.json();
        GOMOKU._lastUsage = data.usage || null;
        const txt = data.choices?.[0]?.message?.content || '';
        const mm = txt.match(/\{[\s\S]*?\}/);
        if (mm) comment = JSON.parse(mm[0]).comment || '';
      } catch(e) {}
    }
    if (!comment) {
      const playerLastR2 = GOMOKU.lastMove?.[0], playerLastC2 = GOMOKU.lastMove?.[1];
      const pt = (playerLastR2 != null) ? gomokuMaxLine(playerLastR2, playerLastC2, 1) : 0;
      comment = pt >= 4 ? '好险，我得拦住你！' : pt >= 3 ? '嗯，得小心一点～' : '';
    }
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

// Yield move: best strategic move that does NOT immediately win (for LLM let-go moments)
function gomokuYieldMove() {
  const diff = GOMOKU.prefs.difficulty || 'normal';
  const N = 15;
  const seen = new Set();
  for (let r=0;r<N;r++) for (let c=0;c<N;c++) {
    if (!GOMOKU.board[r][c]) continue;
    for (let dr=-2;dr<=2;dr++) for (let dc=-2;dc<=2;dc++) {
      const nr=r+dr,nc=c+dc;
      if (nr>=0&&nr<N&&nc>=0&&nc<N&&!GOMOKU.board[nr][nc]) seen.add(nr*N+nc);
    }
  }
  const cells = [...seen].map(k=>({r:Math.floor(k/N),c:k%N}));
  // Still block player's win — yielding doesn't mean letting player win instantly
  for (const {r,c} of cells){GOMOKU.board[r][c]=1;const w=gomokuCheckWin(r,c,1);GOMOKU.board[r][c]=0;if(w)return{r,c};}
  // Score-based but skip any move that would win immediately
  const defWeight = diff === 'hard' ? 1.3 : 1.1;
  let best=null, bestScore=-Infinity;
  for (const {r,c} of cells) {
    GOMOKU.board[r][c]=2; const wins=gomokuCheckWin(r,c,2); GOMOKU.board[r][c]=0;
    if (wins) continue; // skip winning moves
    const score = gomokuScore(r,c,2) + gomokuScore(r,c,1)*defWeight;
    if (score>bestScore){bestScore=score;best={r,c};}
  }
  return best || cells[0] || {r:7,c:7};
}

// Score a position for a player: higher = more dangerous / more valuable
function gomokuScore(r, c, player) {
  const N = 15;
  const dirs = [[0,1],[1,0],[1,1],[1,-1]];
  let total = 0;
  for (const [dr, dc] of dirs) {
    let cnt = 1, opens = 0;
    for (let d=1;d<5;d++){const nr=r+dr*d,nc=c+dc*d;if(nr<0||nr>=N||nc<0||nc>=N)break;if(GOMOKU.board[nr][nc]===player)cnt++;else{if(GOMOKU.board[nr][nc]===0)opens++;break;}}
    for (let d=1;d<5;d++){const nr=r-dr*d,nc=c-dc*d;if(nr<0||nr>=N||nc<0||nc>=N)break;if(GOMOKU.board[nr][nc]===player)cnt++;else{if(GOMOKU.board[nr][nc]===0)opens++;break;}}
    if      (cnt>=5)              total += 100000;
    else if (cnt===4&&opens>=2)   total +=  50000; // 活四
    else if (cnt===4&&opens>=1)   total +=  10000; // 冲四
    else if (cnt===3&&opens>=2)   total +=   2000; // 活三
    else if (cnt===3&&opens>=1)   total +=    300; // 眠三
    else if (cnt===2&&opens>=2)   total +=    100;
    else if (cnt===2&&opens>=1)   total +=     20;
  }
  return total;
}

// Heuristic: always correct (win > block 5 > block 4 > score-based)
function gomokuHeuristic() {
  const diff = GOMOKU.prefs.difficulty || 'normal';
  const N = 15;
  // Collect candidate cells within 2 of any piece
  const seen = new Set();
  let hasAny = false;
  for (let r=0;r<N;r++) for (let c=0;c<N;c++) {
    if (!GOMOKU.board[r][c]) continue;
    hasAny = true;
    for (let dr=-2;dr<=2;dr++) for (let dc=-2;dc<=2;dc++) {
      const nr=r+dr,nc=c+dc;
      if (nr>=0&&nr<N&&nc>=0&&nc<N&&!GOMOKU.board[nr][nc]) seen.add(nr*N+nc);
    }
  }
  if (!hasAny) return {r:7,c:7};
  const cells = [...seen].map(k=>({r:Math.floor(k/N),c:k%N}));

  // All difficulties: win immediately
  for (const {r,c} of cells){GOMOKU.board[r][c]=2;const w=gomokuCheckWin(r,c,2);GOMOKU.board[r][c]=0;if(w)return{r,c};}
  // All difficulties: block player's 5-in-a-row
  for (const {r,c} of cells){GOMOKU.board[r][c]=1;const w=gomokuCheckWin(r,c,1);GOMOKU.board[r][c]=0;if(w)return{r,c};}

  if (diff === 'easy') {
    // Easy: no threat detection, mostly random near existing pieces
    const shuffled = cells.slice().sort(()=>Math.random()-0.5);
    return shuffled[0]||{r:7,c:7};
  }

  // Normal / Hard: score-based, defense outweighs offense to ensure blocking
  const defWeight = diff === 'hard' ? 1.3 : 1.1;
  const noise     = diff === 'hard' ? 0   : 60;  // normal has slight randomness
  let best=null, bestScore=-Infinity;
  for (const {r,c} of cells) {
    const score = gomokuScore(r,c,2) + gomokuScore(r,c,1)*defWeight + Math.random()*noise;
    if (score>bestScore){bestScore=score;best={r,c};}
  }
  return best||cells[0]||{r:7,c:7};
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
      const data=await res.json();GOMOKU._lastUsage = data.usage || null;const txt=data.choices?.[0]?.message?.content||'';const m=txt.match(/\{[\s\S]*?\}/);
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

// ══ Xiangqi (中国象棋) ══════════════════════

const XIANGQI = {
  board: null,    // 10 rows x 9 cols, null = empty, {type, side} = piece
  turn: 'red',   // 'red' = player, 'black' = AI
  over: false,
  selected: null, // {r, c} currently selected piece
  moves: [],      // valid moves for selected piece
  moveCount: 0,
  startTime: 0,
  contactId: null,
  prefs: { boardColor:'classic', commentFreq:'normal', difficulty:'normal' },
};

const XQ_BOARD_COLORS = { classic:'xq-board-classic', pink:'xq-board-pink', purple:'xq-board-purple', green:'xq-board-green', dark:'xq-board-dark' };

// Chinese chess piece names (red/black)
const XQ_NAMES = {
  king:   { red:'帅', black:'將' },
  advisor:{ red:'仕', black:'士' },
  elephant:{ red:'相', black:'象' },
  horse:  { red:'馬', black:'馬' },
  rook:   { red:'車', black:'車' },
  cannon: { red:'炮', black:'砲' },
  pawn:   { red:'兵', black:'卒' },
};

function xqInitBoard() {
  const b = Array.from({length:10}, () => Array(9).fill(null));
  // Black pieces (top, rows 0-4)
  const backRow = ['rook','horse','elephant','advisor','king','advisor','elephant','horse','rook'];
  backRow.forEach((t,c) => b[0][c] = {type:t, side:'black'});
  b[2][1] = {type:'cannon', side:'black'}; b[2][7] = {type:'cannon', side:'black'};
  [0,2,4,6,8].forEach(c => b[3][c] = {type:'pawn', side:'black'});
  // Red pieces (bottom, rows 5-9)
  [0,2,4,6,8].forEach(c => b[6][c] = {type:'pawn', side:'red'});
  b[7][1] = {type:'cannon', side:'red'}; b[7][7] = {type:'cannon', side:'red'};
  const redBack = ['rook','horse','elephant','advisor','king','advisor','elephant','horse','rook'];
  redBack.forEach((t,c) => b[9][c] = {type:t, side:'red'});
  return b;
}

function xqGetMoves(board, r, c) {
  const piece = board[r][c];
  if (!piece) return [];
  const moves = [];
  const {type, side} = piece;
  const enemy = side === 'red' ? 'black' : 'red';

  function inBounds(r,c) { return r>=0&&r<10&&c>=0&&c<9; }
  function canTo(r,c) { return inBounds(r,c) && board[r][c]?.side !== side; }
  function add(r,c) { if (canTo(r,c)) moves.push([r,c]); }

  if (type === 'rook') {
    for (const [dr,dc] of [[-1,0],[1,0],[0,-1],[0,1]]) {
      for (let i=1;i<10;i++) {
        const nr=r+dr*i, nc=c+dc*i;
        if (!inBounds(nr,nc)) break;
        if (board[nr][nc]) { if (board[nr][nc].side !== side) moves.push([nr,nc]); break; }
        else moves.push([nr,nc]);
      }
    }
  } else if (type === 'cannon') {
    for (const [dr,dc] of [[-1,0],[1,0],[0,-1],[0,1]]) {
      let jumped = false;
      for (let i=1;i<10;i++) {
        const nr=r+dr*i, nc=c+dc*i;
        if (!inBounds(nr,nc)) break;
        if (!jumped) {
          if (board[nr][nc]) jumped = true;
          else moves.push([nr,nc]);
        } else {
          if (board[nr][nc]) { if (board[nr][nc].side !== side) moves.push([nr,nc]); break; }
        }
      }
    }
  } else if (type === 'horse') {
    const hMoves = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
    const blocks = [[-1,0],[-1,0],[0,-1],[0,-1],[0,-1],[0,-1],[1,0],[1,0]];
    hMoves.forEach(([dr,dc],i) => {
      const br=r+blocks[i][0], bc=c+blocks[i][1];
      if (inBounds(br,bc) && !board[br][bc]) add(r+dr, c+dc);
    });
  } else if (type === 'elephant') {
    const eMoves = [[-2,-2],[-2,2],[2,-2],[2,2]];
    const eBlocks = [[-1,-1],[-1,1],[1,-1],[1,1]];
    eMoves.forEach(([dr,dc],i) => {
      const nr=r+dr, nc=c+dc;
      const br=r+eBlocks[i][0], bc=c+eBlocks[i][1];
      if (inBounds(nr,nc) && !board[br][bc] && board[nr][nc]?.side!==side) {
        const redSide = nr >= 5; // Elephant can't cross river
        if ((side==='red'&&redSide)||(side==='black'&&!redSide)) moves.push([nr,nc]);
      }
    });
  } else if (type === 'advisor') {
    const aZone = side==='red' ? {rMin:7,rMax:9,cMin:3,cMax:5} : {rMin:0,rMax:2,cMin:3,cMax:5};
    [[-1,-1],[-1,1],[1,-1],[1,1]].forEach(([dr,dc]) => {
      const nr=r+dr, nc=c+dc;
      if (nr>=aZone.rMin&&nr<=aZone.rMax&&nc>=aZone.cMin&&nc<=aZone.cMax&&board[nr][nc]?.side!==side) moves.push([nr,nc]);
    });
  } else if (type === 'king') {
    const kZone = side==='red' ? {rMin:7,rMax:9,cMin:3,cMax:5} : {rMin:0,rMax:2,cMin:3,cMax:5};
    [[-1,0],[1,0],[0,-1],[0,1]].forEach(([dr,dc]) => {
      const nr=r+dr, nc=c+dc;
      if (nr>=kZone.rMin&&nr<=kZone.rMax&&nc>=kZone.cMin&&nc<=kZone.cMax&&board[nr][nc]?.side!==side) moves.push([nr,nc]);
    });
  } else if (type === 'pawn') {
    if (side === 'red') {
      add(r-1, c); // always forward
      if (r <= 4) { add(r, c-1); add(r, c+1); } // past river can go sideways
    } else {
      add(r+1, c);
      if (r >= 5) { add(r, c-1); add(r, c+1); }
    }
  }
  return moves;
}

function xqIsInCheck(board, side) {
  // Find king
  let kr=-1, kc=-1;
  for (let r=0;r<10;r++) for (let c=0;c<9;c++) { if (board[r][c]?.type==='king'&&board[r][c]?.side===side){kr=r;kc=c;} }
  if (kr===-1) return true;
  const enemy = side==='red'?'black':'red';
  for (let r=0;r<10;r++) for (let c=0;c<9;c++) {
    if (board[r][c]?.side===enemy) {
      const ms = xqGetMoves(board, r, c);
      if (ms.some(([mr,mc])=>mr===kr&&mc===kc)) return true;
    }
  }
  return false;
}

function xqLegalMoves(board, r, c) {
  const piece = board[r][c];
  if (!piece) return [];
  const pseudo = xqGetMoves(board, r, c);
  return pseudo.filter(([nr,nc]) => {
    const copy = board.map(row => [...row]);
    copy[nr][nc] = copy[r][c]; copy[r][c] = null;
    return !xqIsInCheck(copy, piece.side);
  });
}

function xqAllLegalMoves(board, side) {
  const all = [];
  for (let r=0;r<10;r++) for (let c=0;c<9;c++) {
    if (board[r][c]?.side===side) {
      xqLegalMoves(board,r,c).forEach(([nr,nc]) => all.push({fromR:r,fromC:c,toR:nr,toC:nc}));
    }
  }
  return all;
}

function xqPieceValue(type) {
  return {king:10000,rook:900,cannon:450,horse:400,elephant:200,advisor:200,pawn:100}[type]||0;
}

function xqEval(board) {
  // Positive = good for black (AI), negative = good for red (player)
  let score = 0;
  for (let r=0;r<10;r++) for (let c=0;c<9;c++) {
    const p = board[r][c];
    if (p) score += (p.side==='black'?1:-1) * xqPieceValue(p.type);
  }
  return score;
}

function xqHeuristic(board, side) {
  // Simple: pick move that captures highest value or gives check
  const enemy = side==='red'?'black':'red';
  const moves = xqAllLegalMoves(board, side);
  if (!moves.length) return null;
  let best = null, bestScore = -Infinity;
  for (const m of moves) {
    const copy = board.map(r=>[...r]);
    const cap = copy[m.toR][m.toC];
    copy[m.toR][m.toC] = copy[m.fromR][m.fromC]; copy[m.fromR][m.fromC] = null;
    let score = cap ? xqPieceValue(cap.type) : 0;
    if (xqIsInCheck(copy, enemy)) score += 50;
    score += Math.random() * 20; // variety
    if (score > bestScore) { bestScore = score; best = m; }
  }
  return best || moves[Math.floor(Math.random()*moves.length)];
}

async function loadXiangqiPrefs() {
  const saved = await getSetting('xiangqiPrefs');
  if (saved) Object.assign(XIANGQI.prefs, saved);
  const cf = $i('xq-comment-freq');
  if (cf) cf.value = XIANGQI.prefs.commentFreq || 'normal';
  document.querySelectorAll('#xq-color-row .gmk-color-swatch').forEach(el => {
    el.classList.toggle('active', el.dataset.color === XIANGQI.prefs.boardColor);
  });
  document.querySelectorAll('#xiangqi-settings .gmk-diff-btn').forEach(el => {
    el.classList.toggle('active', el.dataset.diff === XIANGQI.prefs.difficulty);
  });
}
function setXiangqiDiff(diff, el) {
  XIANGQI.prefs.difficulty = diff;
  document.querySelectorAll('#xiangqi-settings .gmk-diff-btn').forEach(b => b.classList.remove('active'));
  if (el) el.classList.add('active');
  saveXiangqiPrefs();
}
async function saveXiangqiPrefs() { await saveSetting('xiangqiPrefs', XIANGQI.prefs); }

function setXiangqiBoard(color, el) {
  XIANGQI.prefs.boardColor = color;
  document.querySelectorAll('#xq-color-row .gmk-color-swatch').forEach(s=>s.classList.remove('active'));
  el.classList.add('active');
  const board = $i('xq-board');
  if (board) board.className = 'xq-board ' + (XQ_BOARD_COLORS[color]||'xq-board-classic');
  saveXiangqiPrefs();
}

function setXiangqiCommentFreq(val) { XIANGQI.prefs.commentFreq = val; saveXiangqiPrefs(); }

function toggleXiangqiSettings() {
  const panel = $i('xiangqi-settings');
  if (!panel) return;
  const show = panel.style.display === 'none';
  panel.style.display = show ? '' : 'none';
  if (show) { renderXiangqiAiSelector(); loadXiangqiPrefs(); }
}

function renderXiangqiAiSelector() {
  const el = $i('xq-ai-selector');
  if (!el) return;
  el.innerHTML = '';
  const contacts = Object.values(S._contacts);
  if (!contacts.length) { el.innerHTML = '<span style="font-size:12px;color:var(--text3)">还没有AI助手，先去添加～</span>'; return; }
  contacts.forEach(c => {
    const btn = document.createElement('button');
    btn.className = 'gmk-ai-btn' + (XIANGQI.contactId === c.id ? ' active' : '');
    const av = c.avatar?.startsWith('data:') ? `<img src="${c.avatar}" style="width:18px;height:18px;border-radius:50%;object-fit:cover">` : `<span>${c.avatar||'🤖'}</span>`;
    btn.innerHTML = `${av}<span>${esc(c.name)}</span>`;
    btn.onclick = () => { XIANGQI.contactId = c.id; renderXiangqiAiSelector(); updateXiangqiAiDisplay(); };
    el.appendChild(btn);
  });
}

function xqGetContact() {
  return (XIANGQI.contactId ? S._contacts[XIANGQI.contactId] : null)
    || (S.currentContact ? S._contacts[S.currentContact] : null)
    || Object.values(S._contacts)[0] || null;
}

function updateXiangqiAiDisplay() {
  const contact = xqGetContact();
  const aiName = contact?.name || 'AI';
  const el = $i('xq-ai-name');
  if (el) el.textContent = `${aiName}（黑方）`;
}

function initXiangqi() {
  XIANGQI.board = xqInitBoard();
  XIANGQI.turn = 'red';
  XIANGQI.over = false;
  XIANGQI.selected = null;
  XIANGQI.moves = [];
  XIANGQI.moveCount = 0;
  XIANGQI.startTime = Date.now();
  if (!XIANGQI.contactId) XIANGQI.contactId = S.currentContact || Object.keys(S._contacts)[0] || null;
  loadXiangqiPrefs().then(() => {
    const board = $i('xq-board');
    if (board) board.className = 'xq-board ' + (XQ_BOARD_COLORS[XIANGQI.prefs.boardColor]||'xq-board-classic');
  });
  updateXiangqiAiDisplay();
  renderXiangqiBoard();
  xqSetStatus('你先行棋（红方）！');
  const contact = xqGetContact();
  const aiName = contact?.name || 'AI';
  xqSay(contact ? `你好！我是${aiName}，我们来下象棋吧！` : '游戏开始！先去设置选个AI助手一起玩～');
  const panel = $i('xiangqi-settings');
  if (panel) panel.style.display = 'none';
}

function renderXiangqiBoard() {
  const el = $i('xq-board');
  if (!el) return;
  el.innerHTML = '';
  el.className = 'xq-board ' + (XQ_BOARD_COLORS[XIANGQI.prefs.boardColor]||'xq-board-classic');
  const movableSet = new Set(XIANGQI.moves.map(([r,c])=>r+','+c));
  for (let r=0;r<10;r++) {
    for (let c=0;c<9;c++) {
      const cell = document.createElement('div');
      cell.className = 'xq-cell';
      const piece = XIANGQI.board[r][c];
      const isSelected = XIANGQI.selected && XIANGQI.selected.r===r && XIANGQI.selected.c===c;
      const isMovable = movableSet.has(r+','+c);
      if (isSelected) cell.classList.add('selected');
      if (isMovable) cell.classList.add('movable');
      if (piece) {
        cell.classList.add('has-piece');
        const pd = document.createElement('div');
        pd.className = `xq-piece ${piece.side}`;
        pd.textContent = XQ_NAMES[piece.type]?.[piece.side] || '?';
        cell.appendChild(pd);
      }
      cell.addEventListener('click', () => xqCellClick(r, c));
      el.appendChild(cell);
    }
  }
}

function xqCellClick(r, c) {
  if (XIANGQI.over || XIANGQI.turn !== 'red') return;
  const piece = XIANGQI.board[r][c];
  // If a piece is already selected and this is a valid move target
  if (XIANGQI.selected && XIANGQI.moves.some(([mr,mc])=>mr===r&&mc===c)) {
    xqPlayerMove(XIANGQI.selected.r, XIANGQI.selected.c, r, c);
    return;
  }
  // Select a red piece
  if (piece && piece.side === 'red') {
    XIANGQI.selected = {r, c};
    XIANGQI.moves = xqLegalMoves(XIANGQI.board, r, c);
    renderXiangqiBoard();
    const infoEl = $i('xq-selected-info');
    if (infoEl) infoEl.textContent = `已选: ${XQ_NAMES[piece.type]?.red||'?'} (${XIANGQI.moves.length}个可落位)`;
    return;
  }
  // Deselect
  XIANGQI.selected = null; XIANGQI.moves = [];
  renderXiangqiBoard();
  const infoEl = $i('xq-selected-info'); if (infoEl) infoEl.textContent = '';
}

async function xqPlayerMove(fr, fc, tr, tc) {
  XIANGQI.board[tr][tc] = XIANGQI.board[fr][fc];
  XIANGQI.board[fr][fc] = null;
  XIANGQI.selected = null; XIANGQI.moves = [];
  XIANGQI.moveCount++;
  XIANGQI.turn = 'black';
  const infoEl = $i('xq-selected-info'); if (infoEl) infoEl.textContent = '';
  renderXiangqiBoard();

  // Check if black king is captured or in checkmate
  const blackKing = XIANGQI.board.flat().some(p=>p?.type==='king'&&p?.side==='black');
  if (!blackKing || !xqAllLegalMoves(XIANGQI.board,'black').length) {
    XIANGQI.over = true;
    xqSetStatus('🎉 你赢了！');
    await xqFinish('player_win');
    return;
  }
  if (xqIsInCheck(XIANGQI.board, 'black')) xqSay('将！');
  xqSetStatus('AI思考中…');
  await new Promise(r=>setTimeout(r, 400));
  await xqAiMove();
}

async function xqAiMove() {
  const contact = xqGetContact();
  const useKey = contact?.apiKey || S.settings.apiKey;
  const phase = XIANGQI.moveCount <= 10 ? 'early' : XIANGQI.moveCount <= 30 ? 'mid' : 'late';
  let move = null, comment = '';

  if (useKey) {
    try {
      const piecesStr = [];
      for (let r=0;r<10;r++) for (let c=0;c<9;c++) {
        const p = XIANGQI.board[r][c];
        if (p) piecesStr.push(`${p.side==='red'?'红':'黑'}${XQ_NAMES[p.type][p.side]}(${r},${c})`);
      }
      const aiName = contact?.name||'AI', personality=(contact?.system||'').slice(0,120);
      const model = contact?.model||'openai/gpt-4o-mini';
      const legalMoves = xqAllLegalMoves(XIANGQI.board,'black');
      const movesStr = legalMoves.slice(0,20).map(m=>`(${m.fromR},${m.fromC})→(${m.toR},${m.toC})`).join(' ');
      const prompt = `你是${aiName}，和用户下中国象棋。你执黑方，用户执红方。棋盘10行9列，行0-9，列0-8，黑方从第0行开始。\n当前棋子：${piecesStr.join(' ')}\n合法移动（前20个）：${movesStr}\n性格：${personality||'聪明好胜'}\n阶段：第${XIANGQI.moveCount}手，${phase}局。\n根据性格灵活决策：温柔型可能偶尔让步，强势型全力争胜。\n从合法移动中选一步，用1句话回应。只返回JSON：{"fromR":数字,"fromC":数字,"toR":数字,"toC":数字,"comment":"话"}`;
      const res = await fetch(contact?.apiUrl||'https://openrouter.ai/api/v1/chat/completions',{method:'POST',headers:{'Authorization':`Bearer ${useKey}`,'Content-Type':'application/json','HTTP-Referer':'https://raimos.app','X-Title':'Raimos'},body:JSON.stringify({model,max_tokens:100,stream:false,temperature:0.7,messages:[{role:'user',content:prompt}]})});
      const data=await res.json();XIANGQI._lastUsage = data.usage || null;const txt=data.choices?.[0]?.message?.content||'';const m=txt.match(/\{[\s\S]*?\}/);
      if (m) { const p=JSON.parse(m[0]); const lm=xqAllLegalMoves(XIANGQI.board,'black'); if(lm.some(mv=>mv.fromR===p.fromR&&mv.fromC===p.fromC&&mv.toR===p.toR&&mv.toC===p.toC)){move=p;comment=p.comment;} }
    } catch(e){}
  }

  if (!move) {
    move = xqHeuristic(XIANGQI.board, 'black');
    if (!comment) comment = xqIsInCheck(XIANGQI.board,'red') ? '将！你的王被威胁了～' : '让我想想…就这里！';
  }
  if (!move) { XIANGQI.over=true; xqSetStatus('你赢了！AI无路可走～'); await xqFinish('player_win'); return; }

  XIANGQI.board[move.toR][move.toC] = XIANGQI.board[move.fromR][move.fromC];
  XIANGQI.board[move.fromR][move.fromC] = null;
  XIANGQI.moveCount++;
  XIANGQI.turn = 'red';
  renderXiangqiBoard();
  const freq = XIANGQI.prefs.commentFreq || 'normal';
  const shouldComment = freq === 'off' ? false : freq === 'high' ? true : freq === 'low' ? XIANGQI.moveCount % 5 === 0 : XIANGQI.moveCount % 3 === 0;
  if (comment && shouldComment) xqSay(comment);

  const redKing = XIANGQI.board.flat().some(p=>p?.type==='king'&&p?.side==='red');
  if (!redKing || !xqAllLegalMoves(XIANGQI.board,'red').length) {
    XIANGQI.over=true; xqSetStatus('AI赢了！再来一局？'); await xqFinish('ai_win'); return;
  }
  if (xqIsInCheck(XIANGQI.board,'red')) { xqSetStatus('⚠️ 你被将军了！'); } else { xqSetStatus('轮到你了！'); }
}

function xqSetStatus(msg) { const el=$i('xq-status'); if(el)el.textContent=msg; }
function xqSay(text) {
  const el=$i('xq-comment'); if(!el||!text)return;
  el.textContent=text; el.style.opacity='1';
  showGameTokenBadge('xq-token-badge', XIANGQI._lastUsage || null);
  XIANGQI._lastUsage = null;
  clearTimeout(el._t);
  el._t=setTimeout(()=>{if(el)el.style.opacity='0';},5500);
}

async function xqFinish(result) {
  const contact = xqGetContact();
  const elapsed = Math.round((Date.now()-XIANGQI.startTime)/1000);
  await saveXiangqiRecord({result, moves:XIANGQI.moveCount, elapsed, aiName:contact?.name||'AI', aiContactId:XIANGQI.contactId, date:Date.now()});
  let aiComment='';
  const useKey=contact?.apiKey||S.settings.apiKey;
  if (useKey) {
    try {
      const aiName=contact?.name||'AI', personality=(contact?.system||'').slice(0,100);
      const resultDesc=result==='player_win'?'你输了':result==='ai_win'?'你赢了':'平局';
      const prompt=`你是${aiName}，性格：${personality||'聪明好胜'}。象棋结束，${resultDesc}。用1句符合性格的话回应。只返回JSON：{"comment":"话"}`;
      const res=await fetch(contact?.apiUrl||'https://openrouter.ai/api/v1/chat/completions',{method:'POST',headers:{'Authorization':`Bearer ${useKey}`,'Content-Type':'application/json','HTTP-Referer':'https://raimos.app','X-Title':'Raimos'},body:JSON.stringify({model:contact?.model||'openai/gpt-4o-mini',max_tokens:60,stream:false,messages:[{role:'user',content:prompt}]})});
      const data=await res.json();XIANGQI._lastUsage = data.usage || null;const txt=data.choices?.[0]?.message?.content||'';const m=txt.match(/\{[\s\S]*?\}/);
      if(m)aiComment=JSON.parse(m[0]).comment||'';
    } catch(e){}
  }
  if(!aiComment)aiComment=result==='player_win'?'你真厉害！再来一局吧～':result==='ai_win'?'哈哈我赢了！再来？':'旗鼓相当～';
  xqSay(aiComment);
  setTimeout(()=>showXiangqiResult(result,elapsed,aiComment,contact),800);
}

function showXiangqiResult(result, elapsed, aiComment, contact) {
  const overlay=$i('xiangqi-result-overlay'); if(!overlay)return;
  overlay.classList.add('show');
  const titles={player_win:'🎉 你赢了！',ai_win:'💫 AI赢了！',draw:'🤝 平局！'};
  const titleEl=$i('xq-result-title'); if(titleEl){titleEl.textContent=titles[result]||'游戏结束';titleEl.className=`gmk-result-title ${result==='player_win'?'win':result==='draw'?'draw':''}`;}
  const badges={player_win:['🏆','💔'],ai_win:['💔','🏆'],draw:['🤝','🤝']};
  const [pb,ab]=badges[result]||['',''];
  const pbEl=$i('xq-result-player-badge'),abEl=$i('xq-result-ai-badge');
  if(pbEl)pbEl.textContent=pb; if(abEl)abEl.textContent=ab;
  const userAv=S.settings.userAvatar||S.settings.avatar||'😊';
  const pAvEl=$i('xq-result-player-av');
  if(pAvEl){if(userAv.startsWith('data:'))pAvEl.innerHTML=`<img src="${userAv}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;else pAvEl.textContent=userAv;}
  const aiAv=contact?.avatar||'🤖';
  const aAvEl=$i('xq-result-ai-av');
  if(aAvEl){if(aiAv.startsWith('data:'))aAvEl.innerHTML=`<img src="${aiAv}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;else aAvEl.textContent=aiAv;}
  const aiNameEl=$i('xq-result-ai-name'); if(aiNameEl)aiNameEl.textContent=contact?.name||'AI';
  const mm=Math.floor(elapsed/60),ss=elapsed%60;
  const statsEl=$i('xq-result-stats');
  if(statsEl)statsEl.textContent=`本局用时 ${mm>0?mm+'分':''}${ss}秒  ·  共走 ${XIANGQI.moveCount} 步\n"${aiComment}"`;
  const catEl=$i('xq-result-cat');
  if(catEl){catEl.innerHTML=result==='player_win'?gomokuWinCatSVG():result==='ai_win'?gomokuLoseCatSVG():'<div style="font-size:60px;animation:cat-bounce .8s ease-in-out infinite">🐱</div>';}
  const confEl=$i('xq-confetti');
  if(confEl){confEl.innerHTML='';if(result==='player_win'){const cols=['#ff8fab','#a78bfa','#fcd34d','#6ee7b7','#67e8f9','#f472b6','#fb923c'];for(let i=0;i<36;i++){const el=document.createElement('div');el.className='gmk-confetti-piece';const sz=6+Math.random()*7;el.style.cssText=`left:${Math.random()*100}%;width:${sz}px;height:${sz}px;background:${cols[i%cols.length]};border-radius:${Math.random()>.5?'50%':'3px'};animation:confetti-fall ${1.2+Math.random()*0.8}s ease-in ${Math.random()*0.5}s forwards`;confEl.appendChild(el);}}}
}
function closeXiangqiResult(){closeModal('xiangqi-result-overlay');}

async function saveXiangqiRecord(rec){let records=(await getSetting('xiangqiRecords'))||[];records.unshift({...rec,id:uid()});if(records.length>60)records=records.slice(0,60);await saveSetting('xiangqiRecords',records);}
async function openXiangqiRecords(){
  const records=(await getSetting('xiangqiRecords'))||[];
  const overlay=$i('xiangqi-records-modal');if(!overlay)return;overlay.classList.add('show');
  const wins=records.filter(r=>r.result==='player_win').length,losses=records.filter(r=>r.result==='ai_win').length,draws=records.filter(r=>r.result==='draw').length;
  const sumEl=$i('xq-records-summary');if(sumEl)sumEl.innerHTML=`<div style="flex:1"><div style="font-size:22px;font-weight:900;color:#4ade80">${wins}</div><div style="font-size:11px;color:var(--text3)">胜</div></div><div style="flex:1"><div style="font-size:22px;font-weight:900;color:#f87171">${losses}</div><div style="font-size:11px;color:var(--text3)">负</div></div><div style="flex:1"><div style="font-size:22px;font-weight:900;color:var(--text2)">${draws}</div><div style="font-size:11px;color:var(--text3)">平</div></div><div style="flex:1"><div style="font-size:22px;font-weight:900;color:var(--accent)">${records.length}</div><div style="font-size:11px;color:var(--text3)">总局</div></div>`;
  const listEl=$i('xq-records-list');if(!listEl)return;
  if(!records.length){listEl.innerHTML='<div style="text-align:center;padding:30px;color:var(--text3);font-size:13px">还没有对战记录，快去下一局吧！</div>';return;}
  listEl.innerHTML='';
  records.forEach(r=>{const icons={player_win:'🏆',ai_win:'💔',draw:'🤝'};const labels={player_win:'胜利',ai_win:'败北',draw:'平局'};const mm=Math.floor((r.elapsed||0)/60),ss=(r.elapsed||0)%60;const date=r.date?new Date(r.date).toLocaleDateString('zh-CN',{month:'numeric',day:'numeric'}):'';const el=document.createElement('div');el.className='gmk-record-item';el.innerHTML=`<div class="gmk-record-result">${icons[r.result]||'🎮'}</div><div class="gmk-record-info"><div style="font-weight:700;color:var(--text)">${labels[r.result]||'未知'} · vs ${esc(r.aiName||'AI')}</div><div class="gmk-record-meta">${date} · ${mm>0?mm+'分':''}${ss}秒 · ${r.moves||0}步</div></div>`;listEl.appendChild(el);});
}
async function clearXiangqiRecords(){if(!confirm('确认清空所有象棋战绩？'))return;await saveSetting('xiangqiRecords',[]);openXiangqiRecords();}
async function xiangqiShareToMoments(){
  const records=(await getSetting('xiangqiRecords'))||[];const last=records[0];const contact=xqGetContact();const aiName=contact?.name||'AI';
  const labels={player_win:'赢了🏆',ai_win:'输了💔',draw:'平局🤝'};
  const mm=Math.floor((last?.elapsed||0)/60),ss=(last?.elapsed||0)%60;
  const text=last?`刚刚和 ${aiName} 下了一局象棋，${labels[last.result]||'结束'}！共走了 ${last.moves} 步，用时 ${mm>0?mm+'分':''}${ss}秒～ #象棋 #和AI下棋`:`和 ${aiName} 下了一局象棋，好好玩！ #象棋 #和AI下棋`;
  closeXiangqiResult();switchPage('moments-page');await new Promise(r=>setTimeout(r,200));
  const ta=$i('compose-text');if(ta){ta.value=text;ta.dispatchEvent(new Event('input'));}
  const modal=$i('compose-moment-modal');if(modal&&window.innerWidth<=768){const taM=modal.querySelector('textarea');if(taM)taM.value=text;openModal('compose-moment-modal');}
  toast('已跳转到朋友圈，发送即可～');
}

// ══ International Chess (国际象棋) ══════════════════════

const IC_PIECES = {
  // white pieces (player), black pieces (AI)
  wK:'♔', wQ:'♕', wR:'♖', wB:'♗', wN:'♘', wP:'♙',
  bK:'♚', bQ:'♛', bR:'♜', bB:'♝', bN:'♞', bP:'♟',
};

const INTCHESS = {
  board: null,  // 8x8, null or string like 'wK','bP' etc.
  turn: 'w',   // 'w' = player (white), 'b' = AI (black)
  over: false,
  selected: null,
  moves: [],
  moveCount: 0,
  startTime: 0,
  contactId: null,
  prefs: { boardColor:'classic', commentFreq:'normal', difficulty:'normal' },
  enPassant: null,  // square pawn can capture en passant
  castling: { wK:true, wQR:true, bK:true, bQR:true }, // can castle flags
};

const IC_BOARD_COLORS = { classic:'ic-board-classic', pink:'ic-board-pink', purple:'ic-board-purple', green:'ic-board-green', blue:'ic-board-blue' };

function icInitBoard() {
  const b = Array.from({length:8}, ()=>Array(8).fill(null));
  // Black pieces (rows 0-1)
  const backRow = ['bR','bN','bB','bQ','bK','bB','bN','bR'];
  backRow.forEach((p,c)=>b[0][c]=p);
  for(let c=0;c<8;c++) b[1][c]='bP';
  // White pieces (rows 6-7)
  for(let c=0;c<8;c++) b[6][c]='wP';
  const whiteBack = ['wR','wN','wB','wQ','wK','wB','wN','wR'];
  whiteBack.forEach((p,c)=>b[7][c]=p);
  return b;
}

function icSide(piece) { return piece ? piece[0] : null; }
function icType(piece) { return piece ? piece[1] : null; }

function icGetMoves(board, r, c, enPassant, castling) {
  const piece = board[r][c];
  if (!piece) return [];
  const side = icSide(piece), type = icType(piece);
  const enemy = side==='w'?'b':'w';
  const moves = [];
  function inB(r,c){return r>=0&&r<8&&c>=0&&c<8;}
  function canTo(r,c){return inB(r,c)&&icSide(board[r][c])!==side;}
  function addSlide(dr,dc){for(let i=1;i<8;i++){const nr=r+dr*i,nc=c+dc*i;if(!inB(nr,nc))break;if(board[nr][nc]){if(icSide(board[nr][nc])!==side)moves.push([nr,nc]);break;}moves.push([nr,nc]);}}

  if (type==='R') { addSlide(-1,0);addSlide(1,0);addSlide(0,-1);addSlide(0,1); }
  else if (type==='B') { addSlide(-1,-1);addSlide(-1,1);addSlide(1,-1);addSlide(1,1); }
  else if (type==='Q') { addSlide(-1,0);addSlide(1,0);addSlide(0,-1);addSlide(0,1);addSlide(-1,-1);addSlide(-1,1);addSlide(1,-1);addSlide(1,1); }
  else if (type==='N') { [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]].forEach(([dr,dc])=>{if(canTo(r+dr,c+dc))moves.push([r+dr,c+dc]);}); }
  else if (type==='K') {
    [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]].forEach(([dr,dc])=>{if(canTo(r+dr,c+dc))moves.push([r+dr,c+dc]);});
    // Castling
    if (side==='w'&&r===7&&c===4) {
      if (castling?.wK&&!board[7][5]&&!board[7][6]&&board[7][7]==='wR') moves.push([7,6,'castle']);
      if (castling?.wQR&&!board[7][3]&&!board[7][2]&&!board[7][1]&&board[7][0]==='wR') moves.push([7,2,'castle']);
    }
    if (side==='b'&&r===0&&c===4) {
      if (castling?.bK&&!board[0][5]&&!board[0][6]&&board[0][7]==='bR') moves.push([0,6,'castle']);
      if (castling?.bQR&&!board[0][3]&&!board[0][2]&&!board[0][1]&&board[0][0]==='bR') moves.push([0,2,'castle']);
    }
  }
  else if (type==='P') {
    const dir = side==='w'?-1:1;
    const startRow = side==='w'?6:1;
    if (inB(r+dir,c)&&!board[r+dir][c]) {
      moves.push([r+dir,c]);
      if (r===startRow&&!board[r+dir*2][c]) moves.push([r+dir*2,c]);
    }
    [-1,1].forEach(dc=>{
      if (inB(r+dir,c+dc)) {
        if (icSide(board[r+dir][c+dc])===enemy) moves.push([r+dir,c+dc]);
        if (enPassant&&enPassant[0]===r+dir&&enPassant[1]===c+dc) moves.push([r+dir,c+dc,'ep']);
      }
    });
  }
  return moves;
}

function icIsInCheck(board, side) {
  let kr=-1,kc=-1;
  for(let r=0;r<8;r++) for(let c=0;c<8;c++) { if(board[r][c]===side+'K'){kr=r;kc=c;} }
  if(kr===-1)return true;
  const enemy=side==='w'?'b':'w';
  for(let r=0;r<8;r++) for(let c=0;c<8;c++) {
    if(icSide(board[r][c])===enemy) {
      const ms=icGetMoves(board,r,c,null,null);
      if(ms.some(([mr,mc])=>mr===kr&&mc===kc))return true;
    }
  }
  return false;
}

function icLegalMoves(board, r, c, enPassant, castling) {
  const piece = board[r][c]; if(!piece)return[];
  const pseudo = icGetMoves(board,r,c,enPassant,castling);
  return pseudo.filter(([nr,nc,flag]) => {
    const copy = board.map(row=>[...row]);
    if (flag==='castle') {
      const side=icSide(piece);
      if(nc===6){copy[r][5]=copy[r][7];copy[r][7]=null;}else{copy[r][3]=copy[r][0];copy[r][0]=null;}
    }
    if (flag==='ep') { copy[r][nc]=null; }
    copy[nr][nc]=copy[r][c]; copy[r][c]=null;
    return !icIsInCheck(copy,icSide(piece));
  });
}

function icAllLegalMoves(board, side, enPassant, castling) {
  const all=[];
  for(let r=0;r<8;r++) for(let c=0;c<8;c++) {
    if(icSide(board[r][c])===side) {
      icLegalMoves(board,r,c,enPassant,castling).forEach(([nr,nc,flag])=>all.push({fromR:r,fromC:c,toR:nr,toC:nc,flag}));
    }
  }
  return all;
}

function icPieceScore(type) {
  return {K:20000,Q:900,R:500,B:330,N:320,P:100}[type]||0;
}

function icEval(board) {
  let score=0;
  for(let r=0;r<8;r++) for(let c=0;c<8;c++) {
    const p=board[r][c];
    if(p) score+=(icSide(p)==='b'?1:-1)*icPieceScore(icType(p));
  }
  return score;
}

function icHeuristic(board, side, enPassant, castling) {
  const moves=icAllLegalMoves(board,side,enPassant,castling);
  if(!moves.length)return null;
  let best=null,bestScore=-Infinity;
  const enemy=side==='w'?'b':'w';
  for(const m of moves) {
    const copy=board.map(r=>[...r]);
    const cap=copy[m.toR][m.toC];
    if(m.flag==='castle'){if(m.toC===6){copy[m.fromR][5]=copy[m.fromR][7];copy[m.fromR][7]=null;}else{copy[m.fromR][3]=copy[m.fromR][0];copy[m.fromR][0]=null;}}
    if(m.flag==='ep')copy[m.fromR][m.toC]=null;
    copy[m.toR][m.toC]=copy[m.fromR][m.fromC]; copy[m.fromR][m.fromC]=null;
    // Pawn promotion
    if(icType(copy[m.toR][m.toC])==='P'&&(m.toR===0||m.toR===7)) copy[m.toR][m.toC]=side+'Q';
    let score=cap?icPieceScore(icType(cap)):0;
    if(icIsInCheck(copy,enemy))score+=50;
    score-=icIsInCheck(copy,side)?200:0;
    score+=Math.random()*15;
    if(score>bestScore){bestScore=score;best=m;}
  }
  return best||moves[Math.floor(Math.random()*moves.length)];
}

async function loadIntChessPrefs() {
  const saved=await getSetting('intChessPrefs');if(saved)Object.assign(INTCHESS.prefs,saved);
  const cf=$i('ic-comment-freq');if(cf)cf.value=INTCHESS.prefs.commentFreq||'normal';
  document.querySelectorAll('#ic-color-row .ic-color-swatch').forEach(el=>el.classList.toggle('active',el.dataset.color===INTCHESS.prefs.boardColor));
  document.querySelectorAll('#intchess-settings .gmk-diff-btn').forEach(el=>el.classList.toggle('active',el.dataset.diff===INTCHESS.prefs.difficulty));
}
async function saveIntChessPrefs(){await saveSetting('intChessPrefs',INTCHESS.prefs);}
function setIntChessDiff(diff,el){
  INTCHESS.prefs.difficulty=diff;
  document.querySelectorAll('#intchess-settings .gmk-diff-btn').forEach(b=>b.classList.remove('active'));
  if(el)el.classList.add('active');
  saveIntChessPrefs();
}
function setIntChessColor(color,el){
  INTCHESS.prefs.boardColor=color;
  document.querySelectorAll('#ic-color-row .ic-color-swatch').forEach(s=>s.classList.remove('active'));
  if(el)el.classList.add('active');
  const board=$i('ic-board');if(board)board.className='ic-board '+(IC_BOARD_COLORS[color]||'ic-board-classic');
  saveIntChessPrefs();
}
function setIntChessBoard(color,el){
  INTCHESS.prefs.boardColor=color;
  document.querySelectorAll('#ic-color-row .gmk-color-swatch').forEach(s=>s.classList.remove('active'));el.classList.add('active');
  const board=$i('ic-board');if(board)board.className='ic-board '+(IC_BOARD_COLORS[color]||'ic-board-classic');
  saveIntChessPrefs();
}
function setIntChessCommentFreq(val){INTCHESS.prefs.commentFreq=val;saveIntChessPrefs();}
function toggleIntChessSettings(){
  const panel=$i('intchess-settings');if(!panel)return;
  const show=panel.style.display==='none';panel.style.display=show?'':'none';
  if(show){renderIntChessAiSelector();loadIntChessPrefs();}
}
function renderIntChessAiSelector(){
  const el=$i('ic-ai-selector');if(!el)return;el.innerHTML='';
  const contacts=Object.values(S._contacts);
  if(!contacts.length){el.innerHTML='<span style="font-size:12px;color:var(--text3)">还没有AI助手，先去添加～</span>';return;}
  contacts.forEach(c=>{
    const btn=document.createElement('button');btn.className='gmk-ai-btn'+(INTCHESS.contactId===c.id?' active':'');
    const av=c.avatar?.startsWith('data:')?`<img src="${c.avatar}" style="width:18px;height:18px;border-radius:50%;object-fit:cover">`:`<span>${c.avatar||'🤖'}</span>`;
    btn.innerHTML=`${av}<span>${esc(c.name)}</span>`;
    btn.onclick=()=>{INTCHESS.contactId=c.id;renderIntChessAiSelector();updateIntChessAiDisplay();};
    el.appendChild(btn);
  });
}
function icGetContact(){return(INTCHESS.contactId?S._contacts[INTCHESS.contactId]:null)||(S.currentContact?S._contacts[S.currentContact]:null)||Object.values(S._contacts)[0]||null;}
function updateIntChessAiDisplay(){const contact=icGetContact();const el=$i('ic-ai-name');if(el)el.textContent=`${contact?.name||'AI'}（黑方）`;}

function initIntChess(){
  INTCHESS.board=icInitBoard();INTCHESS.turn='w';INTCHESS.over=false;INTCHESS.selected=null;INTCHESS.moves=[];INTCHESS.moveCount=0;INTCHESS.startTime=Date.now();INTCHESS.enPassant=null;INTCHESS.castling={wK:true,wQR:true,bK:true,bQR:true};
  if(!INTCHESS.contactId)INTCHESS.contactId=S.currentContact||Object.keys(S._contacts)[0]||null;
  loadIntChessPrefs().then(()=>{const board=$i('ic-board');if(board)board.className='ic-board '+(IC_BOARD_COLORS[INTCHESS.prefs.boardColor]||'ic-board-classic');});
  updateIntChessAiDisplay();renderIntChessBoard();
  icSetStatus('你先行棋（白方）！');
  const contact=icGetContact();const aiName=contact?.name||'AI';
  icSay(contact?`你好！我是${aiName}，来下国际象棋吧！`:'游戏开始！先去设置选个AI助手一起玩～');
  const panel=$i('intchess-settings');if(panel)panel.style.display='none';
}

function renderIntChessBoard(){
  const el=$i('ic-board');if(!el)return;el.innerHTML='';
  el.className='ic-board '+(IC_BOARD_COLORS[INTCHESS.prefs.boardColor]||'ic-board-classic');
  const movableSet=new Set(INTCHESS.moves.map(([r,c])=>r+','+c));
  for(let r=0;r<8;r++) for(let c=0;c<8;c++) {
    const cell=document.createElement('div');
    const isLight=(r+c)%2===0;
    cell.className='ic-cell '+(isLight?'light':'dark');
    const piece=INTCHESS.board[r][c];
    const isSelected=INTCHESS.selected&&INTCHESS.selected.r===r&&INTCHESS.selected.c===c;
    const isMovable=movableSet.has(r+','+c);
    if(isSelected)cell.classList.add('selected');
    if(isMovable){cell.classList.add('movable');if(piece&&icSide(piece)!==INTCHESS.turn)cell.classList.add('has-enemy');}
    if(piece){
      const pd=document.createElement('span');pd.className='ic-piece';pd.textContent=IC_PIECES[piece]||piece;
      cell.appendChild(pd);
    }
    cell.addEventListener('click',()=>icCellClick(r,c));
    el.appendChild(cell);
  }
}

function icCellClick(r,c){
  if(INTCHESS.over||INTCHESS.turn!=='w')return;
  const piece=INTCHESS.board[r][c];
  if(INTCHESS.selected&&INTCHESS.moves.some(([mr,mc])=>mr===r&&mc===c)){
    const flag=icLegalMoves(INTCHESS.board,INTCHESS.selected.r,INTCHESS.selected.c,INTCHESS.enPassant,INTCHESS.castling).find(([mr,mc])=>mr===r&&mc===c)?.[2];
    icPlayerMove(INTCHESS.selected.r,INTCHESS.selected.c,r,c,flag);return;
  }
  if(piece&&icSide(piece)==='w'){
    INTCHESS.selected={r,c};
    INTCHESS.moves=icLegalMoves(INTCHESS.board,r,c,INTCHESS.enPassant,INTCHESS.castling).map(([mr,mc])=>[mr,mc]);
    renderIntChessBoard();
    const infoEl=$i('ic-selected-info');if(infoEl)infoEl.textContent=`已选: ${IC_PIECES[piece]||piece} (${INTCHESS.moves.length}个可落位)`;return;
  }
  INTCHESS.selected=null;INTCHESS.moves=[];renderIntChessBoard();
  const infoEl=$i('ic-selected-info');if(infoEl)infoEl.textContent='';
}

async function icPlayerMove(fr,fc,tr,tc,flag){
  const movingPiece=INTCHESS.board[fr][fc];
  if(flag==='castle'){if(tc===6){INTCHESS.board[fr][5]=INTCHESS.board[fr][7];INTCHESS.board[fr][7]=null;}else{INTCHESS.board[fr][3]=INTCHESS.board[fr][0];INTCHESS.board[fr][0]=null;}}
  if(flag==='ep')INTCHESS.board[fr][tc]=null;
  // Update en passant
  INTCHESS.enPassant=null;
  if(icType(movingPiece)==='P'&&Math.abs(tr-fr)===2) INTCHESS.enPassant=[(fr+tr)/2,tc];
  // Update castling rights
  if(movingPiece==='wK'){INTCHESS.castling.wK=false;INTCHESS.castling.wQR=false;}
  if(movingPiece==='wR'&&fr===7&&fc===0)INTCHESS.castling.wQR=false;
  if(movingPiece==='wR'&&fr===7&&fc===7)INTCHESS.castling.wK=false;
  INTCHESS.board[tr][tc]=movingPiece; INTCHESS.board[fr][fc]=null;
  // Promotion
  if(icType(INTCHESS.board[tr][tc])==='P'&&tr===0) INTCHESS.board[tr][tc]='wQ';
  INTCHESS.selected=null;INTCHESS.moves=[];INTCHESS.moveCount++;INTCHESS.turn='b';
  const infoEl=$i('ic-selected-info');if(infoEl)infoEl.textContent='';
  renderIntChessBoard();
  const allBMoves=icAllLegalMoves(INTCHESS.board,'b',INTCHESS.enPassant,INTCHESS.castling);
  if(!allBMoves.length){INTCHESS.over=true;if(icIsInCheck(INTCHESS.board,'b')){icSetStatus('将死！🎉 你赢了！');await icFinish('player_win');}else{icSetStatus('逼和！平局～');await icFinish('draw');}return;}
  if(icIsInCheck(INTCHESS.board,'b'))icSay('将！');
  icSetStatus('AI思考中…');
  await new Promise(r=>setTimeout(r,500));
  await icAiMove();
}

async function icAiMove(){
  const contact=icGetContact();const useKey=contact?.apiKey||S.settings.apiKey;
  const phase=INTCHESS.moveCount<=8?'开局':INTCHESS.moveCount<=25?'中局':'残局';
  let move=null,comment='';
  if(useKey){
    try{
      const boardStr=[];for(let r=0;r<8;r++)for(let c=0;c<8;c++){const p=INTCHESS.board[r][c];if(p)boardStr.push(`${IC_PIECES[p]}(${r},${c})`);}
      const legalMoves=icAllLegalMoves(INTCHESS.board,'b',INTCHESS.enPassant,INTCHESS.castling);
      const movesStr=legalMoves.slice(0,15).map(m=>`(${m.fromR},${m.fromC})→(${m.toR},${m.toC})`).join(' ');
      const aiName=contact?.name||'AI',personality=(contact?.system||'').slice(0,120),model=contact?.model||'openai/gpt-4o-mini';
      const prompt=`你是${aiName}，和用户下国际象棋。你执黑方，用户执白方。棋盘8×8，行0-7（0为黑方底），列0-7。\n当前棋子：${boardStr.join(' ')}\n合法移动（前15个）：${movesStr}\n性格：${personality||'聪明好胜'}\n阶段：第${INTCHESS.moveCount}步，${phase}。\n根据性格灵活决策：温柔型可能偶尔让步，强势型全力争胜。\n从合法移动中选一步，用1句话回应。只返回JSON：{"fromR":数字,"fromC":数字,"toR":数字,"toC":数字,"comment":"话"}`;
      const res=await fetch(contact?.apiUrl||'https://openrouter.ai/api/v1/chat/completions',{method:'POST',headers:{'Authorization':`Bearer ${useKey}`,'Content-Type':'application/json','HTTP-Referer':'https://raimos.app','X-Title':'Raimos'},body:JSON.stringify({model,max_tokens:100,stream:false,temperature:0.7,messages:[{role:'user',content:prompt}]})});
      const data=await res.json();INTCHESS._lastUsage=data.usage||null;const txt=data.choices?.[0]?.message?.content||'';const m=txt.match(/\{[\s\S]*?\}/);
      if(m){const p=JSON.parse(m[0]);const lm=icAllLegalMoves(INTCHESS.board,'b',INTCHESS.enPassant,INTCHESS.castling);if(lm.some(mv=>mv.fromR===p.fromR&&mv.fromC===p.fromC&&mv.toR===p.toR&&mv.toC===p.toC)){move=p;comment=p.comment;}}
    }catch(e){}
  }
  if(!move){move=icHeuristic(INTCHESS.board,'b',INTCHESS.enPassant,INTCHESS.castling);if(!comment)comment=icIsInCheck(INTCHESS.board,'w')?'将军！小心哦～':'让我想想……就这里！';}
  if(!move){INTCHESS.over=true;icSetStatus('你赢了！AI无路可走～');await icFinish('player_win');return;}

  const movingPiece=INTCHESS.board[move.fromR][move.fromC];
  if(move.flag==='castle'){if(move.toC===6){INTCHESS.board[0][5]=INTCHESS.board[0][7];INTCHESS.board[0][7]=null;}else{INTCHESS.board[0][3]=INTCHESS.board[0][0];INTCHESS.board[0][0]=null;}}
  if(move.flag==='ep')INTCHESS.board[move.fromR][move.toC]=null;
  INTCHESS.enPassant=null;
  if(icType(movingPiece)==='P'&&Math.abs(move.toR-move.fromR)===2)INTCHESS.enPassant=[(move.fromR+move.toR)/2,move.toC];
  if(movingPiece==='bK'){INTCHESS.castling.bK=false;INTCHESS.castling.bQR=false;}
  if(movingPiece==='bR'&&move.fromR===0&&move.fromC===0)INTCHESS.castling.bQR=false;
  if(movingPiece==='bR'&&move.fromR===0&&move.fromC===7)INTCHESS.castling.bK=false;
  INTCHESS.board[move.toR][move.toC]=movingPiece;INTCHESS.board[move.fromR][move.fromC]=null;
  if(icType(INTCHESS.board[move.toR][move.toC])==='P'&&move.toR===7)INTCHESS.board[move.toR][move.toC]='bQ';
  INTCHESS.moveCount++;INTCHESS.turn='w';
  renderIntChessBoard();
  const freq = INTCHESS.prefs.commentFreq || 'normal';
  const shouldComment = freq === 'off' ? false : freq === 'high' ? true : freq === 'low' ? INTCHESS.moveCount % 5 === 0 : INTCHESS.moveCount % 3 === 0;
  if(comment&&shouldComment)icSay(comment);
  const allWMoves=icAllLegalMoves(INTCHESS.board,'w',INTCHESS.enPassant,INTCHESS.castling);
  if(!allWMoves.length){INTCHESS.over=true;if(icIsInCheck(INTCHESS.board,'w')){icSetStatus('将死！AI赢了！');await icFinish('ai_win');}else{icSetStatus('逼和！平局～');await icFinish('draw');}return;}
  if(icIsInCheck(INTCHESS.board,'w')){icSetStatus('⚠️ 你被将军了！');}else{icSetStatus('轮到你了！');}
}

function icSetStatus(msg){const el=$i('ic-status');if(el)el.textContent=msg;}
function icSay(text){const el=$i('ic-comment');if(!el||!text)return;el.textContent=text;el.style.opacity='1';showGameTokenBadge('ic-token-badge',INTCHESS._lastUsage||null);INTCHESS._lastUsage=null;clearTimeout(el._t);el._t=setTimeout(()=>{if(el)el.style.opacity='0';},5500);}

async function icFinish(result){
  const contact=icGetContact();const elapsed=Math.round((Date.now()-INTCHESS.startTime)/1000);
  await saveIntChessRecord({result,moves:INTCHESS.moveCount,elapsed,aiName:contact?.name||'AI',aiContactId:INTCHESS.contactId,date:Date.now()});
  let aiComment='';const useKey=contact?.apiKey||S.settings.apiKey;
  if(useKey){try{const aiName=contact?.name||'AI',personality=(contact?.system||'').slice(0,100);const resultDesc=result==='player_win'?'你输了':result==='ai_win'?'你赢了':'平局';const prompt=`你是${aiName}，性格：${personality||'聪明好胜'}。国际象棋结束，${resultDesc}。用1句符合性格的话回应。只返回JSON：{"comment":"话"}`;const res=await fetch(contact?.apiUrl||'https://openrouter.ai/api/v1/chat/completions',{method:'POST',headers:{'Authorization':`Bearer ${useKey}`,'Content-Type':'application/json','HTTP-Referer':'https://raimos.app','X-Title':'Raimos'},body:JSON.stringify({model:contact?.model||'openai/gpt-4o-mini',max_tokens:60,stream:false,messages:[{role:'user',content:prompt}]})});const data=await res.json();INTCHESS._lastUsage=data.usage||null;const txt=data.choices?.[0]?.message?.content||'';const m=txt.match(/\{[\s\S]*?\}/);if(m)aiComment=JSON.parse(m[0]).comment||'';}catch(e){}}
  if(!aiComment)aiComment=result==='player_win'?'你赢了，下次再来较量！':result==='ai_win'?'我赢了！再来一局吧～':'旗鼓相当，平局！';
  icSay(aiComment);setTimeout(()=>showIntChessResult(result,elapsed,aiComment,contact),800);
}

function showIntChessResult(result,elapsed,aiComment,contact){
  const overlay=$i('intchess-result-overlay');if(!overlay)return;overlay.classList.add('show');
  const titles={player_win:'🎉 你赢了！',ai_win:'💫 AI赢了！',draw:'🤝 平局！'};
  const titleEl=$i('ic-result-title');if(titleEl){titleEl.textContent=titles[result]||'游戏结束';titleEl.className=`gmk-result-title ${result==='player_win'?'win':result==='draw'?'draw':''}`;}
  const badges={player_win:['🏆','💔'],ai_win:['💔','🏆'],draw:['🤝','🤝']};const[pb,ab]=badges[result]||['',''];
  const pbEl=$i('ic-result-player-badge'),abEl=$i('ic-result-ai-badge');if(pbEl)pbEl.textContent=pb;if(abEl)abEl.textContent=ab;
  const userAv=S.settings.userAvatar||S.settings.avatar||'😊';const pAvEl=$i('ic-result-player-av');
  if(pAvEl){if(userAv.startsWith('data:'))pAvEl.innerHTML=`<img src="${userAv}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;else pAvEl.textContent=userAv;}
  const aiAv=contact?.avatar||'🤖';const aAvEl=$i('ic-result-ai-av');
  if(aAvEl){if(aiAv.startsWith('data:'))aAvEl.innerHTML=`<img src="${aiAv}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;else aAvEl.textContent=aiAv;}
  const aiNameEl=$i('ic-result-ai-name');if(aiNameEl)aiNameEl.textContent=contact?.name||'AI';
  const mm=Math.floor(elapsed/60),ss=elapsed%60;const statsEl=$i('ic-result-stats');
  if(statsEl)statsEl.textContent=`本局用时 ${mm>0?mm+'分':''}${ss}秒  ·  共走 ${INTCHESS.moveCount} 步\n"${aiComment}"`;
  const catEl=$i('ic-result-cat');if(catEl){catEl.innerHTML=result==='player_win'?gomokuWinCatSVG():result==='ai_win'?gomokuLoseCatSVG():'<div style="font-size:60px;animation:cat-bounce .8s ease-in-out infinite">🐱</div>';}
  const confEl=$i('ic-confetti');if(confEl){confEl.innerHTML='';if(result==='player_win'){const cols=['#ff8fab','#a78bfa','#fcd34d','#6ee7b7','#67e8f9','#f472b6','#fb923c'];for(let i=0;i<36;i++){const el=document.createElement('div');el.className='gmk-confetti-piece';const sz=6+Math.random()*7;el.style.cssText=`left:${Math.random()*100}%;width:${sz}px;height:${sz}px;background:${cols[i%cols.length]};border-radius:${Math.random()>.5?'50%':'3px'};animation:confetti-fall ${1.2+Math.random()*0.8}s ease-in ${Math.random()*0.5}s forwards`;confEl.appendChild(el);}}}
}
function closeIntChessResult(){closeModal('intchess-result-overlay');}
async function saveIntChessRecord(rec){let records=(await getSetting('intChessRecords'))||[];records.unshift({...rec,id:uid()});if(records.length>60)records=records.slice(0,60);await saveSetting('intChessRecords',records);}
async function openIntChessRecords(){
  const records=(await getSetting('intChessRecords'))||[];const overlay=$i('intchess-records-modal');if(!overlay)return;overlay.classList.add('show');
  const wins=records.filter(r=>r.result==='player_win').length,losses=records.filter(r=>r.result==='ai_win').length,draws=records.filter(r=>r.result==='draw').length;
  const sumEl=$i('ic-records-summary');if(sumEl)sumEl.innerHTML=`<div style="flex:1"><div style="font-size:22px;font-weight:900;color:#4ade80">${wins}</div><div style="font-size:11px;color:var(--text3)">胜</div></div><div style="flex:1"><div style="font-size:22px;font-weight:900;color:#f87171">${losses}</div><div style="font-size:11px;color:var(--text3)">负</div></div><div style="flex:1"><div style="font-size:22px;font-weight:900;color:var(--text2)">${draws}</div><div style="font-size:11px;color:var(--text3)">平</div></div><div style="flex:1"><div style="font-size:22px;font-weight:900;color:var(--accent)">${records.length}</div><div style="font-size:11px;color:var(--text3)">总局</div></div>`;
  const listEl=$i('ic-records-list');if(!listEl)return;
  if(!records.length){listEl.innerHTML='<div style="text-align:center;padding:30px;color:var(--text3);font-size:13px">还没有对战记录，快去下一局吧！</div>';return;}
  listEl.innerHTML='';
  records.forEach(r=>{const icons={player_win:'🏆',ai_win:'💔',draw:'🤝'};const labels={player_win:'胜利',ai_win:'败北',draw:'平局'};const mm=Math.floor((r.elapsed||0)/60),ss=(r.elapsed||0)%60;const date=r.date?new Date(r.date).toLocaleDateString('zh-CN',{month:'numeric',day:'numeric'}):'';const el=document.createElement('div');el.className='gmk-record-item';el.innerHTML=`<div class="gmk-record-result">${icons[r.result]||'🎮'}</div><div class="gmk-record-info"><div style="font-weight:700;color:var(--text)">${labels[r.result]||'未知'} · vs ${esc(r.aiName||'AI')}</div><div class="gmk-record-meta">${date} · ${mm>0?mm+'分':''}${ss}秒 · ${r.moves||0}步</div></div>`;listEl.appendChild(el);});
}
async function clearIntChessRecords(){if(!confirm('确认清空所有国际象棋战绩？'))return;await saveSetting('intChessRecords',[]);openIntChessRecords();}
async function intChessShareToMoments(){
  const records=(await getSetting('intChessRecords'))||[];const last=records[0];const contact=icGetContact();const aiName=contact?.name||'AI';
  const labels={player_win:'赢了🏆',ai_win:'输了💔',draw:'平局🤝'};const mm=Math.floor((last?.elapsed||0)/60),ss=(last?.elapsed||0)%60;
  const text=last?`刚刚和 ${aiName} 下了一局国际象棋，${labels[last.result]||'结束'}！共走了 ${last.moves} 步，用时 ${mm>0?mm+'分':''}${ss}秒～ #国际象棋 #和AI下棋`:`和 ${aiName} 下了一局国际象棋，好好玩！ #国际象棋 #和AI下棋`;
  closeIntChessResult();switchPage('moments-page');await new Promise(r=>setTimeout(r,200));
  const ta=$i('compose-text');if(ta){ta.value=text;ta.dispatchEvent(new Event('input'));}
  const modal=$i('compose-moment-modal');if(modal&&window.innerWidth<=768){const taM=modal.querySelector('textarea');if(taM)taM.value=text;openModal('compose-moment-modal');}
  toast('已跳转到朋友圈，发送即可～');
}

// ══ Go (围棋) ══════════════════════
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
  contactId: null,
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
  if (aiNameEl) aiNameEl.textContent = contact?.name || 'AI（白子）';
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
  showGameTokenBadge('go-token-badge', GO._lastUsage || null);
  GO._lastUsage = null;
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

  // Beginner: always use heuristic (with 40% random)
  if (difficulty === 'beginner') {
    move = goHeuristic();
    if (move && Math.random() < 0.4) {
      // pick a random nearby legal move
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
  const personality = (contact?.system || '').slice(0, 100);
  const prompt = `你是${aiName}，和用户下围棋13×13。你执白子(W)，用户执黑子(B)，.表示空格。\n${boardTxt}\n性格：${personality||'聪明温柔'}。请找出最佳落子位置（0-12行列），或选择虚手。用1句符合性格的话评论。\n只返回JSON：{"row":数字,"col":数字,"comment":"一句话"} 或 {"pass":true,"comment":"一句话"}`;

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
      max_tokens: 80,
      stream: false,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  const data = await res.json();
  GO._lastUsage = data.usage || null;
  const txt = data.choices?.[0]?.message?.content || '';
  const m = txt.match(/\{[\s\S]*?\}/);
  if (!m) return null;
  return JSON.parse(m[0]);
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


// ══ Flying Chess (飞行棋) ══════════════════════
const FLY_PLAYER_COLORS = ['#ff6b6b', '#4d9fff', '#ffd93d', '#6bcb77'];
const FLY_PLAYER_EMOJIS = ['🔴', '🔵', '🟡', '🟢'];
const FLY_PIECE_OPTIONS = ['🐱','🦊','🐻','🐼','🐨','🐰','🐸','🦁','🐯','🐮','🐷','🐹','🦄','🦋','🌸','⭐','🌙','🎀','🍓','🍭','💎','🔮','🎭','🧸','🌺','🍀','🎃','🦖','🐧','🦜'];
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
  '你最喜欢对方身上哪一点是你最难以抗拒的？💫',
  '如果可以和对方做一件从未尝试过的事，你最想做什么？🌟',
  '你有没有因为对方的一个动作或眼神，突然心跳加速？描述一下💓',
  '你觉得两个人在一起，什么样的瞬间最让你感到幸福？💝',
  '如果要给对方写一段心里话，你最想让他/她知道什么？💌',
  '什么时候你会觉得对方是你最重要的人？举个例子说说🥰',
  '你觉得两个人在一起，最难维持的是什么？你们是怎么处理的？🌹',
  '描述你心目中和对方最完美的一天，从早到晚🌅',
  '你有哪些小习惯是专门为对方养成的？💗',
  '如果用一个拥抱来表达你现在的心情，你想要多长时间的拥抱？🤗',
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
  '你觉得真正了解一个人最重要的是什么？怎样才算真正了解？💞',
  '如果可以看见对方内心最深处的想法，你会怕吗？为什么？🌌',
  '你觉得在感情里，什么事情是你绝对不愿意妥协的？❤️',
  '你有没有一个时刻，觉得自己真的很依赖某个人？是什么感觉？🌙',
  '你觉得维持一段长久关系最难的挑战是什么？如何面对？🌿',
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
  aiContactIds: [null, null, null, null],
  _setupPieces: ['🐱', '🦊', '🐻', '🐼'], // piece per player slot, configurable in setup
  _gameLog: [], // {emoji, player, q, a, isAI} - all Q&A this session for AI context
};

// ── Setup ──
function renderFlyAiSelector() { /* merged into renderFlyPlayerInputs */ }

function initFlySetup() {
  FLY.playerCount = 2;
  FLY.over = false;
  FLY.rolling = false;
  renderFlyPlayerInputs();
  // reset button highlights
  document.querySelectorAll('.fly-count-btn').forEach((btn, i) => {
    btn.classList.toggle('active', i === 0); // 2人 is index 0
  });
  renderFlyAiSelector();
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
  const contacts = Object.values(S._contacts);

  for (let i = 0; i < FLY.playerCount; i++) {
    // Auto-init AI piece from contact avatar if not yet set
    if (i > 0 && !FLY._setupPieces[i]) {
      const cid = FLY.aiContactIds[i] || contacts[i-1]?.id || contacts[0]?.id;
      const c = cid ? S._contacts[cid] : null;
      const av = c?.avatar || '';
      FLY._setupPieces[i] = (!av.startsWith('data:') && !av.startsWith('http') && av) ? av : FLY_PIECE_OPTIONS[i] || '🤖';
    }

    const wrap = document.createElement('div');
    wrap.style.cssText = 'margin-bottom:8px';

    // Main row
    const row = document.createElement('div');
    row.className = 'fly-player-input-row';
    const piece = FLY._setupPieces[i] || FLY_PIECE_OPTIONS[i];

    if (i === 0) {
      row.innerHTML = `
        <span style="font-size:22px;cursor:pointer" title="棋子" id="fly-piece-preview-0">${piece}</span>
        <span class="fly-player-color-dot" style="background:${FLY_PLAYER_COLORS[0]}"></span>
        <input class="fly-player-input" id="fly-player-name-0" type="text" placeholder="你的名字" value="我" maxlength="8">
        <span style="font-size:11px;color:var(--text3);flex-shrink:0">真人</span>
      `;
    } else {
      const curId = FLY.aiContactIds[i] || contacts[i-1]?.id || contacts[0]?.id || null;
      if (!FLY.aiContactIds[i] && curId) FLY.aiContactIds[i] = curId;
      const opts = contacts.map(c => {
        const av = c.avatar?.startsWith('data:') ? '' : (c.avatar || '🤖');
        return `<option value="${esc(c.id)}" ${FLY.aiContactIds[i]===c.id?'selected':''}>${av} ${esc(c.name)}</option>`;
      }).join('');
      row.innerHTML = `
        <span style="font-size:22px" id="fly-piece-preview-${i}">${piece}</span>
        <span class="fly-player-color-dot" style="background:${FLY_PLAYER_COLORS[i]}"></span>
        <select class="fly-player-ai-select" id="fly-ai-select-${i}" onchange="flyAiContactChanged(${i},this.value)" style="flex:1;background:transparent;border:none;outline:none;font-size:13px;color:var(--text);font-family:inherit">
          ${contacts.length ? opts : '<option value="">无AI助手</option>'}
        </select>
        <span style="font-size:11px;color:var(--text3);flex-shrink:0">AI</span>
      `;
    }
    wrap.appendChild(row);

    // Piece picker strip
    const picker = document.createElement('div');
    picker.className = 'fly-piece-picker';
    picker.id = `fly-piece-picker-${i}`;
    FLY_PIECE_OPTIONS.forEach(p => {
      const btn = document.createElement('button');
      btn.className = 'fly-piece-option' + (FLY._setupPieces[i] === p ? ' active' : '');
      btn.textContent = p;
      btn.onclick = () => flySetPiece(i, p);
      picker.appendChild(btn);
    });
    wrap.appendChild(picker);
    container.appendChild(wrap);
  }
}

function flyAiContactChanged(i, cid) {
  FLY.aiContactIds[i] = cid || null;
  // Auto-update piece from new contact's avatar
  const c = cid ? S._contacts[cid] : null;
  const av = c?.avatar || '';
  if (av && !av.startsWith('data:') && !av.startsWith('http')) {
    flySetPiece(i, av);
  }
}

function flySetPiece(i, piece) {
  FLY._setupPieces[i] = piece;
  const preview = $i(`fly-piece-preview-${i}`);
  if (preview) preview.textContent = piece;
  const picker = $i(`fly-piece-picker-${i}`);
  if (picker) picker.querySelectorAll('.fly-piece-option').forEach(btn => {
    btn.classList.toggle('active', btn.textContent === piece);
  });
}

function startFlyGame() {
  const contacts = Object.values(S._contacts);
  const players = [];
  for (let i = 0; i < FLY.playerCount; i++) {
    const piece = FLY._setupPieces[i] || FLY_PIECE_OPTIONS[i] || FLY_PLAYER_EMOJIS[i];
    if (i === 0) {
      const nameEl = $i('fly-player-name-0');
      players.push({
        name: nameEl?.value.trim() || '我',
        emoji: FLY_PLAYER_EMOJIS[0],
        piece,
        color: FLY_PLAYER_COLORS[0],
        pos: 0, status: 'active', skipped: false, finishRank: 0,
        isAI: false, aiContactId: null,
      });
    } else {
      const cid = FLY.aiContactIds[i];
      const contact = cid ? S._contacts[cid] : (contacts[i-1] || contacts[0]);
      players.push({
        name: contact?.name || `AI${i}`,
        emoji: FLY_PLAYER_EMOJIS[i],
        piece,
        color: FLY_PLAYER_COLORS[i],
        pos: 0, status: 'active', skipped: false, finishRank: 0,
        isAI: true, aiContactId: contact?.id || null,
      });
    }
  }
  FLY._gameLog = [];
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
  document.querySelectorAll('[id^="fly-tokens-"]').forEach(el => el.innerHTML = '');
  FLY.players.forEach((p) => {
    if (p.pos > 0) {
      const container = $i(`fly-tokens-${p.pos}`);
      if (container) {
        const token = document.createElement('div');
        token.className = 'fly-token';
        token.textContent = p.piece || p.emoji;
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
    card.innerHTML = `<div class="fly-player-card-emoji">${p.piece || p.emoji}</div><div class="fly-player-card-name">${esc(p.name)}</div><div class="fly-player-card-pos">${posText}</div>`;
    bar.appendChild(card);
  });
}

function flyUpdateTurnInfo() {
  const el = $i('fly-turn-info');
  if (!el) return;
  if (FLY.over) { el.textContent = '游戏结束！'; return; }
  const p = FLY.players[FLY.currentPlayer];
  if (!p) return;
  el.textContent = p.isAI ? `${p.emoji} ${p.name} (AI) 思考中…` : `${p.emoji} 轮到你了！`;
}

function flyEnableDice(enabled) {
  const btn = $i('fly-dice-btn');
  if (!btn) return;
  const p = FLY.players[FLY.currentPlayer];
  const isAiTurn = p?.isAI;
  btn.disabled = !enabled || isAiTurn;
  btn.style.opacity = (!enabled || isAiTurn) ? '0.5' : '1';
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
  if (steps > 0) {
    for (let pos = oldPos + 1; pos <= newPos; pos++) {
      p.pos = pos;
      flyUpdateMapTokens();
      await flyDelay(120);
      const spaceEl = $i(`fly-space-${pos}`);
      if (spaceEl) { spaceEl.classList.add('highlight'); await flyDelay(100); spaceEl.classList.remove('highlight'); }
    }
  } else {
    for (let pos = oldPos - 1; pos >= newPos; pos--) {
      p.pos = pos;
      flyUpdateMapTokens();
      await flyDelay(120);
      const spaceEl = $i(`fly-space-${pos}`);
      if (spaceEl) { spaceEl.classList.add('highlight'); await flyDelay(100); spaceEl.classList.remove('highlight'); }
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
  const answerInput = $i('fly-answer-input');
  const submitBtn = $i('fly-submit-btn');
  const aiResponse = $i('fly-ai-response');
  const continueBtn = $i('fly-continue-btn');
  if (!overlay || !card) return;

  const typeInfo = {
    romance: { label: '💗 浪漫问答', class: 'romance' },
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

  // Reset answer section
  if (answerInput) { answerInput.value = ''; answerInput.disabled = false; }
  if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = '📤 提交给AI'; submitBtn.style.display = ''; }
  if (aiResponse) { aiResponse.className = 'fly-ai-response'; }
  if (continueBtn) continueBtn.style.display = 'none';

  overlay.style.display = 'flex';
  FLY._pendingEventPlayer = playerIdx;
  FLY._pendingEventText = eventText;
  FLY._pendingEventType = type;

  // If AI player triggered the event, auto-respond with minimal LLM call
  const triggerPlayer = FLY.players[playerIdx];
  if (triggerPlayer?.isAI) {
    const answerSection = $i('fly-answer-section');
    if (answerSection) answerSection.style.display = 'none';
    setTimeout(() => flyAiAutoAnswer(playerIdx), 800);
  }
}

function flyEventDone() {
  const overlay = $i('fly-event-overlay');
  if (overlay) overlay.style.display = 'none';
  const answerInput = $i('fly-answer-input');
  if (answerInput) answerInput.value = '';
  // Restore answer section for human players
  const answerSection = $i('fly-answer-section');
  if (answerSection) answerSection.style.display = '';
  const submitBtn = $i('fly-submit-btn');
  if (submitBtn) { submitBtn.style.display = ''; submitBtn.disabled = false; submitBtn.textContent = '📤 提交给AI'; }
  setTimeout(flyNextTurn, 300);
}

// Build game context string from session log for AI prompts (full log)
function flyBuildGameContext() {
  if (!FLY._gameLog?.length) return '';
  return '[本局游戏对话记录]\n' + FLY._gameLog.map(e =>
    `${e.piece||e.emoji} ${e.player}（问题：「${e.q}」→ 回答：${e.a}）`
  ).join('\n');
}

// Build system message: contact's full system prompt + all relevant memories
function flyBuildSysMsg(contact) {
  const sys = contact?.system || '';
  const mems = S._memories
    .filter(m => !m.contactId || m.contactId === contact?.id)
    .map(m => m.text).join('\n');
  return [sys, mems ? `[记忆]\n${mems}` : ''].filter(Boolean).join('\n\n');
}

async function flySubmitAnswer() {
  const answerInput = $i('fly-answer-input');
  const submitBtn = $i('fly-submit-btn');
  const aiResponse = $i('fly-ai-response');
  const aiResponseText = $i('fly-ai-response-text');
  const aiResponseLabel = $i('fly-ai-response-label');
  const continueBtn = $i('fly-continue-btn');

  const answer = answerInput?.value?.trim();
  if (!answer) { toast('请先输入你的回答～'); return; }

  if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'AI思考中…'; }
  if (answerInput) answerInput.disabled = true;

  // Prefer the first AI player's contact as the "game host" AI responder
  const aiPlayer = FLY.players.find(p => p.isAI);
  const contact = aiPlayer?.aiContactId ? S._contacts[aiPlayer.aiContactId] : Object.values(S._contacts)[0];
  const aiName = contact?.name || 'AI';
  const useKey = contact?.apiKey || S.settings?.apiKey;
  if (aiResponseLabel) aiResponseLabel.textContent = `${aiPlayer?.piece || '🤖'} ${aiName}：`;

  // Record human's answer to game log
  const humanPlayer = FLY.players[FLY._pendingEventPlayer];
  FLY._gameLog.push({ emoji: humanPlayer?.emoji, piece: humanPlayer?.piece, player: humanPlayer?.name || '我', q: FLY._pendingEventText, a: answer, isAI: false });

  let aiReply = '';
  if (useKey) {
    try {
      const sysMsg = flyBuildSysMsg(contact);
      const gameCtx = flyBuildGameContext();
      const userMsg = `${gameCtx ? gameCtx + '\n\n' : ''}你正在和大家玩飞行棋互动游戏。\n现在${humanPlayer?.name || '玩家'}触发了问题：「${FLY._pendingEventText}」\n${humanPlayer?.name || '玩家'}的回答：「${answer}」\n请用符合你性格的方式自由回应，可以根据之前的游戏对话记录来决定是否联系、如何联系，随心而发。只返回JSON：{"reply":"回应"}`;
      const messages = [
        ...(sysMsg ? [{ role: 'system', content: sysMsg }] : []),
        { role: 'user', content: userMsg }
      ];
      const res = await fetch(contact?.apiUrl || 'https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${useKey}`, 'Content-Type': 'application/json', 'HTTP-Referer': 'https://raimos.app', 'X-Title': 'Raimos' },
        body: JSON.stringify({ model: contact?.model || 'openai/gpt-4o-mini', stream: false, temperature: 0.9, messages })
      });
      const data = await res.json();
      showGameTokenBadge('fly-token-badge', data.usage || null);
      const txt = data.choices?.[0]?.message?.content || '';
      const m = txt.match(/\{[\s\S]*?\}/);
      if (m) aiReply = JSON.parse(m[0]).reply || '';
    } catch(e) {}
  }
  if (!aiReply) {
    const defaults = ['好有趣的回答！我也觉得～💕', '谢谢你的分享，听起来好棒！🌸', '我很喜欢你这样想，继续加油～✨', '哇，没想到你会这么回答，真可爱！😊'];
    aiReply = defaults[Math.floor(Math.random() * defaults.length)];
  }

  if (aiResponseText) aiResponseText.textContent = aiReply;
  if (aiResponse) aiResponse.className = 'fly-ai-response visible';
  if (submitBtn) submitBtn.style.display = 'none';
  if (continueBtn) continueBtn.style.display = 'block';
}

async function flyAiAutoAnswer(playerIdx) {
  const p = FLY.players[playerIdx];
  const aiResponseText = $i('fly-ai-response-text');
  const aiResponse = $i('fly-ai-response');
  const aiResponseLabel = $i('fly-ai-response-label');
  const continueBtn = $i('fly-continue-btn');
  const submitBtn = $i('fly-submit-btn');

  if (submitBtn) submitBtn.style.display = 'none';

  const contact = p?.aiContactId ? S._contacts[p.aiContactId] : null;
  const aiName = contact?.name || p?.name || 'AI';
  const useKey = contact?.apiKey || S.settings?.apiKey;
  if (aiResponseLabel) aiResponseLabel.textContent = `${p?.piece || p?.emoji || '🤖'} ${aiName}：`;

  let reply = '';
  if (useKey && FLY._pendingEventText) {
    try {
      const sysMsg = flyBuildSysMsg(contact);
      const gameCtx = flyBuildGameContext();
      const userMsg = `${gameCtx ? gameCtx + '\n\n' : ''}你正在和大家玩飞行棋互动游戏，现在轮到你（${aiName}）回答问题。\n问题：「${FLY._pendingEventText}」\n请完全按你自己的性格自由作答，可以根据之前的游戏对话记录自行决定是否参考、参考多少，想说多少说多少。只返回JSON：{"a":"回答"}`;
      const messages = [
        ...(sysMsg ? [{ role: 'system', content: sysMsg }] : []),
        { role: 'user', content: userMsg }
      ];
      const res = await fetch(contact?.apiUrl || 'https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${useKey}`, 'Content-Type': 'application/json', 'HTTP-Referer': 'https://raimos.app', 'X-Title': 'Raimos' },
        body: JSON.stringify({ model: contact?.model || 'openai/gpt-4o-mini', stream: false, temperature: 0.9, messages })
      });
      const data = await res.json();
      showGameTokenBadge('fly-token-badge', data.usage || null);
      const txt = data.choices?.[0]?.message?.content || '';
      const m = txt.match(/\{[\s\S]*?\}/);
      if (m) reply = JSON.parse(m[0]).a || '';
    } catch(e) {}
  }
  const defaults = ['嗯，我觉得还不错！', '这个问题我也想过～', '哈哈，有意思！', '我也同意这个观点！'];
  if (!reply) reply = defaults[Math.floor(Math.random() * defaults.length)];

  // Record AI's answer to game log
  FLY._gameLog.push({ emoji: p?.emoji, piece: p?.piece, player: aiName, q: FLY._pendingEventText, a: reply, isAI: true });

  if (aiResponseText) aiResponseText.textContent = reply;
  if (aiResponse) aiResponse.className = 'fly-ai-response visible';
  if (continueBtn) continueBtn.style.display = 'block';

  // Auto-continue after 4 seconds (more time to read full response)
  setTimeout(flyEventDone, 4000);
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

  // If next player is AI, auto-play after delay
  const nextP = FLY.players[FLY.currentPlayer];
  if (nextP?.isAI) setTimeout(flyAiAutoTurn, 1300);
}

function flyAiAutoTurn() {
  if (FLY.over) return;
  const p = FLY.players[FLY.currentPlayer];
  if (!p?.isAI) return;
  flyRollDice();
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

