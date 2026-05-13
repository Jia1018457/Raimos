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
  chatListContactFilter: null,
  myStatus: '😊 在线',
  // runtime caches
  _contacts: {}, _chats: {}, _memories: [], _stickers: [],
  settings: {
    apiKey:'', apiUrl:'', tavilyKey:'', unsplashKey:'',
    model:'openai/gpt-4o', systemPrompt:'',
    ttsMode:'browser', browserVoice:'', ttsUrl:'', ttsKey:'', ttsVoice:'cove',
    voiceReplyMode:'text', autoTts:false,
    stream:true, showToken:false, showThink:true,
    temp:0.85, ctx:20, imgSize:800, sumThresh:40,
    proactive:false, proMax:3, proStart:8, proEnd:22,
    momentsEnabled:false, autoPost:false, momentFreqMode:'perWeek', momentFreqCount:3,
    autoComment:false, commentFreqMins:360,
    replyMomentComments:false, replyDelay:120, autoLike:false, likeProb:60,
    maxComments:1,
    postImages:false, imageFreq:50, imageSources:'stickers',
    imgGenModel:'openai/dall-e-3',
    aiName:'小可', userName:'我', aiAvatar:'🐱', userAvatar:'😊',
    showUserAvatar:true, showAiAvatar:true,
    userBubble:'#ff8fab', aiBubble:'#ffffff',
    theme:'light', chatBg:'#fdf6f0', chatBgImg:'', bgOpacity:1, fontSize:14,
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

    // ── Cloudinary 图床 ──
    cloudinaryCloud:'', cloudinaryPreset:'',

    // ── 个人信息 ──
    city:'', backendUrl:'',
    refChatEnabled:false, refChatCount:5, refMemEnabled:true,

    // ── 表情包库 ──
    stickerLibKey:'', stickerCallPrompt:'',

    // ── AI 聊天发图 ──
    aiChatImages: false,
    aiChatImageFreq: 20,   // % probability per reply
    aiChatImageSources: 'album', // album,stickers,search,generate

    // ── 开屏动画 ──
    splashEnabled: false,
    splashMediaId: '',
    splashDuration: 4,   // seconds, for image splash
    splashType: '',      // 'image' | 'video' | ''
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
  S._minimapOn = savedSettings.minimapOn === true;
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
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
  $i(id).classList.add('active');
  document.querySelector(`[data-page="${id}"]`)?.classList.add('active');
  if (id === 'memory-page') renderMemories();
  if (id === 'contacts-page') renderContacts();
  if (id === 'moments-page') renderMoments();
  if (id === 'companion-page') renderCompanionPage();
  if (id === 'settings-page') { buildSettingsUI(); updateStorageInfo(); }
  if (id === 'checkin-page' && typeof renderCheckinPage === 'function') renderCheckinPage();
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
  setCmSection('appear', c, ['xAiBubble','xChatBg']);
  if (c?.xAiBubble !== null && c?.xAiBubble !== undefined) { const el=$i('cm-x-ai-bubble'); if(el)el.value=c.xAiBubble||'#ffffff'; }
  if (c?.xChatBg !== null && c?.xChatBg !== undefined) { const el=$i('cm-x-chat-bg'); if(el)el.value=c.xChatBg||'#fdf6f0'; }
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
  setCmSection('moments', c, ['xMomentsEnabled','xAutoPost','xMomentFreqMode','xMomentFreqCount','xAutoComment','xCommentFreqMins','xReplyMomentComments','xReplyDelay','xAutoLike','xLikeProb','xMaxComments','xPostImages','xImageFreq','xImageSources']);
  if (c?.xMomentsEnabled !== null && c?.xMomentsEnabled !== undefined) { const el=$i('cm-x-moments-enabled'); if(el)el.checked=!!c.xMomentsEnabled; }
  if (c?.xAutoPost !== null && c?.xAutoPost !== undefined) { const el=$i('cm-x-auto-post'); if(el)el.checked=!!c.xAutoPost; }
  if (c?.xMomentFreqMode !== null && c?.xMomentFreqMode !== undefined) { const el=$i('cm-x-moment-freq-mode'); if(el)el.value=c.xMomentFreqMode||'perWeek'; }
  if (c?.xMomentFreqCount !== null && c?.xMomentFreqCount !== undefined) { const el=$i('cm-x-moment-freq-count'); if(el)el.value=c.xMomentFreqCount||3; }
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
    const srcs = (c.xImageSources||'').split(',');
    ['stickers','search','generate'].forEach(s => { const el=$i(`cm-x-imgsrc-${s}`); if(el)el.checked=srcs.includes(s); });
  }
  // AI chat images section
  setCmSection('aichat', c, ['xAiChatImages','xAiChatImageFreq','xAiChatImageSources']);
  if (c?.xAiChatImages !== null && c?.xAiChatImages !== undefined) { const el=$i('cm-x-ai-chat-images'); if(el)el.checked=!!c.xAiChatImages; }
  if (c?.xAiChatImageFreq !== null && c?.xAiChatImageFreq !== undefined) { const el=$i('cm-x-ai-chat-freq'); if(el){ el.value=c.xAiChatImageFreq||20; const v=$i('cm-x-ai-chat-freq-v'); if(v)v.textContent=(c.xAiChatImageFreq||20)+'%'; } }
  if (c?.xAiChatImageSources !== null && c?.xAiChatImageSources !== undefined) {
    const srcs2 = (c.xAiChatImageSources||'album').split(',');
    ['album','stickers','search'].forEach(s => { const el=$i(`cm-x-aichat-src-${s}`); if(el)el.checked=srcs2.includes(s); });
  }
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
    xAutoComment: getCmSection('moments') ? getB2('cm-x-auto-comment') : null,
    xCommentFreqMins: getCmSection('moments') ? parseInt(getV('cm-x-comment-freq','360')) : null,
    xMaxComments: getCmSection('moments') ? parseInt(getV('cm-x-max-comments','1')) : null,
    xReplyMomentComments: getCmSection('moments') ? getB2('cm-x-reply-comments') : null,
    xReplyDelay: getCmSection('moments') ? parseInt(getV('cm-x-reply-delay','120')) : null,
    xAutoLike: getCmSection('moments') ? getB2('cm-x-auto-like') : null,
    xLikeProb: getCmSection('moments') ? parseInt(getV('cm-x-like-prob','60')) : null,
    xPostImages: getCmSection('moments') ? getB2('cm-x-post-images') : null,
    xImageFreq: getCmSection('moments') ? parseInt(getV('cm-x-image-freq','50')) : null,
    xImageSources: getCmSection('moments') ? ['stickers','search','generate'].filter(s=>$i(`cm-x-imgsrc-${s}`)?.checked).join(',') : null,
    // AI chat images
    xAiChatImages: getCmSection('aichat') ? getB2('cm-x-ai-chat-images') : null,
    xAiChatImageFreq: getCmSection('aichat') ? parseInt(getV('cm-x-ai-chat-freq','20')) : null,
    xAiChatImageSources: getCmSection('aichat') ? ['album','stickers','search'].filter(s=>$i(`cm-x-aichat-src-${s}`)?.checked).join(',') || 'album' : null,
  };
  await dbPut('contacts', contact);
  S._contacts[id] = contact;
  initStatusTimers();
  initMomentTimers();
  renderContacts(); closeModal('contact-modal'); toast('✅ 助手已保存');
}
async function delContact(id) {
  if (!confirm('删除这个助手？')) return;
  await dbDel('contacts', id); delete S._contacts[id]; renderContacts();
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
      <button class="chat-item-menu" onclick="event.stopPropagation();S.currentChat='${chat.id}';openCtxMenu(event)">⋮</button>`;
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
    if (msg.thinking && cs(contact_?.xShowThink, S.settings.showThink)) html += `<details class="thinking-block"><summary>思考过程</summary><div style="margin-top:5px;white-space:pre-wrap">${esc(msg.thinking)}</div></details>`;
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
  const useUrl = contact?.apiUrl || s.apiUrl || 'https://openrouter.ai/api/v1/chat/completions';
  if (!useKey) { toast('请先填写 API Key！'); return; }
S.isStreaming = true; showTyping();
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
    autoMemCheck(chatId, contact?.id || null);
  } catch(e) {
    removeTyping();
    await addMsg(chatId, { role:'ai', type:'text', content:`❌ 出错了：${e.message}` });
    await renderMsgs(); scrollTo_(false);
  }
  S.isStreaming = false;
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
      const url = await pickAlbumPhoto(context);
      if (url) await addMsg(chatId, { role:'ai', type:'image', imageData:url, content:'[图片]' });
    } else if (pick === 'stickers') {
      const stk = await pickSticker(context);
      if (stk) await addMsg(chatId, { role:'ai', type:'sticker', content:stk.label||stk.content, url:stk.url, isImg:stk.isImg });
    } else if (pick === 'search') {
      const key = s.unsplashKey?.trim();
      if (!key) return;
      const kw = encodeURIComponent(context.slice(0, 30) || 'cute');
      const r = await fetch(`https://api.unsplash.com/photos/random?query=${kw}&client_id=${key}`);
      const d = await r.json();
      const url = d?.urls?.regular;
      if (url) await addMsg(chatId, { role:'ai', type:'image', imageData:url, content:'[图片]' });
    }
  } catch(e) { /* silent fail */ }
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
  return { content, thinking, usage, tmpId };
}

async function buildMsgs(chat, contact, mems) {
  const msgs = [];
  let sys = cs(contact?.system, S.settings.systemPrompt) || '你是一个可爱温柔的AI助手。';
  if (mems.length) sys += `\n\n[用户记忆]\n${mems.map(m=>`- ${m.text}`).join('\n')}`;
  if (S._stickers.length) {
    const slist = S._stickers.map(s => `${s.label||s.content||'表情'}`).join(', ');
    sys += `\n\n[表情包库] 可在回复中用 [sticker:标签名] 插入表情。可用: ${slist}`;
  }
  msgs.push({ role:'system', content:sys });
  if (chat.summary) msgs.push({ role:'system', content:`[历史摘要] ${chat.summary}` });
  const allMsgs = await dbGetAll('messages', 'chatId', chat.id);
  allMsgs.sort((a,b) => a.ts - b.ts);
  const recent = allMsgs.slice(-parseInt(cs(contact?.xCtx, S.settings.ctx))||20);
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
      body:JSON.stringify({ model:cs((S.currentContact?S._contacts[S.currentContact]:null)?.xImgGenModel, S.settings.imgGenModel)||'openai/dall-e-3', prompt, n:1, size:'1024x1024' }),
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
async function delMem(i) { await dbDel('memories',S._memories[i].id); S._memories.splice(i,1); renderMemories(); }

async function getRelevantMems(chatId, contactId) {
  const pool = S._memories.filter(m => !m.contactId || m.contactId === contactId);
  if (!pool.length) return [];
  const msgs = await dbGetAll('messages','chatId',chatId);
  const lastText = msgs.slice(-3).map(m=>m.content||'').join(' ');
  if (!lastText.trim()) return [];
  if (!S.settings.apiKey) return pool.slice(0,5);
  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions',{method:'POST',headers:{'Authorization':`Bearer ${S.settings.apiKey}`,'Content-Type':'application/json'},body:JSON.stringify({model:'openai/gpt-4o-mini',max_tokens:150,stream:false,messages:[{role:'system',content:'从记忆列表中找与当前对话相关的条目，返回JSON: {"relevant":[0,2]}，只返回JSON。'},{role:'user',content:`对话: ${lastText}\n记忆:\n${pool.map((m,i)=>`${i}: ${m.text}`).join('\n')}`}]})});
    const d = await res.json(); const raw = d.choices?.[0]?.message?.content||'{}';
    const j = JSON.parse(raw.replace(/```json|```/g,'').trim());
    return (j.relevant||[]).map(i=>pool[i]).filter(Boolean);
  } catch(e) { return pool.slice(0,3); }
}

async function autoMemCheck(chatId, contactId) {
  const msgs = await dbGetAll('messages','chatId',chatId);
  const lastText = msgs.slice(-4).map(m=>`${m.role==='user'?'用户':'AI'}: ${m.content||'[媒体]'}`).join('\n');
  if (!S.settings.apiKey) return;
  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions',{method:'POST',headers:{'Authorization':`Bearer ${S.settings.apiKey}`,'Content-Type':'application/json'},body:JSON.stringify({model:'openai/gpt-4o-mini',max_tokens:200,stream:false,messages:[{role:'system',content:'分析对话，判断是否有值得长期记忆的信息（个人信息/健康禁忌/长期习惯/重要事件），重要程度≥7才记录。返回JSON: {"shouldSave":true,"text":"内容","cat":"健康","score":8}，只返回JSON。'},{role:'user',content:lastText}]})});
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
  const chat = S._chats[chatId]; if (!S.settings.apiKey) return;
  const cSumThresh = parseInt(cs((chat.contactId?S._contacts[chat.contactId]:null)?.xSumThresh, S.settings.sumThresh))||40;
  const msgs = await dbGetAll('messages','chatId',chatId);
  msgs.sort((a,b)=>a.ts-b.ts);
  const toSum = force ? msgs : msgs.slice(0, -Math.floor(cSumThresh/3));
  if (toSum.length < 5) return;
  const hist = toSum.map(m=>`${m.role==='user'?'用户':'AI'}: ${m.content||'[媒体]'}`).join('\n');
  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions',{method:'POST',headers:{'Authorization':`Bearer ${S.settings.apiKey}`,'Content-Type':'application/json'},body:JSON.stringify({model:'openai/gpt-4o-mini',max_tokens:400,stream:false,messages:[{role:'system',content:'将对话压缩为简洁摘要（200字内），保留关键信息。'},{role:'user',content:hist}]})});
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
  card.innerHTML = `
    <div class="moment-header">
      <div class="moment-av">${typeof avHTML==='string'&&avHTML.startsWith('<img')?avHTML:`<span>${avHTML}</span>`}</div>
      <div><div class="moment-author">${esc(m.author||S.settings.userName||'我')}</div><div class="moment-time">${fmtTimeFull(m.ts)}</div></div>
      <button style="margin-left:auto;background:none;border:none;cursor:pointer;color:var(--text3);font-size:14px" onclick="delMoment('${m.id}')">✕</button>
    </div>
    <div class="moment-text">${fmtText(m.text||'')}</div>
    ${imgGrid}
    <div class="moment-footer">
      <div class="moment-actions">
        <button class="m-act-btn" onclick="likeMoment('${m.id}')">❤️ ${m.likes||0}</button>
        <button class="m-act-btn" onclick="toggleComments('${m.id}')">💬 ${comments.length} 评论</button>
        ${S.settings.apiKey?`<button class="m-act-btn" onclick="aiCommentMoment('${m.id}',null)">🤖 让AI评论</button>`:''}
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
  await renderMoments(); toast('✅ 发布成功！');
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
  const m = await dbGet('moments',momentId);
  if(m){const card=await makeMomentCard(m);const old=$i('mc-'+momentId);if(old)old.replaceWith(card);}
}
function openAiPostModal() {
  const sel = $i('apm-contact');
  const contacts = Object.values(S._contacts);
  if (!contacts.length) { toast('请先添加 AI 助手'); return; }
  sel.innerHTML = contacts.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('');
  $i('ai-post-modal').classList.add('show');
}
async function doAiPost() {
  const contactId = $i('apm-contact')?.value;
  closeModal('ai-post-modal');
  await aiPostMoment(contactId);
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
async function aiPostMoment(contactId) {
  const contact = contactId ? S._contacts[contactId] : Object.values(S._contacts)[0];
  if (!contact || !S.settings.apiKey) { toast('需要配置助手和 API Key'); return; }
  const aiName = contact.name || S.settings.aiName || 'AI';
  const aiAvatar = contact.avatar || S.settings.aiAvatar || '🤖';
  const apiKey = contact.apiKey || S.settings.apiKey;
  const apiUrl = (contact.apiUrl || S.settings.apiUrl || 'https://openrouter.ai');
  toast('🌸 AI 正在发朋友圈…');
  try {
    const useImages = cs(contact?.xPostImages, S.settings.postImages);
    const imageFreq = cs(contact?.xImageFreq, S.settings.imageFreq) || 50;
    const imageSources = (cs(contact?.xImageSources, S.settings.imageSources) || 'stickers').split(',').filter(Boolean);
    // Generate text
    const res = await fetch(apiUrl + '/api/v1/chat/completions', {
      method:'POST', headers:{'Authorization':`Bearer ${apiKey}`,'Content-Type':'application/json'},
      body: JSON.stringify({ model: contact.model||S.settings.model||'openai/gpt-4o-mini', max_tokens:120, stream:false,
        messages:[{role:'system',content:`你是${aiName}，${cs(contact.system, S.settings.systemPrompt)||'可爱温柔的AI'}。写一条自然、真实的朋友圈动态，50字以内，不要用"AI"或"助手"自称，像真人朋友一样分享日常/心情/想法，可带emoji。`},{role:'user',content:'写一条今天的朋友圈动态。'}]
      })
    });
    const d = await res.json(); const text = d.choices?.[0]?.message?.content?.trim();
    if (!text) { toast('AI 生成失败'); return; }
    let images = [];
    if (useImages && Math.random()*100 < imageFreq && imageSources.length) {
      // Shuffle sources and try each until one succeeds
      const shuffled = [...imageSources].sort(() => Math.random()-0.5);
      for (const src of shuffled) {
        if (src === 'stickers' && S._stickers.length) {
          const sk = S._stickers[Math.floor(Math.random()*S._stickers.length)];
          if (sk?.dataUrl) { images.push(sk.dataUrl); break; }
        }
        if (src === 'search' && S.settings.unsplashKey) {
          const imgUrl = await fetchUnsplashImage(text);
          if (imgUrl) { images.push(imgUrl); break; }
        }
        if (src === 'generate' && apiKey) {
          toast('🎨 生成配图中…');
          const imgUrl = await generateMomentImage(text, contact);
          if (imgUrl) { images.push(imgUrl); break; }
        }
      }
    }
    const m = { id:uid(), author:aiName, avatar:aiAvatar, text, images, ts:Date.now(), likes:0, byAi:true, contactId:contact.id };
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
  const contact = S._contacts[contactId]; if (!contact || !S.settings.apiKey) return;
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
  const m = await dbGet('moments',momentId); if(!m||!S.settings.apiKey)return;
  const contact = contactId ? S._contacts[contactId] : (S.currentContact?S._contacts[S.currentContact]:Object.values(S._contacts)[0]);
  if (!contact) return;
  const aiName = contact?.name||S.settings.aiName||'AI';
  const apiKey = contact?.apiKey||S.settings.apiKey;
  const apiUrl = (contact?.apiUrl||S.settings.apiUrl||'https://openrouter.ai');
  const maxC = cs(contact?.xMaxComments, S.settings.maxComments) || 1;
  const count = Math.max(1, Math.ceil(Math.random() * maxC));
  toast('🤖 AI 评论中…');
  const prevTexts = [];
  try {
    for (let i = 0; i < count; i++) {
      if (i > 0) await new Promise(r => setTimeout(r, 1500 + Math.random()*3000));
      const prevCtx = prevTexts.length ? `\n你刚才说了：${prevTexts.join('；')}。再补充一句不同的话，自然衔接但不重复。` : '';
      const res = await fetch(apiUrl+'/api/v1/chat/completions',{method:'POST',headers:{'Authorization':`Bearer ${apiKey}`,'Content-Type':'application/json'},body:JSON.stringify({model:contact?.model||'openai/gpt-4o-mini',max_tokens:80,stream:false,messages:[{role:'system',content:`你是${aiName}，${cs(contact?.system,S.settings.systemPrompt)||'可爱温柔的AI'}，用1句话自然地评论朋友圈，像真实朋友一样。${prevCtx}`},{role:'user',content:`朋友圈内容: ${m.text||'[图片]'}`}]})});
      const d=await res.json(); const comment=d.choices?.[0]?.message?.content?.trim()||'';
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
  const contact = contactId ? S._contacts[contactId] : null; if (!contact || !S.settings.apiKey) return;
  const aiName = contact.name || 'AI';
  try {
    const res = await fetch((contact.apiUrl||S.settings.apiUrl||'https://openrouter.ai')+'/api/v1/chat/completions',{method:'POST',headers:{'Authorization':`Bearer ${contact.apiKey||S.settings.apiKey}`,'Content-Type':'application/json'},body:JSON.stringify({model:contact.model||'openai/gpt-4o-mini',max_tokens:60,stream:false,messages:[{role:'system',content:`你是${aiName}，简短自然地回复朋友圈评论，1句话。`},{role:'user',content:`朋友"${commentObj.author}"评论了你的朋友圈：${commentObj.text}`}]})});
    const d=await res.json(); const reply=d.choices?.[0]?.message?.content||'';
    if(reply){
      const c={id:uid(),momentId,author:aiName,text:reply,replyTo:commentObj.author,ts:Date.now()};
      await dbPut('comments',c);
      commentObj._replied = true; await dbPut('comments', commentObj);
      const m=await dbGet('moments',momentId);
      if(m){const card=await makeMomentCard(m);const old=$i('mc-'+momentId);if(old)old.replaceWith(card);}
    }
  } catch(e){}
}

function composePicLocal() { $i('compose-pic-file').click(); }
async function handleComposePic(input) {
  for (const file of input.files) {
    const compressed = await compressImg(file, parseInt(S.settings.imgSize)||800);
    toast('上传图片中…');
    let url = await uploadToCloudinary(compressed, 'raimos/moments').catch(()=>null);
    url = url || compressed;
    S._composePics.push({dataUrl:url});
    addComposePicPreview(url, S._composePics.length-1);
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
function startRec(e){if(e)e.preventDefault();if(S.isRecording)return;navigator.mediaDevices.getUserMedia({audio:true}).then(stream=>{recStream=stream;S.mediaRecorder=new MediaRecorder(stream);S.audioChunks=[];S.isRecording=true;S.recSecs=0;S.mediaRecorder.ondataavailable=e=>S.audioChunks.push(e.data);S.mediaRecorder.start();$i('btn-voice').classList.add('recording');$i('rec-bar').classList.add('show');S.recTimer=setInterval(()=>{S.recSecs++;const m=Math.floor(S.recSecs/60),s=S.recSecs%60;$i('rec-timer').textContent=`${m}:${s.toString().padStart(2,'0')}`;},1000);}).catch(e=>toast('无法访问麦克风: '+e.message));}
function stopRec(){if(!S.isRecording)return;S.isRecording=false;clearInterval(S.recTimer);$i('btn-voice').classList.remove('recording');$i('rec-bar').classList.remove('show');$i('rec-timer').textContent='0:00';S.mediaRecorder.stop();S.mediaRecorder.onstop=async()=>{const blob=new Blob(S.audioChunks,{type:'audio/webm'});recStream?.getTracks().forEach(t=>t.stop());const dur=`${Math.floor(S.recSecs/60)}:${(S.recSecs%60).toString().padStart(2,'0')}`;const url=URL.createObjectURL(blob);const transcript=await sttBrowser();const chat=S._chats[S.currentChat];if(!chat)return;const vmsg={role:'user',type:'voice',url,dur,transcript,content:transcript?`[语音] ${transcript}`:'[语音消息]'};await addMsg(S.currentChat,vmsg);await renderMsgs();scrollTo_(false);if(transcript)await callAI(S.currentChat);};}
function cancelRec(){if(!S.isRecording)return;S.isRecording=false;clearInterval(S.recTimer);S.mediaRecorder?.stop();recStream?.getTracks().forEach(t=>t.stop());$i('btn-voice').classList.remove('recording');$i('rec-bar').classList.remove('show');}
function sttBrowser(){return new Promise(resolve=>{if(!('webkitSpeechRecognition'in window||'SpeechRecognition'in window)){resolve('');return;}const SR=window.SpeechRecognition||window.webkitSpeechRecognition;const r=new SR();r.lang='zh-CN';r.interimResults=false;r.start();r.onresult=e=>resolve(e.results[0][0].transcript);r.onerror=()=>resolve('');r.onend=()=>resolve('');setTimeout(()=>{try{r.stop();}catch(e){}},5000);});}
async function playVoice(id){const msgs=await dbGetAll('messages','chatId',S.currentChat);const msg=msgs.find(m=>m.id===id);if(msg?.url)new Audio(msg.url).play();}

let curSpeech=null;
async function speakMsg(id){const msgs=await dbGetAll('messages','chatId',S.currentChat);const msg=msgs.find(m=>m.id===id);if(msg?.content)speakText(msg.content);}
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

function toggleEmoji(e){
  if(e){e.preventDefault();e.stopPropagation();}
  const picker=$i('emoji-picker');
  picker.classList.toggle('show');
}

function insertEmoji(e){const i=$i('msg-input');const s=i.selectionStart,end=i.selectionEnd;i.value=i.value.slice(0,s)+e+i.value.slice(end);i.selectionStart=i.selectionEnd=s+e.length;i.focus();}
async function sendSticker(sk){const chat=S._chats[S.currentChat];if(!chat)return;await addMsg(S.currentChat,{role:'user',type:'sticker',content:sk.content||sk.label||'',url:sk.url,isImg:sk.isImg});await renderMsgs();scrollTo_(false);$i('emoji-picker').classList.remove('show');}
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

/** Pick best-matching album photo by keyword/context label matching */
async function pickAlbumPhoto(keywords) {
  const photos = await dbGetAll('album');
  if (!photos.length) return null;
  const kws = (keywords||'').toLowerCase().split(/[\s,，]+/).filter(Boolean);
  // Score each photo by label match
  const scored = photos.map(p => {
    const lbl = (p.label||'').toLowerCase();
    const score = kws.reduce((s,k) => s + (lbl.includes(k)?1:0), 0);
    return {p, score};
  });
  scored.sort((a,b) => b.score - a.score || Math.random() - 0.5);
  return scored[0]?.p || null;
}

/** Pick best-matching sticker by label */
function pickSticker(keywords) {
  if (!S._stickers?.length) return null;
  const kws = (keywords||'').toLowerCase().split(/[\s,，]+/).filter(Boolean);
  const scored = S._stickers.filter(s=>s.isImg).map(s => {
    const lbl = (s.label||s.content||'').toLowerCase();
    const score = kws.reduce((acc,k)=>acc+(lbl.includes(k)?1:0),0);
    return {s, score};
  });
  scored.sort((a,b) => b.score - a.score || Math.random() - 0.5);
  return scored[0]?.s || null;
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
async function copyMsg(id){const msgs=await dbGetAll('messages','chatId',S.currentChat);const msg=msgs.find(m=>m.id===id);if(msg?.content)navigator.clipboard.writeText(msg.content).then(()=>toast('✓ 已复制'));}
async function replyMsg(id){const msgs=await dbGetAll('messages','chatId',S.currentChat);const msg=msgs.find(m=>m.id===id);if(!msg)return;S.replyTo=msg;$i('reply-bar-txt').textContent=(msg.content||'[媒体]').slice(0,50);$i('reply-bar').classList.add('show');$i('msg-input').focus();}
function cancelReply(){S.replyTo=null;$i('reply-bar').classList.remove('show');}
async function editMsg(id){const msgs=await dbGetAll('messages','chatId',S.currentChat);const msg=msgs.find(m=>m.id===id);if(!msg)return;S.editingMsgId=id;$i('msg-input').value=msg.content||'';$i('edit-bar-txt').textContent=(msg.content||'').slice(0,40);$i('edit-bar').classList.add('show');autoH($i('msg-input'));$i('msg-input').focus();}
function cancelEdit(){S.editingMsgId=null;$i('edit-bar').classList.remove('show');}
async function regenMsg(id){const msgs=await dbGetAll('messages','chatId',S.currentChat);const idx=msgs.findIndex(m=>m.id===id);if(idx===-1)return;for(let i=idx;i<msgs.length;i++)await dbDel('messages',msgs[i].id);await renderMsgs();await callAI(S.currentChat);}

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
  });
}
function scrollTo_(top,instant){const ca=$i('chat-area');ca.scrollTo({top:top?0:ca.scrollHeight,behavior:instant?'auto':'smooth'});}

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
function applyBubble(){document.documentElement.style.setProperty('--user-bubble',S.settings.userBubble||'#ff8fab');document.documentElement.style.setProperty('--ai-bubble',S.settings.aiBubble||'#ffffff');const lum=getLum(S.settings.userBubble||'#ff8fab');document.documentElement.style.setProperty('--user-text',lum>.55?'#3d2c35':'#fff');}
function getLum(hex){try{const r=parseInt(hex.slice(1,3),16)/255,g=parseInt(hex.slice(3,5),16)/255,b=parseInt(hex.slice(5,7),16)/255;return .299*r+.587*g+.114*b;}catch{return 0;}}

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
  if (av.startsWith('data:')) btn.innerHTML = `<img src="${av}" style="width:28px;height:28px;border-radius:50%;object-fit:cover">`;
  else btn.textContent = av;
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
      <div class="s-row"><label>默认模型</label><input type="text" id="s-model" value="${s.model||'openai/gpt-4o'}" placeholder="openai/gpt-4o"/></div>
      <div class="s-row"><label>默认系统提示词</label><textarea id="s-systemprompt" placeholder="助手未设提示词时使用…" style="min-height:56px">${s.systemPrompt||''}</textarea></div>
      <div class="s-row"><label>Tavily Key (搜索)</label><input type="password" id="s-tavily" value="${s.tavilyKey||''}" placeholder="可选，联网搜索"/></div>
      <div class="s-row"><label>Unsplash Key (图片)</label><input type="password" id="s-unsplash" value="${s.unsplashKey||''}" placeholder="可选，朋友圈搜图"/></div>
    </div>
    <div class="s-section" hidden><h3>👤 个人信息</h3>
      <div style="font-size:12px;color:var(--text3);margin-bottom:8px">用于AI发朋友圈时的个性化内容生成</div>
      <div class="s-row"><label>所在城市</label><input type="text" id="s-city" value="${s.city||''}" placeholder="如：北京、上海（用于查天气）"/></div>
      <div class="s-row"><label>参考最近聊天</label><label class="toggle"><input type="checkbox" id="s-ref-chat" ${s.refChatEnabled?'checked':''}><span class="tslider"></span></label></div>
      <div class="s-row"><label>参考条数</label><input type="number" id="s-ref-chat-count" value="${s.refChatCount||5}" min="1" max="50" style="max-width:70px"/> 条</div>
      <div class="s-row"><label>参考记忆库</label><label class="toggle"><input type="checkbox" id="s-ref-mem" ${s.refMemEnabled!==false?'checked':''}><span class="tslider"></span></label></div>
    </div>
    <div class="s-section" hidden><h3>🖼️ Cloudinary 图床</h3>
      <div style="font-size:12px;color:var(--text3);margin-bottom:8px">用于图片云端存储（头像、表情包、相册等）。<a href="https://cloudinary.com" target="_blank" style="color:var(--accent)">免费注册</a>后填入下方信息。Upload preset 选 unsigned 模式。</div>
      <div class="s-row"><label>Cloud Name</label><input type="text" id="s-cld-cloud" value="${s.cloudinaryCloud||''}" placeholder="your-cloud-name"/></div>
      <div class="s-row"><label>Upload Preset</label><input type="text" id="s-cld-preset" value="${s.cloudinaryPreset||''}" placeholder="unsigned preset 名称"/></div>
    </div>
    <div class="s-section" hidden><h3>🚂 后台服务</h3>
      <div style="font-size:12px;color:var(--text3);margin-bottom:8px">部署后台服务（Railway）后，把访问地址填入下方，前端将对接 AI 主动行为功能。</div>
      <div class="s-row"><label>后台服务地址</label><input type="text" id="s-backend-url" value="${s.backendUrl||''}" placeholder="https://xxx.railway.app"/></div>
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
      <div class="s-row"><label>显示思考过程</label><label class="toggle"><input type="checkbox" id="s-show-think" ${s.showThink!==false?'checked':''}><span class="tslider"></span></label></div>
      <div class="s-row"><label>Temperature</label><input type="range" id="s-temp" min="0" max="2" step="0.05" value="${s.temp||0.85}" oninput="$i('s-temp-v').textContent=this.value"><span class="rval" id="s-temp-v">${s.temp||0.85}</span></div>
      <div class="s-row"><label>上下文消息数</label><input type="number" id="s-ctx" value="${s.ctx||20}" min="2" max="1000" style="max-width:80px"/><span style="font-size:11px;color:var(--text3)">条 (最高1000)</span></div>
      <div class="s-row"><label>图片压缩尺寸</label><input type="range" id="s-imgsize" min="256" max="2048" step="128" value="${s.imgSize||800}" oninput="$i('s-imgsize-v').textContent=this.value+'px'"><span class="rval" id="s-imgsize-v">${s.imgSize||800}px</span></div>
      <div class="s-row"><label>摘要阈值</label><input type="number" id="s-sumthresh" value="${s.sumThresh||40}" min="10" max="200" style="max-width:80px"/><span style="font-size:11px;color:var(--text3)">条后自动摘要</span></div>
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
      <div class="s-row"><label>我的名称</label><input type="text" id="s-username" value="${s.userName||'我'}"/></div>
      <div class="s-row"><label>显示我的头像</label><label class="toggle"><input type="checkbox" id="s-show-user-av" ${s.showUserAvatar!==false?'checked':''}><span class="tslider"></span></label></div>
      <div class="s-row"><label>显示 AI 头像</label><label class="toggle"><input type="checkbox" id="s-show-ai-av" ${s.showAiAvatar!==false?'checked':''}><span class="tslider"></span></label></div>
    </div>
    <div class="s-section" hidden><h3>🐾 主动消息</h3>
      <div class="s-row"><label>启用</label><label class="toggle"><input type="checkbox" id="s-proactive" ${s.proactive?'checked':''}><span class="tslider"></span></label></div>
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
        <label><input type="checkbox" id="s-imgsrc-stickers" ${(s.imageSources||'').includes('stickers')?'checked':''}> 我的相册</label>
        <label><input type="checkbox" id="s-imgsrc-search" ${(s.imageSources||'').includes('search')?'checked':''}> 联网搜索</label>
        <label><input type="checkbox" id="s-imgsrc-generate" ${(s.imageSources||'').includes('generate')?'checked':''}> 生成图片</label>
      </div></div>
    </div>
    <div class="s-section" hidden><h3>📨 AI聊天发图</h3>
      <div style="font-size:11px;color:var(--text3);margin-bottom:8px">各助手可在扩展设置中单独覆盖</div>
      <div class="s-row"><label>AI 发图功能</label><label class="toggle"><input type="checkbox" id="s-ai-chat-images" ${s.aiChatImages?'checked':''}><span class="tslider"></span></label></div>
      <div class="s-row"><label>发图概率</label><input type="range" id="s-ai-chat-image-freq" min="0" max="100" step="5" value="${s.aiChatImageFreq||20}" oninput="$i('s-ai-chat-image-freq-v').textContent=this.value+'%'"><span class="rval" id="s-ai-chat-image-freq-v">${s.aiChatImageFreq||20}%</span></div>
      <div class="s-row"><label>图片来源</label><div style="display:flex;gap:10px;flex-wrap:wrap;font-size:12px">
        <label><input type="checkbox" id="s-aichat-src-album" ${(s.aiChatImageSources||'album').includes('album')?'checked':''}> 我的相册</label>
        <label><input type="checkbox" id="s-aichat-src-stickers" ${(s.aiChatImageSources||'').includes('stickers')?'checked':''}> 表情包</label>
        <label><input type="checkbox" id="s-aichat-src-search" ${(s.aiChatImageSources||'').includes('search')?'checked':''}> 联网搜索</label>
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
    updateStorageInfo();
    const ai = $i('auth-info');
    if (ai) ai.textContent = window._fbUser ? ('已登录：' + window._fbUser.email) : '未登录';
    initSettingsSubpages();
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
    tile.innerHTML=`<span>${esc(title)}</span><small>进入设置 ›</small>`;
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
  s.apiKey=get('s-key');s.apiUrl=get('s-apiurl');s.model=get('s-model','openai/gpt-4o');s.systemPrompt=get('s-systemprompt');s.tavilyKey=get('s-tavily');s.unsplashKey=get('s-unsplash');
  s.ttsMode=get('s-tts-mode','browser');s.browserVoice=get('s-bvoice');
  s.ttsUrl=get('s-tts-url');s.ttsKey=get('s-tts-key');s.ttsVoice=get('s-tts-voice','cove');
  s.voiceReplyMode=get('s-voice-reply','text');s.autoTts=getB('s-auto-tts');
  s.stream=getB('s-stream');s.showToken=getB('s-show-token');s.showThink=getB('s-show-think');
  s.temp=parseFloat(get('s-temp','0.85'));s.ctx=parseInt(get('s-ctx','20'));
  s.imgSize=parseInt(get('s-imgsize','800'));s.sumThresh=parseInt(get('s-sumthresh','40'));
  s.proactive=getB('s-proactive');s.proMax=parseInt(get('s-pro-max','3'));
  s.proStart=parseInt(get('s-pro-start','8'));s.proEnd=parseInt(get('s-pro-end','22'));
  s.momentsEnabled=getB('s-moments-enabled');s.autoPost=getB('s-auto-post');
  s.momentFreqMode=get('s-moment-freq-mode','perWeek');s.momentFreqCount=parseInt(get('s-moment-freq-count','3'));
  s.autoComment=getB('s-auto-comment');s.commentFreqMins=parseInt(get('s-comment-freq','360'));
  s.maxComments=parseInt(get('s-max-comments','1'));
  s.replyMomentComments=getB('s-reply-comments');s.replyDelay=parseInt(get('s-reply-delay','120'));
  s.autoLike=getB('s-auto-like');s.likeProb=parseInt(get('s-like-prob','60'));
  s.postImages=getB('s-post-images');s.imageFreq=parseInt(get('s-image-freq','50'));
  s.imageSources=['stickers','search','generate'].filter(x=>getB(`s-imgsrc-${x}`)).join(',');
  s.fontSize=parseInt(get('s-fontsize','14'));s.bgOpacity=parseFloat(get('s-bgopa','1'));
  const igm=get('s-imggen-model','openai/dall-e-3');
  s.imgGenModel=igm==='custom'?(get('s-imggen-custom-model')||'openai/dall-e-3'):igm;
  s.imgGenCustomModel=get('s-imggen-custom-model');
  s.imgGenApiUrl=get('s-imggen-api-url');
  s.imgGenApiKey=get('s-imggen-api-key');
  s.userName=get('s-username','我');
  s.showUserAvatar=getB('s-show-user-av'); s.showAiAvatar=getB('s-show-ai-av');
  // 个人信息
  s.city=get('s-city','').trim();
  s.refChatEnabled=getB('s-ref-chat');
  s.refChatCount=parseInt(get('s-ref-chat-count','5'));
  s.refMemEnabled=getB('s-ref-mem');
  // Cloudinary
  s.cloudinaryCloud=get('s-cld-cloud','').trim();
  s.cloudinaryPreset=get('s-cld-preset','').trim();
  // 后台服务
  s.backendUrl=get('s-backend-url','').trim();
  // AI 聊天发图
  s.aiChatImages=getB('s-ai-chat-images');
  s.aiChatImageFreq=parseInt(get('s-ai-chat-image-freq','20'));
  s.aiChatImageSources=['album','stickers','search'].filter(x=>getB(`s-aichat-src-${x}`)).join(',') || 'album';
  // 开屏动画
  s.splashEnabled=getB('s-splash-enabled');
  s.splashDuration=parseInt(get('s-splash-dur','4'));
  document.documentElement.style.setProperty('--font-size',s.fontSize+'px');
  applyBubble();scheduleProactive();initMomentTimers();await saveSettings_();toast('✅ 设置已保存');
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
  m.style.top=Math.min(e.clientY||100,window.innerHeight-240)+'px';
  m.style.left=Math.min(e.clientX||100,window.innerWidth-175)+'px';
  m.classList.add('show');e.stopPropagation();
}
function closeCtxMenu(){$i('ctx-menu').classList.remove('show');}

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
function onKey(e){if(e.key==='Enter'&&(e.ctrlKey||e.metaKey)){e.preventDefault();sendMsg();}}
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
  if (user && sessionStorage.getItem('raimosWelcomeShownAfterLogin') !== user.uid) {
    sessionStorage.setItem('raimosWelcomeShownAfterLogin', user.uid);
    S.currentChat = null; S.chatListContactFilter = null;
    switchPage('chat-page'); showWelcome(); renderChatList();
    toast('欢迎回来，先选择一个聊天吧');
  }
}

async function syncToCloud() {
  if (!window._fbUser) { toast('请先登录'); openAuthModal(); return; }
  const uid = window._fbUser.uid;
  const { doc, setDoc } = window._fbLib;
  const fsDb = window._fbDb;
  const hasCloudinary = S.settings.cloudinaryCloud && S.settings.cloudinaryPreset;
  toast('☁️ 同步中…');
  try {
    const settingsData = {};
    for (const [k,v] of Object.entries(S.settings)) settingsData[k] = v ?? null;
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

    let msg = `✅ 同步完成！${contacts.length}个助手，${chats.length}个对话（${totalMsgs}条消息），${memories.length}条记忆，${moments.length}条朋友圈，${album.length}张相册`;
    if (localPhotos > 0 && !hasCloudinary) msg += `\n⚠️ ${localPhotos}张照片是本地上传的，未配置Cloudinary故无法跨设备同步`;
    toast(msg);
  } catch(e) {
    toast('❌ 同步失败：' + e.message);
    console.error(e);
  }
}

async function restoreFromCloud() {
  if (!window._fbUser) { toast('请先登录'); openAuthModal(); return; }
  if (!confirm('从云端恢复数据？会覆盖本地同名数据。')) return;
  const uid = window._fbUser.uid;
  const { collection, getDocs } = window._fbLib;
  const fsDb = window._fbDb;
  toast('⬇️ 恢复中…');
  try {
    const contactsSnap = await getDocs(collection(fsDb, 'users', uid, 'contacts'));
    for (const d of contactsSnap.docs) {
      const data = d.data(); await dbPut('contacts', data); S._contacts[data.id] = data;
    }
    const chatsSnap = await getDocs(collection(fsDb, 'users', uid, 'chats'));
    for (const d of chatsSnap.docs) {
      const data = d.data(); await dbPut('chats', data); S._chats[data.id] = data;
    }
    // restore messages
    const msgsSnap = await getDocs(collection(fsDb, 'users', uid, 'messages'));
    for (const d of msgsSnap.docs) { await dbPut('messages', d.data()); }

    const memsSnap = await getDocs(collection(fsDb, 'users', uid, 'memories'));
    for (const d of memsSnap.docs) {
      const data = d.data(); await dbPut('memories', data);
      if (!S._memories.find(m => m.id === data.id)) S._memories.push(data);
    }
    const momentsSnap = await getDocs(collection(fsDb, 'users', uid, 'moments'));
    for (const d of momentsSnap.docs) { await dbPut('moments', d.data()); }
    const commentsSnap = await getDocs(collection(fsDb, 'users', uid, 'comments'));
    for (const d of commentsSnap.docs) { await dbPut('comments', d.data()); }
    const stickersSnap = await getDocs(collection(fsDb, 'users', uid, 'stickers'));
    for (const d of stickersSnap.docs) {
      const data = d.data();
      if (data.url !== '__local__') { await dbPut('stickers', data); if (!S._stickers.find(s=>s.id===data.id)) S._stickers.push(data); }
    }
    const kwAnimsSnap = await getDocs(collection(fsDb, 'users', uid, 'kwAnims'));
    for (const d of kwAnimsSnap.docs) {
      const data = d.data();
      if (data.gifData !== '__local__') await dbPut('kwAnims', data);
    }
    const albumSnap = await getDocs(collection(fsDb, 'users', uid, 'album'));
    for (const d of albumSnap.docs) {
      const data = d.data();
      if (data.url !== '__local__') await dbPut('album', data);
    }
    S.kwAnims = await dbGetAll('kwAnims');
    renderChatList(); renderContacts(); renderMemories(); renderMoments();
    toast('✅ 恢复完成！');
  } catch(e) {
    toast('❌ 恢复失败：' + e.message);
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
}

function renderCompanionContactOptions() {
  const sel = $i('comp-contact'); if (!sel) return;
  const cur = sel.value || S.settings.companionContactId || '';
  sel.innerHTML = '';
  const o0 = document.createElement('option'); o0.value = ''; o0.textContent = '（使用全局模型）'; sel.appendChild(o0);
  Object.values(S._contacts || {}).forEach(c => {
    const o = document.createElement('option'); o.value = c.id;
    o.textContent = `${c.avatar || '🤖'} ${c.name || 'AI 助手'}`; sel.appendChild(o);
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
    const url = await loadMediaUrl(s.companionBgMediaId);
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
}

async function applyCompanionCharacter() {
  const wrap = $i('comp-char'); if (!wrap) return;
  const s = S.settings;
  if (S._companion.charObjUrl) { try { URL.revokeObjectURL(S._companion.charObjUrl); } catch(e) {} S._companion.charObjUrl = null; }
  wrap.innerHTML = '';
  if ((s.companionCharType || 'builtin') === 'upload' && s.companionCharMediaId) {
    const url = await loadMediaUrl(s.companionCharMediaId);
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
  // Upload image/video char to Cloudinary for cloud sync
  if (target === 'char' && file.type.startsWith('image/')) {
    toast('上传形象图片中…');
    const dataUrl = await new Promise(r=>{const fr=new FileReader();fr.onload=e=>r(e.target.result);fr.readAsDataURL(file);});
    const url = await uploadToCloudinary(dataUrl, 'raimos/companion').catch(()=>null);
    if (url) { S.settings.companionCharUrl = url; await saveSetting('companionCharUrl', url); }
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
  if (target === 'music') await applyCompanionMusicSrc();
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

function companionToggleRun() {
  if (S._companion.running) companionPause(); else companionStart();
  updateCompanionStartBtn();
}

function companionStart() {
  const s = S.settings, mode = s.companionTimerMode || 'pomodoro';
  S._companion.mode = mode; S._companion.running = true;
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
  }, 1000);
  companionSetupSpeechTimer();
  applyCompanionMusicSettings();
  void applyCompanionMusicSrc();
}

function companionPause() {
  S._companion.running = false;
  if (S._companion.tickTimer) { clearInterval(S._companion.tickTimer); S._companion.tickTimer = null; }
  if (S._companion.speechTimer) { clearInterval(S._companion.speechTimer); S._companion.speechTimer = null; }
  const a = $i('comp-audio'); if (a) a.pause();
  updateCompanionStartBtn();
}

function companionReset() {
  companionPause();
  S._companion.phase = 'focus'; S._companion.elapsedSec = 0; S._companion.remainingSec = 0;
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

async function callCompanionAI() {
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
  const sys = `你是${aiName}，${cs(contact?.system, s.systemPrompt) || '可爱温柔的AI助手'}。你正在以"陪伴模式"陪用户进行：${scene}。请用中文输出1-2句简短自然的话（不要列点、不超过40字/句），像真实朋友一样。`;
  const userMsg = `当前状态：${status}。请给用户一句陪伴/鼓励/提醒。`;
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
  if (el.requestFullscreen) el.requestFullscreen().catch(() => {});
  else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
  // Listen for exit via Escape
  document.addEventListener('fullscreenchange', _companionFsChange);
  document.addEventListener('webkitfullscreenchange', _companionFsChange);
}
function _companionFsChange() {
  if (!document.fullscreenElement && !document.webkitFullscreenElement) {
    if (S._companion.immersive) companionExitImmersive();
  }
}
function companionExitImmersive() {
  S._companion.immersive = false;
  document.body.classList.remove('comp-immersive');
  updateCompanionStartBtn();
  if (document.exitFullscreen && document.fullscreenElement) document.exitFullscreen();
  else if (document.webkitExitFullscreen && document.webkitFullscreenElement) document.webkitExitFullscreen();
  document.removeEventListener('fullscreenchange', _companionFsChange);
  document.removeEventListener('webkitfullscreenchange', _companionFsChange);
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
        // Return stage to original location when PiP closes
        const wrap = $i('comp-wrap'); const orig = $i('comp-stage');
        if (orig && wrap) wrap.insertBefore(orig, wrap.firstChild);
        if (orig) orig.style.cssText = '';
        _pipWin = null;
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
  // Render mini content
  _miniRender();
  // Start drag
  const header = $i('comp-mini-header'); if (!header) return;
  const onDown = e => {
    _miniDragging = true;
    const t = e.touches?.[0] || e;
    const r = win.getBoundingClientRect();
    _miniDragX = t.clientX - r.left; _miniDragY = t.clientY - r.top;
    e.preventDefault();
  };
  const onMove = e => {
    if (!_miniDragging) return;
    const t = e.touches?.[0] || e;
    const nx = t.clientX - _miniDragX, ny = t.clientY - _miniDragY;
    win.style.left = Math.max(0, Math.min(window.innerWidth - win.offsetWidth, nx)) + 'px';
    win.style.top = Math.max(0, Math.min(window.innerHeight - win.offsetHeight, ny)) + 'px';
    win.style.bottom = 'auto'; win.style.right = 'auto';
    e.preventDefault();
  };
  const onUp = () => { _miniDragging = false; };
  header.addEventListener('mousedown', onDown);
  header.addEventListener('touchstart', onDown, { passive: false });
  document.addEventListener('mousemove', onMove);
  document.addEventListener('touchmove', onMove, { passive: false });
  document.addEventListener('mouseup', onUp);
  document.addEventListener('touchend', onUp);
  // Update mini timer
  if (_miniTimerInt) clearInterval(_miniTimerInt);
  _miniTimerInt = setInterval(_miniUpdateTimer, 1000);
}
function companionHideMini() {
  const win = $i('comp-mini-win'); if (!win) return;
  win.style.display = 'none';
  S._companion.mini = false;
  if (_miniTimerInt) { clearInterval(_miniTimerInt); _miniTimerInt = null; }
}
function _miniRender() {
  const stage = $i('comp-mini-stage'); if (!stage) return;
  const charType = S.settings.companionCharType || 'builtin';
  const charVal = charType === 'builtin' ? (S.settings.companionCharBuiltin || '😊') : '';
  const bg = S.settings.companionBgBuiltin || 'bg1';
  const bgColors = { bg1:'linear-gradient(135deg,#FCE4EC,#F8BBD0)', bg2:'linear-gradient(135deg,#E3F2FD,#BBDEFB)', bg3:'linear-gradient(135deg,#E8F5E9,#C8E6C9)', bg4:'linear-gradient(135deg,#EDE7F6,#D1C4E9)', bg5:'linear-gradient(135deg,#FFF8E1,#FFECB3)' };
  stage.innerHTML = `
    <div id="comp-mini-bg" style="position:absolute;inset:0;background:${bgColors[bg]||bgColors.bg1}"></div>
    <div class="mini-char">${charType==='builtin'?charVal:'🖼️'}</div>
    <div class="mini-bubble" id="comp-mini-bubble"></div>
    <div class="mini-timer" id="comp-mini-timer">00:00</div>
  `;
  _miniUpdateTimer();
}
function _miniUpdateTimer() {
  const el = $i('comp-mini-timer'); if (!el) return;
  el.textContent = $i('comp-timer')?.textContent?.replace(/[⏰]/g,'').trim() || '00:00';
  const mb = $i('comp-mini-start'); if (mb) mb.textContent = S._companion.running ? '⏸' : '▶︎';
  // Mirror speech bubble
  const b = $i('comp-bubble'); const mb2 = $i('comp-mini-bubble');
  if (b && mb2) {
    mb2.textContent = b.textContent || '';
    mb2.classList.toggle('on', b.style.display !== 'none' && !!b.textContent);
  }
}
